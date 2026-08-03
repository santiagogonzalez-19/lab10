#!/usr/bin/env python3
"""Lint estructural de las skills locales del proyecto.

Un solo runner para todas las skills en vez de un script por skill. La razón es
la misma que el skill de `specify` predica para los documentos: una definición,
un lugar. Dos copias de este script en dos carpetas se separan —una gana un
chequeo que la otra no tiene— y entonces ninguna de las dos dice la verdad sobre
el conjunto.

Qué chequea, todo sin juicio humano:

  1. **Frontmatter y nombre**: parsea, es kebab-case, y coincide con el nombre de
     la carpeta. Un `name:` que no coincide con su directorio es un error que no
     se nota hasta que la skill no se puede invocar.
  2. **Guardas de la descripción**: las frases que la descripción tiene que
     conservar (y las que no debe recuperar). Es el antídoto contra el scope
     creep: una descripción que vuelve a prometer lo que la skill sacó de su
     alcance dispara en los casos equivocados.
  3. **Presupuesto de tamaño**: una skill que crece sin techo deja de leerse.
  4. **Referencias internas que resuelven**: cada `assets/…`, `references/…` o
     `scripts/…` citado en el cuerpo existe en disco. Este chequeo nació de un
     caso real: `specify/SKILL.md` referenció `assets/tasks-template.md` antes de
     que la plantilla existiera, y nada lo habría atrapado.
  5. **Trigger cases** por heurística de keywords. Es un PROXY declarado, no
     verdad: el disparo real es una decisión semántica del modelo. Sirve para
     detectar que la descripción perdió una paráfrasis que decía cubrir, o que
     empezó a pisar prompts que no le tocan.

Qué NO chequea: comportamiento. Eso vive en el `evals/evals.json` de cada skill
y necesita ejecutar la skill con un agente ejecutor y un grader. Este script
reporta cuántos casos hay, para que se vea de un golpe qué está cubierto.

Uso:
  python3 lint_skill.py                 # todas las skills con evals/cases.yaml
  python3 lint_skill.py specify         # solo una
  python3 lint_skill.py --skill-dir PATH

Exit code 0 si todo pasa, 1 si algo falla.
"""
import argparse
import json
import re
import sys
from pathlib import Path

try:
    import yaml
except ImportError:
    print("ERROR: PyYAML required. Install with: pip install pyyaml")
    sys.exit(2)

HERE = Path(__file__).resolve().parent
GREEN, RED, YELLOW, DIM, BOLD, RESET = (
    "\033[32m", "\033[31m", "\033[33m", "\033[2m", "\033[1m", "\033[0m")

DEFAULT_MAX_LINES = 500
DEFAULT_MAX_DESC = 1200

# Recursos internos de una skill. Se restringe a estas carpetas a propósito:
# el cuerpo también menciona rutas de SALIDA (`requirements.md`, `docs/specs/…`,
# `CLAUDE.md`) que no son archivos de la skill y no deben existir en su carpeta.
RESOURCE_RE = re.compile(r"`((?:assets|references|scripts|agents|evals)/[A-Za-z0-9_./-]+)`")


def ok(msg):   print(f"  {GREEN}PASS{RESET}  {msg}")
def fail(msg): print(f"  {RED}FAIL{RESET}  {msg}")
def warn(msg): print(f"  {YELLOW}WARN{RESET}  {msg}")
def info(msg): print(f"  {DIM}····{RESET}  {DIM}{msg}{RESET}")


def parse_frontmatter(text):
    """Devuelve (frontmatter, cuerpo, error).

    El error se devuelve en vez de propagarse porque un linter que explota no
    lintea: la primera corrida real de este script murió con un traceback de
    PyYAML sobre una descripción sin comillas, cuando lo útil era decir "esta
    descripción no es YAML válido" y seguir con el resto de las skills.
    """
    m = re.match(r"^---\n(.*?)\n---\n", text, re.DOTALL)
    if not m:
        return None, text, "no YAML frontmatter found"
    try:
        return yaml.safe_load(m.group(1)), text[m.end():], None
    except yaml.YAMLError as e:
        detail = str(e).replace("\n", " ")
        return None, text[m.end():], f"frontmatter is not valid YAML — {detail}"


def structural_checks(skill_dir, cases):
    print(f"\n{DIM}── Structural lint ──{RESET}")
    skill_path = skill_dir / "SKILL.md"
    text = skill_path.read_text()
    fm, body, fm_error = parse_frontmatter(text)
    failures = 0

    if fm_error:
        fail(fm_error)
        info("una descripción con `: ` o `#` adentro necesita comillas; "
             "el parser del harness es más tolerante que PyYAML, pero eso no la hace válida")
        return 1
    ok("frontmatter parses")

    name = fm.get("name", "")
    if re.fullmatch(r"[a-z0-9]+(-[a-z0-9]+)*", name):
        ok(f"name is kebab-case ('{name}')")
    else:
        fail(f"name not kebab-case ('{name}')"); failures += 1

    if name == skill_dir.name:
        ok(f"name matches its directory ('{skill_dir.name}/')")
    else:
        fail(f"name '{name}' != directory '{skill_dir.name}/'"); failures += 1

    desc = fm.get("description", "") or ""
    max_desc = cases.get("max_description_chars", DEFAULT_MAX_DESC)
    if not desc:
        fail("description empty"); failures += 1
    elif len(desc) <= max_desc:
        ok(f"description present and within budget ({len(desc)} <= {max_desc} chars)")
    else:
        fail(f"description too long ({len(desc)} > {max_desc} chars)"); failures += 1

    for needle in cases.get("description_must_contain", []):
        if needle.lower() in desc.lower():
            ok(f"description keeps scope guard: '{needle}'")
        else:
            fail(f"description missing scope guard: '{needle}'"); failures += 1

    for needle in cases.get("description_must_not_contain", []):
        if needle.lower() in desc.lower():
            fail(f"description recovered out-of-scope claim: '{needle}'"); failures += 1
        else:
            ok(f"description stays out of: '{needle}'")

    line_count = text.count("\n") + 1
    max_lines = cases.get("max_lines", DEFAULT_MAX_LINES)
    if line_count <= max_lines:
        ok(f"SKILL.md within size budget ({line_count} lines <= {max_lines})")
    else:
        fail(f"SKILL.md too long ({line_count} lines > {max_lines})"); failures += 1

    for needle in cases.get("must_contain_body", []):
        if needle in body:
            ok(f"body keeps required marker: '{needle}'")
        else:
            warn(f"body missing marker: '{needle}'")

    # Referencias internas: el chequeo que atrapa una plantilla citada y ausente.
    refs = sorted(set(RESOURCE_RE.findall(body)))
    if not refs:
        info("no internal resource references found in body")
    for ref in refs:
        if (skill_dir / ref).exists():
            ok(f"reference resolves: {ref}")
        else:
            fail(f"DANGLING reference: {ref} (cited in SKILL.md, not on disk)"); failures += 1

    return failures


def trigger_checks(cases):
    tcases = cases.get("trigger_cases", [])
    if not tcases:
        return 0
    print(f"\n{DIM}── Trigger cases (keyword heuristic — proxy, not ground truth) ──{RESET}")
    h = cases.get("heuristic", {})
    fire_kw = [k.lower() for k in h.get("fire_keywords", [])]
    block_kw = [k.lower() for k in h.get("block_keywords", [])]
    failures = 0

    for case in tcases:
        p = case["prompt"].lower()
        predicted = any(k in p for k in fire_kw) and not any(b in p for b in block_kw)
        expected = bool(case["should_fire"])
        tag = case["id"]
        note = f"  {DIM}({case['note']}){RESET}" if case.get("note") else ""
        verdict = 'fire' if predicted else 'no-fire'
        if predicted == expected:
            ok(f"{tag} predicted={verdict} == expected — \"{case['prompt']}\"{note}")
        else:
            fail(f"{tag} predicted={verdict} != expected={'fire' if expected else 'no-fire'} "
                 f"— \"{case['prompt']}\"{note}")
            failures += 1
    return failures


def behavioral_checklist(skill_dir, cases):
    bcases = cases.get("behavioral_cases", [])
    evals_path = skill_dir / "evals" / "evals.json"

    print(f"\n{DIM}── Behavioral coverage ──{RESET}")
    if evals_path.is_file():
        try:
            data = json.loads(evals_path.read_text())
            names = [e.get("name", f"id={e.get('id')}") for e in data.get("evals", [])]
            total_assertions = sum(len(e.get("assertions", [])) for e in data.get("evals", []))
            ok(f"evals.json: {len(names)} executable case(s), {total_assertions} assertions")
            for n in names:
                info(n)
        except (json.JSONDecodeError, TypeError) as e:
            fail(f"evals.json does not parse: {e}")
            return 1
    else:
        warn("no evals/evals.json — behavior is unmeasured except for the checklist below")

    if bcases:
        print(f"  {DIM}manual checklist (needs several real turns — not automated):{RESET}")
        for case in bcases:
            print(f"  [ ] {case['id']}: {case['scenario']}")
            print(f"        expect: {case['expect']}")
    return 0


def discover(root: Path) -> list[Path]:
    return sorted(p for p in root.iterdir()
                  if p.is_dir() and (p / "SKILL.md").is_file()
                  and (p / "evals" / "cases.yaml").is_file())


def lint(skill_dir: Path) -> int:
    cases_path = skill_dir / "evals" / "cases.yaml"
    cases = yaml.safe_load(cases_path.read_text()) or {}
    print(f"\n{BOLD}▌ {skill_dir.name}{RESET}")
    failures = structural_checks(skill_dir, cases)
    failures += trigger_checks(cases)
    failures += behavioral_checklist(skill_dir, cases)
    return failures


def main():
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("skills", nargs="*", help="names of skills to lint (default: all)")
    ap.add_argument("--skill-dir", help="explicit path to a single skill directory")
    args = ap.parse_args()

    if args.skill_dir:
        targets = [Path(args.skill_dir).resolve()]
    elif args.skills:
        targets = [HERE / s for s in args.skills]
    else:
        targets = discover(HERE)

    missing = [t for t in targets if not (t / "SKILL.md").is_file()]
    if missing:
        for t in missing:
            print(f"ERROR: no SKILL.md in {t}")
        sys.exit(2)
    if not targets:
        print("No skills with evals/cases.yaml found.")
        sys.exit(2)

    failures = sum(lint(t) for t in targets)

    print()
    if failures == 0:
        print(f"{GREEN}All automated checks passed{RESET} for {len(targets)} skill(s). "
              f"Behavior still needs the executable evals and the manual checklist.")
        sys.exit(0)
    print(f"{RED}{failures} automated check(s) failed.{RESET}")
    sys.exit(1)


if __name__ == "__main__":
    main()
