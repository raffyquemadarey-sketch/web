-- Quick Play, club-public.
--
-- Reads are public: the list and every session are readable by anyone, signed
-- in or not, with nothing but the publishable key. Writes are admin-only and
-- that is decided here, in Postgres — the read-only UI in the app is a
-- courtesy, this is the control.
--
-- The per-browser anonymous-ownership model this file used to carry is gone.
-- Once this is applied, Anonymous Sign-Ins can be switched back OFF in the
-- dashboard — see supabase/README.md.
--
-- `gen_random_uuid()` is built into Postgres 13+; no pgcrypto extension needed.
--
-- Safe to run more than once. NOT safe to run over the previous version of this
-- file — do step 0 of supabase/README.md first, which is required on any project
-- the previous version was applied to. The guard immediately below refuses
-- rather than letting that happen quietly.

-- ---------------------------------------------------------------------------
-- Refuse to run over the previous, owner-scoped version of this file
--
-- Skipping README step 0 would not error on its own: `create table if not
-- exists` is a no-op against the old table, which would keep `owner uuid not
-- null` and never gain `created_by`, while src/lib/supabase/database.types.ts
-- declares the opposite. The app happens to survive that (owner defaults to
-- auth.uid(), and fromQuickPlayRow ignores columns it does not know), so the
-- result is a schema that silently disagrees with the code. Loud beats silent.
-- ---------------------------------------------------------------------------

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'quick_play_sessions'
      and column_name = 'owner'
  ) then
    raise exception 'public.quick_play_sessions still has the owner column from the previous version of this migration'
      using hint =
        'Run step 0 in supabase/README.md first: drop table if exists public.quick_play_sessions cascade;';
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Who is an admin
--
-- One row per auth user. `role` is the only thing that decides whether a write
-- is allowed, and no client can change it: `profiles` grants SELECT and nothing
-- else, and carries no insert/update/delete policy at all. Its only writer is
-- the SECURITY DEFINER trigger below, which bypasses RLS. A holder of the
-- publishable key therefore cannot promote themselves under any circumstances.
-- ---------------------------------------------------------------------------

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role text not null default 'member' check (role in ('member', 'admin')),
  created_at timestamptz not null default now()
);

comment on table public.profiles is
  'One row per auth user. `role` gates every Quick Play write. Client-readable, never client-writable.';

alter table public.profiles enable row level security;

revoke all on table public.profiles from anon, authenticated;
grant select on table public.profiles to authenticated;

-- Reading your own role is how the app knows whether to render editing
-- controls. This policy does not consult `profiles` through a function, so
-- there is no recursion here; see `is_admin()` below for the case that would.
drop policy if exists "Users read their own profile" on public.profiles;
create policy "Users read their own profile"
  on public.profiles
  for select
  to authenticated
  using ((select auth.uid()) = id);

-- Every new account gets a profile. `on conflict do nothing` because a failure
-- in this trigger aborts the INSERT into auth.users, which surfaces as a 500
-- from the auth API rather than as anything a user could act on.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id) values (new.id) on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Accounts that already existed when this was applied, so it does not matter
-- whether the super admin's account was created before or after this ran.
insert into public.profiles (id)
select id from auth.users
on conflict (id) do nothing;

-- The admin test, written once so every policy asks the same question.
--
-- SECURITY DEFINER on purpose: this reads `profiles` from inside a policy, and
-- a policy ON `profiles` that had to consult `profiles` would recurse forever.
-- The definer owns the table and bypasses its RLS, so the read terminates.
-- `set search_path = ''` pins every name to a schema no caller can shadow, so
-- the elevated privilege cannot be pointed at a table the caller controls.
-- STABLE so the planner evaluates it once per statement, not once per row.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'admin'
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

-- ---------------------------------------------------------------------------
-- Quick Play sessions
--
-- Shape: the fixed-option settings are real typed columns with CHECK
-- constraints, because the bracket engine must never be handed a value it has
-- never seen. The collection fields are JSONB because every Quick Play
-- interaction replaces the whole session and nothing ever queries into them or
-- joins across sessions.
--
-- Deliberately NOT stored: the session's reducer id and its start/end date,
-- location, level, divisions and description. Those are inert filler on the
-- Tournament-shaped object and are rebuilt by createQuickPlaySession() on load.
-- `title` IS stored — it is the club's name for the quick play and is shown in
-- the list and on the session page.
-- ---------------------------------------------------------------------------

create table if not exists public.quick_play_sessions (
  id uuid primary key default gen_random_uuid(),

  -- Informational only, and nullable. Ownership is gone: any admin may edit any
  -- quick play, so this records nothing but which admin first made it. ON
  -- DELETE SET NULL rather than CASCADE — removing an admin account must not
  -- take the club's saved sessions with it.
  created_by uuid
    default auth.uid()
    references auth.users (id) on delete set null,

  -- Matches quickPlayTitleSchema in @/lib/validation/schemas: trimmed, 2..60.
  title text not null default 'Quick Play'
    check (length(btrim(title)) between 2 and 60),

  format text not null default 'single'
    check (format in ('single', 'double', 'roundrobin')),
  team_count smallint not null default 4
    check (team_count in (4, 5, 6, 7, 8, 9, 10, 16)),
  court_count smallint not null default 2
    check (court_count in (2, 4, 6, 8)),
  play_type text not null default 'doubles'
    check (play_type in ('singles', 'doubles')),
  match_minutes smallint not null default 20
    check (match_minutes in (15, 20, 25, 30, 45, 60)),
  session_minutes smallint not null default 120
    check (session_minutes in (60, 90, 120, 180, 240, 300, 360, 480)),

  -- The team collections default to a valid 4-team session rather than to
  -- empty arrays: fromQuickPlayRow rejects a row whose collections disagree
  -- with team_count, so a row inserted on bare defaults would be unreadable by
  -- the app. The client always sends every column, but a default that produces
  -- an unopenable row is a trap left lying around.
  teams jsonb not null default '["Team 1","Team 2","Team 3","Team 4"]'::jsonb
    check (jsonb_typeof(teams) = 'array' and jsonb_array_length(teams) <= 16),
  team_players jsonb not null default '[[],[],[],[]]'::jsonb
    check (jsonb_typeof(team_players) = 'array'
           and jsonb_array_length(team_players) <= 16),
  decisions jsonb not null default '{}'::jsonb
    check (jsonb_typeof(decisions) = 'object'),
  roster jsonb not null default '[]'::jsonb
    check (jsonb_typeof(roster) = 'array' and jsonb_array_length(roster) <= 512),
  assigned_player_names jsonb not null default '[]'::jsonb
    check (jsonb_typeof(assigned_player_names) = 'array'
           and jsonb_array_length(assigned_player_names) <= 512),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- Hard ceiling on one row, so a single quick play cannot be used to fill the
  -- database. 256 KB is far more than a club night ever produces. `length` on
  -- the text form is used rather than pg_column_size so the expression is
  -- unambiguously immutable and always accepted in a CHECK.
  constraint quick_play_sessions_size_limit check (
    length(teams::text)
      + length(team_players::text)
      + length(decisions::text)
      + length(roster::text)
      + length(assigned_player_names::text) <= 262144
  )
);

comment on table public.quick_play_sessions is
  'Saved Quick Play sheets. Readable by anyone; writable only by an account whose profile role is admin.';

-- Leftovers from the owner-scoped model, in case a partial earlier attempt is
-- sitting in the database. No-ops on a clean project.
drop index if exists public.quick_play_sessions_owner_updated_at_idx;
drop trigger if exists quick_play_sessions_limit on public.quick_play_sessions;
drop function if exists public.enforce_quick_play_session_limit() cascade;

-- The list query is now "every quick play, newest first" — there is no owner
-- filter left to compose with, so one column is the whole index.
create index if not exists quick_play_sessions_updated_at_idx
  on public.quick_play_sessions (updated_at desc);

-- updated_at is maintained server-side, so a client cannot lie about when it
-- last wrote. Empty search_path keeps Supabase's function linter quiet and
-- removes any search_path hijack surface.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists quick_play_sessions_set_updated_at
  on public.quick_play_sessions;
create trigger quick_play_sessions_set_updated_at
  before update on public.quick_play_sessions
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security
--
-- What a holder of the publishable key can do, exactly:
--
--   Signed out (role `anon`)
--     SELECT  — yes. Every quick play, every column, including the roster of
--               player names. This is the point: the list and every session are
--               public. Do not put anything in a quick play that must not be.
--     INSERT/UPDATE/DELETE — no. `anon` holds no table privilege for them, so
--               PostgREST fails on the missing GRANT (42501) before RLS is even
--               consulted.
--
--   Signed in, role `member` (role `authenticated`)
--     SELECT  — yes, same as anon.
--     INSERT  — refused. The GRANT passes, `is_admin()` returns false, the
--               WITH CHECK fails: 42501, "new row violates row-level security".
--     UPDATE  — the USING clause matches zero rows, so the statement succeeds
--               and changes nothing. There is no error to show; the app must
--               therefore never issue one, and QA verifies by re-reading the
--               row rather than by looking at the status code.
--     DELETE  — same as UPDATE: zero rows, nothing removed.
--
--   Signed in, role `admin`
--     Everything, on every row. There is no per-row ownership.
--
-- `force row level security` is deliberately NOT set: it binds only the table
-- owner, which in Supabase already has BYPASSRLS, so it buys nothing and would
-- only make the dashboard SQL editor look empty and confuse verification.
-- ---------------------------------------------------------------------------

alter table public.quick_play_sessions enable row level security;

revoke all on table public.quick_play_sessions from anon, authenticated;
grant select on table public.quick_play_sessions to anon, authenticated;
grant insert, update, delete on table public.quick_play_sessions to authenticated;

-- Names carried over from the owner model would now be lies.
drop policy if exists "Owners read their own quick plays" on public.quick_play_sessions;
drop policy if exists "Owners create their own quick plays" on public.quick_play_sessions;
drop policy if exists "Owners update their own quick plays" on public.quick_play_sessions;
drop policy if exists "Owners delete their own quick plays" on public.quick_play_sessions;

drop policy if exists "Quick plays are public to read" on public.quick_play_sessions;
create policy "Quick plays are public to read"
  on public.quick_play_sessions
  for select
  to anon, authenticated
  using (true);

drop policy if exists "Admins create quick plays" on public.quick_play_sessions;
create policy "Admins create quick plays"
  on public.quick_play_sessions
  for insert
  to authenticated
  with check ((select public.is_admin()));

-- USING decides which rows may be targeted; WITH CHECK stops an admin's own
-- write from producing a row that would fail the same test.
drop policy if exists "Admins update quick plays" on public.quick_play_sessions;
create policy "Admins update quick plays"
  on public.quick_play_sessions
  for update
  to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

drop policy if exists "Admins delete quick plays" on public.quick_play_sessions;
create policy "Admins delete quick plays"
  on public.quick_play_sessions
  for delete
  to authenticated
  using ((select public.is_admin()));
