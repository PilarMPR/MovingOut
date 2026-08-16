# CHANGELOG

One section per deploy. No version numbers — this is a personal app with a single user, and a semver number would be ceremony without a consumer.

> **`package.json` does carry a version, and that is not a reversal of the line above.** Once the app is packaged, the build tools stamp artifacts with it: the filename `movingout-1.0.0.tar.gz`, Android's `versionName`. Left at `0.0.0` those read as broken rather than unversioned. So the *artifacts* are versioned because something downstream demands it, and the *sections here* still are not, because nothing does. Bump `package.json` and `android/app/build.gradle` together when an artifact goes somewhere.

This tracks **code**. The app's own Historial tab tracks **prices**, which is a different changelog entirely — worth saying which one you mean.

---

## Unreleased — fijo, esporádico, crítico: money now has a certainty axis

The app could tell income from cost, and cost from furniture, but not a bill you owe from a provision you chose — so "te faltan 120 €" meant the same thing whether the rent was short or the clothes budget was. And it had no way at all to write down a cost that **has not happened**: the template's five contingencies were smuggled in as `pausado` rows, because paused was the only status that kept a row visible and out of the totals.

`Entry.kind` is the axis. `fijo` is committed, `esporadico` is real but yours to choose, and `critico` is a possibility rather than an expense.

### Added
- **`Entry.kind`**, a `Clase` column in the Costes grid and a select in the mobile card. Retagging a row `crítico` moves it out of the grid and into the colchón, which is the honest consequence of saying it has not happened.
- **The colchón section**, at the foot of Costes (`src/tabs/Colchon.tsx`). Its columns are in the conditional — `PODRÍA PASAR` and `COSTARÍA` — against the grid's `CONCEPTO` and `IMPORTE`, because those are two different acts of writing.
- **`cushion()`** in `derive.ts`: the possibilities, their sum, how much is covered, and what is still missing a figure.
- **The waterfall on Resumen** — `entradas − fijos − compra registrada = disponible − esporádicos = margen`, with the two subtotals ruled off. A negative `disponible` and a negative `margen` are different emergencies, and the banner under it says which one you are in.
- **`monthlyTotals` now reports `fijosCents` and `esporadicosCents`** beside `outCents`, which stays the sum of both so nothing that reads it needs to know the split exists.
- 11 new tests, including the negative ones: a possibility must not reach `monthlyTotals`, `upfront`, `breakdown` or `derived.costes`.

### Changed
- **The colchón target is no longer stored.** `Scenario.buffer` is gone from the type; the target is `sum(critico rows)`, derived on every read, so it can never disagree with the list that justifies it. The Ajustes field is now a read-only figure that says where it went.
- **Storage schema v5**, read-compatible with v4. A payload with a stored `buffer.targetCents` opens with that amount as the **first line of its cushion** — labelled, noted, and there to be broken down — rather than losing it. An absent `kind` reads as `fijo`, which is what every row written before the field existed actually was.
- **The template's five contingencies are `critico` and `activo`**, not `pausado`. Nothing in the template is switched off any more, and `pausado` goes back to meaning only that.
- **The template's fund contribution is `esporadico`.** It is regular, so the word reads oddly — but the axis is how *committed* the money is, and paying yourself is the first thing that stops in a bad month. Above the line it would disappear into `disponible` and the app would present a choice as a bill.

### Fixed
- **The `IMPORTE` cell in Costes no longer clips its own value.** It was rendering `650` beside a stray `€` at nine columns; the new tenth column would have made it worse, so the table's min-width went up with the column count instead of being taken out of the other cells.

### Notes
- **`kind` is deliberately not `priority`.** "I need this to live" and "I owe this on the 1st" are different questions — the gym is `deseable` and still leaves the account every month — and `priority` already carries the move-in minimum in Muebles, so overloading it would move two unrelated figures with one edit.
- **A `critico` row is excluded in four separate places** (`countsMonthly`, `countsUpfront`, `breakdown`, `derived.costes`) and the one that gets forgotten is the one that announces moving out costs 8.400 € on day one. There is no static check for it; there are tests.
- The waterfall's `margen` is the same number as `balance`, reached the long way. There is a test whose only job is that they agree.

---

## Unreleased — a shopping log, by product, that lands in the monthly total

The app modelled what things *should* cost and had no way to record what they did. **Compras** is the other half: one line per thing bought, grouped by product, averaged per day and scaled to a month, and added to salidas. It is the only screen in the app about money already spent, and `CLAUDE.md` used to promise there would never be one — see the Notes for why that changed and what was kept from the original argument.

### Added
- **A `Compras` tab**, sitting straight after Costes because the two are the same money seen from opposite ends. Four KPIs (monthly equivalent, daily average, total logged, this calendar month), the editable log itself, and a **`Por producto`** rollup — times bought, total, average, monthly equivalent, share — which is the question the tab exists to answer.
- **`Purchase`** in `src/types.ts`: `{ id, date, product, amountCents, category, note? }`. Deliberately not an `Entry` — a receipt has no frequency, no priority, no status and nothing to revise.
- **`Scenario.purchases`**, per scenario rather than app-wide: what you spend on the weekly shop is part of what living in *this* flat costs, and "what if I shopped differently" is another scenario.
- **`src/lib/purchases.ts`** — the whole calculation, with 28 tests: the window, the monthly rate, the product and category rollups, and `overlaps()`.
- **The double-count guard.** `overlaps()` finds any category holding both logged purchases and a live recurring estimate; the tab draws an amber banner naming it with both figures, and one button pauses the estimates it names. Resumen carries the short version of the same warning under the breakdown bars.
- **`store.pauseEntries(ids)`**, which exists for that button and nothing else.
- **A mobile fork, `src/tabs/ComprasMobile.tsx`** — the second one in the app, and the first forked for *when* a screen is used rather than how wide it is. Cards grouped by day with the day's total in the header, the monthly equivalent in a sticky footer, and the amount on line one instead of behind a horizontal scroll. Compras now renders bare (edge to edge) on a phone, like Costes.
- **Storage schema v4**, read-compatible with v3: a payload with no `purchases` key opens with an empty log, which is exactly what its absence meant.

### Changed
- **`derive()` takes a fourth argument, `todayDate`.** The log's monthly figure is an average over the days since the first purchase, so the answer depends on what day it is, and `src/lib` is not allowed to find that out on its own — same reason `projectProgress()` already took one. `store.todayDate` reads it once per mount and shares it, so no two screens can disagree about what today is.
- **`breakdown()` takes the log rolled up by category** and puts it in the same bars, in the same denominator. A category whose only estimate is paused but which has a real shop in it now draws a bar: logged spending is not paused, it already happened.
- **`countCategoryUse()` counts purchases too**, and binning a category re-files them alongside the conceptos. Without that, the delete confirmation would understate what it is about to move and the log would lose a bar.
- The Historial panel's tag reads `ESTIMACIONES, NO GASTOS` and its note now points at Compras, because "there is no spending log" stopped being true.

### Notes
- **The monthly figure is a daily average scaled by 365,25 / 12**, kept as the exact fraction `1461 / 48` so no amount is multiplied by a decimal and the scaling rounds exactly once (IND001). The two alternatives were both worse: *this calendar month* collapses to near zero every first of the month, and *the last complete month* reports nothing at all until one has passed. The average is also the only one that survives sparse logging, which is the only kind anyone actually does.
- **The window ends today, not at the last purchase.** Three weeks of buying nothing is three weeks of not spending, and dividing by the span between purchases would delete them from the average.
- **It adds; it never reconciles.** Nothing inspects your estimates to decide one of them is redundant now — the app does not get to delete a row you typed. The price of that is the double-count case, which is why the guard above is a feature rather than a footnote: if `overlaps()` goes quiet the total goes wrong and nothing says so.
- **Under 30 days logged, the figure is labelled provisional.** It is real arithmetic on real receipts, and one big shop inside a five-day window still scales to something absurd.
- **Zero is the blank on a Purchase.** There is no `hasAmount` field: a blank estimate is a normal lasting state, but a blank purchase only exists for the second between adding the row and typing what you paid, and zero is the one amount a real purchase cannot be. It renders as the same dashed `— —` and counts as missing, not as free.
- **The amount cell here drops the trailing `€` unit span** that the Costes grid carries. `EditableAmount` already renders `6,90 €` at rest through `formatEUR`, and this column is wide enough to show all of it — so the unit beside it reads as a second euro sign. Costes gets away with it only because its narrower column clips the first one.
- **`<input type="date">` renders in the browser's locale**, so the log's dates can show as `08/15/2026` while every other date in the app is `dd/mm/yyyy`. Known, pre-existing, and still worth the native picker on a phone.

---

## Unreleased — the spreadsheet, as a scenario you can press a button for

There was a `PRESUPUESTO MENSUAL · Madrid` sheet doing this job already: net income, fixed costs, a prorated column of irregulars, and a catastrophe fund sized by what it is for. It is now a second starting point in Ajustes, beside the checklist and deliberately its opposite — the checklist is structure with no prices, this is a worked budget with them.

### Added
- **`Crear escenario de plantilla · 22`** in the `Punto de partida` panel. Creates a **new** scenario and opens it; it never touches the one you have open, because the sheet carries a situación, a savings position and a colchón target as well as its rows, and those are scenario-level.
- **`src/lib/template.ts`** — the sheet as data, with 16 tests asserting its own totals: 1.570 € in, 1.343 € out, **227 €/mes free**, verdict `✓ Te lo puedes permitir`, colchón target 8.400 €.
- **Two categories the shipped list had no home for** — `Gastos esporádicos` and `Fondo de emergencia` — merged in on load like the checklist's, and ordinary categories once they land.
- **`store.loadTemplate(name)`**, named through `uniqueName()` like every other add, so pressing it twice gives `Presupuesto mensual · Madrid 2` rather than two identical picker options.

### Notes
- **The category axis is mixed on purpose.** Every fixed cost has a real domestic home, so alquiler files under `Vivienda`, comida under `Alimentación`, and internet/móvil/suministros under `Suministros` — exactly where they would land if you typed them. Only the two groupings the app had nowhere to put become new categories. `Ocio y salidas` goes to `Ocio` rather than to `Gastos esporádicos`, which is why that bar reads 130 € and not the sheet's 190 €.
- **The five contingencies arrive `pausado`.** They are the arithmetic behind the 8.400 € target, not costs. Live, they would be `único` rows and land in `upfrontCash` — announcing that moving out costs 8.400 € on day one. Paused, they stay visible as the reasoning and count toward nothing. There is a test whose only job is that number staying zero.
- **The colchón target is summed from those five, not written as 8.400 €**, so editing one can never leave the target disagreeing with its own arithmetic.
- **Every row arrives with its figure already in `history`.** Without it the first edit would be recorded as the *original* and the drift against the sheet would be lost exactly when it starts to matter (IND002).
- **This is the one module in the repo that carries amounts, and it is an exception rather than a precedent.** The no-hardcoded-figures rule is about *published* numbers — rates, caps, official prices — that go stale yearly and read as authoritative. These are the user's own estimates for their own budget, and they arrive as a first revision meant to be revised.
- The sheet's esporádicos are stored `mensual` because its column is headed *media mensual*: the division already happened, so `toMonthly()` is the identity on every one of them. That is asserted rather than assumed (IND004).

---

## Unreleased — a scenario can be renamed where its name is read

The name was already editable, in the first field of Ajustes. Nobody found it there, and the reason is structural: the name is *read* in the header picker, several screens away from where it could be *changed*. It is now editable in both places, through one writer that enforces the same rule the `Nuevo escenario` button obeys.

### Added
- **Rename in the header.** A pencil beside the scenario picker swaps the `<select>` for a text field at identical metrics, so the bar does not reflow when you click it. Enter or clicking away commits; Escape cancels.
- **`store.renameScenario(id, name)`** — the one way a scenario name changes. It trims, refuses a blank, and dedupes against the *other* scenarios through `uniqueName()`. Renaming to a name that is taken lands on `Piso 2` rather than on a second `Piso`.
- **`EditableName`** in `components/EditableCell.tsx` — a text input that commits on blur or Enter and then re-reads its prop, so a name the store adjusted snaps to what was actually stored instead of sitting on screen as a lie until the next reload. `className` picks the ground: `fin` on paper, the new `in-dark` on ink.

### Changed
- **`patchScenario` can no longer reach `name`** — its parameter is `Omit<Partial<Scenario>, 'name'>`. The uniqueness rule was one keystroke-level `patchScenario({ name })` away from being bypassable, which is how you rebuild by hand the exact list of identical picker options that `src/lib/naming.ts` exists to prevent. Making the wrong door not open beats remembering not to use it.
- The Ajustes field commits on blur rather than on every keystroke, and carries a hint saying so — the rename can change what you typed, and a field that rewrites itself mid-word is worse than one that settles when you leave it.

### Fixed
- **Escape did not cancel an amount edit.** `EditableAmount` cleared its draft and then called `blur()`, but `blur()` runs its handler synchronously, before React re-renders — so the blur handler read the *typed* value straight out of the DOM and committed it. Escape behaved exactly like Enter, and on an amount that means a spurious revision in the price history (IND002). Both inputs now hand the cancel to the blur handler through a ref.

---

## Unreleased — the categories are yours, and a new scenario starts blank

The app shipped with ten categories and five rooms baked into `src/types.ts` as closed unions, and poured a 77-row checklist into every new scenario. Both were predictions made before anyone had used it. They are now a starting point you can edit instead of a schema you cannot.

> **Storage schema v3.** A v2 payload loads unchanged: it has no `categories` key, so it gets the shipped lists, and every entry already points at one of their ids. Nothing to export or re-import.

### Added
- **Editable categories and rooms**, managed in two new Ajustes panels. Each row is its label; the count beside it is how many entries hold it across *every* scenario; the bin removes it. `+ Añadir categoría` / `+ Añadir habitación` at the foot of each list.
- **`SavedState.categories` and `SavedState.rooms`** — `Taxon[]`, app-wide rather than per-scenario. Shared on purpose: Comparar puts scenarios side by side, and a breakdown can only be compared against one drawn on the same axis. Per-scenario lists would make "Vivienda" in one a different thing from "Vivienda" in the next.
- **`src/lib/taxonomy.ts`** — the pure operations (add, rename, remove, merge, re-file, count) plus the shipped default lists, with 11 tests.
- **A `Punto de partida` panel in Ajustes** with `Cargar checklist · 77`. The checklist did not go away; it stopped being mandatory.

### Changed
- **A new scenario has no entries at all.** `newScenario()` returns `entries: []`. Costes says so — *"Escenario en blanco. Añade el primer concepto abajo, o carga la checklist desde Ajustes"* — which is a different sentence from the over-filtered empty state, because the two look identical and mean opposite things.
- **`Category` and `Room` are now open string ids**, not closed unions. What keeps an entry pointed at something real moved from the type system to `storage.ts`, which re-files anything dangling onto the fallback on every read.
- **`es.category` / `es.room` label the *shipped* set only.** Anything the user adds carries its own label and never passes through i18n — which is the line IND008 actually draws: app copy is translated, user content is not.
- **`furnitureByRoom()` takes the room list as an argument** rather than reading a constant, and files an article whose room has been binned into the fallback group instead of dropping it.

### Fixed
- **`Nuevo escenario` looked like a dead button.** It always created the scenario named `es.scenario.firstName`, so pressing it three times gave three entries all called "Mi primer escenario" in a picker that lists names — over three identical screens. The click worked the whole time; nothing on screen said so. Blank scenarios are what made it total: the 77 seeded rows appearing had been the only feedback the button ever had. New scenarios are now `Escenario nuevo`, then `Escenario nuevo 2`, and the picker changes on every press.
- **Same bug, three more places.** Duplicating twice gave two `Piso (copia)`; adding categories or rooms gave a stack of `Categoría nueva`. All four now name through `uniqueName()` in the new `src/lib/naming.ts` (6 tests), applied in the store — the only place that knows what is already called what.

### Notes
- **Deleting a category re-files its rows onto `Otros` rather than deleting them**, and the confirm says how many will move. `Otros` therefore cannot itself be deleted — its bin is visibly disabled rather than merely inert — because it is what makes every other delete non-destructive.
- **Renaming touches the label and nothing else.** Ids are generated (`c_`/`r_` prefixed) and permanent, so "Ocio" → "Caprichos" re-titles the group without re-filing a single row, and the renamed category still lines up with itself across scenarios.
- **A room re-files rather than clears.** `room !== undefined` is what makes an Entry furniture, so clearing it would teleport a wardrobe out of Muebles and into the Costes grid.
- A category filter that outlives the category it points at is treated as no filter. Otherwise binning `Ocio` while filtering by it would blank the grid with nothing on screen to undo it — and on mobile there is no category chip to undo it with.
- Verified against the packaged `dist/` through the desktop shell's `app://movingout` origin: blank first run, add/rename/delete, checklist load (77 entries, 33 furniture, 0 dangling), a delete moving 6 rows onto `Otros`, and a reload proving all of it persisted at v3.

---

## Unreleased — a desktop app and an Android app, from the same `dist/`

Neither is a port. Both shells wrap exactly the build the web target already produced; there is no platform-specific source anywhere in the repo, and `src/` was not touched.

> **`npm install` is required after pulling** — Electron, electron-builder and Capacitor are new. Electron's binary is a 221 MB post-install download, and it is gated by this repo's `allowScripts` policy, so `electron@43.4.0` had to be listed there explicitly.

### Added
- **`electron/main.cjs` — the desktop shell.** Registers `app:` as a standard, secure scheme and serves `dist/` from `app://movingout` rather than loading `dist/index.html` over `file://`. That is not decoration: `file://` pages get an *opaque* origin, Chromium keys localStorage to an origin, and this app keeps every scenario and price revision there. Served from a real origin, storage behaves exactly as it does in the browser. External links open in the real browser; navigation away from the origin is blocked.
- **`capacitor.config.ts` and `android/`** — Capacitor 8, `appId` `es.movingout.app`, minSdk 24 / targetSdk 36. Capacitor serves the same assets from `https://localhost`, which is a secure origin, so the storage argument above holds unchanged on the phone.
- **`scripts/make-icons.py`** — every icon, generated from the `:root` block in `tokens.css` instead of drawn. Writes `public/favicon.svg`, both PWA PNGs, and the full Android launcher set (legacy, round, and adaptive foreground at five densities) plus the adaptive background colour.
- **Build targets in `vite.config.ts`.** `APP_TARGET` selects `web` (default), `electron` or `android`. The service worker is built only for `web` — inside a shell that is already offline it adds nothing and can serve a stale shell after an update.
- **npm scripts**: `desktop`, `desktop:dev`, `desktop:dist`, `android`, `android:run`, `android:apk`.

### Fixed
- **The header drew underneath the phone's status bar** — the `MOVINGOUT` wordmark sat behind the system clock. `.hdr` now carries `padding-top:env(safe-area-inset-top)`, mirroring the `padding-bottom:env(safe-area-inset-bottom)` the bottom nav has always had. The padding is on `.hdr` rather than `.hdr-bar` so the ink ground extends up *behind* the status bar instead of leaving a strip of `--bg` above it, and it is zero on any display without a system bar, so the browser and the desktop shell are unaffected. Only a real full-screen install could surface this: in a browser there is no status bar to collide with.
- **The icons were still the pre-reskin palette**, and Android's were Capacitor's stock blue logo. The mark is now ink ground, paper `I`, `--accent-l` `N` — `--accent-l` and not `--accent`, because indigo `#4438CA` on near-black ink is a smudge at 48 px, and `tokens.css` already labels that token "the accent, legible on ink".
- **The PWA manifest carried the old palette too** — `background_color` `#EBE4D9` and `theme_color` `#1E1813`, both from before the re-skin. Now `#EFEDE7` / `#17191C`. On Android these are what the splash and status bar are painted with, so the packaging is what made it visible. Same fix to the `theme-color` meta in `index.html`.

### Notes
- **One desktop artifact, `tar.gz`, and deliberately no AppImage.** The AppImage needs `libfuse.so.2`; Ubuntu ships FUSE 3 and the compat package needs sudo, which there isn't. It was built anyway for a while, on the reasoning that it stays useful on machines that *do* have FUSE — which turned out to be a bad trade: it was also the most double-clickable file in `release/`, so the one artifact that could never work was the one most likely to be tried. `tar.gz` unpacks anywhere and runs with no FUSE. Locally the app runs from `release/linux-unpacked/movingout` via a validated `.desktop` entry in `~/.local/share/applications/`.
- **Every desktop launch path passes `--ozone-platform=x11`.** Chromium's Wayland backend segfaults on this compositor before it paints. It cannot be set from `main.cjs` — see `docs/DEVLOG.md`. The renderer sandbox stays on; only the display backend changes.
- The APK is **debug-signed**, with the `~/.android/debug.keystore` that was already on this machine. That is enough to install by hand and not enough to publish.
- `release/` is now gitignored. `android/` is committed, as Capacitor intends; its own `.gitignore` covers `local.properties` and build output.

---

## Unreleased — re-skinned to the `Independencia` design

Step 12 of `DESIGN-SYSTEM.md` §8. The Claude Design project *Moving out finances app* (`Independencia.dc.html`), ported into the running app.

> **`npm install` is required after pulling** — the mono and body faces changed packages. Verified after that: `tsc -b` clean, 85 tests green, `vite build` succeeds, PWA precache regenerated.

### Changed
- **The palette.** Warm plaster + mulberry → warm paper + **indigo**. `src/styles/tokens.css` is the whole change: `--bg:#EFEDE7`, `--card:#FFFFFF`, `--ink:#17191C`, `--accent:#4438CA`. Light mode only, still — the design's Plano and Noche variants are recorded in `DESIGN-SYSTEM.md` §2 and deliberately not built.
- **A fourth semantic, `--blue` `#0E7490`.** Informational: `pagado`, *devolvible*, *pago único* — the three facts that are neither good nor bad. `pausado` keeps no hue at all. This reverses "there is no `--info` token"; the argument is in `DESIGN-SYSTEM.md` §1 and `docs/DEVLOG.md`.
- **The type stack.** IBM Plex Mono/Sans → **JetBrains Mono** and **Public Sans**; Archivo drops from Expanded 800 to normal-width 600, so `main.tsx` imports the `wght` axis rather than `wdth`. **`npm install` is required** — two `@fontsource` packages were swapped in `package.json`.
- **The header.** Micro-labelled `ESCENARIO` / `SITUACIÓN` selects, the tab row moved into the ink bar with the active tab cut out of it in `--bg`, and **the verdict pill now rides in the header** — it is true on every tab, so it should not be something you navigate back to Resumen to read.
- **Resumen.** Five-column KPI grid, exactly full over two rows, with `BALANCE` and `DESVIACIÓN` spanning two. The max-rent guideline became the quietest KPI instead of an amber strip; drift moved in from the panel header. The upfront ledger ends in two side-by-side boxes — *necesitas tener* and *gasto real* — because the gap between them is exactly the fianza. The insight line became a full-width banner tinted by the sign of the answer.
- **Costes.** Nine columns, `CONCEPTO` sticky under horizontal scroll, pill `<select>`s for tipo and estado, `entrada` rows tinted, and the monthly equivalent annotated `≡ BIMESTRAL` rather than `÷2`. The `▲ 14 %` chip beside the amount became a **revision counter** at the end of the row, tinted by the direction of the last change — same signal, one column cheaper, and it was already the drawer's handle.
- **Muebles.** A hero card carrying *mínimo real para entrar a vivir* with the "sólo esenciales" toggle beside it, then one panel per room with a progress strip under its header.
- **Historial.** Drift is the headline — a banner tinted by its sign — rather than one KPI among four.
- **Comparar.** A grid where each cell is a value **and its distance from the scenario you are standing in**. The active column is tinted with the accent (*where you are*); deltas are green or red by outcome. This also fixes a §1 violation: the old screen accented the *best* cell, using the interaction colour to mean "good".

### Added
- **`src/tabs/Sistema.tsx`** — the component sheet as an eighth tab, rendered against the live tokens rather than copied from a document, so it cannot drift from what ships. Desktop only; on a phone it falls back to Resumen.
- **`src/components/VerdictTag.tsx`** — the verdict's wording and colour in one place, now that the header, Resumen and Comparar all print it.
- **`DirectionSelect`**, and a `pill` `Button` variant for the Muebles toggle.
- **`RoomGroup.paidCents` / `.totalCents`** in `src/lib/derive.ts`, so the per-room progress strip is derived in `lib` and not summed inside a component (IND007).

---

## Unreleased — the app exists

The whole build order from `DESIGN-SYSTEM.md` §8, steps 1–11.

### Renamed
- **The project is now MovingOut**, matching the GitHub repo. The product name changed everywhere it is a name — package name, page title, PWA manifest, app header, export filename, doc headings, and `mockups/independence.html` → `mockups/movingout.html`. The ordinary word *independence* stays in the prose that describes what the app models.
- **The `localStorage` key changed with it**, `independence.state` → `movingout.state`. Free to do now and never again: nothing is deployed, so no saved data is orphaned. After the first install this becomes a migration.

### Added
- **Scaffold.** Vite + React 19 + TypeScript + Tailwind, `vite-plugin-pwa`, Vitest. Fonts are local `@fontsource` packages, never CDN links, so the first launch after install works offline.
- **`src/styles/tokens.css`.** The §2 block verbatim, plus a small derived group (text on ink, ink washes, semantic borders) so the "no raw hex outside `:root`" rule holds with no exceptions. Tailwind consumes the variables and owns no colour.
- **`src/types.ts`.** `Entry`, `Scenario`, `PurchaseProject`, `Buffer`, `Settings`, `SavedState` and every enum behind a `<select>`.
- **`src/lib/`** — the pure calculation layer. `money.ts` (integer cents, `Intl` formatting, an `es-ES` amount parser), `frequency.ts` (`toMonthly`, the `÷2` / `÷12` annotation), `history.ts` (append-only revisions, deltas, the cross-item log), `derive.ts` (every figure on every screen), `seed.ts`, `id.ts`.
- **`src/lib/storage.ts`.** The only module touching `localStorage`. Schema `version`, `DEFAULTS` + `ensureShape` read-time backfill, JSON export/import through the same door.
- **`src/i18n/es.ts`.** Every Spanish string, plus a `plural()` helper — Spanish agrees in number, and "1 conceptos" makes a screen feel machine-generated.
- **The component sheet.** `Panel`, `KpiCard`, `Tag`, `Button`, `AddRow`, `EditableCell`, `Select` / `StatusSelect`, `BreakdownBar`, `FilterBar`, `Insight`.
- **All seven screens.** Costes (one editable grid, entradas and salidas together, in-table price-history drawer), Resumen (verdict pill, six KPIs, breakdown bars, the upfront ledger, the insight line), Muebles, Proyectos, Historial, Ajustes, Comparar.
- **The mobile fork at 820 px** — `CostesMobile`, a card list from the same `Entry[]`, status as a 3 px left edge, everything else on tap, sticky totals above the bottom nav.
- **PWA.** Manifest, generated service worker, offline precache of the whole shell. Icons generated from the app's own two colours.
- **82 Vitest tests over `src/lib`**, covering the traps the domain rules warn about: the refundable fianza, sign-dependent runway, bimonthly normalisation, `pausado` exclusion, blanks that are not zeros, and v1-payload backfill.
- **Seeded checklist.** 44 conceptos and 33 furniture items from `docs/COST-CHECKLIST.md`, every amount blank on purpose.

### Fixed
- `parseAmount` read `12,999` as twelve thousand euros. In `es-ES` a lone comma is always the decimal separator; only a lone dot is ambiguous. See `docs/DEVLOG.md` — this is the first real `IND001`.
- **The empty app said you could afford it.** On first launch the verdict read *✓ Te lo puedes permitir* and the colchón read *Cubierto*, both computed from nothing. New `sindatos` verdict, rendered with no hue, and a buffer is no longer "covered" against a target of zero. `docs/DEVLOG.md` has the general version of the lesson — every figure derived from missing amounts defaults to the confident answer unless it is told not to.

### Notes
- `Buffer` now holds `targetCents` only. The reserve and appliance-fund contributions are ordinary monthly entries, so there is exactly one summing path. Rationale in `docs/DEVLOG.md`.
- The marginal-state fragility line is expressed per 100 € of surprise rather than against an invented "typical" shock, so no real-world figure is hardcoded anywhere.
- Node 24 was installed to `~/.local/share/node` — there was no Node on this machine and no sudo.

---

## Earlier — documentation only

### Added
- Project documentation: `CLAUDE.md`, `docs/ARCHITECTURE.md`, `docs/COST-CHECKLIST.md`, `docs/DEVLOG.md`.
- Invariant checker `.claude/tools/check.py` with PostToolUse / PreToolUse / Stop hooks. Inert until `src/` exists.
- `docs/DESIGN-SYSTEM.md` — the resolved design: token block, component sheet, all six tabs plus **Comparar**, the mobile fork, and the build order.
- `docs/mockups/movingout.html` — self-contained working prototype of the above. No build step.

### Decided
- **Palette chosen.** Warm plaster ground, warm near-black ink, mulberry accent, earth semantics, light mode only. Nine lines in `:root`; nothing else in the app owns a colour.
- **Colour is split into two non-overlapping jobs**: semantic (green/red/amber) carries meaning, accent carries interaction. Categories get no colour. `pagado` / `pausado` get no hue — hence no `--info` token.
- **Runway is sign-dependent.** The sixth Resumen KPI changes identity with the balance, so `∞ meses` has no branch to render from.
- **Mobile is a component fork at 820 px**, not a responsive table — card-per-row reading the same `Entry[]`.
- `docs/DESIGN-BRIEF.md` is now historical: kept for *why*, superseded on every *what*.
