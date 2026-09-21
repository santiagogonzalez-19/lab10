import { describe, expect, it } from "vitest";
import {
  agregarArchivos,
  agregarMovimiento,
  CONOCEME_INICIAL,
  elegirTipo,
  escribirCampo,
  formatearMonto,
  formatearTamano,
  puedeAgregar,
  quitarArchivo,
} from "./conoceme-estado";

describe("estado inicial", () => {
  it("refleja lo que dibuja el mockup", () => {
    expect(CONOCEME_INICIAL.archivos).toHaveLength(3);
    expect(CONOCEME_INICIAL.movimientos).toHaveLength(2);
    expect(CONOCEME_INICIAL.tipo).toBe("expense");
    expect(CONOCEME_INICIAL.moneda).toBe("USD");
  });

  it("el tercer archivo esta a medio subir", () => {
    expect(CONOCEME_INICIAL.archivos[2]?.progreso).toBe(63);
  });

  it("los dos primeros archivos estan listos", () => {
    expect(CONOCEME_INICIAL.archivos[0]?.progreso).toBe(100);
    expect(CONOCEME_INICIAL.archivos[1]?.progreso).toBe(100);
  });

  it("arranca con el formulario vacio", () => {
    expect(CONOCEME_INICIAL.descripcion).toBe("");
    expect(CONOCEME_INICIAL.valor).toBe("");
    expect(CONOCEME_INICIAL.categoria).toBe("");
  });
});

describe("archivos", () => {
  it("agrega al final y los marca listos", () => {
    const estado = agregarArchivos(CONOCEME_INICIAL, [
      { id: "n1", nombre: "Nuevo.pdf", tamano: "500 KB" },
    ]);
    expect(estado.archivos).toHaveLength(4);
    expect(estado.archivos[3]?.nombre).toBe("Nuevo.pdf");
    expect(estado.archivos[3]?.progreso).toBe(100);
  });

  it("agregar ninguno deja la lista igual", () => {
    expect(agregarArchivos(CONOCEME_INICIAL, []).archivos).toHaveLength(3);
  });

  it("quita el archivo por su id y conserva los demas", () => {
    const primero = CONOCEME_INICIAL.archivos[0];
    expect(primero).toBeDefined();
    const estado = quitarArchivo(CONOCEME_INICIAL, primero?.id ?? "");
    expect(estado.archivos).toHaveLength(2);
    expect(estado.archivos.some((a) => a.id === primero?.id)).toBe(false);
  });

  it("quitar un id que no existe no cambia nada", () => {
    expect(quitarArchivo(CONOCEME_INICIAL, "no-existe").archivos).toHaveLength(3);
  });

  it("quitar todos deja la lista vacia", () => {
    let estado = CONOCEME_INICIAL;
    for (const archivo of CONOCEME_INICIAL.archivos) {
      estado = quitarArchivo(estado, archivo.id);
    }
    expect(estado.archivos).toEqual([]);
  });
});

describe("formatearTamano", () => {
  it("usa KB por debajo del mega", () => {
    expect(formatearTamano(642 * 1024)).toBe("642 KB");
  });

  it("usa MB con un decimal por encima del mega", () => {
    expect(formatearTamano(Math.round(1.8 * 1024 * 1024))).toBe("1.8 MB");
  });

  it("un archivo vacio no rompe", () => {
    expect(formatearTamano(0)).toBe("0 KB");
  });
});

describe("tipo de movimiento", () => {
  it("alterna entre gasto e ingreso", () => {
    expect(elegirTipo(CONOCEME_INICIAL, "income").tipo).toBe("income");
  });

  it("elegir el tipo actual no cambia nada", () => {
    expect(elegirTipo(CONOCEME_INICIAL, "expense").tipo).toBe("expense");
  });

  it("cambiar el tipo no borra lo escrito", () => {
    const conTexto = escribirCampo(CONOCEME_INICIAL, "descripcion", "Rent");
    expect(elegirTipo(conTexto, "income").descripcion).toBe("Rent");
  });
});

describe("puedeAgregar", () => {
  const lleno = (estado = CONOCEME_INICIAL) =>
    escribirCampo(
      escribirCampo(escribirCampo(estado, "descripcion", "Monthly rent"), "valor", "1200"),
      "categoria",
      "Housing",
    );

  it("el formulario vacio no alcanza", () => {
    expect(puedeAgregar(CONOCEME_INICIAL)).toBe(false);
  });

  it("con los tres campos habilita", () => {
    expect(puedeAgregar(lleno())).toBe(true);
  });

  it("una descripcion de solo espacios no cuenta", () => {
    expect(puedeAgregar(escribirCampo(lleno(), "descripcion", "   "))).toBe(false);
  });

  it("sin categoria no habilita", () => {
    expect(puedeAgregar(escribirCampo(lleno(), "categoria", ""))).toBe(false);
  });

  it("un valor de cero no habilita", () => {
    expect(puedeAgregar(escribirCampo(lleno(), "valor", "0"))).toBe(false);
  });

  it("un valor negativo no habilita", () => {
    expect(puedeAgregar(escribirCampo(lleno(), "valor", "-5"))).toBe(false);
  });

  it("un valor que no es numero no habilita", () => {
    expect(puedeAgregar(escribirCampo(lleno(), "valor", "abc"))).toBe(false);
  });

  it("un valor con decimales si habilita", () => {
    expect(puedeAgregar(escribirCampo(lleno(), "valor", "142.30"))).toBe(true);
  });
});

describe("agregarMovimiento", () => {
  const listo = escribirCampo(
    escribirCampo(
      escribirCampo(CONOCEME_INICIAL, "descripcion", "Monthly rent"),
      "valor",
      "1200",
    ),
    "categoria",
    "Housing",
  );

  it("lo pone primero en la lista", () => {
    const estado = agregarMovimiento(listo, "m1");
    expect(estado.movimientos).toHaveLength(3);
    expect(estado.movimientos[0]?.descripcion).toBe("Monthly rent");
  });

  it("guarda el tipo, el valor y la moneda", () => {
    const movimiento = agregarMovimiento(listo, "m1").movimientos[0];
    expect(movimiento?.tipo).toBe("expense");
    expect(movimiento?.valor).toBe(1200);
    expect(movimiento?.moneda).toBe("USD");
  });

  it("limpia el formulario y conserva el tipo y la moneda", () => {
    const estado = agregarMovimiento(listo, "m1");
    expect(estado.descripcion).toBe("");
    expect(estado.valor).toBe("");
    expect(estado.categoria).toBe("");
    expect(estado.tipo).toBe("expense");
    expect(estado.moneda).toBe("USD");
  });

  it("recorta los espacios de la descripcion", () => {
    const conEspacios = escribirCampo(listo, "descripcion", "  Rent  ");
    expect(agregarMovimiento(conEspacios, "m1").movimientos[0]?.descripcion).toBe("Rent");
  });

  it("no agrega nada si el formulario no esta completo", () => {
    const estado = agregarMovimiento(CONOCEME_INICIAL, "m1");
    expect(estado.movimientos).toHaveLength(2);
  });
});

describe("formatearMonto", () => {
  it("un ingreso lleva signo mas", () => {
    expect(formatearMonto({ tipo: "income", valor: 1200 })).toBe("+$1,200.00");
  });

  it("un gasto lleva signo menos", () => {
    expect(formatearMonto({ tipo: "expense", valor: 142.3 })).toBe("-$142.30");
  });

  it("siempre muestra dos decimales", () => {
    expect(formatearMonto({ tipo: "expense", valor: 5 })).toBe("-$5.00");
  });
});
