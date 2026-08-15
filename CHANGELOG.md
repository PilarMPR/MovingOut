# CHANGELOG

One section per deploy. No version numbers — this is a personal app with a single user, and a semver number would be ceremony without a consumer.

> **`package.json` does carry a version, and that is not a reversal of the line above.** Once the app is packaged, the build tools stamp artifacts with it: the filename `movingout-1.0.0.tar.gz`, Android's `versionName`. Left at `0.0.0` those read as broken rather than unversioned. So the *artifacts* are versioned because something downstream demands it, and the *sections here* still are not, because nothing does. Bump `package.json` and `android/app/build.gradle` together when an artifact goes somewhere.

This tracks **code**. The app's own Historial tab tracks **prices**, which is a different changelog entirely — worth saying which one you mean.

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
