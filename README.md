# MovingOut — rework

> **This branch is the rework, and it is where the work happens.** It started from the
> archived first attempt (`main` and `deprecated`, both at `2dbfc10`) and is rebuilding
> the program bottom-up from a plan: [`docs/REWORK-PLAN.md`](docs/REWORK-PLAN.md). Read
> that first — it says what is being rewritten, what is carried across with its tests,
> and in what order.
>
> **The archive is not deleted and is not this branch's problem.** `main` and
> `deprecated` hold the first attempt whole — it built, ran, packaged for three targets
> and passed 178 tests. Anything can be read or copied back from there.
>
> Why a rework at all: three modules grew past what a person can hold in their head, and
> all three sit at the bottom of the graph where every change has to pass through them —
> `derive.ts` at 883 lines and ~15 concerns, `store.ts` a single 539-line hook,
> `storage.ts` 426 lines of schema plus five versions of migration. The plan replaces
> each with focused modules whose dependencies point one way.
>
> [`docs/DEVLOG.md`](docs/DEVLOG.md) is the part of the first attempt worth carrying
> forward, and it is carried: it records what went wrong and why, and several of its
> entries are the reason a given module is being ported rather than retyped.

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
