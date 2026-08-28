---
name: rallypoint-map
description: >-
  Map of the RallyPoint badminton app — every folder, page, component and lib
  module, plus the conventions and version traps that are not guessable from the
  code. Read this BEFORE writing, moving, or naming anything in this repo, and
  before answering "where does X live", "where should I put Y", "what does Z
  do", or "how is this project organised". Use it whenever a task touches
  src/app, src/components, src/lib, or supabase/ — including small edits, since
  the traps here (React Compiler freezing register(), tests being node-only,
  proxy.ts not middleware.ts, build-before-typecheck) bite hardest on changes
  that look too small to check.
---

# RallyPoint

A badminton club app: publish tournaments, take registrations, draw brackets, and
run ad-hoc club nights ("Quick Play"). Next.js 16.3.0 App Router, React 19,
TypeScript, Tailwind 4, Supabase. `src/` is the only application root.

Two halves that behave very differently, and confusing them is the most common
mistake here:

- **Tournaments / Admin / Register / Dashboard** — a **simulated demo**. State
  lives in a React reducer in memory and resets on reload. No database, no real
  accounts. `/register` mints a fake profile. It is no longer linked from the
  header or the home page — see `SHOW_REGISTER_CTA` in `site-header.tsx` — but
  stays reachable by URL, which is the only route into the `demo-signed-in`
  state that `/dashboard` and the header's Log out branch depend on. Three links
  to it do survive, each on a route that is itself unadvertised: `/dashboard`'s
  empty state (`dashboard-content.tsx`, a visible `Create an account` button) and
  the two `/tournaments/[id]` entry surfaces (`register-cta.tsx`,
  `enter/confirm-entry.tsx`). Don't call the surface clean without grepping.
- **Quick Play** — **real**. Backed by Supabase with Row Level Security. Real
  email/password sign-in at `/signin`.

These two auth systems are genuinely separate and cannot produce accounts for
each other. Say so plainly rather than implying one login covers both.

---

## Folder map

### `src/app` — routes

Every `page.tsx` is a Server Component unless it says `"use client"`. Interactive
pieces are split into sibling files so the page itself can stay a server
component — that is why you see `page.tsx` next to `*-list.tsx`,
`*-form.tsx`, `*-content.tsx`.

| Route | Files | Real or demo |
| --- | --- | --- |
| `/` | `page.tsx` | Landing. Tournament CTAs **and** the accent band hidden — see `SHOW_TOURNAMENT_CTAS`; the hero CTA is Sign in |
| `/tournaments` | `page.tsx`, `tournaments-list.tsx` | demo — hidden from the nav via `NAV_LINKS[].hidden`; URL only |
| `/tournaments/[id]` | `page.tsx`, `tournament-header.client.tsx`, `tournament-bracket-section.tsx`, `register-cta.tsx`, `not-found.tsx` | demo |
| `/tournaments/[id]/enter` | `page.tsx`, `confirm-entry.tsx` | demo |
| `/admin` | `page.tsx`, `admin-tournament-list.tsx`, `error.tsx` | demo — hidden from the nav via `NAV_LINKS[].hidden`; URL only |
| `/admin/new` | `page.tsx` | demo |
| `/admin/[id]` | `page.tsx`, `manage-tournament.tsx`, `not-found.tsx` | demo |
| `/quick-play` | `page.tsx`, `quick-play-list.tsx`, `new-quick-play-action.tsx` | **real** |
| `/quick-play/new` | `page.tsx`, `create-quick-play-form.tsx` | **real** |
| `/quick-play/[id]` | `page.tsx`, `quick-play-session.tsx`, `save-status.tsx`, `not-found.tsx` | **real** |
| `/signin` | `page.tsx` | **real** Supabase auth |
| `/register` | `page.tsx` | demo — creates a fake profile. Unlinked from the header and home page, still linked from `/dashboard` and `/tournaments/[id]` — see the note above |
| `/dashboard` | `page.tsx`, `dashboard-content.tsx` | demo — reachable by URL; its populated state needs a `/register` submit first |

Root files: `layout.tsx` (providers), `globals.css`, `error.tsx`,
`not-found.tsx`, `favicon.ico`.

`src/proxy.ts` is the request middleware — **not** `middleware.ts` (see Traps).

### `src/components` — organised by *who uses it*, not by what it is

- **`ui/`** — the design system. Generic, no domain knowledge, no data fetching.
  `button`, `input`, `select`, `textarea`, `field`, `radio-group`,
  `segmented-control`, `card`, `form-card`, `callout-panel`, `page-container`,
  `page-header`, `table`, `tag`, `avatar`, `check-icon`, `visually-hidden`.
- **`layout/`** — chrome on every page: `site-header`, `site-footer`,
  `demo-mode-banner`, `skip-link`, `account-menu` (+ its CSS module).
- **`forms/`** — one file per form, each owning its own schema binding:
  `add-player-form`, `import-players-form`, `create-tournament-form`,
  `confirm-entry-form`, `register-form`, `signin-form`.
- **`bracket/`** — rendering only, no bracket *maths*: `bracket-view` (the entry
  point), `elimination-bracket`, `round-robin-bracket`, `bracket-section`,
  `bracket-round-column`, `match-card`, `champion-tag`, `bracket.module.css`,
  and `bracket-layout.ts` (pure geometry, tested).
- **`admin/`** — tournament-running controls, shared by `/admin/[id]` **and**
  `/quick-play/[id]`: `tournament-settings`, `team-assignment`, `team-name-grid`,
  `roster-list`, `roster-fit-notice`, `schedule-estimate-notice`,
  `assignment-wheel`.
- **`tournament/`** — public-facing display: `tournament-card`,
  `tournament-grid`, `tournament-detail-header`, `location-panel`.

**The `admin/` components are shared between the demo tournament page and the
real Quick Play page.** Every prop added for one must default to the other's
existing behaviour, or you will silently change the page you weren't looking at.

### `src/lib` — logic, kept out of React so it can be tested

- **`tournament/`** — the domain core, almost entirely pure and each with a
  `.test.ts`: `elimination` (single + double elim), `round-robin`, `bracket`,
  `shuffle`, `wheel`, `teams`, `roster`, `sizing`, `schedule`, `dates`,
  `naming`, `maps`, plus untested-but-trivial `labels` and `types`.
- **`quick-play/`** — persistence: `sync-provider` (the save loop),
  `sync-status` (`canSave`, `isOpening` — pure, tested), `session-row`
  (row ↔ domain mapping), `session-list` (list query + zod validation).
- **`auth/`** — `viewer` (pure: `isAdmin`, `isOwner`, `accountName`,
  `accountInitials`), `viewer-provider` (reads the JWT then the `profiles` role).
- **`supabase/`** — `client` (browser), `server`, `proxy`, `env`,
  `error-message`, `database.types`.
- **`demo/`** — the in-memory store: `reducer`, `demo-data-provider`,
  `demo-session-provider`, `quick-play`.
- **`validation/`** — `schemas` (zod), `enums`, `dates`. Every form binds here.
- **`import/`** — `names`, `csv`, `read-spreadsheet` (dynamic import).
- **`forms/`** — `clear-field`. Read its docblock before touching any form.
- Loose: `cn`, `fonts`, `site`, `hooks/use-reduced-motion`.

### `supabase/`

`README.md` (hand-applied SQL, run by the developer in the dashboard) and
`migrations/`. There is no migration runner and no service-role key anywhere.

---

## Where does a new thing go?

- Generic and domain-free → `components/ui/`
- Needs domain types but is display-only → `components/tournament/`
- A control that changes a tournament or session → `components/admin/`
- A form → `components/forms/`, with its schema in `lib/validation/schemas.ts`
- Logic you'd want to test → `lib/<area>/`, as a pure `.ts` with a `.test.ts`
- Only ever used by one route → keep it beside that route in `src/app/`

The bias is strong toward **pure functions in `lib/` with tests**, and thin
components that call them. `elimination.ts` is the model to imitate.

---

## Traps

These each cost real debugging. None are guessable from reading the code.

### Next 16, not the Next you remember
- Middleware is **`src/proxy.ts`**, exporting `proxy`. `middleware.ts` does
  nothing; a `runtime` export throws.
- `cookies()` is **async**. `params` and `searchParams` are **Promises** — await them.
- `error.tsx` receives `{ error, retry }` — **not** `reset`.
- `PageProps<'/route'>` and `LayoutProps<'/route'>` are generated globals; don't
  hand-write those prop types.
- **Never add `loading.tsx`** to the `/tournaments` or `/quick-play` ancestor
  chains. One there turned genuine 404s into soft HTTP 200s. Verified by
  controlled experiment, not guessed.
- Check `node_modules/next/dist/docs/` before trusting memory about a Next API.

### React Compiler is on (`reactCompiler: true`)
- **Never write `useMemo` or `useCallback`** — the lint rules error on them.
- The compiler memoizes values it can prove stable, which broke the add-player
  form in a way no type check would catch: `register("name")` ran **once ever**,
  and `reset()` empties react-hook-form's field registry permanently, so the form
  worked exactly once. Use **`resetField`**, not `reset()`, and pair it with
  `reValidateMode: "onBlur"`. `lib/forms/clear-field.ts` records the whole story.

### react-hook-form
- `mode: "onBlur"`. Use **`useWatch`**, never `watch()` — the latter trips
  `react-hooks/incompatible-library`.

### Tests are node-only
`vitest.config.mts` sets `environment: "node"` and `include: ["src/**/*.test.ts"]`.
That is **`.ts` only** — there is no jsdom and no Testing Library, so a `.tsx`
test file will simply never run. This is why display logic lives in `lib/` as
pure functions: it is the only layer that *can* be tested.

### Styling
Tailwind 4 via `@tailwindcss/postcss`, with `@theme static` tokens and
`@layer components` in `globals.css`. Anything needing a media query, `:hover`,
or `:focus-visible` goes in a **CSS Module** beside its component.

Two live gotchas: a "rounded frame" block at the end of `globals.css` forces
`border-radius: 999px` onto `.btn`, `.tag`, `.seg` and `.input` — override it
from an unlayered module rule if you need a different shape. And there are **no
z-index tokens**; the only values in the app are `1` and `3` in
`assignment-wheel.tsx`, plus `50` on the account menu panel.

### Security — RLS is the whole control
The Supabase publishable key ships to every browser, so **UI gating is cosmetic
and RLS is the only real boundary**. Quick Play is public-read; create is
admin-only; edit and delete belong to the admin who created that row.

The failure mode to design around: **a refused write matches zero rows rather
than erroring**, and PostgREST reports success. Never trust a status code —
re-read the row to tell "refused" apart from "deleted". `sync-provider.tsx` and
`quick-play-list.tsx` both do this already; copy their shape.

Env var is `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, not `..._ANON_KEY`. A blank
line in `.env.local` silently shadows a working value in `.env`.

---

## Commands

```bash
npm run build && npm run typecheck && npm run lint && npm test
```

**Run `build` before `typecheck`** — the build generates the route types that
typecheck depends on, so a clean typecheck on a stale build proves nothing.

Tests must stay green; the suite is ~377 cases. `npm run dev` for the dev server
(the browser preview tooling drives it — don't launch servers by hand).

## House rules

No `any`. No new dependencies without asking. Named exports, not default.
Comments explain **why**, not what — the existing ones carry real reasoning and
are worth reading before you change the line above them.

## Working in this repo

Changes run through the four agents in `.claude/agents/` — planner → programmer →
qa → reviewer — per `CLAUDE.md`. Questions and explanations skip the pipeline.

For deeper reference: `references/architecture.md` covers the Quick Play save
loop, the bracket engine's status model, and the demo store's shape.
