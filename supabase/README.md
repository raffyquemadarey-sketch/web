# Supabase schema

SQL the developer applies **by hand**. Nothing in this directory runs
automatically: the app only ever holds a publishable key, there is no
service-role key anywhere in this repo, and no migration runner is wired up.
The files live here so the schema is reviewable and version-controlled rather
than existing only inside somebody's dashboard.

## What is public

Every quick play is readable by anyone on the internet who has the site's URL,
signed in or not — its title, its settings, its teams, its bracket, and its
roster of player names. That is deliberate: the club's list and every session
are meant to be open. Nothing that must not be public belongs in a quick play.

Writing one is the opposite: creating, editing and deleting a quick play is
limited to an account whose `public.profiles.role` is `admin`, and that is
enforced by Row Level Security in Postgres, not by the app's UI.

## Applying `migrations/`

0. **Drop the old Quick Play table. This is a required first step, not an
   upgrade note** — unless the probe below says the project is clean.

   The table's ownership model changed from one anonymous identity per browser
   to club-public reads with admin-only writes. There is no upgrade path: the
   old table has an `owner uuid not null` column this version does not, and
   `create table if not exists` is a silent no-op against it.

   **SQL Editor → New query**, and find out which state the project is in:

   ```sql
   select to_regclass('public.quick_play_sessions'), to_regclass('public.profiles');
   ```

   | `quick_play_sessions` | `profiles` | State | Do |
   | --- | --- | --- | --- |
   | `null` | `null` | Clean project, nothing applied. | Skip to step 1. |
   | a name | `null` | **The previous, owner-scoped version was applied.** | Run the drop below, then step 1. |
   | a name | a name | This version is already applied. | Step 1 again is safe; it is idempotent. |

   The probe names tables, not versions, so the last row is a guess and the
   guard in the migration is the authority: if step 1 stops with the error
   below, the table is the old one after all — run the drop.

   The middle row is also what the app looks like from the outside: the Quick
   Play list says “We couldn't load the quick plays — permission denied for
   table quick_play_sessions”, and opening a session says “We couldn't load
   this quick play”. The old file revoked everything from `anon`, so a
   signed-out read is refused before RLS is consulted.

   ```sql
   -- Removes the Quick Play table left by the previous version of this file,
   -- together with its policies, indexes and triggers. What it holds is quick
   -- plays saved under the anonymous-ownership model — each one tied to a
   -- browser identity that is being switched off in step 4 — and none of it can
   -- be carried over. Nothing else is touched: `auth.users` is untouched, and
   -- `public.profiles` does not exist yet in this state.
   drop table if exists public.quick_play_sessions cascade;
   ```

   Run the probe again afterwards. Both columns should read `null`.

   **If you skip this**, step 1 stops on its first statement with:

   ```
   ERROR: public.quick_play_sessions still has the owner column from the previous version of this migration
   HINT:  Run step 0 in supabase/README.md first: drop table if exists public.quick_play_sessions cascade;
   ```

   That is the guard at the top of the migration refusing to run, and nothing
   was created or changed when it fired. Run the drop above, then run the
   migration again.
1. **SQL Editor → New query**, paste the whole of
   `migrations/20260820000000_quick_play_sessions.sql`, and press **Run**.
   Expect `Success. No rows returned.` The migration is idempotent, so running
   it a second time is safe. Run it from the dashboard SQL editor (or the CLI),
   which connects as `postgres` — the migration adds a trigger on `auth.users`
   and a less privileged role cannot.

   The same probe from step 0 is the check that it landed — both columns should
   now name a table:

   ```sql
   select to_regclass('public.quick_play_sessions'), to_regclass('public.profiles');
   ```
2. **Create the super admin's account. This step cannot be automated from this
   repo** — it holds no service-role key, and `/register` creates a simulated
   demo profile, not a real account.

   **Authentication → Users → Add user → Create new user.** Enter the admin's
   email and password, and **tick "Auto Confirm User"**. Without it the account
   cannot sign in and `/signin` reports `email_not_confirmed`.
3. Promote it. Back in **SQL Editor → New query**:

   ```sql
   -- Replace the email. This is the super admin: the first and, until you run
   -- this again for someone else, only account that can create or change a
   -- quick play.
   update public.profiles
   set role = 'admin'
   where id = (
     select id from auth.users where lower(email) = lower('you@example.com')
   );
   ```

   Then verify:

   ```sql
   select u.email, p.role
   from public.profiles p
   join auth.users u on u.id = p.id
   order by p.role desc, u.email;
   ```

   Expect exactly one `admin` row. Every other account is a `member` and can
   read quick plays but not change them. To demote someone, run the same
   `update` with `set role = 'member'`.
4. Close the two doors that let a stranger mint an account. Every account that
   matters is created by hand in step 2, so neither is used by anything here.
   Such an account is a `member` and cannot write a quick play either way —
   this is about not leaving open what nothing uses.

   - **Authentication → Sign In / Providers → Anonymous Sign-Ins → Disable →
     Save.** The previous ownership model required this to be on; nothing uses
     it now.
   - **Authentication → Sign In / Providers → Email → Allow new users to sign
     up → off → Save.** Supabase leaves this **on** by default, which means
     anyone holding the publishable key — it ships in the site's JavaScript —
     can `POST /auth/v1/signup` and get a real `auth.users` row plus the
     `public.profiles` row the trigger creates for it.

## Regenerating `src/lib/supabase/database.types.ts`

The checked-in types are hand-written in the shape the generator emits, so
regenerating should be a small diff:

```
npx supabase login
npx supabase gen types typescript --project-id <project-ref> --schema public \
  > src/lib/supabase/database.types.ts
```

Replace `<project-ref>` with the project's reference from the dashboard URL.
Never commit the real ref or any key into this repo — the credentials belong in
`.env.local`, which is git-ignored.
