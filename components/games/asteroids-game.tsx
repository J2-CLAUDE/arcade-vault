"use client";

import { useRef, useEffect, useLayoutEffect } from "react";
import {
  createAsteroidsEngine,
  type EngineHandle,
} from "@/lib/games/asteroids/engine";
import { SKINS, type SkinId } from "@/lib/games/skins";

interface Props {
  paused: boolean;
  onGameOver: (score: number) => void;
  restartKey: number;
  skin: SkinId;
}

export default function AsteroidsGame({
  paused,
  onGameOver,
  restartKey,
  skin,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<EngineHandle | null>(null);
  const onGameOverRef = useRef(onGameOver);
  const restartKeyRef = useRef(restartKey);

  // Keep the callback ref in sync after every render, outside of the render phase
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

    const engine = createAsteroidsEngine(ctx, {
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

  // Pause / resume — resume() is a no-op if rAF is already running (safe on mount)
  useEffect(() => {
    if (paused) {
      engineRef.current?.pause();
    } else {
      engineRef.current?.resume();
    }
  }, [paused]);

  // Restart — skip initial render by comparing against the mounted restartKey value
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
