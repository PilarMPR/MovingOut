# Independence

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
BASE_PATH=/independence/ npm run build
```

## What is where

| path | what |
|---|---|
| `src/types.ts` | the domain model — the single source of truth |
| `src/lib/` | the pure calculation layer. No React, no DOM. This is what the tests cover |
| `src/lib/storage.ts` | the only module that touches `localStorage` |
| `src/i18n/es.ts` | every Spanish string |
| `src/components/` | the ten components every screen is assembled from |
| `src/tabs/` | the seven screens |
| `src/styles/tokens.css` | every colour in the app, in one `:root` block |

Before changing anything, read [`CLAUDE.md`](CLAUDE.md) for the domain model and the invariants, and [`docs/DESIGN-SYSTEM.md`](docs/DESIGN-SYSTEM.md) for the interface rules. [`docs/COST-CHECKLIST.md`](docs/COST-CHECKLIST.md) is the list of costs people forget, and the source of the app's seeded entries.

```bash
python3 .claude/tools/check.py --all    # the invariant checker
```
