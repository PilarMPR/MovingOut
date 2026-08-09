# Architecture

The long-form explanation of the code. [`../CLAUDE.md`](../CLAUDE.md) is the short index that every session loads; this file is what you read when you actually have to change something.

Line numbers drift on every commit. Navigate by symbol:

```bash
grep -rn 'export function' src/lib/
grep -rn 'export const' src/types.ts
```

---

## The layering rule (read this first)

The one structural decision everything else follows from:

```
src/types.ts         the domain model — no logic
src/lib/             pure functions over plain data — no React, no DOM, no storage
src/lib/storage.ts   the ONLY module that touches localStorage
src/i18n/es.ts       every Spanish string
src/state/store.ts   the one piece of mutable state; the only caller of storage
src/components/      thin — reads from lib, renders, writes back
src/tabs/            one file per screen, assembled from src/components/
```

A calculation in a component is a bug (`IND007`): two screens will eventually disagree about what "monthly total" means. A `localStorage` call outside `storage.ts` is a bug (`IND006`): schema versioning and export stop being coherent the moment there are two doors.

The payoff is that `src/lib/` is trivially testable — plain in, plain out, no mocking — and that is where the tests go. All 82 of them run without a DOM.

### The modules

| module | what it owns |
|---|---|
| `lib/money.ts` | integer-cent arithmetic, `Intl` formatting, and `parseAmount` |
| `lib/frequency.ts` | `toMonthly()` and the `÷2` / `÷12` annotation. The only place a bimonthly bill becomes a monthly figure |
| `lib/history.ts` | append-only revisions, per-entry deltas, the cross-item log, the Historial KPI summary |
| `lib/derive.ts` | every figure on every screen: totals, the upfront ledger, breakdown, coverage, drift, verdict, the sixth KPI, furniture totals, project progress, scenario comparison |
| `lib/storage.ts` | load, save, `DEFAULTS`, `ensureShape`, JSON export/import |
| `lib/seed.ts` | `docs/COST-CHECKLIST.md` turned into entries, amounts blank |
| `lib/id.ts` | ids for entries, scenarios, projects |
| `state/store.ts` | the `useStore` hook. Owns `SavedState`, persists on change, and is the only caller of `load` / `save` |

`state/store.ts` is not in `lib/` on purpose: it is a React hook, and `lib/` is the layer that has no idea React exists.

---

## The money model

Amounts are integer cents, always positive, and normalised only at totalling time. Three rules that are easy to get individually right and collectively wrong:

1. **Cents, not euros** (`IND001`) — floats lose money at the third addition. Formatting happens only at the edges and only through `Intl.NumberFormat('es-ES', …)`; see the DEVLOG on why a hand-rolled thousands separator would be wrong for exactly the four-figure numbers this app shows most.
2. **Positive amounts, sign from `direction`** (`IND005`) — store `65000`, never `-65000`. Applying the sign twice produces a plausible number rather than an obviously broken one. `monthlyTotals()` is the single place the sign is applied.
3. **Frequency normalised only at totalling time** (`IND004`) — `toMonthly()` is the only function that divides. It returns `null` for `unico`, which is not zero: a one-off belongs in `upfrontCash`, and amortising it over twelve months would hide that all of it is due on day one.

**`parseAmount` is locale-specific and deliberately not `parseFloat`.** With both separators present the last one is the decimal point (`1.695,50` and `1,695.50` are the same money). With only a comma it is always decimal, because this is an `es-ES` app. Only a lone dot is ambiguous, and there a trailing group of exactly three digits reads as thousands.

**Blank is not zero.** `Entry.hasAmount` carries the difference. A blank renders as a dashed `— —`, is excluded from every total, and is counted into the coverage figure printed beside that total. A zero would be a claim; a dash is an admission.

---

## Derived figures

All of them come out of `derive.ts`. The ones with a rule behind them:

| figure | the rule |
|---|---|
| `upfront.cashCents` / `spendCents` | Two figures, never one. The fianza is refundable, so it counts toward cash needed and never toward money spent — and runway never treats it as burned |
| `runwayMonths` | Only computed when the balance is negative. There is no branch in which a positive balance reports runway, which is why `∞ meses` cannot render |
| `sixth` | A discriminated union — `runway` / `margin` / `buffer`. The Resumen slot does not move; its identity changes with the sign |
| `verdict` | `falta` below zero, `justo` below 5 % of monthly salidas, `ok` above. The marginal band exists because a balance can survive on paper and not in life |
| `maxAffordableRentCents` | A share of income, and nothing more. It never gates an input |
| `drift` | Current burn against burn at the first revision of every entry. `null` until something has actually been revised — a drift of zero would claim the question had been asked and answered |
| `breakdown` | Salidas by category. Paused categories stay in the list, with no bar and the word instead of a number |

`countsMonthly()` and `countsUpfront()` are the two predicates everything else is built on. `pausado` is the deliberate exclusion; `pendiente` still counts, because an annual premium you have not paid yet is still a cost of living there. Furniture only enters `upfrontCash` when it is `esencial` — the minimum to move in is what you cannot move in without.

---

## Price history

`Entry.history` is append-only (`IND002`). `pushRevision()` returns a new `Entry` with the revision appended; nothing in the codebase writes into an existing element, and `log()` copies before sorting. The current amount is the latest revision.

Revisions are committed on blur, not on keystroke — `EditableAmount` holds a draft in local state and calls `store.reviseAmount` once. A revision per keypress would turn the changelog into noise. Clearing a cell is not a revision: it sets `hasAmount: false` and leaves the record of what there was.

This is a log of **estimates**, not of spending. There is deliberately no daily expense logging, and Historial must never grow into a transactions feed — the app has to stay useful without daily upkeep.

---

## Persistence and schema evolution

The schema evolves **on read**: `ensureShape()` fills missing keys and coerces types on every load. A new field needs a default in `DEFAULTS` **and** a backfill in `ensureShape` (`IND003`) — with only the first, saved data breaks on load and the failure looks like data loss.

`ensureShape` never throws. Unknown enum values fall back, negative amounts are made positive, float amounts are rounded, a dangling `activeScenarioId` is repaired, and a payload that is not even an object still opens the app. The alternative — refusing to start — is worse than opening with one field missing.

Two implementation notes that exist to satisfy the static check, and will bite whoever edits them:

- `DEFAULTS` is a concise arrow body returning an object literal, `(...) => ({ … })`. `check_ind003` extracts the depth-1 keys by walking from the first `{`, so a `function` form would bury them one brace deeper and silently disable the parity check.
- The module doc comment does not write `DEFAULTS()` or `ensureShape()` in call syntax, because that check does not skip comments and will match the prose instead of the code.

`version` is `2`. Version 1 predates `Entry.hasAmount`; the backfill reads a saved amount above zero as a real estimate and a saved zero as a blank.

---

## Rendering and the design tokens

Every colour resolves through a custom property in `src/styles/tokens.css`. Tailwind consumes the variables and owns no colour of its own, so swapping the palette stays a nine-line edit. `check.py` flags a raw hex anywhere else under `src/`.

The stylesheet order in `src/main.tsx` is deliberate: fonts, tokens, Tailwind's layers, then `app.css`. A bare CSS `@import` inside a stylesheet is hoisted to the top of the file, which would land the component sheet *underneath* Preflight instead of on top of it.

`app.css` is the component sheet from `docs/mockups/independence.html`, de-scoped from `.app` and with every literal colour routed through a token. Colour has exactly two jobs and they never overlap: semantic carries meaning, accent carries interaction. If a number renders in the accent, that is a bug.

**Mobile is a real component fork at 820 px**, not a responsive table. `App.tsx` watches a `matchMedia` query and mounts `CostesMobile` instead of `Costes`. Both read the same `Entry[]`, and `src/lib/` does not know which one is mounted.

---

## The reference app

The interaction grammar comes from `~/repos/work/HotPotato_CommandCenter/index.html` — inline-editable table cells, KPI cards coloured by sign, status `<select>`s coloured by value, `.tag` verdict pills.

What is **not** taken from it: its architecture. That app is one self-contained `index.html` with no build step, backed by Firestore and shared between several people. This one is a built React app, single-user and offline. Its escaping, sync and auth invariants therefore do not apply here — the table in `../CLAUDE.md` says which and why.
