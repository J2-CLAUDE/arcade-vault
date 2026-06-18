# SPEC 05 — Motor real de Asteroids en el reproductor

> **Estado:** Implementado · **Depende de:** Spec 01 (reproductor `/jugar/[id]`, `components/game-player.tsx`, `useSession().saveScore`, tema CRT) · **Fecha:** 2026-06-15
> **Objetivo:** Sustituir el ticker mock del reproductor por un motor canvas real de **Asteroids** —portado desde `references/started-games/02-asteroids/game.js`— **solo para el juego `asteroids`** (antes `rocas`), con HUD dibujado en el canvas, power-up 3x, controles de teclado y guardado de puntuación por el flujo existente; además renombra la entrada de catálogo `rocas → asteroids`.

---

## 2. Alcance

**Dentro:**

- **Rename de catálogo `rocas → asteroids`:**
  - `lib/data.ts`: `id: "rocas"` → `"asteroids"`, `title: "ROCAS"` → `"ASTEROIDS"`, `cover: "cover-rocas"` → `"cover-asteroids"`, y ajustar el texto `long` (quitar "dividir rocas").
  - `app/globals.css`: renombrar `.cover-rocas` (+ `::after`/`::before`) → `.cover-asteroids`.
  - `components/home.tsx:170`: actividad reciente `g: "Rocas"` → `"Asteroids"`.
  - Efecto: las rutas pasan a `/juego/asteroids` y `/jugar/asteroids`.

- **Motor del juego (framework-agnóstico)** en `lib/games/asteroids/engine.ts`: portar `game.js` a TypeScript (clases `Bullet`, `Asteroid`, `Ship`, `Particle`, `PowerUp`, estado, `update`/`draw`, loop). **Incluye el power-up 3x** (triple disparo). Resolución lógica fija **800×600**; toda la física/wrap intacta.

- **Wrapper React** `components/games/asteroids-game.tsx` (client): monta el `<canvas width=800 height=600>`, arranca el motor en `useEffect`, gestiona el `requestAnimationFrame`, registra/limpia los listeners de teclado, expone props `paused` y `onGameOver(score)`, y un método de reinicio. El **HUD lo dibuja el canvas** (SCORE/NIVEL/vidas/3x).

- **Integración en el reproductor** `components/game-player.tsx`: branch `game.id === "asteroids"` → renderiza `<AsteroidsGame/>` en lugar del ticker mock; el resto de juegos conserva el ticker. Para `asteroids`:
  - La barra `.player-hud` conserva **solo** los botones PAUSA / FIN / SALIR (se ocultan las cajas de stats React Puntuación/Vidas/Nivel).
  - PAUSA congela el loop (overlay "EN PAUSA"); FIN fuerza fin de partida; el estado del motor sube a React **solo** para el modal de fin.
  - `onGameOver(score)` → abre el modal existente "FIN DEL JUEGO" → GUARDAR PUNTUACIÓN (`useSession().saveScore`) / JUGAR DE NUEVO (reinicia el motor).

- **Controles:** teclado (← → rotar, ↑ propulsar, Espacio disparar) con `preventDefault` para que flechas/Espacio no hagan scroll de la página. Escalado **800×600 por CSS** dentro de `.crt-screen` (letterbox, conservando proporción).

**Fuera (explícito):**

- ❌ Motor real para los otros 7 juegos (siguen con el ticker mock).
- ❌ Controles táctiles / botones en pantalla para móvil.
- ❌ Canvas responsive con física dinámica (la resolución interna es fija 800×600).
- ❌ Persistencia real de puntuaciones: se mantiene `saveScore()` mock en `localStorage`; Salón y Detalle siguen con `seededScores`. (Supabase real → spec futura.)
- ❌ Pantalla "PULSA START": el juego arranca solo al cargar la ruta.
- ❌ OVNIs/enemigos extra que menciona el texto de catálogo (no están en `game.js`).
- ❌ Sonido, tests automatizados.

---

## 3. Modelo de datos

**No introduce datos persistentes nuevos.** No hay tablas ni claves de `localStorage` nuevas: el guardado sigue usando `StoredScore` (`av_scores`) vía `useSession().saveScore`, ya definido en Spec 01.

**Cambio de datos (valores, no tipos):** la entrada de catálogo en `lib/data.ts` cambia de valores; el tipo `Game` no se toca.

```ts
// antes
{ id: "rocas", title: "ROCAS", cover: "cover-rocas", cat: "SHOOTER", color: "yellow", best: 41200, plays: "15.6K", … }
// después
{ id: "asteroids", title: "ASTEROIDS", cover: "cover-asteroids", cat: "SHOOTER", color: "yellow", best: 41200, plays: "15.6K", … }
// long: se ajusta el texto para no decir "dividir rocas"
```

**Estado interno del motor (no persistente, vive en memoria mientras se juega)** — portado de `game.js`, tipado en `lib/games/asteroids/engine.ts`:

```ts
type AsteroidSize = 1 | 2 | 3; // small | medium | large

interface Entity {
  x: number;
  y: number;
  radius: number;
  dead: boolean;
}
// Bullet, Asteroid, Ship, Particle, PowerUp implementan Entity + update(dt)/draw(ctx)

type GameState = "playing" | "dead" | "gameover";

interface EngineHandle {
  // lo que el wrapper React usa
  start(): void;
  pause(): void;
  resume(): void;
  restart(): void;
  destroy(): void; // cancela rAF + quita listeners
}

interface EngineCallbacks {
  onGameOver: (finalScore: number) => void; // único puente motor → React
}
```

Constantes de juego portadas tal cual (`RADII`, `SPEEDS`, `POINTS`, `POWERUP_DROP_CHANCE=0.15`, `POWERUP_DURATION=5`, `POWERUP_TTL=12`, `TRIPLE_SPREAD=0.18`). `score/lives/level` viven dentro del motor y se dibujan en el canvas; solo `finalScore` cruza a React en `onGameOver`.

---

## 4. Plan de implementación

Cada paso deja la app ejecutable (`npm run dev` / `npm run build`).

> ⚠️ **Nota (AGENTS.md):** antes de tocar la ruta `/jugar/[id]` o el wrapper client, consultar `node_modules/next/dist/docs/01-app/` (`"use client"`, límites RSC, `params` async). No asumir convenios del App Router de memoria.

1. **Rename de catálogo `rocas → asteroids`.** En `lib/data.ts` cambiar `id`, `title`, `cover` y el texto `long`. En `app/globals.css` renombrar `.cover-asteroids` (+ `::after`/`::before`). En `components/home.tsx:170` poner `g: "Asteroids"`.
   - _Verifica:_ `/juego/asteroids` y `/jugar/asteroids` resuelven; la portada se ve igual; la tarjeta aparece en Biblioteca como "ASTEROIDS"; no quedan referencias a `rocas` (`grep -rin rocas` salvo en `references/`).

2. **Motor portado** `lib/games/asteroids/engine.ts`. Portar `game.js` a TypeScript: clases `Bullet`, `Asteroid`, `Ship`, `Particle`, `PowerUp`; estado (`ship/bullets/asteroids/particles/powerUps/score/lives/level/state/deadTimer/...`); `update(dt)`, `draw(ctx)`, `spawnAsteroids`, `nextLevel`, `explode`, `killShip`; HUD dibujado en canvas (`drawHUD`, `drawLifeIcon`, `drawOverlay`). Encapsular en una factoría `createAsteroidsEngine(ctx, callbacks): EngineHandle` que **no** use globales de `window` para el estado, reciba el `ctx` y exponga `start/pause/resume/restart/destroy`. El loop usa `requestAnimationFrame` con `dt` capado a 50 ms; el input se gestiona con handlers internos `keydown`/`keyup` (con `preventDefault` en flechas/Espacio) que el `destroy()` retira.
   - _Cambio clave vs original:_ al entrar en `state="gameover"`, en lugar de reiniciar con Espacio, el motor llama `callbacks.onGameOver(score)` una sola vez y deja de actualizar la lógica de juego.
   - _Verifica:_ compila con TS strict; sin referencias a `document.getElementById` ni globales mutables de módulo.

3. **Wrapper React** `components/games/asteroids-game.tsx` (`"use client"`). Props: `{ paused: boolean; onGameOver: (score: number) => void; restartKey: number }`. En `useEffect` (al montar): obtener `ctx` del `<canvas width={800} height={600}>`, crear el motor, `start()`; en cleanup `destroy()`. Un `useEffect` sobre `paused` llama `pause()/resume()`. Cambiar `restartKey` reinicia el motor (`restart()`). El canvas se escala por CSS para llenar `.crt-screen` conservando 4:3.
   - _Verifica:_ al renderizarlo aislado el juego corre, responde al teclado y no scrollea la página; al desmontar no quedan listeners ni rAF activos.

4. **Integración en el reproductor** `components/game-player.tsx`. Branch `game.id === "asteroids"`:
   - Renderizar `<AsteroidsGame paused={paused} onGameOver={handleEngineGameOver} restartKey={restartKey}/>` dentro de `.crt-screen` en vez de la `.game-arena` mock.
   - Ocultar las cajas de stats React (Puntuación/Vidas/Nivel) para `asteroids`; conservar los botones PAUSA / FIN / SALIR.
   - `handleEngineGameOver(score)` guarda el score final en estado y abre el modal `over`. FIN puede forzar el fin (vía `restartKey`/flag que indique al motor terminar, o simplemente abrir el modal con el score actual — definir en impl).
   - JUGAR DE NUEVO: incrementa `restartKey`, cierra el modal, limpia `saved`.
   - El resto de juegos (`game.id !== "asteroids"`) mantiene exactamente el ticker mock actual.
   - _Verifica:_ en `/jugar/asteroids` se juega de verdad; PAUSA congela y REANUDAR retoma; al morir 3 veces aparece el modal con el score real; GUARDAR PUNTUACIÓN escribe en `av_scores`; JUGAR DE NUEVO reinicia limpio; SALIR navega a `/juego/asteroids`. En otro juego (p. ej. `/jugar/caida`) sigue el ticker mock.

5. **Pulido y verificación final.** Repasar que el canvas se ve nítido (sin blur de escalado raro), que Espacio/flechas no mueven la página, y que al navegar fuera y volver no se duplican loops. `npm run lint` y `npm run build` limpios.

**Archivos que aparecen o cambian:**

- Nuevos: `lib/games/asteroids/engine.ts`, `components/games/asteroids-game.tsx`.
- Modificados: `lib/data.ts`, `app/globals.css`, `components/home.tsx`, `components/game-player.tsx`.

---

## 5. Criterios de aceptación (checklist booleana)

- [ ] `npm run dev` y `npm run build` terminan sin errores; `npm run lint` sin warnings.
- [ ] No quedan referencias a `rocas` fuera de `references/` (`grep -rin rocas` limpio en `app/`, `components/`, `lib/`).
- [ ] La Biblioteca muestra la tarjeta como **ASTEROIDS**; `/juego/asteroids` y `/jugar/asteroids` resuelven (200, no 404); la portada `.cover-asteroids` se ve igual que antes.
- [ ] En `/jugar/asteroids` se renderiza un `<canvas>` jugable (no el ticker mock): la nave rota con ← →, propulsa con ↑ y dispara con Espacio.
- [ ] Pulsar flechas/Espacio **no** hace scroll de la página.
- [ ] Los asteroides grandes se parten en medianos y estos en pequeños; las puntuaciones son 20/50/100 según tamaño; hay partículas de explosión.
- [ ] El HUD (SCORE, NIVEL, vidas) se dibuja **dentro del canvas**; las cajas de stats React (Puntuación/Vidas/Nivel) **no** aparecen para `asteroids`.
- [ ] El power-up 3x cae al destruir asteroides (≈15 %, garantizado a los 5 kills), al recogerlo activa triple disparo durante 5 s y el indicador "3x" aparece en el HUD del canvas.
- [ ] PAUSA congela el juego y muestra el overlay "EN PAUSA"; REANUDAR lo retoma exactamente donde estaba.
- [ ] Al perder las 3 vidas (o pulsar FIN) el motor se detiene y aparece el modal React "FIN DEL JUEGO" con la **puntuación real** del motor.
- [ ] GUARDAR PUNTUACIÓN escribe en `av_scores` (`localStorage`) vía `useSession().saveScore`; JUGAR DE NUEVO reinicia el motor limpio; SALIR navega a `/juego/asteroids`.
- [ ] El motor **no** se reinicia con Espacio tras GAME OVER (lo gobierna el modal React).
- [ ] Al salir de la ruta / desmontar no quedan listeners de teclado ni `requestAnimationFrame` activos (sin loops duplicados al volver a entrar).
- [ ] Los otros 7 juegos (p. ej. `/jugar/caida`) conservan el ticker mock sin cambios.

---

## 6. Decisiones tomadas y descartadas

- **Motor real solo para `asteroids`, con estructura extensible** (`lib/games/asteroids/engine.ts` + wrapper). _Motivo:_ entrega valor ya sin reescribir los 8 juegos; deja el patrón listo para enchufar otros. **Descartado:** framework de juegos genérico para varios juegos a la vez. _Motivo:_ alcance mucho mayor; merece sus propias specs.
- **HUD dibujado dentro del canvas; la barra React conserva solo los botones.** _Motivo:_ fidelidad al original y evita duplicar información. **Descartado:** elevar todo el HUD a React, o mantener ambos HUD sincronizados. _Motivo:_ duplicaría datos en pantalla y añadiría puente de estado innecesario (solo `finalScore` cruza a React).
- **Incluir el power-up 3x** tal como está en `game.js`. _Motivo:_ es el código real de la referencia (aunque su README no lo documente). **Descartado:** ceñirse al set "clásico" del README. _Motivo:_ descartaría código existente y funcional.
- **Resolución lógica fija 800×600 escalada por CSS (letterbox).** _Motivo:_ cero cambios de física/wrap, máxima fidelidad y mínimo riesgo. **Descartado:** canvas responsive con `W/H` dinámicos. _Motivo:_ obliga a reescalar física, posiciones y wrap; complejidad y riesgo altos.
- **El modal React gobierna el fin de partida** (`onGameOver` detiene el motor; sin reinicio nativo con Espacio). _Motivo:_ reutiliza el flujo de guardado ya integrado con la sesión. **Descartado:** reinicio nativo del canvas. _Motivo:_ rompería el guardado de puntuación.
- **Auto-inicio al cargar la ruta; PAUSA congela el `rAF`.** _Motivo:_ fiel al original (arranca solo) y reutiliza el botón PAUSA existente. **Descartado:** pantalla "PULSA START". _Motivo:_ añade un estado y UI fuera del original.
- **Teclado con `preventDefault`; sin táctil.** _Motivo:_ fiel al original; evita el scroll por Espacio/flechas. **Descartado:** controles táctiles. _Motivo:_ alcance y UI adicional; va en otra spec.
- **Persistencia mock (`saveScore` → `localStorage`).** _Motivo:_ aísla el alcance al motor del juego. **Descartado:** conectar Supabase ya. _Motivo:_ requiere esquema, RLS y lectura de leaderboard; su propia spec sobre el plumbing del Spec 04.
- **Rename completo `rocas → asteroids`** (id, título, clase de portada, URL). _Motivo:_ el usuario quiere que el juego se llame Asteroids y deja id/URL coherentes. **Descartado:** cambiar solo el título, o añadir un juego nuevo. _Motivo:_ dejaría id/URL incoherentes (`rocas`) o crearía un duplicado.

---

## 7. Riesgos identificados

| Riesgo                                                                                                                                                    | Mitigación                                                                                                                        |
| --------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| **Globales del original**: `game.js` usa estado a nivel de módulo y `document.getElementById`. Portarlo tal cual crearía fugas/colisiones entre montajes. | Encapsular todo en `createAsteroidsEngine(ctx, callbacks)`; nada de globales mutables; recibir el `ctx` por parámetro.            |
| **Loops/listeners duplicados** al navegar fuera y volver a `/jugar/asteroids` (React 19 monta dos veces en dev con StrictMode).                           | `destroy()` cancela el `rAF` y retira `keydown`/`keyup`; el `useEffect` lo invoca en cleanup. Verificar que no se acumulan loops. |
| **Scroll de página** al pulsar Espacio/flechas.                                                                                                           | `preventDefault` en los handlers de teclado del motor para esas teclas.                                                           |
| **Pausa imperfecta**: si solo se cancela el `rAF` pero `dt` se acumula, al reanudar habría un salto grande.                                               | `dt` ya está capado a 50 ms; al reanudar, reiniciar `lastTime` para que el primer `dt` sea 0.                                     |
| **Escalado borroso** del canvas 800×600 al estirarlo por CSS.                                                                                             | Mantener resolución interna 800×600 y escalar el elemento conservando 4:3; revisar nitidez en el paso de pulido.                  |
| **`finalScore` desfasado**: leer el score después de que el motor lo congele.                                                                             | El motor pasa el score por valor en `onGameOver(score)`; React no lee estado del motor por su cuenta.                             |
| **Rename incompleto**: dejar una referencia a `rocas`/`cover-rocas` rompe portada o ruta.                                                                 | Criterio de aceptación: `grep -rin rocas` limpio fuera de `references/`.                                                          |
