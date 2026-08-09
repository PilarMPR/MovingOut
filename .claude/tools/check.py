#!/usr/bin/env python3
"""
Independence — invariant checker.

Static checks for the failure modes listed in CLAUDE.md "## The invariants".
Stdlib only, no dependencies, no build step.

  python3 .claude/tools/check.py                text checks on changed lines only,
                                                structural checks whole-tree
  python3 .claude/tools/check.py --all          text checks over everything (nothing blocks)
  python3 .claude/tools/check.py --base main    compare against a different ref
  python3 .claude/tools/check.py --json         machine-readable output
  python3 .claude/tools/check.py --hook         PostToolUse mode (hook JSON on stdin)
  python3 .claude/tools/check.py --gate-push    PreToolUse mode, blocks a failing `git push`
  python3 .claude/tools/check.py --stop-reminder Stop mode, advisory only

Exit codes: 0 = clean or warnings only, 1 = at least one ERROR,
            2 = ERROR in a hook mode (tells Claude Code to block and self-correct).

Suppress a single finding with a comment on the line or the one above:
    // check:ignore IND004 totals are already normalised upstream

HONESTY NOTE. The invariants here are *seeded* — predicted from the shape of the
stack, not learned from bugs this repo has actually had. Several checks below are
heuristics that catch the common shape and prove nothing. An invariant that never
fires over months of real work should be deleted from CLAUDE.md rather than kept
out of politeness; one that recurs in docs/DEVLOG.md should get a stricter check.

Until src/ exists this script is deliberately inert and exits 0.
"""

import argparse
import json
import os
import re
import subprocess
import sys

# ---------------------------------------------------------------- constants

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SRC = "src"
STORAGE = "src/lib/storage.ts"
I18N_DIR = "src/i18n"
LIB_DIR = "src/lib"
COMPONENT_DIRS = ("src/components", "src/app", "src/pages")
CODE_EXT = (".ts", ".tsx", ".js", ".jsx")

SEV_ORDER = {"ERROR": 0, "WARN": 1, "INFO": 2}

# Spanish-only characters, plus words common enough in this domain that seeing
# one in a component probably means a hardcoded UI string (IND008).
#
# Case and spacing do the real disambiguating: this codebase deliberately keeps
# Spanish *code* identifiers ('salida', 'esencial', 'vivienda'), so a lowercase
# single token is an enum value, while 'Resumen' or 'Gastos del mes' is UI copy.
# Single-word UI labels in lowercase are therefore missed — an accepted blind
# spot, because the alternative flags every enum comparison in the app.
RE_SPANISH = re.compile(
    r"[áéíóúñ¿¡ÁÉÍÓÚÑ]|\b(?:alquiler|fianza|gastos|ingresos|meses|mes|ahorro|"
    r"vivienda|coste|costes|resumen|muebles|proyectos|historial|ajustes|"
    r"esencial|pendiente|pagado|activo|pausado|entrada|salida)\b",
    re.IGNORECASE,
)
RE_STRING_LIT = re.compile(r"'([^'\\\n]{2,})'|\"([^\"\\\n]{2,})\"|>([^<>{}\n]{3,})<")


class Finding:
    def __init__(self, path, line, sev, cid, msg, fix=""):
        self.path, self.line, self.sev, self.cid = path, line, sev, cid
        self.msg, self.fix = msg, fix

    def as_dict(self):
        return {"file": self.path, "line": self.line, "severity": self.sev,
                "check": self.cid, "message": self.msg, "fix": self.fix}

    def render(self):
        loc = "%s:%d" % (self.path, self.line) if self.line else "%s:—" % self.path
        out = "%-34s %-5s %-7s %s" % (loc, self.sev, self.cid, self.msg)
        if self.fix:
            out += "\n%s→ %s" % (" " * 36, self.fix)
        return out


class AllLines:
    def __contains__(self, _):
        return True


# ---------------------------------------------------------------- helpers

def git(*args):
    try:
        r = subprocess.run(["git"] + list(args), cwd=ROOT, capture_output=True, timeout=15)
    except (OSError, subprocess.SubprocessError):
        return None
    return r.stdout.decode("utf-8", "replace") if r.returncode == 0 else None


def changed_lines(base, path):
    """Line numbers (1-based, working copy) added or modified vs `base`."""
    out = git("diff", "-U0", "--no-color", base, "--", path)
    if out is None:
        return None
    added, new_ln = set(), 0
    for ln in out.splitlines():
        m = re.match(r"^@@ -\S+ \+(\d+)(?:,(\d+))? @@", ln)
        if m:
            new_ln = int(m.group(1))
            continue
        if ln.startswith(("+++", "---")):
            continue
        if ln.startswith("+"):
            added.add(new_ln)
            new_ln += 1
        elif ln.startswith(" "):
            new_ln += 1
    return added


def source_files():
    """Every code file under src/, repo-relative, sorted."""
    root = os.path.join(ROOT, SRC)
    if not os.path.isdir(root):
        return []
    out = []
    for base, dirs, files in os.walk(root):
        dirs[:] = [d for d in dirs if d not in ("node_modules", "dist", "build", ".git")]
        for f in files:
            if f.endswith(CODE_EXT):
                out.append(os.path.relpath(os.path.join(base, f), ROOT).replace(os.sep, "/"))
    return sorted(out)


def read(path):
    with open(os.path.join(ROOT, path), encoding="utf-8") as f:
        return f.read().splitlines()


def is_comment(s):
    t = s.strip()
    return t.startswith(("//", "*", "/*"))


def suppressed(lines, n, cid):
    for ln in (n, n - 1):
        if 1 <= ln <= len(lines):
            m = re.search(r"check:ignore\s+([A-Z0-9,\s]+)", lines[ln - 1])
            if m and cid[:6] in m.group(1):
                return True
    return False


def brace_block(lines, start_idx):
    """Text of the balanced {...} block starting at lines[start_idx] (0-based)."""
    depth, buf, started = 0, [], False
    for raw in lines[start_idx:]:
        buf.append(raw)
        for c in raw:
            if c == "{":
                depth += 1
                started = True
            elif c == "}":
                depth -= 1
        if started and depth <= 0:
            break
    return "\n".join(buf)


def in_dirs(path, dirs):
    return any(path.startswith(d + "/") for d in dirs)


def is_test(path):
    return ".test." in path or ".spec." in path or "/__tests__/" in path


# ---------------------------------------------------------------- text checks

def check_text(path, lines, scope, audit, F):
    """Line-oriented checks. `scope` limits which lines are reported."""
    sev = "WARN" if audit else "ERROR"
    lib = path.startswith(LIB_DIR + "/")
    comp = in_dirs(path, COMPONENT_DIRS)

    for i, raw in enumerate(lines, 1):
        if is_comment(raw):
            continue
        code = raw

        def add(cid, s, msg, fix=""):
            if i in scope and not suppressed(lines, i, cid):
                F.append(Finding(path, i, s, cid, msg, fix))

        # ---- IND001 · money is integer cents
        if re.search(r"\bparseFloat\s*\(", code):
            add("IND001", sev, "parseFloat() on money loses cents at the third addition",
                "parse to an integer count of cents: Math.round(Number(x) * 100)")
        # `x: 12.5` in an object literal, and `const x: number = 12.5` with a type annotation
        m = re.search(r"\b(\w*[Cc]ents)\b\s*(?::\s*[\w<>\[\]|\s]*)?=\s*-?\d+\.\d", code) \
            or re.search(r"\b(\w*[Cc]ents)\b\s*:\s*-?\d+\.\d", code)
        if m:
            add("IND001", sev, "`%s` assigned a decimal — cents are integers" % m.group(1))
        if re.search(r"[Cc]ents\b[^\n]*\.toFixed\s*\(", code) and "format" not in path:
            add("IND001", "WARN", "toFixed() on a cents value outside the formatting layer",
                "format only at the edges, with Intl.NumberFormat('es-ES', …)")

        # ---- IND002 · history is append-only
        if re.search(r"\.history\s*\[[^\]]*\]\s*(?:\.\w+\s*)?=(?!=)", code):
            add("IND002", sev, "assigning into an existing history entry — history is append-only",
                "push a new { date, amountCents, note } revision instead")
        if re.search(r"\.history\.(?:splice|shift|pop|reverse)\s*\(", code):
            add("IND002", sev, "mutating history in place destroys the price record",
                "the Historial view and drift both read the full series")
        if re.search(r"\.history\.sort\s*\(", code):
            add("IND002", "WARN", "sort() mutates the array in place",
                "copy first: [...e.history].sort(…)")

        # ---- IND004 · never sum mixed frequencies
        if ".reduce(" in code and re.search(r"amountCents", code) and "toMonthly" not in code:
            add("IND004", "WARN", "summing amountCents without toMonthly() — mixed frequencies",
                "bimonthly water and annual insurance are the common trap")

        # ---- IND005 · amounts stored positive
        m = re.search(r"\b(\w*amountCents)\b\s*[:=]\s*-", code)
        if m:
            add("IND005", sev, "`%s` stored negative — the sign comes from `direction`" % m.group(1),
                "store the magnitude; apply the sign once, at calculation time")
        if comp and re.search(r"direction\s*===?\s*['\"]salida['\"]", code):
            add("IND005", "WARN", "applying the direction sign in a component",
                "do it once in src/lib/ or it gets applied twice (IND007)")

        # ---- IND006 · localStorage only in storage.ts
        if "localStorage" in code and path != STORAGE:
            add("IND006", sev, "localStorage outside %s" % STORAGE,
                "one door in and out, or versioning and export stop being coherent")

        # ---- IND007 · derived figures live in src/lib/
        if comp and not is_test(path) and re.search(r"\.reduce\s*\(", code):
            add("IND007", "WARN", "aggregation inside a component",
                "move it to src/lib/ so every screen agrees on the number")

        # ---- IND008 · Spanish only in src/i18n/
        if path.endswith((".tsx", ".jsx")) and not path.startswith(I18N_DIR + "/") and not is_test(path):
            for m in RE_STRING_LIT.finditer(code):
                lit = next(g for g in m.groups() if g is not None)
                lit = lit.strip()
                if lit.startswith(("http", "/", ".", "#")) or "className" in code[:m.start()][-12:]:
                    continue
                prose = " " in lit or lit[:1].isupper()
                if prose and RE_SPANISH.search(lit):
                    add("IND008", "WARN", "Spanish literal %r outside src/i18n/" % lit[:40],
                        "move it to src/i18n/es.ts")
                    break


# ---------------------------------------------------------------- structural checks

def check_ind003(F):
    """DEFAULTS() keys must all be backfilled by ensureShape() — schema evolves on read."""
    path = STORAGE
    if not os.path.exists(os.path.join(ROOT, path)):
        F.append(Finding(path, 0, "INFO", "IND003", "not written yet — parity check idle"))
        return
    lines = read(path)
    text = "\n".join(lines)

    d_idx = next((i for i, l in enumerate(lines) if re.search(r"\bDEFAULTS\b\s*[=(:]", l)), None)
    e_idx = next((i for i, l in enumerate(lines) if re.search(r"\bensureShape\b\s*[=(:]", l)), None)

    if d_idx is None:
        F.append(Finding(path, 0, "ERROR", "IND003", "DEFAULTS() not found"))
    if e_idx is None:
        F.append(Finding(path, 0, "ERROR", "IND003",
                         "ensureShape() not found — saved data will break on load when the schema changes",
                         "schema evolves on read; every DEFAULTS key needs a backfill"))
    if d_idx is None or e_idx is None:
        return

    defaults = brace_block(lines, d_idx)
    ensure = brace_block(lines, e_idx)

    # depth-1 keys of the returned object literal
    body = defaults[defaults.find("{") + 1:]
    keys, depth, buf = [], 0, ""
    for c in body:
        if c in "{[(":
            depth += 1
        elif c in "}])":
            depth -= 1
            if depth < 0:
                break
        if depth == 0 and c == ",":
            m = re.match(r"\s*(\w+)\s*:", buf)
            if m:
                keys.append(m.group(1))
            buf = ""
        else:
            buf += c
    m = re.match(r"\s*(\w+)\s*:", buf)
    if m:
        keys.append(m.group(1))

    if not keys:
        F.append(Finding(path, d_idx + 1, "WARN", "IND003",
                         "could not parse DEFAULTS() — IND003 is not protecting you, check parity by hand"))
        return

    for k in keys:
        if not re.search(r"\b%s\b" % re.escape(k), ensure):
            F.append(Finding(path, e_idx + 1, "ERROR", "IND003",
                             "DEFAULTS defines `%s` but ensureShape never backfills it" % k,
                             "a saved payload without it will crash on load, and it will look like data loss"))

    if "version" not in text:
        F.append(Finding(path, 0, "WARN", "IND003",
                         "no schema `version` in the saved payload — migrations have nothing to key off"))


def check_ind006_global(files, F):
    """localStorage must have exactly one home."""
    homes = [p for p in files if "localStorage" in "\n".join(read(p))]
    stray = [p for p in homes if p != STORAGE]
    if stray and STORAGE not in homes:
        F.append(Finding(stray[0], 0, "WARN", "IND006",
                         "localStorage is used but %s does not own it" % STORAGE))


def check_tokens(F):
    """The palette is undecided, so raw hex outside the token block is a real cost."""
    css = [p for p in source_files() if p.endswith((".css", ".scss"))]
    for base, dirs, fs in os.walk(os.path.join(ROOT, SRC)):
        dirs[:] = [d for d in dirs if d not in ("node_modules", "dist", "build")]
        for f in fs:
            if f.endswith(".css"):
                css.append(os.path.relpath(os.path.join(base, f), ROOT).replace(os.sep, "/"))
    for p in sorted(set(css)):
        lines = read(p)
        depth = 0          # brace depth inside a :root block, so `:root{...}` on one line closes
        for i, raw in enumerate(lines, 1):
            was_root = depth > 0
            if ":root" in raw and depth == 0:
                depth = 1
                was_root = True
            if was_root:
                depth += raw.count("{") - raw.count("}")
                if ":root" in raw:
                    depth -= 1          # the opener was already counted above
                depth = max(depth, 0)
            if not was_root and re.search(r"#[0-9a-fA-F]{3,8}\b", raw) and not is_comment(raw):
                F.append(Finding(p, i, "WARN", "IND000",
                                 "raw hex outside the :root token block",
                                 "the palette is not chosen yet — keep colours swappable in one place"))


# ---------------------------------------------------------------- driver

def run(base, audit):
    F = []
    files = source_files()

    if not files:
        F.append(Finding(SRC, 0, "INFO", "IND000",
                         "src/ does not exist yet — the app is not scaffolded, so every check is idle"))
        return F

    check_ind003(F)
    check_ind006_global(files, F)
    check_tokens(F)

    for p in files:
        lines = read(p)
        ch = None if audit else changed_lines(base, p)
        scope = AllLines() if (audit or ch is None) else ch
        check_text(p, lines, scope, audit, F)

    F.append(Finding(SRC, 0, "INFO", "IND000", "%d source files scanned" % len(files)))
    F.sort(key=lambda f: (SEV_ORDER[f.sev], f.cid, f.path, f.line))
    return F


def emit(F, as_json, audit):
    if as_json:
        print(json.dumps([f.as_dict() for f in F], indent=2))
    else:
        for f in F:
            print(f.render())
        e = sum(1 for f in F if f.sev == "ERROR")
        w = sum(1 for f in F if f.sev == "WARN")
        i = sum(1 for f in F if f.sev == "INFO")
        print("\n%d ERROR · %d WARN · %d INFO%s"
              % (e, w, i, "  (audit mode: whole tree, text checks downgraded to WARN)" if audit else ""))
        if audit:
            print("IND004/IND007/IND008 are heuristics — they catch the common shape, "
                  "they are not proofs. Read the diff too.")
    return 1 if any(f.sev == "ERROR" for f in F) else 0


def hook_payload():
    try:
        return json.loads(sys.stdin.read() or "{}")
    except (ValueError, OSError):
        return {}


def main():
    p = argparse.ArgumentParser(add_help=True)
    p.add_argument("--base", default="HEAD")
    p.add_argument("--all", action="store_true", dest="audit")
    p.add_argument("--json", action="store_true")
    p.add_argument("--hook", action="store_true")
    p.add_argument("--gate-push", action="store_true")
    p.add_argument("--stop-reminder", action="store_true")
    a = p.parse_args()

    if a.stop_reminder:
        st = git("status", "--porcelain") or ""
        touched = any("/" + SRC + "/" in l or l.strip().split(" ")[-1].startswith(SRC + "/")
                      for l in st.splitlines())
        logged = "CHANGELOG.md" in st or "DEVLOG.md" in st
        if touched and not logged:
            print("src/ changed with no CHANGELOG.md / docs/DEVLOG.md entry — worth a line in each.")
        return 0

    if a.hook:
        fp = (hook_payload().get("tool_input") or {}).get("file_path", "")
        norm = fp.replace(os.sep, "/")
        if SRC + "/" not in norm or not norm.endswith(CODE_EXT + (".css",)):
            return 0
        blocking = [f for f in run(a.base, False) if f.sev == "ERROR"]
        if not blocking:
            return 0
        sys.stderr.write("Invariant check failed (.claude/tools/check.py) — fix before continuing:\n")
        for f in blocking:
            sys.stderr.write(f.render() + "\n")
        return 2

    if a.gate_push:
        cmd = (hook_payload().get("tool_input") or {}).get("command", "")
        if not re.search(r"\bgit\s+push\b", cmd):
            return 0
        blocking = [f for f in run("HEAD", False) if f.sev == "ERROR"]
        if not blocking:
            return 0
        sys.stderr.write("Blocked: the invariant check fails.\n")
        for f in blocking:
            sys.stderr.write(f.render() + "\n")
        return 2

    return emit(run(a.base, a.audit), a.json, a.audit)


if __name__ == "__main__":
    sys.exit(main())
