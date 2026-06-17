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
            ▲
          </button>
          <div className="dpad-corner" />

          <button
            type="button"
            className="dpad-btn"
            aria-label="Mover izquierda"
            {...tap(() => e.current?.moveLeft())}
          >
            ◀
          </button>
          <div className="dpad-center" />
          <button
            type="button"
            className="dpad-btn"
            aria-label="Mover derecha"
            {...tap(() => e.current?.moveRight())}
          >
            ▶
          </button>

          <div className="dpad-corner" />
          <button
            type="button"
            className="dpad-btn"
            aria-label="Bajar (mantener)"
            {...repeat(() => e.current?.softDrop())}
          >
            ▼
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
            B
          </button>
          <button
            type="button"
            className="ab-btn ab-btn--a"
            aria-label="Rotar"
            {...tap(() => e.current?.rotate())}
          >
            A
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
            ▲
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
            ◀
          </button>
          <div className="dpad-center" />
          <button
            type="button"
            className="dpad-btn"
            aria-label="Rotar derecha (mantener)"
            {...hold(
              () => e.current?.setRotateRight(true),
              () => e.current?.setRotateRight(false),
            )}
          >
            ▶
          </button>

          <div className="dpad-corner" />
          {/* ▼ has no function in Asteroids */}
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
            B
          </button>
          <button
            type="button"
            className="ab-btn ab-btn--a"
            aria-label="Disparar"
            {...tap(() => e.current?.fire())}
          >
            A
          </button>
        </div>
      </div>
    );
  }

  return null;
}
