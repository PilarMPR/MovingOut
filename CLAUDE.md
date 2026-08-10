# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A personal budget calculator for moving out. It answers one question — **"can I afford to move out, and when?"** — by modelling what independence actually costs: rent, the one-off pile of things you have to buy on day one, the recurring bills, the small consumables nobody budgets for, and a buffer for when something breaks.

Single user, single device, Madrid, EUR. It is **not** a product, not multi-user, and not a general finance app. Every design decision should favour "correct for one person making one real decision" over "flexible for anyone".

Context that shapes the numbers: the user is currently a **student with no steady income**. Money in is savings, family help, grants and occasional work — not a salary. The model must not assume a payslip.

UI strings are **Spanish**; code, comments and docs are **English**. See [Language](#language).

> **Status — 2026-08-09: the app is built.** All eleven steps of the build order in `DESIGN-SYSTEM.md` §8 have landed: tokens, types, `lib`, storage, `i18n`, the component sheet, all seven screens, the mobile fork, and the PWA. 82 tests over `src/lib`. Nothing is deployed yet.

## Running

```bash
npm install
npm run dev          # Vite dev server
npm run build        # production build
npm run test         # Vitest, src/lib only
```

Stack: **React + TypeScript + Vite + Tailwind**, installable as a **PWA** (`vite-plugin-pwa`), tested with **Vitest**. No backend, no accounts, no auth — data lives in `localStorage`, and JSON export/import is the backup and device-transfer story.

Deploy target is a static host (GitHub Pages or similar); the build output is entirely static.

## Domain model

The vocabulary below is the shared language for every conversation about this app. `src/types.ts` is its single source of truth.

### Scenario

A complete named budget — `"Piso centro 900€"`, `"Compartir con Ana"`. Scenarios exist side by side and are **comparable**: the point of the app is deciding between real options, not budgeting one.

Each scenario carries a **situación**: `estudiante | becario | empleado | autónomo`. This is a header-level switch, and it selects which income and tax assumptions apply. It is deliberately a property of the scenario, not of the app, so "what if I get a job" is just another scenario.

### Entry — the universal unit

Income, costs, taxes and furniture are all `Entry`. One shape means frequency handling, price history and totalling are written **once**:

```ts
Entry {
  id
  label            // "Alquiler", "Beca", "Detergente"
  direction        // 'entrada' | 'salida'
  category         // vivienda | suministros | consumibles | alimentacion |
                   // transporte | ocio | impuestos | ingresos | mobiliario | otros
  frequency        // 'mensual' | 'bimestral' | 'trimestral' | 'anual' | 'unico'
  priority         // 'esencial' | 'deseable'
  status           // 'activo' | 'pausado' | 'pendiente' | 'pagado'
  amountCents      // integer, ALWAYS POSITIVE
  hasAmount        // false means blank — which is NOT zero
  history[]        // append-only [{ date, amountCents, note? }]
  room?            // furniture only: cocina | salon | dormitorio | bano | otros
  projectId?       // links to a PurchaseProject
  note?
  refundable?      // the fianza: counts in upfrontCash, never in actualSpend
  shouldNotPay?    // agency fees: shown at 0, struck through, never in a total
}
```

**`hasAmount`.** A blank amount is the normal state — the seeded checklist ships without prices on purpose — so it is modelled explicitly rather than as a zero. Blanks render as a dashed `— —`, stay out of every total, and are counted into the coverage figure printed beside that total. A zero is a claim; a dash is an admission.

**Direction.** `entrada` (money in) and `salida` (money out) live in **one table**, so a grant, family help and the rent are all rows in the same grid with the same controls. Amounts are stored **positive**; the sign is applied at calculation time from `direction`. Never store a negative amount — see `IND005`.

**Frequency.** Stored as the *real* frequency and normalised only when totalling. Water and gas are commonly billed **bimonthly** in Spain, and insurance annually; a budget that assumes everything is monthly is wrong before you start. See `IND004`.

**Status** is what makes the table live rather than a snapshot: `pausado` keeps a row without counting it, `pendiente` / `pagado` track one-offs you have not bought yet.

### The rest

- **FurnitureItem** — an `Entry` with `room` set and `status` used as `pendiente` / `pagado`. Grouped by room, filterable to `esencial` only, which gives the true minimum to move in.
- **PurchaseProject** — a named multi-item goal (`"Amueblar salón"`) with its own budget and target date. Entries join via `projectId`.
- **Buffer** — the emergency reserve **target**, and only that. The contributions that build it — the reserve itself and the appliance sinking fund — are ordinary **monthly** `Entry` rows in `otros`, not fields, because that is how you actually build a buffer *and* because it keeps totalling on one code path. See `docs/DEVLOG.md` for why the two contribution fields were dropped from the type.

### Derived figures

All computed in `src/lib/`, never inline in a component (`IND007`):

| Figure | Meaning |
|---|---|
| `monthlyIn` / `monthlyOut` | Frequency-normalised totals per direction |
| `balance` | `monthlyIn - monthlyOut` — the number the whole app exists to show |
| `upfrontCash` | Everything due before you sleep there, fianza included |
| `actualSpend` | `upfrontCash` minus refundables — what you never see again |
| `runwayMonths` | Savings after upfront costs ÷ monthly deficit |
| `maxAffordableRent` | Guideline figure, see the rules below |
| `drift` | Burn today vs burn when the scenario was created |
| `verdict` | The plain-language answer, shown as a `.tag` pill |

## Price history — the changelog

Every `Entry` carries `history: [{ date, amountCents, note? }]`, and it is **append-only**. Revising an estimate **pushes** a new entry; it never mutates an existing one (`IND002`). The current amount is the latest entry.

This is what turns a one-shot calculator into something useful six months later. Derived from it:

- per item — change vs previous, change vs original, % delta
- per scenario — **drift**: is this piso more expensive than when I planned it?
- one **Historial** view across every item, newest first, so a rise in the weekly shop is visible without hunting

This is a log of **estimates**, not of spending. There is deliberately no daily expense logging — the app must stay useful without daily upkeep.

## Taxes & local charges

Framed for a **student in Madrid**, not a salaried filer. Nothing is withheld at source today, so income tax is out of scope — but the structure exists for when it isn't, via the scenario's `situación`.

What actually lands on a renter here:

- **Tasa de basuras** — the municipal waste charge, now billed to residents. Recurring, not monthly.
- **Gastos de comunidad** — the landlord's by default, but **read the contract**; some pass them on.
- **Seguro de hogar** — where the contract requires it. An annual lump, which is exactly the kind of cost a monthly budget hides.
- **IBI** — the landlord's, but occasionally passed on. Again: read the contract.
- **Agency fees are the landlord's by law** since the 2023 Ley de Vivienda. The app must **never** silently budget one. If a listing charges it, that is a thing to challenge, not a line item to accept.
- **Fianza** — legally regulated and **refundable**. It belongs in `upfrontCash`, never in `actualSpend`.

*Future, once there is income to deduct from:* the Madrid deduction for young renters on the annual declaración. Real money, but only once filing.

> **No rate, cap or price is hardcoded anywhere in this repo.** They change every year, and a stale number that looks authoritative is worse than no number. Taxes and charges are ordinary editable entries with a `note` field. When a figure matters, verify the current one — do not trust this file for it.

## Domain rules that are easy to get wrong

The notes that stop a plausible-looking calculation being quietly wrong:

- **Fianza is refundable.** Separate *cash needed upfront* from *money actually spent*. Runway must not treat the deposit as burned.
- **Electricity is seasonal.** A flat monthly average understates winter badly. Prefer a range or a seasonal note over one number.
- **Promo prices expire.** Internet and mobile deals typically jump after ~12 months. An entry can carry a known future price change in its `note`.
- **Rent rises annually.** Spanish rental contracts update yearly against a published reference index. Any multi-month projection must escalate rent rather than hold it flat — and should say which index it assumed.
- **Runway only means something when the balance is negative.** When it is positive, report time-to-goal instead; an "∞ months" runway is a bug in the framing, not a result.
- **Max affordable rent is a rule of thumb** (~30–35% of income), shown to the user as a visible guideline with its assumption stated. It is never a gate that blocks input.
- **The first big shop is not a weekly shop.** Stocking an empty kitchen is a one-off event of its own; folding it into `alimentacion` blows month one silently. See [`docs/COST-CHECKLIST.md`](docs/COST-CHECKLIST.md).

## UI shape — the Command Center skin

> **The design is resolved.** [`docs/DESIGN-SYSTEM.md`](docs/DESIGN-SYSTEM.md) holds the final token block, the component sheet, every screen and the mobile fork. **Read it before writing any component**, and prefer it over this section when the two disagree. A working prototype of all of it is [`docs/mockups/movingout.html`](docs/mockups/movingout.html) — open it in a browser, no build step. What follows is the summary.

The visual and interaction grammar is lifted from a sibling repo the user owns: `~/repos/work/HotPotato_CommandCenter` (`index.html`). Read its Overview and Financiero tabs before designing a screen here. Locate the reference with:

```bash
grep -n 'DESIGN TOKENS\|^\.panel\|^\.kpi\|^\.tag\|^\.tbl' ~/repos/work/HotPotato_CommandCenter/index.html
grep -n 'HP\.renderOverview\|HP\.renderFinanciero' ~/repos/work/HotPotato_CommandCenter/index.html
```

Tabs: **Resumen · Costes · Muebles · Proyectos · Historial · Ajustes**, plus **Comparar** — the side-by-side scenario view, specified in `DESIGN-SYSTEM.md` §5.7. Comparison is the reason the app exists, so it is a screen, not a mode.

The grammar to keep:

- dark panel headers with mono, uppercase, letter-spaced micro-labels
- big display-font KPI numbers, coloured green / red / amber **by sign**
- `.tag`-style pills for verdicts (`✓ TE LO PUEDES PERMITIR` / `✗ TE FALTAN 120 €/MES`)
- horizontal breakdown bars for where the money goes
- **inline-editable table cells** that write straight to state — the whole Costes tab is one editable grid, not a form behind a modal
- **status `<select>`s whose colour is driven by the selected value**, so the table is readable at a glance
- one plain-language insight line at the bottom of Resumen that states the answer in a sentence

### The palette — chosen 2026-08-09

Warm plaster ground, warm near-black ink, **mulberry** accent, earth semantics. Light mode only: the product commits to one look, and dark mode is not a gap. The full block is in [`docs/DESIGN-SYSTEM.md`](docs/DESIGN-SYSTEM.md) §2, ready to paste into `src/styles/tokens.css` as step 1 of the build.

**Every colour lives as a CSS custom property in a single `:root` token block**, exactly as the reference does, and Tailwind is configured to consume those variables rather than hardcode hex values. Swapping the palette is then nine lines, not a sweep across components. **Do not introduce a raw hex anywhere outside that block.**

The rule that generated the palette, and the one most likely to be undone by accident:

| | carries | used for |
|---|---|---|
| **Semantic** — green `#3D6B33` · red `#B23A25` · amber `#8A6212` | **meaning** | sign of the balance, state of a row, the verdict |
| **Accent** — mulberry `#7B3A87` | **interaction** | focus ring, active tab, primary button, links, add-row |

They never overlap. A category never gets a colour of its own — breakdown bars are one warm brown at descending opacity — because the moment `vivienda` is blue, green stops meaning "good". **If a number renders in the accent, that is a bug.** `pagado` and `pausado` get no hue at all (`--stone`): neither is good or bad, which is why there is no `--info` token.

## Architecture conventions

- **`src/lib/` is a pure calculation layer** — plain functions over plain data. No React, no storage, no DOM. This is what Vitest covers, and the UI stays thin enough that a bug is almost always in `lib` or almost always in a component, never ambiguously between them.
- **`src/lib/storage.ts` is the only module that touches `localStorage`** (`IND006`). The saved payload carries a schema `version`, and shape changes are handled by **read-time backfill**, not migrations. JSON export/import goes through the same module.
- **`src/types.ts`** — the single source of truth for the model above.
- **`src/i18n/es.ts`** — every Spanish string, plus `plural()`. No Spanish literals in components (`IND008`).
- **`src/state/store.ts`** — the `useStore` hook: the one piece of mutable state, and the only caller of `storage`. Not in `lib/`, because `lib/` does not know React exists. Tabs receive it as a prop; there is no context.
- **`src/components/`** is the ten-component sheet from `DESIGN-SYSTEM.md` §4; **`src/tabs/`** is one file per screen, assembled from those and reaching past them for nothing.

Long-form, with the reasoning: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

## Workflow

### The invariants

Numbered failure modes for this stack, checked statically by `.claude/tools/check.py`, which runs automatically after edits under `src/`.

```bash
python3 .claude/tools/check.py           # changed lines
python3 .claude/tools/check.py --all     # whole tree
```

> **Mostly seeded, one earned.** The sibling repo's invariants each came from a bug that actually happened; this table started as a prediction from the shape of the stack. After the first build, **`IND001` has fired for real** — on a locale bug in the amount parser, not a float — and the rest have not fired once. Treat the unfired ones as provisional: an entry that never fires should be deleted, and a failure that recurs in [`docs/DEVLOG.md`](docs/DEVLOG.md) three times should be promoted **into** it with a check in `check.py`.

| ID | Invariant | Detail |
|---|---|---|
| IND001 | Money is integer cents | No float arithmetic on amounts. Format only at the edges, with `Intl.NumberFormat('es-ES', { style:'currency', currency:'EUR' })` |
| IND002 | `history` is append-only | Push a revision; never mutate an existing one. The changelog is the feature |
| IND003 | A new field needs `DEFAULTS()` **and** `ensureShape()` | Schema evolves on read; without both, saved data breaks on load |
| IND004 | Never sum mixed frequencies | Always through `toMonthly()`. Bimonthly bills are the common trap |
| IND005 | Amounts stored positive | The sign comes from `direction` at calculation time, or it gets applied twice |
| IND006 | `localStorage` only in `storage.ts` | One door in and out, so versioning and export stay coherent |
| IND007 | Derived figures come from `src/lib/` | Never computed inline in a component, or two screens disagree |
| IND008 | Spanish text only in `src/i18n/es.ts` | Checked by scanning components for Spanish literals |

**Deliberately *not* carried over from the sibling repo**, so they don't get cargo-culted here:

| Their rule | Why it does not apply |
|---|---|
| `esc()` / XSS escaping | React escapes by default, and there is no shared board — no untrusted input |
| The snapshot echo guard | No realtime sync; `localStorage` is synchronous and single-writer |
| The email allow-list | No auth, no backend, nothing to authorise |
| Never `orderBy` the project list | No Firestore |

### Automation

Three hooks in `.claude/settings.json`, all running the same checker:

- **PostToolUse** — after any Edit/Write under `src/`. Blocks on ERROR only; warnings never block, because a hook that nags gets disabled.
- **PreToolUse** — blocks `git push` when the check fails.
- **Stop** — advisory reminder if code changed with no `CHANGELOG.md` / `docs/DEVLOG.md` entry.

The checker exits cleanly while `src/` does not exist, so it is inert until the app is scaffolded rather than broken.

### Documents

| file | what it is |
|---|---|
| `CLAUDE.md` | this file — the short index every session loads |
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | the long-form code explanation |
| [`docs/COST-CHECKLIST.md`](docs/COST-CHECKLIST.md) | the costs people forget; seeds the app's default entries |
| [`docs/DESIGN-SYSTEM.md`](docs/DESIGN-SYSTEM.md) | **the resolved design** — tokens, components, every screen, the mobile fork, build order. Read before writing a component |
| [`docs/mockups/movingout.html`](docs/mockups/movingout.html) | working prototype of the above; one self-contained file, open it in a browser |
| [`docs/DESIGN-BRIEF.md`](docs/DESIGN-BRIEF.md) | the brief that produced it. Historical now — kept for the *why*, superseded on every *what* |
| [`docs/DEVLOG.md`](docs/DEVLOG.md) | errors, successes and dead ends, tagged with `IND***` IDs |
| `CHANGELOG.md` | one section per deploy, no version numbers |

Note the collision: `CHANGELOG.md` tracks **code**; the app's Historial tab tracks **prices**. They are unrelated, and it is worth saying which one you mean.

### Language

English for `CLAUDE.md`, `.claude/`, `docs/`, `CHANGELOG.md`, code identifiers, comments and commit subjects. **Spanish stays for UI strings and user-facing text**, centralised in `src/i18n/es.ts`. Domain terms that have no clean English equivalent — *fianza*, *empadronamiento*, *autónomo*, *comunidad* — keep their Spanish names in code and docs, because translating them loses the meaning. Invariant IDs are never translated.

### Next step

The build order is done. What is left is the part only real use can drive:

1. **Fill in one real scenario** and see whether the seeded checklist is missing anything — the seed is a prediction from `COST-CHECKLIST.md`, not a used list.
2. **Deploy** to a static host and install it on the phone. The export/import round-trip is the only backup story, so it wants testing on the device that will actually hold the data.
3. **Prune the invariants.** Seven of the eight have never fired. After a few weeks of real edits, delete the ones that never do — `docs/DEVLOG.md` has the recurrence table.

Known soft spots, in case one bites: `<input type="date">` renders in the *browser's* locale, not the document's; and a near-zero deficit produces an honest but startling runway (a 12 €/mes gap against 4 900 € of savings is genuinely 408 months).
