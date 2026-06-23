"use client";

import {
  useState,
  useEffect,
  useRef,
  useLayoutEffect,
  useCallback,
} from "react";
import { useRouter } from "next/navigation";
import { useSession } from "./session-provider";
import { saveScore, incrementPlay } from "@/lib/games-client";
import type { GameWithStats } from "@/lib/games-data";
import AsteroidsGame from "./games/asteroids-game";
import TetrisGame from "./games/tetris-game";
import FroggerGame from "./games/frogger-game";
import TouchControls from "./games/touch-controls";
import { SKIN_LIST, SKINS, skinCssVars, type SkinId } from "@/lib/games/skins";
import type { EngineHandle as TetrisHandle } from "@/lib/games/tetris/engine";
import type { EngineHandle as AsteroidsHandle } from "@/lib/games/asteroids/engine";

export default function GamePlayer({ game }: { game: GameWithStats }) {
  const router = useRouter();
  const { user } = useSession();

  const isAsteroids = game.id === "asteroids";
  const isTetris = game.id === "tetris";
  const isFrogger = game.id === "frogger";
  const isEngine = isAsteroids || isTetris || isFrogger;

  // Shared state
  const [paused, setPaused] = useState(false);
  const [over, setOver] = useState(false);
  const playerName = user?.displayName ?? "";
  const [saved, setSaved] = useState(false);

  // Mock ticker state (non-asteroids only)
  const [score, setScore] = useState(0);
  const [lives] = useState(3);
  const level = Math.max(1, Math.floor(score / 2500) + 1);

  // Asteroids / Tetris state
  const [finalScore, setFinalScore] = useState(0);
  const [restartKey, setRestartKey] = useState(0);

  // Frogger state — refs for 60fps values; DOM refs for direct HUD updates
  const scoreRef = useRef(0);
  const livesRef = useRef(3);
  const levelRef = useRef(1);
  const scoreEl = useRef<HTMLDivElement>(null);
  const livesEl = useRef<HTMLDivElement>(null);
  const levelEl = useRef<HTMLDivElement>(null);
  // frogFinalScore is set once at game-over so the modal can read it during render
  const [frogFinalScore, setFrogFinalScore] = useState(0);
  const [gameKey, setGameKey] = useState(0);

  // Player-chosen skin (default "clasico"). Applies to engines and mock arena.
  const [skin, setSkin] = useState<SkinId>("clasico");

  // Engine handles exposed by the game wrappers — used by TouchControls
  const tetrisEngineRef = useRef<TetrisHandle | null>(null);
  const asteroidsEngineRef = useRef<AsteroidsHandle | null>(null);

  const displayScore = isFrogger
    ? frogFinalScore
    : isEngine
      ? finalScore
      : score;

  // After any React re-render, re-sync Frogger HUD DOM from refs so a pause/
  // resume or other state change doesn't reset the displayed values.
  useLayoutEffect(() => {
    if (!isFrogger) return;
    if (scoreEl.current)
      scoreEl.current.textContent = scoreRef.current.toLocaleString("es-ES");
    if (livesEl.current) {
      const l = livesRef.current;
      livesEl.current.innerHTML = Array.from({ length: 3 })
        .map(
          (_, i) =>
            `<span style="color:${i < l ? "var(--green)" : "var(--ink-dim)"}">♥</span>`,
        )
        .join("");
    }
    if (levelEl.current)
      levelEl.current.textContent = String(levelRef.current).padStart(2, "0");
  });

  const handleFrogScoreChange = useCallback((s: number) => {
    scoreRef.current = s;
    if (scoreEl.current)
      scoreEl.current.textContent = s.toLocaleString("es-ES");
  }, []);

  const handleFrogLivesChange = useCallback((l: number) => {
    livesRef.current = l;
    if (livesEl.current) {
      livesEl.current.innerHTML = Array.from({ length: 3 })
        .map(
          (_, i) =>
            `<span style="color:${i < l ? "var(--green)" : "var(--ink-dim)"}">♥</span>`,
        )
        .join("");
    }
  }, []);

  const handleFrogLevelChange = useCallback((l: number) => {
    levelRef.current = l;
    if (levelEl.current)
      levelEl.current.textContent = String(l).padStart(2, "0");
  }, []);

  const handleFrogGameOver = useCallback((s: number) => {
    scoreRef.current = s;
    if (scoreEl.current)
      scoreEl.current.textContent = s.toLocaleString("es-ES");
    setFrogFinalScore(s);
    setPaused(true);
    setOver(true);
  }, []);

  // Mobile full-screen: add is-playing to body so CSS can hide nav + footer
  useEffect(() => {
    document.body.classList.add("is-playing");
    return () => document.body.classList.remove("is-playing");
  }, []);

  // Changing the skin restarts the Frogger canvas loop (the engine reads its
  // palette once, at mount). Reset the React-side HUD here so the displayed
  // score/lives/level don't go stale on a skin swap.
  const handleSkinChange = (next: SkinId) => {
    setSkin(next);
    if (isFrogger) {
      scoreRef.current = 0;
      livesRef.current = 3;
      levelRef.current = 1;
      // useLayoutEffect will sync DOM on the re-render triggered by setSkin
    }
  };

  // Score ticker — mock only, stops when paused or game over
  useEffect(() => {
    if (isEngine || over || paused) return;
    const t = setInterval(() => {
      setScore((s) => s + Math.floor(10 + Math.random() * 90));
    }, 220);
    return () => clearInterval(t);
  }, [isEngine, over, paused]);

  const handleEngineGameOver = useCallback((s: number) => {
    setFinalScore(s);
    setOver(true);
  }, []);

  const endGame = () => {
    if (isEngine) setPaused(true); // pause engine before showing modal
    setOver(true);
  };

  const restart = () => {
    if (isFrogger) {
      setGameKey((k) => k + 1);
      scoreRef.current = 0;
      livesRef.current = 3;
      levelRef.current = 1;
      setFrogFinalScore(0);
      setPaused(false);
    } else if (isEngine) {
      setRestartKey((k) => k + 1);
      setFinalScore(0);
      setPaused(false);
    } else {
      setScore(0);
      setPaused(false);
    }
    setOver(false);
    setSaved(false);
  };

  const handleSave = async () => {
    const gameId = game.id ?? "";
    await Promise.all([
      saveScore({
        game_id: gameId,
        player_name: playerName,
        score: displayScore,
      }),
      incrementPlay(gameId),
    ]);
    setSaved(true);
    router.refresh();
  };

  return (
    <div className="av-player fade-in">
      {/* HUD */}
      <div className="player-hud">
        <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
          <div className="hud-stat">
            <div className="l">Jugador</div>
            <div className="v" style={{ color: "var(--ink)" }}>
              {playerName}
            </div>
          </div>
          {/* Frogger: live HUD — DOM updated directly via refs at 60fps */}
          {isFrogger && (
            <>
              <div className="hud-stat">
                <div className="l">Puntuación</div>
                <div className="v" ref={scoreEl}>
                  0
                </div>
              </div>
              <div className="hud-stat lives">
                <div className="l">Vidas</div>
                <div className="v" ref={livesEl}>
                  <span style={{ color: "var(--green)" }}>♥</span>
                  <span style={{ color: "var(--green)" }}>♥</span>
                  <span style={{ color: "var(--green)" }}>♥</span>
                </div>
              </div>
              <div className="hud-stat level">
                <div className="l">Nivel</div>
                <div className="v" ref={levelEl}>
                  01
                </div>
              </div>
            </>
          )}
          {/* Puntuación / Vidas / Nivel are shown only for mock ticker games;
              for engine games (asteroids, tetris) the HUD lives inside the canvas */}
          {!isEngine && (
            <>
              <div className="hud-stat">
                <div className="l">Puntuación</div>
                <div className="v">{score.toLocaleString("es-ES")}</div>
              </div>
              <div className="hud-stat lives">
                <div className="l">Vidas</div>
                <div className="v">{"♥ ".repeat(lives).trim() || "—"}</div>
              </div>
              <div className="hud-stat level">
                <div className="l">Nivel</div>
                <div className="v">{String(level).padStart(2, "0")}</div>
              </div>
            </>
          )}
        </div>
        <div className="hud-actions">
          <fieldset
            className="skin-picker"
            role="radiogroup"
            aria-label="Apariencia del juego"
          >
            <legend className="skin-picker-legend">Skin</legend>
            {SKIN_LIST.map((s) => (
              <label key={s.id} className="skin-option" title={s.label}>
                <input
                  type="radio"
                  name="skin"
                  value={s.id}
                  checked={skin === s.id}
                  onChange={() => handleSkinChange(s.id)}
                />
                <span>{s.label}</span>
              </label>
            ))}
          </fieldset>
          <button className="btn yellow" onClick={() => setPaused((p) => !p)}>
            {paused ? "REANUDAR" : "PAUSA"}
          </button>
          <button className="btn magenta" onClick={endGame}>
            FIN
          </button>
          <button
            className="btn ghost"
            onClick={() => router.push(`/juego/${game.id ?? ""}`)}
          >
            SALIR
          </button>
        </div>
      </div>

      {/* CRT arena */}
      <div className="crt">
        <div className="crt-screen">
          {isFrogger ? (
            <FroggerGame
              key={gameKey}
              paused={paused}
              skin={skin}
              onScoreChange={handleFrogScoreChange}
              onLivesChange={handleFrogLivesChange}
              onLevelChange={handleFrogLevelChange}
              onGameOver={handleFrogGameOver}
            />
          ) : isAsteroids ? (
            <AsteroidsGame
              paused={paused}
              onGameOver={handleEngineGameOver}
              restartKey={restartKey}
              skin={skin}
              ref={asteroidsEngineRef}
            />
          ) : isTetris ? (
            <TetrisGame
              paused={paused}
              onGameOver={handleEngineGameOver}
              restartKey={restartKey}
              skin={skin}
              ref={tetrisEngineRef}
            />
          ) : (
            <>
              <div
                className={`game-arena${skin !== "clasico" ? ` game-arena--${skin}` : ""}`}
                style={skinCssVars(SKINS[skin])}
              >
                <div className="grid-floor" />
                <div className="enemy e1" />
                <div className="enemy e2" />
                <div className="enemy e3" />
                <div className="player-ship" />
              </div>
              {paused && (
                <div
                  className="crt-content"
                  style={{ background: "rgba(0,0,0,0.6)", zIndex: 5 }}
                >
                  <div>
                    <div className="pixel neon-yellow" style={{ fontSize: 22 }}>
                      EN PAUSA
                    </div>
                    <div
                      className="mono"
                      style={{
                        fontSize: 11,
                        color: "var(--ink-dim)",
                        marginTop: 10,
                        letterSpacing: "0.16em",
                      }}
                    >
                      PULSA REANUDAR PARA CONTINUAR
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
        <div className="crt-bottom">
          <span className="led">SEÑAL OK</span>
          <span>{game.title ?? ""} · CRT-83 · 60 HZ</span>
          <span>CARGA · 1MB</span>
        </div>
      </div>

      {/* Mobile gamepad — shown only on coarse-pointer devices (touch) */}
      {isAsteroids && (
        <TouchControls game="asteroids" engine={asteroidsEngineRef} />
      )}
      {isTetris && <TouchControls game="tetris" engine={tetrisEngineRef} />}
      {isFrogger && (
        <TouchControls
          game="frogger"
          onDirection={(dir) => {
            // Frogger has no EngineHandle — it reads `document` keydown by
            // `e.code`. Dispatch the matching synthetic key so a tap jumps.
            const code = {
              up: "ArrowUp",
              down: "ArrowDown",
              left: "ArrowLeft",
              right: "ArrowRight",
            }[dir];
            document.dispatchEvent(
              new KeyboardEvent("keydown", { code, bubbles: true }),
            );
          }}
        />
      )}

      {/* Mobile meta strip — replaces HUD on coarse-pointer devices */}
      <div className="player-meta">
        <div className="player-meta-info">
          <span className="player-meta-name">{playerName}</span>
          <fieldset
            className="skin-picker"
            role="radiogroup"
            aria-label="Apariencia del juego"
          >
            <legend className="skin-picker-legend">Skin</legend>
            {SKIN_LIST.map((s) => (
              <label key={s.id} className="skin-option" title={s.label}>
                <input
                  type="radio"
                  name="skin-meta"
                  value={s.id}
                  checked={skin === s.id}
                  onChange={() => handleSkinChange(s.id)}
                />
                <span>{s.label}</span>
              </label>
            ))}
          </fieldset>
        </div>
        <div className="player-meta-actions">
          <button className="btn yellow" onClick={() => setPaused((p) => !p)}>
            {paused ? "▶" : "⏸"}
          </button>
          <button className="btn magenta" onClick={endGame}>
            FIN
          </button>
          <button
            className="btn ghost"
            onClick={() => router.push(`/juego/${game.id ?? ""}`)}
          >
            ✕
          </button>
        </div>
      </div>

      {/* Game over modal */}
      {over && (
        <div className="modal-bd">
          <div className="modal">
            <h2>FIN DEL JUEGO</h2>
            <div className="final-label">PUNTUACIÓN FINAL</div>
            <div className="final">{displayScore.toLocaleString("es-ES")}</div>
            {!saved ? (
              <div className="input-row">
                <div
                  className="mono"
                  style={{
                    fontSize: 13,
                    color: "var(--cyan)",
                    letterSpacing: "0.1em",
                  }}
                >
                  {playerName}
                </div>
                <button className="btn yellow" onClick={handleSave}>
                  GUARDAR PUNTUACIÓN
                </button>
              </div>
            ) : (
              <div className="toast-saved">▸ PUNTUACIÓN GUARDADA_</div>
            )}
            <div className="actions">
              <button className="btn" onClick={restart}>
                JUGAR DE NUEVO
              </button>
              <button
                className="btn magenta"
                onClick={() => router.push("/games")}
              >
                VOLVER AL VAULT
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
