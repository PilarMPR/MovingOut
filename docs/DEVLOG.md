# DEVLOG

Errors, successes and dead ends, newest first, tagged with the `IND***` invariant IDs from [`../CLAUDE.md`](../CLAUDE.md#the-invariants).

This is not a changelog. `CHANGELOG.md` records *what shipped*; this records *what was learned*, including the things that never shipped because they didn't work.

## Recurrence table

Load-bearing: a review should read this first and scrutinise whatever is at the top. **A failure that reaches 3 occurrences should be promoted into a static check in `.claude/tools/check.py`** — that is the whole point of counting.

| ID | occurrences | last seen |
|---|---|---|
| IND001 | 1 | 2026-08-09 |

The invariants in `CLAUDE.md` are still mostly **seeded predictions**, not earned lessons — one of them has now earned its place. An entry that never appears in this table over a few months of real work should be deleted from that list rather than kept out of politeness.

Notably **not** yet earned after the first build: IND002, IND003, IND005, IND006, IND007, IND008 never fired on real code. IND004 never fired either, but only because `toMonthly()` was written before anything that could sum.

## Entries

## 2026-08-15 · "The desktop app won't open" — it was opening the whole time · no ID

**What happened.** Reported as: works on the phone, will not open on the laptop. The suggested fix was a laptop-specific branch. There was no bug in the app, and the branch would have forked a working codebase away from the one thing that was actually fine.

**What it actually was, in two parts.** The `.AppImage` in `release/` genuinely cannot run here — no `libfuse.so.2`, no sudo — and it is by a distance the most double-clickable file in that directory. It had been left there on the reasoning that it stays useful on machines that *do* have FUSE. That reasoning is true and it was still the wrong call: **a known-broken artifact sitting next to working ones is not neutral, it is the default thing someone will try.** It is now removed from `build.linux.target`; `tar.gz` is the only artifact. Second, the window opens on **whichever workspace the launcher happened to be on** — during diagnosis it sat on workspace 3 while the current desktop was 4. A window you cannot see is indistinguishable from a window that was never created.

**How it was actually settled, and why the earlier checks were not enough.** Three levels of evidence, each of which looked sufficient and wasn't:

1. *The process stays alive* (`timeout 12 ...; exit=124`) — passes for a process that never opens a window.
2. *A window exists* (`wmctrl -lG` → `2560x1464` at `+60+256`, on-screen, `_NET_WM_WINDOW_TYPE_NORMAL`) — passes for a blank white window.
3. *The DOM has content* — the only one that answers the question.

Level 3 needed no code change: launch the **packaged** binary with `--remote-debugging-port=9222`, then drive the DevTools protocol over a WebSocket (`suppress_origin=True`, or the handshake is refused with a 403 naming `--remote-allow-origins`). That returned 249 nodes, 405 CSS rules, `getComputedStyle(body).backgroundColor === rgb(239,237,231)` — the real `--bg` — and `localStorage` working at `origin=app://movingout`. **This is the check that should have been run on the packaged build on day one**; the `capturePage` hook from 2026-08-11 only ever proved the *dev* build renders, and dev is the configuration where the asar does not exist.

**The theory that was wrong, and worth recording because it was plausible.** The suspicion was that `net.fetch(pathToFileURL(...))` cannot read through `app.asar` — Chromium's `file://` loader has no idea what an asar is — so the packaged app would serve nothing and show a blank window, exactly matching the symptom, and *only* when packaged. It is a real failure mode for this design. It is simply not what happens: Electron's `net.fetch` resolves inside the archive, and the origin fix holds in the packaged build. Recorded so nobody re-derives the fear and "fixes" it by disabling asar.

**Lesson.** *Works on A, not on B* invites a fork, and a fork is almost always the wrong first move — it doubles the surface while leaving the cause untouched. The useful question is what genuinely differs between A and B, and here nothing in `dist/` did: the difference was the host, the artifact chosen, and which workspace a window landed on.

## 2026-08-11 · Wrapped as a desktop app and an APK; the origin is the whole story · no ID

**What happened.** The same `dist/` got two native shells: Electron for the desktop and Capacitor for Android. No `src/` file changed. The interesting parts were all outside the app.

**`file://` would have silently emptied the app.** The obvious desktop shell is `win.loadFile('dist/index.html')`, and it would have rendered perfectly. But a `file://` page has an **opaque origin**, and Chromium keys `localStorage` to an origin — so the store this app keeps *everything* in (every scenario, every price revision, the whole seeded checklist) would have been unreliable, and unreliable in the worst way: fine within a session, empty or orphaned across launches. The fix is to give the shell a real origin — `app:` registered via `registerSchemesAsPrivileged` as `standard` + `secure`, serving `dist/` from `app://movingout`. Capacitor already does the equivalent, serving from `https://localhost`. **The lesson generalises past Electron: when a web app is rehosted, the origin moves with it, and anything keyed to the origin moves too.** `IND006` says `localStorage` has exactly one door in `storage.ts`; it does not say the room can be moved out from under it.

**`app.commandLine.appendSwitch('ozone-platform', 'x11')` does nothing.** Chromium's Wayland backend segfaults on this compositor before it paints a frame, and X11 is stable. The natural place for that switch is the top of `main.cjs` — where it has no effect at all, because ozone selects its backend before the main script is evaluated. The switch has to arrive on the command line, so it lives in the npm scripts and in `build.linux.executableArgs`, with a comment in `main.cjs` explaining why it is *not* there. Two runs looked identical (`SIGSEGV`) and it would have been easy to conclude the flag didn't work rather than that it arrived late.

**Verify a GUI by capturing it, not by watching it not crash.** "The process is still alive after 10 seconds" was the check available, and it is a weak one — it passes for a blank white window. Adding a temporary `capturePage()` + `executeJavaScript('document.querySelectorAll("*").length')` hook proved 194 nodes and the right `<title>`, which is what actually established that the shell renders the app. Removed once it had answered. Related: `exit=$?` after an `echo` reports the echo. Two "passes" were read off the wrong exit code before the tests were rewritten to report `$PIPESTATUS`/direct codes — `139` (SIGSEGV) and `124` (timeout, i.e. survived) are the two answers that matter and they are easy to hide behind a pipe.

**Packaging is what made the stale palette visible.** The icons were still pre-reskin — ink `#1E1813` and mulberry `#C88ED6` — three months of `tokens.css` edits had never touched them, because baked pixels are not type-checked, not linted and not imported by anything. Android made it worse by shipping its own stock logo. They are now generated by `scripts/make-icons.py`, which reads the `:root` block, so the "swapping the palette is one edit" promise in `CLAUDE.md` covers them. The PWA manifest had drifted the same way and for the same reason. **Anything that copies a token instead of reading one is a future inconsistency**; the three that genuinely cannot read `tokens.css` — the manifest, the Capacitor config, the pre-paint window colour — are now each commented as the exception they are. (`main.cjs` *can* read it, and does.)

**Two environment traps, neither of them the app's fault.** Electron came up as plain Node with every API `undefined`, because VSCode sets `ELECTRON_RUN_AS_NODE=1` for extension-host children and this session inherited it; the giveaway was a `Node.js v24.18.1` crash banner where an Electron stack should be. And the AppImage builds but cannot run here — no `libfuse.so.2`, no sudo to install it — so the shipped desktop path is `release/linux-unpacked/` behind a `.desktop` entry. **An artifact that builds is not an artifact that runs, and the difference only shows up if you run it.**

## 2026-08-11 · Re-skinned to `Independencia`, and two written rules were overturned · no ID

**What happened.** The Claude Design project *Moving out finances app* (`Independencia.dc.html`) replaced the palette, the type stack and several screen layouts. Most of it was a straight port. Two parts were not, because the design contradicts things `DESIGN-SYSTEM.md` had committed to in writing, and a design that disagrees with a doc is only worth adopting if you can say which one was wrong.

**`--blue` now exists, and the old rule was too broad.** The doc said: *"`pagado` and `pausado` get no hue at all … which is why there is no `--info` token."* The reasoning was that neither state is good or bad. That is true of both, but it conflates two different things. `pagado` is a **positive statement of a fact** — this is settled — as are *refundable* and *pago único*. `pausado` is the **absence** of one: a row deliberately excluded from the totals. Facts can carry a colour without being judgements; absences cannot, because any hue turns an exclusion into a verdict. So `--blue` carries the three facts, `pausado` keeps the neutral pill, and the rule is now four semantics rather than three. The old rule was not wrong about `pausado`; it was wrong to extend that to `pagado`.

**Light mode stayed, against the design.** The design ships Papel, Plano and Noche behind a `data-pal` attribute. Only Papel is built. The `data-pal` switch in a `.dc.html` is a *design-tool* affordance — the props panel, so a designer can flip variants in preview — and reading it as a product requirement would have cost a `Settings` field, a storage version bump with an `ensureShape` backfill (IND003) and a contrast pass over eight screens, in exchange for undoing the product's own argument that it commits to one look. Recorded in `DESIGN-SYSTEM.md` §2 with that price attached, so it is a decision rather than an omission.

**Two smaller things the port fixed rather than copied.**

- **Comparar was using the accent to mean "good".** The old screen gave the *best* cell in each row an accent underline, which is exactly the overlap §1 forbids. The design's answer is better and it is the one now built: the accent tints the column of the scenario **you are standing in** — that is interaction, *where you are* — and the per-cell deltas carry green/red by outcome. `FIANZA (DEVOLVIBLE)` is deliberately neutral: a bigger deposit is more cash to find and none of it is lost, so neither direction is better and colouring it either way would be a claim.
- **The `▲ 14 %` chip beside an amount had nowhere to live** in a nine-column grid. Dropping it would have lost the at-a-glance "this moved" signal, so it moved into the revision counter at the end of the row: the button shows the count and takes red or green from the direction of the **last** revision. Same signal, one column cheaper, and it is already the drawer's handle.

**Lesson.** Both reversals came out of the same question, which is worth asking of any design hand-off: *is this contradiction a mistake, or does the design know something the doc didn't?* `--blue` was the second — the doc had over-generalised from one true observation. Noche was the first — a preview affordance read as a product feature. Neither is answerable by looking at the design alone; you have to go back to the sentence in the doc and ask what it was actually protecting.

**A second lesson, and a cheaper one: `node` was on the machine the whole time.** It sits at `/home/p/.local/share/node/bin` and is not on `PATH`, so `command -v node` and a `find / -maxdepth 4` both came back empty and the whole re-skin was written under the belief that it could not be compiled. Substitutes were built instead — a script to check the i18n key graph, another for unused imports, esbuild's native binary to parse every file. They were worth having and they caught two real errors, but they cost time and they proved much less than `tsc` did in one second. **An absent tool is a claim; verify it the way you would verify a number.** One `find / -xdev -name node` would have settled it. `CLAUDE.md` now records the path.

## 2026-08-09 · The empty app claimed you could afford it · no ID
**What happened.** First launch, nothing filled in, and the verdict pill read **✓ Te lo puedes permitir** with a green `+0,00 €` balance. The sixth KPI said the colchón was `Cubierto` — against a target of zero.

**Why.** `verdict()` branched on the sign of the balance and nothing else. With no data, `inCents` and `outCents` are both `0`, so the balance is `0`, which is neither negative nor below 5 % of zero, so it fell through to `ok`. `covered` had the same shape: `savings >= target` is trivially true when the target is `0`.

**Fix.** A fourth verdict, `sindatos`, returned when nothing has been entered on either side, rendered as a neutral `--stone` pill with no hue — it is not a mild yes and not a mild no, it is the absence of an answer, and colouring it would make it one. `covered` now requires a target above zero. Two tests pin it, including one that a genuine 730-in-730-out *does* still answer (`justo`), so the guard cannot swallow a real result.

**Lesson.** The design doc already says this — *"a zero is a claim, a dash is an admission"* — but it says it about **amounts**, and the rule was implemented only there, in `hasAmount`. The same rule applies to every derived figure computed **from** missing amounts. A verdict, a coverage ratio and a buffer status are all claims too, and they all default to the confident-looking answer when their inputs are empty. Worth checking the rest of `derive.ts` against this before adding anything to it: the question is not "does this handle zero" but "can this tell zero from nothing".

## 2026-08-09 · `parseAmount` read `12,999` as twelve thousand · IND001
**What happened.** A test asserting whole cents failed: `parseAmount('12,999')` returned `1299900` (12 999 €) instead of `1300` (13,00 €).

**Why.** The separator heuristic was written once for both separators: *"a trailing group of exactly three digits is a thousands separator, unless the other separator is also present"*. That is right for a dot (`1.695` is one thousand six hundred and ninety-five) and wrong for a comma. In `es-ES` a comma is **always** the decimal separator — there is no reading of `12,999` that means twelve thousand.

**Fix.** Split the rule by separator: with both present the last one wins; a lone comma is always decimal; only a lone dot falls back to the three-digit heuristic. Test pins both readings side by side.

**Lesson.** IND001 is not only about floats. Getting the *locale* wrong produces exactly the same failure mode the invariant was written for — a plausible-looking number that is off by a factor of a thousand, entered by hand and never questioned. The invariant text says "no float arithmetic"; the real rule is "money never goes through a parser you have not tested against the locale you ship".

## 2026-08-09 · `es-ES` does not group four-digit numbers · no ID
**What happened.** Three formatting tests failed expecting `1.695,50 €`. `Intl.NumberFormat('es-ES')` returns `1695,50 €`.

**Why.** Not a bug. CLDR gives `es-ES` `minimumGroupingDigits: 2`, so the thousands separator only appears from five digits: `1695,00 €` but `10.000,00 €`. The expectation was wrong, not the formatter.

**Fix.** Corrected the tests and added one that pins the boundary explicitly, because this app renders four-figure `dinero al entrar` totals constantly and the next person to "fix" the formatting will reach for a hand-rolled separator.

**Lesson.** Reinforces the existing rule rather than adding one: format only through `Intl`. A hand-rolled `,`/`.` swap would have produced confidently wrong Spanish on the single most-read number on the Resumen screen.

## 2026-08-09 · The checker matched its own documentation · no ID
**What happened.** `check.py` reported *"could not parse DEFAULTS() — IND003 is not protecting you"* against a `storage.ts` that had a perfectly well-formed `DEFAULTS`.

**Why.** `check_ind003()` finds the declaration with `re.search(r"\bDEFAULTS\b\s*[=(:]", line)` over every line, and unlike the text checks it does not skip comments. The module's own doc comment said *"a default in `DEFAULTS()` and a backfill in `ensureShape()`"*, so both symbols matched inside prose, six lines above the real code.

**Fix.** Rewrote the doc comment to describe the two functions without naming them in call syntax. `DEFAULTS` is also written as a concise arrow body returning an object literal — `(...) => ({ ... })` — because the key-extraction walks from the first `{` at depth 0, and a `function` form puts the payload keys one brace deeper where they are invisible to it.

**Lesson.** A static check that reads its own file's prose will eventually be defeated by good prose. Worth remembering before trusting an IND003 pass: a *silent* pass could equally mean it matched a comment that happens to contain balanced braces. If IND003 ever fires spuriously again, that is the promotion trigger — teach `check_ind003` to skip comment lines rather than working around it a second time.

## 2026-08-09 · `Buffer` lost two fields to keep Entry universal · IND004
**What happened.** Not a failure — a design decision worth recording because it contradicts a type sketched in `CLAUDE.md`.

`Buffer` was specified as `{ targetCents, monthlyContributionCents, applianceFundMonthlyCents }`. Implementing it that way meant the two monthly contributions were real monthly outflows living outside `entries[]`, so `monthlyTotals()` would have needed a second code path, and the Costes totals row would have disagreed with the Resumen KPI — the exact IND007 failure mode.

**Fix.** `Buffer` keeps `targetCents` only. The reserve contribution and the appliance sinking fund are seeded as ordinary monthly `Entry` rows in `otros`, so they normalise, total, chart, drift and get revised like everything else.

**Lesson.** "Entry is the universal unit" is load-bearing, not a slogan. When a second shape wants to hold money, the question is what it costs to express it as an Entry — and here it cost nothing, while not doing so would have bought a permanent second summing path.

---

### Entry format

```markdown
## YYYY-MM-DD · short title  ·  IND004
**What happened.** The symptom, as observed.
**Why.** The actual cause, once found.
**Fix.** What was changed.
**Lesson.** What to do differently — or "none, this was just a typo".
```

Record dead ends too. An approach that was tried and abandoned is worth more than silence: without it, the next session tries it again.
