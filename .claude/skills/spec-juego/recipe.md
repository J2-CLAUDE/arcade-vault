# Receta canónica — añadir un juego a Arcade Vault

Este archivo es la referencia que el skill `/spec-juego` consulta para generar el spec. Describe el conjunto **real** de archivos, APIs y pasos que implica añadir un juego jugable con leaderboard, según lo dejaron Spec 05 (motor) y Spec 06 (Supabase + pantallas). **No es texto para copiar literal** — es la forma que el spec generado debe respetar, traducida a las secciones "Modelo de datos", "Plan de implementación" y "Criterios de aceptación".

> Convención: en lo que sigue, `<id>` es el slug del juego (p. ej. `tetris`), `<Id>` su forma PascalCase (p. ej. `Tetris`).

---

## Lo que YA existe (no se reimplementa)

La infraestructura está hecha. El spec **reusa**, no recrea:

- **Esquema Supabase** (Spec 06): tablas `games` y `scores`, vista `games_with_stats`, RPC `increment_play()` (SECURITY DEFINER), RLS (SELECT público en ambas; INSERT público en `scores`). **No se crean tablas, vistas ni funciones nuevas.**
- **Capa de datos servidor** `lib/games-data.ts`: `getGames()`, `getGame(id)`, `getGameLeaderboard(id, limit)`, `getGlobalLeaderboard(limit)`, `formatPlays(n)`. Usa el cliente servidor de Supabase.
- **Capa de datos navegador** `lib/games-client.ts`: `saveScore({ game_id, player_name, score })`, `incrementPlay(id)`. Usa el cliente navegador.
- **Las 4 pantallas** ya leen de Supabase: Biblioteca (`app/games/page.tsx` → `components/library.tsx`), Detalle (`app/juego/[id]/page.tsx` → `components/game-detail.tsx`), Salón (`app/salon/page.tsx` → `components/hall-of-fame.tsx`), Reproductor (`app/jugar/[id]/page.tsx` → `components/game-player.tsx`).
- **El patrón de motor** (Spec 05): factoría + wrapper React + branch en el reproductor, con Asteroids como referencia viva (`lib/games/asteroids/engine.ts`, `components/games/asteroids-game.tsx`).

Un juego nuevo **no** añade funciones a `lib/games-data.ts` ni a `lib/games-client.ts`, y **no** toca el esquema.

---

## Archivos por juego nuevo `<id>`

### Nuevos

**`lib/games/<id>/engine.ts`** — motor framework-agnóstico (TypeScript strict). Factoría:

```ts
export function create<Id>Engine(
  ctx: CanvasRenderingContext2D,
  callbacks: EngineCallbacks,
): EngineHandle;

interface EngineHandle {
  start(): void;
  pause(): void;
  resume(): void;
  restart(): void;
  destroy(): void; // cancela rAF + retira listeners
}

interface EngineCallbacks {
  onGameOver: (finalScore: number) => void; // único puente motor → React, dispara UNA sola vez
}
```

Reglas del motor (heredadas de Spec 05):

- Todo el estado vive en la clausura de la factoría. **Sin globales de módulo, sin `document.getElementById`** — el `ctx` se recibe por parámetro.
- Resolución lógica fija (definida en el spec, p. ej. 800×600); el escalado es por CSS.
- Loop con `requestAnimationFrame`, `dt` capado (p. ej. 50 ms); al reanudar tras pausa, reiniciar `lastTime` para que el primer `dt` sea 0.
- Listeners de teclado (`keydown`/`keyup`) añadidos en `start()` y retirados en `destroy()`. `preventDefault` en flechas/espacio para no scrollear la página.
- HUD dibujado **dentro del canvas** (score, nivel, vidas, indicadores de power-up).
- Al entrar en `gameover`: llamar `callbacks.onGameOver(score)` una sola vez y dejar de actualizar la lógica (un flag evita disparos duplicados). **No** reiniciar con tecla — eso lo gobierna React.

**`components/games/<id>-game.tsx`** (`"use client"`) — wrapper React:

```ts
interface Props {
  paused: boolean;
  onGameOver: (score: number) => void;
  restartKey: number;
}
```

- `useEffect` de montaje (deps vacías): obtiene `ctx` del `<canvas width={W} height={H}>`, crea el motor, `start()`; cleanup → `destroy()`.
- `useEffect` sobre `paused` → `pause()`/`resume()`.
- `useEffect` sobre `restartKey` → `restart()` cuando cambia.
- Mantener `onGameOver` en un ref (sincronizado en cada render) para evitar closures viejos.
- El `<canvas>` se escala por CSS al 100% del contenedor conservando proporción (letterbox dentro de `.crt-screen`).

### Modificados

**`components/game-player.tsx`** — añadir branch `game.id === "<id>"`:

- Renderiza `<<Id>Game paused={paused} onGameOver={handleEngineGameOver} restartKey={restartKey} />` dentro de `.crt-screen` en vez del ticker mock.
- Oculta las cajas de stats React (Puntuación/Vidas/Nivel); conserva los botones PAUSA / FIN / SALIR.
- Reusa el **modal de fin existente** y su `handleSave`, que ya llama `saveScore(...)` + `incrementPlay(...)` + `router.refresh()`. JUGAR DE NUEVO incrementa `restartKey`. **No reimplementar el guardado.**
- El resto de juegos (`game.id !== "<id>"`) conserva su comportamiento actual sin cambios.

**`app/globals.css`** — clase `.cover-<id>` (+ `::after`/`::before`) siguiendo el patrón de las coberturas existentes (gradiente de fondo + decoración + icono/símbolo).

**`lib/data.ts`** — añadir la entrada al array `GAMES` (anotado como mock/semilla pre-BD, fuente del seed; no se usa en runtime). Conservar los `type` (`Game`, `ScoreRow`, `Category`).

---

## Supabase (vía MCP, sin tablas nuevas)

1. **`apply_migration`** que:
   - Hace `INSERT` en `games` con la fila del juego: `id`, `title`, `short`, `long`, `cat`, `cover` (`cover-<id>`), `color`, `plays` (entero, p. ej. `"15.6K"` → `15600`), `position` (el siguiente disponible).
   - Opcional (si se decide sembrar): `INSERT` de scores semilla en `scores` para ese `game_id`, con nombres reconocibles como mock, mapeando `name→player_name`, `score→score`, `date→created_at`.
2. **`generate_typescript_types`** → regenerar `lib/supabase/database.types.ts` **solo si** cambian los tipos. Como un juego nuevo no añade tablas ni columnas, normalmente **no hace falta**; nótalo así en el spec.

Verificación Supabase: `list_tables` sigue mostrando `games`/`scores` con RLS on; `select count(*) from games` aumenta en 1; `get_advisors` (security) sin hallazgos críticos.

---

## Rutas (funcionan solas)

Al existir la fila en `games`, estas rutas resuelven sin código nuevo (son verificación, no pasos de implementación):

- `/games` — la Biblioteca lista el juego con `best`/`plays` reales.
- `/juego/<id>` — Detalle + leaderboard por juego. `generateStaticParams` enumera los ids; un id inexistente → `notFound()`.
- `/jugar/<id>` — el Reproductor monta `<GamePlayer>` y entra por el branch del motor.
- `/salon` — el score aparece en el ranking global agregado.

---

## Plan de implementación tipo (para el spec)

Cada paso deja la app ejecutable. Orden recomendado:

1. **Catálogo + portada.** Añadir la entrada a `GAMES` en `lib/data.ts` y la clase `.cover-<id>` en `app/globals.css`.
2. **Seed en Supabase.** `apply_migration` con el `INSERT` en `games` (+ scores semilla si aplica). Regenerar tipos solo si cambiaron.
3. **Motor** `lib/games/<id>/engine.ts` — factoría `create<Id>Engine`, entidades, `update`/`draw`, HUD en canvas, input, `onGameOver` único. (Modo PORTAR: traducir el `game.js` eliminando globales.)
4. **Wrapper** `components/games/<id>-game.tsx` — montaje/cleanup, pausa, restart.
5. **Integración** en `components/game-player.tsx` — branch `game.id === "<id>"`, ocultar stats React, reusar modal + guardado.
6. **Pulido y verificación** — nitidez del canvas, sin scroll por teclado, sin loops duplicados al navegar; `npm run lint` y `npm run build` limpios.

> ⚠️ Antes de tocar rutas (`app/...`) o componentes `"use client"`, consultar `node_modules/next/dist/docs/01-app/` (regla de `AGENTS.md`: Next.js 16, no asumir convenios del App Router de memoria).

---

## Criterios de aceptación tipo (para el spec)

Booleanos, derivados de Spec 05/06:

- [ ] La Biblioteca muestra la tarjeta del juego; `/juego/<id>` y `/jugar/<id>` resuelven (200, no 404); la portada `.cover-<id>` se ve correcta.
- [ ] En `/jugar/<id>` se renderiza un `<canvas>` jugable (no el ticker mock) y responde a los controles definidos.
- [ ] Pulsar flechas/espacio **no** hace scroll de la página.
- [ ] El HUD (score/nivel/vidas) se dibuja **dentro del canvas**; las cajas de stats React no aparecen para este juego.
- [ ] PAUSA congela y REANUDAR retoma donde estaba; FIN abre el modal con la puntuación real.
- [ ] El modal "FIN DEL JUEGO" muestra el score real del motor; GUARDAR PUNTUACIÓN inserta una fila en `scores` e `increment_play` incrementa `plays`; el score aparece en el top del Detalle al refrescar.
- [ ] El motor no se reinicia con tecla tras GAME OVER (lo gobierna el modal React).
- [ ] Al desmontar / navegar fuera no quedan listeners de teclado ni `requestAnimationFrame` activos (sin loops duplicados al volver).
- [ ] Los demás juegos conservan su comportamiento sin cambios.
- [ ] `npm run build` y `npm run lint` sin errores; `get_advisors` (security) sin hallazgos críticos.
