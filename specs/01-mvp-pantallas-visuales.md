# Spec 01 — MVP visual: todas las pantallas de Arcade Vault

**Estado:** Implementado
**Fecha:** 2026-06-14
**Dependencias:** ninguna (primera spec del proyecto)
**Objetivo (una frase):** Portar las cinco pantallas del prototipo (biblioteca, detalle, reproductor, salón de la fama, acceso) más navbar y auth a Next.js 16 con App Router, React 19 y Tailwind v4, con datos y persistencia mock en localStorage, **sin motor de juego real**.

---

## 2. Alcance

**Dentro:**

- **Tema global neón/CRT** portado desde `references/templates/styles.css`: variables (`--cyan`, `--magenta`, `--bg`…) mapeadas a tokens `@theme inline` y el resto de clases (`.card`, `.av-nav`, `.crt`, coberturas CSS…) en CSS global. Fuentes *Press Start 2P* y *JetBrains Mono*.
- **Modelo de datos** `GAMES`, `CATS`, `seededScores()` portado a un módulo TypeScript.
- **Layout raíz**: fondo (`av-bg`, `av-noise`), navbar sticky con panel móvil, footer.
- **5 rutas App Router** (slugs en español):
  - `/` → Biblioteca
  - `/juego/[id]` → Detalle
  - `/jugar/[id]` → Reproductor
  - `/salon` → Salón de la Fama
  - `/acceso` → Acceso
- **Biblioteca**: hero, buscador, chips de categoría, grid de tarjetas con efecto tilt 3D, estado vacío.
- **Detalle**: cover, tags, descripción larga, stat-strip, botones de acción, leaderboard por juego.
- **Reproductor**: HUD (puntuación/vidas/nivel), arena CRT animada, **ticker mock** de puntuación, pausa, modal de fin de juego con guardar puntuación.
- **Salón de la Fama**: tabs por juego, podio (oro/plata/bronce), tabla, fila "tú" si hay sesión.
- **Acceso**: tabs iniciar/crear, formulario mock, "jugar como invitado", botones sociales decorativos.
- **Estado de sesión + puntuaciones** en `localStorage` (`av_user`, `av_scores`) vía un contexto cliente compartido entre rutas.
- **Responsive** con los breakpoints existentes del prototipo.

**Fuera (explícito):**

- ❌ Cualquier motor o lógica de juego real (la "jugabilidad" es solo el ticker/arena decorativos).
- ❌ Backend real, autenticación real, validación de credenciales, base de datos.
- ❌ Leaderboard real: las puntuaciones se **escriben** en localStorage pero los marcadores siguen siendo `seededScores()` mock (no se leen de vuelta).
- ❌ Login social real (Google/GitHub son decorativos).
- ❌ Tests (no hay runner configurado), i18n/multi-idioma, optimización de imágenes (las portadas son CSS puro).

---

## 3. Modelo de datos

No se introducen estructuras nuevas respecto al prototipo; se **portan a TypeScript** y se tipan. Ubicación: `lib/data.ts` (alias `@/lib/data`).

```ts
type Category = "ARCADE" | "PUZZLE" | "SHOOTER" | "VERSUS";

type Game = {
  id: string;          // "bloque-buster"
  title: string;       // "BLOQUE BUSTER"
  short: string;
  long: string;
  cat: Category;
  cover: string;       // clase CSS de portada: "cover-bricks"
  color: "cyan" | "magenta" | "yellow" | "green";
  best: number;
  plays: string;       // "12.4K"
};

type ScoreRow = { rank: number; name: string; score: number; date: string };

const GAMES: Game[];                  // los 8 juegos del prototipo
const CATS: readonly string[];        // ["TODOS","ARCADE","PUZZLE","SHOOTER","VERSUS"]
function seededScores(seed: number, count?: number): ScoreRow[]; // determinista, idéntico al prototipo
```

**Persistencia (localStorage, vía contexto cliente en `components/session-provider.tsx`):**

```ts
// clave "av_user"
type StoredUser = { name: string } | null;

// clave "av_scores"  (se escribe al guardar puntuación; no se lee de vuelta en el MVP)
type StoredScore = { game: string; score: number; name: string; at: number };
```

El `SessionProvider` expone `useSession()` → `{ user, login, signOut, saveScore }`, replicando los handlers de `app.jsx` (`handleLogin`, `handleSignOut`, `handleSaveScore`).

---

## 4. Plan de implementación

Cada paso deja la app ejecutable (`npm run dev`).

1. **Tema y fuentes.** Portar `references/templates/styles.css` a `app/globals.css` (tras `@import "tailwindcss"`), mapear las variables a tokens `@theme inline`, cargar *Press Start 2P* y *JetBrains Mono* (`next/font/google`). Reemplazar el boilerplate de `app/globals.css`.
   - *Verifica:* el fondo neón/grid/scanlines aparece en `/`.

2. **Modelo de datos.** Crear `lib/data.ts` con los tipos, `GAMES`, `CATS` y `seededScores` portados literalmente.

3. **Layout raíz + sesión.** `app/layout.tsx` con `lang="es"`, metadata, `av-bg`/`av-noise`, footer y el `SessionProvider`. Crear `components/nav.tsx` (client) con `next/link`, enlaces activos según `usePathname()` y panel móvil.
   - *Verifica:* navbar sticky y footer en todas las rutas; login mock persiste tras recargar.

4. **Biblioteca → `app/page.tsx`.** `components/library.tsx` (client: búsqueda + filtro `useMemo`) y `components/game-card.tsx` (client: tilt 3D), navegando a `/juego/[id]`.

5. **Detalle → `app/juego/[id]/page.tsx`.** Server component: `params` es async (Next 16), busca el juego, `notFound()` si no existe, genera leaderboard con `seededScores`. `components/game-detail.tsx`.

6. **Reproductor → `app/jugar/[id]/page.tsx`.** `components/game-player.tsx` (client): HUD, arena CRT, ticker `setInterval`, pausa, modal de fin con guardar puntuación vía `useSession().saveScore`.

7. **Salón → `app/salon/page.tsx`.** `components/hall-of-fame.tsx` (client): tabs por juego, podio, tabla animada y fila "tú" si hay sesión.

8. **Acceso → `app/acceso/page.tsx`.** `components/auth.tsx` (client): tabs iniciar/crear, formulario mock, invitado y sociales decorativos; al enviar → `login()` + `router.push("/")`.

9. **Pulido y navegación cruzada.** Estados activos del nav, scroll-to-top entre rutas, repaso responsive, eliminar restos del boilerplate de `create-next-app`.

> ⚠️ **Nota (AGENTS.md):** antes de escribir cada ruta/componente, consultar la guía correspondiente en `node_modules/next/dist/docs/01-app/` — `params` async, límites RSC/`"use client"`, `next/font`, metadata.

**Archivos que aparecen o cambian:**
- Modificados: `app/globals.css`, `app/layout.tsx`, `app/page.tsx`
- Nuevos: `lib/data.ts`, `components/session-provider.tsx`, `components/nav.tsx`, `components/library.tsx`, `components/game-card.tsx`, `components/game-detail.tsx`, `components/game-player.tsx`, `components/hall-of-fame.tsx`, `components/auth.tsx`, `app/juego/[id]/page.tsx`, `app/jugar/[id]/page.tsx`, `app/salon/page.tsx`, `app/acceso/page.tsx`

---

## 5. Criterios de aceptación (checklist booleana)

- [ ] `npm run dev` y `npm run build` terminan sin errores ni warnings de lint.
- [ ] Existen y resuelven las 5 rutas: `/`, `/juego/[id]`, `/jugar/[id]`, `/salon`, `/acceso`.
- [ ] El fondo neón (grid en perspectiva + scanlines + ruido) y las fuentes pixel/mono se ven en todas las rutas.
- [ ] **Biblioteca**: el buscador filtra por título y los chips filtran por categoría; con 0 resultados se muestra "NO HAY RESULTADOS"; las tarjetas tienen tilt al pasar el ratón.
- [ ] Clic en una tarjeta / "JUGAR" navega a `/juego/[id]`; "JUGAR AHORA" navega a `/jugar/[id]`.
- [ ] **Detalle**: muestra portada, tags, descripción larga, stat-strip (partidas/mejor/dificultad) y leaderboard de 10 filas con top1/2/3 coloreados. Un `id` inexistente da 404.
- [ ] **Reproductor**: el ticker incrementa la puntuación; "PAUSA"/"REANUDAR" detiene/reanuda; "FIN" abre el modal con la puntuación final; "GUARDAR PUNTUACIÓN" escribe en `av_scores` y muestra el toast; "JUGAR DE NUEVO" reinicia.
- [ ] **Salón**: los tabs cambian el juego, se renderizan podio + tabla; si hay sesión aparece la fila "tú" resaltada.
- [ ] **Acceso**: tabs iniciar/crear; enviar el formulario crea sesión mock y redirige a `/`; "jugar como invitado" entra sin usuario.
- [ ] La sesión (`av_user`) persiste tras recargar; el nav muestra el nombre y permite cerrar sesión.
- [ ] El nav resalta el enlace activo y el panel móvil funciona por debajo de 840px; el layout es responsive en las 5 pantallas.

---

## 6. Decisiones tomadas y descartadas

- **Navegación: rutas App Router reales** (descartado: hash-routing del prototipo). *Motivo:* lo pide CLAUDE.md, da URLs compartibles y es la convención de Next 16.
- **Persistencia: localStorage mock** (descartado: solo memoria / sin estado). *Motivo:* completa la UX de login y guardado sin backend, fiel al prototipo.
- **Estilos: portar el CSS global tal cual + tokens `@theme`** (descartado: reescribir en utilidades Tailwind). *Motivo:* fidelidad del efecto neón/CRT y mucho menos riesgo/esfuerzo para un MVP.
- **Reproductor: mantener el mock animado** (descartado: pantalla estática). *Motivo:* es decoración interactiva, no un juego; completa la experiencia visual.
- **Leaderboards permanecen mock con `seededScores`** y `av_scores` es write-only (descartado: leer puntuaciones guardadas). *Motivo:* preservar la fidelidad del prototipo; un leaderboard real es otra spec.

---

## 7. Riesgos identificados

- **Tailwind v4 + CSS portado**: clases utilitarias y el CSS a mano conviven; vigilar choques de `@layer`/especificidad. *Mitigación:* mantener el tema en CSS plano y usar Tailwind solo donde haga falta.
- **Límites RSC/cliente en Next 16**: las pantallas interactivas necesitan `"use client"`; `params` es async en rutas dinámicas. *Mitigación:* seguir la nota del plan (leer docs antes de cada ruta).
- **Hidratación de `localStorage`**: leer storage en render inicial puede desincronizar server/cliente. *Mitigación:* inicializar el estado de sesión en `useEffect` tras montar.
