#!/usr/bin/env python3
"""Chequeos mecánicos de un spec producido por el skill `specify`.

Verifica lo que se puede comprobar sin juicio humano: rutas, notación EARS,
numeración estable, cobertura de la tabla de trazabilidad, y que no se haya
escrito código. Los criterios de calidad de fondo (¿el requisito es el
correcto?) se evalúan a mano en el visor.

Uso:
    python3 check_mechanical.py <dir-raiz-del-run> [...]

Imprime un JSON por run con el resultado de cada chequeo.
"""

import json
import re
import sys
from pathlib import Path

EARS_KEYWORDS = ["THE SYSTEM SHALL", "WHEN", "IF", "THEN", "WHILE", "WHERE"]
CODE_SUFFIXES = {".ts", ".tsx", ".js", ".jsx", ".mjs", ".py", ".json"}
SPEC_DIR_RE = re.compile(r"^\d{4}-\d{2}-\d{2}-[a-z0-9]+(?:-[a-z0-9]+)*$")
VAGUE_TERMS = ["correctamente", "adecuadamente", "rápidamente", "eficientemente",
               "casos borde", "casos límite", "de forma correcta"]

# Un criterio se DECLARA al principio de una línea, opcionalmente tras marcadores
# de lista y/o negrita: "- **R1.1** — ...", "3. **CA-2**: ...", "| RF-1.1 | ...".
# Cualquier otra aparición del identificador es una REFERENCIA CRUZADA.
# La distinción importa: contar referencias como declaraciones infla el total y
# hace que la cobertura de trazabilidad salga trivialmente satisfecha.
# El prefijo se acepta libre (R, RF, CA, REQ...) para no medir el formato de una
# plantilla en particular, sino la propiedad que interesa: que el criterio sea
# citable de forma estable.
ID_BODY = r"([A-Z]{1,4})[- ]?(\d+)(?:\.(\d+))?"
_LINE_START = r"^[ \t]*(?:[-*+]|\d+[.)]|#{1,6})?[ \t]*"
# Dos formas de declarar, ambas ancladas al principio de la línea:
#   a) el identificador va en negrita  -> "- **RF-1.1** Cuando ..."
#   b) lo sigue un separador           -> "3. R1.1 — Cuando ...", "R1.1: ..."
DECLARATION_RES = [
    re.compile(_LINE_START + r"(?:\*\*|__)" + ID_BODY + r"(?:\*\*|__)", re.M),
    re.compile(_LINE_START + ID_BODY + r"[ \t]*(?=[—:–)]|-[ \t])", re.M),
]
REFERENCE_RE = re.compile(r"\b" + ID_BODY + r"\b")


def normalize_id(match: tuple) -> str:
    prefix, major, minor = match
    return f"{prefix}{major}.{minor}" if minor else f"{prefix}{major}"


def declared_criteria(text: str) -> set[str]:
    """Identificadores declarados (no meras referencias) con sub-numeración."""
    return {
        normalize_id(m)
        for rx in DECLARATION_RES
        for m in rx.findall(text)
        if m[2]
    }


def referenced_criteria(text: str) -> set[str]:
    return {normalize_id(m) for m in REFERENCE_RE.findall(text)}


PLACEHOLDER_RE = re.compile(r"<[a-záéíóúüñ][^<>\n]{1,60}>")


def leftover_placeholders(text: str) -> list[str]:
    """Marcadores `<como este>` de la plantilla que quedaron sin reemplazar.

    Antes esto era `count("<") > 40 or "<!--" in text`, que daba falso positivo
    cada vez que el autor dejaba un comentario HTML deliberado —por ejemplo para
    explicar por qué no fijó un umbral—. Se ignoran comentarios y bloques de
    código, y solo cuentan los marcadores que empiezan en minúscula, que es la
    forma que usan las plantillas.
    """
    body = re.sub(r"<!--.*?-->", "", text, flags=re.S)
    body = re.sub(r"```.*?```", "", body, flags=re.S)
    return sorted(set(PLACEHOLDER_RE.findall(body)))


def has_heading(text: str, word: str) -> bool:
    """True solo si `word` aparece en un ENCABEZADO markdown.

    Buscarla en todo el texto produce falsos positivos: un comentario de código
    que diga "Trazabilidad: ..." hacía pasar el chequeo en un documento que no
    tiene la tabla.
    """
    return bool(re.search(rf"^#+.*{word}", text, re.I | re.M))


def find_spec_dirs(root: Path) -> list[Path]:
    specs = root / "docs" / "specs"
    return sorted(p for p in specs.iterdir() if p.is_dir()) if specs.is_dir() else []


def check(root: Path) -> dict:
    spec_dirs = find_spec_dirs(root)
    spec = spec_dirs[0] if spec_dirs else None

    req = spec / "requirements.md" if spec else None
    des = spec / "design.md" if spec else None
    req_text = req.read_text() if req and req.exists() else ""
    des_text = des.read_text() if des and des.exists() else ""
    resp = root / "respuesta.md"
    resp_text = resp.read_text() if resp.exists() else ""

    # Criterios declarados en requirements vs citados en design.
    declared = declared_criteria(req_text)
    cited = referenced_criteria(des_text)

    code_files = [
        str(p.relative_to(root))
        for p in root.rglob("*")
        if p.is_file() and p.suffix in CODE_SUFFIXES and p.name != "CLAUDE.md"
    ]

    return {
        "run": str(root),
        "spec_dirs": [p.name for p in spec_dirs],
        "spec_dir_naming_ok": bool(spec) and bool(SPEC_DIR_RE.match(spec.name)),
        "requirements_exists": bool(req_text),
        "design_exists": bool(des_text),
        "requirements_lines": req_text.count("\n"),
        "design_lines": des_text.count("\n"),
        "ears_keyword_hits": {k: req_text.count(k) for k in EARS_KEYWORDS},
        "uses_ears": "THE SYSTEM SHALL" in req_text,
        "shall_count": req_text.count("THE SYSTEM SHALL"),
        "continue_to_count": req_text.count("SHALL CONTINUE TO"),
        "numbered_criteria": sorted(declared),
        "numbered_criteria_count": len(declared),
        "has_out_of_scope_section": bool(re.search(r"fuera de(?:l)? alcance", req_text, re.I)),
        "has_assumptions_section": has_heading(req_text, "supuesto"),
        "has_open_questions_section": has_heading(req_text, "pregunta"),
        # Cuando el gate impide que design.md exista todavía, estos tres campos
        # no son un resultado negativo sino inaplicables. Devolver False/lista
        # llena invitaba a leerlos como fallo del run.
        "has_traceability_section": has_heading(des_text, "trazabilidad") if des_text else None,
        "traceability_covers_all": (bool(declared) and declared.issubset(cited)) if des_text else None,
        "criteria_missing_from_design": sorted(declared - cited) if des_text else None,
        "vague_terms_in_requirements": [t for t in VAGUE_TERMS if t in req_text.lower()],
        "template_placeholders_left": leftover_placeholders(req_text),
        "respuesta_exists": bool(resp_text),
        "respuesta_question_marks": resp_text.count("?"),
        "code_files_written": code_files,
        "no_code_written": not code_files,
    }


if __name__ == "__main__":
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    print(json.dumps([check(Path(a)) for a in sys.argv[1:]], indent=2, ensure_ascii=False))
