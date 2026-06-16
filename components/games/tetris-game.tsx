"use client";

import { useRef, useEffect, useLayoutEffect } from "react";
import {
  createTetrisEngine,
  type EngineHandle,
} from "@/lib/games/tetris/engine";

interface Props {
  paused: boolean;
  onGameOver: (score: number) => void;
  restartKey: number;
}

export default function TetrisGame({ paused, onGameOver, restartKey }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<EngineHandle | null>(null);
  const onGameOverRef = useRef(onGameOver);
  const restartKeyRef = useRef(restartKey);

  // Keep callback ref in sync without triggering effects
  useLayoutEffect(() => {
    onGameOverRef.current = onGameOver;
  });

  // Mount / unmount — create engine once, destroy on cleanup
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const engine = createTetrisEngine(ctx, {
      onGameOver: (score) => onGameOverRef.current(score),
    });
    engineRef.current = engine;
    engine.start();

    return () => {
      engine.destroy();
      engineRef.current = null;
    };
  }, []);

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
