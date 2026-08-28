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

Writing one is the opposite, and it splits in two: **creating** a quick play is
limited to any account whose `public.profiles.role` is `admin`, while **editing
and deleting** one are limited to the single admin whose id is that row's
`created_by` — and only for as long as that account is still an `admin`. Both
halves are enforced by Row Level Security in Postgres, not by the app's UI.

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

## Applying the creator-ownership migration

`migrations/20260827000000_quick_play_creator_ownership.sql` narrows editing and
deleting a quick play from "any admin" to "the admin who created it". It is
additive: it ALTERs the table the previous migration created rather than
replacing it, and it is idempotent.

**Prerequisite:** step 1 above must already be applied — this migration ALTERs
`public.quick_play_sessions` and fails if that table does not exist.

1. **Probe for rows with no creator, first.** The migration refuses to apply
   while any exist.

   ```sql
   select id, title, created_by, created_at
   from public.quick_play_sessions
   where created_by is null;
   ```

   Expect zero rows. If there are any, note what leaving one would mean: this
   migration makes `created_by` `not null` and keys every write on it, and no
   account's `auth.uid()` can equal null — so a null-owner row could never be
   edited or deleted by anybody, ever again. It is not a neutral leftover. Clear
   them one of two ways:

   ```sql
   -- Adopt them. Replace the email with the admin who should own these rows;
   -- that account becomes the only one that can ever edit or delete them.
   update public.quick_play_sessions
   set created_by = (
     select id from auth.users where lower(email) = lower('you@example.com')
   )
   where created_by is null;
   ```

   ```sql
   -- Or throw them away, if they are not worth keeping.
   delete from public.quick_play_sessions where created_by is null;
   ```
2. **SQL Editor → New query**, paste the whole of
   `migrations/20260827000000_quick_play_creator_ownership.sql`, and press
   **Run**. Expect `Success. No rows returned.` Running it again is safe.

   If it stops with:

   ```
   ERROR: public.quick_play_sessions has N row(s) with a null created_by
   ```

   then nothing was changed — that is the guard at the top refusing before any
   ALTER ran. Clear those rows with step 1 and run it again.
3. **Verify.** The column:

   ```sql
   select is_nullable, column_default
   from information_schema.columns
   where table_schema = 'public'
     and table_name = 'quick_play_sessions'
     and column_name = 'created_by';
   ```

   Expect `NO` and `auth.uid()`.

   The foreign key:

   ```sql
   select conname, confdeltype
   from pg_constraint
   where conrelid = 'public.quick_play_sessions'::regclass and contype = 'f';
   ```

   Expect exactly **one** row: `quick_play_sessions_created_by_fkey`, with
   `confdeltype` = `r` (restrict). **Zero rows is the one way this migration
   could half-land** — the discovery loop dropped the old key and the ADD that
   follows it did not run — and the fix is to run the migration again, which is
   safe. Two rows cannot be the old `on delete set null` key: the loop drops
   every single-column foreign key on `created_by` by `conkey`, whatever it is
   named. It would be a composite or unrelated foreign key on this table, which
   this migration does not touch and which is nothing to do with it.

   The policies:

   ```sql
   select policyname, cmd, qual, with_check
   from pg_policies
   where schemaname = 'public' and tablename = 'quick_play_sessions'
   order by cmd, policyname;
   ```

   Expect four: the unchanged public `SELECT`, `"Admins create quick plays"`,
   `"Creators update their quick plays"` and `"Creators delete their quick
   plays"`.

### Deleting an account now fails while it owns quick plays

This is the behaviour change nobody asked for, so it gets its own heading.
Removing an account from **Authentication → Users** while it still owns quick
plays aborts with:

```
update or delete on table "users" violates foreign key constraint
"quick_play_sessions_created_by_fkey" on table "quick_play_sessions"
```

Nothing was deleted — the whole delete rolls back, so there is no half-removed
account. Two ways through, both run before deleting the account:

```sql
-- Hand the rows to another admin. Replace both emails: the first is who should
-- own them from now on, the second is the account being removed.
update public.quick_play_sessions
set created_by = (
  select id from auth.users where lower(email) = lower('newowner@example.com')
)
where created_by = (
  select id from auth.users where lower(email) = lower('departing@example.com')
);
```

```sql
-- Or delete them, if the club is done with those sessions.
delete from public.quick_play_sessions
where created_by = (
  select id from auth.users where lower(email) = lower('departing@example.com')
);
```

Changing `on delete restrict` to `on delete cascade` in the migration would
instead delete those quick plays along with the account, silently. This repo
chose `restrict` because that loss is irreversible and an error you can clear
with one `update` is not.

### Demotion freezes a demoted admin's quick plays

Running `update public.profiles set role = 'member'` on an admin leaves every
quick play they created readable by everyone and changeable by nobody — not by
them, because the policies test `is_admin()` as well as `created_by`, and not by
any other admin, because they test `created_by` as well as `is_admin()`. The
only ways out are re-promoting that account, or reassigning `created_by` with
the adopt statement above. This is intended, not an oversight.

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
