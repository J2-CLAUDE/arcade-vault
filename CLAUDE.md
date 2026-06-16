# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Critical: Next.js version

This project runs **Next.js 16.2.9 with React 19**. APIs and conventions differ from older Next.js — before writing app code, read the relevant guide under `node_modules/next/dist/docs/01-app/` (getting-started, guides, api-reference). Do not rely on training-data knowledge of the App Router.

## Commands

```bash
npm run dev      # start dev server
npm run build    # production build
npm run start    # serve production build
npm run lint     # eslint (flat config, core-web-vitals + typescript rules)
```

There is no test runner wired into `package.json` yet, but `@playwright/test` is installed for E2E checks. Code is formatted with Prettier (`prettier-plugin-tailwindcss`).

## Project state

The product is **built and live**, not boilerplate. Specs 01–07 (`specs/`) have been implemented: the five visual screens, a Home landing, the Acerca/contact page, Supabase integration, real game engines (Asteroids, Tetris), and the Supabase-backed leaderboard. The `references/templates/` prototype has been fully ported to proper Next.js components — it remains only as a design/spec artifact.

- App Router under `app/`, TypeScript strict mode, path alias `@/*` → repo root.
- Styling is **Tailwind CSS v4** via `@tailwindcss/postcss`, imported with `@import "tailwindcss"` in `app/globals.css` (no `tailwind.config.js` — theme tokens live in CSS via `@theme inline`). The neon/CRT theme tokens (`--cyan`, `--magenta`, `--yellow`, `--bg`, etc.), perspective-grid background, and scanlines all live in `globals.css`.
- Fonts: `Press Start 2P` (pixel, `--font-pixel`) and `JetBrains Mono` (`--font-mono`) loaded via `next/font/google` in `app/layout.tsx`.

## Product: what Arcade Vault is

An online arcade platform (Spanish-language UI) where users play retro-style games and compete on leaderboards for high scores. Neon/CRT "synthwave arcade" visual theme.

### Routes (`app/`)

| Route         | Screen          | Notes                                                                   |
| ------------- | --------------- | ----------------------------------------------------------------------- |
| `/`           | Home landing    | `components/home.tsx` — marketing landing with multiple sections        |
| `/games`      | Library         | `components/library.tsx` — grid with search + category filter           |
| `/juego/[id]` | Game Detail     | `components/game-detail.tsx` — description, stats, per-game leaderboard |
| `/jugar/[id]` | Player          | `components/game-player.tsx` — HUD, pause/end, save-score modal         |
| `/salon`      | Hall of Fame    | `components/hall-of-fame.tsx` — global leaderboards + podium            |
| `/acceso`     | Login/signup    | `components/auth.tsx` — **mock auth** (localStorage, not Supabase Auth) |
| `/acerca`     | About + contact | contact form via server action → Resend email                           |

`components/nav.tsx` is the shared navbar; `app/layout.tsx` wraps everything in `SessionProvider`.

### Game catalog

Eight games are seeded (`games` table, ordered by `position`). Only the two **bold** ones have real engines; the rest run the mock score ticker.

| #   | id              | Título        | Categoría | Color   | Motor   |
| --- | --------------- | ------------- | --------- | ------- | ------- |
| 1   | `bloque-buster` | BLOQUE BUSTER | ARCADE    | cyan    | mock    |
| 2   | `tetris`        | **TETRIS**    | PUZZLE    | magenta | ✅ real |
| 3   | `serpentina`    | SERPENTINA    | ARCADE    | green   | mock    |
| 4   | `gloton`        | GLOTÓN        | ARCADE    | yellow  | mock    |
| 5   | `invasores`     | INVASORES     | SHOOTER   | green   | mock    |
| 6   | `asteroids`     | **ASTEROIDS** | SHOOTER   | yellow  | ✅ real |
| 7   | `ranaria`       | RANARIA       | ARCADE    | green   | mock    |
| 8   | `duelo-pixel`   | DUELO PIXEL   | VERSUS    | cyan    | mock    |

### Game engines

Real canvas engines exist for **Asteroids** and **Tetris**:

- Pure game logic in `lib/games/{asteroids,tetris}/engine.ts` (framework-agnostic, exposes an `EngineHandle`).
- React wrappers in `components/games/{asteroids,tetris}-game.tsx` mount the engine on a `<canvas>` and report `onGameOver`.
- `game-player.tsx` switches on `game.id`: Asteroids/Tetris render the real engine (HUD lives inside the canvas); every other game still uses the **mock score ticker** with the standard HUD. New engines plug in here.

## Data & backend architecture

**Supabase** is the backend (project ref configured in `.mcp.json`; the Supabase MCP server is available). Generated types live in `lib/supabase/database.types.ts`.

### Database schema

```
games                                 -- the catalog (8 rows, seeded from lib/data.ts)
  id          text       PK
  title       text
  short       text                    -- one-line description (card)
  long        text                    -- full description (detail page)
  cat         text       CHECK ∈ {ARCADE, PUZZLE, SHOOTER, VERSUS}
  cover       text                    -- CSS cover class, e.g. "cover-tetris"
  color       text       CHECK ∈ {cyan, magenta, yellow, green}
  plays       integer    DEFAULT 0    -- raw count; formatted to "12.4K" client-side via formatPlays()
  position    smallint                -- catalog sort order
  created_at  timestamptz DEFAULT now()

scores                                -- leaderboard entries
  id           uuid       PK   DEFAULT gen_random_uuid()
  game_id      text       FK → games.id
  player_name  text       CHECK length 1..24
  score        integer    CHECK >= 0
  created_at   timestamptz DEFAULT now()

games_with_stats  (VIEW)              -- games LEFT JOIN scores, GROUP BY game; the read model
  ...all games columns, plus:
  best         integer    -- COALESCE(max(scores.score), 0)
  score_count  integer    -- count(scores.id)

increment_play(p_game_id text) → void -- SECURITY DEFINER; UPDATE games SET plays = plays + 1
```

Note: `best` and `score_count` exist **only on the view**, not on the `games` table — always read games through `games_with_stats`.

**RLS** is enabled on both tables: `games` is SELECT-only for `anon`/`authenticated`; `scores` is SELECT + INSERT for `anon`/`authenticated` (no UPDATE/DELETE). Anyone can read everything and post a score; the `plays` counter is bumped only through the `SECURITY DEFINER` RPC.

Three Supabase clients:

- `lib/supabase/server.ts` — `createClient()` for Server Components / Server Actions (uses `next/headers` cookies; **server-only**).
- `lib/supabase/client.ts` — browser client for `"use client"` components.
- `lib/supabase/proxy.ts` — session refresh, wired through the root **`proxy.ts`** (Next.js 16 renamed `middleware.ts` → `proxy.ts`).

Data access split:

- `lib/games-data.ts` — **server-only reads** (`getGames`, `getGame`, `getGameLeaderboard`, `getGlobalLeaderboard`). Do not import in client components.
- `lib/games-client.ts` — **browser writes** (`saveScore`, `incrementPlay`).
- `lib/data.ts` — now the **seed/mock source of truth** only (`GAMES`, `CATS`, `seededScores()`, shared TS types like `Category`, `GameWithStats` consumers). Per its own header comment, do NOT read `GAMES`/`seededScores()` at runtime — read from Supabase instead.

Session/auth: `components/session-provider.tsx` is a `useSyncExternalStore`-backed store persisting the user in `localStorage` (`av_user`). Auth is still a **mock** (no real Supabase Auth). `useSession()` exposes `user`, `login`, `signOut`, `saveScore`.

Email: `app/acerca/actions.ts` is a server action that sends the contact form via **Resend** (`lib/email.ts` builds the HTML/text).

## Environment variables

See `.env.template`. Required:

- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` — Supabase client config.
- `RESEND_API_KEY`, `CONTACT_TO_EMAIL` — contact form email delivery.
- `SUPABASE_DB_PASSWORD` — for migrations / DB tooling.

## Workflow

This project follows **Spec-Driven Design** using the `/spec` and `/spec-impl` skills from the `Klerith/fernando-skills` collection. Each feature gets a numbered spec in `specs/NN-name.md`, then is implemented from it. Add a new spec before building a substantial feature.

A number of agent skills are installed (`skills-lock.json`) — notably `next-best-practices`, `next-cache-components`, `react-best-practices`, `composition-patterns`, `tailwind-css-patterns`, `supabase-postgres-best-practices`, `playwright-best-practices`, `frontend-design`, `accessibility`, and `seo`. Lean on the relevant skill when working in its domain.
