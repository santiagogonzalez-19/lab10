#!/usr/bin/env python3
"""
Eval runner for the `brainstorming` skill.

What this script CAN do deterministically:
  1. Structural lint of SKILL.md (frontmatter, kebab-case name, required sections,
     size budget, and description scope guards).
  2. Trigger cases via a transparent keyword heuristic (fire_keyword AND NOT
     block_keyword). This is a PROXY for real triggering, not ground truth —
     actual triggering is a semantic decision the model makes.

What it CANNOT do:
  - Judge behavioral cases. Those need Claude/human judgment, so they are printed
    as a checklist to walk through by hand (e.g. ask Claude to "run the behavioral
    evals for the brainstorming skill").

Usage:
  python3 run_evals.py                 # uses ../SKILL.md and ./cases.yaml
  python3 run_evals.py --skill PATH --cases PATH

Exit code 0 if all structural + trigger checks pass, 1 otherwise.
"""
import argparse
import re
import sys
from pathlib import Path

try:
    import yaml
except ImportError:
    print("ERROR: PyYAML required. Install with: pip install pyyaml")
    sys.exit(2)

HERE = Path(__file__).resolve().parent
GREEN, RED, YELLOW, DIM, RESET = "\033[32m", "\033[31m", "\033[33m", "\033[2m", "\033[0m"


def ok(msg):   print(f"  {GREEN}PASS{RESET}  {msg}")
def fail(msg): print(f"  {RED}FAIL{RESET}  {msg}")
def warn(msg): print(f"  {YELLOW}WARN{RESET}  {msg}")


def parse_frontmatter(text):
    m = re.match(r"^---\n(.*?)\n---\n", text, re.DOTALL)
    if not m:
        return None, text
    return yaml.safe_load(m.group(1)), text[m.end():]


def structural_checks(skill_path, cases):
    print(f"\n{DIM}── Structural lint ──{RESET}")
    text = skill_path.read_text()
    fm, body = parse_frontmatter(text)
    failures = 0

    if fm is None:
        fail("no YAML frontmatter found")
        return 1
    ok("frontmatter parses")

    name = fm.get("name", "")
    if re.fullmatch(r"[a-z0-9]+(-[a-z0-9]+)*", name):
        ok(f"name is kebab-case ('{name}')")
    else:
        fail(f"name not kebab-case ('{name}')"); failures += 1

    desc = fm.get("description", "") or ""
    if desc:
        ok(f"description present ({len(desc)} chars)")
    else:
        fail("description empty"); failures += 1

    for needle in cases.get("description_must_contain", []):
        if needle.lower() in desc.lower():
            ok(f"description keeps scope guard: '{needle}'")
        else:
            fail(f"description missing scope guard: '{needle}'"); failures += 1

    line_count = text.count("\n") + 1
    if line_count <= 500:
        ok(f"SKILL.md within size budget ({line_count} lines <= 500)")
    else:
        fail(f"SKILL.md too long ({line_count} lines > 500)"); failures += 1

    if "<HARD-GATE>" in body:
        ok("HARD-GATE present")
    else:
        warn("HARD-GATE not found (skill relies on it to block implementation)")

    return failures


def trigger_checks(cases):
    print(f"\n{DIM}── Trigger cases (keyword heuristic — proxy, not ground truth) ──{RESET}")
    h = cases.get("heuristic", {})
    fire_kw = [k.lower() for k in h.get("fire_keywords", [])]
    block_kw = [k.lower() for k in h.get("block_keywords", [])]
    failures = 0

    for case in cases.get("trigger_cases", []):
        p = case["prompt"].lower()
        predicted = any(k in p for k in fire_kw) and not any(b in p for b in block_kw)
        expected = bool(case["should_fire"])
        tag = case["id"]
        note = f"  {DIM}({case['note']}){RESET}" if case.get("note") else ""
        if predicted == expected:
            ok(f"{tag} predicted={'fire' if predicted else 'no-fire'} == expected — \"{case['prompt']}\"{note}")
        else:
            fail(f"{tag} predicted={'fire' if predicted else 'no-fire'} != expected={'fire' if expected else 'no-fire'} — \"{case['prompt']}\"{note}")
            failures += 1
    return failures


def behavioral_checklist(cases):
    print(f"\n{DIM}── Behavioral cases (needs Claude/human judgment — NOT automated) ──{RESET}")
    for case in cases.get("behavioral_cases", []):
        print(f"  [ ] {case['id']}: {case['scenario']}")
        print(f"        expect: {case['expect']}")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--skill", default=str(HERE.parent / "SKILL.md"))
    ap.add_argument("--cases", default=str(HERE / "cases.yaml"))
    args = ap.parse_args()

    skill_path = Path(args.skill)
    cases_path = Path(args.cases)
    if not skill_path.exists():
        print(f"ERROR: skill not found: {skill_path}"); sys.exit(2)
    if not cases_path.exists():
        print(f"ERROR: cases not found: {cases_path}"); sys.exit(2)

    cases = yaml.safe_load(cases_path.read_text())
    print(f"Evaluating skill: {cases.get('skill', skill_path.parent.name)}")

    failures = structural_checks(skill_path, cases)
    failures += trigger_checks(cases)
    behavioral_checklist(cases)

    print()
    if failures == 0:
        print(f"{GREEN}All automated checks passed.{RESET} Now walk the behavioral checklist above.")
        sys.exit(0)
    else:
        print(f"{RED}{failures} automated check(s) failed.{RESET}")
        sys.exit(1)


if __name__ == "__main__":
    main()
