# SPEC 07 — Motor real de Tetris en el reproductor (rename `caida → tetris`)

> **Estado:** Aprobado · **Depende de:** Spec 05 (patrón de motor) + Spec 06 (Supabase + 4 pantallas) · **Fecha:** 2026-06-16
> **Objetivo:** Sustituir el ticker mock del reproductor por un motor canvas real de **Tetris** —portado desde `references/started-games/03-tetris/game.js`, conservando la pieza no estándar "tuerca"— **solo para el juego renombrado `tetris`** (antes `caida`), con HUD y preview de la siguiente pieza dibujados dentro del canvas, controles de teclado y guardado por el flujo Supabase existente.

---

## 2. Alcance

**Dentro:**

- **Rename de catálogo `caida → tetris`** (completo, estilo Spec 05 `rocas → asteroids`):
  - `lib/data.ts`: entrada `id: "caida"` → `"tetris"`, `title: "CAÍDA"` → `"TETRIS"`, `cover: "cover-tetro"` → `"cover-tetris"`. Se **conservan** `short`, `long`, `cat: "PUZZLE"`, `color: "magenta"`.
  - `app/globals.css`: renombrar `.cover-tetro` (+ `::after`) → `.cover-tetris`.
  - `components/home.tsx:247`: actividad reciente `g: "Caída"` → `"Tetris"`.
  - Supabase: rename del id `caida → tetris` en `games` y `scores` (transacción con drop/re-add del FK). **Sin tablas, columnas ni filas nuevas; los scores semilla se conservan.**
  - Efecto: las rutas pasan a `/juego/tetris` y `/jugar/tetris`.

- **Motor del juego (framework-agnóstico)** en `lib/games/tetris/engine.ts`: portar `game.js` a TypeScript strict. Tablero 10×20, las **8 piezas** (I,O,T,S,Z,J,L + `N` tuerca), `rotateCW` + wall kicks `[0,±1,±2]`, `collide`, `merge`, `clearLines`, `ghostY`, hard drop (+2/celda) y soft drop (+1/fila), `LINE_SCORES=[0,100,300,500,800]` × nivel, nivel = `floor(lines/10)+1`, `dropInterval = max(100, 1000−(level−1)×90)` ms. **Resolución lógica fija 800×600**: tablero 300×600 a la izquierda y panel HUD a la derecha. El color de la grilla, hoy leído por `getComputedStyle(--grid-line)`, pasa a constante del motor.

- **HUD dentro del canvas:** SCORE / LINES / LEVEL y **preview de la siguiente pieza** dibujados en el panel lateral del propio canvas (se elimina el segundo `<canvas id="next-canvas">` del original).

- **Wrapper React** `components/games/tetris-game.tsx` (`"use client"`): monta `<canvas width={800} height={600}>`, arranca el motor en `useEffect`, gestiona `requestAnimationFrame`, registra/limpia listeners de teclado, expone props `{ paused, onGameOver, restartKey }`. Escalado **800×600 por CSS** dentro de `.crt-screen` (letterbox, conserva proporción).

- **Integración en el reproductor** `components/game-player.tsx`: branch `game.id === "tetris"` → renderiza `<TetrisGame/>` en lugar del ticker mock; oculta las cajas de stats React (Puntuación/Vidas/Nivel) y conserva los botones PAUSA / FIN / SALIR. Reusa el **modal de fin existente** y su `handleSave` (que ya llama `saveScore(...)` + `incrementPlay(...)` + `router.refresh()`). JUGAR DE NUEVO incrementa `restartKey`. El resto de juegos conserva su comportamiento.

- **Controles:** teclado — ← → mover, ↑ / `X` rotar (horario), ↓ soft drop, Espacio hard drop. `preventDefault` en flechas y Espacio para no scrollear la página.

**Fuera (explícito):**

- ❌ Tecla `P` de pausa del original: la pausa la gobierna el botón PAUSA de React (prop `paused`).
- ❌ Toggle de tema claro/oscuro y su `localStorage` del original (se descartan).
- ❌ Motor real para los otros 7 juegos (siguen con el ticker mock).
- ❌ Controles táctiles / botones en pantalla.
- ❌ Canvas responsive con física dinámica (resolución interna fija 800×600).
- ❌ Sonido y tests automatizados.
- ❌ Tablas/columnas nuevas en Supabase: se reusa el esquema del Spec 06.

---

## 3. Modelo de datos

**No se crean tablas, vistas ni funciones nuevas** — se reusa el esquema del Spec 06 (`games`, `scores`, vista `games_with_stats`, RPC `increment_play()`, RLS). El catálogo **no añade una fila**: se **renombra** la existente.

### Cambio en `games` / `scores` (rename de id, no inserción)

```sql
-- en una sola transacción (FK es NO ACTION on update):
alter table scores drop constraint scores_game_id_fkey;
update games  set id      = 'tetris', title = 'TETRIS', cover = 'cover-tetris' where id = 'caida';
update scores set game_id = 'tetris' where game_id = 'caida';
alter table scores add constraint scores_game_id_fkey
  foreign key (game_id) references games(id) on delete cascade;
```

`position` (2), `plays` (31800), `cat` (PUZZLE), `color` (magenta) y los **scores semilla** se conservan intactos. No cambia ningún tipo de columna → **no hace falta regenerar `lib/supabase/database.types.ts`**.

### Cambio en `lib/data.ts` (mock/semilla, no runtime)

Valores de la entrada, no tipos: `id`/`title`/`cover` de `caida` → `tetris`. Los `type` (`Game`, `ScoreRow`, `Category`) no se tocan.

### Estado interno del motor (en memoria, tipado en `lib/games/tetris/engine.ts`)

```ts
type PieceType = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8; // 8 = tuerca
type Board = number[][]; // ROWS×COLS; 0 vacío, 1–8 índice de color
interface Piece {
  type: PieceType;
  shape: number[][];
  x: number;
  y: number;
}
type GameState = "playing" | "gameover";

interface EngineHandle {
  start(): void;
  pause(): void;
  resume(): void;
  restart(): void;
  destroy(): void; // cancela rAF + retira listeners
}
interface EngineCallbacks {
  onGameOver: (finalScore: number) => void; // único puente motor → React, dispara UNA vez
}
```

Constantes portadas tal cual: `COLS=10`, `ROWS=20`, `BLOCK=30`, `COLORS[1..8]`, `PIECES[1..8]`, `LINE_SCORES=[0,100,300,500,800]`, + `GRID_LINE` (constante que sustituye al `getComputedStyle`). `score`/`lines`/`level`/`board`/`current`/`next`/`dropInterval`/`dropAccum` viven en la clausura de la factoría; solo `finalScore` cruza a React en `onGameOver`.

---

## 4. Plan de implementación

Cada paso deja la app ejecutable (`npm run dev` / `npm run build`).

> ⚠️ **Nota (AGENTS.md):** antes de tocar rutas (`app/...`) o componentes `"use client"`, consultar `node_modules/next/dist/docs/01-app/` (Next.js 16: `"use client"`, límites RSC, `params` async). No asumir convenios del App Router de memoria.

1. **Rename de catálogo + portada.** `lib/data.ts`: `id`/`title`/`cover` de `caida` → `tetris`/`TETRIS`/`cover-tetris`. `app/globals.css`: `.cover-tetro` (+ `::after`) → `.cover-tetris`. `components/home.tsx:247`: `g: "Caída"` → `"Tetris"`.
   - _Verifica:_ no quedan referencias a `caida`/`cover-tetro` fuera de `references/` (`grep -rin "caida\|cover-tetro" app components lib`).

2. **Rename en Supabase.** `apply_migration` con la transacción: drop FK → `update games` (id/title/cover) → `update scores` (game_id) → re-add FK. No se regeneran tipos (no cambia el esquema).
   - _Verifica:_ `select id,title,cover from games where id='tetris'` devuelve una fila; `select count(*) from scores where game_id='tetris'` = el conteo previo de `caida`; `get_advisors` (security) sin hallazgos críticos.

3. **Motor portado** `lib/games/tetris/engine.ts`. Factoría `createTetrisEngine(ctx, callbacks): EngineHandle`. Portar `board`/`current`/`next`/`createBoard`/`randomPiece` (8 piezas)/`collide`/`rotateCW`/`tryRotate`/`merge`/`clearLines`/`ghostY`/`hardDrop`/`softDrop`/`lockPiece`/`spawn`/`draw`/`drawBlock`/`drawGrid`, **más** el dibujo del HUD lateral (SCORE/LINES/LEVEL) y la preview de la siguiente pieza **dentro del canvas 800×600**. Loop con `requestAnimationFrame`, `dt` capado a 50 ms; al reanudar reiniciar `lastTime`. Handlers `keydown` con `preventDefault` en flechas/Espacio, añadidos en `start()` y retirados en `destroy()`.
   - _Cambio clave vs original:_ al colisionar el `spawn` (game over) llamar `callbacks.onGameOver(score)` una sola vez (flag) y dejar de actualizar la lógica; **no** reiniciar con tecla. Sin globales de módulo, sin `document.getElementById`, sin `getComputedStyle`, sin toggle de tema.
   - _Verifica:_ compila con TS strict; sin referencias a `document.getElementById` ni globales mutables de módulo.

4. **Wrapper React** `components/games/tetris-game.tsx` (`"use client"`). Props `{ paused, onGameOver, restartKey }`. `useEffect` de montaje (deps vacías): `ctx` del `<canvas width={800} height={600}>`, crear motor, `start()`; cleanup → `destroy()`. `useEffect` sobre `paused` → `pause()`/`resume()`. `useEffect` sobre `restartKey` → `restart()`. `onGameOver` en un ref para evitar closures viejos. Canvas escalado por CSS al contenedor conservando 4:3.
   - _Verifica:_ aislado, el juego corre, responde al teclado y no scrollea; al desmontar no quedan listeners ni rAF activos.

5. **Integración en el reproductor** `components/game-player.tsx`. Branch `game.id === "tetris"`: renderiza `<TetrisGame paused={paused} onGameOver={handleEngineGameOver} restartKey={restartKey}/>` dentro de `.crt-screen`; oculta las cajas de stats React; conserva PAUSA / FIN / SALIR. Reusa el modal de fin y `handleSave` (`saveScore` + `incrementPlay` + `router.refresh()`). JUGAR DE NUEVO → `restartKey++`. El resto de juegos sin cambios.
   - _Verifica:_ en `/jugar/tetris` se juega de verdad; PAUSA congela y REANUDAR retoma; FIN abre el modal con el score real; GUARDAR inserta fila en `scores` e incrementa `plays`; el score aparece en el top de `/juego/tetris` al refrescar; `/jugar/caida` ya no existe (404 / `notFound`).

6. **Pulido y verificación final.** Nitidez del canvas (sin blur de escalado), flechas/Espacio no mueven la página, sin loops duplicados al navegar fuera y volver. `npm run lint` y `npm run build` limpios.

**Archivos que aparecen o cambian:**

- Nuevos: `lib/games/tetris/engine.ts`, `components/games/tetris-game.tsx`.
- Modificados: `lib/data.ts`, `app/globals.css`, `components/home.tsx`, `components/game-player.tsx`.
- Supabase: una migración de rename (sin esquema nuevo).

---

## 5. Criterios de aceptación (checklist booleana)

- [ ] No quedan referencias a `caida`/`cover-tetro` fuera de `references/` (`grep -rin` limpio en `app/`, `components/`, `lib/`).
- [ ] La Biblioteca muestra la tarjeta como **TETRIS**; `/juego/tetris` y `/jugar/tetris` resuelven (200, no 404); la portada `.cover-tetris` se ve igual que la anterior; `/juego/caida` y `/jugar/caida` → `notFound()`.
- [ ] En `/jugar/tetris` se renderiza un `<canvas>` jugable (no el ticker mock): las piezas caen, ← → mueven, ↑/`X` rotan (con wall kicks), ↓ hace soft drop y Espacio hard drop.
- [ ] Aparecen las **8 piezas**, incluida la tuerca `N`.
- [ ] Pulsar flechas/Espacio **no** hace scroll de la página.
- [ ] El HUD (SCORE/LINES/LEVEL) y la **preview de la siguiente pieza** se dibujan **dentro del canvas**; las cajas de stats React no aparecen para `tetris`.
- [ ] Limpiar líneas suma según `[0,100,300,500,800]×nivel`; el nivel sube cada 10 líneas y la caída se acelera.
- [ ] PAUSA congela y REANUDAR retoma donde estaba; FIN abre el modal con la puntuación real del motor.
- [ ] El modal "FIN DEL JUEGO" muestra el score real; GUARDAR PUNTUACIÓN inserta una fila en `scores` (con `game_id='tetris'`) e `increment_play` incrementa `plays`; el score aparece en el top del Detalle al refrescar.
- [ ] El motor **no** se reinicia con tecla tras GAME OVER (lo gobierna el modal React).
- [ ] Al desmontar / navegar fuera no quedan listeners de teclado ni `requestAnimationFrame` activos (sin loops duplicados al volver).
- [ ] Los otros 7 juegos conservan su comportamiento sin cambios.
- [ ] `select count(*) from scores where game_id='tetris'` = el conteo que tenía `caida`; no existe ya `game_id='caida'`.
- [ ] `npm run build` y `npm run lint` sin errores; `get_advisors` (security) sin hallazgos críticos.

---

## 6. Decisiones tomadas y descartadas

- **Portar al slot existente `caida` con rename completo a `tetris`** (id/URL/título/cover). _Motivo:_ `caida` ya era el Tetris del catálogo; un id/título/URL coherentes siguen el precedente `rocas → asteroids` (Spec 05). **Descartado:** añadir un juego nuevo `tetris` en posición 9 (duplicaría dos juegos de piezas) o conservar el nombre "CAÍDA" con id `tetris` (id y título dispares).
- **Conservar la pieza tuerca `N`** (8 piezas). _Motivo:_ es código real de la referencia, como el power-up 3x de Asteroids, y aporta sabor a Arcade Vault. **Descartado:** ceñirse a los 7 tetrominós del README.
- **Canvas 800×600 con tablero 300×600 + panel HUD lateral dentro del canvas.** _Motivo:_ unifica HUD y preview en un solo canvas (el original usaba dos), coincide con la resolución 800×600 de Asteroids y permite escalado por CSS sin reescalar la física. **Descartado:** canvas estrecho 300×600 con HUD overlay y sin preview (pierde la vista de siguiente pieza); canvas responsive (obliga a reescalar física).
- **Pausa gobernada solo por el botón PAUSA de React** (se descarta la tecla `P`). _Motivo:_ evita desincronía entre el overlay del motor y el estado `paused` de React; fiel al patrón de Asteroids. **Descartado:** mantener `P` en el motor además del botón.
- **Conservar los scores semilla existentes; única acción Supabase = rename del id.** _Motivo:_ el slot ya tenía leaderboard poblado; no hay razón para reseed ni para empezar vacío. **Descartado:** reseed de scores mock o leaderboard vacío.
- **Conservar los textos `short`/`long`.** _Motivo:_ ya describen Tetris fielmente. **Descartado:** reescribirlos para nombrar Tetris/la tuerca.
- **HUD dibujado dentro del canvas; la barra React conserva solo los botones.** _Motivo:_ fidelidad al original y evita duplicar información; solo `finalScore` cruza a React. **Descartado:** elevar el HUD a React.
- **Teclado con `preventDefault`; sin táctil ni sonido.** _Motivo:_ fiel al original; evita scroll por Espacio/flechas. **Descartado:** controles táctiles (otra spec).

---

## 7. Riesgos identificados

| Riesgo                                                                                                                                                                                                   | Mitigación                                                                                                                                                                     |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Globales del original**: `game.js` usa estado a nivel de módulo, `document.getElementById`, `getComputedStyle` y un toggle de tema con `localStorage`. Portarlo tal cual filtra estado entre montajes. | Encapsular todo en `createTetrisEngine(ctx, callbacks)`; recibir `ctx` por parámetro; sustituir `getComputedStyle(--grid-line)` por una constante; eliminar el toggle de tema. |
| **Loops/listeners duplicados** al navegar fuera y volver (React 19 StrictMode monta dos veces en dev).                                                                                                   | `destroy()` cancela el `rAF` y retira `keydown`; el `useEffect` lo invoca en cleanup. Verificar que no se acumulan loops.                                                      |
| **Rename de FK**: `scores_game_id_fkey` es `NO ACTION on update`; un `UPDATE games.id` directo viola el FK.                                                                                              | Migración en transacción: drop FK → update `games.id` + `scores.game_id` → re-add FK `on delete cascade`.                                                                      |
| **Rename incompleto**: dejar `caida`/`cover-tetro` en código o BD rompe portada/ruta o deja datos huérfanos.                                                                                             | Criterio de aceptación: `grep -rin "caida\|cover-tetro"` limpio fuera de `references/`; verificar conteo de `scores` migrado.                                                  |
| **Escalado borroso** del canvas 800×600 estirado por CSS.                                                                                                                                                | Resolución interna fija 800×600; escalar el elemento conservando proporción; revisar nitidez en el pulido.                                                                     |
| **Scroll de página** al pulsar Espacio/flechas.                                                                                                                                                          | `preventDefault` en los handlers del motor para esas teclas.                                                                                                                   |
| **Pausa imperfecta**: al reanudar, `dt` acumulado produce un salto.                                                                                                                                      | `dt` capado a 50 ms; al reanudar reiniciar `lastTime` para que el primer `dt` sea 0.                                                                                           |
