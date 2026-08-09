# Design system — Independence

The resolved answer to [`DESIGN-BRIEF.md`](DESIGN-BRIEF.md). The brief asked the questions; this file holds the decisions, and the build is expected to match it.

> **Status — 2026-08-09: built.** All eleven steps of §8 have landed. The token block below is `src/styles/tokens.css`, and every screen exists. Where the running app and this file disagree, that is a bug in one of them — say which.
>
> Three things the build changed, all recorded in `docs/DEVLOG.md`: the token block gained a derived group (text on ink, ink washes, semantic borders) so *no* raw hex lives outside `:root`; the display face is `'Archivo Variable'` with `font-stretch:125%`, which is how `@fontsource-variable/archivo` exposes Expanded; and the marginal-state fragility line is phrased per 100 € of surprise rather than against an invented shock figure, so no real-world price is hardcoded.

A working prototype of everything below lives at [`mockups/independence.html`](mockups/independence.html) — a single self-contained file, no build step, open it in a browser. It renders every screen, the component sheet and all three verdict states. **When this file and the prototype disagree, this file wins**; the prototype is a picture, not a source of truth.

---

## 1. The rule the whole system hangs on

Colour has exactly two jobs here, and they never overlap.

| | carries | used for |
|---|---|---|
| **Semantic** — green · red · amber | **meaning** | sign of the balance, state of a row, the verdict |
| **Accent** — mulberry | **interaction** | focus ring, active tab, primary button, links, add-row |

The brief asks that the user read the answer from colour before reading a digit. That only works if the answer is the *only* thing coloured — so categories get no hue of their own, breakdown bars are one warm brown at descending opacity, and headings are never tinted.

**If a number renders in the accent, that is a bug.** The one legitimate exception is a value mid-edit, and even there the ring carries the state, not the text.

Two consequences worth stating because they are easy to undo later:

- **A category never gets a colour.** The moment `vivienda` is blue and `ocio` is purple, green stops meaning "good".
- **`pagado` and `pausado` get no hue at all.** Neither is good or bad — one is settled, one is deliberately excluded — so both use `--stone`, distinguished by weight, a `✓`, and the 50 % dim on a paused row. This is why there is no `--info` token.

---

## 2. Tokens

Warm plaster ground, warm near-black ink, mulberry accent, earth semantics. Light mode only — the product commits to one look; dark mode is not planned and is not a gap.

Every colour in the app resolves through a variable in this one block. **No raw hex exists anywhere else in `src/`**, and Tailwind consumes the variables rather than owning colours.

### `src/styles/tokens.css`

```css
:root{
  /* ── ground — warm plaster, the wall of the flat, not a sheet of paper ── */
  --bg:#EBE4D9;      --card:#F8F4EC;   --sunk:#DFD6C6;   --raised:#FFFDF8;
  --ink:#1E1813;     --ink-2:#2A231C;  --ink-3:#3A3128;
  --text:#1F1913;    --muted:#6E6357;  --faint:#A79B8B;
  --border:rgba(31,25,19,.15);   --border-ink:rgba(248,244,236,.10);

  /* ── accent — interaction, never meaning ── */
  --accent:#7B3A87;  --accent-l:#C88ED6; --accent-t:#F2E6F4;

  /* ── semantic — meaning, never decoration ── */
  --green:#3D6B33;   --green-t:#E6EDDA;  --green-f:#6B9243;
  --red:#B23A25;     --red-t:#F7E4DC;    --red-f:#CE5A3E;
  --amber:#8A6212;   --amber-t:#F6E8CB;  --amber-f:#C9901A;
  --stone:#6E6357;   --stone-t:#E7DFD1;

  /* ── form ── */
  --r-sm:4px; --r:8px; --r-lg:12px;
  --sh-1:0 1px 2px rgba(28,22,17,.08);
  --sh-2:0 4px 14px rgba(28,22,17,.12);
  --sh-3:0 22px 55px rgba(28,22,17,.30);

  /* ── type ── */
  --display:'Archivo Expanded','Archivo',ui-sans-serif,system-ui,sans-serif;
  --mono:'IBM Plex Mono',ui-monospace,Menlo,Consolas,monospace;
  --body:'IBM Plex Sans',system-ui,-apple-system,'Segoe UI',sans-serif;
}
```

### `tailwind.config.ts`

```ts
theme:{ extend:{
  colors:{ bg:'var(--bg)', card:'var(--card)', sunk:'var(--sunk)', ink:'var(--ink)',
           accent:'var(--accent)', green:'var(--green)', red:'var(--red)',
           amber:'var(--amber)', stone:'var(--stone)' },
  fontFamily:{ display:'var(--display)', mono:'var(--mono)', body:'var(--body)' },
}}
```

### Token roles

| token | role |
|---|---|
| `--bg` | app ground |
| `--card` | panel body, KPI body |
| `--sunk` | filter bars, table heads, totals row, insight box, drawer rows |
| `--raised` | focused input, hero KPI. **Warm white, not `#FFF`** — a true white input on plaster reads as a hole, not a lift |
| `--ink` / `--ink-2` | panel headers and app header / tab strip |
| `--ink-3` | breakdown bar fills, at descending opacity |
| `--muted` | labels, secondary numbers. 5.3:1 on `--card` |
| `--faint` | **only** empty amounts and the `÷2` divisor annotation |
| `--*-t` | tint — pill and select fill |
| `--*-f` | fill — bars and status dots **only**, never text; they do not pass at 8 px |

### Rules for changing it

- **Swapping the palette is nine lines.** If mulberry is wrong, `#8E3050` (wine — warmer, but check it against the brick red at 8 px) or `#5B4BA8` (warm indigo — cooler, safest clearance from every semantic).
- **Do not move the accent into rust, ochre or olive.** On this ground they are indistinguishable from red, amber and green, and the accent starts looking like a verdict.
- **Green, red and amber must survive at 8 px** — they appear as pill text and as `<select>` text. Test at that size before committing a change, on `--card` *and* on their own tint.
- **Warming the ground moved three things**, and un-warming any one of them is what would make this look accidental: pure white left the palette, the semantics rotated to earth, and the ink went warm. They travel together.

---

## 3. Type

Three faces, three fixed roles. No fourth role, and no face used outside its role.

| role | face | used for |
|---|---|---|
| **display** | Archivo Expanded 800 | KPI values and screen titles **only**. `font-variant-numeric: tabular-nums` always. Never below 18 px |
| **mono** | IBM Plex Mono | every label, column head, table input, tag, button, amount, micro-label. Carries the personality |
| **body** | IBM Plex Sans | prose, notes, the insight line, row labels. 12–13 px in the app |

**Install the faces as local packages** (`@fontsource/...`), not as CDN links. The app is a PWA that must work offline on the first launch after install, and a font that fails to load silently changes the density of every screen.

### Density

Deliberately dense on desktop, per the Command Center grammar: 12–13 px body, 8–9 px mono labels with 0.15–0.2em tracking, 6–8 px table cell padding. Keep it. The mobile fork (§6) is where density gets relieved, not the desktop breakpoint.

---

## 4. Components

Ten components carry every screen. They live in `src/components/`, and **no tab reaches past them for a colour**.

| component | notes |
|---|---|
| `Panel` | rounded card, light body, ink header bar. Micro-label mono 9 px / 0.2em / uppercase, plus a state dot. Actions right-aligned **in the same bar** — there is no second toolbar |
| `KpiCard` | label (mono, tiny) → value (display, 27 px; 38 px for hero) → sub-line (mono, tiny, muted). 1 px gutters read as hairlines |
| `Tag` | mono 8 px, uppercase, pill radius, tinted background + matching border + matching text. Verdicts and states |
| `Button` | mono 9 px uppercase. Variants: accent-filled, accent-outline, ghost, on-ink |
| `AddRow` | dashed, full width, at the foot of the table. **Not a floating action button** |
| `EditableCell` | transparent input in table mono. Rest / hover (border + raised) / focus (accent border + 2 px glow) / empty (dashed, faint `— —`). Focus strips the currency format and leaves the raw number. Typing writes straight to state — **no save button** |
| `StatusSelect` | a `<select>` whose colour is driven by its selected value: activo → green, pendiente → amber, pagado → stone + `✓`, pausado → stone outline (and the row dims to 50 %) |
| `BreakdownBar` | label · track · fill · amount. One tone (`--ink-3`) at descending opacity |
| `FilterBar` | sits **inside** the panel, between the ink header and the table body. Chips, not a dropdown row |
| `Insight` | `--sunk` box with a 3 px accent left border. One plain-language sentence |

---

## 5. Screens

Tabs: **Resumen · Costes · Muebles · Proyectos · Historial · Ajustes**, plus **Comparar**, which the brief did not specify and §5.7 proposes.

### 5.1 Resumen

Header (scenario select + `situación`) → verdict pill → KPI row of six → breakdown bars beside the upfront ledger → insight line.

**The sixth KPI changes identity with the sign of the balance.** This is the rule that keeps `∞ meses` from ever rendering — that branch does not exist:

| balance | label | shows |
|---|---|---|
| negative | `MESES DE MARGEN` | savings after upfront ÷ monthly deficit |
| marginal (< 5 % of salidas) | `MARGEN` | the balance, plus how fragile it is in units the user feels — *"un imprevisto de 200 € se come once meses de margen"* |
| positive | `COLCHÓN` | buffer target, whether it is covered, what is left after moving in |

The label changes; the slot does not move.

The **max-rent guideline** is an amber strip *below* the KPI row that states its own assumption inline (*"32 % sobre 730 €/mes"*). It never touches an input, never blocks a save, and is never red.

The **upfront ledger** separates `dinero al entrar` from `gasto real` as two totals, with the fianza row carrying a green *Devolvible* pill. There is no combined "moving costs" figure anywhere in the app.

### 5.2 Costes

One dense editable grid holding **both** entradas and salidas, filters inside the panel, a totals row, a dashed add-row.

- **Frequency vs monthly equivalent.** `IMPORTE` holds the number the user knows (*"58 € cada dos meses"*); `EQUIV. MENSUAL` holds the number they decide with. A faint mono divisor sits between them — `÷2`, `÷12`. That one annotation removes all ambiguity about which column was normalised, at almost no visual cost.
- **Price history without a modal.** A row with more than one revision grows a delta chip beside its amount (`▲ 14 %`). The caret expands a drawer row *underneath, inside the same table* — date, amount, change vs previous and vs original.
- **`pausado` stays visible.** Row dims to 50 %, equivalent reads `no cuenta` instead of a number. Removing it would lose the decision.

### 5.3 Muebles

Grouped by room, `pendiente` / `pagado`. The **"sólo esenciales"** filter is promoted out of the chip row into the panel header, because it is the control that answers the question. It gets its own KPI: `MÍNIMO PARA ENTRAR`, alongside a `SIN PRECIO` count — the minimum is only as true as its coverage.

### 5.4 Proyectos

Card per project, **two bars**: spend against budget, and elapsed against target date. The relationship between them is the readout — money bar ahead of time bar means overspending; behind means stalled.

### 5.5 Historial

One log across every item, newest first, with scenario **drift** as the hero KPI. Per row: change vs previous, change vs original, % delta. This is a changelog of **estimates**; it is not a transactions feed and must never grow into one.

### 5.6 Ajustes

Savings, buffer target, appliance fund contribution, the max-rent guideline percentage (**the only constant in the app, and it lives here as an editable field with its assumption printed beside it**), JSON export / import.

### 5.7 Comparar — proposed

A column per scenario over a shared row set, verdict pills across the top. The rule that makes it usable: **rows where every scenario agrees collapse into one muted line** (*"12 conceptos idénticos — mostrar"*). Only the differences stay open, so three flats fit on one screen. The best cell per row gets an accent underline — the accent marks *look here*, not *good*.

---

## 6. Mobile

**A real component fork at 820 px, not a responsive table.** Desktop keeps the dense grid; mobile renders a different component from the same `Entry[]`. Trying to make one table serve both is where this design would go wrong — they are two views of one calculation layer, and `src/lib/` does not know which is mounted.

Horizontal scroll with a frozen `concepto` column was the obvious answer and it is the wrong one. On a phone the user is standing in a flat they are viewing, checking one number.

- **Card per row, two lines.** Line one: what you look for, and what it costs. Line two: category · real frequency · monthly equivalent, with the same `÷2` annotation.
- **Everything else appears on tap, in place** — dirección, prioridad, estado, nota, historial — pushing the list down. No modal, no separate edit screen, no lost scroll position.
- **Status becomes a 3 px left edge.** A coloured select costs a whole column on a phone; the stripe reads at arm's length, and the select reappears inside the opened card.
- **Totals become a sticky footer card** in `--sunk`, directly above the add-row. The whole reason for editing a number on a phone is watching that figure move.

---

## 7. Domain rules that became visual rules

Each trap in [`DESIGN-BRIEF.md` §4](DESIGN-BRIEF.md) has a specific consequence in the layout. A change that breaks one of these is a regression even if it looks better.

| domain rule | visual consequence |
|---|---|
| Fianza is refundable | Two KPIs and two ledger totals, never merged. Margin never counts the fianza as burned |
| Runway needs a deficit | The sixth KPI changes identity with the sign (§5.1). `∞ meses` has no branch |
| Max rent is a rule of thumb | Amber guideline strip with its assumption stated. Never a validation error, never blocks input |
| Agency fees are the landlord's | The row **exists**, at `0,00 €`, struck through, with a red *No deberías pagarlo* pill. Omitting it leaves the user to be surprised; budgeting it legitimises it |
| Electricity is seasonal · promos expire · rent rises | `NOTA` is a wide, always-visible, editable column — not a tooltip, not an icon, not truncated. These notes are what stop a plausible budget being quietly wrong |
| The empty state is the normal state | Blank amounts render as dashed `— —`, never `0,00 €` — a zero is a claim, a dash is an admission. Every total prints its coverage (*"11 / 14 con importe"*) |
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

Two notes on the ordering:

- **Costes before Resumen**, deliberately. Resumen has nothing to summarise until data can be entered, and the editable grid is where the state model gets stress-tested.
- **Comparar last**, because it needs two real scenarios to be worth anything — and it is the feature the app exists for, so it should be built against real data rather than fixtures.

Write `src/i18n/es.ts` at step 5 rather than sweeping Spanish literals out later (`IND008`); components are then built against keys from the start.
