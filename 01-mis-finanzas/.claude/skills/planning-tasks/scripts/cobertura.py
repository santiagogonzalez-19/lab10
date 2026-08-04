#!/usr/bin/env python3
"""Cruce mecánico entre un spec y su plan de tareas.

Por qué existe: el `planner` decide bien el tamaño de una tarea —ese es su
valor— pero la consistencia de referencias entre cuatro tablas repartidas en
tres archivos no es un juicio, es un cruce de conjuntos, y ahí un humano (o un
modelo leyendo de corrido) falla de la peor manera: el documento se ve completo.
Una fila de §5 que apunta a una tarea que se partió, o un `CP#` citado que en
`design.md` §7 no existe, se leen igual de bien que los correctos.

Qué comprueba, todo sin juicio:

  §3 ↔ §4   cada fila del inventario tiene bloque, y cada bloque tiene fila
  §8 → §5   cada criterio que el diseño cubre tiene al menos una tarea
  §5 → §4   las tareas citadas en la trazabilidad existen
  §4 ↔ §5   los criterios que una tarea cita la nombran de vuelta en §5
  §4 → §7   cada CP citado existe literalmente en el diseño
  §7 → §4   cada CP del diseño lo reclama alguna tarea
  §3        las dependencias existen y no apuntan hacia adelante
  §4        cada bloque trae Estado, plan completo, "Hecho cuando" y bitácora

Qué NO comprueba: si la tarea tiene el tamaño correcto. Un plan puede pasar
esto entero y estar mal dimensionado. Para eso está la ronda de auditoría con
un `planner` por tarea.

Uso:
  python3 cobertura.py docs/specs/2026-07-30-presupuesto-mensual/
  python3 cobertura.py <carpeta> --json

Exit 0 si no hay errores; 1 si hay alguno; 2 si no pudo leer el spec.
"""
import argparse
import json
import re
import sys
from pathlib import Path

GREEN, RED, YELLOW, DIM, BOLD, RESET = (
    "\033[32m", "\033[31m", "\033[33m", "\033[2m", "\033[1m", "\033[0m")

# Los identificadores citables del spec. S# queda afuera a propósito: en la
# plantilla de requirements.md son supuestos, no criterios, y nadie los
# implementa.
ID_RE = re.compile(r"\b(?:R\d+\.\d+|BR\d+|REG\d+|NF\d+)\b")
CP_RE = re.compile(r"\bCP\d+\b")
TASK_RE = re.compile(r"\bT\d+\b")

# Las filas que la plantilla exige dentro del bloque `Plan` de cada tarea.
FILAS_PLAN = ["Requisitos", "Casos de prueba", "Componente", "Archivos previstos",
              "Decisiones que la condicionan"]
ESTADOS = {"Pendiente", "En curso", "Hecha", "Bloqueada", "Descartada"}


def limpiar(texto):
    """Quita los comentarios HTML.

    No es cosmético: la plantilla lleva sus ejemplos dentro de `<!-- -->`, y sin
    esto el chequeo encuentra una tarea `T3` de mentira y reporta errores sobre
    un documento que está bien.
    """
    return re.sub(r"<!--.*?-->", "", texto, flags=re.DOTALL)


def secciones(texto):
    """Parte un documento por sus encabezados `## N. Título` → {N: cuerpo}."""
    out, actual, buf = {}, None, []
    for linea in texto.splitlines():
        m = re.match(r"^##\s+(\d+)\.\s", linea)
        if m:
            if actual is not None:
                out[actual] = "\n".join(buf)
            actual, buf = int(m.group(1)), []
        elif actual is not None:
            buf.append(linea)
    if actual is not None:
        out[actual] = "\n".join(buf)
    return out


def filas(cuerpo):
    """Filas de tabla markdown → lista de listas de celdas, sin cabecera."""
    out = []
    for linea in cuerpo.splitlines():
        s = linea.strip()
        if not s.startswith("|") or not s.endswith("|"):
            continue
        celdas = [c.strip() for c in s[1:-1].split("|")]
        if all(re.fullmatch(r":?-{2,}:?", c) for c in celdas):
            continue  # separador
        out.append(celdas)
    return out[1:] if out else []  # la primera es la cabecera


def bloques_tareas(cuerpo):
    """§4 → {T#: {'titulo', 'cuerpo'}} en el orden en que aparecen."""
    out, actual, buf = {}, None, []
    for linea in cuerpo.splitlines():
        m = re.match(r"^###\s+(T\d+)\s*[—–-]\s*(.*)$", linea)
        if m:
            if actual:
                out[actual[0]] = {"titulo": actual[1], "cuerpo": "\n".join(buf)}
            actual, buf = (m.group(1), m.group(2).strip()), []
        elif actual:
            buf.append(linea)
    if actual:
        out[actual[0]] = {"titulo": actual[1], "cuerpo": "\n".join(buf)}
    return out


def fila_plan(cuerpo, etiqueta):
    """El contenido de `| **Etiqueta** | … |` dentro del bloque de una tarea."""
    m = re.search(r"^\|\s*\*\*" + re.escape(etiqueta) + r"\*\*\s*\|(.*?)\|\s*$",
                  cuerpo, re.MULTILINE)
    return m.group(1).strip() if m else None


class Informe:
    def __init__(self):
        self.errores, self.avisos = [], []

    def error(self, categoria, detalle):
        self.errores.append((categoria, detalle))

    def aviso(self, categoria, detalle):
        self.avisos.append((categoria, detalle))


def analizar(carpeta, inf):
    req_p, des_p, tas_p = (carpeta / n for n in
                           ("requirements.md", "design.md", "tasks.md"))
    for p in (req_p, des_p):
        if not p.exists():
            print(f"{RED}No existe {p}{RESET} — sin diseño no hay de dónde "
                  f"derivar tareas. Esto es trabajo de /specify, no de este plan.")
            sys.exit(2)
    if not tas_p.exists():
        print(f"{YELLOW}Todavía no hay tasks.md{RESET} — estado inicial "
              f"«sin plan»: toca lanzar UN solo planner para el arranque.")
        sys.exit(1)

    req, des, tas = (limpiar(p.read_text(encoding="utf-8"))
                     for p in (req_p, des_p, tas_p))
    sec_des, sec_tas = secciones(des), secciones(tas)

    # ── Insumos del diseño ───────────────────────────────────────────────────
    cps_diseno = set()
    for f in filas(sec_des.get(7, "")):
        if f and CP_RE.fullmatch(f[0]):
            cps_diseno.add(f[0])

    crit_diseno = []
    for f in filas(sec_des.get(8, "")):
        if f and ID_RE.fullmatch(f[0]):
            crit_diseno.append(f[0])
    crit_diseno = set(crit_diseno)

    if not crit_diseno:
        inf.aviso("diseño", "design.md §8 no dejó ninguna fila de trazabilidad "
                            "legible: sin ella no se puede verificar cobertura.")

    crit_req = set()
    for linea in req.splitlines():
        m = re.match(r"^\s*\d+\.\s+\*\*(" + ID_RE.pattern + r")\*\*", linea)
        if m:
            crit_req.add(m.group(1))
    for c in sorted(crit_req - crit_diseno):
        inf.aviso("diseño", f"{c} está definido en requirements.md y design.md §8 "
                            f"no lo cubre — se arregla en el diseño, no en el plan.")

    # ── Inventario §3 ────────────────────────────────────────────────────────
    inventario, deps, orden = [], {}, {}
    for i, f in enumerate(filas(sec_tas.get(3, ""))):
        if not f or not TASK_RE.fullmatch(f[0]):
            continue
        t = f[0]
        inventario.append(t)
        orden[t] = i
        deps[t] = TASK_RE.findall(f[2]) if len(f) > 2 else []

    # ── Bloques §4 ───────────────────────────────────────────────────────────
    bloques = bloques_tareas(sec_tas.get(4, ""))

    for t in inventario:
        if t not in bloques:
            inf.error("§3 ↔ §4", f"{t} está en el inventario y no tiene bloque "
                                 f"desarrollado en §4.")
    for t in bloques:
        if t not in inventario:
            inf.error("§3 ↔ §4", f"{t} tiene bloque en §4 y no aparece en el "
                                 f"inventario de §3 — queda fuera del orden.")

    for t, ds in deps.items():
        for d in ds:
            if d == t:
                inf.error("§3", f"{t} declara depender de sí misma.")
            elif d not in orden:
                inf.error("§3", f"{t} depende de {d}, que no existe.")
            elif orden[d] > orden[t]:
                inf.aviso("§3", f"{t} depende de {d}, que va después en el "
                                f"orden: o la dependencia es falsa o el orden lo es.")

    # ── Contenido de cada bloque ─────────────────────────────────────────────
    crit_por_tarea, cps_reclamados = {}, {}
    for t, b in bloques.items():
        cuerpo = b["cuerpo"]

        m = re.search(r"\*\*Estado:\*\*\s*`([^`]+)`", cuerpo)
        if not m:
            inf.error("§4", f"{t} no declara Estado.")
        elif m.group(1) not in ESTADOS:
            inf.error("§4", f"{t} tiene un estado desconocido: `{m.group(1)}`.")
        estado = m.group(1) if m else None

        for etiqueta in FILAS_PLAN:
            if fila_plan(cuerpo, etiqueta) is None:
                inf.error("§4", f"{t} no tiene la fila «{etiqueta}» en su plan.")

        celda_req = fila_plan(cuerpo, "Requisitos") or ""
        crit_por_tarea[t] = set(ID_RE.findall(celda_req))
        if not crit_por_tarea[t] and "andamiaje" not in celda_req.lower():
            inf.error("§4", f"{t} no cita ningún criterio y no se declara "
                            f"andamiaje: o sobra, o el diseño tenía un hueco.")

        celda_cp = fila_plan(cuerpo, "Casos de prueba") or ""
        cps_reclamados[t] = set(CP_RE.findall(celda_cp))
        for cp in sorted(cps_reclamados[t] - cps_diseno):
            inf.error("§4 → §7", f"{t} cita {cp}, que no existe en design.md §7 "
                                 f"— es un caso inventado con aspecto de caso.")

        if "**Bitácora**" not in cuerpo:
            inf.error("§4", f"{t} no tiene sección Bitácora.")

        checks = re.findall(r"^\s*- \[[ xX]\]", cuerpo, re.MULTILINE)
        if not checks:
            inf.error("§4", f"{t} no tiene checks en «Hecho cuando».")
        elif estado == "Pendiente" and not 2 <= len(checks) <= 4:
            inf.aviso("§4", f"{t} tiene {len(checks)} checks en «Hecho cuando» "
                            f"(se esperan entre 2 y 4): "
                            f"{'suele ser una tarea demasiado grande' if len(checks) > 4 else 'puede no cerrar un ciclo'}.")

    for cp in sorted(cps_diseno - set().union(*cps_reclamados.values(), set())):
        inf.aviso("§7 → §4", f"{cp} está en design.md §7 y ninguna tarea lo "
                             f"reclama — es una prueba que nadie va a escribir.")

    # ── Trazabilidad §5 ──────────────────────────────────────────────────────
    traza = {}
    for f in filas(sec_tas.get(5, "")):
        if not f or not ID_RE.fullmatch(f[0]):
            continue
        ts = TASK_RE.findall(f[1]) if len(f) > 1 else []
        traza[f[0]] = ts
        if not ts:
            inf.error("§5", f"{f[0]} no tiene ninguna tarea asignada — es un "
                            f"criterio aprobado que nadie va a implementar.")
        for t in ts:
            if t not in bloques:
                inf.error("§5 → §4", f"{f[0]} apunta a {t}, que no existe.")

    for c in sorted(crit_diseno - set(traza)):
        inf.error("§8 → §5", f"{c} lo cubre design.md §8 y no aparece en la "
                             f"trazabilidad §5 del plan.")
    for c in sorted(set(traza) - crit_diseno):
        inf.aviso("§5", f"{c} está en la trazabilidad del plan y no en "
                        f"design.md §8 — revisá de dónde salió.")

    for t, cs in crit_por_tarea.items():
        for c in sorted(cs):
            if c in traza and t not in traza[c]:
                inf.aviso("§4 ↔ §5", f"{t} dice cubrir {c} y §5 no la nombra: "
                                     f"las dos tablas se están separando.")

    return {"tareas": len(bloques), "inventario": len(inventario),
            "criterios": len(crit_diseno), "casos": len(cps_diseno)}


def main():
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("carpeta", help="carpeta del spec (docs/specs/<fecha>-<slug>/)")
    ap.add_argument("--json", action="store_true", help="salida legible por máquina")
    args = ap.parse_args()

    carpeta = Path(args.carpeta)
    if not carpeta.is_dir():
        print(f"{RED}No es una carpeta: {carpeta}{RESET}")
        sys.exit(2)

    inf = Informe()
    resumen = analizar(carpeta, inf)

    if args.json:
        print(json.dumps({
            "resumen": resumen,
            "errores": [{"categoria": c, "detalle": d} for c, d in inf.errores],
            "avisos": [{"categoria": c, "detalle": d} for c, d in inf.avisos],
        }, ensure_ascii=False, indent=2))
        sys.exit(1 if inf.errores else 0)

    print(f"\n{BOLD}Cobertura del plan — {carpeta.name}{RESET}")
    print(f"{DIM}  {resumen['inventario']} filas en §3 · {resumen['tareas']} bloques "
          f"en §4 · {resumen['criterios']} criterios en el diseño · "
          f"{resumen['casos']} casos de prueba{RESET}\n")

    for etiqueta, color, items in (("ERROR", RED, inf.errores),
                                   ("aviso", YELLOW, inf.avisos)):
        for categoria, detalle in items:
            print(f"  {color}{etiqueta}{RESET}  {DIM}[{categoria}]{RESET} {detalle}")

    print()
    if inf.errores:
        print(f"  {RED}{len(inf.errores)} error(es){RESET}"
              + (f", {len(inf.avisos)} aviso(s)" if inf.avisos else "")
              + " — el plan todavía no está cerrado.\n")
        sys.exit(1)
    if inf.avisos:
        print(f"  {GREEN}Sin errores{RESET}, {YELLOW}{len(inf.avisos)} aviso(s){RESET}"
              " — revisalos antes del gate.\n")
    else:
        print(f"  {GREEN}Todo cierra.{RESET} Las referencias del plan son "
              f"consistentes con el spec.\n")
    sys.exit(0)


if __name__ == "__main__":
    main()
