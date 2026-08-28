-- Quick Play: creator ownership.
--
-- Additive. This ALTERs the schema left by 20260820000000_quick_play_sessions.sql,
-- which is applied to a live project and must not be edited. Apply this by hand
-- from the dashboard SQL editor — see supabase/README.md.
--
-- What changes:
--   SELECT          unchanged. Public, anon and authenticated, every row.
--   INSERT          still any admin, but the row must be attributed to the
--                   account making it — nobody can create one in someone
--                   else's name.
--   UPDATE, DELETE  narrowed from "any admin" to "the admin who created it".
--
-- Stated plainly, because it is the point rather than an oversight: an admin who
-- is demoted can no longer edit or delete the quick plays they created, and no
-- other account can either. Those rows are frozen until `created_by` or the
-- profile role is changed by hand in SQL. There is no super-admin tier and no
-- any-admin fallback, deliberately.
--
-- Safe to run more than once.

-- ---------------------------------------------------------------------------
-- 0. Refuse to run while any row has no creator
--
-- `created_by` becomes NOT NULL below, and a row that got past this point with a
-- null creator would be frozen forever under the new policies — no account's
-- auth.uid() can equal null, so nobody could ever edit or delete it again.
-- Leaving one is therefore not neutral. This stops rather than guessing who owns
-- it; the two ways to clear it are in supabase/README.md.
-- ---------------------------------------------------------------------------

do $$
declare
  orphans bigint;
begin
  select count(*) into orphans
  from public.quick_play_sessions
  where created_by is null;

  if orphans > 0 then
    raise exception
      'public.quick_play_sessions has % row(s) with a null created_by', orphans
      using hint =
        'Adopt or delete them first — see "Applying the creator-ownership migration" in supabase/README.md.';
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- 1. The foreign key, before the NOT NULL
--
-- ON DELETE SET NULL cannot coexist with a NOT NULL column: deleting an account
-- would try to write null into it and abort on the constraint instead of doing
-- the SET NULL it promises. RESTRICT is the replacement, and it is a real
-- behaviour change: deleting an auth account that still owns quick plays now
-- fails until those rows are reassigned or deleted.
--
-- The alternative, CASCADE, would take every one of that admin's saved club
-- nights with the account, irreversibly, as a side effect of an action about the
-- login. This table is the club's record of its sessions. An error message you
-- can clear with one UPDATE is the cheaper failure.
--
-- Dropped by discovery rather than by name: the original constraint was created
-- inline by `references`, so it is almost certainly
-- quick_play_sessions_created_by_fkey — but a `drop constraint if exists` on a
-- guessed name would silently do nothing and leave TWO foreign keys on the
-- column, the old SET NULL one included.
-- ---------------------------------------------------------------------------

do $$
declare
  fk record;
begin
  for fk in
    select con.conname
    from pg_constraint con
    where con.conrelid = 'public.quick_play_sessions'::regclass
      and con.contype = 'f'
      and con.conkey = array[(
        select att.attnum
        from pg_attribute att
        where att.attrelid = con.conrelid and att.attname = 'created_by'
      )]
  loop
    execute format(
      'alter table public.quick_play_sessions drop constraint %I', fk.conname
    );
  end loop;
end;
$$;

alter table public.quick_play_sessions
  add constraint quick_play_sessions_created_by_fkey
  foreign key (created_by) references auth.users (id) on delete restrict;

-- ---------------------------------------------------------------------------
-- 2. created_by stops being informational
-- ---------------------------------------------------------------------------

alter table public.quick_play_sessions
  alter column created_by set not null;

comment on column public.quick_play_sessions.created_by is
  'The admin who created this quick play. The only account that may update or delete it, and only for as long as its profile role is still admin.';

comment on table public.quick_play_sessions is
  'Saved Quick Play sheets. Readable by anyone; created by any admin; changed and deleted only by the admin who created them.';

-- ---------------------------------------------------------------------------
-- 3. Policies
--
-- `is_admin()` is tested alongside `created_by` in all three, and the admin half
-- is not redundant: without it a demoted creator would keep write access to
-- every row they ever made, which is exactly what this model refuses.
--
-- Note the two halves on UPDATE. USING sees the row as it is, so an admin cannot
-- target a quick play somebody else created. WITH CHECK sees the row as it would
-- become, so an owner cannot hand `created_by` to another account — and with
-- USING already in force, cannot take one either.
--
-- INSERT is a WITH CHECK rather than a BEFORE INSERT trigger on purpose: it
-- refuses an attempt to attribute a row to somebody else instead of quietly
-- rewriting it, and it lives beside the other rules where `pg_policies` shows
-- it. The column DEFAULT auth.uid() is what keeps the honest client — which
-- never sends the column at all — from ever meeting the check.
-- ---------------------------------------------------------------------------

drop policy if exists "Admins create quick plays" on public.quick_play_sessions;
create policy "Admins create quick plays"
  on public.quick_play_sessions
  for insert
  to authenticated
  with check (
    (select public.is_admin())
    and created_by = (select auth.uid())
  );

drop policy if exists "Admins update quick plays" on public.quick_play_sessions;
drop policy if exists "Creators update their quick plays" on public.quick_play_sessions;
create policy "Creators update their quick plays"
  on public.quick_play_sessions
  for update
  to authenticated
  using (
    (select public.is_admin())
    and created_by = (select auth.uid())
  )
  with check (
    (select public.is_admin())
    and created_by = (select auth.uid())
  );

drop policy if exists "Admins delete quick plays" on public.quick_play_sessions;
drop policy if exists "Creators delete their quick plays" on public.quick_play_sessions;
create policy "Creators delete their quick plays"
  on public.quick_play_sessions
  for delete
  to authenticated
  using (
    (select public.is_admin())
    and created_by = (select auth.uid())
  );
