# Spec 02 — Página Home (landing)

**Estado:** Implementado
**Fecha:** 2026-06-14
**Dependencias:** Spec 01 (MVP visual: tema, `lib/data.ts`, nav, sesión y las 5 pantallas)
**Objetivo (una frase):** Portar la landing page del prototipo (`references/templates/home-about/home.jsx`) a una nueva ruta raíz `/` en Next.js 16, moviendo el grid de juegos a `/games` y reorganizando el menú, sin implementar "Acerca de".

---

## 2. Alcance

**Dentro:**

- **Nueva ruta raíz `/` → Home.** `app/page.tsx` pasa a renderizar la landing (nuevo `components/home.tsx`, client component por el efecto `reveal` con `IntersectionObserver`).
- **Mover el grid de juegos a `/games`.** El `app/page.tsx` actual (que renderiza `<Library />`) se traslada a `app/games/page.tsx`. La Biblioteca sigue existiendo igual, solo cambia de URL.
- **Las 7 secciones del diseño**, en orden, portadas desde `home.jsx`:
  1. **Hero** — eyebrow "INSERTA UNA MONEDA", título a 3 líneas, subtítulo, dos CTAs (▶ EXPLORAR JUEGOS → `/games`, ✦ CREAR CUENTA → `/acceso`), indicador "DESLIZA", y siluetas pixel flotantes (`FloatingSilhouettes`).
  2. **¿Por qué Arcade Vault?** — grid de 4 `feature-card` con iconos pixel SVG (`FeatureIcon`).
  3. **Juegos disponibles ahora** — `mini-rail` con `GAMES.slice(0, 6)` (datos reales de `lib/data`), cada `MiniCard` navega a `/juego/[id]`; botón "VER TODOS LOS JUEGOS" → `/games`.
  4. **Stats** — 3 `stat-block` (datos hardcodeados: 12+, MILES, GLOBAL).
  5. **Actividad en vivo** — dos `activity-card`: ticker de últimas puntuaciones + top jugadores; botón "VER SALÓN →" → `/salon`.
  6. **Precios + FAQ** — `price-card` (plan $0) con CTA "EMPEZAR GRATIS →" → `/acceso`, y 3 ítems de FAQ.
  7. **CTA final** — "¿LISTO PARA JUGAR?" con botón "INSERTAR MONEDA →" → `/games`.
- **Reorganización del menú** (`components/nav.tsx`): enlaces **Inicio** (`/`) · **Biblioteca** (`/games`) · **Salón de la Fama** (`/salon`) · **Acerca de** (placeholder), tanto en desktop como en el panel móvil. Lógica de estado activo actualizada con `usePathname()`.
- **"Acerca de" como placeholder inerte:** se muestra en el nav pero **deshabilitado** (atenuado, no clicable, sin navegar). No crea ruta `/acerca` ni página; eso lo hará el spec de About.
- **Actualización de los enlaces internos** que hoy apuntan a `/` con el sentido de "Biblioteca", para que apunten a `/games` (ver §4).
- **CSS de home portada** desde `references/templates/home-about/styles.css` a `app/globals.css`: todos los selectores específicos de la landing y sus animaciones/media queries (ver §4).
- **Responsive** con los breakpoints del prototipo.

**Fuera (explícito):**

- ❌ Página/ruta **"Acerca de"** (`/acerca`) y su contenido — spec aparte. Aquí solo el placeholder inerte en el menú.
- ❌ Portar la CSS de la sección About del prototipo (`references/templates/home-about/styles.css` y `about.jsx`).
- ❌ Datos reales para ticker/stats/top jugadores: se **hardcodean** tal cual el diseño (los "Juegos disponibles" sí usan `GAMES` real).
- ❌ Backend, leaderboard real, motor de juego, tests, i18n, optimización de imágenes — igual que spec 01.
- ❌ Cambios en Detalle, Reproductor, Salón o Acceso más allá de actualizar sus enlaces de "volver" a `/games`.

---

## 3. Modelo de datos

**No se introducen estructuras de datos nuevas ni persistentes.** El Home reutiliza `GAMES` de `@/lib/data` para la sección "Juegos disponibles". El resto de datos (ticker de puntuaciones, stats, top jugadores, features, FAQ, precios) son **arrays/constantes hardcodeados inline** dentro de `components/home.tsx`, copiados literalmente del prototipo — no se guardan ni se leen de ningún sitio.

---

## 4. Plan de implementación

Cada paso deja la app ejecutable (`npm run dev`).

1. **Portar la CSS de home.** Añadir a `app/globals.css` (al final, tras el tema existente) los bloques específicos de la landing desde `references/templates/home-about/styles.css`:
   `.home`, `.home-hero`/`.home-hero-inner`, `.hero-eyebrow`, `.home-title` (+`.line-1/2/3`), `.home-sub`, `.home-ctas`, `.hero-scroll`, `.home-silos`/`.silo`(`.s1`–`.s8`), `.home-section`, `.section-head`/`.kicker`/`.section-title`/`.section-rule`, `.feature-grid`/`.feature-card`(+variantes color)/`.ft-icon`/`.ft-title`/`.ft-desc`, `.mini-rail`/`.mini-card`/`.mini-cover`/`.mini-meta`/`.mini-title`/`.mini-cat`, `.home-stats`/`.stats-inner`/`.stat-block`/`.stat-n`/`.stat-u`/`.stat-s`, `.activity-grid`/`.activity-card`/`.ac-head`/`.ac-title`/`.live-led`/`.lb-link`/`.ticker`/`.tick-row`/`.tk-*`/`.top-list`/`.top-row`(+`.top1/2/3`)/`.tp-*`, `.pricing-grid`/`.price-card`/`.pc-*`/`.pricing-faq`/`.faq-*`, `.home-final`/`.final-*`, `.reveal`/`.reveal.in`, y las animaciones `@keyframes bounce`, `float`, `tickin`, `pulse-led`. Incluir sus media queries. **No** portar la CSS de la sección About.
   - *Verifica:* las clases existen y no rompen el build.

2. **Mover el grid de juegos a `/games`.** Crear `app/games/page.tsx` con el contenido actual de `app/page.tsx` (render de `<Library />`).
   - *Verifica:* `/games` muestra el grid igual que antes.

3. **Crear el Home.** `components/home.tsx` (`"use client"`): componente `Home` + subcomponentes `FloatingSilhouettes`, `MiniCard`, `FeatureIcon` y hook `useReveal` (IntersectionObserver). Reemplazar `app/page.tsx` para que renderice `<Home />`. Navegación con `next/link` o `useRouter` hacia `/games`, `/acceso`, `/juego/[id]`, `/salon`.
   - *Verifica:* `/` muestra la landing con sus 7 secciones y las animaciones de reveal al hacer scroll.

4. **Reorganizar el nav** (`components/nav.tsx`): añadir "Inicio" (`/`), cambiar "Biblioteca" a `href="/games"`, mantener "Salón de la Fama" (`/salon`), añadir "Acerca de" como placeholder inerte/atenuado (sin navegación). Actualizar estado activo: Inicio activo si `pathname === "/"`; Biblioteca activo si `pathname === "/games"` o empieza por `/juego/` o `/jugar/`; Salón si empieza por `/salon`. Aplicar lo mismo en el panel móvil. El logo sigue apuntando a `/` (ahora Home).
   - *Verifica:* el enlace activo se resalta correctamente en `/`, `/games`, `/juego/...`, `/jugar/...`, `/salon`; "Acerca de" no navega.

5. **Actualizar enlaces internos de "volver a la biblioteca"** (de `/` → `/games`):
   - `components/game-detail.tsx` — botón "VOLVER AL VAULT".
   - `components/game-player.tsx` — botón de volver del modal de fin (`router.push`).
   - `components/hall-of-fame.tsx` — botón "VOLVER A LA BIBLIOTECA".
   - `components/auth.tsx` — redirect tras login y tras "jugar como invitado" (`router.push("/")` → `/games`).
   - *Verifica:* desde Detalle/Reproductor/Salón se vuelve a `/games`; tras login/invitado se aterriza en `/games`.

6. **Pulido y responsive.** Revisar scroll-to-top entre rutas, breakpoints del home (hero, grids, pricing) por debajo de 840px, y que no queden enlaces apuntando a `/` con sentido de Biblioteca.

> ⚠️ **Nota (AGENTS.md):** antes de tocar rutas/componentes, consultar la guía en `node_modules/next/dist/docs/01-app/` — límites RSC/`"use client"`, `next/link`, `usePathname`/`useRouter`, metadata.

**Archivos que aparecen o cambian:**
- Nuevos: `components/home.tsx`, `app/games/page.tsx`
- Modificados: `app/page.tsx` (ahora `<Home />`), `app/globals.css` (CSS de home), `components/nav.tsx`, `components/game-detail.tsx`, `components/game-player.tsx`, `components/hall-of-fame.tsx`, `components/auth.tsx`

---

## 5. Criterios de aceptación (checklist booleana)

- [ ] `npm run dev` y `npm run build` terminan sin errores ni warnings de lint.
- [ ] `/` muestra la landing con las **7 secciones** en orden: hero, ¿por qué?, juegos disponibles, stats, actividad en vivo, precios+FAQ, CTA final.
- [ ] El grid de juegos (Biblioteca) responde en `/games` y funciona igual que antes (búsqueda, filtros, tilt).
- [ ] Las CTAs del hero llevan a `/games` (EXPLORAR JUEGOS) y `/acceso` (CREAR CUENTA).
- [ ] "Juegos disponibles" muestra 6 juegos reales de `GAMES`; cada tarjeta navega a `/juego/[id]`; "VER TODOS LOS JUEGOS" → `/games`.
- [ ] "VER SALÓN →" → `/salon`; CTA de precios y "EMPEZAR GRATIS" → `/acceso`; "INSERTAR MONEDA" del CTA final → `/games`.
- [ ] Las siluetas flotan, el ticker anima sus filas y las secciones aparecen con efecto `reveal` al hacer scroll.
- [ ] El nav muestra **Inicio · Biblioteca · Salón de la Fama · Acerca de**; "Acerca de" está atenuado y **no navega** (no produce 404).
- [ ] El estado activo del nav es correcto en `/`, `/games`, `/juego/[id]`, `/jugar/[id]` y `/salon` (desktop y panel móvil).
- [ ] Desde Detalle, Reproductor y Salón los botones de "volver" llevan a `/games`; tras iniciar sesión o entrar como invitado se aterriza en `/games`.
- [ ] No queda ningún enlace que apunte a `/` con el sentido de "Biblioteca" (el logo sí apunta a `/` = Home).
- [ ] El home es responsive por debajo de 840px (hero, grids de features/mini-rail, actividad y pricing se reordenan sin desbordes).

---

## 6. Decisiones tomadas y descartadas

- **`/` = Home, grid de juegos → `/games`** (descartado: dejar el grid en `/` con el Home en `/inicio`). *Motivo:* la landing debe ser lo primero que ve el usuario; decisión confirmada por el usuario.
- **Las 7 secciones completas, incluida Precios+FAQ** (descartado: omitir precios o versión mínima). *Motivo:* máxima fidelidad al diseño de referencia.
- **"Acerca de" como placeholder inerte en el menú** (descartado: omitirlo, o crear ruta `/acerca` que daría 404). *Motivo:* el usuario quiere ver el enlace ya; la página llega en otro spec, y un enlace deshabilitado evita el 404.
- **Ticker, stats y top jugadores hardcodeados** (descartado: derivarlos de `seededScores()`/`GAMES`). *Motivo:* fidelidad al diseño y coherencia con el enfoque mock de la spec 01; los "Juegos disponibles" sí usan `GAMES` real.
- **`Home` como client component** (descartado: server component). *Motivo:* el efecto `reveal` usa `IntersectionObserver` (API de navegador).
- **Logo del nav apunta a `/` (Home)** (descartado: que apunte a `/games`). *Motivo:* convención: el logo lleva a la portada.

---

## 7. Riesgos identificados

- **Enlaces colgando tras mover la Biblioteca:** si se olvida algún `href="/"`/`router.push("/")` con sentido de Biblioteca, el usuario acabaría en el Home en vez del grid. *Mitigación:* el paso 5 enumera los 4 archivos afectados; verificar con una búsqueda final de `"/"`.
- **`reveal` e hidratación:** el `IntersectionObserver` debe montarse en cliente; un mal `"use client"` rompería el render. *Mitigación:* `components/home.tsx` íntegro como client component, observer en `useEffect`.
- **Choques de CSS portada vs. Tailwind v4:** clases nuevas conviviendo con utilidades y especificidad/`@layer`. *Mitigación:* mantener la CSS de home como CSS plano al final de `globals.css`, igual que en spec 01.
- **Portar de más:** `home-about/styles.css` incluye también CSS de About; portarla contaminaría este spec. *Mitigación:* §4 limita explícitamente a los selectores de home.
