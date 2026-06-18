# Performance Audit — Arcade Vault Canvas Engines

Checklist derived from `specs/10-frogger-performance.md`.
Last updated: 2026-06-18.

---

## Tetris (`lib/games/tetris/engine.ts`)

Audited and fixed: 2026-06-18.

| # | Criterio | Estado | Notas |
|---|----------|--------|-------|
| 1 | Cero allocaciones en RAF | ✅ | `CONTROL_HINTS` y `HUD_STAT_LABELS` hoistados a constantes de módulo. `hudStatColors` pre-computado en construcción. `statDefs = [...]` por frame eliminado; reemplazado con bucle indexado sobre arrays estáticos. |
| 2 | Saltar `draw()` en pausa | ✅ | Patrón `pauseDrawn` implementado: se dibuja un único frame al pausar; los frames siguientes hacen `return` sin render hasta que se reanude. Reset en `resume()` e `initState()`. |
| 3 | Timers acotados | ✅ | `dropAccum` se resetea a 0 por drop; `dt` capado a 50 ms. Sin crecimiento ilimitado. |
| 4 | Lookups fuera del hot loop | ✅ | Sin `indexOf`/O(n) precomputable en el bucle caliente. |
| 5 | `React.memo` en wrapper | ✅ | `TetrisGame` exportado como `memo(TetrisGame)`. `handleEngineGameOver` en `game-player.tsx` envuelto en `useCallback([])` para que el memo sea efectivo (callback estable). |
| 6 | Timing frame-rate-independent | ✅ | Acumulador `dropAccum += dt` con `dropInterval` en ms, `dt` capado. Patrón canónico. |
| 7 | `shadowBlur` fuera del hot loop | ✅ | Pre-rasterizados sprites OffscreenCanvas por color de pieza (8 sprites, generados una vez en construcción). `drawBlock` usa `ctx.drawImage(sprite, …)` en skin neón → 0 cambios de estado GPU por frame en lugar de ~200. Fallback al path directo cuando `blockGlow === 0`. |
| 8 | HUD sin setState a 60 fps | ✅ | HUD íntegramente en canvas. React solo llama `setFinalScore` una vez en game-over. |
| 9 | Skin/callbacks vía ref | ✅ | `onGameOverRef` via ref; skin leído en construcción. |

---

## Asteroids (`lib/games/asteroids/engine.ts`)

Audited and fixed: 2026-06-18.

| # | Criterio | Estado | Notas |
|---|----------|--------|-------|
| 1 | Cero allocaciones en RAF | ⚠️ aceptable | `newAsteroids = []` se crea por frame en el bucle de colisión (línea de `const newAsteroids`). Pequeña, fija; el resto de objetos se crean por evento. No bloqueante. |
| 2 | Saltar `draw()` en pausa | ✅ | `pause()` hace `cancelAnimationFrame(rafId)` — el RAF se detiene completamente. Dibuja un único overlay "EN PAUSA" como efecto de la pausa. No redibuja en pausa. |
| 3 | Timers acotados | ✅ | `rot` acotado con `% TWO_PI` (constante de módulo). Resto de acumuladores (ttl, deadTimer, invincible, shootCooldown, tripleShot) acotados por muerte/reset. |
| 4 | Lookups fuera del hot loop | ✅ | Sin `indexOf`/O(n) precomputable en el bucle caliente. |
| 5 | `React.memo` en wrapper | ✅ | `AsteroidsGame` exportado como `memo(AsteroidsGame)`. `handleEngineGameOver` en `game-player.tsx` envuelto en `useCallback([])` (compartido con Tetris). |
| 6 | Timing frame-rate-independent | ✅ | `dt = (ts - lastTime) / 1000` capado a `0.05 s`. Velocidades en unidades/seg. Patrón canónico del Spec 10. |
| 7 | `shadowBlur` fuera del hot loop | ✅ | Shadow batching por tipo de entidad: se configura `shadowColor`/`shadowBlur` una sola vez para todos los asteroides, y una vez para todas las balas. Se les pasa `noGlowColors` (glow=0) para que no re-configuren el estado. Baja de ~23 cambios de estado GPU/frame a ≤4. Las partículas ya iban sin glow. PowerUp y nave mantienen su propio glow (entidades únicas, impacto mínimo). |
| 8 | HUD sin setState a 60 fps | ✅ | HUD íntegramente en canvas (`drawHUD()`). React solo llama callbacks una vez en game-over. |
| 9 | Skin/callbacks vía ref | ✅ | `onGameOverRef` via ref; skin leído una vez en construcción. Motor reconstruido en `useEffect([skin])`. |

---

## Frogger (`components/games/frogger-game.tsx`)

Referencia canónica del Spec 10 — ya cumple todos los criterios (según el spec). No auditado nuevamente aquí.

---

## Pendiente / Próximos motores

- Cualquier nuevo motor canvas debe cumplir los 9 criterios de esta tabla antes de integrarse.
- Revisar `newAsteroids = []` si el pool de asteroides crece en futuras versiones.
