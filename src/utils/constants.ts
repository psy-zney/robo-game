export const GRID_SIZE = 100;
export const CELL_SIZE = 0.5;
export const FLOOR_SIZE = GRID_SIZE * CELL_SIZE;
export const MAX_BATTERY = 100;
export const ITEM_COUNT = 18;
export const STORAGE_CAPACITY = 12;
export const MEDIUM_SCAN_SECONDS = 1.4;
export const MUD_CLEAN_SECONDS = 1.5;
export const BATTERY_DRAIN_FACTOR = 0.05;
export const ROBOT_RADIUS = 0.6;
export const ROBOT_HEIGHT = 0.24;
export const MOVE_SPEED = 0.015;
export const SWEEP_SPEED = 0.001;
export const MOP_SPEED = 0.0005;
export const HOME_SCALE = 1.9;
export const WORLD_MARGIN = 0.5;

// Battery drain rates (per second)
export const BATTERY_DRAIN_MOVE = 1.0;   // Normal movement
export const BATTERY_DRAIN_SWEEP = 1.5;  // Sweeping action
export const BATTERY_DRAIN_MOP = 2.0;    // Mopping action

// Charge station
export const CHARGE_RATE = 100 / 30;     // Full charge in 30 seconds (~3.33/s)
export const CHARGE_RADIUS = 0.425;      // Interaction radius

// Dirt system
export const DIRT_PLANE_SIZE = 0.4;       // Visual size on floor
export const DIRT_INTERACT_DIST = 0.5;    // Interaction distance

// Husky attack events
export const HUSKY_BARK_CHANCE = 0.90;    // 90% bark only on collision
export const HUSKY_BITE_CHANCE = 0.10;    // 10% bite on collision
export const HUSKY_RANDOM_BITE_BASE = 0.01; // 1% random bite (increases 1% per day)
