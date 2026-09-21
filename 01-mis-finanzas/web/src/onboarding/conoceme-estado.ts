// Todo lo que la pantalla "Know Me" DECIDE: que archivos hay, que tipo de
// movimiento se esta registrando, si el formulario esta completo y como se
// formatean tamanos y montos. Sin DOM.
//
// Los identificadores llegan desde afuera (como los gastos del dominio): asi
// este modulo no necesita reloj ni azar y sus pruebas son deterministas.

export type TipoMovimiento = "expense" | "income";

export type Archivo = {
  readonly id: string;
  readonly nombre: string;
  readonly tamano: string;
  readonly progreso: number;
};

export type Movimiento = {
  readonly id: string;
  readonly tipo: TipoMovimiento;
  readonly descripcion: string;
  readonly valor: number;
  readonly moneda: string;
};

export type CampoMovimiento = "descripcion" | "valor" | "moneda" | "categoria";

export type EstadoConoceme = {
  readonly archivos: readonly Archivo[];
  readonly tipo: TipoMovimiento;
  readonly descripcion: string;
  readonly valor: string;
  readonly moneda: string;
  readonly categoria: string;
  readonly movimientos: readonly Movimiento[];
};

// Arranca con los tres archivos y los dos movimientos que dibuja el mockup.
export const CONOCEME_INICIAL: EstadoConoceme = {
  archivos: [
    { id: "f1", nombre: "Chase_Checking_Jun.pdf", tamano: "1.8 MB", progreso: 100 },
    { id: "f2", nombre: "Amex_Statement_Q2.csv", tamano: "642 KB", progreso: 100 },
    { id: "f3", nombre: "Fidelity_401k.xlsx", tamano: "2.1 MB", progreso: 63 },
  ],
  tipo: "expense",
  descripcion: "",
  valor: "",
  moneda: "USD",
  categoria: "",
  movimientos: [
    { id: "m1", tipo: "income", descripcion: "Freelance project", valor: 1200, moneda: "USD" },
    {
      id: "m2",
      tipo: "expense",
      descripcion: "Groceries — Whole Foods",
      valor: 142.3,
      moneda: "USD",
    },
  ],
};

export type ArchivoNuevo = { id: string; nombre: string; tamano: string };

// Los archivos que se agregan a mano quedan listos: no hay servidor a donde
// subirlos, asi que no hay progreso que simular.
export function agregarArchivos(
  estado: EstadoConoceme,
  nuevos: readonly ArchivoNuevo[],
): EstadoConoceme {
  if (nuevos.length === 0) return estado;
  return {
    ...estado,
    archivos: [...estado.archivos, ...nuevos.map((a) => ({ ...a, progreso: 100 }))],
  };
}

export function quitarArchivo(estado: EstadoConoceme, id: string): EstadoConoceme {
  return { ...estado, archivos: estado.archivos.filter((archivo) => archivo.id !== id) };
}

export function elegirTipo(estado: EstadoConoceme, tipo: TipoMovimiento): EstadoConoceme {
  return { ...estado, tipo };
}

export function escribirCampo(
  estado: EstadoConoceme,
  campo: CampoMovimiento,
  valor: string,
): EstadoConoceme {
  return { ...estado, [campo]: valor };
}

function montoDe(valor: string): number | undefined {
  const limpio = valor.trim();
  if (limpio === "") return undefined;
  const numero = Number(limpio);
  return Number.isFinite(numero) && numero > 0 ? numero : undefined;
}

export function puedeAgregar(estado: EstadoConoceme): boolean {
  return (
    estado.descripcion.trim() !== "" &&
    estado.categoria !== "" &&
    montoDe(estado.valor) !== undefined
  );
}

// Al agregar, el formulario se limpia pero el tipo y la moneda se conservan:
// quien registra varios movimientos seguidos suele repetirlos.
export function agregarMovimiento(estado: EstadoConoceme, id: string): EstadoConoceme {
  const monto = montoDe(estado.valor);
  if (!puedeAgregar(estado) || monto === undefined) return estado;
  const movimiento: Movimiento = {
    id,
    tipo: estado.tipo,
    descripcion: estado.descripcion.trim(),
    valor: monto,
    moneda: estado.moneda,
  };
  return {
    ...estado,
    descripcion: "",
    valor: "",
    categoria: "",
    movimientos: [movimiento, ...estado.movimientos],
  };
}

const KB = 1024;
const MB = KB * KB;

export function formatearTamano(bytes: number): string {
  if (bytes >= MB) return `${(bytes / MB).toFixed(1)} MB`;
  return `${Math.round(bytes / KB)} KB`;
}

const MONTO = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatearMonto(movimiento: {
  tipo: TipoMovimiento;
  valor: number;
}): string {
  const signo = movimiento.tipo === "income" ? "+" : "-";
  return `${signo}$${MONTO.format(movimiento.valor)}`;
}
