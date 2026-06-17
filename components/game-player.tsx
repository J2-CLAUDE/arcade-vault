"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "./session-provider";
import { saveScore, incrementPlay } from "@/lib/games-client";
import type { GameWithStats } from "@/lib/games-data";
import AsteroidsGame from "./games/asteroids-game";
import TetrisGame from "./games/tetris-game";
import { SKIN_LIST, SKINS, skinCssVars, type SkinId } from "@/lib/games/skins";

export default function GamePlayer({ game }: { game: GameWithStats }) {
  const router = useRouter();
  const { user } = useSession();

  const isAsteroids = game.id === "asteroids";
  const isTetris = game.id === "tetris";
  const isEngine = isAsteroids || isTetris; // real engine — HUD lives inside canvas

  // Shared state
  const [paused, setPaused] = useState(false);
  const [over, setOver] = useState(false);
  const [name, setName] = useState(user?.name ?? "INVITADO");
  const [saved, setSaved] = useState(false);

  // Mock ticker state (non-asteroids only)
  const [score, setScore] = useState(0);
  const [lives] = useState(3);
  const level = Math.max(1, Math.floor(score / 2500) + 1);

  // Asteroids state
  const [finalScore, setFinalScore] = useState(0);
  const [restartKey, setRestartKey] = useState(0);

  // Player-chosen skin (default "clasico"). Applies to engines and mock arena.
  const [skin, setSkin] = useState<SkinId>("clasico");

  const displayScore = isEngine ? finalScore : score;

  // Score ticker — mock only, stops when paused or game over
  useEffect(() => {
    if (isEngine || over || paused) return;
    const t = setInterval(() => {
      setScore((s) => s + Math.floor(10 + Math.random() * 90));
    }, 220);
    return () => clearInterval(t);
  }, [isEngine, over, paused]);

  // Called by AsteroidsGame when the engine reaches gameover state
  const handleEngineGameOver = (s: number) => {
    setFinalScore(s);
    setOver(true);
  };

  const endGame = () => {
    if (isEngine) setPaused(true); // pause engine before showing modal
    setOver(true);
  };

  const restart = () => {
    if (isEngine) {
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
      saveScore({ game_id: gameId, player_name: name, score: displayScore }),
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
              {user?.name ?? "INVITADO"}
            </div>
          </div>
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
                  onChange={() => setSkin(s.id)}
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
          {isAsteroids ? (
            <AsteroidsGame
              paused={paused}
              onGameOver={handleEngineGameOver}
              restartKey={restartKey}
              skin={skin}
            />
          ) : isTetris ? (
            <TetrisGame
              paused={paused}
              onGameOver={handleEngineGameOver}
              restartKey={restartKey}
              skin={skin}
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

      {/* Game over modal */}
      {over && (
        <div className="modal-bd">
          <div className="modal">
            <h2>FIN DEL JUEGO</h2>
            <div className="final-label">PUNTUACIÓN FINAL</div>
            <div className="final">{displayScore.toLocaleString("es-ES")}</div>
            {!saved ? (
              <div className="input-row">
                <input
                  value={name}
                  onChange={(e) =>
                    setName(e.target.value.toUpperCase().slice(0, 10))
                  }
                  placeholder="TUS INICIALES"
                />
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
