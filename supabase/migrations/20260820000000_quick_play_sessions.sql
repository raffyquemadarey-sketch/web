-- Quick Play session storage.
--
-- Many rows per identity: one per saved quick play. `id` is the primary key and
-- is what `/quick-play/<id>` names in the URL; `owner` is the RLS scope. The
-- previous shape used `owner` as the primary key to enforce a one-sheet-per-
-- browser model in the database; that model is gone, so `owner` is now an
-- ordinary indexed column.
--
-- Shape: the fixed-option settings are real typed columns with CHECK
-- constraints, because anyone holding the publishable key can write to their
-- own rows and the bracket engine must never be handed a value it has never
-- seen. The collection fields are JSONB because every Quick Play interaction
-- replaces the whole session and nothing ever queries into them or joins
-- across sessions.
--
-- Deliberately NOT stored: the session's reducer id and its start/end date,
-- location, level, divisions and description. Those are inert filler on the
-- Tournament-shaped object and are rebuilt by createQuickPlaySession() on load.
-- `title` IS stored — it is the user's name for the quick play and is shown in
-- the list and on the session page.
--
-- `gen_random_uuid()` is built into Postgres 13+; no pgcrypto extension needed.
--
-- Safe to run more than once. NOT safe to run over the previous version of this
-- file — see supabase/README.md.

create table if not exists public.quick_play_sessions (
  id uuid primary key default gen_random_uuid(),

  owner uuid not null
    default auth.uid()
    references auth.users (id) on delete cascade,

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
  'Saved Quick Play sheets, many per identity. Owner-scoped by RLS; written whole by the browser client.';

-- The list query is "my rows, newest first". One index serves it exactly.
create index if not exists quick_play_sessions_owner_updated_at_idx
  on public.quick_play_sessions (owner, updated_at desc);

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

-- Per-identity row cap. The previous schema capped an identity at one row by
-- construction (owner was the primary key); many rows removes that, and anyone
-- can mint an anonymous identity. 50 is far more quick plays than a club runs
-- and cheap to count against the owner index.
--
-- SECURITY INVOKER (the default) on purpose: the count runs under the caller's
-- RLS, and the caller can only see their own rows, which is exactly what is
-- being counted. A forged `new.owner` counts zero here and is then rejected by
-- the INSERT policy's WITH CHECK.
create or replace function public.enforce_quick_play_session_limit()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (select count(*) from public.quick_play_sessions
      where owner = new.owner) >= 50 then
    raise exception
      'you already have 50 saved quick plays — delete one before creating another';
  end if;
  return new;
end;
$$;

drop trigger if exists quick_play_sessions_limit
  on public.quick_play_sessions;
create trigger quick_play_sessions_limit
  before insert on public.quick_play_sessions
  for each row execute function public.enforce_quick_play_session_limit();

-- ---------------------------------------------------------------------------
-- Row Level Security
--
-- The publishable key on its own authenticates as `anon`. Nothing below grants
-- `anon` anything, so a holder of that key WITHOUT a session can neither read,
-- insert, update nor delete a single row, and cannot enumerate ids: PostgREST
-- refuses the request on the missing table privilege before RLS is reached.
--
-- WITH a session (anonymous or otherwise) the holder is `authenticated` and can
-- see and change exactly the rows where `owner = auth.uid()` — their own, and
-- no others. A request for another identity's row id is not an error: it
-- returns zero rows, identically to a row id that does not exist. That
-- indistinguishability is deliberate and the app depends on it.
--
-- `force row level security` is deliberately NOT set: it binds only the table
-- owner, which in Supabase already has BYPASSRLS, so it buys nothing and would
-- only make the dashboard SQL editor look empty and confuse verification.
-- ---------------------------------------------------------------------------

alter table public.quick_play_sessions enable row level security;

revoke all on table public.quick_play_sessions from anon;
grant select, insert, update, delete
  on table public.quick_play_sessions to authenticated;

-- `(select auth.uid())` rather than a bare `auth.uid()`: Postgres hoists it to
-- an InitPlan and evaluates it once per statement instead of once per row.

drop policy if exists "Owners read their own quick plays"
  on public.quick_play_sessions;
create policy "Owners read their own quick plays"
  on public.quick_play_sessions
  for select
  to authenticated
  using ((select auth.uid()) = owner);

drop policy if exists "Owners create their own quick plays"
  on public.quick_play_sessions;
create policy "Owners create their own quick plays"
  on public.quick_play_sessions
  for insert
  to authenticated
  with check ((select auth.uid()) = owner);

-- USING decides which rows this identity may target; WITH CHECK stops the
-- update handing a row to somebody else by rewriting `owner`.
drop policy if exists "Owners update their own quick plays"
  on public.quick_play_sessions;
create policy "Owners update their own quick plays"
  on public.quick_play_sessions
  for update
  to authenticated
  using ((select auth.uid()) = owner)
  with check ((select auth.uid()) = owner);

drop policy if exists "Owners delete their own quick plays"
  on public.quick_play_sessions;
create policy "Owners delete their own quick plays"
  on public.quick_play_sessions
  for delete
  to authenticated
  using ((select auth.uid()) = owner);
