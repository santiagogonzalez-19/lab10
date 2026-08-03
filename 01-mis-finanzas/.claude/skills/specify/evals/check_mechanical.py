#!/usr/bin/env python3
"""Chequeos mecánicos de un spec producido por el skill `specify`.

Verifica lo que se puede comprobar sin juicio humano: rutas, notación EARS,
numeración estable, cobertura de las DOS tablas de trazabilidad (criterio →
componente en `design.md`, criterio → tarea en `tasks.md`), las propiedades del
plan de tareas, y que no se haya escrito código. Los criterios de calidad de
fondo (¿el requisito es el correcto? ¿la tarea está bien cortada?) se evalúan a
mano en el visor.

Sobre `tasks.md`: los chequeos interesantes no son que el archivo exista, sino
las tres propiedades que la Fase 3 promete y que un plan plausible incumple sin
que se note — que toda tarea cite un criterio, que ningún criterio quede sin
tarea, y que las secciones que solo puede llenar la implementación (bitácoras,
§6, §7) lleguen vacías al Gate 3. Un plan con esas tres cosas mal se ve idéntico
a uno correcto si solo se mira por encima.

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

# `tasks.md` dice qué falta y en qué orden, no cuánto tarda (SKILL.md, Fase 3).
# Va como regex y no como lista de subcadenas porque " horas" y " días" aparecen
# en prosa legítima de una app de finanzas ("el acumulado de los últimos días") y
# este campo alimenta una aserción: un falso positivo acá desinforma al grader.
# Lo que delata una estimación es la unidad PEGADA A UN NÚMERO, o una etiqueta
# explícita de esfuerzo.
TIME_ESTIMATE_RE = re.compile(
    r"\b\d+[ \t]*(?:h|hs|hrs?|horas?|d|días?|dias?|jornadas?|sp|pts?|story[ \t]?points?)\b"
    r"|\b(?:estimaci[óo]n|esfuerzo|duraci[óo]n|story[ \t]?points?|man-?day|half-?day)\b[ \t]*[:=]"
    r"|~[ \t]*\d+[ \t]*(?:h|d|horas?|días?|dias?)\b",
    re.I,
)

# Una tarea "escribir los tests" separada de la que implementa rompe el ciclo TDD:
# convierte el plan en una invitación a escribir el test después.
TEST_ONLY_TASK_RE = re.compile(
    r"^#{2,4}[ \t]*T\d+[ \t]*[—:–-][ \t]*(?:escribir|agregar|crear|añadir|anadir)"
    r"[ \t]+(?:los[ \t]+|las[ \t]+)?(?:tests?|pruebas|unit tests)\b",
    re.M | re.I,
)

# Los encabezados de tarea son "### T1 — Título". El T1 de la tabla de orden (§3)
# no matchea porque ahí el identificador va en una celda, no en un encabezado.
TASK_HEADING_RE = re.compile(r"^#{2,4}[ \t]*(T\d+)\b", re.M)

# Un criterio citable desde una tarea: R#.# de requirements, más las reglas de
# negocio y los requisitos de regresión, que la plantilla numera sin subnivel.
CRITERION_REF_RE = re.compile(r"\b(?:R\d+\.\d+|BR\d+|REG\d+)\b")

# Entrada de bitácora ya escrita: "- **2026-07-28** — …". El marcador de la
# plantilla (`<YYYY-MM-DD>`) no matchea, que es justo lo que queremos: al cerrar
# la Fase 3 la bitácora tiene el marcador y ninguna entrada real.
LOGBOOK_ENTRY_RE = re.compile(r"^[ \t]*[-*][ \t]*\*\*\d{4}-\d{2}-\d{2}\*\*", re.M)

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


def declared_flat_criteria(text: str) -> set[str]:
    """Criterios declarados SIN subnumeración, restringidos a BR# y REG#.

    `declared_criteria` exige subnivel (R1.1) porque es la forma de un criterio
    de aceptación. Las reglas de negocio y los requisitos de regresión son
    criterios igual de exigibles y la plantilla los numera planos, así que
    necesitan su propia pasada — pero acotada a esos dos prefijos: aceptar
    cualquier prefijo plano metería en la lista los D# del diseño, los DV# de
    los desvíos y los T# de las tareas, que no son criterios que haya que cubrir.
    """
    return {
        normalize_id(m)
        for rx in DECLARATION_RES
        for m in rx.findall(text)
        if not m[2] and m[0] in {"BR", "REG"}
    }


def task_blocks(text: str) -> list[tuple[str, str]]:
    """Pares (id, cuerpo) por cada tarea declarada como encabezado en §4."""
    matches = list(TASK_HEADING_RE.finditer(text))
    return [
        (m.group(1), text[m.end(): matches[i + 1].start() if i + 1 < len(matches) else len(text)])
        for i, m in enumerate(matches)
    ]


def tasks_without_criteria(text: str) -> list[str]:
    """Tareas que no citan ningún criterio.

    La regla de la Fase 3 es que una tarea que no cita ningún R#.# sobra, salvo
    las de andamiaje que el diseño pida. El chequeo no puede distinguir el
    andamiaje legítimo, así que esto es una lista para mirar, no un fallo: lo que
    delata un plan inventado en vez de derivado es que sean varias.
    """
    return [tid for tid, body in task_blocks(text) if not CRITERION_REF_RE.search(body)]


def task_status_counts(text: str) -> dict:
    """Cuántas tareas hay en cada estado, por tarea declarada.

    Sirve para el escenario de re-sincronización: una tarea `Hecha` cuyo
    comportamiento cambió tiene que seguir `Hecha` —lo estuvo— y el cambio entra
    como tarea nueva. Si al re-sincronizar el conteo de `Hecha` baja, alguien
    reescribió historia.
    """
    counts: dict[str, int] = {}
    for _, body in task_blocks(text):
        m = re.search(r"\*\*Estado:?\*\*[ \t]*[`\"']?([A-Za-zÀ-ÿ ]+?)[`\"']?[ \t]*$",
                      body, re.M)
        estado = m.group(1).strip() if m else "sin estado"
        counts[estado] = counts.get(estado, 0) + 1
    return counts


def section_body(text: str, word: str) -> str:
    """Cuerpo de la sección cuyo encabezado contiene `word`, hasta el próximo `##`."""
    m = re.search(rf"^#{{2,3}}[^\n]*{word}[^\n]*$", text, re.I | re.M)
    if not m:
        return ""
    rest = text[m.end():]
    nxt = re.search(r"^#{2,3}[ \t]", rest, re.M)
    return rest[: nxt.start()] if nxt else rest


def filled_table_rows(body: str) -> list[str]:
    """Filas de datos con contenido real: sin encabezado, separador ni marcadores.

    Distinguir una fila real de una de plantilla es el punto de todo esto. Al
    cerrar la Fase 3, §6 y §7 tienen que estar vacías, y un documento que dejó
    la fila de ejemplo `| T3-D1 | T3 | <…> | <fecha> |` está vacío de hecho —
    pero un `count("|")` lo contaría como lleno. Se descartan las celdas que son
    marcadores `<así>`, guiones, o están en blanco.
    """
    rows = []
    for line in body.splitlines():
        line = line.strip()
        if not line.startswith("|") or re.fullmatch(r"\|[\s:|-]*\|", line):
            continue
        cells = [c.strip() for c in line.strip("|").split("|")]
        if any(re.fullmatch(r"#|tarea|decisión|decision|fecha|requisito|resolución|resolucion",
                            c, re.I) for c in cells):
            continue  # encabezado
        real = [c for c in cells if c and c not in {"—", "-", "–"}
                and not PLACEHOLDER_RE.fullmatch(c)]
        if real:
            rows.append(line)
    return rows


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
    tsk = spec / "tasks.md" if spec else None
    req_text = req.read_text() if req and req.exists() else ""
    des_text = des.read_text() if des and des.exists() else ""
    tsk_text = tsk.read_text() if tsk and tsk.exists() else ""
    resp = root / "respuesta.md"
    resp_text = resp.read_text() if resp.exists() else ""

    # Criterios declarados en requirements vs citados en design.
    declared = declared_criteria(req_text)
    cited = referenced_criteria(des_text)

    # La cobertura criterio → tarea se mide contra TODOS los criterios exigibles,
    # no solo los R#.#: una BR sin tarea es tan implementable-por-nadie como un
    # criterio de aceptación sin tarea.
    all_criteria = declared | declared_flat_criteria(req_text)
    cited_in_tasks = referenced_criteria(tsk_text)

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
        "tasks_exists": bool(tsk_text),
        "requirements_lines": req_text.count("\n"),
        "design_lines": des_text.count("\n"),
        "tasks_lines": tsk_text.count("\n"),
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
        # Igual que con design.md: cuando el gate corta antes, estos campos son
        # inaplicables y no un resultado negativo. En la Fase 3 son la mitad de
        # lo que hay que mirar.
        "declared_tasks": sorted(t for t, _ in task_blocks(tsk_text)) if tsk_text else None,
        "tasks_count": len(task_blocks(tsk_text)) if tsk_text else None,
        "has_task_traceability_section": has_heading(tsk_text, "trazabilidad") if tsk_text else None,
        # La Fase 3 pide que las reglas de la bitácora queden DENTRO del archivo,
        # no solo en el mensaje del gate: quien la va a llenar puede no haber
        # leído el skill.
        "has_maintenance_rules_section": has_heading(tsk_text, "mantiene") if tsk_text else None,
        "has_decisions_register_section": has_heading(tsk_text, "decisiones") if tsk_text else None,
        "has_deviations_section": has_heading(tsk_text, "desvíos") if tsk_text else None,
        "task_traceability_covers_all": (
            bool(all_criteria) and all_criteria.issubset(cited_in_tasks)
        ) if tsk_text else None,
        "criteria_missing_from_tasks": sorted(all_criteria - cited_in_tasks) if tsk_text else None,
        "tasks_citing_no_criterion": tasks_without_criteria(tsk_text) if tsk_text else None,
        # Las tres secciones que solo puede llenar la implementación. Los conteos
        # van crudos porque se leen distinto según el escenario: al cerrar la
        # Fase 3 los tres tienen que ser 0 —rellenarlos es peor que dejarlos
        # vacíos, porque una decisión conjeturada antes de tomarla parece un
        # registro—, pero al re-sincronizar un spec con trabajo ya hecho lo que
        # importa es que no BAJEN: la bitácora es append-only e histórica.
        "task_status_counts": task_status_counts(tsk_text) if tsk_text else None,
        "logbook_entries": len(LOGBOOK_ENTRY_RE.findall(tsk_text)) if tsk_text else None,
        "decisions_register_rows": (
            len(filled_table_rows(section_body(tsk_text, "decisiones")))
        ) if tsk_text else None,
        "deviations_rows": (
            len(filled_table_rows(section_body(tsk_text, "desvíos")))
        ) if tsk_text else None,
        "time_estimates_found": sorted(set(TIME_ESTIMATE_RE.findall(tsk_text))) if tsk_text else None,
        "test_only_tasks": TEST_ONLY_TASK_RE.findall(tsk_text) if tsk_text else None,
        "template_placeholders_left_in_tasks": leftover_placeholders(tsk_text) if tsk_text else None,
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
