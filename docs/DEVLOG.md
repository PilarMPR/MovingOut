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
