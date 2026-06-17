"use client";

import { useRef, useCallback } from "react";
import type { EngineHandle as TetrisHandle } from "@/lib/games/tetris/engine";
import type { EngineHandle as AsteroidsHandle } from "@/lib/games/asteroids/engine";

type TetrisProps = {
  game: "tetris";
  engine: React.RefObject<TetrisHandle | null>;
};

type AsteroidsProps = {
  game: "asteroids";
  engine: React.RefObject<AsteroidsHandle | null>;
};

type Props = TetrisProps | AsteroidsProps;

export default function TouchControls(props: Props) {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Wrapped in useCallback so ref mutation is not in render code
  const stopRepeat = useCallback(() => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const startRepeat = useCallback(
    (action: () => void) => {
      stopRepeat();
      intervalRef.current = setInterval(action, 120);
    },
    [stopRepeat],
  );

  // One-shot action on pointerdown
  function tap(action: () => void) {
    return {
      onPointerDown(e: React.PointerEvent<HTMLButtonElement>) {
        e.preventDefault();
        e.currentTarget.setPointerCapture(e.pointerId);
        action();
      },
    };
  }

  // Continuous action while finger is down; releases on up / cancel / leave
  function hold(on: () => void, off: () => void) {
    return {
      onPointerDown(e: React.PointerEvent<HTMLButtonElement>) {
        e.preventDefault();
        e.currentTarget.setPointerCapture(e.pointerId);
        on();
      },
      onPointerUp: () => off(),
      onPointerCancel: () => off(),
      onPointerLeave: () => off(),
    };
  }

  // Fires immediately then repeats every 120 ms while held (Tetris soft drop)
  function repeat(action: () => void) {
    return {
      onPointerDown(e: React.PointerEvent<HTMLButtonElement>) {
        e.preventDefault();
        e.currentTarget.setPointerCapture(e.pointerId);
        action();
        startRepeat(action);
      },
      onPointerUp: stopRepeat,
      onPointerCancel: stopRepeat,
      onPointerLeave: stopRepeat,
    };
  }

  if (props.game === "tetris") {
    const e = props.engine;
    return (
      <div className="touch-controls" aria-label="Controles táctiles Tetris">
        <button
          type="button"
          className="tc-btn"
          aria-label="Mover izquierda"
          {...tap(() => e.current?.moveLeft())}
        >
          <span className="tc-icon">◀</span>
          <span className="tc-label">IZQ</span>
        </button>
        <button
          type="button"
          className="tc-btn"
          aria-label="Mover derecha"
          {...tap(() => e.current?.moveRight())}
        >
          <span className="tc-icon">▶</span>
          <span className="tc-label">DER</span>
        </button>
        <button
          type="button"
          className="tc-btn"
          aria-label="Bajar (mantener)"
          {...repeat(() => e.current?.softDrop())}
        >
          <span className="tc-icon">▼</span>
          <span className="tc-label">BAJAR</span>
        </button>
        <button
          type="button"
          className="tc-btn"
          aria-label="Rotar"
          {...tap(() => e.current?.rotate())}
        >
          <span className="tc-icon">⟳</span>
          <span className="tc-label">ROTAR</span>
        </button>
        <button
          type="button"
          className="tc-btn tc-btn--accent"
          aria-label="Hard drop"
          {...tap(() => e.current?.hardDrop())}
        >
          <span className="tc-icon">⬇</span>
          <span className="tc-label">DROP</span>
        </button>
      </div>
    );
  }

  if (props.game === "asteroids") {
    const e = props.engine;
    return (
      <div className="touch-controls" aria-label="Controles táctiles Asteroids">
        <button
          type="button"
          className="tc-btn"
          aria-label="Rotar izquierda (mantener)"
          {...hold(
            () => e.current?.setRotateLeft(true),
            () => e.current?.setRotateLeft(false),
          )}
        >
          <span className="tc-icon">◀</span>
          <span className="tc-label">ROTAR</span>
        </button>
        <button
          type="button"
          className="tc-btn"
          aria-label="Rotar derecha (mantener)"
          {...hold(
            () => e.current?.setRotateRight(true),
            () => e.current?.setRotateRight(false),
          )}
        >
          <span className="tc-icon">▶</span>
          <span className="tc-label">ROTAR</span>
        </button>
        <button
          type="button"
          className="tc-btn tc-btn--wide"
          aria-label="Propulsar (mantener)"
          {...hold(
            () => e.current?.setThrust(true),
            () => e.current?.setThrust(false),
          )}
        >
          <span className="tc-icon">▲</span>
          <span className="tc-label">PROPULSAR</span>
        </button>
        <button
          type="button"
          className="tc-btn tc-btn--accent"
          aria-label="Disparar"
          {...tap(() => e.current?.fire())}
        >
          <span className="tc-icon">●</span>
          <span className="tc-label">DISPARAR</span>
        </button>
      </div>
    );
  }

  return null;
}
