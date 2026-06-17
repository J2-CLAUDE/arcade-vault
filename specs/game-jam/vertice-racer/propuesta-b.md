# SPEC VÉRTICE RACER — Propuesta B: Carrera VERSUS por turnos (top-down 2D)

> **Estado:** Borrador · **Depende de:** Spec 05 (patrón de motor Asteroids) + Spec 06 (Supabase + 4 pantallas) · **Fecha:** 2026-06-16
> **Objetivo:** Añadir al catálogo un juego de carreras **VÉRTICE RACER** con motor canvas real de **vista top-down 2D** y un modo **VERSUS por turnos** en la misma máquina: dos jugadores alternan runs por un circuito con obstáculos (coches, vallas), y gana quien acumule **más distancia** en su run.
> **Enfoque:** Carrera **VERSUS local a dos humanos por turnos** (run de P1, luego run de P2, comparación) en **top-down 2D scroll vertical**, sin pseudo-3D. Motor más asequible y encaje directo en la categoría VERSUS. La Propuesta A, en cambio, es un jugador vs CPU con render pseudo-3D fiel a Pole Position, técnicamente más ambicioso.

---

## 2. Alcance

**Dentro:**

- **Nueva fila en el catálogo** `games` (no se renombra nada): `id: "vertice-racer"`, `title: "VÉRTICE RACER"`, `cat: "VERSUS"`, `color: "yellow"`, `cover: "cover-vertice"`, `position: 9`, `plays: 0`. Entrada paralela en `lib/data.ts` (semilla) con todos los campos.
- **Portada CSS** `.cover-vertice` (+ `::after`) en `app/globals.css`: gradiente synthwave amarillo/magenta con una carretera vertical vista desde arriba (dos coches enfrentados) usando `repeating-linear-gradient` para los carriles.
- **Motor framework-agnóstico** en `lib/games/vertice-racer/engine.ts`: factoría `createVerticeRacerEngine(ctx, callbacks): EngineHandle`.
  - **Vista top-down 2D, scroll vertical**: la carretera ocupa una franja central del canvas con arcenes neón a los lados. El mundo "se desplaza" hacia abajo a `scrollSpeed` (proporcional a la velocidad del coche), simulando avance. Líneas de carril discontinuas animadas dan sensación de movimiento.
  - **Coche del jugador activo**: posición lateral `carX` controlada por ← →; velocidad `speed` con ↑/↓ (acelerar/frenar). El coche es un sprite vectorial dibujado en la zona baja del canvas; solo se mueve en horizontal (el avance es el scroll del mundo).
  - **Obstáculos**: `Obstacle[]` que aparecen arriba y bajan con el scroll — **coches de tráfico** (más lentos, en carriles) y **vallas** (estáticas, bloquean parte de la pista). Colisión por AABB: chocar **termina la run actual** (no resta vida; el run acaba ahí). Densidad/velocidad de obstáculos aumenta con la distancia recorrida.
  - **Modo VERSUS por turnos**: la partida tiene **dos runs**. `currentPlayer ∈ {1, 2}`. P1 corre hasta chocar o agotar `RUN_TIME`; se registra `distanceP1`. Pantalla "TURNO P2 — PREPARADO"; P2 corre con **la misma semilla de obstáculos** (`seed`) para que sea justo; se registra `distanceP2`. Al terminar ambos, pantalla de resultado **GANA P1/P2/EMPATE**. El `finalScore` reportado a React es `max(distanceP1, distanceP2)` (mejor distancia de la mesa).
  - **Mismo dispositivo, mismos controles**: ambos jugadores usan ← → ↑ ↓ porque corren **por turnos** (no simultáneos), evitando conflictos de teclado.
- **HUD dentro del canvas**: PLAYER (1/2), DISTANCE (m), SPEED, RUN TIME restante y, durante el turno de P2, un marcador "P1: NNNN m" como objetivo a batir. Pantallas intermedias de turno y de resultado. Todo dibujado en el canvas 800×600.
- **Scoring**: `distance` se acumula con `scrollSpeed × dt` durante cada run; bonus por velocidad sostenida. `finalScore = max(distanceP1, distanceP2)`; cruza a React vía `onGameOver` (una sola vez, al cerrar la pantalla de resultado).
- **Wrapper React** `components/games/vertice-racer-game.tsx` (`"use client"`): monta `<canvas width={800} height={600}>`, arranca el motor, gestiona `requestAnimationFrame`, registra/limpia listeners de teclado; props `{ paused, onGameOver, restartKey }`. Escalado por CSS conservando 4:3.
- **Integración en el reproductor** `components/game-player.tsx`: branch `game.id === "vertice-racer"` → renderiza `<VerticeRacerGame/>`; oculta las cajas de stats React; conserva PAUSA / FIN / SALIR. Reusa el modal de fin y `handleSave` (`saveScore` + `incrementPlay` + `router.refresh()`). JUGAR DE NUEVO → `restartKey++`.
- **Controles teclado**: ↑ acelerar, ↓ frenar, ← → cambiar de carril/posición lateral, `Espacio` para confirmar las pantallas intermedias (empezar turno / ver resultado). `preventDefault` en flechas y Espacio para no scrollear.

**Fuera (explícito):**

- ❌ Crear tablas, vistas, columnas o RPC nuevos en Supabase — se reusa el esquema del Spec 06; solo se **añade una fila** a `games`.
- ❌ Render pseudo-3D / Mode 7 / perspectiva (eso es la Propuesta A): aquí la vista es estrictamente top-down 2D.
- ❌ Dos jugadores **simultáneos** en split-screen (el VERSUS es **por turnos**, una run cada uno).
- ❌ IA de rival CPU (no hay oponente computado; se compite contra la distancia del otro humano).
- ❌ Texturas/sprites bitmap externos: todo dibujado por código (rectángulos/polígonos), estilo vectorial neón.
- ❌ Curvas en la pista: la carretera es recta con scroll vertical (la dificultad viene de obstáculos y velocidad).
- ❌ Sonido y tests automatizados.
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
  'Dos pilotos, un asfalto. ¿Quién llega más lejos?',
  'Duelo de carretera por turnos en la misma máquina. El Jugador 1 esquiva tráfico y vallas a toda velocidad hasta estrellarse; luego el Jugador 2 corre el mismo trazado e intenta superar su marca. Gana quien acumule más distancia. Vista cenital, reflejos puros.',
  'VERSUS',
  'cover-vertice',
  'yellow',
  0,
  9
);
```

`scores` recibirá filas vía el flujo normal (`saveScore`) con `game_id = 'vertice-racer'` (la mejor distancia de la mesa). No se siembran scores mock (leaderboard arranca vacío).

### Entrada en `lib/data.ts` (mock/semilla, no runtime)

Añadir al array `GAMES` (los tipos `Game`, `Category` no se tocan):

```ts
{
  id: "vertice-racer",
  title: "VÉRTICE RACER",
  short: "Dos pilotos, un asfalto. ¿Quién llega más lejos?",
  long: "Duelo de carretera por turnos en la misma máquina. El Jugador 1 esquiva tráfico y vallas a toda velocidad hasta estrellarse; luego el Jugador 2 corre el mismo trazado e intenta superar su marca. Gana quien acumule más distancia. Vista cenital, reflejos puros.",
  cat: "VERSUS",
  cover: "cover-vertice",
  color: "yellow",
  best: 0,
  plays: "0",
},
```

### Estado interno del motor (en memoria, tipado en `lib/games/vertice-racer/engine.ts`)

```ts
type ObstacleKind = "car" | "fence";

interface Obstacle {
  kind: ObstacleKind;
  x: number; // posición lateral en píxeles de pista
  y: number; // posición vertical (baja con el scroll)
  w: number;
  h: number;
  speed: number; // 0 para vallas; tráfico < scrollSpeed
}

type Phase =
  | "run-p1"
  | "intermission" // pantalla "TURNO P2 — PREPARADO"
  | "run-p2"
  | "result"; // GANA P1/P2/EMPATE, espera Espacio → onGameOver

interface RunState {
  carX: number; // posición lateral del coche activo
  speed: number; // velocidad actual
  distance: number; // metros acumulados en la run en curso
  runTime: number; // ms restantes de la run
  obstacles: Obstacle[];
  rngState: number; // PRNG para reproducir la misma pista en ambos turnos
}

interface MatchState {
  phase: Phase;
  currentPlayer: 1 | 2;
  distanceP1: number;
  distanceP2: number;
  seed: number; // semilla compartida para que ambas runs sean idénticas
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

Constantes del motor: `CANVAS_W = 800`, `CANVAS_H = 600`, `ROAD_LEFT`, `ROAD_RIGHT` (franja de pista), `LANE_COUNT = 3`, `MAX_SPEED`, `ACCEL`, `BRAKE`, `CAR_W`, `CAR_H`, `RUN_TIME = 60000` ms, `SPAWN_INTERVAL_BASE`, `DIFFICULTY_RAMP` (acelera spawns con la distancia), `DIST_PER_PX`, `SPEED_BONUS`. PRNG determinista (`mulberry32` o LCG en clausura) sembrado con `seed` para que P1 y P2 vean **exactamente** los mismos obstáculos. Colores neón en constantes — nada de `getComputedStyle`. Todo el estado vive en la clausura de la factoría; solo `finalScore` cruza a React en `onGameOver`.

---

## 4. Plan de implementación

Cada paso deja la app ejecutable (`npm run dev` / `npm run build`).

> ⚠️ **Nota (AGENTS.md):** antes de tocar rutas (`app/...`) o componentes `"use client"`, consultar `node_modules/next/dist/docs/01-app/` (Next.js 16: `"use client"`, límites RSC, `params` async). No asumir convenios del App Router de memoria.

1. **Catálogo + portada.** Añadir la entrada `vertice-racer` al array `GAMES` de `lib/data.ts` con todos los campos. Crear `.cover-vertice` (+ `::after`) en `app/globals.css` (gradiente synthwave + carriles verticales). _Sin tocar Supabase aún._
   - _Verifica:_ la Biblioteca muestra la nueva tarjeta VÉRTICE RACER con su portada; `npm run build` limpio. (La ruta aún caerá en el ticker mock.)

2. **Inserción en Supabase.** `apply_migration` con el `insert into games (...)` de arriba. No se regeneran tipos (no cambia el esquema).
   - _Verifica:_ `select id,title,cat,color,position from games where id='vertice-racer'` devuelve una fila; `games_with_stats` la incluye con `best=0`, `score_count=0`; `get_advisors` (security) sin hallazgos críticos.

3. **Motor: pista top-down + scroll.** `lib/games/vertice-racer/engine.ts` — factoría `createVerticeRacerEngine(ctx, callbacks)`. Dibujar la franja de carretera con arcenes neón y líneas de carril discontinuas; animar el scroll vertical a `scrollSpeed` constante de prueba. Loop con `requestAnimationFrame`.
   - _Verifica:_ aislado, el canvas muestra una carretera cenital con líneas que se desplazan hacia abajo; compila con TS strict; sin `document.getElementById` ni `getComputedStyle`.

4. **Motor: coche del jugador + física.** Añadir `RunState`: `↑/↓` modifican `speed` (cap `MAX_SPEED`); `scrollSpeed` deriva de `speed`; `← →` mueven `carX` (clamp a los bordes de pista). Dibujar el coche (sprite vectorial) anclado abajo. `distance += scrollSpeed × DIST_PER_PX × dt`. Handlers `keydown`/`keyup` con `preventDefault` en flechas/Espacio, añadidos en `start()` y retirados en `destroy()`.
   - _Verifica:_ se conduce horizontalmente; acelerar aumenta el scroll y la distancia; el coche no sale de la pista.

5. **Motor: obstáculos + colisión + PRNG.** Implementar el PRNG determinista sembrado con `seed`. Spawnear `Obstacle[]` (coches de tráfico y vallas) arriba a intervalos que se acortan con la distancia; bajan con el scroll. Colisión AABB coche↔obstáculo → fin de la run en curso. Eliminar obstáculos que salen por abajo.
   - _Verifica:_ aparecen tráfico y vallas; chocar termina la run; la dificultad sube con la distancia; con la misma `seed` la secuencia de obstáculos se repite exactamente.

6. **Motor: máquina de turnos VERSUS.** `MatchState` con `phase`. `run-p1` hasta choque o `RUN_TIME=0` → guardar `distanceP1` → `intermission` (pantalla "TURNO P2"). Espacio → `run-p2` con el **mismo `seed`** → guardar `distanceP2` → `result` (GANA P1/P2/EMPATE, mostrar ambas distancias). Espacio en `result` → `callbacks.onGameOver(max(distanceP1, distanceP2))` **una sola vez** (flag).
   - _Verifica:_ la partida encadena run P1 → intermedio → run P2 → resultado; ambos turnos ven los mismos obstáculos; `onGameOver` se dispara una sola vez con la mejor distancia.

7. **HUD + pantallas dentro del canvas.** Dibujar PLAYER, DISTANCE, SPEED, RUN TIME; en el turno de P2 mostrar "P1: NNNN m" como objetivo. Pantallas de intermedio ("TURNO P2 — PULSA ESPACIO") y de resultado (ganador + distancias). Todo en el canvas (tipografía pixel, neón).
   - _Verifica:_ el HUD y las pantallas se ven dentro del canvas; los datos cambian en tiempo real; no hay DOM extra.

8. **Wrapper React** `components/games/vertice-racer-game.tsx` (`"use client"`). Props `{ paused, onGameOver, restartKey }`. `useEffect` de montaje (deps vacías): `ctx` del `<canvas width={800} height={600}>`, crear motor, `start()`; cleanup → `destroy()`. `useEffect` sobre `paused` → `pause()`/`resume()`. `useEffect` sobre `restartKey` → `restart()` (nueva `seed`). `onGameOver` en un ref. Canvas escalado por CSS dentro de `.crt-screen` conservando 4:3.
   - _Verifica:_ aislado corre, responde al teclado, no scrollea; al desmontar no quedan listeners ni rAF activos.

9. **Integración en el reproductor** `components/game-player.tsx`. Branch `game.id === "vertice-racer"`: renderiza `<VerticeRacerGame paused={paused} onGameOver={handleEngineGameOver} restartKey={restartKey}/>`; oculta las cajas de stats React; conserva PAUSA / FIN / SALIR. Reusa el modal de fin y `handleSave`. JUGAR DE NUEVO → `restartKey++`. El resto de juegos sin cambios.
   - _Verifica:_ en `/jugar/vertice-racer` se juega el VERSUS por turnos completo; PAUSA congela y REANUDAR retoma; FIN abre el modal con el score real (mejor distancia); GUARDAR inserta fila en `scores` e incrementa `plays`; el score aparece en el top de `/juego/vertice-racer` al refrescar.

10. **Pulido y verificación final.** Nitidez del canvas (sin blur de escalado), flechas/Espacio no mueven la página, sin loops duplicados al navegar fuera y volver (StrictMode). `npm run lint` y `npm run build` limpios.

**Archivos que aparecen o cambian:**

- Nuevos: `lib/games/vertice-racer/engine.ts`, `components/games/vertice-racer-game.tsx`.
- Modificados: `lib/data.ts`, `app/globals.css`, `components/game-player.tsx`.
- Supabase: una migración de `insert` en `games` (sin esquema nuevo).

---

## 5. Criterios de aceptación (checklist booleana)

- [ ] La Biblioteca muestra la tarjeta **VÉRTICE RACER** (cat VERSUS, color yellow) con portada `.cover-vertice`; `/juego/vertice-racer` y `/jugar/vertice-racer` resuelven (200).
- [ ] `select * from games where id='vertice-racer'` devuelve una fila con `cat='VERSUS'`, `color='yellow'`, `position=9`; aparece en `games_with_stats`.
- [ ] En `/jugar/vertice-racer` se renderiza un `<canvas>` jugable (no el ticker mock) con **vista top-down 2D** y scroll vertical animado.
- [ ] Se conduce: ↑ acelera, ↓ frena, ← → mueven lateralmente sin salirse de la pista; acelerar aumenta la distancia.
- [ ] Aparecen **obstáculos** (coches de tráfico y vallas); chocar (AABB) **termina la run en curso**; la dificultad sube con la distancia.
- [ ] El modo **VERSUS por turnos** encadena: run P1 → pantalla "TURNO P2" → run P2 → pantalla de resultado (GANA P1/P2/EMPATE) con ambas distancias.
- [ ] Ambas runs ven **los mismos obstáculos** (PRNG determinista con `seed` compartida).
- [ ] El HUD (PLAYER / DISTANCE / SPEED / RUN TIME y "P1: NNNN m" objetivo en el turno de P2) se dibuja **dentro del canvas**; las cajas de stats React no aparecen para `vertice-racer`.
- [ ] Pulsar flechas/Espacio **no** hace scroll de la página.
- [ ] Al cerrar la pantalla de resultado, `onGameOver` se dispara con `max(distanceP1, distanceP2)` **una sola vez**; el motor no se reinicia con tecla fuera de su flujo de turnos.
- [ ] PAUSA congela y REANUDAR retoma donde estaba; FIN abre el modal con la puntuación real.
- [ ] GUARDAR PUNTUACIÓN inserta fila en `scores` (`game_id='vertice-racer'`) e `increment_play` incrementa `plays`; el score aparece en el top del Detalle al refrescar.
- [ ] Al desmontar / navegar fuera no quedan listeners de teclado ni `requestAnimationFrame` activos (sin loops duplicados al volver).
- [ ] Los otros 8 juegos conservan su comportamiento sin cambios.
- [ ] `npm run build` y `npm run lint` sin errores; `get_advisors` (security) sin hallazgos críticos.

---

## 6. Decisiones tomadas y descartadas

- **Vista top-down 2D con scroll vertical**, sin pseudo-3D. _Motivo:_ motor mucho más asequible para el jam (rectángulos y AABB), pista recta, sin proyección de perspectiva; render sólido y predecible. **Descartado:** render pseudo-3D "road racer" (es la Propuesta A; mayor riesgo técnico).
- **VERSUS por turnos a dos humanos en la misma máquina**, no simultáneo ni vs CPU. _Motivo:_ encaje **directo** en la categoría VERSUS sin IA y sin split-screen; ambos usan los mismos controles porque corren por turnos. **Descartado:** simultáneo split-screen (doble render y conflictos de teclado) y rival CPU (requiere IA).
- **PRNG determinista con semilla compartida** entre ambas runs. _Motivo:_ que P1 y P2 enfrenten exactamente la misma pista es lo que hace justo el duelo. **Descartado:** obstáculos puramente aleatorios por run (resultado injusto, dependiente de la suerte).
- **Métrica de victoria = distancia** (no tiempo de vuelta). _Motivo:_ pista infinita recta sin meta; la distancia es la medida natural y simplifica el scoring. **Descartado:** tiempo de vuelta (requiere circuito cerrado con meta, propio de la Propuesta A).
- **Chocar termina la run (sin sistema de vidas).** _Motivo:_ mantiene el loop corto y la comparación limpia entre runs. **Descartado:** vidas/daño (alarga la run y complica el scoring del duelo).
- **`finalScore = max(distanceP1, distanceP2)`** como puntuación guardada. _Motivo:_ el leaderboard global premia la mejor marca de la mesa; un único valor cruza a React. **Descartado:** guardar dos scores separados (el flujo `handleSave` existente espera un único `finalScore`).
- **Sprites vectoriales por código; HUD dentro del canvas.** _Motivo:_ coherente con Asteroids/Tetris; sin assets externos; solo `finalScore` cruza a React. **Descartado:** sprites bitmap y HUD en React.
- **Pausa gobernada por el botón PAUSA de React** (sin tecla `P`). _Motivo:_ evita desincronía con el estado `paused`. **Descartado:** tecla de pausa en el motor.

---

## 7. Riesgos identificados

| Riesgo                                                                                                     | Mitigación                                                                                                                                 |
| ---------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| **Duelo injusto** si los dos turnos no ven los mismos obstáculos.                                          | PRNG determinista (`mulberry32`/LCG) sembrado con la misma `seed` para ambas runs; resetear el estado del PRNG al iniciar cada turno.      |
| **Máquina de turnos enredada** (transiciones run-p1 → intermission → run-p2 → result mal encadenadas).     | `phase` explícita en `MatchState`; transiciones solo en eventos concretos (choque, `runTime=0`, Espacio); pruebas manuales de cada arista. |
| **`onGameOver` disparado más de una vez** o demasiado pronto (al acabar P1 en vez de al cerrar resultado). | Disparar `onGameOver` solo al confirmar la pantalla `result`, con flag `gameOverFired`.                                                    |
| **Colisión AABB imprecisa** (cajas demasiado grandes/pequeñas).                                            | Hitboxes ligeramente menores que los sprites; ajustar en el paso 5; feedback visual del choque.                                            |
| **Dificultad mal calibrada** (imposible o trivial).                                                        | `SPAWN_INTERVAL_BASE` + `DIFFICULTY_RAMP` ajustables; rampa suave ligada a la distancia; afinar en pulido.                                 |
| **Loops/listeners duplicados** al navegar fuera y volver (React 19 StrictMode monta dos veces en dev).     | `destroy()` cancela el `rAF` y retira `keydown`/`keyup`; el `useEffect` lo invoca en cleanup.                                              |
| **Salto temporal tras PAUSA** por `dt` acumulado.                                                          | `dt` capado (p. ej. 50 ms); al reanudar reiniciar `lastTime` para que el primer `dt` sea ~0.                                               |
| **Escalado borroso** del canvas 800×600 estirado por CSS.                                                  | Resolución interna fija 800×600; escalar el elemento conservando proporción; revisar nitidez en el pulido.                                 |
| **Scroll de página** al pulsar Espacio/flechas.                                                            | `preventDefault` en los handlers del motor para esas teclas.                                                                               |
