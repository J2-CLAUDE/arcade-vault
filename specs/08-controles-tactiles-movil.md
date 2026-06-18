# SPEC 08 — Controles táctiles para móvil en Tetris y Asteroids

> **Estado:** Implementado · **Depende de:** Spec 05 (motor Asteroids) + Spec 07 (motor Tetris) · **Fecha:** 2026-06-17
> **Objetivo:** Permitir jugar Tetris y Asteroids en pantallas táctiles mediante métodos de acción públicos en cada motor y una barra de botones en pantalla bajo el canvas, visible solo en dispositivos de puntero grueso y funcional en orientación vertical.

## 1. Por qué este spec existe

Los motores canvas leen únicamente eventos de teclado, sin API de acciones; en táctil son injugables. Los specs 05/07 difirieron los controles táctiles a un spec propio. Falta además el export `viewport` de Next.js 16. Este spec cubre ambas carencias **sin tocar el teclado existente** (debe seguir funcionando igual).

## 2. Alcance

**Dentro:**

- Export `viewport` (Next.js 16) en `app/layout.tsx` con `width=device-width, initial-scale=1` y `themeColor`.
- Ampliar el `EngineHandle` de **Tetris** con métodos de acción: `moveLeft()`, `moveRight()`, `rotate()`, `softDrop()`, `hardDrop()`.
- Ampliar el `EngineHandle` de **Asteroids** con: `setRotateLeft(active)`, `setRotateRight(active)`, `setThrust(active)`, `fire()`.
- Cada método reutiliza la **misma ruta interna** que la tecla equivalente (mismo gating `paused`/`gameOver`); el teclado no cambia.
- Exponer el `EngineHandle` desde los wrappers (`tetris-game.tsx`, `asteroids-game.tsx`) hacia arriba vía `ref` (ref-as-prop de React 19).
- Componente nuevo `components/games/touch-controls.tsx`: barra de botones **por juego**, debajo del canvas.
  - Tetris: ◀ mover izq · ▶ mover der · ▼ soft drop (auto-repetición al mantener) · ⟳ rotar · ⬇ DROP (hard drop).
  - Asteroids: ◀ rotar izq (mantener) · ▶ rotar der (mantener) · ▲ PROPULSAR (mantener) · ● DISPARAR (toque).
- Botones de **mantener** usan `pointerdown`→activar / `pointerup`+`pointercancel`+`pointerleave`→desactivar, con pointer capture; botones de **toque** disparan una acción en `pointerdown`.
- CSS en `app/globals.css`: `.touch-controls` con tema neón/dark, dianas táctiles ≥ 56px, `touch-action: none`, visible solo en `@media (pointer: coarse)`.

**Fuera (specs futuros):**

- ❌ Controles táctiles para los 6 juegos mock (solo ticker).
- ❌ Gestos (swipe/tap sobre el canvas).
- ❌ Layout dedicado a landscape o aviso "gira el dispositivo".
- ❌ Resolución interna de canvas responsive (sigue fija 800×600).
- ❌ Vibración/háptica y persistencia de preferencias de control.

## 3. Modelo de datos / API

No hay cambios de base de datos. Se amplían las interfaces de los motores (TypeScript):

```ts
// lib/games/tetris/engine.ts — métodos añadidos al handle (mismo gating que las teclas)
export interface EngineHandle {
  start(): void;
  pause(): void;
  resume(): void;
  restart(): void;
  destroy(): void;
  moveLeft(): void;
  moveRight(): void;
  rotate(): void;
  softDrop(): void;
  hardDrop(): void;
}

// lib/games/asteroids/engine.ts — rotación/empuje son continuos (setters); disparo es discreto
export interface EngineHandle {
  start(): void;
  pause(): void;
  resume(): void;
  restart(): void;
  destroy(): void;
  setRotateLeft(active: boolean): void;
  setRotateRight(active: boolean): void;
  setThrust(active: boolean): void;
  fire(): void;
}
```

- Asteroids implementa los setters escribiendo el mismo objeto interno `keys` (`keys["ArrowLeft"]`, etc.) y `fire()` marca `justPressed["Space"]`; así reutiliza la ruta de input existente.
- Tetris implementa los métodos llamando a la lógica interna ya existente (`tryRotate`, `softDrop`, `hardDrop`, mover con `collide`).
- El mapeo botón→acción y el modo (toque/mantener) vive en `touch-controls.tsx`.

Convenciones: las acciones respetan `paused`/`gameOver` exactamente como el teclado; al pausar, Asteroids limpia los estados de mantener (`keys` a `false`) para evitar empuje "pegado".

## 4. Plan de implementación

1. **Viewport.** Añadir `export const viewport: Viewport` en `app/layout.tsx`. _Verifica:_ `npm run build` y, en DevTools móvil, la página escala a ancho de dispositivo.
2. **API Tetris.** Añadir los 5 métodos al handle de `lib/games/tetris/engine.ts`, reutilizando lógica interna. _Verifica:_ desde la consola, `engine.moveLeft()` mueve la pieza; el teclado sigue igual.
3. **API Asteroids.** Añadir setters + `fire()` en `lib/games/asteroids/engine.ts`, escribiendo `keys`/`justPressed`; limpiar estados de mantener en `pause()`. _Verifica:_ `setThrust(true)` propulsa y `setThrust(false)` detiene; teclado intacto.
4. **Exponer handle.** En `tetris-game.tsx` y `asteroids-game.tsx`, aceptar `ref` y exponer el `EngineHandle` (React 19 ref-as-prop / `useImperativeHandle`). _Verifica:_ `npm run build` y el `engineRef` del padre recibe el handle.
5. **Componente de controles.** Crear `components/games/touch-controls.tsx` con la barra por juego (toque vs mantener, `pointer*` + pointer capture, `touch-action: none`). _Verifica:_ los botones llaman a los métodos del handle.
6. **Montaje en el player.** En `components/game-player.tsx`, conservar el `engineRef` por juego y renderizar `<TouchControls game={game.id} engine={engineRef} />` justo **debajo** del `.crt-screen` (solo para juegos con motor). _Verifica:_ en viewport táctil aparecen los botones bajo el canvas.
7. **Estilos.** Añadir `.touch-controls` a `app/globals.css`: tema neón/dark, dianas ≥ 56px, `touch-action: none`, mostrar solo en `@media (pointer: coarse)` (ocultar en `pointer: fine`). _Verifica:_ visibles en emulación móvil, ocultos en desktop.

> ⚠️ **Nota Next.js 16 (AGENTS.md):** antes de tocar `app/layout.tsx` o componentes `"use client"`, consultar `node_modules/next/dist/docs/01-app/` (export `viewport`, `params` async, límites RSC, `ref` como prop en React 19). No asumir el App Router de memoria.

## 5. Criterios de aceptación

- [ ] `app/layout.tsx` exporta `viewport` con `width=device-width` e `initial-scale=1`.
- [ ] En un viewport de puntero grueso, Tetris muestra los 5 botones bajo el canvas; Asteroids muestra los 4.
- [ ] En desktop (puntero fino) los controles táctiles **no** se muestran.
- [ ] Tetris: tocar ◀/▶ mueve la pieza una celda; ⟳ rota; mantener ▼ baja repetidamente; DROP hace hard drop.
- [ ] Asteroids: mantener ◀/▶ rota mientras se sostiene; mantener ▲ propulsa y al soltar se detiene; ● dispara una bala por toque.
- [ ] Soltar/cancelar el dedo (incluido sacarlo del botón) detiene las acciones de mantener (sin empuje/rotación "pegada").
- [ ] El teclado sigue controlando ambos juegos igual que antes.
- [ ] Pulsar los controles no hace scroll ni zoom de la página.
- [ ] El juego se juega completo en orientación vertical en un móvil.
- [ ] `npm run lint` y `npm run build` pasan sin errores.

## 6. Decisiones tomadas y descartadas

- **Sí:** métodos de acción públicos en `EngineHandle`. _Motivo:_ desacopla input de códigos de tecla, testeable, una sola fuente de lógica.
- **No:** despachar `KeyboardEvent` sintéticos. _Descartado:_ acopla la UI a `e.code` y es frágil entre navegadores.
- **Sí:** botones en pantalla dedicados por juego. _Motivo:_ precisos y descubribles para arcade.
- **No:** gestos swipe/tap. _Descartado:_ menos precisos y menos descubribles; van a otro spec si se quieren.
- **Sí:** visibilidad por `@media (pointer: coarse)`, controles bajo el canvas. _Motivo:_ CSS puro, sin detección JS de dispositivo; no estorban en desktop.
- **No:** botones superpuestos sobre el canvas. _Descartado:_ tapan el juego.
- **Sí:** jugar en vertical. _Motivo:_ lo más natural en móvil; canvas 4:3 arriba, controles debajo.
- **No:** layout landscape dedicado / aviso de rotar. _Descartado:_ más CSS y fricción; otro spec si hace falta.
- **No:** controles para los 6 juegos mock. _Descartado:_ no tienen motor real que controlar.

## 7. Riesgos identificados

| Riesgo                                                                   | Mitigación                                                                                                               |
| ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------ |
| `pointerup` perdido deja un botón de mantener "pegado" (empuje continuo) | Escuchar también `pointercancel`/`pointerleave` + `setPointerCapture`; `pause()` de Asteroids limpia `keys`.             |
| Toques disparan scroll/zoom o doble-tap-zoom del navegador               | `touch-action: none` en `.touch-controls`; `preventDefault` en `pointerdown`; no deshabilitar el zoom global (a11y).     |
| `100vh` en iOS Safari deja los controles fuera de pantalla               | Layout vertical con el canvas en aspecto 4:3 y controles en flujo normal debajo (no posicionados con `100vh`).           |
| Cambio de skin recrea el motor y el `engineRef` queda obsoleto           | El padre vuelve a obtener el handle por `ref` al recrearse el wrapper; los botones leen `engine.current` en cada evento. |

## Qué **no** está en este spec

- Controles táctiles para los 6 juegos mock.
- Gestos sobre el canvas.
- Layout/optimización para landscape o aviso de rotar.
- Resolución interna de canvas responsive (sigue 800×600).
- Háptica y persistencia de preferencias.

Cada uno, si llega, va en su propio spec.
