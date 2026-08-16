# MovingOut — archived

> **This branch is the archive of the first attempt, kept whole and no longer worked on.**
> The project is being replanned from scratch as of 2026-08-16, on `backup/blank-slate`
> — one commit, `Start over from a blank slate`. **`main` has not been reset**: it still
> holds this archive, and points at the same commit as `deprecated`. Everything below
> describes the archived app, which built and ran.
>
> The last feature here is the certainty axis — `Entry.kind`, the colchón section
> (`src/tabs/Colchon.tsx`), the Resumen waterfall, storage schema v5 — written up as the
> `Unreleased` section of `CHANGELOG.md`, and `Unreleased` is accurate: it was never
> deployed anywhere. It sat in the working tree, in no commit, until the archive was
> sealed on 2026-08-16; the same commit added the Compras shopping log's mobile fork
> (`src/tabs/ComprasMobile.tsx`), which the shopping-log commit had missed. At that
> point the tree type-checked, built, and passed 178 tests over `src/lib`.
>
> Nothing here is deleted, so any part of it can be read, copied or revived —
> `docs/DEVLOG.md` in particular records what went wrong and why, which is the part worth
> carrying forward.

A personal budget calculator for moving out — what independence actually costs, and whether it's affordable yet.

Rent, the one-off pile you buy on day one, the recurring bills, the small consumables nobody budgets for, and a buffer for when something breaks. Compare real options side by side, and track whether prices have gone up since you planned.

Single user, single device, Madrid, EUR. UI in Spanish, code and docs in English.

## Running

```bash
npm install
npm run dev       # Vite dev server
npm run build     # production build into dist/
npm run preview   # serve the built output
npm run test      # Vitest, src/lib only
```

Requires Node 20+. There is no backend and no account: data lives in `localStorage`, and JSON export/import in **Ajustes** is the backup and device-transfer story. The build output is entirely static, so any static host will do — set `BASE_PATH` if it is served from a subdirectory:

```bash
BASE_PATH=/MovingOut/ npm run build
```

## What is where

| path | what |
|---|---|
| `src/types.ts` | the domain model — the single source of truth |
| `src/lib/` | the pure calculation layer. No React, no DOM. This is what the tests cover |
| `src/lib/storage.ts` | the only module that touches `localStorage` |
| `src/i18n/es.ts` | every Spanish string |
| `src/components/` | the twelve components every screen is assembled from (`DESIGN-SYSTEM.md` §4) |
| `src/tabs/` | the eight screens, plus `Sistema` — twelve files, because Costes and Compras fork on mobile and the colchón is its own section of Costes |
| `src/styles/tokens.css` | every colour in the app, in one `:root` block |

Before changing anything, read [`CLAUDE.md`](CLAUDE.md) for the domain model and the invariants, and [`docs/DESIGN-SYSTEM.md`](docs/DESIGN-SYSTEM.md) for the interface rules. [`docs/COST-CHECKLIST.md`](docs/COST-CHECKLIST.md) is the list of costs people forget, and the source of the app's seeded entries.

```bash
python3 .claude/tools/check.py --all    # the invariant checker
```
