# Design system — MovingOut

The resolved answer to [`DESIGN-BRIEF.md`](DESIGN-BRIEF.md). The brief asked the questions; this file holds the decisions, and the build is expected to match it.

> **Status — 2026-08-11: re-skinned to the `Independencia` design.** The Claude Design project *Moving out finances app* (`Independencia.dc.html`) replaced the palette, the type stack and several screen layouts. §1–§4 below are the new system; §5–§7 still describe the screens correctly. What changed, and why each change is a reversal of something this file used to insist on, is in `docs/DEVLOG.md` — **2026-08-11**.
>
> Two rules were deliberately overturned: there is now a `--blue` informational hue (§1), and the accent is indigo rather than mulberry (§2). One rule was deliberately kept against the design: **light mode only**. The design ships three palettes — Papel, Plano, Noche — and only **Papel** is built. The other two are recorded in §2 as unshipped variants.
>
> The live component sheet is now the **Sistema** tab in the app itself, rendered against the real tokens. Prefer it over any picture: `docs/mockups/movingout.html` is the *previous* design and is kept only as a record of it.

---

## 1. The rule the whole system hangs on

Colour has exactly two jobs here, and they never overlap.

| | carries | used for |
|---|---|---|
| **Semantic** — green · red · amber · blue | **meaning** | sign of the balance, state of a row, the verdict |
| **Accent** — indigo | **interaction** | focus ring, active tab, primary button, links, add-row |

The brief asks that the user read the answer from colour before reading a digit. That only works if the answer is the *only* thing coloured — so categories get no hue of their own, breakdown bars are one accent tone at descending opacity, and headings are never tinted.

**If a number renders in the accent, that is a bug.** The one legitimate exception is a value mid-edit, and even there the ring carries the state, not the text.

Two consequences worth stating because they are easy to undo later:

- **A category never gets a colour.** The moment `vivienda` is blue and `ocio` is purple, green stops meaning "good".
- **`pausado` gets no hue at all.** It is a deliberate absence rather than a fact, so it takes the neutral pill and the row dims to 50 %. Colouring it would turn an exclusion into a judgement.

### `--blue` — the fourth semantic, added 2026-08-11

This file previously said there is no `--info` token, and that `pagado` shares `--stone` with `pausado`. The `Independencia` design overturns that, and it is right to:

> Three facts in this app are neither good nor bad, and lumping them in with "no colour" makes them look like nothing at all: an amount already **`pagado`**, money that is **refundable**, and a **`único`** payment that has no monthly equivalent to report.

Each of those is a *positive statement of a fact* — settled, coming back, due once — as against `pausado`, which is the absence of one. Green would read as approval, amber as caution; both would be wrong. `--blue` is the informational tone, and it is semantic, not decorative: **it still never colours a category, and it still never colours a heading.**

The rule that replaces the old one: **four semantics carry meaning, one accent carries interaction, and `pausado` carries no colour because it is not a meaning.**

---

## 2. Tokens

Warm paper ground, near-black ink, indigo accent, four semantics. **Light mode only** — the product commits to one look.

Every colour in the app resolves through a variable in this one block. **No raw hex exists anywhere else in `src/`**, and Tailwind consumes the variables rather than owning colours.

The authoritative copy is `src/styles/tokens.css`; what follows is its shape, not a second source of truth. The **Sistema** tab renders these swatches from the live variables, which is the only way a token sheet stays honest.

```css
:root{
  /* ── ground — warm paper, near-black ink ── */
  --bg:#EFEDE7;      --card:#FFFFFF;   --sunk:#F7F5F1;   --raised:#FFFFFF;
  --ink:#17191C;     --ink-2:#24272C;  --ink-3:#31353B;
  --text:#17191C;    --muted:#7C7970;  --faint:#A3A099;
  --border:#DFDCD4;  --border-2:#CBC7BD;

  /* ── accent — interaction, never meaning ── */
  --accent:#4438CA;  --accent-t:#EAE8FB;  --accent-b:#CFCAF4;  --accent-l:#A9A1EE;

  /* ── semantic — meaning, never decoration ── */
  --green:#157F4C;   --green-t:#E2F1E9;  --green-b:#B9DCCA;
  --red:#C0271A;     --red-t:#FAE6E3;    --red-b:#EFC0B9;
  --amber:#9E6400;   --amber-t:#F8EEDC;  --amber-b:#E7D3AE;
  --blue:#0E7490;    --blue-t:#E1F0F4;   --blue-b:#B7D9E2;

  /* ── type ── */
  --display:'Archivo Variable','Archivo',ui-sans-serif,system-ui,sans-serif;
  --mono:'JetBrains Mono',ui-monospace,Menlo,Consolas,monospace;
  --body:'Public Sans',system-ui,-apple-system,'Segoe UI',sans-serif;
}
```

Plus three derived groups the build needs and the design writes inline: the **on-ink ramp** (`--on-ink`, and the same off-white at .72 / .60 / .45 / .16 / .09), the **ink washes** (`--hover`, `--rule`, `--track`, `--wash`, `--dash`, `--in-row`), and `--on-accent`. They exist so the *no raw hex outside `:root`* rule holds without exception. See the file.

### The two unshipped palettes

The design carries three, switchable by a `data-pal` attribute. Only **Papel** is built. Recorded here so the decision is visible rather than lost:

| | ground | accent | note |
|---|---|---|---|
| **Papel** | `#EFEDE7` warm paper | `#4438CA` indigo | **ships** |
| Plano | `#ECEFF2` cool grey | `#0E7490` teal | not built — accent collides with `--blue` |
| Noche | `#111317` dark | `#8E86FF` | not built — see below |

**Noche is not a gap.** Shipping it costs a `Settings` field, a storage version bump with an `ensureShape` backfill (IND003), and a contrast pass over all eight screens; and the product's whole argument is that it commits to one look. If it is ever wanted, that is the price, and it should be paid deliberately.

### Token roles

| token | role |
|---|---|
| `--bg` | app ground, and the fill of the **active tab** — the tab is a notch cut out of the header |
| `--card` | panel body, KPI body, table rows |
| `--sunk` | filter bars, totals strip, drawer rows, bar tracks, the neutral pill |
| `--ink` / `--ink-2` | app header and panel header bars |
| `--ink-3` | progress fills where no semantic applies |
| `--muted` | labels, secondary numbers |
| `--faint` | **only** empty amounts, the `÷2` annotation, and the `≡ BIMESTRAL` note |
| `--*-t` | tint — pill, select and banner fill |
| `--*-b` | border — the matching hairline for each tint |
| `--in-row` | the row tint on an `entrada`. Green at almost nothing, so the row reads as a *kind*, not a verdict |

### Rules for changing it

- **Swapping the palette is this block.** Nothing else.
- **Do not move the accent into teal, rust, ochre or olive.** Against these four semantics they read as `--blue`, `--red`, `--amber` and `--green`, and the accent starts looking like a verdict. Indigo is chosen for its clearance from all four.
- **All four semantics must survive at 8 px** — they appear as pill text and as `<select>` text. Test at that size, on `--card` *and* on their own tint, before committing a change.
- **`--blue` and `--accent` must stay clearly apart.** They are the two cool hues, and they mean opposite kinds of thing: one is a fact, one is a control. If a redesign narrows the gap, move the accent, not the blue.

---

## 3. Type

Three faces, three fixed roles. No fourth role, and no face used outside its role.

| role | face | used for |
|---|---|---|
| **display** | Archivo 600, normal width | KPI values and screen titles **only**. `font-variant-numeric: tabular-nums` always. Never below 15 px |
| **mono** | JetBrains Mono | every label, column head, table input, tag, button, amount, micro-label. Carries the personality |
| **body** | Public Sans | prose, notes, the insight line, row labels. 12–13 px in the app |

The display face was Archivo *Expanded* (the `wdth` axis at 125 %, weight 800). The `Independencia` design uses Archivo at its **normal width and weight 600**, so `main.tsx` imports `@fontsource-variable/archivo/wght.css` rather than `wdth.css`. Expanded 800 fought the mono at KPI sizes; 600 normal sits under it.

**Install the faces as local packages** (`@fontsource/...`), not as CDN links. The app is a PWA that must work offline on the first launch after install, and a font that fails to load silently changes the density of every screen.

### Density

Deliberately dense on desktop, per the Command Center grammar: 12–13 px body, 8–9 px mono labels with 0.15–0.2em tracking, 6–8 px table cell padding. Keep it. The mobile fork (§6) is where density gets relieved, not the desktop breakpoint.

---

## 4. Components

Twelve components carry every screen. They live in `src/components/`, and **no tab reaches past them for a colour**. The **Sistema** tab renders this table as running code.

| component | notes |
|---|---|
| `Panel` | rounded card, white body, 30 px ink header bar. Micro-label mono 9 px / 0.2em / uppercase, plus a state dot. Actions right-aligned **in the same bar** — there is no second toolbar |
| `KpiCard` | label (mono, tiny) → value (display, 30 px; 44 px for hero) → sub-line (mono, tiny, faint). 1 px gutters read as hairlines. `hero` and `wide` span two columns of the 5-wide grid |
| `Tag` | mono 8 px, uppercase, pill radius, tinted background + matching border + matching text. Tones: green · red · amber · **blue** · neutral · accent |
| `VerdictTag` | the verdict's wording *and* its colour, in one place. The header, Resumen and Comparar all print it; three copies would be three chances to disagree about the answer |
| `Button` | mono 9 px uppercase. Variants: accent-filled, accent-outline, ghost, on-ink, **pill** (the Muebles toggle: filled when engaged) |
| `AddRow` | dashed, full width, at the foot of the table. **Not a floating action button** |
| `EditableCell` | transparent input in table mono. Rest / hover (border) / focus (accent border + 3 px ring on white) / empty (dashed, faint `— —` on `--sunk`). Focus strips the currency format and leaves the raw number. Typing writes straight to state — **no save button** |
| `StatusSelect` | a pill `<select>` whose colour is driven by its selected value: activo → green, pendiente → amber, pagado → **blue**, pausado → neutral (and the row dims to 50 %) |
| `DirectionSelect` | the same pill, green in / red out. This is why the amount itself stays black: the sign lives on the row, not on the number |
| `BreakdownBar` | label · dotted leader · amount · share, and a 7 px bar under it. One accent tone at descending opacity |
| `FilterBar` | sits **inside** the panel, between the ink header and the table body. Chips, not a dropdown row |
| `Insight` | full-width banner, tinted by the sign of the answer, with a `LA RESPUESTA` micro-label down the left. One plain-language sentence |

---

## 5. Screens

Tabs: **Resumen · Costes · Compras · Muebles · Proyectos · Historial · Comparar · Ajustes**, plus **◇ Sistema** (§5.9), which sits apart on the right of the tab row because it is not a product screen.

The tab row lives in the ink header, under the identity bar. The active tab is filled with `--bg` and squared into the page — a notch cut out of the header, not an underline. **The verdict pill rides in the identity bar**, to the right: it is true on every tab, so it should not be something you navigate back to Resumen to read.

### 5.1 Resumen

Header (scenario select + `situación`) → verdict pill → KPI row of six → breakdown bars beside the upfront ledger → insight line.

**The sixth KPI changes identity with the sign of the balance.** This is the rule that keeps `∞ meses` from ever rendering — that branch does not exist:

| balance | label | shows |
|---|---|---|
| negative | `MESES DE MARGEN` | savings after upfront ÷ monthly deficit |
| marginal (< 5 % of salidas) | `MARGEN` | the balance, plus how fragile it is in units the user feels — *"un imprevisto de 200 € se come once meses de margen"* |
| positive | `COLCHÓN` | buffer target, whether it is covered, what is left after moving in |

The label changes; the slot does not move.

The grid is **five columns wide over two rows**, and it is exactly full: `BALANCE` is a hero spanning two, `DESVIACIÓN` is `wide` spanning two, and the other six take one each.

The **max-rent guideline** is now KPI 7 rather than an amber strip, rendered in `--quiet` — the least loud number on the screen — with its assumption on the sub-line (*"Regla del 32 % sobre 730 €/mes · Es una referencia, no un límite."*). It never touches an input, never blocks a save, and is never red. **Making it a KPI does not make it a result**; the tone is what says so.

The **upfront ledger** separates `dinero al entrar` from `gasto real` as two totals **side by side in their own boxes**, because the gap between them is exactly the fianza. The fianza row carries a blue *Devolvible* pill, and a sentence under the boxes says the deposit is money you need to have, not money you spend. There is no combined "moving costs" figure anywhere in the app.

The **insight line** is a full-width banner tinted by the sign of the answer — green, amber, red, or a neutral wash for `sindatos`. It is the last thing on the screen and it states the answer in one sentence.

### 5.2 Costes

One dense editable grid of **nine columns** holding **both** entradas and salidas, filters inside the panel, a totals strip, a dashed add-row.

`CONCEPTO · TIPO · CATEGORÍA · FRECUENCIA · PRIORIDAD · ESTADO · IMPORTE · EQUIV. MENSUAL · NOTA`

- **`CONCEPTO` is sticky.** At 1080 px the grid scrolls horizontally, and a number under the cursor has to keep the name it belongs to.
- **An `entrada` tints its whole row** (`--in-row`) and carries a green dot before its label. Direction is a *kind* of row, so it colours the row; the amount stays black.
- **Frequency vs monthly equivalent.** `IMPORTE` holds the number the user knows (*"58 € cada dos meses"*); `EQUIV. MENSUAL` holds the number they decide with, with `≡ BIMESTRAL` under it. That one annotation removes all ambiguity about which column was normalised, at almost no visual cost.
- **Price history without a modal.** A row with more than one revision grows a **counter button** at the end of the row: `3`, tinted red or green by the direction of the *last* revision. It is also the drawer's handle — clicking expands a row *underneath, inside the same table*, with date, amount, change vs previous and vs original. The counter replaced a `▲ 14 %` chip beside the amount, which the nine-column grid has no room for; the tint is what carries the at-a-glance signal instead.
- **`pausado` stays visible.** Row dims to 50 %, equivalent reads `no cuenta` instead of a number. Removing it would lose the decision.
- **The totals strip** prints `ENTRADAS · SALIDAS · BALANCE`, all normalised to the month, and says whether it is showing the whole scenario or a filtered subset. The balance takes the **verdict's** colour, not the raw sign — `+8 €` is positive and still not a yes.

### 5.3 Compras

The shopping log, and the only screen about money already spent. It sits after Costes because the two are the same money from opposite ends.

KPI row of four → the double-count warning, when there is one → the editable log → the `POR PRODUCTO` rollup → two `.micro` footnotes.

`FECHA · PRODUCTO · CATEGORÍA · IMPORTE · NOTA` — five columns, so unlike Costes it fits without a sticky first column.

- **The headline is `EQUIVALENTE MENSUAL`, not the total**, because the total is not comparable to anything else on the screen and the equivalent is what enters `SALIDAS / MES`. Its sub-line prints the arithmetic (*"media diaria × 30,4"*) and, under 30 days of data, the word **provisional** — the figure is real and it has not settled.
- **`ESTE MES` is `--blue`.** It is a fact with no sign: neither good nor bad, and explicitly not the figure that feeds the budget. Making it a KPI and colouring it informational is what stops it being read as the answer.
- **The amount cell carries no trailing `€` span**, unlike the Costes grid. `EditableAmount` already renders `6,90 €` at rest, and this column is wide enough to show it — the unit beside it would read as a second euro sign. (Costes has that duplication today and gets away with it only because its narrower column clips the first one. Worth fixing there; not worth replicating here.)
- **The warning is an amber `Insight` above the table, not a note below it.** By the time you have scrolled past the grid you have stopped reading, and this is the one thing on the screen that says a number elsewhere in the app is currently wrong. It names the category, prints *registrado* against *estimado* side by side, and carries the button that pauses the estimates — with a line saying pause is not delete, because the button is destructive-looking and is not.
- **`POR PRODUCTO` is the reason the tab exists.** Times bought, total, average, monthly equivalent, share, last bought. Sorted by total, so the answer to "where does the shop actually go" is the first row.
- **The date is a native `<input type="date">`** and renders in the browser's locale, which can put `08/15/2026` next to the app's own `dd/mm/yyyy` elsewhere. Kept anyway: on a phone, a native date picker beats a correctly-formatted text field.

### 5.4 Muebles

A **hero card** carries the one figure this tab exists for — `MÍNIMO REAL PARA ENTRAR A VIVIR` — with the **"sólo esenciales"** pill toggle beside it, because the minimum is only a minimum while that filter is on. Three secondary KPIs follow (whole list, already bought, no price yet): the minimum is only as true as its coverage.

Then **one panel per room**, each with a 3 px progress strip flush under its header showing how much of that room is already bought, and an editable row per article.

### 5.5 Proyectos

Card per project, **two bars**: spend against budget, and elapsed against target date. The relationship between them is the readout — money bar ahead of time bar means overspending; behind means stalled.

### 5.6 Historial

Scenario **drift** is the tab's headline, not one KPI among four: a full-width banner tinted by the sign of the answer, with the figure in the display face and a sentence naming what it means. Three KPIs follow, then one log across every item, newest first — change vs previous, change vs original, % delta. This is a changelog of **estimates** and it must never grow into a transactions feed, which is what the panel's `ESTIMACIONES, NO GASTOS` tag keeps saying. Spending has its own screen now (§5.3), and the tag names what this one *is* rather than what it is not, because "no es un registro de gastos" stopped being true of the app.

Drift is `null` until something has actually been revised. The banner takes the neutral wash in that case and says so — a drift of zero would claim the question has been asked and answered.

### 5.7 Ajustes

Savings, buffer target, appliance fund contribution, the max-rent guideline percentage (**the only constant in the app, and it lives here as an editable field with its assumption printed beside it**), JSON export / import.

### 5.8 Comparar

A **grid**, a column per scenario over a shared row set, with name · situación · verdict pill across the top. Each cell is a value *and its distance from the scenario you are standing in*, so the screen answers "how much worse is this one" without arithmetic.

- **The active scenario's column is tinted `--accent-t`** and its delta cells read *aquí estás*. The accent marks **where you are** — it is interaction, not a verdict. (This replaced an accent underline on the *best* cell per row, which used the accent to mean "good" and broke §1.)
- **The delta is coloured by outcome, not by sign.** Lower salidas is green, lower entradas is red. `FIANZA (DEVOLVIBLE)` is deliberately neutral: a bigger deposit is more cash to find and none of it is lost, so neither direction is better.
- **Rows where every scenario agrees collapse into one muted line** (*"12 conceptos idénticos — mostrar"*). Only the differences stay open, so three flats fit on one screen.

### 5.9 Sistema

The component sheet — §2's swatches, §3's three type roles, §4's components — **rendered against the live tokens**. A swatch here is `var(--accent)`, not a hex copied out of this document, which is the whole reason it is a tab and not a picture: it cannot quietly disagree with what ships.

It sits apart on the right of the tab row, and the phone does not carry it at all — the sheet is unreadable at that width, and an eighth item would crowd the bottom nav. Rotating onto a phone while on Sistema falls back to Resumen rather than stranding the user on a screen with no way back.

---

## 6. Mobile

**A real component fork at 820 px, not a responsive table.** Desktop keeps the dense grid; mobile renders a different component from the same `Entry[]`. Trying to make one table serve both is where this design would go wrong — they are two views of one calculation layer, and `src/lib/` does not know which is mounted.

Horizontal scroll with a frozen `concepto` column was the obvious answer and it is the wrong one. On a phone the user is standing in a flat they are viewing, checking one number.

- **Card per row, two lines.** Line one: what you look for, and what it costs. Line two: category · real frequency · monthly equivalent, with the same `÷2` annotation.
- **Everything else appears on tap, in place** — dirección, prioridad, estado, nota, historial — pushing the list down. No modal, no separate edit screen, no lost scroll position.
- **Status becomes a 3 px left edge.** A coloured select costs a whole column on a phone; the stripe reads at arm's length, and the select reappears inside the opened card.
- **Totals become a sticky footer card** in `--sunk`, directly above the add-row. The whole reason for editing a number on a phone is watching that figure move.

**Costes is the only forked screen, and Compras (§5.3) is the one most likely to need the same treatment next.** Its table scrolls horizontally inside `.tblwrap` like Historial's and Muebles' do, which is fine for a screen you read occasionally — but the shopping log is the one thing here that gets used *standing in a shop*, on a phone, several times a week, and its most important column (`IMPORTE`) is the second from the right. The eight-item bottom nav does fit at 390 px; the table is the part to watch. Fork it the day logging a purchase on a phone feels like work.

---

## 7. Domain rules that became visual rules

Each trap in [`DESIGN-BRIEF.md` §4](DESIGN-BRIEF.md) has a specific consequence in the layout. A change that breaks one of these is a regression even if it looks better.

| domain rule | visual consequence |
|---|---|
| Fianza is refundable | Two KPIs and two ledger boxes, never merged, sitting side by side so the gap between them is legible as the deposit. Blue *Devolvible* pill. Margin never counts the fianza as burned |
| Runway needs a deficit | The sixth KPI changes identity with the sign (§5.1). `∞ meses` has no branch |
| Max rent is a rule of thumb | The quietest KPI in the grid, with its assumption on the sub-line. Never a validation error, never blocks input |
| Agency fees are the landlord's | The row **exists**, at `0,00 €`, struck through, with a red *No deberías pagarlo* pill. Omitting it leaves the user to be surprised; budgeting it legitimises it |
| Electricity is seasonal · promos expire · rent rises | `NOTA` is a wide, always-visible, editable column — not a tooltip, not an icon, not truncated. These notes are what stop a plausible budget being quietly wrong |
| The empty state is the normal state | Blank amounts render as dashed `— —`, never `0,00 €` — a zero is a claim, a dash is an admission. Every total prints its coverage (*"11 / 14 con importe"*) |
| The log adds and never reconciles | An amber banner at the top of Compras (§5.3), naming the category and printing *registrado* against *estimado*, plus its short form under Resumen's bars. The only thing standing between the user and a total that counts the weekly shop twice, so it gets the loudest non-red slot on the screen |
| Nothing is hardcoded | Taxes and charges are ordinary rows with an editable amount and a nota |
| Income is lumpy | The entradas side is designed to look uncertain: sub-lines and row notes carry the caveats (*"ninguno es fijo"*, *"hasta jun-27, sin renovación segura"*). Rendering 730 € as solidly as a salary would lie about the thing that matters most |

---

## 8. Build order

A real sequence — each step is only safe once the one above it exists.

| # | step | files |
|---|---|---|
| 1 | Scaffold + the token block | `vite`, `src/styles/tokens.css`, `tailwind.config.ts` |
| 2 | The model | `src/types.ts` |
| 3 | The calculation layer | `src/lib/money.ts`, `frequency.ts`, `derive.ts` |
| 4 | Storage | `src/lib/storage.ts` |
| 5 | The string table | `src/i18n/es.ts` |
| 6 | Component sheet (§4) | `src/components/` |
| 7 | **Costes** | `src/tabs/Costes.tsx` |
| 8 | **Resumen** | `src/tabs/Resumen.tsx` |
| 9 | Muebles → Proyectos → Historial → Ajustes | `src/tabs/` |
| 10 | Mobile fork + PWA | `src/tabs/CostesMobile.tsx`, `vite-plugin-pwa` |
| 11 | Comparar | `src/tabs/Comparar.tsx` |
| 12 | Re-skin to `Independencia` + Sistema | `tokens.css`, `app.css`, all tabs, `src/tabs/Sistema.tsx` |

Two notes on the ordering:

- **Costes before Resumen**, deliberately. Resumen has nothing to summarise until data can be entered, and the editable grid is where the state model gets stress-tested.
- **Comparar last**, because it needs two real scenarios to be worth anything — and it is the feature the app exists for, so it should be built against real data rather than fixtures.

Write `src/i18n/es.ts` at step 5 rather than sweeping Spanish literals out later (`IND008`); components are then built against keys from the start.
