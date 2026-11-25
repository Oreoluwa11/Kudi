# Kudi

**Give every naira a job.** Kudi is a monthly budgeting app. Record your income, split it across categories, log spending as it happens, and get a warning *before* a category runs over, not after.

Live: https://bizflow-gray.vercel.app

**Try it without signing up:** click **Try the live demo** for a private account with 6 months of sample data.

## Features

- **One-click demo.** Each visitor gets their *own* anonymous account (Supabase anonymous sign-in) seeded by a Postgres function, so demo users never see or break each other's data. Stale demo accounts are deleted nightly by pg_cron.
- **Month-by-month budgets.** Each month has its own income and spending. You can switch to any past month to see how it went.
- **Category allocations.** Each category gets a percentage of income (e.g. 50/30/20). The editor won't save unless the shares add up to 100%.
- **Pace warnings.** Each category's spending is projected to month-end, so Kudi flags "on pace to overspend" while there's still time to change course.
- **Planned vs paid.** Upcoming bills count against the budget before you pay them.
- **Charts.** Cumulative spending against an even pace line, and income vs spending over the last 6 months, with accessible tables behind both.
- **Transactions.** Search, filter by type or category, edit, and mark paid/planned with optimistic updates.
- **Light and dark themes**, and a mobile layout with bottom navigation.
- **Legacy import.** Data saved in the browser by the original localStorage version can be moved into an account in one click.

## Stack

| Layer | Choice |
| --- | --- |
| App | Next.js 16 (App Router, Server Components, Server Actions), React 19, TypeScript |
| Data | Supabase Postgres with row-level security |
| Auth | Supabase Auth (email + password), sessions refreshed in `proxy.ts` via `@supabase/ssr` |
| Validation | zod on every Server Action |
| UI | Tailwind CSS v4 with design tokens, hand-built SVG charts |

## Architecture

```
app/
  page.tsx                 landing page
  login/                   sign in / sign up
  auth/callback/route.ts   email-confirmation handler
  (app)/                   authenticated area (sidebar shell)
    dashboard/  transactions/  budget/
lib/
  supabase/                browser, server and proxy clients
  actions/                 server actions (validated with zod)
  data.ts                  server-side queries
  finance.ts               pure budget math (month summary, pace projection)
supabase/migrations/       schema, RLS policies, triggers, SQL functions
```

- **Reads** happen in Server Components. **Writes** go through Server Actions, then `revalidatePath`.
- **All budget math** lives in `lib/finance.ts` as pure functions, so it is easy to test.
- **Security is enforced in the database, not the client.** Every table has RLS (`user_id = auth.uid()`). Transactions reference categories through a composite foreign key on `(category_id, user_id)`, so a row can never point at another user's category.
- **Categories are archived, never deleted**, so historical transactions keep their labels.
- **A trigger on `auth.users`** creates the profile and default categories when someone signs up.

## Running locally

1. Create a Supabase project and copy `.env.example` to `.env.local` with your URL and anon key.
2. Apply the schema, either with
   `npx supabase link --project-ref <ref> && npx supabase db push`
   or by pasting `supabase/migrations/*.sql` into the Supabase SQL editor.
3. In Supabase → Authentication → URL Configuration, add `http://localhost:4040/auth/callback` (and your production URL) to the redirect URLs.
4. For the demo: turn on **Authentication → Sign In / Providers → Allow anonymous sign-ins**. Optionally enable the `pg_cron` extension and schedule the cleanup:
   `select cron.schedule('kudi-demo-cleanup', '0 3 * * *', 'select public.delete_stale_demo_users()');`
5. `npm install && npm run dev`, then open http://localhost:4040.

## Roadmap

- Recurring transactions (rent, subscriptions)
- Savings goals funded from the Savings category
- CSV import/export
- Unit tests for `lib/finance.ts`, a Playwright end-to-end test, and CI
