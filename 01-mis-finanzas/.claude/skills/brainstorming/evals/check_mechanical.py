#!/usr/bin/env python3
"""Chequeos mecánicos de un run del skill `brainstorming`.

Esta skill tiene una propiedad que se verifica sin nada de juicio y que es su
invariante más fuerte: **no escribe archivos**. Ninguno, en ningún caso. Eso la
hace más fácil de chequear que `specify` — no hay que evaluar la calidad de un
documento, solo que no exista.

Los tres fallos que este script atrapa, y por qué son mecánicos:

1. **Escribió algo.** El `<HARD-GATE>` lo prohíbe y basta con listar el árbol.
2. **Escribió el spec en el chat.** El fallo interesante del caso 3: en vez de
   invocar `specify`, redacta criterios EARS en la respuesta. Eso deja rastro
   textual —`THE SYSTEM SHALL`, identificadores `R1.1`— y no necesita criterio.
3. **Cerró sin apuntar a ningún lado.** Si la respuesta no nombra la ruta del
   spec ni pregunta nada, el handoff no ocurrió.

Lo que este script NO puede ver: si invocó el skill `specify`. Eso es una llamada
a herramienta y vive en el transcript del run, no en el sistema de archivos, así
que lo evalúa el grader leyendo la traza.

Uso:
    python3 check_mechanical.py <dir-raiz-del-run> [...]

Imprime un JSON por run con el resultado de cada chequeo.
"""

import json
import re
import sys
from pathlib import Path

# El archivo donde el ejecutor deja su respuesta conversacional. Es el único que
# se espera encontrar: no cuenta como "escribió algo".
RESPONSE_FILES = {"respuesta.md", "response.md", "outputs"}

CODE_SUFFIXES = {".ts", ".tsx", ".js", ".jsx", ".mjs", ".py"}
EARS_KEYWORDS = ["THE SYSTEM SHALL", "SHALL CONTINUE TO", "WHEN", "IF", "THEN",
                 "WHILE", "WHERE"]

# Un identificador de criterio DECLARADO en la respuesta: "- **R1.1** — …".
# Mencionar la notación al explicar qué hace specify ("va a numerarlos como R1.1")
# no es escribir el spec, así que solo cuentan las declaraciones a principio de
# línea, igual que en el chequeador de `specify`.
CRITERION_DECL_RE = re.compile(
    r"^[ \t]*(?:[-*+]|\d+[.)])?[ \t]*(?:\*\*|__)?([A-Z]{1,4}[- ]?\d+\.\d+)(?:\*\*|__)?[ \t]*[—:–)-]",
    re.M,
)

SPEC_PATH_RE = re.compile(r"docs/specs/", re.I)
DATED_SLUG_RE = re.compile(r"<?\d{4}-\d{2}-\d{2}>?-|<YYYY-MM-DD>-|<fecha>-")
GATE_RE = re.compile(r"\bgate\b|aprobaci[óo]n|aprobar", re.I)


def response_text(root: Path) -> str:
    for name in ("respuesta.md", "response.md"):
        p = root / name
        if p.is_file():
            return p.read_text()
    out = root / "outputs"
    if out.is_dir():
        return "\n".join(p.read_text(errors="ignore") for p in sorted(out.rglob("*"))
                         if p.is_file() and p.suffix in {".md", ".txt"})
    return ""


def written_files(root: Path) -> list[str]:
    """Todo lo que el run dejó en disco, salvo el archivo de respuesta.

    Se listan las rutas relativas para poder mirarlas: la señal no es solo el
    conteo, es QUÉ escribió. Un `docs/specs/.../requirements.md` y un
    `notas.md` son fallos de distinta gravedad.
    """
    out = []
    for p in sorted(root.rglob("*")):
        if not p.is_file():
            continue
        rel = p.relative_to(root)
        if rel.parts[0] in RESPONSE_FILES:
            continue
        out.append(str(rel))
    return out


def check(root: Path) -> dict:
    resp = response_text(root)
    files = written_files(root)
    ears_hits = {k: resp.count(k) for k in EARS_KEYWORDS}

    return {
        "run": str(root),
        # 1. La invariante dura: no escribió nada.
        "files_written": files,
        "wrote_nothing": not files,
        "docs_written": [f for f in files if f.startswith("docs/")],
        "code_files_written": [f for f in files if Path(f).suffix in CODE_SUFFIXES],
        # 2. No redactó el spec en la respuesta en vez de delegarlo.
        "response_exists": bool(resp),
        "response_chars": len(resp),
        "ears_keyword_hits_in_response": ears_hits,
        "wrote_ears_in_response": resp.count("THE SYSTEM SHALL") > 0,
        "criteria_declared_in_response": sorted(set(CRITERION_DECL_RE.findall(resp))),
        # 3. El handoff ocurrió: nombró el destino y preguntó.
        "mentions_spec_path": bool(SPEC_PATH_RE.search(resp)),
        "mentions_dated_slug": bool(DATED_SLUG_RE.search(resp)),
        "mentions_requirements_md": "requirements.md" in resp,
        "mentions_specify": bool(re.search(r"\bspecify\b", resp, re.I)),
        "mentions_gate": bool(GATE_RE.search(resp)),
        "question_marks": resp.count("?"),
        "asks_something": resp.count("?") >= 1,
    }


if __name__ == "__main__":
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    print(json.dumps([check(Path(a)) for a in sys.argv[1:]], indent=2, ensure_ascii=False))
