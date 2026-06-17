"use client";

import {
  useRef,
  useEffect,
  useLayoutEffect,
  useImperativeHandle,
  type Ref,
} from "react";
import {
  createTetrisEngine,
  type EngineHandle,
} from "@/lib/games/tetris/engine";
import { SKINS, type SkinId } from "@/lib/games/skins";

interface Props {
  paused: boolean;
  onGameOver: (score: number) => void;
  restartKey: number;
  skin: SkinId;
  ref?: Ref<EngineHandle>;
}

export default function TetrisGame({
  paused,
  onGameOver,
  restartKey,
  skin,
  ref,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<EngineHandle | null>(null);
  const onGameOverRef = useRef(onGameOver);
  const restartKeyRef = useRef(restartKey);

  useImperativeHandle(ref, () => ({
    start: () => engineRef.current?.start(),
    pause: () => engineRef.current?.pause(),
    resume: () => engineRef.current?.resume(),
    restart: () => engineRef.current?.restart(),
    destroy: () => engineRef.current?.destroy(),
    moveLeft: () => engineRef.current?.moveLeft(),
    moveRight: () => engineRef.current?.moveRight(),
    rotate: () => engineRef.current?.rotate(),
    softDrop: () => engineRef.current?.softDrop(),
    hardDrop: () => engineRef.current?.hardDrop(),
  }));

  // Keep callback ref in sync without triggering effects
  useLayoutEffect(() => {
    onGameOverRef.current = onGameOver;
  });

  // Mount / recreate — rebuild the engine on skin change so the new palette
  // takes effect (engines read their palette once, at construction).
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const engine = createTetrisEngine(ctx, {
      onGameOver: (score) => onGameOverRef.current(score),
      skin: SKINS[skin],
    });
    engineRef.current = engine;
    engine.start();

    return () => {
      engine.destroy();
      engineRef.current = null;
    };
  }, [skin]);

  // Pause / resume
  useEffect(() => {
    if (paused) {
      engineRef.current?.pause();
    } else {
      engineRef.current?.resume();
    }
  }, [paused]);

  // Restart — skip initial render by comparing against mounted restartKey value
  useEffect(() => {
    if (restartKey === restartKeyRef.current) return;
    restartKeyRef.current = restartKey;
    engineRef.current?.restart();
  }, [restartKey]);

  return (
    <canvas
      ref={canvasRef}
      width={800}
      height={600}
      style={{ display: "block", width: "100%", height: "100%" }}
    />
  );
}
