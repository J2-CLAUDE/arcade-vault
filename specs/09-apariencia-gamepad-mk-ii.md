# SPEC 09 — Apariencia del gamepad MK-II (controles táctiles)

> **Estado:** Aprobado · **Depende de:** Spec 08 (controles táctiles) · **Fecha:** 2026-06-17
> **Objetivo:** Reestilar la barra de controles táctiles existente para que reproduzca el gamepad neón "MK-II" de `references/gamepad-assets/` (chasis con degradado y brillos, D-pad en cruz con hub y LED diamante pulsante, flechas SVG con glow, y botones A/B circulares con gloss y anillo punteado), **sin alterar el cableado ni la lógica de input**.

## 1. Por qué este spec existe

El Spec 08 entregó controles táctiles funcionales pero con un estilo placeholder: barra plana, glifos unicode, B amarillo, A/B sin relieve. El equipo dispone de un asset de referencia acabado (`gamepad.html` / `gamepad-neon.png`). Este spec lleva la UI existente a ese acabado **manteniendo intacto** el comportamiento ya aprobado (mover/rotar/drop/propulsar/disparar, `tap`/`hold`/`repeat`, visibilidad por puntero).

## 2. Alcance

**Dentro:**

- Reescribir las reglas CSS del gamepad en `app/globals.css` (bloque actual ~líneas 3117–3343) hacia el acabado MK-II:
  - **Chasis** (`.gamepad`): `linear-gradient` de cuerpo, `border-radius` ~22px, doble `radial-gradient` de brillo, `::before` (borde interior) y `::after` (textura punteada).
  - **D-pad** (`.gamepad-dpad` + `.dpad-*`): cruz con **hub central** (`.dpad-hub`) y **gema diamante pulsante** (`.dpad-hub-gem`, animación `pulse-led`); flechas SVG con `drop-shadow` neón en estado activo.
  - **A/B** (`.ab-btn--a/--b` + `.ab-ring`): círculos con **gloss radial**, **anillo punteado** que aparece al pulsar, sombra inferior 3D y `translateY`/`scale` al `:active`. **A = magenta, B = cian.**
- Cambios JSX **mínimos** en `components/games/touch-controls.tsx`:
  - Sustituir los glifos unicode `▲◀▶▼` por `<svg>` de flecha (paths del `gamepad.html` de referencia).
  - Añadir el hub central con la gema (`.dpad-hub` + `.dpad-hub-gem`) en la celda central del D-pad.
  - Añadir el `<span className="ab-ring">` dentro de cada botón A/B.
- Conservar estructura/clases compatibles con el comportamiento actual: `aria-label`, handlers `pointer*`, `tap`/`hold`/`repeat`, `type="button"`.

**Fuera (no se toca):**

- ❌ Motores, `EngineHandle`, mapeo botón→acción o cualquier wiring de input.
- ❌ La regla de visibilidad `@media (pointer: coarse|fine)` (se conserva tal cual).
- ❌ Controles para los 6 juegos mock (siguen sin gamepad).
- ❌ Botones funcionales nuevos (pausa/menú dentro del gamepad).
- ❌ Háptica, sonido, animaciones de página, layout landscape.
- ❌ Reestructurar el layout del player más allá de envolver los controles en el chasis.

## 3. Modelo de datos / API

No introduce datos ni API nueva — es puramente presentacional. Inventario de clases (nuevas marcadas con ✚):

| Clase                                                                            | Rol                                                | Estado                      |
| -------------------------------------------------------------------------------- | -------------------------------------------------- | --------------------------- |
| `.gamepad`                                                                       | Chasis MK-II (panel, brillo, `::before`/`::after`) | reescrita                   |
| `.gamepad-dpad`, `.dpad-corner`, `.dpad-center`, `.dpad-btn`, `.dpad-btn--inert` | Cruz del D-pad                                     | reestiladas                 |
| `.dpad-hub` ✚                                                                    | Hub central del D-pad                              | nueva                       |
| `.dpad-hub-gem` ✚                                                                | Gema diamante pulsante (`@keyframes pulse-led`)    | nueva                       |
| `.dp-arrow` ✚                                                                    | Flecha SVG (glow `drop-shadow` al activar)         | nueva                       |
| `.gamepad-ab`, `.ab-btn`, `.ab-btn--a`, `.ab-btn--b`                             | Botones de acción A/B                              | reestiladas (B pasa a cian) |
| `.ab-ring` ✚                                                                     | Anillo punteado que aparece al pulsar              | nueva                       |

Tokens de tema reutilizados (ya coinciden con la referencia): `--cyan #00f5ff`, `--magenta #ff006e`, `--bg`, `--bg-2`, `--line`, `--pixel`.

## 4. Plan de implementación

1. **Fuente visual.** Tomar `references/gamepad-assets/gamepad.html` como referencia de estilo y `app/globals.css` (bloque del gamepad) como destino. _Verifica:_ se identifican las reglas a reescribir.
2. **Chasis.** Reescribir `.gamepad` como panel MK-II (gradiente de cuerpo, `border-radius`, doble brillo radial, `::before` borde interior, `::after` textura punteada). _Verifica:_ en emulación móvil el contenedor luce como `gamepad-neon.png`.
3. **D-pad fiel.** En `touch-controls.tsx` reemplazar glifos por `<svg class="dp-arrow">`; añadir `.dpad-hub` + `.dpad-hub-gem` en la celda central (Tetris y Asteroids). En CSS: glow neón en `.dpad-btn:active` y `drop-shadow` en `.dp-arrow` al activar; `@keyframes pulse-led` para la gema. La celda inerte de Asteroids (`.dpad-btn--inert`) se conserva como ranura visible no interactiva para respetar la cruz de 4 flechas. _Verifica:_ hub con diamante pulsante y flechas que brillan al tocar.
4. **A/B.** Añadir `<span class="ab-ring">` en cada botón. Reescribir `.ab-btn--a` (magenta) y `.ab-btn--b` (**cian**) con gloss radial; reglas de `.ab-ring` (aparece al `:active`), sombra 3D y `translateY`/`scale` al pulsar. _Verifica:_ A magenta, B cian, anillo punteado y hundido al tocar.
5. **A11y de movimiento.** Envolver la animación `pulse-led` para respetar `prefers-reduced-motion` (sin pulso si el usuario reduce movimiento). _Verifica:_ con "reduce motion" activo la gema no parpadea.
6. **Cierre.** `npm run lint` y `npm run build` en verde; revisión visual en DevTools (móvil) de Tetris y Asteroids comparando con `gamepad-neon.png`. _Verifica:_ ambos pasan y el aspecto coincide.

> ⚠️ **Nota Next.js 16 / React 19 (AGENTS.md):** `touch-controls.tsx` es `"use client"`; antes de editarlo consultar `node_modules/next/dist/docs/01-app/` si surge cualquier duda de convención. Aquí el cambio es JSX/CSS puro, sin nuevas APIs.

## 5. Criterios de aceptación

- [ ] `.gamepad` se renderiza como panel con esquinas redondeadas, degradado y brillo radial (no como barra plana).
- [ ] El D-pad muestra un hub central con una gema diamante cian que pulsa (y queda quieta con `prefers-reduced-motion: reduce`).
- [ ] Las flechas son SVG y emiten glow neón al pulsarse.
- [ ] El botón A es magenta y el B es **cian**; ambos circulares con brillo gloss.
- [ ] Al pulsar A/B aparece el anillo punteado y el botón se hunde (`translateY`/`scale`).
- [ ] El aspecto coincide razonablemente con `references/gamepad-assets/gamepad-neon.png`.
- [ ] **Comportamiento intacto:** Tetris y Asteroids responden a los toques igual que antes (mover/rotar/soft-drop/hard-drop · rotar/propulsar/disparar).
- [ ] Los controles siguen **ocultos** en puntero fino y **visibles** en puntero grueso.
- [ ] `npm run lint` y `npm run build` pasan sin errores.

## 6. Decisiones tomadas y descartadas

- **Sí:** B = **cian** (como la referencia). _Motivo:_ fidelidad al asset; elección del usuario. _Descartado:_ B amarillo (estilo previo).
- **Sí:** **chasis completo MK-II**. _Motivo:_ el objetivo es reproducir el gamepad de referencia. _Descartado:_ solo reestilar botones dentro de la barra plana.
- **Sí:** **réplica fiel del D-pad** (hub + LED diamante + flechas SVG). _Motivo:_ es el rasgo distintivo del diseño. _Descartado:_ reestilo mínimo con glifos unicode.
- **Sí:** solo **CSS + JSX mínimo**, sin tocar wiring. _Motivo:_ el comportamiento ya está aprobado en Spec 08; aislar el riesgo a lo presentacional.
- **No:** reflejar la pulsación de teclado con una clase `.on`. _Descartado:_ añadiría lógica JS; en táctil `:active` basta.
- **Conservar** la celda inerte `▼` de Asteroids como ranura visible (no interactiva). _Motivo:_ respeta la cruz de 4 flechas de la referencia sin darle función.

## 7. Riesgos identificados

| Riesgo                                                                                   | Mitigación                                                                                                |
| ---------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Glow/sombras pesados causan repintados en móviles lentos                                 | `box-shadow`/`filter` moderados y transiciones cortas; única animación continua es el LED (12px, barata). |
| El chasis con padding/altura reduce el alto disponible para el canvas en pantallas bajas | Mantener alturas compactas actuales (~52px D-pad, ~64px A/B); verificar en viewport corto.                |
| La gema pulsante molesta a usuarios sensibles al movimiento                              | Animación `pulse-led` envuelta en `prefers-reduced-motion`.                                               |
| Cambio de skin recrea el wrapper                                                         | Las clases CSS son globales/estáticas; no se ven afectadas. Riesgo bajo.                                  |

## Qué **no** está en este spec

- Cambios en motores, `EngineHandle`, o wiring de input (Spec 08).
- Gestos sobre el canvas, controles para los 6 juegos mock, háptica, sonido, layout landscape.
