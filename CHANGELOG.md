# CHANGELOG

One section per deploy. No version numbers — this is a personal app with a single user, and a semver number would be ceremony without a consumer.

This tracks **code**. The app's own Historial tab tracks **prices**, which is a different changelog entirely — worth saying which one you mean.

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
