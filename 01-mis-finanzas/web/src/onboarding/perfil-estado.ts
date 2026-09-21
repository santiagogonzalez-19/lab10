// Todo lo que el perfil DECIDE: que queda seleccionado, que nota acompana al
// nivel de riesgo y cuando se habilita continuar. Sin DOM.

import { RIESGOS, type IdIngreso, type IdMeta, type NivelRiesgo } from "./catalogos";

export type EstadoPerfil = {
  readonly meta: IdMeta | null;
  readonly riesgo: NivelRiesgo;
  readonly ingresos: readonly IdIngreso[];
};

// Arranca como el mockup dibuja la pantalla: una meta elegida, riesgo
// moderado y dos fuentes marcadas.
export const PERFIL_INICIAL: EstadoPerfil = {
  meta: "emergency",
  riesgo: "balanced",
  ingresos: ["salary", "investments"],
};

// Seleccion unica: el tipo la garantiza, no hay forma de acumular dos.
export function elegirMeta(estado: EstadoPerfil, meta: IdMeta): EstadoPerfil {
  return { ...estado, meta };
}

// Siempre hay exactamente un nivel: no existe el estado "ninguno".
export function elegirRiesgo(estado: EstadoPerfil, riesgo: NivelRiesgo): EstadoPerfil {
  return { ...estado, riesgo };
}

// Seleccion multiple: agrega si falta, quita si estaba, sin repetir.
export function alternarIngreso(estado: EstadoPerfil, id: IdIngreso): EstadoPerfil {
  const marcada = estado.ingresos.includes(id);
  return {
    ...estado,
    ingresos: marcada
      ? estado.ingresos.filter((otra) => otra !== id)
      : [...estado.ingresos, id],
  };
}

export function descriptorDeRiesgo(estado: EstadoPerfil): string {
  const nivel = RIESGOS.find((riesgo) => riesgo.id === estado.riesgo);
  return nivel?.descriptor ?? "";
}

export function puedeContinuar(estado: EstadoPerfil): boolean {
  return estado.meta !== null && estado.ingresos.length > 0;
}
