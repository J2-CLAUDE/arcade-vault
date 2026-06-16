# SPEC 06 — Juegos y Leaderboard en Supabase (tablas + seed + reconexión de pantallas)

> **Estado:** Implementado · **Depende de:** Spec 04 (clientes Supabase, `proxy.ts`, sesión) · **Fecha:** 2026-06-16
> **Objetivo:** Crear las tablas `games` y `scores` en Supabase (con RLS, seed y tipos regenerados) y reconectar Biblioteca, Detalle, Reproductor y Salón para leer/escribir datos reales en vez del catálogo hardcodeado y `seededScores()`.

---

## 1. Por qué existe este spec

El Spec 04 dejó Supabase cableado al App Router (clientes navegador/servidor, `proxy.ts`, sesión) pero **difirió explícitamente** crear tablas. Hoy el esquema `public` está vacío y la app corre 100% sobre datos mock: `GAMES` hardcodeado en `lib/data.ts` (8 juegos), leaderboards generados con `seededScores()` (PRNG determinista), login que guarda un nombre en `localStorage` (`av_user`) y `saveScore()` que escribe `av_scores` pero **nadie lo lee**.

Este spec da el siguiente paso: persistir el catálogo y las puntuaciones en Supabase y hacer que las pantallas lean/escriban datos reales. El login sigue mock — las puntuaciones se atribuyen con un nombre libre. Auth real (Supabase Auth, `profiles`, atar `scores` a `auth.users`) queda para un spec posterior.

---

## 2. Alcance

**Dentro:**

- Migración SQL (`apply_migration`): tablas `games` y `scores`, índices, constraints, **RLS**, una función `increment_play()` (SECURITY DEFINER) y un seed.
- **Seed de `games`** desde el array `GAMES` actual (8 juegos, con `position` para preservar orden y `plays` convertido a entero: "12.4K" → 12400).
- **Seed de `scores`** ejecutando la lógica de `seededScores()` por juego, para que los leaderboards luzcan poblados desde el inicio.
- Regenerar `lib/supabase/database.types.ts` vía MCP (`generate_typescript_types`).
- Capa de datos nueva (`lib/games.ts` o similar): `getGames()`, `getGame(id)`, `getGameLeaderboard(id, limit)`, `getGlobalLeaderboard(limit, cat?)`, `saveScore(...)`, `incrementPlay(id)`.
- Reconexión de pantallas a Supabase (lectura **dinámica**, sin cache):
  - **Biblioteca** (`app/games`, `components/library.tsx`, tarjetas) → catálogo + `best`/`plays` desde BD.
  - **Detalle** (`app/juego/[id]`) → datos del juego + top real por juego.
  - **Salón** (`app/salon`, `components/hall-of-fame.tsx`) → leaderboard global agregado.
  - **Reproductor** (`components/game-player.tsx`) → al terminar, inserta el score real en Supabase + `incrementPlay`.
- En `lib/data.ts`: conservar `GAMES`, `PLAYERS` y `seededScores()` pero anotados con comentarios explícitos de que son **mock/semilla pre-BD** y no deben usarse en runtime; conservar los `type` (`Game`, `ScoreRow`, `Category`).

**Fuera (para specs futuros):**

- ❌ Supabase Auth real, OAuth, magic links (el login sigue mock; las puntuaciones se guardan con nombre libre).
- ❌ Tabla `profiles` y atar `scores` a `auth.users`.
- ❌ Anti-abuso/anti-cheat serio (rate-limiting, validación servidor de scores) más allá de constraints básicos.
- ❌ Realtime en leaderboards, paginación, búsqueda server-side.
- ❌ Panel de administración para editar juegos.
- ❌ Tests automatizados.

---

## 3. Modelo de datos

### Tabla `games` (catálogo, reemplaza el array hardcodeado)

| Columna      | Tipo                                   | Notas                                               |
| ------------ | -------------------------------------- | --------------------------------------------------- |
| `id`         | `text` PK                              | slug actual, ej. `"bloque-buster"`                  |
| `title`      | `text` not null                        |                                                     |
| `short`      | `text` not null                        | descripción de 1 línea                              |
| `long`       | `text` not null                        | descripción larga                                   |
| `cat`        | `text` not null                        | check ∈ (`ARCADE`,`PUZZLE`,`SHOOTER`,`VERSUS`)      |
| `cover`      | `text` not null                        | clase CSS (`cover-bricks`, …)                       |
| `color`      | `text` not null                        | check ∈ (`cyan`,`magenta`,`yellow`,`green`)         |
| `plays`      | `integer` not null default `0`         | **contador**, se incrementa al jugar                |
| `position`   | `smallint` not null                    | orden de display (1–8), preserva el orden del array |
| `created_at` | `timestamptz` not null default `now()` |                                                     |

> `best` **no** es columna: se deriva de `scores`.

### Tabla `scores` (puntuaciones, alimenta los leaderboards)

| Columna       | Tipo                                   | Notas                                           |
| ------------- | -------------------------------------- | ----------------------------------------------- |
| `id`          | `uuid` PK default `gen_random_uuid()`  |                                                 |
| `game_id`     | `text` not null                        | FK → `games(id)` `on delete cascade`            |
| `player_name` | `text` not null                        | identidad mock; check `length between 1 and 24` |
| `score`       | `integer` not null                     | check `score >= 0`                              |
| `created_at`  | `timestamptz` not null default `now()` | el seed la fija a partir de la fecha mock       |

Índices: `(game_id, score desc)` para el top por juego; `(score desc)` para el global.

### Vista `games_with_stats` (lo que lee la Biblioteca)

```sql
select g.*, coalesce(max(s.score), 0) as best, count(s.id) as score_count
from games g left join scores s on s.game_id = g.id
group by g.id
```

Devuelve cada juego con su `best` real y total de puntuaciones. Se incluye en los tipos generados.

### Función `increment_play(p_game_id text)` — `SECURITY DEFINER`

`update games set plays = plays + 1 where id = p_game_id`. Permite incrementar el contador sin exponer un `UPDATE` abierto sobre `games`. `grant execute` a `anon` + `authenticated`.

### RLS

- **`games`:** RLS on. `SELECT` público (anon + authenticated). Sin insert/update/delete público (se siembra en migración; `plays` solo vía el RPC).
- **`scores`:** RLS on. `SELECT` público. `INSERT` público (identidad mock) — protegido por los `CHECK` de rango/longitud. Sin update/delete público.

### Seed (dentro de la migración)

- `games`: las 8 filas del array `GAMES`, con `position` 1–8 y `plays` parseado a entero (ej. `"31.8K"` → `31800`).
- `scores`: por cada juego, insertar la salida de la lógica de `seededScores()` (~10–12 filas), mapeando `name→player_name`, `score→score`, `date→created_at`.

### Tipos TypeScript

Tras la migración, regenerar `lib/supabase/database.types.ts` con el MCP. `Game`/`ScoreRow`/`Category` en `lib/data.ts` se mantienen como tipos de dominio (alineados con la BD).

---

## 4. Plan de implementación

Cada paso deja la app ejecutable (`npm run dev` / `npm run build`). Consultar los docs locales de Next 16 antes de tocar data fetching en App Router.

1. **Migración: esquema + RLS + RPC.** `apply_migration` que crea `games` y `scores` (columnas, PK/FK, checks, índices), la vista `games_with_stats`, la función `increment_play()` SECURITY DEFINER, habilita RLS y crea las políticas (SELECT público en ambas; INSERT público en `scores`; execute del RPC a anon).
   - _Verifica:_ `list_tables` muestra ambas tablas con RLS on; `get_advisors` (security) sin hallazgos críticos.

2. **Migración: seed.** En la misma migración o una segunda: insertar los 8 juegos (con `position` y `plays` entero) y las puntuaciones mock por juego.
   - _Verifica:_ `select count(*) from games` = 8; `scores` tiene ~80–96 filas; `select * from games_with_stats` devuelve `best` > 0.

3. **Regenerar tipos.** `generate_typescript_types` → sobrescribir `lib/supabase/database.types.ts`.
   - _Verifica:_ `Database['public']['Tables']` incluye `games` y `scores`; el proyecto compila.

4. **Capa de datos** (`lib/games.ts`): funciones tipadas sobre los clientes de Supabase — `getGames()`/`getGame(id)` (vista), `getGameLeaderboard(id, limit)`, `getGlobalLeaderboard(limit, cat?)` (usan cliente servidor); `saveScore({game_id, player_name, score})` e `incrementPlay(id)` (cliente navegador). Helper `formatPlays(n)` para mostrar el entero como `"12.4K"`.
   - _Verifica:_ importan y tipan sin error.

5. **Anotar `lib/data.ts`.** Comentarios de cabecera explícitos: `GAMES`/`PLAYERS`/`seededScores()` son **mock/semilla pre-BD**, fuente del seed de la migración, no usar en runtime. Conservar los `type`.
   - _Verifica:_ ningún componente de runtime importa ya `GAMES`/`seededScores`.

6. **Biblioteca.** `app/games/page.tsx` pasa a Server Component `async` que llama `getGames()` y pasa los juegos como prop a `library.tsx` (sigue Client para search/filter). Tarjetas muestran `best` y `formatPlays(plays)`.
   - _Verifica:_ `/games` lista 8 juegos con `best`/`plays` reales; filtros y búsqueda funcionan.

7. **Detalle.** `app/juego/[id]/page.tsx` `async`: `getGame(id)` + `getGameLeaderboard(id, 10)`. Lectura dinámica. Mantener `generateStaticParams` para la lista de ids; los scores se leen por request.
   - _Verifica:_ `/juego/bloque-buster` muestra datos del juego y top real; id inexistente → `notFound()`.

8. **Salón.** `app/salon/page.tsx` `async`: `getGlobalLeaderboard()`. `hall-of-fame.tsx` recibe los datos por props (las pestañas/categorías se sirven con los datos provistos o vía `searchParams`).
   - _Verifica:_ `/salon` muestra podio y ranking global agregado desde `scores`.

9. **Reproductor.** `game-player.tsx`: al terminar la partida, `saveScore(...)` (cliente navegador) con el nombre de sesión y `incrementPlay(game_id)`. Al guardar, refrescar la vista (`router.refresh()`) para que el nuevo score aparezca.
   - _Verifica:_ jugar y guardar inserta una fila en `scores`, incrementa `plays`, y aparece en el top del Detalle al refrescar.

10. **Limpieza y cierre.** Confirmar que ningún runtime usa el catálogo hardcodeado; `npm run build` y `npm run lint` limpios; `get_advisors` sin hallazgos críticos.
    - _Verifica:_ build/lint limpios; navegación completa funciona con datos reales.

**Archivos que aparecen o cambian:**

- Nuevos: migración(es) Supabase, `lib/games.ts`.
- Modificados: `lib/supabase/database.types.ts`, `lib/data.ts` (comentarios), `app/games/page.tsx`, `components/library.tsx`, `app/juego/[id]/page.tsx`, `components/game-detail.tsx`, `app/salon/page.tsx`, `components/hall-of-fame.tsx`, `components/game-player.tsx`.

---

## 5. Criterios de aceptación

- [ ] Existen las tablas `games` y `scores` en Supabase con RLS habilitada y las políticas descritas (SELECT público en ambas; INSERT público en `scores`).
- [ ] Existe la vista `games_with_stats` y la función `increment_play()` con `execute` concedido a `anon`.
- [ ] `games` tiene 8 filas con `position` 1–8 y `plays` entero; `scores` está sembrada (top no vacío por juego).
- [ ] `lib/supabase/database.types.ts` regenerado incluye `games`, `scores` y la vista.
- [ ] `lib/games.ts` expone `getGames`, `getGame`, `getGameLeaderboard`, `getGlobalLeaderboard`, `saveScore`, `incrementPlay` y `formatPlays`, todas tipadas.
- [ ] Biblioteca, Detalle y Salón leen de Supabase (no de `GAMES`/`seededScores`) y muestran datos dinámicos siempre frescos.
- [ ] El Reproductor inserta una fila real en `scores`, incrementa `plays`, y el nuevo score aparece en el top del Detalle tras refrescar.
- [ ] `GAMES`, `PLAYERS` y `seededScores()` siguen en `lib/data.ts` con comentarios explícitos de mock/semilla y ningún componente de runtime los importa.
- [ ] Una `id` de juego inexistente en `/juego/[id]` resuelve en `notFound()`.
- [ ] `npm run build` y `npm run lint` terminan sin errores; `get_advisors` (security) sin hallazgos críticos.

---

## 6. Decisiones tomadas y descartadas

- **Sí:** identidad mock (nombre libre) e `INSERT` anónimo en `scores`. _Motivo:_ desbloquea leaderboards reales sin esperar a Auth. **No:** exigir Supabase Auth ahora. _Motivo:_ lo difiere el usuario a otro spec.
- **Sí:** `games` en BD que reemplaza el array hardcodeado y alimenta las 4 pantallas. **No:** `games` solo como catálogo de soporte. _Motivo:_ se quiere una sola fuente de verdad.
- **Sí:** `best` derivado vía vista `games_with_stats`; `plays` como contador vía RPC `increment_play`. _Motivo:_ `best` siempre coherente; `plays` sin exponer `UPDATE` abierto. **No:** `best`/`plays` como columnas estáticas sembradas. _Motivo:_ se desincronizan.
- **Sí:** sembrar `scores` con datos mock. _Motivo:_ leaderboards poblados desde el inicio. **No:** empezar vacío. _Motivo:_ UX pobre en lanzamiento (decisión del usuario).
- **Sí:** lectura **dinámica** (sin cache). _Motivo:_ refleja puntuaciones recién guardadas al instante. **No:** `use cache` + `cacheTag`/`cacheLife`. _Motivo:_ complejidad innecesaria para el volumen actual.
- **Sí:** conservar `GAMES`/`seededScores()` anotados como mock/semilla. _Motivo:_ documentan el origen del seed (decisión del usuario). **No:** borrarlos. _Motivo:_ se pierde la fuente de siembra.
- **Sí:** `cat`/`color` como `CHECK` sobre `text`. _Motivo:_ más simples de evolucionar que un `ENUM` de Postgres.

---

## 7. Riesgos identificados

| Riesgo                                                                                                  | Mitigación                                                                                                                |
| ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `INSERT` anónimo en `scores` permite spam/scores falsos.                                                | `CHECK` de rango (`score >= 0`) y longitud de nombre; aceptado como deuda hasta el spec de Auth (documentado en "Fuera"). |
| Mezclar scores mock (seed) con reales puede confundir.                                                  | Los nombres mock son reconocibles (PX_KAI…); se pueden purgar cuando llegue tráfico real.                                 |
| Lectura dinámica en cada visita aumenta consultas a Supabase.                                           | Volumen bajo; índices `(game_id, score desc)` y `(score desc)`. Cache queda como mejora futura.                           |
| `generateStaticParams` + datos dinámicos en `/juego/[id]` puede chocar con Cache Components de Next 16. | Consultar los docs locales (`01-app`) antes; aislar la lectura de scores como dinámica.                                   |
| Regenerar tipos con BD desincronizada rompe el build.                                                   | Regenerar **después** de aplicar la migración y antes de tocar componentes (paso 3).                                      |
| `cookies()`/cliente servidor mal usados rompen SSR.                                                     | Reusar los helpers ya existentes de Spec 04 (`lib/supabase/server.ts`, `client.ts`).                                      |

---

## Lo que **no** está en este spec

- Supabase Auth real, OAuth, magic links, tabla `profiles`, atar `scores` a `auth.users`.
- Anti-abuso/anti-cheat avanzado, rate-limiting, validación servidor de scores.
- Realtime, paginación, búsqueda server-side.
- Panel de administración y tests automatizados.

Cada uno, si llega, va en su propio spec.
