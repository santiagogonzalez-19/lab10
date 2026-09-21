// Los iconos del mockup son de lucide, que es trazo (no relleno): se dibujan
// con stroke="currentColor", asi que el color lo pone el CSS del contenedor.
// Son siete, van embebidos y no dependen de la red.

export type NombreIcono =
  | "compass"
  | "star"
  | "check"
  | "plus"
  | "eye"
  | "eye-off"
  | "arrow-left"
  | "arrow-right"
  | "cloud-upload"
  | "folder-open"
  | "file-text"
  | "circle-check"
  | "loader"
  | "x"
  | "sparkles"
  | "trending-up"
  | "trending-down"
  | "chart-pie"
  | "triangle-alert"
  | "chevron-down";

const TRAZOS: Record<NombreIcono, readonly string[]> = {
  compass: [
    '<path d="m16.24 7.76-1.804 5.411a2 2 0 0 1-1.265 1.265L7.76 16.24l1.804-5.411a2 2 0 0 1 1.265-1.265z"/>',
    '<circle cx="12" cy="12" r="10"/>',
  ],
  star: [
    '<path d="M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.94a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 10.725a.53.53 0 0 1 .294-.904l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z"/>',
  ],
  check: ['<path d="M20 6 9 17l-5-5"/>'],
  plus: ['<path d="M5 12h14"/>', '<path d="M12 5v14"/>'],
  eye: [
    '<path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0"/>',
    '<circle cx="12" cy="12" r="3"/>',
  ],
  "eye-off": [
    '<path d="M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49"/>',
    '<path d="M14.084 14.158a3 3 0 0 1-4.242-4.242"/>',
    '<path d="M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143"/>',
    '<path d="m2 2 20 20"/>',
  ],
  "arrow-left": ['<path d="m12 19-7-7 7-7"/>', '<path d="M19 12H5"/>'],
  "arrow-right": ['<path d="M5 12h14"/>', '<path d="m12 5 7 7-7 7"/>'],
  "cloud-upload": [
    '<path d="M12 13v8"/>',
    '<path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"/>',
    '<path d="m8 17 4-4 4 4"/>',
  ],
  "folder-open": [
    '<path d="m6 14 1.5-2.9A2 2 0 0 1 9.24 10H20a2 2 0 0 1 1.94 2.5l-1.55 6a2 2 0 0 1-1.94 1.5H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H18a2 2 0 0 1 2 2v2"/>',
  ],
  "file-text": [
    '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/>',
    '<path d="M14 2v4a2 2 0 0 0 2 2h4"/>',
    '<path d="M10 9H8"/>',
    '<path d="M16 13H8"/>',
    '<path d="M16 17H8"/>',
  ],
  "circle-check": ['<circle cx="12" cy="12" r="10"/>', '<path d="m9 12 2 2 4-4"/>'],
  loader: [
    '<path d="M12 2v4"/>',
    '<path d="m16.2 7.8 2.9-2.9"/>',
    '<path d="M18 12h4"/>',
    '<path d="m16.2 16.2 2.9 2.9"/>',
    '<path d="M12 18v4"/>',
    '<path d="m4.9 19.1 2.9-2.9"/>',
    '<path d="M2 12h4"/>',
    '<path d="m4.9 4.9 2.9 2.9"/>',
  ],
  x: ['<path d="M18 6 6 18"/>', '<path d="m6 6 12 12"/>'],
  sparkles: [
    '<path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"/>',
    '<path d="M20 3v4"/>',
    '<path d="M22 5h-4"/>',
    '<path d="M4 17v2"/>',
    '<path d="M5 18H3"/>',
  ],
  "trending-up": ['<path d="M16 7h6v6"/>', '<path d="m22 7-8.5 8.5-5-5L2 17"/>'],
  "trending-down": ['<path d="M16 17h6v-6"/>', '<path d="m22 17-8.5-8.5-5 5L2 7"/>'],
  "chart-pie": [
    '<path d="M21 12c.552 0 1.005-.449.95-.998a10 10 0 0 0-8.953-8.951c-.55-.055-.998.398-.998.95v8a1 1 0 0 0 1 1z"/>',
    '<path d="M21.21 15.89A10 10 0 1 1 8 2.83"/>',
  ],
  "triangle-alert": [
    '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/>',
    '<path d="M12 9v4"/>',
    '<path d="M12 17h.01"/>',
  ],
  "chevron-down": ['<path d="m6 9 6 6 6-6"/>'],
};

export function icono(nombre: NombreIcono, tamano: number): HTMLElement {
  const envoltorio = document.createElement("span");
  envoltorio.className = "icono";
  envoltorio.setAttribute("aria-hidden", "true");
  envoltorio.style.width = `${tamano}px`;
  envoltorio.style.height = `${tamano}px`;
  envoltorio.innerHTML =
    `<svg viewBox="0 0 24 24" width="${tamano}" height="${tamano}" fill="none"` +
    ' stroke="currentColor" stroke-width="2" stroke-linecap="round"' +
    ' stroke-linejoin="round" focusable="false">' +
    TRAZOS[nombre].join("") +
    "</svg>";
  return envoltorio;
}
