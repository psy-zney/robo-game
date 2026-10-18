/**
 * Central gameplay tuning.
 *
 * The world units are treated as meters so model scale, collision, spawn radius,
 * and cleaning range stay predictable across the house model and prop models.
 */

// Grid and fallback floor configuration.
export const GRID_SIZE = 100;
export const CELL_SIZE = 0.5;
export const FLOOR_SIZE = GRID_SIZE * CELL_SIZE;

// Robot configuration.
export const MAX_BATTERY = 100;
export const ROBOT_RADIUS = 0.16;
export const ROBOT_HEIGHT = 0.14;
export const ROBOT_MODEL_TARGET_SIZE = 0.26;
// Meters per second; movement is independent of display refresh rate.
export const MOVE_SPEED = 1.56;
export const SWEEP_SPEED = 1.08;
export const MOP_SPEED = 0.84;

// Item and storage configuration.
export const ITEM_COUNT = 18;
export const STORAGE_CAPACITY = 12;

// Cleaning configuration.
export const MEDIUM_SCAN_SECONDS = 1.4;
export const MUD_CLEAN_SECONDS = 1.5;
export const BATTERY_DRAIN_FACTOR = 0.05;

// Environment configuration.
export const HOME_SCALE = 1.65;
export const WORLD_MARGIN = 0.55;
export const SPAWN_CLEAR_RADIUS = 1.05;
export const HUSKY_MODEL_TARGET_SIZE = 0.52;
export const RAT_MODEL_TARGET_SIZE = 0.12;

// Battery drain rates per second.
export const BATTERY_DRAIN_MOVE = 1.0;
export const BATTERY_DRAIN_SWEEP = 1.5;
export const BATTERY_DRAIN_MOP = 2.0;

// Charge station configuration.
export const CHARGE_RATE = 100 / 30;
export const CHARGE_RADIUS = 0.55;

// Dirt system configuration.
export const DIRT_PLANE_SIZE = 0.34;
export const DIRT_INTERACT_DIST = 0.56;

// Husky AI configuration.
export const HUSKY_BARK_CHANCE = 0.90;
export const HUSKY_BITE_CHANCE = 0.10;
export const HUSKY_RANDOM_BITE_BASE = 0.01;

// Scoring configuration.
export const COMBO_TIMEOUT = 4.0;
export const COMBO_MAX = 8;
export const STAR_THRESHOLDS = { battery: [30, 60, 80], time: [300, 200, 120] } as const;

export interface LevelModifiers {
  /** Multiplier applied to battery drain rates. */
  drainMultiplier: number;
  /** Multiplier applied to robot movement speed. */
  speedMultiplier: number;
  /** Ambient light intensity override (lower = darker room). */
  ambientLight: number;
  /** Charge rate multiplier at docking station. */
  chargeMultiplier: number;
  /** Storage capacity override. */
  storageCapacity: number;
  /** Extra required mop/sweep actions per stain. */
  extraActions: number;
  /** Par time in seconds for 3-star rating. */
  parTime: number;
}

export interface LevelTuning {
  dirtSpots: number;
  dustParticles: number;
  obstacles: number;
  modifiers: LevelModifiers;
}

/** Non-linear difficulty curve with per-level modifier overrides. */
export function getLevelTuning(day: number): LevelTuning {
  const safeDay = Math.max(1, Math.floor(day));

  // Dirt spots: slow ramp early, steeper mid-game, plateau late.
  const dirtSpots = safeDay <= 3
    ? 4 + safeDay * 2
    : safeDay <= 10
      ? Math.min(5 + Math.floor(safeDay * 1.8), 26)
      : Math.min(26 + Math.floor((safeDay - 10) * 0.6), 36);

  // Dust: follows a similar curve with wider variance.
  const dustParticles = safeDay <= 3
    ? 14 + safeDay * 4
    : safeDay <= 10
      ? Math.min(18 + safeDay * 5, 72)
      : Math.min(72 + Math.floor((safeDay - 10) * 2), 96);

  // Obstacles increase more slowly so early rooms feel open.
  const obstacles = safeDay <= 2
    ? 3 + safeDay
    : safeDay <= 10
      ? Math.min(4 + Math.floor(safeDay * 0.85), 14)
      : Math.min(14 + Math.floor((safeDay - 10) * 0.3), 18);

  const modifiers = getLevelModifiers(safeDay);

  return { dirtSpots, dustParticles, obstacles, modifiers };
}

function getLevelModifiers(day: number): LevelModifiers {
  // Base values scale gently with day.
  const base: LevelModifiers = {
    drainMultiplier: 1.0,
    speedMultiplier: 1.0,
    ambientLight: 0.78,
    chargeMultiplier: 1.0,
    storageCapacity: STORAGE_CAPACITY,
    extraActions: 0,
    parTime: 180,
  };

  // Per-day overrides for variety.
  const overrides: Partial<Record<number, Partial<LevelModifiers>>> = {
    1:  { drainMultiplier: 0.7, speedMultiplier: 1.08, parTime: 240 },  // Tutorial ease
    2:  { parTime: 210 },
    3:  { parTime: 200 },
    4:  { drainMultiplier: 1.1, parTime: 190 },
    5:  { extraActions: 1, parTime: 200 },
    6:  { ambientLight: 0.42, parTime: 210 },   // Dim room – Bắp bồn chồn
    7:  { speedMultiplier: 1.1, parTime: 180 },
    8:  { drainMultiplier: 1.15, ambientLight: 0.55, parTime: 200 },
    9:  { drainMultiplier: 1.2, chargeMultiplier: 0.8, parTime: 220 },  // Mưa – sạc chậm
    10: { extraActions: 1, drainMultiplier: 1.25, parTime: 240 },  // Finale chapter 1
    // Extended days (11-20) introduce steeper difficulty.
    11: { drainMultiplier: 1.15, storageCapacity: 10, parTime: 180 },
    12: { ambientLight: 0.35, speedMultiplier: 0.92, parTime: 200 },  // Night shift
    13: { drainMultiplier: 1.3, parTime: 190 },
    14: { speedMultiplier: 1.15, chargeMultiplier: 1.3, parTime: 160 },  // Speed run
    15: { extraActions: 1, drainMultiplier: 1.35, parTime: 220 },
    16: { ambientLight: 0.28, storageCapacity: 8, parTime: 210 },  // Very dim + small tank
    17: { drainMultiplier: 1.4, chargeMultiplier: 0.7, parTime: 230 },
    18: { speedMultiplier: 0.85, extraActions: 1, parTime: 200 },  // Heavy debris
    19: { drainMultiplier: 1.5, ambientLight: 0.38, parTime: 240 },
    20: { extraActions: 2, drainMultiplier: 1.5, chargeMultiplier: 0.6, storageCapacity: 8, parTime: 300 },  // Ultimate challenge
  };

  const dayOverride = overrides[day];
  if (dayOverride) return { ...base, ...dayOverride };

  // Beyond day 20: gradual scaling.
  return {
    ...base,
    drainMultiplier: Math.min(2.0, 1.0 + (day - 1) * 0.04),
    chargeMultiplier: Math.max(0.5, 1.0 - (day - 10) * 0.02),
    storageCapacity: Math.max(6, STORAGE_CAPACITY - Math.floor((day - 15) / 5)),
    extraActions: day >= 25 ? 2 : day >= 15 ? 1 : 0,
    parTime: Math.min(360, 180 + Math.floor((day - 10) * 6)),
  };
}
