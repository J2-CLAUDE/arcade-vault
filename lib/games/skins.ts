// Single source of truth for game skins across Arcade Vault.
//
// A skin is a *palette* of tokens (plus effect flags), not a single color.
// It is consumed in two ways:
//   - Canvas engines (Tetris, Asteroids) read the SkinPalette directly.
//   - Mock games (CSS arena) get the palette projected to CSS variables via
//     `skinCssVars()` and toggled with modifier classes in globals.css.
//
// The app is dark-mode only (base --bg #0a0a0f). Every skin must stay legible
// on that background and on the canvas backgrounds (#000 / #0a0030).

export type SkinId = "clasico" | "neon" | "retro";

/**
 * Frogger-specific palette. The generic SkinPalette tokens (ship/pieces/flame)
 * don't map cleanly onto Frogger's entities, so each skin carries a dedicated
 * `frogger` block read by `components/games/frogger-game.tsx`. Every color must
 * stay legible on the dark zone backgrounds (river / road / safe).
 */
export interface FroggerPalette {
  /** The player frog body. */
  frog: string;
  /** Frog legs shown mid-jump. */
  frogLeg: string;
  /** Frog eye sclera. */
  frogEye: string;
  /** Three car body colors, cycled per road lane. */
  cars: [string, string, string];
  /** Truck body / cab / wheel. */
  truckBody: string;
  truckCab: string;
  wheel: string;
  /** Log body + grain stroke. */
  log: string;
  logGrain: string;
  /** Turtle shell (visible) / submerged tint / shell detail stroke. */
  turtle: string;
  turtleSubmerged: string;
  turtleDetail: string;
  /** Zone background fills. */
  river: string;
  road: string;
  safe: string;
  goalRow: string;
  /** Lane divider dashes. */
  laneDash: string;
  /** Goal slot: empty fill / filled fill / empty stroke / filled stroke. */
  goalEmpty: string;
  goalFilled: string;
  goalStrokeEmpty: string;
  goalStrokeFilled: string;
  /** HUD text + level accent. */
  hudText: string;
  hudLevel: string;
}

export interface SkinPalette {
  id: SkinId;
  /** Human label for the selector UI. */
  label: string;
  /** Dominant color — ship, current piece accent, primary HUD value. */
  primary: string;
  /** Secondary color — bullets/lines accent, second HUD value. */
  secondary: string;
  /** Highlight color — power-ups, level value, callouts. */
  accent: string;
  /** Canvas clear / arena base color. */
  bg: string;
  /** Foreground line/stroke + default text (ship/asteroid outline, HUD body). */
  text: string;
  /** Grid line color (Tetris board grid, arena floor). */
  grid: string;
  /** Thruster / flame color. */
  flame: string;
  /**
   * Ordered piece palette for Tetris (index 1..8 → I,O,T,S,Z,J,L,N).
   * Index 0 is unused (kept null to mirror the engine's 1-based scheme).
   */
  pieces: (string | null)[];
  /** Frogger-specific palette block. */
  frogger: FroggerPalette;
  /** Effect flags. */
  glow: boolean;
  scanlines: boolean;
}

export const SKINS: Record<SkinId, SkinPalette> = {
  // CLASICO — the current look. This is the baseline; colors must reproduce
  // exactly what ships today (Tetris 8-piece palette, Asteroids white/cyan,
  // arena cyan/magenta).
  clasico: {
    id: "clasico",
    label: "Clásico",
    primary: "#ffffff",
    secondary: "#00ffff",
    accent: "#f5ff00",
    bg: "#000000",
    text: "#ffffff",
    grid: "rgba(255,255,255,0.06)",
    flame: "rgba(255,130,0,0.85)",
    pieces: [
      null,
      "#4dd0e1", // I - cyan
      "#ffd54f", // O - yellow
      "#ba68c8", // T - purple
      "#81c784", // S - green
      "#e57373", // Z - red
      "#90caf9", // J - pale blue
      "#ffb74d", // L - orange
      "#9e9e9e", // N - tuerca (gris metálico)
    ],
    // Reproduces the current hardcoded Frogger look exactly.
    frogger: {
      frog: "#aaff00",
      frogLeg: "#66cc22",
      frogEye: "#ffffff",
      cars: ["#cc2244", "#e67e22", "#2255cc"],
      truckBody: "#555555",
      truckCab: "#888888",
      wheel: "#222222",
      log: "#7a4a1a",
      logGrain: "#a06428",
      turtle: "#2a7a1a",
      turtleSubmerged: "#1a4a1a",
      turtleDetail: "#1a5a10",
      river: "#001230",
      road: "#111111",
      safe: "#0a1a08",
      goalRow: "#1a2e10",
      laneDash: "rgba(255,255,100,0.15)",
      goalEmpty: "#0d2008",
      goalFilled: "#1a4a10",
      goalStrokeEmpty: "rgba(255,207,58,0.35)",
      goalStrokeFilled: "#ffcf3a",
      hudText: "#ffffff",
      hudLevel: "#f5ff00",
    },
    glow: false,
    scanlines: true,
  },

  // NEON — synthwave, high glow, saturated palette from the neon theme tokens
  // (--cyan #00f5ff, --magenta #ff006e, --yellow #f5ff00, --green #00ff88).
  neon: {
    id: "neon",
    label: "Neón",
    primary: "#00f5ff",
    secondary: "#ff006e",
    accent: "#f5ff00",
    bg: "#05000f",
    text: "#e6e9ff",
    grid: "rgba(0,245,255,0.18)",
    flame: "rgba(255,0,110,0.9)",
    pieces: [
      null,
      "#00f5ff", // I - cyan
      "#f5ff00", // O - yellow
      "#ff006e", // T - magenta
      "#00ff88", // S - green
      "#ff3d81", // Z - hot pink
      "#5b8bff", // J - electric blue
      "#ff9e1b", // L - amber-neon
      "#c77dff", // N - violet
    ],
    // Synthwave: bright lime frog with glow, neon vehicles, cyan turtles.
    frogger: {
      frog: "#aaff00",
      frogLeg: "#00ff88",
      frogEye: "#e6e9ff",
      cars: ["#ff006e", "#f5ff00", "#00f5ff"],
      truckBody: "#c77dff",
      truckCab: "#ff9e1b",
      wheel: "#1a0030",
      log: "#ff9e1b",
      logGrain: "#ffd27a",
      turtle: "#00f5ff",
      turtleSubmerged: "#0a4a55",
      turtleDetail: "#00c2cc",
      river: "#000830",
      road: "#0a0014",
      safe: "#04140a",
      goalRow: "#0a1e10",
      laneDash: "rgba(245,255,0,0.25)",
      goalEmpty: "#0a1e08",
      goalFilled: "#0e3a10",
      goalStrokeEmpty: "rgba(0,245,255,0.4)",
      goalStrokeFilled: "#f5ff00",
      hudText: "#e6e9ff",
      hudLevel: "#f5ff00",
    },
    glow: true,
    scanlines: true,
  },

  // RETRO — dim phosphor CRT, muted low-glow palette (amber / green mono with
  // warm earthy support tones). Evokes an old monitor while staying legible
  // on the dark background.
  retro: {
    id: "retro",
    label: "Retro",
    primary: "#ffb347", // amber phosphor
    secondary: "#8fd96b", // green phosphor
    accent: "#e8c14f", // dim gold
    bg: "#0b0a06",
    text: "#e2c98a", // warm amber text
    grid: "rgba(255,179,71,0.10)",
    flame: "rgba(255,140,40,0.7)",
    pieces: [
      null,
      "#cdbb6a", // I - olive
      "#d9a441", // O - amber
      "#b08968", // T - taupe
      "#7fa05a", // S - moss
      "#bd6b4f", // Z - terracotta
      "#9aa66a", // J - khaki
      "#c98a3f", // L - burnt orange
      "#8a8164", // N - drab
    ],
    // Dim CGA-ish phosphor: muted green frog, orange/brown cars, beige logs.
    frogger: {
      frog: "#8fd96b",
      frogLeg: "#5f9e45",
      frogEye: "#e2c98a",
      cars: ["#c98a3f", "#bd6b4f", "#d9a441"],
      truckBody: "#8a8164",
      truckCab: "#b08968",
      wheel: "#2a2418",
      log: "#b08968",
      logGrain: "#8a6a48",
      turtle: "#7fa05a",
      turtleSubmerged: "#3d4a30",
      turtleDetail: "#5f7a42",
      river: "#1a2a4a",
      road: "#161310",
      safe: "#13190e",
      goalRow: "#1c2412",
      laneDash: "rgba(226,201,138,0.14)",
      goalEmpty: "#171f0d",
      goalFilled: "#2a3a18",
      goalStrokeEmpty: "rgba(232,193,79,0.3)",
      goalStrokeFilled: "#e8c14f",
      hudText: "#e2c98a",
      hudLevel: "#e8c14f",
    },
    glow: false,
    scanlines: true,
  },
};

export const DEFAULT_SKIN: SkinId = "clasico";

export const SKIN_LIST: SkinPalette[] = [
  SKINS.clasico,
  SKINS.neon,
  SKINS.retro,
];

/**
 * Project a palette to CSS custom properties for the mock CSS arena.
 * Consumed by game-player via an inline style on the arena wrapper.
 */
export function skinCssVars(skin: SkinPalette): Record<string, string> {
  return {
    "--skin-primary": skin.primary,
    "--skin-secondary": skin.secondary,
    "--skin-accent": skin.accent,
    "--skin-bg": skin.bg,
    "--skin-text": skin.text,
    "--skin-grid": skin.grid,
    "--skin-glow": skin.glow ? "1" : "0",
  };
}
