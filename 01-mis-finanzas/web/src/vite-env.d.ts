// Tipos de import.meta.env, declarados a mano (design.md D5).
//
// La alternativa era "types": ["vite/client"] en web/tsconfig.json, que suma
// vite entero a la resolucion de tipos de web/ para ganar estas ocho lineas.
//
// Las claves son OPCIONALES a proposito: en un checkout sin web/.env.local no
// existe ninguna, y el tipo tiene que decir la verdad sobre eso. Es lo que
// obliga a configuracion.ts a contemplar la llave ausente (R4.3) en vez de
// confiar en que siempre esta.

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
