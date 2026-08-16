# REWORK — the plan that holds it together

> This document exists because of one sentence in the `Start over from a blank slate`
> commit: the first attempt *"grew feature-first without a plan holding it together,
> and the cost of that was landing in the parts that were hardest to change: the
> storage schema, the taxonomy and the domain model."*
>
> **The plan is the deliverable.** Nothing gets built here that this document has not
> placed. If a change does not fit, the document is wrong and gets edited first —
> that is the whole mechanism, and skipping it is how the first attempt happened.

## What is actually being reworked

The first attempt is not being thrown away because it was bad. It built, ran, packaged
for three targets and passed 178 tests. It is being reworked because three modules
grew past the point where a person can hold them in their head, and all three sit at
the bottom of the dependency graph where every change has to pass through them.

| module | lines | concerns in it | the problem |
|---|---|---|---|
| `src/lib/derive.ts` | 883 | ~15 | Totals, waterfall, cushion, upfront, breakdown, coverage, drift, verdict, KPIs, furniture, projects and comparison in one file. Every screen imports the whole thing. Changing how the colchón sums means opening the file that also decides the verdict. |
| `src/state/store.ts` | 539 | all app state | One `useStore` hook owning scenarios, taxonomy, purchases, projects and settings. Any state change re-renders everything, and the file is the merge conflict. |
| `src/lib/storage.ts` | 426 | schema + 5 migrations | `ensureShape` grew a branch per version. `IND003` guards only the top-level keys — it missed `Scenario.purchases` entirely — so the deeper the payload, the less anything is checking it. |

Everything else in `src/lib` is small, single-purpose and tested. It is not the problem
and it is not being retyped.

## What is carried, and what is written fresh

**Carried unchanged, with its tests.** These encode failures that cost real days, all
written up in [`DEVLOG.md`](DEVLOG.md). Retyping them would re-introduce the bugs.

- `money.ts` — `es-ES` parsing and `Intl` formatting. A lone comma is *always* decimal
  (`12,999` is thirteen euros, not twelve thousand); `es-ES` does not group four-digit
  numbers. Both are pinned by tests and both were found the hard way.
- `frequency.ts` — `toMonthly()`. Bimonthly water and annual insurance are the trap
  (IND004), and this was written before anything that could sum, which is why IND004
  has never fired.
- `id.ts`, `naming.ts` — `uniqueName()` in particular, which fixed four separate
  "the button does nothing" reports that were all one bug.
- `history.ts` — append-only revisions (IND002).
- The **platform shells**: `electron/` and `android/`. These are not the program. They
  encode the `app://movingout` origin fix — a `file://` shell renders perfectly and
  silently makes `localStorage` unreliable across launches — and the `ozone-platform=x11`
  flag, which does nothing unless it arrives on the command line.
- `src/styles/tokens.css` and `scripts/make-icons.py`, which reads it.

**Written fresh, from this document.** `types.ts` (as `domain/`), `derive.ts` (as
`calc/`), `storage.ts` (as `persistence/`), `store.ts` (as `state/`), and every screen.

## Target structure

The rule is **one module, one concern, and dependencies point downward only**. A layer
may import from the layers above it in this list and never from the ones below.

```
src/
  domain/          the vocabulary. Types, constants and predicates. No I/O, no React,
                   no arithmetic beyond a boolean test.
    money.ts       Cents. Parse and format at the edges only (IND001).
    frequency.ts   Frequency + toMonthly() (IND004).
    entry.ts       Entry, and the predicates that classify one: isFurniture,
                   isPossibility, countsMonthly, countsUpfront.
    purchase.ts    Purchase. Deliberately not an Entry — see the type's header.
    taxonomy.ts    Taxon, categories and rooms, and the undeletable fallbacks.
    scenario.ts    Scenario, PurchaseProject, Settings.

  calc/            pure functions over domain values. No React, no storage, no dates
                   read from the clock — every function takes what it needs.
    totals.ts      monthlyTotals, withLogged.
    waterfall.ts   entradas − fijos − registrado = disponible − esporádicos = margen.
    cushion.ts     the colchón. Target is the SUM of critico rows, never stored.
    upfront.ts     dinero al entrar. The figure that was once wrong by 8.400 €.
    breakdown.ts   category slices, estimates and log combined.
    coverage.ts    how much of the budget has an amount at all.
    drift.ts       movement against the first revision.
    verdict.ts     the answer, including `sindatos` — zero is not the same as nothing.
    furniture.ts   Muebles totals and room grouping.
    projects.ts    project progress and its verdict.
    compare.ts     scenario-vs-scenario.
    index.ts       derive() — composition ONLY. No arithmetic of its own.

  persistence/     the single door to localStorage (IND006).
    schema.ts      the current shape, and DEFAULTS().
    migrate/       one file per version step, v1→v2 … v5→v6. Each is a pure
                   function with its own test. No branching megafunction.
    storage.ts     read, write, export, import.

  state/           React state, one hook per domain slice instead of one for all.
    useScenarios.ts  useTaxonomy.ts  usePurchases.ts  useSettings.ts
    store.ts       composition only.

  ui/
    components/    the component sheet. Presentational, no derived figures (IND007).
    screens/       one folder per tab.
    layout/        the responsive fork — see below.

  platform/        the two shells' only source-level difference: capability probes.
  i18n/es.ts       every Spanish string in the app (IND008).
  styles/
```

### Why `calc/index.ts` may not do arithmetic

`derive.ts` today drops `critico` rows in four separate places — `countsMonthly`,
`countsUpfront`, `breakdown` and `derived.costes`. That is four chances to forget, and
forgetting the fourth puts 8.400 € of things that have not happened into the app's most
load-bearing figure. In the new structure the exclusion lives once, in
`domain/entry.ts:isPossibility`, and every `calc/` module asks it. A composition file
that also computes is how the four copies got there.

## Mobile and laptop

Unchanged in principle, because it already works and cost a week to get right: **one
`dist/`, three shells, no platform-specific source.** `APP_TARGET` (`web` | `electron` |
`android`) selects the build; the service worker is built only for `web`.

What *does* change is the responsive fork. Today `CostesMobile.tsx` and
`ComprasMobile.tsx` are hand-maintained duplicates of their desktop screens — two files
that must be edited together and silently drift when they are not. The fork moves into
`ui/layout/`, so a screen declares its wide and narrow arrangements of the *same* rows
and the data path is written once.

The trigger for forking is recorded so it is a decision and not a habit: Costes forked
at 820 px because nine columns cannot fit a phone — a **width** problem. Compras forked
because it is used standing in a shop several times a week and the column you came to
type was behind a horizontal scroll — a **usage** problem. Both are valid; neither is
"it looked cramped".

## Build order

Bottom-up, so nothing is ever written against something that does not exist yet. Each
step is one commit, arrives with its tests, and is a review point.

| # | step | done when |
|---|---|---|
| 1 | This document | — |
| 2 | `domain/money`, `domain/frequency` — ported with tests | old tests pass unchanged |
| 3 | `domain/entry`, `taxonomy`, `purchase`, `scenario` | `tsc` clean, predicates tested |
| 4 | `persistence/schema` + `migrate/` split per version | a v1 payload reads as v6 |
| 5 | `calc/` — one module per commit, `index.ts` last | each has its own test file |
| 6 | `state/` — the four slices, then composition | |
| 7 | `ui/components` — the sheet | |
| 8 | `ui/screens` — one per commit | |
| 9 | shells re-pointed, both targets built and *run* | APK installs; desktop opens |

Step 9 says **run**, not build. `DEVLOG.md` records three separate occasions where a
thing that built did not run, and one where the app ran fine and the test harness lied
about it four times. An artifact that builds is not an artifact that runs.

## Commenting standard

Every module opens with a header saying **what it is for and what it deliberately does
not do**. Every non-obvious decision carries the argument that produced it, in prose,
next to the code — not a restatement of what the line does.

The bar is the existing `types.ts`, which is why it is being rewritten rather than
deleted: the *reasoning* in it is the most valuable thing in the repo. A comment that
says `// increment the counter` is noise. A comment that says why `priority` was not
reused for `kind` saves the next reader from a two-day mistake.

Code, comments and docs are **English**. UI strings are **Spanish**, and they live only
in `i18n/es.ts` (IND008).
