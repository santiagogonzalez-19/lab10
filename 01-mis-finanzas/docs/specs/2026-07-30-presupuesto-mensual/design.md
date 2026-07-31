# Diseño — Presupuesto mensual por categoría

| | |
|---|---|
| **Requisitos** | [requirements.md](./requirements.md) |
| **Estado** | Aprobado |
| **Última actualización** | 2026-07-31 |
| **Plan** | [tasks.md](./tasks.md) |

## 1. Resumen de la solución

Todas las reglas del presupuesto —validar límites, resolver a qué categoría pertenece un gasto, calcular el consumo y decidir el estado— viven en `src/domain/` como funciones puras de TypeScript sin una sola importación de Node. Eso es lo que permite que cada criterio de aceptación se escriba como un test antes de que exista servidor, archivo o pantalla, y es la razón de la forma general del diseño.

Alrededor de ese núcleo hay tres anillos, cada uno dependiendo solo hacia adentro. `src/storage/` define una interfaz `Repositorio` de dos métodos (leer y escribir todos los datos) con dos implementaciones: una sobre un archivo JSON y otra en memoria para los tests. `src/app/` son los casos de uso: leen los datos, llaman al dominio, y persisten si el dominio devolvió `ok`. `src/server/` expone esos casos de uso como seis rutas HTTP sobre `node:http`, y su única responsabilidad propia es traducir entre JSON/HTTP y los tipos del dominio. La UI en `web/` es un cliente de esa API con Vite y TypeScript sin framework.

El dominio no lanza excepciones para los errores previstos: devuelve `Resultado<T, ErrorDominio>`. Los 20 criterios `IF … THEN` de los requisitos son valores de un tipo cerrado, así que el compilador obliga a que el servidor los traduzca todos a un código HTTP y ninguno se olvide en silencio.

## 2. Arquitectura

| Componente | Responsabilidad | Nuevo / Existente | Ubicación |
|---|---|---|---|
| `Resultado` | Representa éxito o error sin excepciones, con un tipo de error cerrado. | Nuevo | `src/domain/resultado.ts` |
| `tipos` | Declara los tipos del dominio (`Mes`, `Categoria`, `Gasto`, `ConsumoCategoria`). | Nuevo | `src/domain/tipos.ts` |
| `mes` | Valida meses y fechas, y deriva el mes de una fecha. | Nuevo | `src/domain/mes.ts` |
| `categorias` | Normaliza nombres y valida un conjunto de categorías con sus límites. | Nuevo | `src/domain/categorias.ts` |
| `presupuesto` | Aplica las reglas de fijar los límites de un mes y de copiarlos desde otro. | Nuevo | `src/domain/presupuesto.ts` |
| `gastos` | Aplica las reglas de registrar, listar y quitar un gasto. | Nuevo | `src/domain/gastos.ts` |
| `consumo` | Calcula gastado, restante, exceso, porcentaje y estado de cada categoría. | Nuevo | `src/domain/consumo.ts` |
| `Repositorio` | Declara el contrato de lectura y escritura de los datos completos. | Nuevo | `src/storage/repositorio.ts` |
| `RepositorioArchivo` | Persiste los datos en un archivo JSON, de forma atómica. | Nuevo | `src/storage/repositorio-archivo.ts` |
| `RepositorioMemoria` | Guarda los datos en memoria para los tests. | Nuevo | `src/storage/repositorio-memoria.ts` |
| `casos-uso` | Orquesta leer → aplicar dominio → escribir, para cada operación del usuario. | Nuevo | `src/app/casos-uso.ts` |
| `servidor` | Enruta las peticiones HTTP hacia los casos de uso. | Nuevo | `src/server/servidor.ts` |
| `errores-http` | Traduce cada código de error del dominio a un estado HTTP y un cuerpo. | Nuevo | `src/server/errores-http.ts` |
| `main` (bin) | Carga el archivo de datos y levanta el servidor. | Nuevo | `src/main.ts` |
| `api` (web) | Llama a la API y devuelve datos tipados o el error. | Nuevo | `web/src/api.ts` |
| `vista` (web) | Dibuja el mes: categorías con su barra, formulario y lista de gastos. | Nuevo | `web/src/vista.ts` |
| `main` (web) | Conecta los eventos de la pantalla con la API y la vista. | Nuevo | `web/src/main.ts` |

```
web/  ──HTTP──▶  src/server/  ──▶  src/app/  ──▶  src/domain/   (TS puro, sin node:*)
                                       │
                                       ▼
                                 src/storage/  ──▶  datos/finanzas.json
```

Ninguna flecha apunta hacia afuera: `src/domain/` no conoce el repositorio, y `src/storage/` no conoce los casos de uso.

## 3. Flujo de datos

**Flujo A: registrar un gasto que excede el límite** *(cubre R3.1, R3.2, R3.4, R4.1)*

1. La UI envía `POST /api/gastos` con monto, fecha, categoría y descripción.
2. `servidor` parsea el cuerpo y llama a `casosUso.registrarGasto`.
3. El caso de uso lee los datos del repositorio.
4. `mes.validarFecha` valida la fecha; `mes.mesDe` deriva el mes — **la fecha decide el mes, no lo que el usuario esté mirando** (R3.2).
5. `gastos.registrarGasto` busca la categoría entre las del mes derivado comparando por nombre normalizado, valida el monto, y devuelve el gasto con el `id` que el caso de uso le inyectó y con el **nombre canónico** de la categoría del presupuesto.
6. El caso de uso agrega el gasto a los datos y los escribe.
7. `consumo.consumoDeCategoria` calcula el estado de esa categoría con el gasto ya incluido: `gastado > limite`, así que `estado: "excedido"` y `excedido: 100000`.
8. El servidor responde `201` con el gasto y el consumo de su categoría. La UI muestra el aviso con el monto excedido.

**Flujo B: ajustar los límites quitando una categoría que tiene gastos** *(cubre R1.8, camino de error)*

1. La UI envía `PUT /api/presupuestos/2026-07` con la lista de categorías sin "Ocio".
2. El caso de uso lee los datos y filtra los gastos de `2026-07`.
3. `presupuesto.fijarLimites` valida el conjunto recibido y, antes de aplicar nada, compara contra las categorías actuales: "Ocio" desaparece y tiene 3 gastos.
4. Devuelve `{ ok: false, error: { codigo: "CATEGORIA_CON_GASTOS", detalle: { categoria: "Ocio", gastos: 3 } } }`.
5. El caso de uso **no escribe nada**: el archivo queda exactamente como estaba.
6. `errores-http` traduce a `409` con el nombre y el conteo. La UI le dice al usuario que primero borre o reasigne esos 3 gastos.

**Flujo C: consultar un mes sin presupuesto** *(cubre R5.7)*

1. `GET /api/presupuestos/2026-09`.
2. El caso de uso valida el mes, lee los datos y no encuentra entrada para `2026-09`.
3. `consumo.consumo([], [])` devuelve `[]`.
4. Respuesta `200` con `{ mes: "2026-09", categorias: [] }`. **No es un error**: un mes sin presupuesto es un estado válido, y la UI lo usa para ofrecer copiar el mes anterior.

**Flujo D: arranque con el archivo de datos ilegible** *(cubre NF3)*

1. `src/main.ts` llama a `repositorio.leer()` antes de escuchar en el puerto.
2. `RepositorioArchivo` lee el archivo y `JSON.parse` falla (o la `version` es desconocida).
3. Lanza una excepción con la ruta del archivo y el motivo. **No escribe nada.**
4. El proceso termina con código distinto de cero. Los datos quedan intactos para que el usuario los pueda recuperar a mano.

## 4. Interfaces

```ts
// src/domain/resultado.ts
export type CodigoError =
  | "MES_INVALIDO" | "FECHA_INVALIDA"
  | "LIMITE_NEGATIVO" | "LIMITE_NO_ENTERO" | "NOMBRE_VACIO" | "NOMBRE_DUPLICADO"
  | "CATEGORIA_CON_GASTOS" | "DESTINO_NO_VACIO" | "ORIGEN_SIN_PRESUPUESTO" | "MESES_IGUALES"
  | "CATEGORIA_SIN_PRESUPUESTO" | "MONTO_NO_POSITIVO" | "MONTO_NO_ENTERO"
  | "GASTO_NO_EXISTE";

export type ErrorDominio = {
  codigo: CodigoError;
  mensaje: string;                          // en español, mostrable al usuario
  detalle?: Record<string, string | number>; // p.ej. { categoria: "Ocio", gastos: 3 }
};

export type Resultado<T> = { ok: true; valor: T } | { ok: false; error: ErrorDominio };

// src/domain/mes.ts
export function validarMes(valor: string): Resultado<Mes>;
export function validarFecha(valor: string): Resultado<Fecha>;
export function mesDe(fecha: Fecha): Mes;

// src/domain/categorias.ts
export function normalizar(nombre: string): string;
export function validarCategorias(entrada: Categoria[]): Resultado<Categoria[]>;
export function buscarCategoria(categorias: Categoria[], nombre: string): Categoria | undefined;

// src/domain/presupuesto.ts
export function fijarLimites(
  actuales: Categoria[], nuevas: Categoria[], gastosDelMes: Gasto[],
): Resultado<Categoria[]>;

export function copiarLimites(
  origen: { mes: Mes; categorias: Categoria[] },
  destino: { mes: Mes; categorias: Categoria[] },
): Resultado<Categoria[]>;

// src/domain/gastos.ts
export function registrarGasto(
  entrada: EntradaGasto, categoriasDelMes: Categoria[], id: string,
): Resultado<Gasto>;
export function gastosDeMes(gastos: Gasto[], mes: Mes): Gasto[];   // fecha descendente
export function quitarGasto(gastos: Gasto[], id: string): Resultado<Gasto[]>;

// src/domain/consumo.ts
export const UMBRAL_ALERTA = 80;
export function consumoDeCategoria(
  categoria: Categoria, gastosDelMes: Gasto[], umbralAlerta?: number,
): ConsumoCategoria;
export function consumo(
  categorias: Categoria[], gastosDelMes: Gasto[], umbralAlerta?: number,
): ConsumoCategoria[];

// src/storage/repositorio.ts
export interface Repositorio {
  leer(): Promise<Datos>;
  escribir(datos: Datos): Promise<void>;
}

// src/app/casos-uso.ts
export type CasosUso = {
  verMes(mes: string): Promise<Resultado<VistaMes>>;
  fijarLimites(mes: string, categorias: Categoria[]): Promise<Resultado<Categoria[]>>;
  copiarLimites(destino: string, origen: string): Promise<Resultado<Categoria[]>>;
  registrarGasto(entrada: EntradaGasto): Promise<Resultado<GastoRegistrado>>;
  listarGastos(mes: string): Promise<Resultado<Gasto[]>>;
  borrarGasto(id: string): Promise<Resultado<null>>;
};
export function crearCasosUso(repo: Repositorio, generarId: () => string): CasosUso;

// src/server/servidor.ts
export function crearServidor(casos: CasosUso): import("node:http").Server;
```

## 5. Modelos de datos

```ts
// src/domain/tipos.ts
export type Mes = string;    // "YYYY-MM", validado por validarMes
export type Fecha = string;  // "YYYY-MM-DD", validado por validarFecha

export type Categoria = {
  nombre: string;   // tal como lo escribió el usuario; se compara normalizado
  limite: number;   // entero >= 0, pesos colombianos sin decimales
};

export type Gasto = {
  id: string;
  mes: Mes;           // derivado de fecha al registrar; nunca se recalcula
  categoria: string;  // nombre canónico de la categoría del presupuesto de ese mes
  monto: number;      // entero > 0
  fecha: Fecha;
  descripcion: string; // "" si el usuario no la escribió
};

export type EntradaGasto = {
  categoria: string; monto: number; fecha: string; descripcion?: string;
};

export type EstadoCategoria = "ok" | "alerta" | "excedido";

export type ConsumoCategoria = {
  categoria: string;
  limite: number;
  gastado: number;     // entero: suma de los montos del mes
  restante: number;    // limite - gastado; negativo si hay exceso
  excedido: number;    // max(0, gastado - limite); 0 si no hay exceso
  porcentaje: number;  // 0..∞, redondeado a un decimal; solo presentación
  estado: EstadoCategoria;
};

export type GastoRegistrado = { gasto: Gasto; consumo: ConsumoCategoria };
export type VistaMes = { mes: Mes; categorias: ConsumoCategoria[] };
```

**Persistencia** — un solo archivo, `datos/finanzas.json`:

```ts
// src/storage/repositorio.ts
export type Datos = {
  version: 1;
  presupuestos: Record<Mes, Categoria[]>;  // la clave es el mes; el array conserva el orden de definición
  gastos: Gasto[];
};
```

**El cálculo, escrito una sola vez** (vive en `consumo.ts`; el resto del documento lo referencia):

```
gastado    = suma de los montos de los gastos del mes imputados a la categoría
restante   = limite - gastado
excedido   = max(0, gastado - limite)
porcentaje = limite === 0 ? (gastado > 0 ? 100 : 0) : redondear1(gastado / limite * 100)
estado     = gastado > limite            → "excedido"
             gastado / limite >= 0,80    → "alerta"     (con limite > 0)
             en otro caso                → "ok"
```

El umbral se evalúa sobre el cociente **sin redondear**, para que un consumo del 79,96 % no se convierta en `alerta` por efecto del redondeo del campo `porcentaje` (R4.4).

**Restricciones**

- `presupuestos` es un mapa por mes: hace imposible tener dos presupuestos del mismo mes, e implementa el aislamiento entre meses de **BR7**.
- Dentro de un mes, `validarCategorias` rechaza dos nombres con el mismo **nombre normalizado** — implementa **BR2**.
- Un gasto se almacena solo si su categoría existe en el presupuesto de su mes — implementa **BR4**.
- `limite` entero `>= 0` (**BR1**), `monto` entero `> 0` (**BR5**): validados en el dominio, no en la capa HTTP, para que la regla valga por cualquier camino.
- El `id` del gasto se genera **fuera** del dominio (`crypto.randomUUID` en producción, un contador en los tests) y se pasa como argumento: mantiene el dominio puro y determinista (**NF4**).

## 6. Manejo de errores

| Caso | Representación | Qué ve el usuario | HTTP | Requisito |
|---|---|---|---|---|
| Mes con formato inválido | `MES_INVALIDO` | "El mes debe tener la forma AAAA-MM (ej. 2026-07)." | 400 | R1.10, R5.9 |
| Fecha inexistente o mal formada | `FECHA_INVALIDA` | "La fecha debe tener la forma AAAA-MM-DD y existir en el calendario." | 400 | R3.7 |
| Límite negativo | `LIMITE_NEGATIVO` | "Los límites no pueden ser negativos." | 400 | R1.4 |
| Límite con decimales | `LIMITE_NO_ENTERO` | "Los límites deben ser enteros, sin decimales." | 400 | R1.5 |
| Nombre de categoría vacío | `NOMBRE_VACIO` | "El nombre de la categoría es obligatorio." | 400 | R1.6 |
| Dos categorías con el mismo nombre | `NOMBRE_DUPLICADO` | "La categoría «Comida» está repetida." | 400 | R1.7 |
| Se quita una categoría con gastos | `CATEGORIA_CON_GASTOS` | "«Ocio» tiene 3 gastos en este mes; bórralos antes de quitar la categoría." | 409 | R1.8 |
| Copiar hacia un mes que ya tiene límites | `DESTINO_NO_VACIO` | "2026-08 ya tiene límites definidos." | 409 | R2.3 |
| Copiar desde un mes sin presupuesto | `ORIGEN_SIN_PRESUPUESTO` | "2026-06 no tiene presupuesto que copiar." | 409 | R2.4 |
| Copiar de un mes a sí mismo | `MESES_IGUALES` | "El mes de origen y el de destino deben ser distintos." | 400 | R2.5 |
| Gasto en categoría sin límite ese mes | `CATEGORIA_SIN_PRESUPUESTO` | "«Ocio» no tiene presupuesto en 2026-06. Defínelo primero." | 400 | R3.3 |
| Monto cero o negativo | `MONTO_NO_POSITIVO` | "El monto debe ser mayor que cero." | 400 | R3.5 |
| Monto con decimales | `MONTO_NO_ENTERO` | "El monto debe ser un entero, sin decimales." | 400 | R3.6 |
| Gasto a borrar inexistente | `GASTO_NO_EXISTE` | "Ese gasto ya no existe." | 404 | R6.5 |
| Cuerpo JSON ilegible | — (capa HTTP) | "No se pudo leer la petición." | 400 | diseño |
| Ruta desconocida | — (capa HTTP) | "Recurso no encontrado." | 404 | diseño |
| Archivo de datos ilegible al arrancar | excepción al cargar | El proceso no arranca e informa la ruta y el motivo | — | NF3 |

**La regla que reparte 400 y 409** (D5): `400` cuando el usuario puede corregir la petición cambiando lo que envió; `409` cuando el conflicto es con los datos ya almacenados y la petición en sí es válida. Por eso "categoría sin presupuesto" es `400` (elige otra categoría o crea el límite) y "categoría con gastos" es `409` (hay que cambiar el estado, no la petición).

**Ningún error deja escritura parcial:** el caso de uso persiste únicamente cuando el dominio devuelve `ok`, y el dominio valida el conjunto completo antes de producir un resultado. Un `PUT` con diez categorías donde la séptima tiene el límite negativo no aplica las seis primeras.

## 7. Estrategia de pruebas unitarias

Vitest, con `npm test`. Cada caso tiene un identificador citable (`CP#`) porque la tabla de trazabilidad y las tareas los referencian por número.

**Dominio — meses y fechas** (`src/domain/mes.test.ts`)

| # | Caso de prueba | Resultado esperado | Requisito |
|---|---|---|---|
| CP1 | Mes `"2026-07"` | Válido | R1.10, R5.9 |
| CP2 | Mes `"2026-13"` y `"2026-00"` | `MES_INVALIDO` | R1.10, R5.9 |
| CP3 | Mes `"2026-7"`, `"julio"`, `""` | `MES_INVALIDO` | R1.10, R5.9 |
| CP4 | Fecha `"2026-06-28"` | Mes derivado `"2026-06"` | R3.2, BR3 |
| CP5 | Fecha `"2026-02-30"` | `FECHA_INVALIDA` (no existe en el calendario) | R3.7 |
| CP6 | Fecha `"28/06/2026"` y `"2026-6-8"` | `FECHA_INVALIDA` | R3.7 |

**Dominio — categorías y normalización** (`src/domain/categorias.test.ts`)

| # | Caso de prueba | Resultado esperado | Requisito |
|---|---|---|---|
| CP7 | `" comida "` y `"Comida"` | Mismo nombre normalizado | S1, R3.4 |
| CP8 | Conjunto con `"Comida"` y `" comida "` | `NOMBRE_DUPLICADO` con el nombre en el detalle | R1.7, BR2 |
| CP9 | Límite `-1` | `LIMITE_NEGATIVO` | R1.4, BR1 |
| CP10 | Límite `1000.5` | `LIMITE_NO_ENTERO` | R1.5, NF1 |
| CP11 | Límite `0` | Aceptado | R1.3, BR1 |
| CP12 | Nombre `"   "` | `NOMBRE_VACIO` | R1.6 |

**Dominio — fijar límites** (`src/domain/presupuesto.test.ts`)

| # | Caso de prueba | Resultado esperado | Requisito |
|---|---|---|---|
| CP13 | Fijar 3 categorías en un mes sin presupuesto | Se devuelven las 3 en el orden recibido | R1.1, R5.8 |
| CP14 | Fijar límites en un mes que ya tiene otras categorías | El conjunto queda reemplazado por el recibido | R1.2 |
| CP15 | Fijar los límites de `2026-07` teniendo también `2026-06` | `2026-06` queda intacto | R1.2, BR7 |
| CP16 | Quitar `"Ocio"`, que tiene 2 gastos en el mes | `CATEGORIA_CON_GASTOS` con `{ categoria: "Ocio", gastos: 2 }` | R1.8, BR4 |
| CP17 | Quitar `"Ocio"`, sin gastos en el mes | Se elimina del presupuesto | R1.9 |
| CP18 | Fijar lista vacía en un mes sin gastos | El mes queda sin presupuesto | R1.11 |
| CP19 | Lista de 3 donde la 3.ª tiene límite negativo | Error, y las 2 primeras **no** se aplican | R1.4 |

**Dominio — copiar límites** (`src/domain/presupuesto.test.ts`)

| # | Caso de prueba | Resultado esperado | Requisito |
|---|---|---|---|
| CP20 | Copiar de un mes con 3 categorías a un mes vacío | Las mismas 3 con los mismos límites | R2.1 |
| CP21 | El mes origen tiene gastos | El destino queda con categorías y **sin** gastos | R2.2 |
| CP22 | El destino ya tiene 1 categoría | `DESTINO_NO_VACIO` | R2.3 |
| CP23 | El origen no tiene categorías | `ORIGEN_SIN_PRESUPUESTO` | R2.4 |
| CP24 | Origen y destino son el mismo mes | `MESES_IGUALES` | R2.5 |
| CP25 | Tras copiar, se comparan las categorías del origen | Idénticas a antes de copiar | R2.6, BR7 |

**Dominio — gastos** (`src/domain/gastos.test.ts`)

| # | Caso de prueba | Resultado esperado | Requisito |
|---|---|---|---|
| CP26 | Gasto válido con id inyectado `"g1"` | Se devuelve el gasto con `id: "g1"` y todos sus campos | R3.1 |
| CP27 | Gasto con fecha `"2026-06-28"` estando el presupuesto de junio definido | `mes: "2026-06"`, no el mes que se esté mirando | R3.2, BR3 |
| CP28 | Gasto en `"Ocio"` cuando junio no tiene esa categoría | `CATEGORIA_SIN_PRESUPUESTO` | R3.3, BR4 |
| CP29 | Gasto con categoría `" comida "` y presupuesto con `"Comida"` | Se imputa y se almacena con el nombre canónico `"Comida"` | R3.4, S1 |
| CP30 | Monto `0` y monto `-5000` | `MONTO_NO_POSITIVO` | R3.5, BR5 |
| CP31 | Monto `25000.5` | `MONTO_NO_ENTERO` | R3.6, NF1 |
| CP32 | Gasto sin campo `descripcion` | Se almacena con `descripcion: ""` | R3.8, S7 |
| CP33 | Dos gastos con monto, fecha, categoría y descripción idénticos | Dos registros, con ids distintos | R3.9 |
| CP46 | Listar los gastos de un mes con gastos de dos meses cargados | Solo los del mes pedido, con todos sus campos | R6.1 |
| CP47 | Listar 3 gastos, dos de ellos con la misma fecha | Fecha descendente; a igual fecha, el registrado más tarde primero | R6.2 |
| CP48 | Listar un mes sin gastos | Lista vacía, sin error | R6.3 |
| CP50 | Quitar un id que no existe | `GASTO_NO_EXISTE` | R6.5 |
| CP51 | Quitar 1 de 3 gastos | Quedan los otros 2, sin tocar el presupuesto | R6.6 |

**Dominio — consumo** (`src/domain/consumo.test.ts`)

| # | Caso de prueba | Resultado esperado | Requisito |
|---|---|---|---|
| CP34 | Límite 500 000, dos gastos de 100 000 y 50 000 | `gastado 150000`, `restante 350000`, `porcentaje 30`, `excedido 0`, `estado "ok"` | R5.1 |
| CP35 | Gastos de la misma categoría en junio y julio | El gastado de julio suma solo los de julio | R5.2, BR6, BR7 |
| CP36 | Categoría con límite 500 000 y ningún gasto | `gastado 0`, `restante 500000`, `porcentaje 0`, `estado "ok"` | R5.3 |
| CP37 | Límite 500 000, gastado 600 000 | `restante -100000`, `excedido 100000`, `estado "excedido"` | R4.1, R5.4 |
| CP38 | Límite 500 000, gastado exactamente 500 000 | `excedido 0`, `porcentaje 100`, `estado "alerta"` | R4.2 |
| CP39 | Límite 500 000, gastado 400 000 (80 % exacto) | `estado "alerta"` | R4.3 |
| CP40 | Límite 500 000, gastado 399 800 (79,96 %) | `estado "ok"`, `porcentaje 80` — el umbral se evalúa sin redondear | R4.4 |
| CP41 | Límite 0, gastado 30 000 | `porcentaje 100`, `excedido 30000`, `estado "excedido"` | R4.5, R5.5 |
| CP42 | Límite 0, gastado 0 | `porcentaje 0`, `excedido 0`, `estado "ok"` | R5.6 |
| CP43 | Mes sin categorías | Lista vacía de consumos, sin error | R5.7 |
| CP44 | Tres categorías definidas en orden C, A, B | Se devuelven en orden C, A, B | R5.8 |
| CP70 | Suma de montos enteros grandes (10 gastos de 999 999) | El gastado es entero exacto, sin decimales | NF1 |

**Casos de uso** (`src/app/casos-uso.test.ts`, con `RepositorioMemoria`)

| # | Caso de prueba | Resultado esperado | Requisito |
|---|---|---|---|
| CP45 | Registrar un gasto en `"Comida"` con `"Ocio"` también excedida | La respuesta trae el consumo **solo** de `"Comida"` | R4.6 |
| CP49 | Borrar un gasto y volver a pedir el consumo del mes | El gastado de su categoría baja en el monto del gasto | R6.4 |
| CP52 | Cualquier operación que falle en el dominio | El repositorio no recibe ninguna escritura | R1.4, R1.8, R2.3, R3.3 |

**Storage** (`src/storage/repositorio-archivo.test.ts`, en un directorio temporal)

| # | Caso de prueba | Resultado esperado | Requisito |
|---|---|---|---|
| CP53 | Leer cuando el archivo no existe | Datos vacíos (`presupuestos: {}`, `gastos: []`), sin error | NF3 |
| CP54 | Escribir y volver a leer | Los datos leídos son iguales a los escritos | NF2 |
| CP55 | Leer un archivo con JSON inválido | Lanza informando la ruta, y el archivo queda byte a byte igual | NF3 |
| CP56 | Leer un archivo con `version` desconocida | Lanza sin sobrescribir | NF3 |
| CP57 | Tras un guardado exitoso, listar el directorio | Queda solo `finanzas.json`, sin archivo temporal | NF2 |
| CP58 | La misma batería de casos contra `RepositorioMemoria` y `RepositorioArchivo` | Ambos cumplen idéntico contrato | NF4 |

**API** (`src/server/servidor.test.ts`, servidor real en puerto efímero con `RepositorioMemoria`)

| # | Caso de prueba | Resultado esperado | Requisito |
|---|---|---|---|
| CP59 | `PUT /api/presupuestos/2026-07` con 2 categorías | `200` con las categorías guardadas | R1.1 |
| CP60 | `PUT` con un límite negativo | `400` con el mensaje del motivo | R1.4 |
| CP61 | `PUT` que quita una categoría con gastos | `409` con el nombre y el conteo | R1.8 |
| CP62 | `POST /api/presupuestos/2026-08/copiar-de/2026-07` con destino vacío | `200` con las categorías copiadas | R2.1 |
| CP63 | El mismo `POST` con el destino ya poblado | `409` | R2.3 |
| CP64 | `POST /api/gastos` que excede el límite | `201` con el gasto y `estado "excedido"` con el monto excedido | R4.1 |
| CP65 | `POST /api/gastos` en categoría sin presupuesto en el mes de la fecha | `400` | R3.3 |
| CP66 | `GET /api/presupuestos/2026-07` | `200` con límite, gastado, restante, porcentaje y estado por categoría | R5.1 |
| CP67 | `GET /api/presupuestos/2026-13` | `400` | R5.9 |
| CP68 | `GET /api/gastos?mes=2026-07` | `200` con los gastos del mes en orden descendente | R6.1, R6.2 |
| CP69 | `DELETE /api/gastos/{id}` existente, y luego `GET` del mes | `204`, y el consumo ya no cuenta ese gasto | R6.4 |
| CP71 | `DELETE /api/gastos/no-existe` | `404` | R6.5 |
| CP72 | `GET /api/inventado` | `404` | diseño |
| CP73 | `POST /api/gastos` con cuerpo no-JSON | `400`, sin caerse el servidor | diseño |

**Prueba estructural**

| # | Caso de prueba | Resultado esperado | Requisito |
|---|---|---|---|
| CP74 | Leer los archivos de `src/domain/` y buscar importaciones | Ninguno importa `node:*`, `src/storage/`, `src/app/` ni `src/server/` | NF4 |

**Fuera del alcance de pruebas unitarias:** la UI de `web/` no lleva pruebas automatizadas en esta versión. Probarla exigiría jsdom o un navegador headless, y la decisión (D6) fue no agregar esas dependencias todavía. Es el hueco de cobertura conocido: la lógica de presentación —formatear pesos, pintar la barra, mostrar el aviso— se verifica a mano. La contrapartida es que `web/` no contiene ninguna regla de negocio: todo lo que decide un número o un estado está en `src/domain/`, cubierto por CP1–CP74.

## 8. Trazabilidad

| Requisito | Componente(s) | Caso de prueba |
|---|---|---|
| R1.1 | `presupuesto.fijarLimites`, `casos-uso.fijarLimites` | CP13, CP59 |
| R1.2 | `presupuesto.fijarLimites` | CP14, CP15 |
| R1.3 | `categorias.validarCategorias` | CP11 |
| R1.4 | `categorias.validarCategorias` | CP9, CP19, CP52, CP60 |
| R1.5 | `categorias.validarCategorias` | CP10 |
| R1.6 | `categorias.validarCategorias` | CP12 |
| R1.7 | `categorias.validarCategorias` | CP8 |
| R1.8 | `presupuesto.fijarLimites` | CP16, CP52, CP61 |
| R1.9 | `presupuesto.fijarLimites` | CP17 |
| R1.10 | `mes.validarMes` | CP1, CP2, CP3 |
| R1.11 | `presupuesto.fijarLimites` | CP18 |
| R2.1 | `presupuesto.copiarLimites` | CP20, CP62 |
| R2.2 | `presupuesto.copiarLimites` | CP21 |
| R2.3 | `presupuesto.copiarLimites` | CP22, CP52, CP63 |
| R2.4 | `presupuesto.copiarLimites` | CP23 |
| R2.5 | `presupuesto.copiarLimites` | CP24 |
| R2.6 | `presupuesto.copiarLimites` | CP25 |
| R3.1 | `gastos.registrarGasto` | CP26 |
| R3.2 | `mes.mesDe`, `gastos.registrarGasto` | CP4, CP27 |
| R3.3 | `gastos.registrarGasto` | CP28, CP52, CP65 |
| R3.4 | `categorias.buscarCategoria`, `gastos.registrarGasto` | CP7, CP29 |
| R3.5 | `gastos.registrarGasto` | CP30 |
| R3.6 | `gastos.registrarGasto` | CP31 |
| R3.7 | `mes.validarFecha` | CP5, CP6 |
| R3.8 | `gastos.registrarGasto` | CP32 |
| R3.9 | `gastos.registrarGasto`, `casos-uso` (generarId) | CP33 |
| R4.1 | `consumo.consumoDeCategoria` | CP37, CP64 |
| R4.2 | `consumo.consumoDeCategoria` | CP38 |
| R4.3 | `consumo.consumoDeCategoria` | CP39 |
| R4.4 | `consumo.consumoDeCategoria` | CP40 |
| R4.5 | `consumo.consumoDeCategoria` | CP41 |
| R4.6 | `casos-uso.registrarGasto` | CP45 |
| R5.1 | `consumo.consumo`, `casos-uso.verMes` | CP34, CP66 |
| R5.2 | `consumo.consumo` | CP35 |
| R5.3 | `consumo.consumoDeCategoria` | CP36 |
| R5.4 | `consumo.consumoDeCategoria` | CP37 |
| R5.5 | `consumo.consumoDeCategoria` | CP41 |
| R5.6 | `consumo.consumoDeCategoria` | CP42 |
| R5.7 | `casos-uso.verMes`, `consumo.consumo` | CP43 |
| R5.8 | `Datos.presupuestos` (array ordenado), `consumo.consumo` | CP13, CP44 |
| R5.9 | `mes.validarMes` | CP1, CP2, CP3, CP67 |
| R6.1 | `gastos.gastosDeMes` | CP46, CP68 |
| R6.2 | `gastos.gastosDeMes` | CP47, CP68 |
| R6.3 | `gastos.gastosDeMes` | CP48 |
| R6.4 | `gastos.quitarGasto`, `casos-uso.borrarGasto` | CP49, CP69 |
| R6.5 | `gastos.quitarGasto` | CP50, CP71 |
| R6.6 | `gastos.quitarGasto` | CP51 |
| NF1 | `Categoria.limite`, `Gasto.monto` enteros; `porcentaje` derivado | CP10, CP31, CP70 |
| NF2 | `RepositorioArchivo` (temporal + `rename`) | CP54, CP57 |
| NF3 | `RepositorioArchivo.leer` | CP53, CP55, CP56 |
| NF4 | `src/domain/` sin `node:*`; `RepositorioMemoria` | CP58, CP74 |
| BR1 | `categorias.validarCategorias` | CP9, CP11 |
| BR2 | `categorias.validarCategorias`, `Datos.presupuestos` | CP8 |
| BR3 | `mes.mesDe`, `Gasto.mes` | CP4, CP27 |
| BR4 | `gastos.registrarGasto`, `presupuesto.fijarLimites` | CP16, CP28 |
| BR5 | `gastos.registrarGasto` | CP30 |
| BR6 | `consumo.consumoDeCategoria` | CP34, CP35 |
| BR7 | `Datos.presupuestos` por mes, `consumo` filtrado por mes | CP15, CP25, CP35 |

Los 47 criterios, los 4 requisitos no funcionales y las 7 reglas de negocio tienen componente y caso de prueba. CP72 y CP73 cubren dos comportamientos de la capa HTTP que no nacen de un requisito (ruta desconocida, cuerpo ilegible) y están declarados como tales.

## 9. Decisiones y alternativas descartadas

### D1 — El dominio devuelve `Resultado`, no lanza excepciones

- **Elegido:** `Resultado<T>` con un `CodigoError` de unión cerrada.
- **Alternativas:** lanzar excepciones tipadas — el compilador no obliga a tratarlas, y los 20 criterios `IF … THEN` se convertirían en `catch` fáciles de olvidar. Devolver `null` — pierde el motivo, y el motivo *es* el requisito ("informar que…").
- **Criterio:** que agregar un código de error rompa la compilación del mapeo HTTP hasta que alguien decida qué estado devuelve. Los caminos de error son la mitad de este spec; el tipo los vuelve exhaustivos.

### D2 — Una capa de casos de uso separada del servidor

- **Elegido:** `src/app/casos-uso.ts` entre HTTP y dominio.
- **Alternativas:** orquestar dentro de los handlers HTTP — es lo que dibujamos en el brainstorming (cuatro capas). Se descartó al ver que R4.6 y R6.4 son reglas de orquestación (leer, aplicar, persistir, y devolver el consumo de *una* categoría), no de transporte: metidas en un handler, solo se pueden probar levantando un servidor.
- **Criterio:** poder probar cada operación completa sin HTTP (CP45, CP49, CP52). Es un desvío consciente respecto del diagrama aprobado, y agrega un directorio, no una dependencia.

### D3 — El mes del gasto se deriva de la fecha y se almacena

- **Elegido:** `Gasto.mes` es un campo persistido, calculado una vez al registrar.
- **Alternativas:** derivarlo en cada lectura desde `fecha` — evita el campo redundante, pero pone el parseo de fechas en el camino de todo cálculo de consumo. Guardar solo el mes y no la fecha — perdería el día, y R6.2 ordena por fecha.
- **Criterio:** el consumo de un mes queda como un filtro por igualdad de cadenas (R5.2). La redundancia es segura porque `fecha` es inmutable: no hay edición de gastos.

### D4 — El gasto guarda el nombre canónico de la categoría

- **Elegido:** al registrar, se resuelve la categoría del presupuesto por nombre normalizado y se almacena el nombre **tal como está en el presupuesto**, no como lo escribió el usuario.
- **Alternativas:** guardar lo que escribió el usuario y normalizar en cada comparación — obliga a normalizar en el cálculo de consumo, en el conteo de R1.8 y en el filtrado, y basta olvidarlo en un sitio para que un gasto de `" comida "` desaparezca del total de `"Comida"`.
- **Criterio:** normalizar una sola vez, en la frontera. Después, comparar nombres es comparar cadenas.

### D5 — Reparto de 400 y 409

- **Elegido:** `400` si el usuario puede corregir su petición; `409` si el conflicto es con los datos almacenados.
- **Alternativas:** `400` para todo — más simple, pero borra la diferencia entre "escribiste mal" y "esto choca con lo que ya tienes", que es justo lo que la UI necesita para saber si ofrecer corregir el formulario o ofrecer borrar unos gastos.
- **Criterio:** que el código HTTP le diga a la UI qué acción ofrecer. La tabla de §6 fija el estado de cada código, así que no hay que decidirlo dos veces.

### D6 — La UI no lleva pruebas automatizadas

- **Elegido:** sin tests de `web/`; toda la lógica verificable vive en `src/domain/`.
- **Alternativas:** jsdom o Playwright — dos dependencias grandes y un segundo runner, contra la regla del proyecto de no agregar dependencias sin necesidad.
- **Criterio:** el riesgo se acota moviendo las decisiones fuera de la UI, no probando la UI. `web/` no calcula estados ni umbrales: los pide. Queda como riesgo declarado (§10) y es reversible sin tocar el dominio.

### D7 — Sin Express: `node:http` a secas

- **Elegido:** enrutado propio para seis rutas.
- **Alternativas:** Express o similar — resuelve parseo y rutas, pero es una dependencia de producción para un router de seis entradas y un `JSON.parse`.
- **Criterio:** la regla del proyecto. Si las rutas se multiplicaran, esta decisión se revisa; hoy el costo del enrutado propio es una función.

### D8 — Un solo archivo JSON, leído y escrito completo

- **Elegido:** `Repositorio` con `leer()` y `escribir()` de todos los datos; `RepositorioArchivo` escribe a un temporal y hace `rename`.
- **Alternativas:** SQLite — descartado en el brainstorming: el volumen de un presupuesto personal no lo justifica. Escritura incremental por registro — mucho más código para ganar en un volumen que no tenemos, y el `rename` atómico deja de ser suficiente.
- **Criterio:** NF2 se cumple con `rename`, que es atómico en el mismo sistema de archivos. El costo es reescribir todo el archivo en cada operación, aceptable a esta escala (ver Q1 y el riesgo asociado).

### D9 — El `id` del gasto se inyecta desde afuera

- **Elegido:** `registrarGasto(entrada, categorias, id)`; el caso de uso pasa `crypto.randomUUID()`.
- **Alternativas:** generarlo dentro del dominio — obliga a importar `node:crypto` en `src/domain/`, rompiendo NF4, y vuelve los tests no deterministas.
- **Criterio:** NF4 y CP74. Un dominio puro es un dominio testeable sin mocks.

## 10. Riesgos

| Riesgo | Impacto | Mitigación |
|---|---|---|
| Dos peticiones simultáneas hacen leer-modificar-escribir sobre el mismo archivo y una pisa a la otra. | Medio | `RepositorioArchivo` mantiene los datos en memoria tras la carga inicial y **serializa las escrituras** en una cola de promesas: cada `escribir` espera a que termine la anterior. S6 dice que hay un solo usuario, así que esto es defensa en profundidad, no una feature. |
| La UI sin tests acumula lógica y se convierte en el lugar donde vive un cálculo no verificado. | Medio | D6: `web/` no calcula estados, porcentajes ni umbrales — los recibe de la API. Si aparece la tentación de calcular algo ahí, es señal de que falta un campo en `ConsumoCategoria`. |
| Reescribir el archivo completo en cada operación se vuelve lento con muchos gastos. | Bajo | Q1 sigue abierta. A escala de cientos de gastos por mes es irrelevante; el contrato de dos métodos de `Repositorio` permite cambiar la implementación sin tocar dominio ni casos de uso. |
| El campo `Gasto.mes` se desincroniza de `Gasto.fecha`. | Bajo | Solo se escribe al registrar y no hay edición de gastos (fuera de alcance). Si Q2 se resuelve a favor de editar, ese camino debe recalcular `mes`, y es lo primero que hay que verificar. |
| `porcentaje` con límite 0 no tiene un valor matemáticamente correcto. | Bajo | Se fija por convención en 100 cuando hay gasto y 0 cuando no (R4.5, R5.6), con CP41 y CP42 clavando el borde. La convención está escrita una sola vez, en §5. |

## 11. Preguntas abiertas heredadas

| # | Pregunta | Qué cambia según la respuesta |
|---|---|---|
| Q1 | ¿Cuántos gastos por mes, en orden de magnitud? | Nada del diseño lógico. Si fueran decenas de miles, cambia la implementación de `Repositorio` (D8), que está aislada detrás de dos métodos. |
| Q2 | ¿Hace falta editar un gasto, o alcanza borrar y volver a crear? | Agrega una operación que debe **recalcular `Gasto.mes`** si cambia la fecha, y revalidar la categoría contra el mes nuevo (D3). |
| Q3 | ¿El umbral de alerta debería ser configurable? | Ya es un parámetro con valor por defecto (`UMBRAL_ALERTA`). Hacerlo configurable agrega dónde guardarlo y una ruta para cambiarlo, no toca el cálculo. |
| Q4 | ¿Hace falta renombrar una categoría conservando sus gastos? | Requiere una operación que actualice `Gasto.categoria` de todos los gastos del mes en la misma escritura. Con D4 (nombre canónico almacenado) es un renombre en cascada; hoy R1.8 lo bloquea. |
