# Supabase schema

SQL the developer applies **by hand**. Nothing in this directory runs
automatically: the app only ever holds a publishable key, there is no
service-role key anywhere in this repo, and no migration runner is wired up.
The files live here so the schema is reviewable and version-controlled rather
than existing only inside somebody's dashboard.

## Applying `migrations/`

0. If you applied an earlier version of this file, run
   `drop table if exists public.quick_play_sessions cascade;` first. The table's
   shape changed from one row per identity to many, and there is no upgrade
   path. Skip this if you have never run it.
1. Open the Supabase dashboard for this project.
2. **SQL Editor → New query**, paste the whole of
   `migrations/20260820000000_quick_play_sessions.sql`, and press **Run**.
   Expect `Success. No rows returned.` The migration is idempotent, so running
   it a second time is safe.
3. **Authentication → Sign In / Providers → Anonymous Sign-Ins → Enable →
   Save.** Quick Play's ownership model is an anonymous identity per browser,
   which owns every quick play that browser creates. With this switched off,
   creating a quick play fails with an on-screen explanation and the list stays
   empty.
4. Recommended: **Authentication → Attack Protection** — leave the anonymous
   sign-in rate limit at its default, or enable CAPTCHA. Anyone can mint an
   anonymous identity. Each identity is capped at 50 quick plays by a trigger in
   the migration.

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
