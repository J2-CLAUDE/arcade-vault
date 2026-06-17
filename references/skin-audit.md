# Auditoría de skins — Arcade Vault

Última actualización: **2026-06-17**
Skins objetivo por juego: `clasico` (default) · `neon` · `retro`, todas seleccionables
por el jugador en runtime y legibles en dark mode (`--bg #0a0a0f`).

## Arquitectura implementada

- **Fuente de verdad:** `lib/games/skins.ts` — `SkinId`, `SkinPalette`, `SKINS`
  (clasico/neon/retro), `SKIN_LIST`, `DEFAULT_SKIN` y `skinCssVars()` para la arena mock.
- **Motores canvas** (`lib/games/{tetris,asteroids}/engine.ts`): aceptan
  `skin?: SkinPalette` en las opciones del constructor (retro-compatible: si no se
  pasa, usan `clasico`). Cero colores hardcodeados restantes.
- **Wrappers** (`components/games/{tetris,asteroids}-game.tsx`): prop `skin: SkinId`,
  resuelven `SKINS[skin]` y recrean el motor cuando cambia `skin`.
- **Arena mock** (`app/globals.css`): clases modificadoras `.game-arena--neon`,
  `.game-arena--retro` + tokens `--arena-*`; `clasico` = look original sin cambios.
- **Selector** (`components/game-player.tsx`): `radiogroup` accesible
  (`<fieldset role="radiogroup">`, foco con `focus-visible`), estado local default
  `clasico`, aplicado a motores reales y a la arena mock.

## Estado ANTES (línea base)

No existía sistema de skins. Todos los colores hardcodeados en motores y CSS.
Equivalente a "solo clasico, no seleccionable".

| #   | Juego         | Motor | clasico | neon | retro | Seleccionable |
| --- | ------------- | ----- | ------- | ---- | ----- | ------------- |
| 1   | bloque-buster | mock  | ⚠️ fijo | ❌   | ❌    | ❌            |
| 2   | tetris        | real  | ⚠️ fijo | ❌   | ❌    | ❌            |
| 3   | serpentina    | mock  | ⚠️ fijo | ❌   | ❌    | ❌            |
| 4   | gloton        | mock  | ⚠️ fijo | ❌   | ❌    | ❌            |
| 5   | invasores     | mock  | ⚠️ fijo | ❌   | ❌    | ❌            |
| 6   | asteroids     | real  | ⚠️ fijo | ❌   | ❌    | ❌            |
| 7   | ranaria       | mock  | ⚠️ fijo | ❌   | ❌    | ❌            |
| 8   | duelo-pixel   | mock  | ⚠️ fijo | ❌   | ❌    | ❌            |

## Estado DESPUÉS

Celda = ✅/❌ + nota de contraste dark-mode (ratio WCAG mínimo del elemento más
crítico sobre el fondo de ese skin).

| #   | Juego         | Motor | clasico                     | neon                            | retro                           |
| --- | ------------- | ----- | --------------------------- | ------------------------------- | ------------------------------- |
| 1   | bloque-buster | mock  | ✅ original (cyan/magenta)  | ✅ glow alto, grid cyan 14px    | ✅ ámbar/verde fósforo, sin glow |
| 2   | tetris        | real  | ✅ 8 piezas + HUD idénticos | ✅ piezas neón, glow 8px        | ✅ piezas mate ámbar            |
| 3   | serpentina    | mock  | ✅ original                 | ✅                              | ✅                              |
| 4   | gloton        | mock  | ✅ original                 | ✅                              | ✅                              |
| 5   | invasores     | mock  | ✅ original                 | ✅                              | ✅                              |
| 6   | asteroids     | real  | ✅ blanco/cyan idénticos    | ✅ nave cyan, balas glow        | ✅ nave ámbar, partículas ámbar |
| 7   | ranaria       | mock  | ✅ original                 | ✅                              | ✅                              |
| 8   | duelo-pixel   | mock  | ✅ original                 | ✅                              | ✅                              |

Todos los juegos: 3 skins seleccionables (selector compartido en el player).

## Paletas finales

| Token     | clasico                    | neon                  | retro                 |
| --------- | -------------------------- | --------------------- | --------------------- |
| primary   | #ffffff                    | #00f5ff (cyan)        | #ffb347 (ámbar)       |
| secondary | #00ffff                    | #ff006e (magenta)     | #8fd96b (verde fósf.) |
| accent    | #f5ff00                    | #f5ff00               | #e8c14f (oro mate)    |
| bg canvas | #000000                    | #05000f               | #0b0a06               |
| text/línea| #ffffff                    | #e6e9ff               | #e2c98a               |
| flame     | rgba(255,130,0,.85)        | rgba(255,0,110,.9)    | rgba(255,140,40,.7)   |
| glow      | off                        | on                    | off                   |
| scanlines | on                         | on                    | on                    |

Piezas de Tetris (índices I,O,T,S,Z,J,L,N) definidas en `SKINS[*].pieces`;
`clasico` reproduce exactamente la paleta histórica.

## Verificación de contraste (WCAG AA, texto/elementos sobre fondo del skin)

Ratio mínimo por skin (elemento más crítico):

- **clasico** (bg #000): mínimo 10.44 (nivel verde) — todos AA-text.
- **neon** (bg #05000f): mínimo 5.40 (magenta) — AA-text.
- **retro** (bg #0b0a06): mínimo 5.07 (pieza terracota Z) — AA-text.

Todos los textos del HUD y elementos de juego superan AA (≥4.5) en dark mode.

## Verificación de build

- `npm run lint`: ✅ sin errores.
- `npm run build`: ✅ compila, TypeScript OK, 24 páginas generadas.
- E2E Playwright: no hay harness configurado en el repo (sin `playwright.config`
  ni `webServer`, y `/jugar/[id]` requiere env de Supabase). Cobertura cubierta por
  el chequeo de tipos del build + verificación de contraste; pendiente añadir spec
  si se cablea el runner.

## Archivos creados/cambiados

- `lib/games/skins.ts` (nuevo)
- `lib/games/tetris/engine.ts`
- `lib/games/asteroids/engine.ts`
- `components/games/tetris-game.tsx`
- `components/games/asteroids-game.tsx`
- `components/game-player.tsx`
- `app/globals.css`
