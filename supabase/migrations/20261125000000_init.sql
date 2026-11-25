-- Kudi: initial schema
-- Apply with `supabase db push`, or paste into the Supabase SQL editor.

-- ─────────────────────────────────────────────────────────────
-- Profiles (1:1 with auth.users)
-- ─────────────────────────────────────────────────────────────
create table public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  display_name text check (char_length(display_name) <= 60),
  currency     text not null default 'NGN' check (currency ~ '^[A-Z]{3}$'),
  created_at   timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────
-- Budget categories. target_pct is the share of monthly income.
-- Categories are archived (never hard-deleted) so history survives.
-- ─────────────────────────────────────────────────────────────
create table public.categories (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name        text not null check (char_length(btrim(name)) between 1 and 40),
  target_pct  numeric(5, 2) not null default 0 check (target_pct between 0 and 100),
  color_index smallint not null default 1 check (color_index between 1 and 8),
  sort_order  integer not null default 0,
  archived_at timestamptz,
  created_at  timestamptz not null default now(),
  -- lets transactions reference (id, user_id) so a row can never point at
  -- another user's category
  unique (id, user_id)
);

create unique index categories_active_name_idx
  on public.categories (user_id, lower(name))
  where archived_at is null;

-- ─────────────────────────────────────────────────────────────
-- Transactions: income and expenses in one ledger.
-- ─────────────────────────────────────────────────────────────
create type public.transaction_type as enum ('income', 'expense');
create type public.transaction_status as enum ('paid', 'planned');

create table public.transactions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  type        public.transaction_type not null,
  amount      numeric(14, 2) not null check (amount > 0),
  description text not null check (char_length(btrim(description)) between 1 and 120),
  category_id uuid,
  occurred_on date not null default current_date,
  status      public.transaction_status not null default 'paid',
  created_at  timestamptz not null default now(),

  constraint transactions_category_fk
    foreign key (category_id, user_id) references public.categories (id, user_id)
    on delete restrict,
  constraint expense_requires_category
    check (type = 'income' or category_id is not null)
);

create index transactions_user_date_idx on public.transactions (user_id, occurred_on desc);
create index transactions_category_idx on public.transactions (category_id);

-- ─────────────────────────────────────────────────────────────
-- Row Level Security: every row belongs to exactly one user.
-- ─────────────────────────────────────────────────────────────
alter table public.profiles     enable row level security;
alter table public.categories   enable row level security;
alter table public.transactions enable row level security;

create policy "profiles: read own" on public.profiles
  for select to authenticated using (id = (select auth.uid()));
create policy "profiles: update own" on public.profiles
  for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

create policy "categories: own rows" on public.categories
  for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy "transactions: own rows" on public.transactions
  for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- ─────────────────────────────────────────────────────────────
-- New user bootstrap: profile + default 50/30/10/10 categories.
-- ─────────────────────────────────────────────────────────────
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, nullif(new.raw_user_meta_data ->> 'display_name', ''));

  insert into public.categories (user_id, name, target_pct, color_index, sort_order)
  values
    (new.id, 'Needs',       50, 1, 0),
    (new.id, 'Wants',       30, 2, 1),
    (new.id, 'Savings',     10, 3, 2),
    (new.id, 'Investments', 10, 4, 3);

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─────────────────────────────────────────────────────────────
-- Monthly totals for the history chart. SECURITY INVOKER, so RLS applies.
-- ─────────────────────────────────────────────────────────────
create function public.monthly_totals(p_from date, p_to date)
returns table (month date, income numeric, spent numeric)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    m::date as month,
    coalesce(sum(t.amount) filter (where t.type = 'income'  and t.status = 'paid'), 0) as income,
    coalesce(sum(t.amount) filter (where t.type = 'expense' and t.status = 'paid'), 0) as spent
  from generate_series(
         date_trunc('month', p_from::timestamp),
         date_trunc('month', p_to::timestamp),
         interval '1 month'
       ) as m
  left join public.transactions t
    on t.occurred_on >= m::date
   and t.occurred_on <  (m + interval '1 month')::date
   and t.user_id = (select auth.uid())
  group by m
  order by m;
$$;
