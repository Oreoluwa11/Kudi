-- Kudi: demo accounts
-- "Try the demo" signs the visitor in anonymously (Supabase anonymous sign-ins),
-- then calls seed_demo_data() to fill their private account with ~6 months of data.
-- Requires: Authentication → Sign In / Providers → "Allow anonymous sign-ins" = on.

-- ─────────────────────────────────────────────────────────────
-- Deleting a user cascades to both categories and transactions. RESTRICT would
-- fire mid-cascade (category deleted before its transactions); NO ACTION is
-- checked at the end of the statement, so the cascade completes cleanly while
-- still blocking a direct delete of a category that has transactions.
-- ─────────────────────────────────────────────────────────────
alter table public.transactions drop constraint transactions_category_fk;
alter table public.transactions
  add constraint transactions_category_fk
  foreign key (category_id, user_id) references public.categories (id, user_id)
  on delete no action;

-- ─────────────────────────────────────────────────────────────
-- Seed the calling (anonymous) user's account. SECURITY INVOKER: RLS applies,
-- so it can only ever write the caller's own rows.
-- ─────────────────────────────────────────────────────────────
create function public.seed_demo_data()
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  uid       uuid := auth.uid();
  today     date := current_date;
  needs     uuid;
  wants     uuid;
  savings   uuid;
  invest    uuid;
  m         date;
  month_end date;
  i         int;
begin
  if uid is null then
    raise exception 'Not signed in';
  end if;
  if coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) is not true then
    raise exception 'Demo data can only be added to demo accounts';
  end if;
  if exists (select 1 from public.transactions where user_id = uid) then
    return; -- already seeded
  end if;

  select id into needs   from public.categories where user_id = uid and name = 'Needs'       and archived_at is null;
  select id into wants   from public.categories where user_id = uid and name = 'Wants'       and archived_at is null;
  select id into savings from public.categories where user_id = uid and name = 'Savings'     and archived_at is null;
  select id into invest  from public.categories where user_id = uid and name = 'Investments' and archived_at is null;

  update public.profiles set display_name = 'Ada' where id = uid;

  for i in reverse 5..0 loop
    m := (date_trunc('month', today) - make_interval(months => i))::date;
    month_end := (m + interval '1 month - 1 day')::date;

    insert into public.transactions (user_id, type, amount, description, category_id, occurred_on, status)
    select
      uid,
      t.kind::public.transaction_type,
      round(t.amount::numeric, -2),
      t.description,
      t.category,
      t.day,
      (case when t.day > today then 'planned' else 'paid' end)::public.transaction_status
    from (
      values
        -- income
        ('income',  650000,                          'Salary',                  null::uuid, m,      true),
        ('income',  case when i in (1, 3, 4) then 90000 + random() * 60000 else 0 end,
                                                      'Freelance design job',    null,       m + 13, false),
        -- needs: fixed bills
        ('expense', 180000,                          'Rent',                    needs,      m + 1,  true),
        ('expense', 22000 + random() * 8000,         'Electricity (prepaid)',   needs,      m + 4,  true),
        ('expense', 18500,                           'Home internet',           needs,      m + 2,  true),
        ('expense', 6000,                            'Phone airtime & data',    needs,      m + 9,  true),
        -- needs: everyday
        ('expense', 18000 + random() * 14000,        'Groceries',               needs,      m + 2,  false),
        ('expense', 18000 + random() * 14000,        'Groceries',               needs,      m + 9,  false),
        ('expense', 18000 + random() * 14000,        'Groceries',               needs,      m + 16, false),
        ('expense', 18000 + random() * 14000,        'Groceries',               needs,      m + 23, false),
        ('expense', 9000 + random() * 7000,          'Fuel',                    needs,      m + 5,  false),
        ('expense', 9000 + random() * 7000,          'Fuel',                    needs,      m + 19, false),
        ('expense', 3000 + random() * 4000,          'Ride to work',            needs,      m + 11, false),
        ('expense', 3000 + random() * 4000,          'Ride to work',            needs,      m + 25, false),
        -- wants
        ('expense', 15000,                           'Gym membership',          wants,      m + 3,  true),
        ('expense', 4400,                            'Streaming subscription',  wants,      m + 6,  true),
        ('expense', 7000 + random() * 12000,         'Dinner out',              wants,      m + 4,  false),
        ('expense', 7000 + random() * 12000,         'Suya & drinks with friends', wants,   m + 10, false),
        ('expense', 7000 + random() * 12000,         'Dinner out',              wants,      m + 17, false),
        ('expense', 7000 + random() * 12000,         'Cinema',                  wants,      m + 21, false),
        ('expense', 20000 + random() * 35000,        'Clothes',                 wants,      m + 14, false),
        ('expense', case when i = 0 then 48000 else 0 end,
                                                      'Aso-ebi for a friend''s wedding', wants,
                                                                                            greatest(m, today - 2), false),
        -- savings & investments (pay yourself first)
        ('expense', 65000,                           'Emergency fund transfer', savings,    m + 1,  true),
        ('expense', 65000,                           'Treasury bills',          invest,     m + 2,  true)
    ) as t(kind, amount, description, category, day, fixed)
    where t.amount > 0
      and t.day <= month_end
      and (t.day <= today or t.fixed);
  end loop;
end;
$$;

-- ─────────────────────────────────────────────────────────────
-- Housekeeping: remove demo accounts after 3 days (cascades to their data).
-- Not callable from the API; run it from pg_cron:
--   Database → Extensions → enable pg_cron, then in the SQL editor:
--   select cron.schedule('kudi-demo-cleanup', '0 3 * * *', 'select public.delete_stale_demo_users()');
-- ─────────────────────────────────────────────────────────────
create function public.delete_stale_demo_users()
returns integer
language sql
security definer
set search_path = ''
as $$
  with deleted as (
    delete from auth.users
    where is_anonymous
      and created_at < now() - interval '3 days'
    returning 1
  )
  select count(*)::int from deleted;
$$;

revoke execute on function public.delete_stale_demo_users() from public, anon, authenticated;
