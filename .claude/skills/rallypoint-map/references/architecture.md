# RallyPoint architecture

Deeper detail on the four subsystems whose behaviour is not obvious from their
signatures. Read the section you need; each is independent.

- [The Quick Play save loop](#the-quick-play-save-loop)
- [The bracket engine](#the-bracket-engine)
- [The viewer](#the-viewer)
- [The demo store](#the-demo-store)

---

## The Quick Play save loop

`src/lib/quick-play/` — `sync-provider.tsx` (React + Supabase),
`sync-status.ts` (pure, tested), `session-row.ts`, `session-list.ts`.

### The status union

Ten kinds, in `sync-status.ts`. The distinctions that matter, because each was
added to stop the app asserting something false:

| Status | Means | On screen |
| --- | --- | --- |
| `starting` / `loading` / `reloading` | the first read hasn't resolved | header only |
| `saving` / `saved` | screen matches the row | the whiteboard |
| `refused` | a write matched zero rows **and the row still SELECTs** | whiteboard kept, with the user's work |
| `missing` | the row genuinely isn't there | "no quick play at this address" |
| `load-failed` | the first read never produced this quick play | retry panel |
| `error` | a *write* failed after a successful load | whiteboard kept |
| `off` | no Supabase configured | its own panel |

`load-failed` versus `error` is the load-bearing pair: after a successful load
the sheet on screen is real and stays; before one, the sheet in memory is a
**blank default the app invented**, so rendering it would fabricate a session.

### Two pure rules

`canSave(status, canWrite)` — may a write be scheduled?

It stays true across **both** `saving` and `saved`. That is deliberate and
fragile: if it flipped when a write started or finished, the status change would
be a dependency change, the save effect would re-run, and every save would
schedule the next one — an infinite loop. `canWrite` is likewise stable for the
life of a session. **If you add an argument to `canSave`, it must not change
during a write.**

`isOpening(status)` — is none of this quick play on screen yet?

Gates the whole session page. It exists because rendering during the read told
two lies at once: a fabricated blank whiteboard, and — since `created_by`
arrives with the row — a confident sentence about who may change it, when the
owner and a stranger were still indistinguishable.

### Writing

The debounce, the flushes, and the zero-row problem:

- Edits debounce (~800ms), then write.
- `savedRef` holds the last-written session by **reference**; the effect compares
  identity, not deep equality.
- Tab-hide (`visibilitychange`) and unmount both flush — and both are **gated on
  `savable`**. An ungated flush would let a `refused` tab overwrite the row.
- `writeSession` passes `{ count: "exact" }`. **On `count === 0` it re-SELECTs
  the row** and returns `refused` if it's still there, `missing` only if it's
  gone. This is the whole reason the app can tell a permission loss from a
  deletion — PostgREST reports a refused write as a success.

`quick-play-list.tsx`'s `remove()` does the same for DELETE. Any new mutation
must copy this shape or it will silently claim success.

`retryLoad` is gated on `status.kind === "load-failed"`, so it can never re-read
over a loaded sheet or over unsaved work.

---

## The bracket engine

`src/lib/tournament/elimination.ts` and `round-robin.ts`, typed in `types.ts`,
rendered by `src/components/bracket/`. The maths and the rendering are strictly
separated — put nothing that decides a pairing into a component.

### `MatchStatus` is why odd team counts work

```
playable — two real teams; the result is a user decision
pending  — a slot waits on an undecided upstream match (renders TBD)
walkover — exactly one real team; it advances without playing
void     — both slots structurally empty; never played
```

Before this existed, `null` meant both "undecided" and "structurally empty", and
every non-power-of-two count (5, 6, 7, 9, 10…) deadlocked. `walkover` and `void`
are structural filler and **neither is rendered** — a team that draws a bye just
appears in its next-round slot, the way a printed sheet shows it. Every match in
a built view model satisfies `status ∈ {playable, pending}`.

### Structural versus decision-dependent

The line to hold: **bye-ness is fixed at build time; `winner` is not.**

`playNumber` is 1-based and sequential in play order, and depends only on which
matches are *rendered* — never on `decisions`. That is what stops the sheet
renumbering itself mid-tournament. Nine teams renders 16 numbered cards, not 27
with 11 "Bye" cards.

`SlotSource` (`aSource` / `bSource`) is the nearest **rendered** ancestor of a
slot, which may be several hidden byes upstream of the match that structurally
feeds it — chasing that chain is what produces correct `L3` / `W12` labels.
`null` when a slot has no rendered feeder: a first-round slot, a slot whose
occupant is already fixed, or a chain that dies in a void.

Rounds are ordered by dependency depth, not by array position.

### Layout

`bracket-layout.ts` is pure geometry (`layoutSection`) and tested. Connector
lines are CSS-grid row spans with percentage pseudo-elements in
`bracket.module.css`. Cards need `flex-shrink: 0` and an explicit `min-height` —
the default `flex-shrink: 1` plus `overflow: hidden` clipped team names once.

---

## The viewer

`src/lib/auth/viewer.ts` (pure, tested) and `viewer-provider.tsx` (React).

Five kinds: `loading`, `unconfigured`, `signed-out`, `signed-in`, `error`.

`isAdmin` is false for everything that isn't a resolved signed-in admin —
`loading` and `error` included — because the default must be read-only.

`isOwner(viewer, createdBy)` mirrors the RLS policy exactly
(`is_admin() and created_by = auth.uid()`). Both halves matter: a demoted admin
keeps their id on rows they created, so dropping the admin half would offer edits
Postgres silently discards.

`describeViewerError` exists for a specific reason worth preserving: a failed
role read must say **"we couldn't check"**, never a confident "you are not an
admin". The viewer this happens to most is a real admin on a flaky connection,
and telling them they lack access is both wrong and unactionable.

The provider reads the JWT via `getClaims()` — which returns a **three-way**
union, where `{data: null, error: null}` means "no session" and costs no network
call — then reads the `profiles` role, retrying once before giving up.

---

## The demo store

`src/lib/demo/reducer.ts` plus `demo-data-provider` / `demo-session-provider`.

In-memory only. Everything under `/tournaments`, `/admin`, `/register` and
`/dashboard` reads from here and resets on reload. There is no persistence and
no real account — `/register` mints a simulated profile that `/signin` will not
accept.

The store also holds the Quick Play whiteboard while a session is open
(`quickPlay`, `quickPlayId`, `quickPlayDirty`), which is how the shared
`components/admin/` controls work identically on both pages. A reserved id
routes whiteboard patches to that slot rather than into the tournament list, so
an open Quick Play can never leak into the tournaments a page lists.

`restoreQuickPlay` refuses to overwrite a dirty sheet. The UI can no longer reach
that guard, and it is kept deliberately: "never overwrite work the user has
started" is a property of the store, not a fact about which component happens to
be mounted.
