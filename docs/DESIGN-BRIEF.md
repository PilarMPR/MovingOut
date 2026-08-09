# Design brief — Independence

**Hand this whole file to a designer.** It is self-contained: nothing below depends on reading the codebase, because there is no codebase yet. The app is unbuilt, and the interface is the next thing that has to exist.

> **Answered — 2026-08-09.** This brief has been worked through. The palette (§6), the open problems (§9) and every deliverable (§11) are resolved in **[`DESIGN-SYSTEM.md`](DESIGN-SYSTEM.md)**, with a working prototype at [`mockups/independence.html`](mockups/independence.html).
>
> This file is now **historical**: it is kept because it records *why* each requirement exists, which the spec does not repeat. On any question of *what the design is*, the spec supersedes it. Keep §1–§4 and §7 accurate — they are domain truth, not design opinion — and treat §5, §6, §9 and §11 as the question that has since been answered.

---

## 1. What this is

A personal budget calculator for **moving out**. It answers exactly one question:

> **Can I afford to move out, and when?**

It models what independence actually costs: rent, the one-off pile of things you have to buy on day one, the recurring bills, the small consumables nobody budgets for, and a buffer for when something breaks.

**One user. One device. Madrid. Euros.** It is not a product, not multi-user, not a general finance app. Every design decision should favour *"correct for one person making one real decision"* over *"flexible for anyone"*.

### Who is using it

A **student with no steady income**. Money in is savings, family help, grants and occasional work — not a salary. Nothing is withheld at source. The interface must never assume a payslip, a monthly pay date, or a stable income line.

This matters visually: the "income" side of the screen is lumpy, uncertain and often partly empty. A design that assumes a confident income number will look wrong the moment it holds real data.

### Constraints that shape the design

| | |
|---|---|
| Platform | Web app, installable as a PWA. React + TypeScript + Tailwind |
| Data | Everything in `localStorage`. No backend, no accounts, no login, no sync |
| Backup | JSON export / import — this is the only "cloud" story |
| Offline | Always. There is no network state to design for |
| Language | **UI text is Spanish.** Code and docs are English. See §7 for the copy deck |
| Currency | EUR, formatted `es-ES` → `1.234,56 €` (comma decimal, dot thousands, space before €) |

---

## 2. The mental model to design around

Five nouns. Everything on screen is one of these.

### Scenario

A complete named budget: `"Piso centro 900 €"`, `"Compartir con Ana"`. **Scenarios exist side by side and are comparable** — the entire point of the app is deciding *between real options*, not budgeting one. Comparison is a first-class need, not a feature bolted on later.

Each scenario carries a **situación**: `estudiante · becario · empleado · autónomo`. It sits at header level and switches which income and tax assumptions apply. "What if I get a job" is just another scenario.

### Entry — the universal unit

Income, costs, taxes and furniture are **all the same shape**. A grant, family help and the rent are rows in the same grid with the same controls.

| field | values |
|---|---|
| `label` | "Alquiler", "Beca", "Detergente" |
| `direction` | `entrada` (money in) · `salida` (money out) |
| `category` | vivienda · suministros · consumibles · alimentación · transporte · ocio · impuestos · ingresos · mobiliario · otros |
| `frequency` | mensual · bimestral · trimestral · anual · único |
| `priority` | esencial · deseable |
| `status` | activo · pausado · pendiente · pagado |
| `amount` | a number, **always positive** — the sign comes from `direction` |
| `history[]` | append-only list of `{ fecha, importe, nota }` — see below |
| `room` | furniture only: cocina · salón · dormitorio · baño · otros |
| `note` | free text |

Two consequences for the interface:

- **Frequency is stored real, not monthly.** Water and gas are commonly billed **bimonthly** in Spain; insurance is annual. A row must show its true frequency *and* its monthly equivalent, because the user thinks in "the water bill is 60 € every two months" but decides in "so that's 30 €/month". Designing this pair without clutter is one of the harder problems here.
- **Status is what makes the table live rather than a snapshot.** `pausado` keeps a row without counting it. `pendiente` / `pagado` track one-offs not bought yet. Status must be readable at a glance across a long table.

### FurnitureItem

An Entry with a `room`, using `pendiente` / `pagado`. Grouped by room, filterable to `esencial` only — **that filter is the answer to "what's the true minimum to move in"**, so it deserves more prominence than a normal filter chip.

### PurchaseProject

A named multi-item goal (`"Amueblar salón"`) with its own budget and target date. Entries join it. Progress against budget and against date both matter.

### Buffer

The emergency reserve target plus an appliance sinking fund. Modelled as a **monthly contribution**, not a one-off — because that is how you actually build one.

---

## 3. The numbers on screen

These are computed values. They are the reason the app exists, so they get the visual weight.

| figure | Spanish label | meaning |
|---|---|---|
| `monthlyIn` | Entradas / mes | Frequency-normalised income |
| `monthlyOut` | Salidas / mes | Frequency-normalised costs |
| **`balance`** | **Balance** | `monthlyIn − monthlyOut`. **The single number the whole app exists to show** |
| `upfrontCash` | Dinero al entrar | Everything due before you sleep there, fianza included |
| `actualSpend` | Gasto real | `upfrontCash` minus refundables — what you never see again |
| `runwayMonths` | Meses de margen | Savings after upfront costs ÷ monthly deficit |
| `maxAffordableRent` | Alquiler máx. orientativo | Rule-of-thumb guideline |
| `drift` | Desviación | Burn today vs burn when the scenario was created |
| `verdict` | — | The plain-language answer, as a pill |

---

## 4. Rules that stop the design being quietly wrong

These are domain traps. Each one has a visual consequence. **Please read them as design requirements, not background.**

1. **Fianza (the deposit) is refundable.** *Cash you need upfront* and *money actually spent* are two different numbers and must be visually distinct. Never merge them into one "moving costs" figure.

2. **Runway only means something when the balance is negative.** When the balance is positive, show **time-to-goal** instead. An "∞ meses" readout is a bug in the framing, not a result — design the positive-balance state as its own thing, not as the negative state with a big number in it.

3. **Max affordable rent is a rule of thumb** (~30–35 % of income). It is shown as a **visible guideline with its assumption stated**, never as a gate that blocks input, never as a red error. The user is allowed to plan something the guideline dislikes.

4. **Agency fees are the landlord's by law** in Spain since the 2023 Ley de Vivienda. The app **must never silently include one**. If it appears at all, it appears as *"esto no deberías pagarlo"* — a thing to challenge, not a line item to accept.

5. **Electricity is seasonal.** A flat monthly average understates winter badly. A row needs room to carry a range or a seasonal note rather than one confident number.

6. **Promo prices expire.** Internet and mobile deals typically jump after ~12 months. A row should be able to carry a known future price change.

7. **Rent rises annually** against a published index. Any multi-month projection must escalate rent rather than hold it flat, and should say which index it assumed.

8. **The first big shop is not a weekly shop.** Stocking an empty kitchen is a one-off event of its own. Folding it into "alimentación" blows month one silently.

9. **No price, rate or cap is ever hardcoded.** Taxes and charges are ordinary editable rows with a note. Do not design a screen that presents a built-in number as authoritative.

---

## 5. Visual grammar — the "Command Center" skin

The interaction and visual grammar is lifted from a sibling app the user already owns and likes. It is a dense, instrument-panel aesthetic — closer to a cockpit readout than to a consumer finance app. Reproduce the *grammar*; the palette is yours to choose (§6).

### Structure

- **Panels.** Rounded card, light body, **dark header bar**. The header carries a **mono, uppercase, letter-spaced micro-label** (~9 px, 2 px tracking) and a small coloured status dot. Actions sit right-aligned in the same bar.
- **A three-font system with fixed roles:**
  - a **display** face — used only for big KPI numbers and titles
  - a **mono** face — every label, column head, table input, tag and button. This carries most of the personality
  - a **body** face — prose, notes, insight lines
- **KPI cards** in a tight grid, separated by 1 px gutters that read as hairlines. Label (mono, tiny, uppercase) → value (display, ~32 px) → sub-line (mono, tiny, muted).
- **Colour by sign, not by category.** Positive green, negative red, warning amber. This is the primary information channel — a user should read the answer from colour before reading a digit.
- **`.tag` pills** — mono, 8 px, uppercase, pill radius, tinted background + matching border + matching text. Used for verdicts and states.
- **Horizontal breakdown bars** for where the money goes.

### Interaction

- **The Costes tab is one inline-editable grid, not a form behind a modal.** Cells are transparent inputs that adopt the table's mono type; on focus they lift to a card background with a 1 px accent ring. Typing writes straight to state. There is no save button.
- **Status is a `<select>` whose colour is driven by its selected value**, so a long table is scannable without reading it.
- **Add-row is a dashed full-width button** at the foot of the table, not a floating action button.
- Filter bars sit *inside* the panel, between the dark header and the table body.
- One **plain-language insight line** at the bottom of Resumen that states the answer in a sentence.

### Density

The reference runs at 12–13 px body, 8–9 px mono labels, 6–8 px padding in table cells. It is deliberately dense. Keep that on desktop. See §9 for the mobile problem this creates.

---

## 6. The palette is genuinely open — and it is a deliverable

> **Resolved.** Warm plaster ground, warm near-black ink, mulberry accent, earth semantics, light mode only. Final block in [`DESIGN-SYSTEM.md` §2](DESIGN-SYSTEM.md). The requirements below were met, with one change: `--blue` was dropped. `pagado` and `pausado` get no hue at all, because neither is good or bad — see §1 of the spec.

**No colours have been chosen.** This is the one place where the brief wants invention rather than compliance.

Requirements:

- Deliver the palette as a **single `:root` block of CSS custom properties**. Every colour in the app resolves through a variable — Tailwind is configured to consume the variables, and there must be no raw hex anywhere else. Swapping the palette later has to be one block, not a sweep across components.
- Token roles needed, at minimum:
  `--bg` · `--card` · `--dark` (panel headers) · `--border` · `--text` · `--muted` · `--accent` (+ light variant) · `--green` · `--red` · `--amber` · `--blue` (each with a tinted background pair for pill and button use) · radii · shadows · the three font families.
- **Green / red / amber must survive being small.** They appear at 8 px in pills and as `<select>` text. Test them at that size before committing.
- Light mode is the priority. Dark mode is welcome but not required.
- The subject matter is a student working out whether they can leave home. It should not feel like corporate banking software, and it should not feel cute. It is allowed to have a point of view.

---

## 7. Copy deck — Spanish

All UI text is Spanish. Domain terms that have no clean English equivalent keep their Spanish names deliberately: **fianza · empadronamiento · autónomo · comunidad**. Use these strings; do not translate the app into English for the mockups.

**Tabs:** `Resumen` · `Costes` · `Muebles` · `Proyectos` · `Historial` · `Ajustes`

**KPI labels:** `ENTRADAS / MES` · `SALIDAS / MES` · `BALANCE` · `DINERO AL ENTRAR` · `GASTO REAL` · `MESES DE MARGEN` · `ALQUILER MÁX. ORIENTATIVO` · `DESVIACIÓN`

**Table columns:** `CONCEPTO` · `TIPO` · `CATEGORÍA` · `FRECUENCIA` · `PRIORIDAD` · `ESTADO` · `IMPORTE` · `EQUIV. MENSUAL` · `NOTA`

**Values:**

| field | Spanish |
|---|---|
| direction | Entrada · Salida |
| frequency | Mensual · Bimestral · Trimestral · Anual · Único |
| priority | Esencial · Deseable |
| status | Activo · Pausado · Pendiente · Pagado |
| category | Vivienda · Suministros · Consumibles · Alimentación · Transporte · Ocio · Impuestos · Ingresos · Mobiliario · Otros |
| room | Cocina · Salón · Dormitorio · Baño · Otros |
| situación | Estudiante · Becario · Empleado · Autónomo |

**Verdict pills:** `✓ TE LO PUEDES PERMITIR` · `✗ TE FALTAN 120 €/MES` · `⚠ JUSTO`

**Buttons:** `+ AÑADIR CONCEPTO` · `NUEVO ESCENARIO` · `COMPARAR` · `EXPORTAR` · `IMPORTAR`

**Insight line, example tone:**
> *Con este piso te faltan 120 € al mes. Bajando el alquiler a 780 € saldría, o cubriéndolo con 3 h más de trabajo a la semana.*

Plain, second person, no exclamation marks, no encouragement. It states the answer.

---

## 8. Screens to design

Six tabs. Priority order below — if time is short, **Resumen and Costes are the app**; the rest can be lower fidelity.

### 8.1 Resumen — *highest priority*

The answer, in one screen. Should be readable in three seconds.

- Scenario selector + `situación` switch in the header
- The verdict pill, prominent
- KPI row: entradas, salidas, **balance** (the hero number), dinero al entrar, gasto real, meses de margen
- A breakdown of where the money goes — horizontal bars by category
- The upfront block, with **fianza visibly separated as refundable**
- The one plain-language insight line at the bottom

Design **three states** of this screen: comfortably affordable, marginal, and clearly not affordable. The last is the most likely real state and must not feel like a failure screen.

### 8.2 Costes — *highest priority*

One dense editable grid holding **both** entradas and salidas. Filters for category, priority, status, direction. A totals row. Inline editing everywhere, colour-coded status selects, dashed add-row at the foot. Show how a row displays its real frequency alongside its monthly equivalent.

### 8.3 Muebles

The one-off pile, grouped by room, with `pendiente` / `pagado` progress. The **"sólo esenciales"** filter is the important control — it produces the true minimum to move in, and that resulting figure deserves its own readout.

### 8.4 Proyectos

Named multi-item goals with a budget and a target date. Progress against both.

### 8.5 Historial — the price changelog

Every amount revision across every item, newest first, as one log. Per item: change vs previous, change vs original, % delta. Per scenario: **drift** — is this piso more expensive than when I planned it?

This is a log of **estimates, not spending**. There is deliberately no daily expense logging — the app must stay useful without daily upkeep. Do not design a transactions feed.

### 8.6 Ajustes

Savings, buffer target, appliance fund contribution, the max-rent guideline percentage, JSON export / import.

---

## 9. Problems worth solving properly

> **All five answered** in [`DESIGN-SYSTEM.md`](DESIGN-SYSTEM.md): the mobile fork at 820 px (§6), the `÷2` divisor annotation (§5.2), the Comparar screen with identical rows collapsed (§5.7), the inline history drawer (§5.2), and the empty state as the normal state (§7).

Genuine open questions. Opinionated answers are welcome.

1. **The dense grid on a phone.** This is a PWA the user will open on their phone, and the Costes tab is a nine-column editable table. Card-per-row? Horizontal scroll with a frozen `concepto` column? A reduced mobile column set? This is the biggest single unknown in the design.

2. **Frequency and monthly equivalent in one row** without doubling the visual noise.

3. **Comparing scenarios.** Side-by-side columns, an overlay, a diff view? The app exists to choose between options, and no screen for that is specified above — propose one.

4. **Surfacing price history per row** without a modal, given that the grid is already dense.

5. **The empty state is the normal state.** New scenarios seed dozens of rows from a checklist with **amounts deliberately blank** — real figures come from the user's own research. The design must look correct and encouraging when three-quarters of the amounts are empty, not broken.

---

## 10. Do not design

- Login, signup, onboarding wizard, account settings, multi-user, sharing
- Bank connections, transaction imports, receipt scanning, daily expense logging
- Charts of historical *spending* — the history here is of **estimates**
- Notifications, streaks, gamification, badges
- A marketing or landing page

---

## 11. Deliverables

> **Delivered.** All six, in [`DESIGN-SYSTEM.md`](DESIGN-SYSTEM.md) and [`mockups/independence.html`](mockups/independence.html).

1. The **`:root` token block** — the palette and type scale as CSS custom properties (§6). This is the piece the build depends on most.
2. **Resumen**, in its three states (affordable / marginal / not affordable), desktop and mobile.
3. **Costes**, desktop and mobile, showing inline editing, focus state, status colours, filters and the totals row.
4. **Muebles**, **Proyectos**, **Historial** at whatever fidelity time allows.
5. A **component sheet**: panel, KPI card, tag pill, button variants, table row, inline-edit cell (rest / hover / focus), status select per value, breakdown bar, dashed add-row.
6. A proposal for **scenario comparison** (§9.3).

Static mockups are fine. If a prototype is easier, a single self-contained HTML file matching the token structure is the most directly usable form.
