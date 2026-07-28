# docs/specs

Un directorio por feature, creado por el skill `/specify`:

```
docs/specs/<YYYY-MM-DD>-<slug-de-la-feature>/
├── requirements.md   # criterios de aceptacion en EARS (R1.1, R1.2, ...)
├── design.md         # arquitectura, estrategia de pruebas, decisiones (D1, ...)
└── tasks.md          # plan de implementacion + bitacora de lo que se decidio al construir
```

El slug describe la feature, no la tarea (`presupuesto-mensual`, no
`agregar-presupuestos`). Si ya existe un directorio para la misma feature se
trabaja dentro de el: un spec es un documento vivo y partirlo en dos rompe la
trazabilidad.
