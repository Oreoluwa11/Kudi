-- Kudi: give users who signed up before the schema existed a profile and
-- the default categories (the signup trigger only runs for new users).
-- Safe to run more than once.

insert into public.profiles (id, display_name)
select u.id, nullif(u.raw_user_meta_data ->> 'display_name', '')
from auth.users u
on conflict (id) do nothing;

insert into public.categories (user_id, name, target_pct, color_index, sort_order)
select u.id, d.name, d.pct, d.color, d.ord
from auth.users u
cross join (
  values ('Needs', 50, 1, 0), ('Wants', 30, 2, 1), ('Savings', 10, 3, 2), ('Investments', 10, 4, 3)
) as d (name, pct, color, ord)
where not exists (select 1 from public.categories c where c.user_id = u.id);
