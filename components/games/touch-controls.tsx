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

type FroggerDirection = "up" | "down" | "left" | "right";

type FroggerProps = {
  game: "frogger";
  /**
   * Frogger has no `EngineHandle` (it reads `document` keydown directly), so
   * the d-pad reports the pressed direction to the parent, which dispatches a
   * synthetic keyboard event. Tap-to-jump semantics: fires once on pointerdown.
   */
  onDirection: (dir: FroggerDirection) => void;
};

type Props = TetrisProps | AsteroidsProps | FroggerProps;

export default function TouchControls(props: Props) {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

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

  function tap(action: () => void) {
    return {
      onPointerDown(e: React.PointerEvent<HTMLButtonElement>) {
        e.preventDefault();
        e.currentTarget.setPointerCapture(e.pointerId);
        action();
      },
    };
  }

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
      <div className="gamepad" aria-label="Gamepad Tetris">
        {/* D-pad cross — 3×3 grid; corners are decorative spacers */}
        <div className="gamepad-dpad">
          <div className="dpad-corner" />
          <button
            type="button"
            className="dpad-btn"
            aria-label="Rotar"
            {...tap(() => e.current?.rotate())}
          >
            <svg className="dp-arrow" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 4 L20 16 L4 16 Z" fill="currentColor" />
            </svg>
          </button>
          <div className="dpad-corner" />

          <button
            type="button"
            className="dpad-btn"
            aria-label="Mover izquierda"
            {...tap(() => e.current?.moveLeft())}
          >
            <svg className="dp-arrow" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M16 4 L16 20 L4 12 Z" fill="currentColor" />
            </svg>
          </button>
          <div className="dpad-hub" aria-hidden="true">
            <span className="dpad-hub-gem" />
          </div>
          <button
            type="button"
            className="dpad-btn"
            aria-label="Mover derecha"
            {...tap(() => e.current?.moveRight())}
          >
            <svg className="dp-arrow" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M8 4 L20 12 L8 20 Z" fill="currentColor" />
            </svg>
          </button>

          <div className="dpad-corner" />
          <button
            type="button"
            className="dpad-btn"
            aria-label="Bajar (mantener)"
            {...repeat(() => e.current?.softDrop())}
          >
            <svg className="dp-arrow" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M4 8 L20 8 L12 20 Z" fill="currentColor" />
            </svg>
          </button>
          <div className="dpad-corner" />
        </div>

        {/* A/B — Game Boy diagonal: B top-right, A bottom-left */}
        <div className="gamepad-ab">
          <button
            type="button"
            className="ab-btn ab-btn--b"
            aria-label="Hard drop"
            {...tap(() => e.current?.hardDrop())}
          >
            <span className="ab-ring" aria-hidden="true" />B
          </button>
          <button
            type="button"
            className="ab-btn ab-btn--a"
            aria-label="Rotar"
            {...tap(() => e.current?.rotate())}
          >
            <span className="ab-ring" aria-hidden="true" />A
          </button>
        </div>
      </div>
    );
  }

  if (props.game === "asteroids") {
    const e = props.engine;
    return (
      <div className="gamepad" aria-label="Gamepad Asteroids">
        {/* D-pad cross */}
        <div className="gamepad-dpad">
          <div className="dpad-corner" />
          <button
            type="button"
            className="dpad-btn"
            aria-label="Propulsar (mantener)"
            {...hold(
              () => e.current?.setThrust(true),
              () => e.current?.setThrust(false),
            )}
          >
            <svg className="dp-arrow" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 4 L20 16 L4 16 Z" fill="currentColor" />
            </svg>
          </button>
          <div className="dpad-corner" />

          <button
            type="button"
            className="dpad-btn"
            aria-label="Rotar izquierda (mantener)"
            {...hold(
              () => e.current?.setRotateLeft(true),
              () => e.current?.setRotateLeft(false),
            )}
          >
            <svg className="dp-arrow" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M16 4 L16 20 L4 12 Z" fill="currentColor" />
            </svg>
          </button>
          <div className="dpad-hub" aria-hidden="true">
            <span className="dpad-hub-gem" />
          </div>
          <button
            type="button"
            className="dpad-btn"
            aria-label="Rotar derecha (mantener)"
            {...hold(
              () => e.current?.setRotateRight(true),
              () => e.current?.setRotateRight(false),
            )}
          >
            <svg className="dp-arrow" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M8 4 L20 12 L8 20 Z" fill="currentColor" />
            </svg>
          </button>

          <div className="dpad-corner" />
          {/* down has no function in Asteroids — visible inert slot keeps the cross shape */}
          <div className="dpad-btn dpad-btn--inert" aria-hidden="true" />
          <div className="dpad-corner" />
        </div>

        {/* A/B — B=thrust (hold), A=fire (tap) */}
        <div className="gamepad-ab">
          <button
            type="button"
            className="ab-btn ab-btn--b"
            aria-label="Propulsar (mantener)"
            {...hold(
              () => e.current?.setThrust(true),
              () => e.current?.setThrust(false),
            )}
          >
            <span className="ab-ring" aria-hidden="true" />B
          </button>
          <button
            type="button"
            className="ab-btn ab-btn--a"
            aria-label="Disparar"
            {...tap(() => e.current?.fire())}
          >
            <span className="ab-ring" aria-hidden="true" />A
          </button>
        </div>
      </div>
    );
  }

  if (props.game === "frogger") {
    const jump = props.onDirection;
    return (
      <div className="gamepad gamepad--frogger" aria-label="Gamepad Frogger">
        {/* 4-way D-pad — every jump is a single tap (fires on pointerdown) */}
        <div className="gamepad-dpad gamepad-dpad--frogger">
          <div className="dpad-corner" />
          <button
            type="button"
            className="dpad-btn"
            aria-label="Saltar arriba"
            {...tap(() => jump("up"))}
          >
            <svg className="dp-arrow" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 4 L20 16 L4 16 Z" fill="currentColor" />
            </svg>
          </button>
          <div className="dpad-corner" />

          <button
            type="button"
            className="dpad-btn"
            aria-label="Saltar izquierda"
            {...tap(() => jump("left"))}
          >
            <svg className="dp-arrow" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M16 4 L16 20 L4 12 Z" fill="currentColor" />
            </svg>
          </button>
          <div className="dpad-hub" aria-hidden="true">
            <span className="dpad-hub-gem" />
          </div>
          <button
            type="button"
            className="dpad-btn"
            aria-label="Saltar derecha"
            {...tap(() => jump("right"))}
          >
            <svg className="dp-arrow" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M8 4 L20 12 L8 20 Z" fill="currentColor" />
            </svg>
          </button>

          <div className="dpad-corner" />
          <button
            type="button"
            className="dpad-btn"
            aria-label="Saltar abajo"
            {...tap(() => jump("down"))}
          >
            <svg className="dp-arrow" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M4 8 L20 8 L12 20 Z" fill="currentColor" />
            </svg>
          </button>
          <div className="dpad-corner" />
        </div>
      </div>
    );
  }

  return null;
}
