# Spec 03 — Página "Acerca de" + envío de correo de contacto

**Estado:** Implementado
**Fecha:** 2026-06-15
**Dependencias:** Spec 01 (tema/CSS base, `lib/data.ts`, nav, sesión) · Spec 02 (Home, nav reorganizado con "Acerca de" como placeholder inerte)
**Objetivo (una frase):** Portar la página "Acerca de" del prototipo (`references/templates/home-about/about.jsx`) a la ruta `/acerca` en Next.js 16, con un formulario de contacto que envía correos reales vía Resend usando un Server Action.

---

> ## Nota de seguridad (resolver durante la implementación)
> Hay una **API key de Resend expuesta en `README.md`** (`re_KquQ7…`). Debe **eliminarse del README**, moverse a `.env` como `RESEND_API_KEY`, y **rotarse en el panel de Resend** porque ya quedó en el historial de git. El spec asume `.env` como única fuente de la key (`.env*` ya está en `.gitignore`).

## 1. Por qué existe este spec

El Spec 02 dejó "Acerca de" como enlace **inerte/atenuado** en el nav y aplazó explícitamente la página y su CSS. Este spec cierra ese pendiente: crea la ruta, porta el diseño y, además, convierte el formulario de contacto (que en el prototipo solo simula el envío con una animación de terminal) en un **envío real de correo** mediante Resend.

---

## 2. Alcance

**Dentro:**

- **Nueva ruta `/acerca`** — `app/acerca/page.tsx` renderiza un nuevo `components/about.tsx`.
- **`components/about.tsx`** (`"use client"`) portado de `about.jsx`, con dos secciones:
  1. **Hero "Acerca de"** — kicker "▸ ACERCA DE", título, misión, y `highlight-row` de 3 tarjetas con iconos pixel SVG (`HighlightIcon`: HEART/BROWSER/PLANT).
  2. **Divisor animado** (`about-divider` con 24 píxeles parpadeantes).
  3. **Contacto** — `contact-grid`: intro + tips a la izquierda, formulario a la derecha (NOMBRE, CORREO, MENSAJE) con botón "ENVIAR MENSAJE".
- **Server Action de envío** — nuevo `app/acerca/actions.ts` (`"use server"`) con `sendContactMessage(data)` que:
  - Valida en servidor que `name`, `email` y `msg` no estén vacíos y que `email` tenga formato válido.
  - Envía el correo con Resend (`resend.emails.send`).
  - Devuelve `{ ok: true }` o `{ ok: false, error }`.
- **Dependencia nueva:** paquete `resend` (`npm i resend`).
- **Variables de entorno** en `.env` (y placeholder en `.env.template`): `RESEND_API_KEY` y `CONTACT_TO_EMAIL`.
- **Configuración de envío confirmada:**
  - `to`: `juan@collantes.ec` (vía `CONTACT_TO_EMAIL`).
  - `from`: `Arcade Vault <onboarding@resend.dev>` (sandbox de Resend, sin dominio verificado).
  - `replyTo`: el email que escribe el usuario en el formulario.
- **Estados de UX del formulario:**
  - *idle*: formulario visible.
  - *validación vacía* (cliente): animación `shake` (comportamiento ya existente en el prototipo).
  - *enviando*: botón deshabilitado con texto "ENVIANDO…".
  - *éxito*: pantalla `terminal-success` (las líneas "Conectando/Validando/Transmitiendo" se mantienen como **cosmético** tras el envío real correcto); botón "ENVIAR OTRO MENSAJE" reinicia el formulario.
  - *error*: pantalla de **terminal de error** (variante roja con líneas `[ERROR]`) y botón "REINTENTAR" que vuelve al formulario conservando los datos escritos.
- **Activar "Acerca de" en el nav** (`components/nav.tsx`): convertir el `<span>` inerte (desktop y panel móvil) en `<Link href="/acerca">` con estado activo `isAbout = pathname.startsWith("/acerca")`.
- **Portar la CSS de About** desde `references/templates/home-about/styles.css` a `app/globals.css` (ver §4) — solo los selectores de About que aún no existen.

**Fuera (para futuros specs):**

- ❌ Anti-spam (honeypot, rate-limiting, captcha) — se puede añadir luego.
- ❌ Verificación de dominio en Resend / remitente propio (`contacto@arcade-vault.gg`). Por ahora se usa el sandbox.
- ❌ Persistencia de los mensajes enviados (no se guardan en BD ni en localStorage).
- ❌ Copia/auto-respuesta al remitente, plantillas HTML elaboradas (el correo será texto/HTML mínimo).
- ❌ Tests automatizados, i18n, backend propio, motor de juego — igual que specs anteriores.
- ❌ Cambios en Home, Biblioteca, Detalle, Reproductor, Salón o Acceso.

---

## 3. Modelo de datos

**No introduce datos persistentes.** Solo estructuras efímeras en memoria:

```ts
// Estado del formulario (cliente)
type ContactForm = { name: string; email: string; msg: string };

// Resultado del Server Action
type ContactResult = { ok: true } | { ok: false; error: string };
```

El correo se construye en el servidor a partir de `ContactForm`; no se almacena en ningún lado.

---

## 4. Plan de implementación

Cada paso deja la app ejecutable (`npm run dev`).

> ⚠️ **Nota (AGENTS.md):** antes de tocar rutas/Server Actions, consultar la guía en `node_modules/next/dist/docs/01-app/` — Server Actions (`"use server"`), invocación desde client component, manejo de errores y variables de entorno (`process.env` solo en servidor).

1. **Mover la key y preparar el entorno.** Eliminar la API key de `README.md`. Añadir a `.env`: `RESEND_API_KEY=…` (la key rotada) y `CONTACT_TO_EMAIL=juan@collantes.ec`. Añadir a `.env.template` las mismas claves vacías como documentación.
   - *Verifica:* la key ya no aparece en `README.md`; `.env` no se commitea.

2. **Instalar Resend.** `npm i resend`.
   - *Verifica:* `resend` aparece en `package.json` y el build sigue corriendo.

3. **Portar la CSS de About** a `app/globals.css` (al final): `.about`, `.about-hero`, `.about-title`, `.about-mission`, `.highlight-row`, `.highlight`(+`.cyan/.magenta/.green` y `:hover`), `.hl-icon`, `.hl-text`, `.about-divider`, `.div-bar`, `.div-pixels`(+`:nth-child`), `@keyframes pxblink`, `.about-contact`, `.contact-grid`, `.contact-intro .kicker`, `.contact-title`, `.contact-sub`, `.contact-tips`, `.tip`, `.tip-led`(+`.y/.m`), `.contact-form`(+`::before`, `.shake`), `@keyframes shake`, `.contact-form textarea`(+`:focus`, `::placeholder`), `.terminal-success`, `.term-bar`(+`.dot.r/.y/.g`, `.term-title`), `.term-body`(+`.line`, `.prompt`, `.dim`, `.success`, `.caret`), y sus media queries. **Reutilizar** lo ya existente: `.field`, `.fade-in`, `@keyframes blink`, `.btn.xl`, `.btn.press`, `.btn.ghost`, `.kicker`, `.pixel`, `neon-*`. **Añadir** una variante mínima `terminal-error` (borde/líneas rojas reutilizando el layout del terminal) para el estado de error.
   - *Verifica:* las clases existen y no rompen el build.

4. **Crear el Server Action** `app/acerca/actions.ts` (`"use server"`): inicializa `new Resend(process.env.RESEND_API_KEY)`, valida los campos, llama a `resend.emails.send({ from: "Arcade Vault <onboarding@resend.dev>", to: process.env.CONTACT_TO_EMAIL, replyTo: data.email, subject, html/text })`, y devuelve `ContactResult`. Captura errores y los mapea a `{ ok: false, error }`.
   - *Verifica:* tipo correcto; sin uso de `process.env` en cliente.

5. **Crear `components/about.tsx`** (`"use client"`): portar el JSX (hero + highlights + divider + contacto + `HighlightIcon`). Estado con `useState` para `form`, `status` (`idle|sending|success|error`), `shake` y `errorMsg`. `onSubmit`: valida vacíos → `shake`; si ok, pasa a `sending`, invoca el Server Action (con `startTransition`/`useTransition`), y según el resultado pone `success` o `error`. Reusar el observer `IntersectionObserver` para `.reveal` (duplicado inline como en el prototipo). Pantallas `terminal-success` y `terminal-error` con sus botones de reinicio/reintento.
   - *Verifica:* `/acerca` muestra el diseño; enviar con campos válidos dispara el envío real.

6. **Crear `app/acerca/page.tsx`** que renderiza `<About />` (+ `metadata` con título "Acerca de · Arcade Vault").
   - *Verifica:* navegar a `/acerca` carga la página.

7. **Activar el enlace en el nav** (`components/nav.tsx`): reemplazar el `<span>` "Acerca de" (desktop y móvil) por `<Link href="/acerca">`; añadir `const isAbout = pathname.startsWith("/acerca")` y aplicar `className={isAbout ? "active" : ""}`.
   - *Verifica:* "Acerca de" navega a `/acerca` y se resalta como activo; el resto de estados del nav siguen correctos.

**Archivos que aparecen o cambian:**
- Nuevos: `app/acerca/page.tsx`, `app/acerca/actions.ts`, `components/about.tsx`
- Modificados: `app/globals.css` (CSS de About), `components/nav.tsx`, `.env`, `.env.template`, `README.md`, `package.json`/`package-lock.json` (dependencia `resend`)

---

## 5. Criterios de aceptación (checklist booleana)

- [ ] `npm run dev` y `npm run build` terminan sin errores ni warnings de lint.
- [ ] `/acerca` muestra el hero "Acerca de" (kicker, título, misión, 3 highlights con iconos pixel) y el divisor animado.
- [ ] La sección de contacto muestra intro + 3 tips + formulario (NOMBRE, CORREO, MENSAJE).
- [ ] Enviar con algún campo vacío dispara `shake` y NO envía correo.
- [ ] Enviar con los tres campos válidos muestra "ENVIANDO…" y luego la pantalla `terminal-success`.
- [ ] El correo llega a `juan@collantes.ec` con el contenido del formulario y `replyTo` = email del remitente.
- [ ] Si el envío falla (key inválida/red), se muestra la pantalla de **terminal de error** con botón "REINTENTAR" que conserva los datos.
- [ ] "ENVIAR OTRO MENSAJE" en el éxito reinicia el formulario vacío.
- [ ] La `RESEND_API_KEY` NO aparece en `README.md` ni en ningún archivo commiteado; vive solo en `.env`.
- [ ] El nav muestra "Acerca de" como enlace **activo y clicable** (desktop y móvil), resaltado en `/acerca`.
- [ ] Las secciones aparecen con efecto `reveal` al hacer scroll y el diseño es responsive por debajo de 900px (contact-grid y highlight-row se apilan).

---

## 6. Decisiones tomadas y descartadas

- **Sí:** envío vía **Server Action** (`app/acerca/actions.ts`). *Motivo:* idiomático en Next 16, la key nunca llega al cliente, sin endpoint público. **No:** Route Handler `/api/contact` (más boilerplate y superficie expuesta).
- **Sí:** remitente **sandbox** `onboarding@resend.dev`. *Motivo:* funciona sin verificar dominio para el MVP. **No:** dominio propio verificado (otro spec si se necesita entregar a cualquier destinatario en producción).
- **Sí:** destinatario `juan@collantes.ec` vía `CONTACT_TO_EMAIL`. *Motivo:* configurable sin tocar código.
- **Sí:** pantalla **terminal de error** coherente con el éxito. *Motivo:* fidelidad estética. **No:** mensaje inline simple.
- **Sí:** mantener las líneas "Conectando/Validando/Transmitiendo" como **cosmético** tras el envío real. *Motivo:* fidelidad al prototipo; el envío real ya ocurrió.
- **Sí:** observer de `.reveal` **duplicado inline** en `about.tsx`. *Motivo:* el prototipo lo hace así y evita refactorizar `home.tsx`. **No:** extraer un hook compartido (refactor fuera de alcance).
- **Sí:** validación en cliente **y** servidor. *Motivo:* el cliente da feedback inmediato (`shake`), el servidor es la fuente de verdad.
- **No:** persistir mensajes ni anti-spam. *Motivo:* fuera de alcance; otro spec si llega.

---

## 7. Riesgos identificados

| Riesgo | Mitigación |
| --- | --- |
| **Sandbox de Resend solo entrega al correo de la cuenta.** `onboarding@resend.dev` normalmente solo entrega al email registrado en la cuenta de Resend; si la cuenta no es `juan@collantes.ec`, el correo puede no llegar. | Verificar a qué correo está asociada la cuenta de Resend; si no coincide, verificar un dominio propio (otro spec) o usar el email de la cuenta como destinatario de prueba. |
| **API key ya filtrada en git.** La key en `README.md` quedó en el historial. | Rotarla en Resend y mover la nueva a `.env`; el paso 1 la elimina del README. |
| **`"use server"` mal ubicado** rompería el build o filtraría la key al bundle cliente. | Server Action en archivo propio `actions.ts`; `process.env` solo dentro de él; consultar docs de Next 16. |
| **Choques CSS About vs Tailwind v4.** | Mantener la CSS de About como CSS plano al final de `globals.css`, igual que specs 01/02. |

---

## Lo que **no** está en este spec

- Anti-spam (honeypot, rate-limiting, captcha).
- Dominio remitente verificado en Resend.
- Persistencia/registro de mensajes y auto-respuesta al remitente.
- Cambios en otras pantallas más allá de activar el enlace del nav.

Cada uno, si llega, va en su propio spec.
