// Router: lee el fragmento de la URL, decide que pantalla toca y la monta.

import "./ds/tokens.css";
import "./ds/base.css";
import "./ds/componentes.css";
import "./onboarding/pantallas.css";

import { montarConoceme } from "./onboarding/conoceme";
import { montarLogin } from "./onboarding/login";
import { montarPerfil } from "./onboarding/perfil";
import { montarPlan } from "./onboarding/plan";
import { pantallaDe, RUTA, type Pantalla } from "./rutas";

const raiz = document.querySelector<HTMLElement>("#onboarding");
if (!raiz) throw new Error("Falta el andamiaje del index.html");
const onboarding = raiz;

function navegar(destino: Pantalla): void {
  location.hash = RUTA[destino];
}

// Cada pantalla se monta de cero: lo escrito o elegido en la anterior no
// sobrevive, que es lo correcto mientras no haya donde guardarlo.
const MONTAR: Record<Pantalla, (raiz: HTMLElement, ir: (p: Pantalla) => void) => void> = {
  login: montarLogin,
  perfil: montarPerfil,
  conoceme: montarConoceme,
  plan: montarPlan,
};

function mostrar(pantalla: Pantalla): void {
  document.documentElement.dataset["pantalla"] = pantalla;
  window.scrollTo({ top: 0 });
  MONTAR[pantalla](onboarding, navegar);
}

window.addEventListener("hashchange", () => mostrar(pantallaDe(location.hash)));
mostrar(pantallaDe(location.hash));
