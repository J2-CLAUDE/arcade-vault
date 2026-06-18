"use client";

import {
  memo,
  useRef,
  useEffect,
  useLayoutEffect,
  useImperativeHandle,
  useState,
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

function TetrisGame({ paused, onGameOver, restartKey, skin, ref }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<EngineHandle | null>(null);
  const onGameOverRef = useRef(onGameOver);
  const restartKeyRef = useRef(restartKey);

  // Detect touch (coarse-pointer) devices — portrait layout for Tetris on mobile.
  const [orientation, setOrientation] = useState<"landscape" | "portrait">(
    "landscape",
  );

  useEffect(() => {
    const mq = window.matchMedia("(pointer: coarse)");
    const update = (e: MediaQueryListEvent | MediaQueryList) => {
      setOrientation(e.matches ? "portrait" : "landscape");
    };
    update(mq);
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

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

  // Mount / recreate — rebuild the engine on skin or orientation change so the
  // new palette / layout takes effect (engines read both once, at construction).
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const engine = createTetrisEngine(ctx, {
      onGameOver: (score) => onGameOverRef.current(score),
      skin: SKINS[skin],
      orientation,
    });
    engineRef.current = engine;
    engine.start();

    return () => {
      engine.destroy();
      engineRef.current = null;
    };
  }, [skin, orientation]);

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

  const canvasW = orientation === "portrait" ? 360 : 800;
  const canvasH = orientation === "portrait" ? 720 : 600;

  return (
    <canvas
      ref={canvasRef}
      width={canvasW}
      height={canvasH}
      style={{ display: "block", width: "100%", height: "100%" }}
    />
  );
}

export default memo(TetrisGame);
