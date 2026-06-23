# SPEC 11 — Autenticación real con Supabase Auth (desacoplada)

> **Estado:** Implementado · **Depende de:** SPEC 04 (integración Supabase), SPEC 06 (juegos y leaderboard)
> **Fecha:** 2026-06-23
> **Objetivo:** Reemplazar el auth mock por autenticación real con Supabase Auth (email+contraseña, OTP por email, verificación y recuperación), detrás de una capa `lib/auth/` desacoplada, con navbar de sesión y protección de `/jugar/[id]`.

---

## Por qué existe este spec

La autenticación actual es un **mock**: `components/session-provider.tsx` guarda un `{ name }` en `localStorage` (`av_user`) y `components/auth.tsx` "loguea" sin validar nada. No hay usuarios reales, ni verificación, ni recuperación. Este spec introduce autenticación real con Supabase Auth (GoTrue), reutilizando la infraestructura de sesión que ya existe en `proxy.ts`, pero **detrás de una capa de abstracción** (`lib/auth/`) para poder cambiar de librería de auth en el futuro sin tocar los componentes.

---

## Scope

**Dentro:**

- **Capa de auth desacoplada** en `lib/auth/`:
  - `lib/auth/types.ts` — interfaz `AuthProvider` y tipos `AuthUser`, `AuthResult`, `AuthErrorCode`, `UserMetadata`.
  - `lib/auth/supabase-auth.ts` — adaptador que implementa `AuthProvider` sobre Supabase Auth (cliente browser).
  - `lib/auth/index.ts` — exporta la instancia activa (`authProvider`) que consumen los componentes; cambiar de librería mañana = escribir otro adaptador y cambiar esta línea.
  - `lib/auth/password.ts` — validador puro del formato de contraseña (reutilizable en cliente y servidor).
- **Registro** (`/acceso`, pestaña "Crear cuenta"): alias + email + contraseña, con validación de contraseña en vivo y su explicación visible. Tras registrarse, exige **verificar el email** antes del primer login.
- **Login con dos métodos** en `/acceso`, elegibles con un selector amigable (toggle):
  - **Email + contraseña.**
  - **OTP al email**: código de 6 dígitos, expira 10 min, reenvío con cooldown 60 s, solo cuentas existentes.
- **Recuperación de contraseña**: enlace "¿Olvidaste tu contraseña?" → `resetPasswordForEmail` → página nueva `/acceso/recuperar` donde se define la nueva clave.
- **Sesión real**: reescribir `components/session-provider.tsx` para que `useSession()` lea la sesión de Supabase Auth (vía `lib/auth/`) en lugar del mock de `localStorage`.
- **Navbar** (`components/nav.tsx`): muestra el `display_name` del usuario autenticado y un botón de cerrar sesión; estado no autenticado muestra acceso.
- **`player_name`**: al guardar score se usa el `display_name` del usuario autenticado (ya no texto libre).
- **Protección de ruta**: `/jugar/[id]` exige sesión; si no hay, redirige a `/acceso` (con retorno a la ruta original tras autenticarse).
- **Email de auth** vía **Resend** configurado como SMTP propio en Supabase.
- **Botones Google/GitHub** en `/acceso`: visibles pero **deshabilitados** con etiqueta "próximamente".
- Eliminar el **modo invitado** (botón "Jugar como invitado") y el mock de `localStorage` (`av_user`).

**Fuera de alcance (para futuros specs):**

- **OAuth real** (Google/GitHub funcionando). Solo quedan los botones deshabilitados.
- **Vincular scores a un `user_id`** (FK) y migrar el esquema de `scores`: aquí `player_name` sigue siendo texto, solo cambia su origen (el alias autenticado).
- Página de **perfil de usuario** / edición de alias o avatar.
- **Roles/permisos** o panel de administración.
- Proteger rutas distintas de `/jugar/[id]` (el resto del sitio sigue público).
- Migrar usuarios del mock anterior (no hay usuarios reales que migrar; el mock era local).
- Segundo adaptador de auth (BetterAuth u otro): la interfaz queda lista, pero no se implementa otro proveedor aquí.

---

## Modelo de datos

Esta feature **no crea tablas nuevas** en el esquema `public`. Supabase Auth gestiona su propio esquema `auth` (usuarios, sesiones, tokens) de forma interna; no lo tocamos ni leemos directamente. La tabla `scores` **no cambia** su esquema (`player_name` sigue siendo `text`; solo cambia su origen en tiempo de escritura).

Las estructuras que sí aparecen son tipos de TypeScript en la capa de auth y el contrato de metadatos del usuario.

**Metadatos del usuario (Supabase `user_metadata`):**

```ts
// Lo que guardamos en auth.users.user_metadata al registrar
type UserMetadata = {
  display_name: string; // alias del jugador; navbar + player_name. 1..24 chars
};
```

**Tipos de la capa desacoplada (`lib/auth/types.ts`):**

```ts
export type AuthUser = {
  id: string; // auth.users.id (uuid)
  email: string;
  displayName: string; // = user_metadata.display_name
  emailVerified: boolean;
};

export type AuthResult =
  | { ok: true; user: AuthUser | null }
  | { ok: false; error: AuthErrorCode };

// Códigos estables propios — NO se filtran mensajes crudos de Supabase a la UI
export type AuthErrorCode =
  | "invalid_credentials"
  | "email_not_verified"
  | "user_not_found"
  | "otp_invalid"
  | "otp_expired"
  | "rate_limited"
  | "weak_password"
  | "email_taken"
  | "unknown";

export interface AuthProvider {
  signUp(p: {
    email: string;
    password: string;
    displayName: string;
  }): Promise<AuthResult>;
  signInWithPassword(p: {
    email: string;
    password: string;
  }): Promise<AuthResult>;
  signInWithOtp(p: { email: string }): Promise<AuthResult>; // shouldCreateUser: false
  verifyOtp(p: { email: string; token: string }): Promise<AuthResult>;
  resetPassword(p: { email: string }): Promise<AuthResult>; // envía enlace
  updatePassword(p: { password: string }): Promise<AuthResult>; // tras enlace de reset
  signOut(): Promise<void>;
  getSession(): Promise<AuthUser | null>;
  onChange(cb: (user: AuthUser | null) => void): () => void; // para useSyncExternalStore
}
```

**Resultado de validación de contraseña (`lib/auth/password.ts`):**

```ts
type PasswordCheck = {
  valid: boolean;
  rules: {
    length: boolean; // 10..16
    lower: boolean; // >=1 minúscula
    upper: boolean; // >=1 mayúscula
    digit: boolean; // >=1 dígito
    special: boolean; // >=1 de: ! @ # $ % & * _ - . ?
    noSpace: boolean; // sin espacios
  };
};
// Conjunto especial permitido (cerrado): ! @ # $ % & * _ - . ?
// Regex de especiales: /[!@#$%&*_\-.?]/
```

**Convenciones:**

- El `display_name` se trunca/valida a 1..24 caracteres (consistente con el CHECK de `scores.player_name`).
- La UI nunca muestra el mensaje de error crudo de Supabase: siempre mapea a un `AuthErrorCode` y de ahí a un texto en español.
- Variables de entorno: se reutilizan `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. El SMTP de Resend se configura **en el panel de Supabase Auth** (`RESEND_API_KEY` se introduce ahí, no requiere variable nueva en la app).

---

## Plan de implementación

> Antes de tocar código de rutas/proxy, leer la guía correspondiente en `node_modules/next/dist/docs/01-app/` (auth, proxy, server actions) — Next.js 16 difiere del App Router conocido.

1. **Configurar Supabase Auth + SMTP Resend (consola, sin código de app).** En el panel de Supabase: activar email+password, configurar SMTP propio con Resend, plantillas de confirmación/OTP/reset en español, y la regla de "confirm email" activada. Test manual: registrar un email de prueba desde el dashboard y ver que llega el correo por Resend.

2. **`lib/auth/password.ts`.** Validador puro `checkPassword(pw): PasswordCheck`. Sin dependencias de React/Supabase. Test manual: comprobar casos límite (9, 10, 16, 17 chars; sin especial; con espacio).

3. **`lib/auth/types.ts`.** Definir `AuthUser`, `AuthResult`, `AuthErrorCode`, `AuthProvider`, `UserMetadata`. Solo tipos; compila sin lógica.

4. **`lib/auth/supabase-auth.ts` + `lib/auth/index.ts`.** Implementar `AuthProvider` sobre el cliente browser de Supabase (`lib/supabase/client.ts`), mapeando errores de Supabase a `AuthErrorCode`. `index.ts` exporta `authProvider` (instancia activa). Test manual: invocar `signUp` y verificar que crea el usuario.

5. **Reescribir `components/session-provider.tsx`.** `useSession()` pasa a exponer la sesión real vía `authProvider.getSession()` + `onChange()` (sigue usando `useSyncExternalStore`). Quitar el mock de `localStorage` `av_user`. Mantener la firma `{ user, signOut }` y añadir lo que necesiten los componentes. Test manual: con un usuario logueado, recargar y ver que la sesión persiste.

6. **`components/auth.tsx` — registro.** Pestaña "Crear cuenta": campos alias + email + contraseña; mostrar en vivo las 6 reglas de contraseña (✓/✗) y el texto explicativo del formato. Al enviar: `authProvider.signUp(...)`; si ok, mostrar pantalla "revisa tu correo para verificar". Test manual: registrar, ver checklist reactivo, recibir email de verificación, confirmar y poder loguear.

7. **`components/auth.tsx` — login con selector de método.** Toggle amigable "Contraseña / Código por email":
   - **Contraseña:** email + password → `signInWithPassword`; si `email_not_verified`, mostrar aviso y opción de reenviar verificación.
   - **OTP:** email → `signInWithOtp` → pantalla de ingreso de código de 6 dígitos → `verifyOtp`; botón reenviar con cooldown 60 s; expira 10 min.
   - En éxito: redirigir al `redirect` de la query (o `/games` por defecto).
     Test manual: loguear por ambos métodos; probar código inválido/expirado.

8. **Recuperación de contraseña.** En `/acceso`, enlace "¿Olvidaste tu contraseña?" → pide email → `resetPassword`. Nueva ruta `app/acceso/recuperar/page.tsx` (+ componente) que, tras el enlace del email, llama `updatePassword` con la misma validación de formato. Test manual: solicitar reset, abrir enlace, definir nueva clave, loguear con ella.

9. **Eliminar invitado y limpiar mock.** Quitar el botón "Jugar como invitado" y cualquier rastro de `av_user`/login falso. Botones Google/GitHub: dejarlos **deshabilitados** con etiqueta "próximamente". Test manual: no existe camino para entrar sin cuenta.

10. **Navbar (`components/nav.tsx`).** Mostrar `display_name` + botón cerrar sesión cuando hay sesión; mostrar acceso cuando no. `signOut` redirige a `/acceso`. Test manual: el alias aparece tras loguear y desaparece tras cerrar sesión.

11. **`player_name` desde la sesión.** Donde se guarda score (flujo de `saveScore` / modal de guardar puntuación), tomar el `display_name` del usuario autenticado en vez de texto libre. Test manual: jugar Tetris/Asteroids, guardar score, verificar que el nombre en el leaderboard es el alias.

12. **Proteger `/jugar/[id]` en `proxy.ts`.** Añadir a la lógica del proxy (que ya refresca sesión) la regla: si la ruta casa `/jugar/:id` y no hay sesión, redirigir a `/acceso?redirect=<ruta>`. Test manual: visitar `/jugar/tetris` sin sesión → redirige a `/acceso`; tras loguear, vuelve a `/jugar/tetris`.

13. **Repaso final: lint + build.** `npm run lint` y `npm run build` en verde; revisar que no queden imports del mock eliminado ni tipos huérfanos.

---

## Criterios de aceptación

**Registro**

- [ ] La pestaña "Crear cuenta" pide alias, email y contraseña.
- [ ] El checklist de contraseña muestra las 6 reglas y cada una cambia ✓/✗ en vivo al teclear.
- [ ] El formato exacto de la contraseña se explica en pantalla en texto legible.
- [ ] Una contraseña de 9 caracteres es rechazada; una de 17 también.
- [ ] Una contraseña sin mayúscula, sin minúscula, sin dígito o sin carácter especial es rechazada.
- [ ] Una contraseña con espacio es rechazada.
- [ ] Un carácter especial fuera del conjunto `! @ # $ % & * _ - . ?` no cuenta como especial válido.
- [ ] Registrarse con un email ya existente muestra un error claro en español (no el mensaje crudo de Supabase).
- [ ] Tras registrarse, se muestra el mensaje de "verifica tu correo" y **no** se inicia sesión hasta verificar.
- [ ] Llega un correo de verificación enviado vía Resend (remitente del dominio configurado).

**Login por contraseña**

- [ ] Con email + contraseña correctos y email verificado, se inicia sesión y redirige a `/games` (o al `redirect` indicado).
- [ ] Con credenciales incorrectas se muestra error en español sin filtrar el mensaje de Supabase.
- [ ] Con un email registrado pero **no verificado**, se bloquea el login y se ofrece reenviar la verificación.

**Login por OTP**

- [ ] El selector permite cambiar entre "Contraseña" y "Código por email".
- [ ] Al pedir OTP de un email existente, llega un código de 6 dígitos por Resend.
- [ ] Un OTP correcto inicia sesión; uno incorrecto muestra error `otp_invalid`.
- [ ] Un OTP usado después de 10 min muestra error `otp_expired`.
- [ ] El botón "Reenviar código" queda en cooldown 60 s tras pulsarlo.
- [ ] Pedir OTP para un email **no registrado** no crea cuenta y no inicia sesión.

**Recuperación de contraseña**

- [ ] El enlace "¿Olvidaste tu contraseña?" envía un correo de restablecimiento vía Resend.
- [ ] El enlace del correo lleva a `/acceso/recuperar`.
- [ ] En `/acceso/recuperar` la nueva contraseña se valida con el mismo formato (mismas 6 reglas).
- [ ] Tras definir la nueva contraseña, se puede iniciar sesión con ella.

**Sesión, navbar y player_name**

- [ ] El navbar muestra el `display_name` cuando hay sesión y la opción de acceso cuando no.
- [ ] Cerrar sesión limpia la sesión y redirige a `/acceso`.
- [ ] Recargar la página con sesión activa mantiene al usuario autenticado.
- [ ] Al guardar un score, el `player_name` en el leaderboard es el `display_name` del usuario autenticado (no editable como texto libre).

**Protección de ruta y limpieza**

- [ ] Visitar `/jugar/[id]` sin sesión redirige a `/acceso?redirect=/jugar/[id]`.
- [ ] Tras iniciar sesión desde esa redirección, se vuelve a `/jugar/[id]`.
- [ ] El resto de rutas (`/`, `/games`, `/salon`, `/acerca`, `/juego/[id]`) siguen siendo públicas.
- [ ] No existe ningún camino para entrar sin cuenta (botón "Jugar como invitado" eliminado).
- [ ] No queda código ni claves del mock anterior (`av_user`, login falso).
- [ ] Los botones Google/GitHub aparecen deshabilitados con etiqueta "próximamente".

**Calidad**

- [ ] `npm run lint` pasa sin errores.
- [ ] `npm run build` compila sin errores.
- [ ] Ningún componente cliente importa `lib/supabase/server.ts` ni `lib/games-data.ts`.
- [ ] Los componentes de UI consumen auth solo a través de `lib/auth/` (no llaman a `supabase.auth` directamente).

---

## Decisiones

- **Sí:** Supabase Auth como proveedor. La infraestructura ya existe (`proxy.ts` ya refresca la sesión; clientes server/browser ya configurados) y todo lo pedido es nativo (password, OTP, reset, verificación). Cero tablas nuevas.
- **No:** BetterAuth. Exigiría tablas propias + adaptador + conexión directa a Postgres y un esquema separado para no chocar con el `auth` nativo de Supabase, duplicando el sistema de sesión sin ganancia. Considerado y descartado para esta entrega.
- **Sí:** capa desacoplada `lib/auth/` con interfaz `AuthProvider` + adaptador. El requisito de "poder cambiar de librería mañana" lo resuelve la abstracción, no la elección de proveedor. Migrar a BetterAuth después = escribir un segundo adaptador detrás de la misma interfaz.
- **Sí:** el email es el identificador de login. El OTP por email es un método **alternativo** adicional, no el principal.
- **Sí:** alias propio en `user_metadata.display_name` (1..24 chars) para el navbar y `player_name`. Descartado derivarlo de la parte local del email (genera alias feos).
- **Sí:** verificación de email obligatoria antes del primer login. Coherente con "si el OTP es válido el usuario es verificado y puede entrar".
- **Sí:** recuperación por **enlace** de restablecimiento → `/acceso/recuperar`. Descartado el reset por OTP (más pasos para el usuario).
- **Sí:** correos de auth vía **Resend** como SMTP propio en Supabase. Descartado el SMTP integrado de Supabase (limitado en volumen y con remitente genérico).
- **Sí:** eliminar el modo invitado. Todo exige cuenta existente.
- **No (por ahora):** atar `scores` a un `user_id` (FK). `player_name` sigue siendo texto; solo cambia su origen. La FK va en otro spec si se decide.
- **No (por ahora):** OAuth real. Los botones Google/GitHub quedan deshabilitados con etiqueta "próximamente" para señalar la intención sin botones muertos.
- **Sí:** errores de auth mapeados a `AuthErrorCode` propios; la UI nunca muestra el mensaje crudo de Supabase.

---

## Riesgos

| Riesgo                                                                                                                        | Mitigación                                                                                                                                                           |
| ----------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| SMTP de Resend mal configurado en Supabase → no llegan correos de verificación/OTP/reset.                                     | El paso 1 del plan es probar el envío desde el dashboard **antes** de escribir código. Toda la feature depende de esto.                                              |
| El refresco de sesión en `proxy.ts` y la protección de ruta entran en conflicto o crean bucles de redirección.                | Leer la guía de proxy/auth de Next.js 16 antes (paso 12); la redirección solo aplica a `/jugar/:id` y añade `?redirect=` para volver, evitando bucles.               |
| Acoplamiento accidental: un componente llama a `supabase.auth` directamente y rompe el desacople.                             | Criterio de aceptación explícito: la UI consume auth solo vía `lib/auth/`. Revisar en el repaso final.                                                               |
| Límites de tasa de Supabase Auth (envío de OTP/reset) generan errores opacos.                                                 | Mapear a `rate_limited` y mostrar mensaje en español; el cooldown de 60 s en reenvío reduce los disparos.                                                            |
| La política de contraseña del panel de Supabase difiere de la regla de `password.ts` y rechaza/acepta de forma inconsistente. | Alinear la config de Supabase con la regla 10–16 + tipos; la validación de cliente es la fuente de verdad de UX y `password.ts` se reutiliza en `/acceso/recuperar`. |

---

## Lo que **no** entra en este spec

- OAuth real (Google/GitHub funcionando) — solo botones deshabilitados.
- FK de `scores` a `user_id` y migración del esquema de scores.
- Página de perfil / edición de alias o avatar.
- Roles, permisos o panel de administración.
- Protección de rutas distintas de `/jugar/[id]`.
- Implementar un segundo adaptador de auth (BetterAuth u otro).

Cada uno de estos, si se aborda, va en su propio spec.
