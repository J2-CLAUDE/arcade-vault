# SPEC 04 — Integración base de Supabase (conexión + clientes + sesión)

> **Estado:** Implementado · **Depende de:** Spec 01 (layout, `lib/`, sesión mock) · **Fecha:** 2026-06-15
> **Objetivo:** Conectar la app Next.js 16 con el proyecto Supabase `glbrlxbpqzroauyqzvst` instalando `@supabase/ssr`, helpers de cliente/servidor, refresco de sesión en `proxy.ts` y variables de entorno — sin crear tablas ni cambiar la UI.

---

## 1. Por qué existe este spec

La app tiene hoy dos sistemas **mock**: el login (`components/auth.tsx` + `components/session-provider.tsx`, guarda `av_user` en `localStorage`) y las puntuaciones (`saveScore()` escribe `av_scores` en `localStorage`, pero nadie las lee; los leaderboards usan `seededScores()`). El objetivo final del producto es persistencia y rankings reales con Supabase.

Este spec **no** reemplaza esos sistemas todavía. Establece únicamente la **capa de integración**: dejar Supabase correctamente cableado al App Router de Next.js 16, de modo que los specs siguientes (Auth real, puntuaciones) construyan encima sin volver a tocar el plumbing. El proyecto Supabase ya está referenciado en `.mcp.json` (`project_ref=glbrlxbpqzroauyqzvst`).

> ⚠️ **Trampa de Next.js 16 (confirmada en los docs locales):** el convenio `middleware.ts` está **deprecado y renombrado a `proxy.ts`** (`node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md`). Todos los tutoriales de `@supabase/ssr` usan `middleware.ts`; aquí va en `proxy.ts` en la raíz, exportando una función `proxy` (o default) + `config.matcher`. Además, `cookies()` de `next/headers` es **asíncrono** en Next 15/16 (`await cookies()`).

---

## 2. Alcance

**Dentro:**

- **Dependencias:** `npm i @supabase/supabase-js @supabase/ssr`.
- **Variables de entorno** en `.env` (y placeholders en `.env.template`):
  - `NEXT_PUBLIC_SUPABASE_URL=https://glbrlxbpqzroauyqzvst.supabase.co`
  - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_d1wwaIKwKJ56OSNti7etWA_Qdz1ggk9` (clave **publishable** moderna, recomendada para apps nuevas).
- **`lib/supabase/client.ts`** — cliente de navegador vía `createBrowserClient<Database>` (para Client Components).
- **`lib/supabase/server.ts`** — cliente de servidor `async` vía `createServerClient<Database>`, usando `await cookies()` de `next/headers` con `getAll`/`setAll` (patrón oficial, con `try/catch` en `setAll` para tolerar Server Components de solo lectura).
- **`lib/supabase/proxy.ts`** — helper `updateSession(request)` que crea un cliente sobre `NextRequest`/`NextResponse`, llama a `supabase.auth.getClaims()` para refrescar tokens y propaga las cookies a la respuesta.
- **`proxy.ts`** (raíz del repo) — exporta `proxy(request)` que delega en `updateSession`, más `config.matcher` que excluye estáticos (`_next/static`, `_next/image`, `favicon.ico`, imágenes).
- **`lib/supabase/database.types.ts`** — tipos TypeScript generados vía el MCP de Supabase (`generate_typescript_types`). Con BD vacía el `Database` queda mínimo; sirve de andamiaje tipado para los clientes y se regenera cuando lleguen tablas.
- **Verificación temporal y desechable** (paso final) para confirmar la conexión, que se elimina antes de cerrar el spec.

**Fuera (para specs futuros):**

- ❌ Crear tablas / esquema de BD (`profiles`, `scores`, `games`) y sus políticas RLS.
- ❌ Conectar la pantalla de Acceso (`components/auth.tsx`) a Supabase Auth.
- ❌ Reemplazar el `session-provider` mock o `seededScores()` por datos reales.
- ❌ Activar OAuth (Google/GitHub), magic links o eliminar el modo invitado.
- ❌ Cualquier cambio visual en Home, Biblioteca, Detalle, Reproductor, Salón o Acceso.
- ❌ Tests automatizados, edge functions, storage, realtime.

---

## 3. Modelo de datos

**No introduce datos persistentes ni tablas.** Solo se genera el tipo `Database` (vacío/mínimo mientras no haya tablas) para tipar los clientes:

```ts
// lib/supabase/database.types.ts (generado por el MCP de Supabase)
export type Database = {
  /* public: { Tables: {}, ... } — vacío por ahora */
};
```

Las variables de entorno introducidas son las del bloque "Dentro". Ningún secreto de servidor nuevo: la publishable key es segura en el cliente (la protección real es RLS, que llegará con las tablas).

---

## 4. Plan de implementación

Cada paso deja la app ejecutable (`npm run dev` / `npm run build`).

> ⚠️ Antes de tocar `proxy.ts` y clientes de servidor, consultar `node_modules/next/dist/docs/01-app/` (proxy, `cookies`, variables de entorno). No asumir convenios de App Router de memoria.

1. **Instalar dependencias.** `npm i @supabase/supabase-js @supabase/ssr`.
   - _Verifica:_ aparecen en `package.json`; `npm run build` sigue corriendo.

2. **Variables de entorno.** Añadir a `.env` `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` con los valores reales. Añadir las mismas claves vacías a `.env.template` como documentación.
   - _Verifica:_ `.env` no se commitea (`.env*` ya está en `.gitignore`); `.env.template` lista las claves.

3. **Generar tipos.** Crear `lib/supabase/database.types.ts` con la salida del MCP `generate_typescript_types` (exporta `type Database`).
   - _Verifica:_ el archivo compila e importa sin error.

4. **Cliente de navegador** `lib/supabase/client.ts`: `createBrowserClient<Database>(url, key)` leyendo las dos env `NEXT_PUBLIC_*`.
   - _Verifica:_ tipa sin error; importable desde un Client Component.

5. **Cliente de servidor** `lib/supabase/server.ts`: función `async createClient()` que hace `const cookieStore = await cookies()` y `createServerClient<Database>(url, key, { cookies: { getAll, setAll } })`, con `setAll` envuelto en `try/catch`.
   - _Verifica:_ tipa sin error; usable en Server Components / Server Actions.

6. **Helper de sesión** `lib/supabase/proxy.ts`: `updateSession(request: NextRequest)` que construye `NextResponse.next`, crea el cliente con cookies sobre request/response, llama a `await supabase.auth.getClaims()` y devuelve la respuesta con las cookies actualizadas (patrón oficial de `@supabase/ssr`).
   - _Verifica:_ tipa sin error.

7. **`proxy.ts` (raíz):** `export async function proxy(request) { return await updateSession(request) }` + `export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'] }`.
   - _Verifica:_ `npm run dev` arranca sin error; navegar entre páginas funciona igual que antes (el proxy es inocuo sin sesión).

8. **Verificación temporal y limpieza.** Crear un check desechable (p. ej. `app/_supabase-check/page.tsx` como Server Component que llama `await createClient()` → `supabase.auth.getUser()` y muestra "conexión OK / user: null"). Confirmar que carga sin error contra el proyecto real. **Eliminarlo** al terminar.
   - _Verifica:_ la ruta temporal renderiza sin lanzar; tras borrarla, `npm run build` y `npm run lint` quedan limpios.

**Archivos que aparecen o cambian:**

- Nuevos: `lib/supabase/client.ts`, `lib/supabase/server.ts`, `lib/supabase/proxy.ts`, `lib/supabase/database.types.ts`, `proxy.ts` (raíz).
- Modificados: `.env`, `.env.template`, `package.json` / `package-lock.json`.
- Temporal (se borra): `app/_supabase-check/page.tsx`.

---

## 5. Criterios de aceptación

- [ ] `@supabase/supabase-js` y `@supabase/ssr` están en `package.json`.
- [ ] `.env` define `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`; `.env.template` lista ambas vacías.
- [ ] Existen `lib/supabase/client.ts`, `lib/supabase/server.ts`, `lib/supabase/proxy.ts` y `lib/supabase/database.types.ts`, todos tipados con `Database`.
- [ ] Existe `proxy.ts` en la raíz (no `middleware.ts`) exportando `proxy` + `config.matcher` que excluye estáticos.
- [ ] El cliente de servidor usa `await cookies()` (asíncrono) y `getAll`/`setAll`.
- [ ] Una llamada de prueba a `supabase.auth.getUser()` contra el proyecto real responde sin lanzar (user `null` es válido = conexión correcta).
- [ ] La ruta de verificación temporal fue **eliminada**.
- [ ] `npm run build` y `npm run lint` terminan sin errores ni warnings.
- [ ] La navegación de la app funciona igual que antes; no hay cambios visuales.

---

## 6. Decisiones tomadas y descartadas

- **Sí:** `@supabase/ssr` con clientes separados navegador/servidor. _Motivo:_ es el patrón soportado para App Router; maneja cookies de sesión correctamente. **No:** un único `createClient` de `@supabase/supabase-js`. _Motivo:_ no gestiona sesión en SSR.
- **Sí:** refresco de sesión en **`proxy.ts`** (raíz). _Motivo:_ en Next 16 `middleware.ts` está deprecado y renombrado a `proxy`. **No:** `middleware.ts`. _Motivo:_ convenio obsoleto.
- **Sí:** clave **publishable** moderna (`sb_publishable_…`). _Motivo:_ recomendada para apps nuevas, rotación independiente. **No:** legacy anon JWT. _Motivo:_ heredada; se mantiene solo por compatibilidad.
- **Sí:** generar `database.types.ts` aunque la BD esté vacía. _Motivo:_ deja los clientes tipados y el flujo de regeneración listo para los specs de esquema.
- **Sí:** incluir el `proxy.ts` ahora aunque aún no haya auth. _Motivo:_ completa el plumbing; es inocuo sin sesión y evita retoques en specs futuros.
- **No:** crear tablas, RLS o tocar la UI. _Motivo:_ fuera de alcance por decisión explícita del usuario (solo la integración).

---

## 7. Riesgos identificados

| Riesgo                                                                                     | Mitigación                                                                        |
| ------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------- |
| Copiar un tutorial de `@supabase/ssr` con `middleware.ts` rompería el refresco en Next 16. | Usar `proxy.ts` en la raíz; consultar `proxy.md` en los docs locales.             |
| `cookies()` usado de forma síncrona falla en Next 16.                                      | El cliente de servidor es `async` y hace `await cookies()`.                       |
| `matcher` demasiado amplio bloquea estáticos (CSS/JS/imágenes).                            | `config.matcher` excluye `_next/static`, `_next/image`, `favicon.ico` e imágenes. |
| La verificación temporal queda olvidada en el repo.                                        | Es un criterio de aceptación explícito eliminarla.                                |
| La key publishable acaba en git si se pega en código.                                      | Vive solo en `.env` (ignorado); el código la lee de `process.env`.                |

---

## Lo que **no** está en este spec

- Tablas, esquema y RLS (`profiles`, `scores`, `games`).
- Conectar Auth real, OAuth o magic links a la UI.
- Reemplazar el `session-provider` mock o `seededScores()`.
- Cualquier cambio visual o de pantallas.

Cada uno, si llega, va en su propio spec.
