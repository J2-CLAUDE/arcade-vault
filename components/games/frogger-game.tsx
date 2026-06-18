"use client";

import React, { useRef, useEffect } from "react";
import { SKINS, type SkinId } from "@/lib/games/skins";

// ── Canvas geometry ──────────────────────────────────────────────────────────
const COLS = 16;
const ROWS = 14;
const CELL = 40; // px per cell
const CANVAS_W = COLS * CELL; // 640
const CANVAS_H = ROWS * CELL; // 560

// Dial maestro de velocidad (celdas/seg globales). Más bajo = juego más lento.
const SPEED_SCALE = 0.6;

// ── Zone row indices (0 = top) ────────────────────────────────────────────────
const ROW_GOALS = 0;
const ROW_RIVER_TOP = 1;
const ROW_RIVER_BOT = 6;
const ROW_SAFE_MID = 7;
const ROW_ROAD_TOP = 8;
const ROW_ROAD_BOT = 12;
const ROW_START = 13;

// ── Local types (not exported) ────────────────────────────────────────────────
type Direction = "up" | "down" | "left" | "right";

interface Entity {
  col: number; // fractional, advances each frame
  width: number; // in cells
  type: "car" | "truck" | "log" | "turtle";
  submerged?: boolean;
  submergeTimer?: number;
}

interface Lane {
  row: number;
  speed: number; // celdas por segundo
  dir: 1 | -1; // 1 = left→right, -1 = right→left
  entities: Entity[];
}

interface Frog {
  col: number;
  row: number;
  animating: boolean;
  animT: number; // ms elapsed in current jump animation
  targetCol: number;
  targetRow: number;
}

// ── setLineDash constants — avoids per-frame array allocations ───────────────
const DASH_ROAD: number[] = [6, 6];
const DASH_CLEAR: number[] = [];

// ── Turtle submerge cycle constants ──────────────────────────────────────────
const TURTLE_VISIBLE_MS = 3000;
const TURTLE_SUBMERGED_MS = 1500;
const SUBMERGE_CYCLE = TURTLE_VISIBLE_MS + TURTLE_SUBMERGED_MS;

// ── Lane-building helpers ─────────────────────────────────────────────────────

/** Evenly distribute `count` road vehicles across `cols` columns. */
function spawnRoad(
  type: "car" | "truck",
  count: number,
  entityWidth: number,
  cols: number,
): Entity[] {
  const gap = (cols - count * entityWidth) / count;
  return Array.from({ length: count }, (_, i) => ({
    col: i * (entityWidth + gap),
    width: entityWidth,
    type,
  }));
}

/** Distribute logs with the given widths evenly across `cols` columns. */
function spawnLogs(widths: number[], cols: number): Entity[] {
  const totalW = widths.reduce((a, b) => a + b, 0);
  const gap = (cols - totalW) / widths.length;
  const entities: Entity[] = [];
  let col = 0;
  for (const w of widths) {
    entities.push({ col, width: w, type: "log" });
    col += w + gap;
  }
  return entities;
}

/**
 * Distribute `count` turtle groups (each `groupSize` cells wide) across
 * `cols` columns.  Each group gets a staggered submerge-timer offset so they
 * don't all disappear at once.
 */
function spawnTurtles(
  groupSize: number,
  count: number,
  cols: number,
): Entity[] {
  const gap = (cols - count * groupSize) / count;
  return Array.from({ length: count }, (_, i) => ({
    col: i * (groupSize + gap),
    width: groupSize,
    type: "turtle" as const,
    submerged: false,
    submergeTimer: (i * SUBMERGE_CYCLE) / count, // staggered phase
  }));
}

// ── buildLanes ────────────────────────────────────────────────────────────────

/**
 * Returns lanes and a precomputed index map for O(1) lane lookups.
 * Every level multiplies all speeds by 1.15 (capped to avoid
 * impossibility on very high levels).
 */
function buildLanes(level: number): {
  lanes: Lane[];
  laneIndexMap: Map<Lane, number>;
} {
  const mult = Math.min(Math.pow(1.15, level - 1), 4); // cap at 4×
  // Dial maestro de velocidad: baja este número para frenar TODO el juego.
  // speed final = base (celdas/seg) × mult de nivel × SPEED_SCALE.
  const s = (base: number) => base * mult * SPEED_SCALE;

  const lanes: Lane[] = [
    // ── Road lanes (rows 12 → 8, bottom → top) ──────────────────────────────
    {
      row: ROW_ROAD_BOT,
      dir: 1,
      speed: s(2.5),
      entities: spawnRoad("car", 3, 1, COLS),
    },
    {
      row: 11,
      dir: -1,
      speed: s(3.5),
      entities: spawnRoad("truck", 2, 2, COLS),
    },
    { row: 10, dir: 1, speed: s(4.0), entities: spawnRoad("car", 4, 1, COLS) },
    { row: 9, dir: -1, speed: s(5.0), entities: spawnRoad("car", 3, 1, COLS) },
    {
      row: ROW_ROAD_TOP,
      dir: 1,
      speed: s(3.0),
      entities: spawnRoad("truck", 2, 3, COLS),
    },
    // ── River lanes (rows 6 → 1, bottom → top) ──────────────────────────────
    {
      row: ROW_RIVER_BOT,
      dir: -1,
      speed: s(2.0),
      entities: spawnLogs([3, 2, 4], COLS),
    },
    { row: 5, dir: 1, speed: s(1.5), entities: spawnTurtles(3, 3, COLS) },
    { row: 4, dir: -1, speed: s(2.5), entities: spawnLogs([2, 3, 2], COLS) },
    { row: 3, dir: 1, speed: s(2.0), entities: spawnTurtles(2, 4, COLS) },
    { row: 2, dir: -1, speed: s(3.0), entities: spawnLogs([4, 2, 3], COLS) },
    {
      row: ROW_RIVER_TOP,
      dir: 1,
      speed: s(3.5),
      entities: spawnLogs([2, 3], COLS),
    },
  ];

  const laneIndexMap = new Map(lanes.map((lane, i) => [lane, i]));
  return { lanes, laneIndexMap };
}

// ── Component props ───────────────────────────────────────────────────────────
interface FroggerGameProps {
  paused: boolean;
  skin: SkinId;
  onScoreChange: (score: number) => void;
  onLivesChange: (lives: number) => void;
  onLevelChange: (level: number) => void;
  onGameOver: (finalScore: number) => void;
}

// ── Goal column layout (0-indexed, each slot 2 cells wide) ───────────────────
// Layout: buf | G0 | buf | G1 | buf | G2 | buf | G3 | buf | G4 | buf
const GOAL_COLS = [1, 4, 7, 10, 13]; // left col of each goal slot
const FROG_START_COL = 7; // center-left of goal 2

function getRoundTime(level: number): number {
  return Math.max(15000 - (level - 1) * 1000, 8000);
}

function FroggerGame({
  paused,
  skin,
  onScoreChange,
  onLivesChange,
  onLevelChange,
  onGameOver,
}: FroggerGameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Stable callback refs — avoids stale closures in the RAF loop
  const pausedRef = useRef(paused);
  const onScoreChangeRef = useRef(onScoreChange);
  const onLivesChangeRef = useRef(onLivesChange);
  const onLevelChangeRef = useRef(onLevelChange);
  const onGameOverRef = useRef(onGameOver);

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);
  useEffect(() => {
    onScoreChangeRef.current = onScoreChange;
  }, [onScoreChange]);
  useEffect(() => {
    onLivesChangeRef.current = onLivesChange;
  }, [onLivesChange]);
  useEffect(() => {
    onLevelChangeRef.current = onLevelChange;
  }, [onLevelChange]);
  useEffect(() => {
    onGameOverRef.current = onGameOver;
  }, [onGameOver]);

  // ── Main game loop ──────────────────────────────────────────────────────────
  // Re-runs when `skin` changes so the new palette takes effect; the parent also
  // remounts via `key={gameKey}` on restart, so this only rebuilds on skin swap.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;

    // Resolve the active palette once per mount.
    const pal = (SKINS[skin] ?? SKINS.clasico).frogger;
    const glow = (SKINS[skin] ?? SKINS.clasico).glow;

    // ── Mutable game state ──────────────────────────────────────────────────
    const frog: Frog = {
      col: FROG_START_COL,
      row: ROW_START,
      animating: false,
      animT: 0,
      targetCol: FROG_START_COL,
      targetRow: ROW_START,
    };
    let { lanes, laneIndexMap: _laneIndexMap } = buildLanes(1);
    let lives = 3;
    let score = 0;
    let level = 1;
    let roundTimer = getRoundTime(1);
    const goals = [false, false, false, false, false];
    let pendingDir: Direction | null = null;
    let prevScore = 0,
      prevLives = 3,
      prevLevel = 1;
    let highestRowThisRound = ROW_START;
    let gameOver = false;

    // ── Step 5: collision & support ─────────────────────────────────────────

    function checkRoadCollision(f: Frog, ls: Lane[]): boolean {
      for (const lane of ls) {
        if (lane.row !== f.row) continue;
        for (const e of lane.entities) {
          if (f.col >= e.col && f.col < e.col + e.width) return true;
        }
      }
      return false;
    }

    function getSupport(f: Frog, ls: Lane[]): Entity | null {
      for (const lane of ls) {
        if (lane.row !== f.row) continue;
        for (const e of lane.entities) {
          if (f.col >= e.col && f.col < e.col + e.width) {
            if (e.type === "turtle" && e.submerged) return null;
            return e;
          }
        }
      }
      return null;
    }

    function checkGoal(): void {
      // Identify which goal slot the frog landed in
      let goalIdx = -1;
      for (let i = 0; i < GOAL_COLS.length; i++) {
        if (frog.col >= GOAL_COLS[i] && frog.col < GOAL_COLS[i] + 2) {
          goalIdx = i;
          break;
        }
      }
      // Not in a goal slot → death
      if (goalIdx === -1) {
        killFrog();
        return;
      }
      // Already occupied → death
      if (goals[goalIdx]) {
        killFrog();
        return;
      }
      // New goal: award points
      goals[goalIdx] = true;
      const timeBonus = Math.floor(roundTimer / 1000) * 10;
      score += 50 + timeBonus;
      if (goals.every(Boolean)) {
        completeRound();
      } else {
        // Reset frog for next approach
        frog.col = FROG_START_COL;
        frog.row = ROW_START;
        frog.animating = false;
        highestRowThisRound = ROW_START;
        roundTimer = getRoundTime(level);
      }
    }

    // ── Step 6: round completion ─────────────────────────────────────────────

    function completeRound(): void {
      score += 200;
      level++;
      onLevelChangeRef.current(level);
      ({ lanes, laneIndexMap: _laneIndexMap } = buildLanes(level));
      goals.fill(false);
      roundTimer = getRoundTime(level);
      frog.col = FROG_START_COL;
      frog.row = ROW_START;
      frog.animating = false;
      highestRowThisRound = ROW_START;
    }

    // ── Step 7: death handling ───────────────────────────────────────────────

    function killFrog(): void {
      lives--;
      onLivesChangeRef.current(lives);
      if (lives <= 0) {
        lives = 0;
        gameOver = true;
        onLivesChangeRef.current(0);
        onGameOverRef.current(score);
        return;
      }
      frog.col = FROG_START_COL;
      frog.row = ROW_START;
      frog.animating = false;
      roundTimer = getRoundTime(level);
      highestRowThisRound = ROW_START;
    }

    // ── Update ──────────────────────────────────────────────────────────────
    function update(dt: number) {
      if (pausedRef.current || gameOver) return;

      // 1. Advance entities + turtle submerge cycle
      for (const lane of lanes) {
        for (const e of lane.entities) {
          e.col += (lane.speed * lane.dir * dt) / 1000;
          if (lane.dir === 1 && e.col > COLS) e.col = -e.width;
          if (lane.dir === -1 && e.col + e.width < 0) e.col = COLS;
          if (e.type === "turtle" && e.submergeTimer !== undefined) {
            e.submergeTimer = (e.submergeTimer + dt) % SUBMERGE_CYCLE;
            e.submerged = e.submergeTimer >= TURTLE_VISIBLE_MS;
          }
        }
      }

      // 2. Frog movement
      if (!frog.animating) {
        if (pendingDir !== null) {
          const dir = pendingDir;
          pendingDir = null;
          let nc = frog.col,
            nr = frog.row;
          if (dir === "up") nr--;
          else if (dir === "down") nr++;
          else if (dir === "left") nc--;
          else if (dir === "right") nc++;
          nc = Math.max(0, Math.min(COLS - 1, nc));
          if (nr > ROW_START) nr = ROW_START;
          frog.targetCol = nc;
          frog.targetRow = nr;
          frog.animating = true;
          frog.animT = 0;
        }
      } else {
        frog.animT += dt;
        if (frog.animT >= 120) {
          frog.col = frog.targetCol;
          frog.row = frog.targetRow;
          frog.animating = false;
          frog.animT = 0;
          // Score for upward progress (first time reaching each row)
          if (frog.row < highestRowThisRound) {
            score += (highestRowThisRound - frog.row) * 10;
            highestRowThisRound = frog.row;
          }
          // Resolve landing cell
          if (frog.row === ROW_GOALS) {
            checkGoal();
          } else if (frog.row >= ROW_ROAD_TOP && frog.row <= ROW_ROAD_BOT) {
            if (checkRoadCollision(frog, lanes)) killFrog();
          } else if (frog.row >= ROW_RIVER_TOP && frog.row <= ROW_RIVER_BOT) {
            if (getSupport(frog, lanes) === null) killFrog();
          }
        }
      }

      // 3. River drift + ongoing support check
      if (
        !frog.animating &&
        frog.row >= ROW_RIVER_TOP &&
        frog.row <= ROW_RIVER_BOT
      ) {
        const support = getSupport(frog, lanes);
        if (support === null) {
          killFrog();
        } else {
          const lane = lanes.find((l) => l.row === frog.row)!;
          frog.col += (lane.speed * lane.dir * dt) / 1000;
          if (frog.col < 0 || frog.col >= COLS) killFrog();
        }
      }

      // 4. Road collision while standing still
      if (
        !frog.animating &&
        frog.row >= ROW_ROAD_TOP &&
        frog.row <= ROW_ROAD_BOT
      ) {
        if (checkRoadCollision(frog, lanes)) killFrog();
      }

      // 5. Round timer
      roundTimer -= dt;
      if (roundTimer <= 0) {
        roundTimer = 0;
        killFrog();
      }

      // 6. Fire callbacks on change
      if (score !== prevScore) {
        onScoreChangeRef.current(score);
        prevScore = score;
      }
      if (lives !== prevLives) {
        onLivesChangeRef.current(lives);
        prevLives = lives;
      }
      if (level !== prevLevel) {
        onLevelChangeRef.current(level);
        prevLevel = level;
      }
    }

    // ── Draw helpers ────────────────────────────────────────────────────────

    function drawBackground() {
      for (let row = 0; row < ROWS; row++) {
        const y = row * CELL;
        if (row === ROW_GOALS) ctx.fillStyle = pal.goalRow;
        else if (row >= ROW_RIVER_TOP && row <= ROW_RIVER_BOT)
          ctx.fillStyle = pal.river;
        else if (row === ROW_SAFE_MID || row === ROW_START)
          ctx.fillStyle = pal.safe;
        else ctx.fillStyle = pal.road; // road
        ctx.fillRect(0, y, CANVAS_W, CELL);
      }
      // Dashed lane dividers
      ctx.strokeStyle = pal.laneDash;
      ctx.setLineDash(DASH_ROAD);
      ctx.lineWidth = 1;
      for (let row = ROW_ROAD_TOP; row < ROW_ROAD_BOT; row++) {
        ctx.beginPath();
        ctx.moveTo(0, (row + 1) * CELL);
        ctx.lineTo(CANVAS_W, (row + 1) * CELL);
        ctx.stroke();
      }
      ctx.setLineDash(DASH_CLEAR);
    }

    function drawGoals() {
      for (let i = 0; i < 5; i++) {
        const gx = GOAL_COLS[i] * CELL;
        const gy = ROW_GOALS * CELL;
        const gw = 2 * CELL;
        ctx.fillStyle = goals[i] ? pal.goalFilled : pal.goalEmpty;
        ctx.fillRect(gx, gy, gw, CELL);
        ctx.strokeStyle = goals[i] ? pal.goalStrokeFilled : pal.goalStrokeEmpty;
        ctx.lineWidth = goals[i] ? 2 : 1;
        ctx.strokeRect(gx + 1, gy + 1, gw - 2, CELL - 2);
        if (goals[i]) {
          ctx.fillStyle = pal.frog;
          ctx.beginPath();
          ctx.ellipse(gx + gw / 2, gy + CELL / 2, 10, 8, 0, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    const CAR_COLORS = pal.cars;

    function drawEntities() {
      for (const lane of lanes) {
        for (const e of lane.entities) {
          const ex = e.col * CELL;
          const ey = lane.row * CELL;
          const ew = e.width * CELL;

          if (e.type === "car") {
            const color = CAR_COLORS[lane.row % 3];
            if (glow) {
              ctx.shadowColor = color;
              ctx.shadowBlur = 12;
            }
            ctx.fillStyle = color;
            ctx.fillRect(ex + 2, ey + 8, ew - 4, CELL - 16);
            ctx.shadowBlur = 0;
            ctx.fillStyle = pal.wheel;
            ctx.beginPath();
            ctx.arc(ex + 8, ey + CELL - 9, 5, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(ex + ew - 8, ey + CELL - 9, 5, 0, Math.PI * 2);
            ctx.fill();
          } else if (e.type === "truck") {
            if (glow) {
              ctx.shadowColor = pal.truckBody;
              ctx.shadowBlur = 12;
            }
            ctx.fillStyle = pal.truckBody;
            ctx.fillRect(ex + 2, ey + 8, ew - 4, CELL - 16);
            ctx.shadowBlur = 0;
            ctx.fillStyle = pal.truckCab;
            const cabX = lane.dir === 1 ? ex + ew - 14 : ex + 2;
            ctx.fillRect(cabX, ey + 6, 12, CELL - 12);
            ctx.fillStyle = pal.wheel;
            ctx.beginPath();
            ctx.arc(ex + 8, ey + CELL - 9, 5, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(ex + ew - 8, ey + CELL - 9, 5, 0, Math.PI * 2);
            ctx.fill();
          } else if (e.type === "log") {
            ctx.fillStyle = pal.log;
            ctx.fillRect(ex + 1, ey + 8, ew - 2, CELL - 16);
            ctx.strokeStyle = pal.logGrain;
            ctx.lineWidth = 1;
            for (let lx = ex + 8; lx < ex + ew - 4; lx += 8) {
              ctx.beginPath();
              ctx.moveTo(lx, ey + 8);
              ctx.lineTo(lx, ey + CELL - 8);
              ctx.stroke();
            }
          } else if (e.type === "turtle") {
            ctx.globalAlpha = e.submerged ? 0.3 : 1;
            for (let t = 0; t < e.width; t++) {
              const tx = ex + t * CELL;
              if (glow && !e.submerged) {
                ctx.shadowColor = pal.turtle;
                ctx.shadowBlur = 10;
              }
              ctx.fillStyle = e.submerged ? pal.turtleSubmerged : pal.turtle;
              ctx.beginPath();
              ctx.ellipse(
                tx + CELL / 2,
                ey + CELL / 2,
                14,
                12,
                0,
                0,
                Math.PI * 2,
              );
              ctx.fill();
              ctx.shadowBlur = 0;
              if (!e.submerged) {
                ctx.strokeStyle = pal.turtleDetail;
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(tx + CELL / 2 - 6, ey + CELL / 2);
                ctx.lineTo(tx + CELL / 2 + 6, ey + CELL / 2);
                ctx.moveTo(tx + CELL / 2, ey + CELL / 2 - 5);
                ctx.lineTo(tx + CELL / 2, ey + CELL / 2 + 5);
                ctx.stroke();
              }
            }
            ctx.globalAlpha = 1;
          }
        }
      }
    }

    function drawFrog() {
      let dc: number, dr: number;
      if (frog.animating) {
        const t = Math.min(frog.animT / 120, 1);
        dc = frog.col + (frog.targetCol - frog.col) * t;
        dr = frog.row + (frog.targetRow - frog.row) * t;
      } else {
        dc = frog.col;
        dr = frog.row;
      }
      const fx = dc * CELL + CELL / 2;
      const fy = dr * CELL + CELL / 2;

      if (frog.animating) {
        ctx.fillStyle = pal.frogLeg;
        ctx.fillRect(fx - 18, fy - 5, 8, 5);
        ctx.fillRect(fx + 10, fy - 5, 8, 5);
        ctx.fillRect(fx - 18, fy + 2, 8, 5);
        ctx.fillRect(fx + 10, fy + 2, 8, 5);
      }

      if (glow) {
        ctx.shadowColor = pal.frog;
        ctx.shadowBlur = 14;
      }
      ctx.fillStyle = pal.frog;
      ctx.beginPath();
      ctx.ellipse(fx, fy, 14, 12, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      ctx.fillStyle = pal.frogEye;
      ctx.beginPath();
      ctx.arc(fx - 6, fy - 5, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(fx + 6, fy - 5, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#000";
      ctx.beginPath();
      ctx.arc(fx - 5, fy - 5, 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(fx + 5, fy - 5, 2, 0, Math.PI * 2);
      ctx.fill();
    }

    function drawHUD() {
      const totalTime = getRoundTime(level);
      const ratio = Math.max(0, roundTimer / totalTime);
      const barColor =
        ratio > 0.5 ? "#00ff88" : ratio > 0.25 ? "#f5ff00" : "#ff006e";

      // Semi-transparent top strip
      ctx.fillStyle = "rgba(0,0,0,0.55)";
      ctx.fillRect(0, 0, CANVAS_W, 20);

      // Score
      ctx.font = "bold 12px monospace";
      ctx.textBaseline = "top";
      ctx.textAlign = "left";
      ctx.fillStyle = pal.hudText;
      ctx.fillText(`${score}`, 8, 4);

      // Level
      ctx.textAlign = "center";
      ctx.fillStyle = pal.hudLevel;
      ctx.fillText(`LV ${level}`, CANVAS_W / 2, 4);

      // Life icons
      for (let i = 0; i < lives; i++) {
        ctx.fillStyle = pal.frog;
        ctx.beginPath();
        ctx.arc(CANVAS_W - 10 - i * 14, 10, 5, 0, Math.PI * 2);
        ctx.fill();
      }

      // Time bar (2px at very top)
      ctx.fillStyle = "rgba(0,0,0,0.4)";
      ctx.fillRect(0, 0, CANVAS_W, 2);
      ctx.fillStyle = barColor;
      ctx.fillRect(0, 0, CANVAS_W * ratio, 2);
    }

    function draw() {
      ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
      drawBackground();
      drawGoals();
      drawEntities();
      drawFrog();
      drawHUD();
    }

    // ── RAF loop ────────────────────────────────────────────────────────────
    let rafId = 0;
    let lastTime = 0;
    let pauseDrawn = false;

    function loop(time: number) {
      if (gameOver) return;
      if (pausedRef.current) {
        if (!pauseDrawn) {
          draw();
          pauseDrawn = true;
        }
        rafId = requestAnimationFrame(loop);
        return;
      }
      pauseDrawn = false;
      const dt = lastTime === 0 ? 16 : Math.min(time - lastTime, 100);
      lastTime = time;
      update(dt);
      draw();
      rafId = requestAnimationFrame(loop);
    }

    rafId = requestAnimationFrame(loop);

    // ── Keyboard input ──────────────────────────────────────────────────────
    const DIR_MAP: Record<string, Direction> = {
      ArrowUp: "up",
      ArrowDown: "down",
      ArrowLeft: "left",
      ArrowRight: "right",
      KeyW: "up",
      KeyS: "down",
      KeyA: "left",
      KeyD: "right",
    };

    function onKeyDown(e: KeyboardEvent) {
      const dir = DIR_MAP[e.code];
      if (dir) {
        e.preventDefault();
        pendingDir = dir;
      }
    }

    document.addEventListener("keydown", onKeyDown);

    return () => {
      gameOver = true;
      cancelAnimationFrame(rafId);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [skin]);

  return (
    <canvas
      ref={canvasRef}
      width={CANVAS_W}
      height={CANVAS_H}
      style={{ width: "100%", height: "100%", display: "block" }}
    />
  );
}

export default React.memo(FroggerGame);
