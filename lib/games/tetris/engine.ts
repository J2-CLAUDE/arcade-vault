const COLS = 10;
const ROWS = 20;
const BLOCK = 30;
const BOARD_W = COLS * BLOCK; // 300
const CANVAS_W = 800;
const CANVAS_H = 600;
const GRID_LINE = "rgba(255,255,255,0.06)";

const COLORS: (string | null)[] = [
  null,
  "#4dd0e1", // 1 I - cyan
  "#ffd54f", // 2 O - yellow
  "#ba68c8", // 3 T - purple
  "#81c784", // 4 S - green
  "#e57373", // 5 Z - red
  "#90caf9", // 6 J - pale blue
  "#ffb74d", // 7 L - orange
  "#9e9e9e", // 8 N - tuerca (gris metálico)
];

const PIECES: (number[][] | null)[] = [
  null,
  [
    [0, 0, 0, 0],
    [1, 1, 1, 1],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ], // I
  [
    [2, 2],
    [2, 2],
  ], // O
  [
    [0, 3, 0],
    [3, 3, 3],
    [0, 0, 0],
  ], // T
  [
    [0, 4, 4],
    [4, 4, 0],
    [0, 0, 0],
  ], // S
  [
    [5, 5, 0],
    [0, 5, 5],
    [0, 0, 0],
  ], // Z
  [
    [6, 0, 0],
    [6, 6, 6],
    [0, 0, 0],
  ], // J
  [
    [0, 0, 7],
    [7, 7, 7],
    [0, 0, 0],
  ], // L
  [
    [8, 8, 8],
    [8, 0, 8],
    [8, 8, 8],
  ], // N (tuerca)
];

const LINE_SCORES = [0, 100, 300, 500, 800];

type PieceType = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
type Board = number[][];

interface Piece {
  type: PieceType;
  shape: number[][];
  x: number;
  y: number;
}

export interface EngineHandle {
  start(): void;
  pause(): void;
  resume(): void;
  restart(): void;
  destroy(): void;
}

export interface EngineCallbacks {
  onGameOver: (finalScore: number) => void;
}

export function createTetrisEngine(
  ctx: CanvasRenderingContext2D,
  callbacks: EngineCallbacks,
): EngineHandle {
  let board!: Board;
  let current!: Piece;
  let next!: Piece;
  let score = 0;
  let lines = 0;
  let level = 1;
  let paused = false;
  let gameOver = false;
  let gameOverFired = false;
  let lastTime = 0;
  let dropAccum = 0;
  let dropInterval = 1000;
  let animId = 0;

  function createBoard(): Board {
    return Array.from({ length: ROWS }, () => new Array(COLS).fill(0));
  }

  function randomPiece(): Piece {
    const type = (Math.floor(Math.random() * 8) + 1) as PieceType;
    const shape = PIECES[type]!.map((row) => [...row]);
    return {
      type,
      shape,
      x: Math.floor(COLS / 2) - Math.floor(shape[0].length / 2),
      y: 0,
    };
  }

  function collide(shape: number[][], ox: number, oy: number): boolean {
    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[r].length; c++) {
        if (!shape[r][c]) continue;
        const nx = ox + c;
        const ny = oy + r;
        if (nx < 0 || nx >= COLS || ny >= ROWS) return true;
        if (ny >= 0 && board[ny][nx]) return true;
      }
    }
    return false;
  }

  function rotateCW(shape: number[][]): number[][] {
    const rows = shape.length;
    const cols = shape[0].length;
    const result = Array.from({ length: cols }, () => new Array(rows).fill(0));
    for (let r = 0; r < rows; r++)
      for (let c = 0; c < cols; c++) result[c][rows - 1 - r] = shape[r][c];
    return result;
  }

  function tryRotate(): void {
    const rotated = rotateCW(current.shape);
    const kicks = [0, -1, 1, -2, 2];
    for (const kick of kicks) {
      if (!collide(rotated, current.x + kick, current.y)) {
        current.shape = rotated;
        current.x += kick;
        return;
      }
    }
  }

  function merge(): void {
    for (let r = 0; r < current.shape.length; r++)
      for (let c = 0; c < current.shape[r].length; c++)
        if (current.shape[r][c])
          board[current.y + r][current.x + c] = current.shape[r][c];
  }

  function clearLines(): void {
    let cleared = 0;
    for (let r = ROWS - 1; r >= 0; r--) {
      if (board[r].every((v) => v !== 0)) {
        board.splice(r, 1);
        board.unshift(new Array(COLS).fill(0));
        cleared++;
        r++;
      }
    }
    if (cleared) {
      lines += cleared;
      score += (LINE_SCORES[cleared] ?? 0) * level;
      level = Math.floor(lines / 10) + 1;
      dropInterval = Math.max(100, 1000 - (level - 1) * 90);
    }
  }

  function ghostY(): number {
    let gy = current.y;
    while (!collide(current.shape, current.x, gy + 1)) gy++;
    return gy;
  }

  function hardDrop(): void {
    const gy = ghostY();
    score += (gy - current.y) * 2;
    current.y = gy;
    lockPiece();
  }

  function softDrop(): void {
    if (!collide(current.shape, current.x, current.y + 1)) {
      current.y++;
      score += 1;
    } else {
      lockPiece();
    }
  }

  function spawn(): void {
    current = next;
    next = randomPiece();
    if (collide(current.shape, current.x, current.y)) {
      gameOver = true;
      cancelAnimationFrame(animId);
      if (!gameOverFired) {
        gameOverFired = true;
        callbacks.onGameOver(score);
      }
    }
  }

  function lockPiece(): void {
    merge();
    clearLines();
    spawn();
  }

  // --- Drawing ---

  function drawBlock(
    x: number,
    y: number,
    colorIndex: number,
    size: number,
    alpha = 1,
    pixelOffX = 0,
    pixelOffY = 0,
  ): void {
    if (!colorIndex) return;
    const color = COLORS[colorIndex];
    if (!color) return;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    ctx.fillRect(
      pixelOffX + x * size + 1,
      pixelOffY + y * size + 1,
      size - 2,
      size - 2,
    );
    ctx.fillStyle = "rgba(255,255,255,0.12)";
    ctx.fillRect(
      pixelOffX + x * size + 1,
      pixelOffY + y * size + 1,
      size - 2,
      4,
    );
    ctx.globalAlpha = 1;
  }

  function drawGrid(): void {
    ctx.strokeStyle = GRID_LINE;
    ctx.lineWidth = 0.5;
    for (let c = 1; c < COLS; c++) {
      ctx.beginPath();
      ctx.moveTo(c * BLOCK, 0);
      ctx.lineTo(c * BLOCK, ROWS * BLOCK);
      ctx.stroke();
    }
    for (let r = 1; r < ROWS; r++) {
      ctx.beginPath();
      ctx.moveTo(0, r * BLOCK);
      ctx.lineTo(BOARD_W, r * BLOCK);
      ctx.stroke();
    }
  }

  function drawBoard(): void {
    for (let r = 0; r < ROWS; r++)
      for (let c = 0; c < COLS; c++) drawBlock(c, r, board[r][c], BLOCK);
  }

  function drawGhost(): void {
    const gy = ghostY();
    for (let r = 0; r < current.shape.length; r++)
      for (let c = 0; c < current.shape[r].length; c++)
        if (current.shape[r][c])
          drawBlock(current.x + c, gy + r, current.shape[r][c], BLOCK, 0.2);
  }

  function drawCurrent(): void {
    for (let r = 0; r < current.shape.length; r++)
      for (let c = 0; c < current.shape[r].length; c++)
        drawBlock(current.x + c, current.y + r, current.shape[r][c], BLOCK);
  }

  function drawHUD(): void {
    // Panel background
    ctx.fillStyle = "rgba(0,0,0,0.45)";
    ctx.fillRect(BOARD_W, 0, CANVAS_W - BOARD_W, CANVAS_H);

    // Separator
    ctx.strokeStyle = "rgba(255,255,255,0.15)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(BOARD_W, 0);
    ctx.lineTo(BOARD_W, CANVAS_H);
    ctx.stroke();

    const px = BOARD_W + 28;
    ctx.textAlign = "left";

    // SCORE
    let y = 56;
    ctx.font = "11px monospace";
    ctx.fillStyle = "rgba(255,255,255,0.45)";
    ctx.fillText("SCORE", px, y);
    y += 24;
    ctx.font = "bold 24px monospace";
    ctx.fillStyle = "#4dd0e1";
    ctx.fillText(score.toLocaleString(), px, y);

    // LÍNEAS
    y += 44;
    ctx.font = "11px monospace";
    ctx.fillStyle = "rgba(255,255,255,0.45)";
    ctx.fillText("LÍNEAS", px, y);
    y += 24;
    ctx.font = "bold 24px monospace";
    ctx.fillStyle = "#ffd54f";
    ctx.fillText(String(lines), px, y);

    // NIVEL
    y += 44;
    ctx.font = "11px monospace";
    ctx.fillStyle = "rgba(255,255,255,0.45)";
    ctx.fillText("NIVEL", px, y);
    y += 24;
    ctx.font = "bold 24px monospace";
    ctx.fillStyle = "#81c784";
    ctx.fillText(String(level), px, y);

    // SIGUIENTE (next piece preview)
    y += 48;
    ctx.font = "11px monospace";
    ctx.fillStyle = "rgba(255,255,255,0.45)";
    ctx.fillText("SIGUIENTE", px, y);
    y += 12;

    const NB = 26; // preview block size
    const PREVIEW_COLS = 4;
    const PREVIEW_ROWS = 4;
    const boxW = PREVIEW_COLS * NB;
    const boxH = PREVIEW_ROWS * NB;

    // Preview border
    ctx.strokeStyle = "rgba(255,255,255,0.18)";
    ctx.lineWidth = 1;
    ctx.strokeRect(px, y, boxW, boxH);

    // Draw next piece centered in 4×4
    const shape = next.shape;
    const offCol = Math.floor((PREVIEW_COLS - shape[0].length) / 2);
    const offRow = Math.floor((PREVIEW_ROWS - shape.length) / 2);
    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[r].length; c++) {
        if (!shape[r][c]) continue;
        const color = COLORS[shape[r][c]];
        if (!color) continue;
        const bx = px + (offCol + c) * NB;
        const by = y + (offRow + r) * NB;
        ctx.globalAlpha = 1;
        ctx.fillStyle = color;
        ctx.fillRect(bx + 1, by + 1, NB - 2, NB - 2);
        ctx.fillStyle = "rgba(255,255,255,0.12)";
        ctx.fillRect(bx + 1, by + 1, NB - 2, 4);
      }
    }

    // Controls hint
    ctx.fillStyle = "rgba(255,255,255,0.22)";
    ctx.font = "10px monospace";
    let cy = CANVAS_H - 112;
    const hints = ["← →  mover", "↑/X  rotar", "↓    bajar", "␣    drop"];
    for (const h of hints) {
      ctx.fillText(h, px, cy);
      cy += 18;
    }
  }

  function draw(): void {
    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
    drawGrid();
    drawBoard();
    if (!gameOver) {
      drawGhost();
      drawCurrent();
    }
    drawHUD();
  }

  // --- Game loop ---

  function loop(ts: number): void {
    const rawDt = ts - lastTime;
    lastTime = ts;
    const dt = Math.min(rawDt, 50); // cap to avoid jumps after tab sleep

    if (!paused && !gameOver) {
      dropAccum += dt;
      if (dropAccum >= dropInterval) {
        dropAccum = 0;
        if (!collide(current.shape, current.x, current.y + 1)) {
          current.y++;
        } else {
          lockPiece(); // may set gameOver = true
        }
      }
    }

    draw();
    if (gameOver) return; // RAF was already cancelled in spawn()
    animId = requestAnimationFrame(loop);
  }

  // --- Keyboard ---

  function onKeyDown(e: KeyboardEvent): void {
    // Always prevent scroll for these keys
    if (
      e.code === "ArrowLeft" ||
      e.code === "ArrowRight" ||
      e.code === "ArrowDown" ||
      e.code === "ArrowUp" ||
      e.code === "Space"
    ) {
      e.preventDefault();
    }
    if (paused || gameOver) return;
    switch (e.code) {
      case "ArrowLeft":
        if (!collide(current.shape, current.x - 1, current.y)) current.x--;
        break;
      case "ArrowRight":
        if (!collide(current.shape, current.x + 1, current.y)) current.x++;
        break;
      case "ArrowDown":
        softDrop();
        break;
      case "ArrowUp":
      case "KeyX":
        tryRotate();
        break;
      case "Space":
        hardDrop();
        break;
    }
  }

  // --- Init ---

  function initState(): void {
    board = createBoard();
    score = 0;
    lines = 0;
    level = 1;
    paused = false;
    gameOver = false;
    gameOverFired = false;
    dropInterval = 1000;
    dropAccum = 0;
    next = randomPiece();
    spawn(); // sets current = next, next = new random
  }

  // --- Public API ---

  return {
    start() {
      initState();
      document.addEventListener("keydown", onKeyDown);
      lastTime = performance.now();
      animId = requestAnimationFrame(loop);
    },

    pause() {
      paused = true;
    },

    resume() {
      paused = false;
      lastTime = performance.now(); // reset so dt doesn't spike
    },

    restart() {
      cancelAnimationFrame(animId);
      initState();
      lastTime = performance.now();
      animId = requestAnimationFrame(loop);
    },

    destroy() {
      cancelAnimationFrame(animId);
      document.removeEventListener("keydown", onKeyDown);
    },
  };
}
