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
export const MOVE_SPEED = 0.026;
export const SWEEP_SPEED = 0.018;
export const MOP_SPEED = 0.014;

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

export interface LevelTuning {
  dirtSpots: number;
  dustParticles: number;
  obstacles: number;
}

export function getLevelTuning(day: number): LevelTuning {
  const safeDay = Math.max(1, Math.floor(day));

  return {
    dirtSpots: Math.min(5 + Math.floor(safeDay * 1.45), 30),
    dustParticles: Math.min(18 + safeDay * 5, 78),
    obstacles: Math.min(4 + Math.floor(safeDay * 0.75), 14),
  };
}
