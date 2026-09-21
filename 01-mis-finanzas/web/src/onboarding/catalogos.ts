// Los tres catalogos del onboarding, con los textos del mockup
// (docs/mockups/onboarding.pen). Son cerrados: el estado guarda el `id`,
// nunca la etiqueta visible, para que cambiar una palabra no rompa nada.

export type IdMeta = "emergency" | "debt" | "purchase" | "wealth" | "retirement";
export type NivelRiesgo = "conservative" | "balanced" | "aggressive";
export type IdIngreso =
  | "salary"
  | "freelance"
  | "business"
  | "investments"
  | "rental"
  | "other";

export type Meta = { id: IdMeta; etiqueta: string };
export type Riesgo = { id: NivelRiesgo; etiqueta: string; descriptor: string };
export type FuenteIngreso = { id: IdIngreso; etiqueta: string };

export const METAS: readonly Meta[] = [
  { id: "emergency", etiqueta: "Build an emergency fund" },
  { id: "debt", etiqueta: "Pay off debt" },
  { id: "purchase", etiqueta: "Save for a big purchase" },
  { id: "wealth", etiqueta: "Grow long-term wealth" },
  { id: "retirement", etiqueta: "Prepare for retirement" },
];

// El mockup solo muestra el descriptor de "Balanced"; los otros dos siguen su forma.
export const RIESGOS: readonly Riesgo[] = [
  {
    id: "conservative",
    etiqueta: "Conservative",
    descriptor:
      "Conservative — protecting what you have comes first, with slower but steadier growth and few surprises.",
  },
  {
    id: "balanced",
    etiqueta: "Balanced",
    descriptor:
      "Balanced — a mix of growth and stability, accepting moderate ups and downs for steady long-term returns.",
  },
  {
    id: "aggressive",
    etiqueta: "Aggressive",
    descriptor:
      "Aggressive — the most growth potential, accepting larger swings along the way in exchange for it.",
  },
];

export const INGRESOS: readonly FuenteIngreso[] = [
  { id: "salary", etiqueta: "Salary" },
  { id: "freelance", etiqueta: "Freelance" },
  { id: "business", etiqueta: "Business" },
  { id: "investments", etiqueta: "Investments" },
  { id: "rental", etiqueta: "Rental" },
  { id: "other", etiqueta: "Other" },
];

// El mockup muestra "USD" y "Select category" como valores de ejemplo, sin
// listar las opciones. Estas salen de las categorias del panorama financiero.
export const MONEDAS: readonly string[] = ["USD", "EUR", "GBP", "COP"];

export const CATEGORIAS: readonly string[] = [
  "Housing",
  "Food & dining",
  "Transport",
  "Subscriptions",
  "Salary",
  "Other",
];
