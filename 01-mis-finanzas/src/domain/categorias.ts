import { exito, fallo, type Resultado } from "./resultado";
import type { Categoria } from "./tipos";

// Única definición de la normalización en el código (glosario del spec, D4):
// se usa solo para comparar; el nombre se almacena tal como lo escribió el usuario.
export function normalizar(nombre: string): string {
  return nombre.trim().toLowerCase();
}

export function validarCategorias(entrada: Categoria[]): Resultado<Categoria[]> {
  const vistos = new Map<string, string>(); // normalizado → nombre tal como se escribió primero (S1)
  for (const categoria of entrada) {
    const clave = normalizar(categoria.nombre);
    if (clave === "") {
      return fallo("NOMBRE_VACIO", "El nombre de la categoría es obligatorio.");
    }
    if (!Number.isInteger(categoria.limite)) {
      return fallo("LIMITE_NO_ENTERO", "Los límites deben ser enteros, sin decimales.");
    }
    if (categoria.limite < 0) {
      return fallo("LIMITE_NEGATIVO", "Los límites no pueden ser negativos.");
    }
    const primero = vistos.get(clave);
    if (primero !== undefined) {
      return fallo("NOMBRE_DUPLICADO", `La categoría «${primero}» está repetida.`, {
        categoria: primero,
      });
    }
    vistos.set(clave, categoria.nombre);
  }
  return exito(entrada);
}

export function buscarCategoria(
  categorias: Categoria[],
  nombre: string,
): Categoria | undefined {
  const clave = normalizar(nombre);
  return categorias.find((categoria) => normalizar(categoria.nombre) === clave);
}
