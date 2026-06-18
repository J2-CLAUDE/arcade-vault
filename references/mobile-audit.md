# Auditoría móvil — Arcade Vault

> Web responsive (navegador móvil), solo modo oscuro, tema neón/CRT.
> Criterios: sin overflow horizontal (320–430px) · dianas ≥44–56px · no depender de `hover` · texto legible / contraste AA · safe-areas (`100dvh`/`env()`) · controles táctiles solo en `pointer: coarse` · teclado virtual no tapa inputs · baseline desktop intacto.

Leyenda: ✅ correcto · ⚠️ mejorable · ❌ roto · — no aplica.

---

## Juego: FROGGER (id `frogger`)

Última auditoría: **2026-06-18** · viewport de prueba: 360×760, `pointer: coarse` + touch (Playwright/Chromium).

### Rutas auditadas

| Ruta / componente | Sin overflow | Dianas | No-hover | Contraste | Safe-area | Controles táctiles | Baseline desktop |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `/games` — tarjeta Frogger (`game-card.tsx` / `.card`) | ✅ 328px @360 | ✅ tarjeta completa táctil | ✅ navega por tap (`router.push`); 3D solo decorativo en `:hover` | ✅ | — | — | ✅ |
| `/juego/frogger` — detalle (`game-detail.tsx`) | ✅ | ✅ botones de acción | ✅ | ✅ | — | — | ✅ |
| `/games/frogger/play` y `/jugar/frogger` — player (`game-player.tsx` + `frogger-game.tsx`) | ✅ canvas 348px @360, `object-fit: contain` | ✅ d-pad 60×60px | ✅ d-pad táctil + meta-strip | ✅ d-pad neón (reusa `.dpad-btn`) | ✅ player a `100dvh` (regla coarse existente) | ✅ **NUEVO** d-pad 4 direcciones | ✅ |

### Antes (estado previo a esta intervención)

- **Player (`/games/frogger/play`)**: ❌ **sin controles táctiles**. `FroggerGame` solo leía `keydown` en `document` (ArrowKeys/WASD) y no expone `EngineHandle` como Asteroids/Tetris → **injugable en móvil**. `game-player.tsx` montaba `<TouchControls>` únicamente para `asteroids` y `tetris`.
- Canvas: ✅ ya escalaba bien — el bloque `@media (pointer: coarse)` aplica `object-fit: contain` a `.crt-screen canvas`, y el buffer 640×560 entra sin desbordar en 360px.
- Tarjeta y detalle: ✅ ya correctos (grid `auto-fill minmax(280px,1fr)` con padding 16px en móvil; detalle colapsa en `@media (max-width: 900px)`).

### Después (implementado 2026-06-18)

- **D-pad táctil de 4 direcciones (↑ ↓ ← →)** para Frogger:
  - `components/games/touch-controls.tsx`: nueva variante `game: "frogger"` con prop `onDirection(dir)`. Reusa el helper `tap()` (dispara en `pointerdown` con `setPointerCapture`) — semántica de salto = un toque por salto, acorde al motor (cada `keydown` encola un `pendingDir`).
  - `components/game-player.tsx`: monta `<TouchControls game="frogger" onDirection=…>` cuando `isFrogger`. Como Frogger **no tiene `EngineHandle`**, el callback despacha un `KeyboardEvent("keydown", { code })` sintético al `document` (ArrowUp/Down/Left/Right) — el motor lo consume por su listener existente. (Excepción consciente al "no eventos sintéticos" del Spec 08, que aplica a motores **con** handle; Frogger queda fuera de ese contrato y la consigna lo autoriza.)
  - `app/globals.css`: `.gamepad--frogger` (centrado, sin A/B) y `.gamepad-dpad--frogger` (grid 3×3 de **60px** → dianas ≥56px del Spec 08). Reusa `.dpad-btn`, `.dpad-hub`, `.dp-arrow` ya existentes; `touch-action: none` heredado de `.gamepad`/`.dpad-btn`.

### Verificación (2026-06-18)

- `npm run lint` ✅ · `npm run build` ✅ (ruta `/games/frogger/play` y `/jugar/[id]` compilan).
- Playwright (Chromium, 360×760, touch/isMobile):
  - d-pad presente y **visible** en `pointer: coarse`; **oculto** en desktop (`pointer: fine`, regla espejo existente).
  - botón ↑ = 60×60px (≥56).
  - sin overflow horizontal a 360px; canvas 348px dentro del viewport.
  - tocar ↑ tres veces sube la puntuación 0→30 (10 pts/fila) → el salto táctil funciona.
  - tarjeta Frogger (328px) renderiza y navega a `/juego/frogger` por tap.
- Teclado: intacto (el listener `keydown` del motor no se tocó; el d-pad solo añade eventos, no los quita).
- Baseline desktop: intacto (todo lo nuevo vive dentro de `@media (pointer: coarse)` y su espejo `pointer: fine` oculta el `.gamepad`).

### Fuera de alcance (esta intervención)

- Otros juegos (mock o con motor) — solo se tocó `frogger`.
- Resolución interna del canvas (sigue 640×560).
- Lógica del motor (`frogger-game.tsx` update/draw) — sin cambios.
