# SPEC VÉRTICE RACER — Propuesta A: Circuito clásico pseudo-3D

> **Estado:** Borrador · **Depende de:** Spec 05 (patrón de motor Asteroids) + Spec 06 (Supabase + 4 pantallas) · **Fecha:** 2026-06-16
> **Objetivo:** Añadir al catálogo un juego de carreras **VÉRTICE RACER** con motor canvas real que renderiza el circuito en **pseudo-3D** mediante la técnica clásica "road racer" (strips de perspectiva por scanline), una sesión de **clasificación a contrarreloj** contra un rival CPU fantasma, fiel al referente Pole Position arcade.
> **Enfoque:** Carrera de **un jugador** contra el reloj y un rival CPU, con render **pseudo-3D** (vista tras el coche, carretera con curvas y colinas). Mecánica de conducción + tiempo de vuelta. Ambición técnica alta. La Propuesta B, en cambio, es VERSUS por turnos top-down 2D, más asequible.

---

## 2. Alcance

**Dentro:**

- **Nueva fila en el catálogo** `games` (no se renombra nada): `id: "vertice-racer"`, `title: "VÉRTICE RACER"`, `cat: "VERSUS"`, `color: "yellow"`, `cover: "cover-vertice"`, `position: 9`, `plays: 0`. Entrada paralela en `lib/data.ts` (semilla) con todos los campos.
- **Portada CSS** `.cover-vertice` (+ `::after`) en `app/globals.css`: gradiente synthwave amarillo/magenta con una sugerencia de carretera en fuga hacia el horizonte (líneas en perspectiva con `repeating-linear-gradient` + `clip-path`).
- **Motor framework-agnóstico** en `lib/games/vertice-racer/engine.ts`: factoría `createVerticeRacerEngine(ctx, callbacks): EngineHandle`.
  - **Render pseudo-3D "road racer"**: la pista se define como un array de **segmentos** (`Segment[]`) con curvatura (`curve`) y elevación (`y` del mundo). En cada frame se proyectan los segmentos desde la posición del coche (`position` a lo largo de la pista) a coordenadas de pantalla, dibujando **trapecios/strips** de carretera de abajo arriba con alternancia de color (asfalto claro/oscuro, arcenes, líneas de carril). El efecto de curva se logra desplazando el centro `x` de cada strip según `curve` acumulada; el efecto de colina, variando el horizonte (`maxY`).
  - **Física del coche del jugador** (Mode 7-like sin Mode 7): `speed` con aceleración/freno, `maxSpeed`; `playerX` (posición lateral ∈ [-1, 1]) controlada por ← →; la fuerza centrífuga en curva empuja `playerX` proporcional a `speed × curve`; salirse del asfalto (|playerX| > 1) reduce `maxSpeed` (césped) y vibra.
  - **Rival CPU fantasma**: un coche oponente (`Opponent`) que avanza por la pista con un perfil de velocidad/curva propio; se dibuja como sprite escalado según su distancia al jugador (más cerca → más grande). El jugador debe adelantarlo.
  - **Sesión de clasificación a contrarreloj**: el jugador corre **vueltas** contra un `lapTimer`. Hay un **checkpoint/meta** por vuelta; cruzar la meta registra el tiempo de vuelta y arranca la siguiente. La sesión tiene `TOTAL_LAPS` (p. ej. 3). Existe un **tiempo límite global** estilo arcade: si el cronómetro de la etapa llega a 0 antes del próximo checkpoint, fin de partida.
- **HUD dentro del canvas**: SPEED (km/h), TIME restante, LAP X/3, BEST LAP, SCORE y posición relativa al rival (P1/P2). Todo dibujado en el propio canvas 800×600 (sin DOM extra).
- **Scoring**: `score` = vueltas completadas × `LAP_BONUS` + bonus por tiempo restante al cruzar meta + bonus por adelantar al rival. `finalScore` es el único valor que cruza a React vía `onGameOver`.
- **Wrapper React** `components/games/vertice-racer-game.tsx` (`"use client"`): monta `<canvas width={800} height={600}>`, arranca el motor, gestiona `requestAnimationFrame`, registra/limpia listeners de teclado; props `{ paused, onGameOver, restartKey }`. Escalado por CSS conservando 4:3.
- **Integración en el reproductor** `components/game-player.tsx`: branch `game.id === "vertice-racer"` → renderiza `<VerticeRacerGame/>`; oculta las cajas de stats React; conserva PAUSA / FIN / SALIR. Reusa el modal de fin y `handleSave` (`saveScore` + `incrementPlay` + `router.refresh()`). JUGAR DE NUEVO → `restartKey++`.
- **Controles teclado**: ↑ acelerar, ↓ frenar/marcha atrás, ← → dirección, `Espacio` freno de mano (opcional). `preventDefault` en flechas y Espacio para no scrollear.

**Fuera (explícito):**

- ❌ Crear tablas, vistas, columnas o RPC nuevos en Supabase — se reusa el esquema del Spec 06; solo se **añade una fila** a `games`.
- ❌ Verdadero modo dos jugadores simultáneo (el "VERSUS" aquí es jugador vs CPU; la batalla a dos humanos local es la Propuesta B).
- ❌ Texturas/sprites bitmap externos: todo se dibuja por código (rectángulos, trapecios, polígonos) en el canvas, estilo vectorial neón.
- ❌ Múltiples circuitos seleccionables: una sola pista generada por datos (curvas + colinas predefinidas).
- ❌ Sonido (motor, derrape) y tests automatizados.
- ❌ Controles táctiles / botones en pantalla.
- ❌ Canvas responsive con física dinámica (resolución interna fija 800×600).

---

## 3. Modelo de datos

**No se crean tablas, vistas ni funciones nuevas** — se reusa el esquema del Spec 06 (`games`, `scores`, vista `games_with_stats`, RPC `increment_play()`, RLS). La única acción Supabase es **insertar una fila** en `games`. No cambia ningún tipo de columna → **no hace falta regenerar `lib/supabase/database.types.ts`**.

### Inserción en `games` (una fila, sin esquema nuevo)

```sql
insert into games (id, title, short, long, cat, cover, color, plays, position)
values (
  'vertice-racer',
  'VÉRTICE RACER',
  'Domina la curva y bate tu mejor vuelta.',
  'Pilota a ras de asfalto en un circuito synthwave que se curva y ondula hacia el horizonte. Acelera en recta, frena justo antes del vértice y adelanta al rival CPU antes de que el cronómetro llegue a cero. Cada vuelta limpia suma; la mejor vuelta es tu trofeo.',
  'VERSUS',
  'cover-vertice',
  'yellow',
  0,
  9
);
```

`scores` recibirá filas vía el flujo normal (`saveScore`) con `game_id = 'vertice-racer'`. No se siembran scores mock (catálogo nuevo; leaderboard arranca vacío salvo lo que se quiera sembrar en `lib/data.ts`).

### Entrada en `lib/data.ts` (mock/semilla, no runtime)

Añadir al array `GAMES` (los tipos `Game`, `Category` no se tocan):

```ts
{
  id: "vertice-racer",
  title: "VÉRTICE RACER",
  short: "Domina la curva y bate tu mejor vuelta.",
  long: "Pilota a ras de asfalto en un circuito synthwave que se curva y ondula hacia el horizonte. Acelera en recta, frena justo antes del vértice y adelanta al rival CPU antes de que el cronómetro llegue a cero. Cada vuelta limpia suma; la mejor vuelta es tu trofeo.",
  cat: "VERSUS",
  cover: "cover-vertice",
  color: "yellow",
  best: 0,
  plays: "0",
},
```

### Estado interno del motor (en memoria, tipado en `lib/games/vertice-racer/engine.ts`)

```ts
interface Segment {
  index: number;
  curve: number; // curvatura del tramo (-: izq, +: der)
  worldY: number; // elevación (colinas)
  color: 0 | 1; // alternancia asfalto claro/oscuro
}

interface Opponent {
  position: number; // posición a lo largo de la pista (z del mundo)
  lateral: number; // carril ∈ [-1, 1]
  speed: number;
}

type GameState = "playing" | "gameover";

interface RaceState {
  position: number; // z del jugador a lo largo de la pista
  playerX: number; // carril ∈ [-1, 1]
  speed: number; // velocidad actual
  lap: number; // vuelta actual (1..TOTAL_LAPS)
  lapTime: number; // ms de la vuelta en curso
  bestLap: number; // mejor tiempo de vuelta (ms)
  stageTime: number; // ms restantes de la etapa (cuenta atrás)
  score: number;
  state: GameState;
}

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

Constantes del motor: `CANVAS_W = 800`, `CANVAS_H = 600`, `SEGMENT_LENGTH = 200`, `ROAD_WIDTH = 2000`, `RUMBLE = 1/6`, `CAMERA_HEIGHT = 1000`, `CAMERA_DEPTH = 1/Math.tan((100/2)*Math.PI/180)` (FOV), `DRAW_DISTANCE = 300` (segmentos visibles), `MAX_SPEED = SEGMENT_LENGTH/STEP`, `ACCEL`, `BRAKE`, `OFF_ROAD_DECEL`, `CENTRIFUGAL`, `TOTAL_LAPS = 3`, `STAGE_TIME = 90000` ms, `LAP_BONUS`, `TIME_BONUS_PER_S`, `OVERTAKE_BONUS`. Colores neón en constantes (`ROAD`, `GRASS`, `RUMBLE_C`, `LANE`) — nada de `getComputedStyle`. Todo el estado vive en la clausura de la factoría; solo `finalScore` cruza a React en `onGameOver`.

---

## 4. Plan de implementación

Cada paso deja la app ejecutable (`npm run dev` / `npm run build`).

> ⚠️ **Nota (AGENTS.md):** antes de tocar rutas (`app/...`) o componentes `"use client"`, consultar `node_modules/next/dist/docs/01-app/` (Next.js 16: `"use client"`, límites RSC, `params` async). No asumir convenios del App Router de memoria.

1. **Catálogo + portada.** Añadir la entrada `vertice-racer` al array `GAMES` de `lib/data.ts` con todos los campos. Crear `.cover-vertice` (+ `::after`) en `app/globals.css` (gradiente synthwave + líneas de fuga). _Sin tocar Supabase aún._
   - _Verifica:_ la Biblioteca muestra la nueva tarjeta VÉRTICE RACER con su portada; `npm run build` limpio. (La ruta `/jugar/vertice-racer` aún caerá en el ticker mock.)

2. **Inserción en Supabase.** `apply_migration` con el `insert into games (...)` de arriba. No se regeneran tipos (no cambia el esquema).
   - _Verifica:_ `select id,title,cat,color,position from games where id='vertice-racer'` devuelve una fila; `games_with_stats` la incluye con `best=0`, `score_count=0`; `get_advisors` (security) sin hallazgos críticos.

3. **Motor: pista + render pseudo-3D estático.** `lib/games/vertice-racer/engine.ts` — factoría `createVerticeRacerEngine(ctx, callbacks)`. Definir la pista como `Segment[]` generada por una función `buildTrack()` (alternar tramos rectos, curvas izq/der y colinas; tramo de meta marcado). Implementar `project(segment, cameraX, cameraY, cameraZ)` y `render()` que dibuja de abajo arriba los strips de carretera + arcén + césped + líneas de carril, con clipping por `maxY`. Loop con `requestAnimationFrame` (sin lógica de movimiento todavía: cámara fija).
   - _Verifica:_ aislado, el canvas pinta un circuito que se curva/ondula hacia el horizonte; compila con TS strict; sin `document.getElementById` ni `getComputedStyle`.

4. **Motor: física del coche + cámara.** Añadir `RaceState`: `↑/↓` modifican `speed` (ACCEL/BRAKE, cap a `MAX_SPEED`); `position += speed × dt`; `← →` mueven `playerX`; fuerza centrífuga `playerX -= speed × curve × CENTRIFUGAL × dt`; fuera de asfalto aplica `OFF_ROAD_DECEL`. La cámara sigue al coche (`cameraZ = position`). Dibujar el coche del jugador (sprite vectorial) anclado abajo, desplazado por `playerX`. Handlers `keydown`/`keyup` con `preventDefault` en flechas/Espacio, añadidos en `start()` y retirados en `destroy()`.
   - _Verifica:_ se conduce: acelera, frena, las curvas empujan, el césped frena; al soltar dirección el coche recentra suavemente.

5. **Motor: vueltas, rival CPU y scoring.** Detectar cruce de meta → `lap++`, registrar `lapTime`, actualizar `bestLap`, sumar `LAP_BONUS` + bonus por tiempo. `stageTime` cuenta atrás; a 0 → game over. Añadir `Opponent`: avanza por la pista, se dibuja escalado por distancia; adelantarlo suma `OVERTAKE_BONUS` y marca P1. Completar `TOTAL_LAPS` o agotar `stageTime` → `state="gameover"` y `callbacks.onGameOver(score)` **una sola vez** (flag).
   - _Verifica:_ el cronómetro corre; cruzar meta suma vuelta y puntos; el rival se ve y se puede adelantar; al terminar se dispara `onGameOver` con el score real una sola vez.

6. **HUD dentro del canvas.** Dibujar SPEED, TIME, LAP X/3, BEST LAP, SCORE y P1/P2 sobre el canvas (tipografía pixel, colores neón). Banner "LAP TIME" al cruzar meta; "GAME OVER" / "FINISH" al terminar.
   - _Verifica:_ el HUD se ve dentro del canvas; los datos cambian en tiempo real; no hay DOM extra.

7. **Wrapper React** `components/games/vertice-racer-game.tsx` (`"use client"`). Props `{ paused, onGameOver, restartKey }`. `useEffect` de montaje (deps vacías): `ctx` del `<canvas width={800} height={600}>`, crear motor, `start()`; cleanup → `destroy()`. `useEffect` sobre `paused` → `pause()`/`resume()`. `useEffect` sobre `restartKey` → `restart()`. `onGameOver` en un ref para evitar closures viejos. Canvas escalado por CSS dentro de `.crt-screen` conservando 4:3.
   - _Verifica:_ aislado corre, responde al teclado, no scrollea; al desmontar no quedan listeners ni rAF activos.

8. **Integración en el reproductor** `components/game-player.tsx`. Branch `game.id === "vertice-racer"`: renderiza `<VerticeRacerGame paused={paused} onGameOver={handleEngineGameOver} restartKey={restartKey}/>`; oculta las cajas de stats React; conserva PAUSA / FIN / SALIR. Reusa el modal de fin y `handleSave`. JUGAR DE NUEVO → `restartKey++`. El resto de juegos sin cambios.
   - _Verifica:_ en `/jugar/vertice-racer` se conduce de verdad; PAUSA congela y REANUDAR retoma; FIN abre el modal con el score real; GUARDAR inserta fila en `scores` e incrementa `plays`; el score aparece en el top de `/juego/vertice-racer` al refrescar.

9. **Pulido y verificación final.** Nitidez del canvas (sin blur de escalado), flechas/Espacio no mueven la página, sin loops duplicados al navegar fuera y volver (StrictMode). `npm run lint` y `npm run build` limpios.

**Archivos que aparecen o cambian:**

- Nuevos: `lib/games/vertice-racer/engine.ts`, `components/games/vertice-racer-game.tsx`.
- Modificados: `lib/data.ts`, `app/globals.css`, `components/game-player.tsx`.
- Supabase: una migración de `insert` en `games` (sin esquema nuevo).

---

## 5. Criterios de aceptación (checklist booleana)

- [ ] La Biblioteca muestra la tarjeta **VÉRTICE RACER** (cat VERSUS, color yellow) con portada `.cover-vertice`; `/juego/vertice-racer` y `/jugar/vertice-racer` resuelven (200).
- [ ] `select * from games where id='vertice-racer'` devuelve una fila con `cat='VERSUS'`, `color='yellow'`, `position=9`; aparece en `games_with_stats`.
- [ ] En `/jugar/vertice-racer` se renderiza un `<canvas>` jugable (no el ticker mock) con render **pseudo-3D**: la carretera se curva y ondula hacia el horizonte.
- [ ] Se conduce: ↑ acelera, ↓ frena, ← → dirigen; las curvas aplican fuerza centrífuga y salirse al césped reduce la velocidad.
- [ ] El **rival CPU** se dibuja escalado por distancia y puede ser adelantado (indicador P1/P2).
- [ ] El cronómetro de etapa cuenta atrás; cruzar la **meta** suma vuelta, registra **lap time** y actualiza **BEST LAP**.
- [ ] El HUD (SPEED / TIME / LAP / BEST LAP / SCORE / P1-P2) se dibuja **dentro del canvas**; las cajas de stats React no aparecen para `vertice-racer`.
- [ ] Pulsar flechas/Espacio **no** hace scroll de la página.
- [ ] Completar `TOTAL_LAPS` o agotar `stageTime` dispara `onGameOver` con el score real **una sola vez**; el motor no se reinicia con tecla tras game over (lo gobierna el modal React).
- [ ] PAUSA congela y REANUDAR retoma donde estaba; FIN abre el modal con la puntuación real.
- [ ] GUARDAR PUNTUACIÓN inserta fila en `scores` (`game_id='vertice-racer'`) e `increment_play` incrementa `plays`; el score aparece en el top del Detalle al refrescar.
- [ ] Al desmontar / navegar fuera no quedan listeners de teclado ni `requestAnimationFrame` activos (sin loops duplicados al volver).
- [ ] Los otros 8 juegos conservan su comportamiento sin cambios.
- [ ] `npm run build` y `npm run lint` sin errores; `get_advisors` (security) sin hallazgos críticos.

---

## 6. Decisiones tomadas y descartadas

- **Render pseudo-3D "road racer" por strips de scanline** (proyección de segmentos), no Mode 7 ni WebGL. _Motivo:_ es exactamente la técnica del Pole Position original; encaja en canvas 2D, es fiel al referente y mantiene la estética vectorial neón. **Descartado:** Mode 7 (requiere transformaciones de textura, más costoso) y un raycaster (no aplica a carreras).
- **VERSUS = jugador vs rival CPU fantasma**, no dos humanos. _Motivo:_ permite la fidelidad pseudo-3D y el modo contrarreloj clásico sin partir la pantalla; el rival CPU aporta tensión de adelantamiento. **Descartado:** split-screen a dos jugadores (coste de render doble; es la Propuesta B con otro enfoque).
- **Sesión de clasificación a contrarreloj con tiempo límite de etapa.** _Motivo:_ es el corazón arcade de Pole Position (qualifying + checkpoints); da un loop de scoring claro (vueltas + tiempo). **Descartado:** carrera de posiciones contra una parrilla de rivales (más IA, fuera de alcance del jam).
- **Pista única generada por datos** (`buildTrack()`). _Motivo:_ una sola pista bien diseñada basta para el jam y simplifica el motor. **Descartado:** selector de circuitos (más estado/UI).
- **Sprites vectoriales por código** (coche y rival dibujados con polígonos). _Motivo:_ coherente con el estilo del arcade y evita assets externos. **Descartado:** sprites bitmap (assets, carga, escalado borroso).
- **HUD dibujado dentro del canvas; la barra React conserva solo los botones.** _Motivo:_ patrón de Asteroids/Tetris; solo `finalScore` cruza a React. **Descartado:** elevar el HUD a React.
- **Pausa gobernada por el botón PAUSA de React** (sin tecla `P`). _Motivo:_ evita desincronía con el estado `paused`. **Descartado:** tecla de pausa en el motor.

---

## 7. Riesgos identificados

| Riesgo                                                                                                                                                         | Mitigación                                                                                                                                                                                                       |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Complejidad del render pseudo-3D**: la proyección por segmentos (curvas + colinas + clipping) es la parte más delicada y puede salir torcida o con "saltos". | Implementar primero el render estático (paso 3) con cámara fija y validar visualmente antes de mover el coche; usar el algoritmo canónico de proyección de segmentos (acumular `curve` en `x`, clip por `maxY`). |
| **Física de conducción poco "jugable"** (coche que patina o no recentra).                                                                                      | Constantes ajustables (`ACCEL`, `CENTRIFUGAL`, `OFF_ROAD_DECEL`) afinadas en el paso 4; recentrado suave al soltar dirección; cap de `speed`.                                                                    |
| **Rival CPU injusto o invisible** (escalado o posición mal proyectados).                                                                                       | Reusar la misma `project()` del jugador para el rival; clamp del tamaño del sprite; perfil de velocidad del rival ligeramente inferior al máximo del jugador.                                                    |
| **`onGameOver` disparado más de una vez** al terminar etapa/vueltas.                                                                                           | Flag `gameOverFired`; tras game over la lógica deja de actualizarse.                                                                                                                                             |
| **Loops/listeners duplicados** al navegar fuera y volver (React 19 StrictMode monta dos veces en dev).                                                         | `destroy()` cancela el `rAF` y retira `keydown`/`keyup`; el `useEffect` lo invoca en cleanup.                                                                                                                    |
| **Salto temporal tras PAUSA** por `dt` acumulado.                                                                                                              | `dt` capado (p. ej. 50 ms); al reanudar reiniciar `lastTime` para que el primer `dt` sea ~0.                                                                                                                     |
| **Escalado borroso** del canvas 800×600 estirado por CSS.                                                                                                      | Resolución interna fija 800×600; escalar el elemento conservando proporción; revisar nitidez en el pulido.                                                                                                       |
| **Scroll de página** al pulsar Espacio/flechas.                                                                                                                | `preventDefault` en los handlers del motor para esas teclas.                                                                                                                                                     |
