# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Critical: Next.js version

This project runs **Next.js 16.2.9 with React 19**. APIs and conventions differ from older Next.js — before writing app code, read the relevant guide under `node_modules/next/dist/docs/01-app/` (getting-started, guides, api-reference). Do not rely on training-data knowledge of the App Router.

## Commands

```bash
npm run dev      # start dev server (Turbopack)
npm run build    # production build
npm run start    # serve production build
npm run lint     # eslint (flat config, core-web-vitals + typescript rules)
```

There is no test runner configured yet.

## Project state

This is a freshly scaffolded `create-next-app` project. `app/page.tsx` and `app/layout.tsx` are still the default boilerplate — the real product has not been built yet. The intended product is defined entirely by the prototype in `references/templates/` (see below). When building features, port from those references rather than inventing UX from scratch.

- App Router under `app/`, TypeScript strict mode, path alias `@/*` → repo root.
- Styling is **Tailwind CSS v4** via `@tailwindcss/postcss`, imported with `@import "tailwindcss"` in `app/globals.css` (no `tailwind.config.js` — theme tokens live in CSS via `@theme inline`).

## Product: what Arcade Vault is

An online arcade platform (Spanish-language UI) where users play retro-style games and compete on leaderboards for high scores. Neon/CRT "synthwave arcade" visual theme.

The five screens and the navigation model are fully specified in `references/templates/`:

- **`data.jsx`** — the canonical data model. `GAMES` (id, title, short/long descriptions, `cat`, cover class, color, `best` score, `plays`), `CATS` (categories: TODOS/ARCADE/PUZZLE/SHOOTER/VERSUS), and `seededScores()` (deterministic mock leaderboard generator). Treat this as the source of truth for the domain schema.
- **`app.jsx`** — root component showing the intended app shape: a `route` object (`{name, id}`) drives a screen switch, plus `user` and score state. The prototype persists `av_user` and `av_scores` in `localStorage` and encodes the route in `location.hash`. When porting to Next.js 16, this hash-routing/localStorage approach should be replaced with App Router routes and proper persistence.
- **`biblioteca.jsx`** — Library: game grid with search + category filter (`Library`, `GameCard`).
- **`detalle.jsx`** — Game Detail: description, stats, and per-game leaderboard (`GameDetail`).
- **`reproductor.jsx`** — Player: in-game HUD (score/lives/level), pause/end, save-score modal (`GamePlayer`). The "gameplay" is currently a mock score ticker, not a real game engine.
- **`salon.jsx`** — Hall of Fame: global leaderboards with podium (`HallOfFame`).
- **`nav.jsx`** / **`auth.jsx`** — navbar and login/signup (mock auth).
- **`styles.css`** — the full neon/CRT theme: CSS custom properties (`--cyan`, `--magenta`, `--yellow`, `--bg`, etc.), perspective-grid background, scanlines, pixel/mono fonts. Use these tokens and class names as the design reference when building the real components.

> The reference templates are vanilla React loaded via CDN globals (`window.X = ...`, `React.createElement`). They are a design/spec artifact, **not** code to import — re-implement them as proper Next.js/React components.

## Workflow

Per `README.md`, this project follows Spec-Driven Design using the `/spec` and `/spec-impl` skills from the `Klerith/fernando-skills` collection (`npx skills@latest add Klerith/fernando-skills`).
