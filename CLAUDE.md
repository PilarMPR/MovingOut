# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A personal budget calculator for moving out. It answers one question — **"can I afford to move out, and when?"** — by modelling what independence actually costs: rent, the one-off pile of things you have to buy on day one, the recurring bills, the small consumables nobody budgets for, and a buffer for when something breaks.

Single user, single device, Madrid, EUR. It is **not** a product, not multi-user, and not a general finance app. Every design decision should favour "correct for one person making one real decision" over "flexible for anyone".

Context that shapes the numbers: the user is currently a **student with no steady income**. Money in is savings, family help, grants and occasional work — not a salary. The model must not assume a payslip.

UI strings are **Spanish**; code, comments and docs are **English**. See [Language](#language).

> **Status — 2026-08-11: built, and re-skinned to the `Independencia` design.** All eleven steps of the build order in `DESIGN-SYSTEM.md` §8 landed on 2026-08-09: tokens, types, `lib`, storage, `i18n`, the component sheet, all seven screens, the mobile fork, and the PWA.
>
> Step 12 — the re-skin to the Claude Design project *Moving out finances app* (`Independencia.dc.html`) — landed on 2026-08-11: a new palette and type stack, a `Sistema` tab, and layout changes to Resumen, Costes, Muebles, Historial and Comparar. **`npm install` is required after pulling**: the mono and body faces changed packages. `tsc` clean, 85 tests over `src/lib` green, production build succeeds.
>
> **Also 2026-08-11: it runs as a desktop app and as an Android APK**, both wrapping the same `dist/` — Electron (`electron/main.cjs`) and Capacitor (`android/`). A `.desktop` entry is installed locally; the APK is debug-signed and built but **not yet installed on a phone**. Still nothing deployed to a public URL. See `CHANGELOG.md`.
>
> **2026-08-15: the categories and rooms became the user's, and a new scenario starts blank.** Both lists are editable in Ajustes; the seeded checklist is now a button rather than a default. Storage schema **v3**, read-compatible with v2. See [Taxonomy](#taxonomy--the-categories-and-rooms-are-the-users) below — it holds rules that are easy to undo by accident.
>
> **Also 2026-08-15: a second starting point, the `Presupuesto mensual · Madrid` template** (`src/lib/template.ts`). The user's own spreadsheet as a scenario, and the *only* module in the repo that carries amounts — read its header before editing it, because that exception has a reason and three of its modelling choices are load-bearing.

> **Node lives at `/home/p/.local/share/node/bin` and is not on `PATH`.** `export PATH="/home/p/.local/share/node/bin:$PATH"` before any `npm` command, or every script in the next section reports "command not found" and it looks like the toolchain is missing when it is not.

## Running

```bash
npm install
npm run dev          # Vite dev server
npm run build        # production build
npm run test         # Vitest, src/lib only

npm run desktop      # build + launch the Electron shell
npm run desktop:dist # package release/ — .tar.gz and linux-unpacked/
npm run android      # build + cap sync android
npm run android:apk  # debug APK via Gradle
```

**There is deliberately no AppImage.** It was built for a while and it never ran here: it needs `libfuse.so.2`, this machine has FUSE 3, and the compat package needs sudo. Leaving it in `release/` meant the most double-clickable file was the one that could not work, which cost an afternoon of "the desktop app won't open" when the desktop app was fine. `tar.gz` unpacks and runs anywhere with no FUSE. Artifact versions come from `package.json` — bump it and `android/app/build.gradle` together.

**The installed app lives at `~/.local/opt/movingout/`**, with a `.desktop` entry in `~/.local/share/applications/` pointing at it. Installing is a copy: `cp -r release/linux-unpacked ~/.local/opt/movingout`.

It deliberately does **not** run from `release/`. That directory is build output — gitignored, and wiped by `rm -rf release` on any repackage — so a launcher pointing into it breaks the moment you rebuild, and worse, it runs whatever happens to be in the working tree, including someone else's half-finished feature. Package from a clean checkout of the branch, then copy.

Note the app may open on a **different workspace** than the one you are on — which also reads as "it didn't open". `wmctrl -lG | grep MovingOut` settles it in one line.

**The native builds need two toolchains that are not on `PATH`** — same situation as Node, below:

```bash
export JAVA_HOME="$HOME/.local/share/jdk"        # Temurin 21; the system java is a JRE, no javac
export ANDROID_HOME="$HOME/Android/Sdk"          # platform 36, build-tools 36.x, licences accepted
export PATH="$JAVA_HOME/bin:$ANDROID_HOME/platform-tools:$PATH"
```

Both desktop and Android wrap **the same `dist/`** the web build produces — there is no platform-specific source. `APP_TARGET` (`web` | `electron` | `android`) selects the build; the service worker is built only for `web`.

Icons are **generated, not drawn** — `python3 scripts/make-icons.py` reads the `:root` block and rewrites `public/` and the Android launcher set. Run it after any palette change, or the icons keep the old one silently.

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
  category         // a live id from SavedState.categories — see Taxonomy below
  frequency        // 'mensual' | 'bimestral' | 'trimestral' | 'anual' | 'unico'
  priority         // 'esencial' | 'deseable'
  status           // 'activo' | 'pausado' | 'pendiente' | 'pagado'
  amountCents      // integer, ALWAYS POSITIVE
  hasAmount        // false means blank — which is NOT zero
  history[]        // append-only [{ date, amountCents, note? }]
  room?            // furniture only: a live id from SavedState.rooms.
                   // Its presence is what MAKES an entry furniture
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

### Taxonomy — the categories and rooms are the user's

`Taxon { id, label }`. Two lists, `SavedState.categories` and `SavedState.rooms`, and both are **app-wide, not per-scenario** — Comparar puts scenarios side by side, and a breakdown can only be compared against one drawn on the same axis. All the operations live in `src/lib/taxonomy.ts`.

The rules that keep it from quietly losing data:

- **Ids are opaque and permanent; labels are editable.** An entry stores the id, so renaming "Ocio" to "Caprichos" re-titles the group and re-files nothing. **Never store a label on an entry.**
- **`otros` exists in both lists and cannot be deleted.** Deleting any other category re-files its entries onto it — across *every* scenario, since the lists are app-wide — so a delete never orphans a row. Its bin renders visibly disabled. A great deal leans on this one row existing: `removeTaxon` always has a destination, `ensureShape` always has something to coerce onto, and the Costes `<select>` can never be empty.
- **Deleting a room re-files, it does not clear.** `room !== undefined` is what makes an Entry furniture, so clearing it would move an article out of Muebles and into the Costes grid with no error anywhere.
- **`Category` and `Room` are `string`, not unions.** The compiler no longer proves a category exists; `storage.ts` does, at read time, by coercing any dangling id onto the fallback. That trade is deliberate and it moved the failure mode from "won't compile" to "lands in Otros", which is why the backfill is tested rather than assumed.
- **`es.category` / `es.room` label the shipped set only** (`satisfies Record<DefaultCategoryId, string>`). A user-created label is data and never passes through i18n — that is the line IND008 draws: app copy is translated, user content is not.

**A new scenario is blank** — `newScenario()` returns `entries: []`. The seeded checklist is still in `src/lib/seed.ts` and is now a button in Ajustes (`Cargar checklist`), because it is a prediction from `docs/COST-CHECKLIST.md` and arriving to 77 rows you did not write makes the first task deleting the wrong ones. Loading it restores any category or room it files under that you have since binned.

**There are two starting points, and they are opposites.** `src/lib/template.ts` is the second: the user's `PRESUPUESTO MENSUAL · Madrid` spreadsheet as a whole scenario — 22 rows **with** amounts, a situación of `empleado`, and a colchón target. `Crear escenario de plantilla` creates a new scenario and opens it rather than pouring rows into the open one, because the sheet carries scenario-level fields too. Four things about it are easy to undo by accident, and all four are argued in its module header:

- **It invents two categories** — `esporadicos` and `catastrofe` — and files everything else on the *domain* axis, so alquiler stays under `vivienda`. A group that comes out empty (`fijos` did) means the axis is redundant with one that already exists.
- **The five contingencies arrive `pausado`.** They size the buffer target; live, they are `unico` rows and `countsUpfront()` accepts them, which would claim you need 8.400 € before you can sleep there.
- **The buffer target is summed from those five**, never written as a literal.
- **Every row's amount is also its first `history` revision**, or the first edit is recorded as the original and the drift against the sheet is lost (IND002).

The no-hardcoded-figures rule above is about *published* numbers that go stale and read as authoritative. One person's estimates of their own budget, arriving as a revisable first revision, are not that — but say so in the header if you add another such module, or the next reader will reasonably conclude the rule was ignored.

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

> **The design is resolved.** [`docs/DESIGN-SYSTEM.md`](docs/DESIGN-SYSTEM.md) holds the token block, the component sheet, every screen and the mobile fork. **Read it before writing any component**, and prefer it over this section when the two disagree. The live component sheet is the app's own **Sistema** tab, rendered against the real tokens — prefer it over any picture. [`docs/mockups/movingout.html`](docs/mockups/movingout.html) is the *previous* design, kept as a record of it. What follows is the summary.

The visual and interaction grammar is lifted from a sibling repo the user owns: `~/repos/work/HotPotato_CommandCenter` (`index.html`). Read its Overview and Financiero tabs before designing a screen here. Locate the reference with:

```bash
grep -n 'DESIGN TOKENS\|^\.panel\|^\.kpi\|^\.tag\|^\.tbl' ~/repos/work/HotPotato_CommandCenter/index.html
grep -n 'HP\.renderOverview\|HP\.renderFinanciero' ~/repos/work/HotPotato_CommandCenter/index.html
```

Tabs: **Resumen · Costes · Muebles · Proyectos · Historial · Comparar · Ajustes**, plus **◇ Sistema**. Comparison is the reason the app exists, so it is a screen, not a mode. Sistema is the component sheet rendered against the live tokens; it sits apart on the right of the tab row and is desktop-only.

The grammar to keep:

- dark panel headers with mono, uppercase, letter-spaced micro-labels
- big display-font KPI numbers, coloured green / red / amber **by sign**, blue for a fact that has no sign
- `.tag`-style pills for verdicts (`✓ TE LO PUEDES PERMITIR` / `✗ TE FALTAN 120 €/MES`)
- horizontal breakdown bars for where the money goes
- **inline-editable table cells** that write straight to state — the whole Costes tab is one editable grid, not a form behind a modal
- **status `<select>`s whose colour is driven by the selected value**, so the table is readable at a glance
- one plain-language insight line at the bottom of Resumen that states the answer in a sentence

### The palette — `Independencia` / Papel, adopted 2026-08-11

Warm paper ground, near-black ink, **indigo** accent, four semantics. **Light mode only**: the product commits to one look. The design also ships Plano and Noche; neither is built, and `DESIGN-SYSTEM.md` §2 records what shipping one would cost.

**Every colour lives as a CSS custom property in a single `:root` token block** in `src/styles/tokens.css`, and Tailwind consumes those variables rather than hardcoding hex values. Swapping the palette is that block, not a sweep across components. **Do not introduce a raw hex anywhere outside it.**

The rule that generates the palette, and the one most likely to be undone by accident:

| | carries | used for |
|---|---|---|
| **Semantic** — green `#157F4C` · red `#C0271A` · amber `#9E6400` · blue `#0E7490` | **meaning** | sign of the balance, state of a row, the verdict |
| **Accent** — indigo `#4438CA` | **interaction** | focus ring, active tab, primary button, links, add-row |

They never overlap. A category never gets a colour of its own — breakdown bars are one accent tone at descending opacity — because the moment `vivienda` is blue, green stops meaning "good". **If a number renders in the accent, that is a bug.**

**`--blue` is informational, and it is new.** It carries the three facts that are neither good nor bad: an amount already `pagado`, money that is refundable, and a `único` payment with no monthly equivalent to report. `pausado` still gets **no hue at all** — it is a deliberate absence rather than a fact, and colouring it would turn an exclusion into a judgement. (This repo previously said there is no `--info` token; `DESIGN-SYSTEM.md` §1 has the argument for why that changed.)

## Architecture conventions

- **`src/lib/` is a pure calculation layer** — plain functions over plain data. No React, no storage, no DOM. This is what Vitest covers, and the UI stays thin enough that a bug is almost always in `lib` or almost always in a component, never ambiguously between them.
- **`src/lib/storage.ts` is the only module that touches `localStorage`** (`IND006`). The saved payload carries a schema `version`, and shape changes are handled by **read-time backfill**, not migrations. JSON export/import goes through the same module.
- **`src/types.ts`** — the single source of truth for the model above.
- **`src/i18n/es.ts`** — every Spanish string, plus `plural()`. No Spanish literals in components (`IND008`).
- **`src/state/store.ts`** — the `useStore` hook: the one piece of mutable state, and the only caller of `storage`. Not in `lib/`, because `lib/` does not know React exists. Tabs receive it as a prop; there is no context.
- **`src/components/`** is the twelve-component sheet from `DESIGN-SYSTEM.md` §4; **`src/tabs/`** is one file per screen, assembled from those and reaching past them for nothing. `src/tabs/Sistema.tsx` renders that sheet against the live tokens, which is what stops it drifting from what ships.

- **`electron/` and `android/` are shells, not forks.** Neither contains app logic, and neither is allowed to: they exist to host `dist/`. Both are careful to serve it from a **real origin** — `app://movingout` on the desktop, `https://localhost` on Android — because `localStorage` is keyed to an origin and a `file://` page's origin is opaque. Loading `dist/index.html` directly would render fine and lose data. See `docs/DEVLOG.md`.

Long-form, with the reasoning: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

## Workflow

### The invariants

Numbered failure modes for this stack, checked statically by `.claude/tools/check.py`, which runs automatically after edits under `src/`.

```bash
python3 .claude/tools/check.py           # changed lines
python3 .claude/tools/check.py --all     # whole tree
```

> **Mostly seeded, two earned.** The sibling repo's invariants each came from a bug that actually happened; this table started as a prediction from the shape of the stack. **`IND001` fired for real** on a locale bug in the amount parser, not a float; **`IND003` fired** when `categories` and `rooms` were added to the saved payload without a backfill, and blocked the write. The rest have not fired once. Treat the unfired ones as provisional: an entry that never fires should be deleted, and a failure that recurs in [`docs/DEVLOG.md`](docs/DEVLOG.md) three times should be promoted **into** it with a check in `check.py`.
>
> IND003 is the argument against pruning too early: it was silent through the whole build — defaults and backfill are one thought when the schema is written in a single sitting — and fired the first time a field was added months later, which is the only case it was ever for.

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

The build order is done and the re-skin has landed, type-checked, tested and built. What is left is the part only real use can drive:

1. **Build one real scenario from the blank canvas** — type the conceptos that actually apply, add the categories that are missing, bin the ones that are not. That is now the primary way to find out whether `COST-CHECKLIST.md` predicted well: what you reach for and cannot find is the gap. Load the checklist afterwards to see what it would have added and you did not need.
2. **Install the APK on the phone** — `android:apk` produces a debug-signed one, and `adb install` needs a device connected (there was none when it was built). The export/import round-trip is the only backup story, so it wants testing on the device that will actually hold the data. A **static deploy is now optional rather than the only route onto the phone**, but it is still the easiest way to reinstall.
3. **Prune the invariants.** Six of the eight have never fired. After a few weeks of real edits, delete the ones that never do — `docs/DEVLOG.md` has the recurrence table, and its IND003 note is the case for patience with the ones that only matter at change time.

Known soft spots, in case one bites: `<input type="date">` renders in the *browser's* locale, not the document's; and a near-zero deficit produces an honest but startling runway (a 12 €/mes gap against 4 900 € of savings is genuinely 408 months).
