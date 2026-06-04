// =====================================================================
// config.ts — Central tuning, palette and balance for Cosmic Miner.
// All magic numbers live here so scene/entity code reads like prose.
// =====================================================================

/** Neon cyber-space palette (numeric Phaser colours). */
export const COLORS = {
  voidBlack:  0x05060f,
  voidDeep:   0x0a0e1f,
  nebula:     0x1a1040,

  cyan:       0x00f0ff,
  pink:       0xff2db4,
  purple:     0x9d4dff,
  lime:       0xaaff00,
  gold:       0xffc83d,
  plasmaBlue: 0x3d9bff,
  ice:        0x7fd4ff,
  magma:      0xff5a2d,
  hull:       0x3dffa0,
  white:      0xffffff,

  // Asteroid body tints
  rockGrey:   0x6b7280,
  rockDark:   0x3a3f4d,
  iceBlue:    0x2a6f9e,
  magmaCore:  0xff3a0f,
};

/** CSS twins for the DOM overlay. */
export const CSS = {
  cyan: '#00f0ff',
  pink: '#ff2db4',
  purple: '#9d4dff',
  gold: '#ffc83d',
  lime: '#aaff00',
  hull: '#3dffa0',
  magma: '#ff5a2d',
  ice: '#7fd4ff',
} as const;

/** Player ship + gun. */
export const SHIP = {
  /** Vertical anchor: fraction of screen height from the TOP (0.8 = 20% from bottom). */
  anchorYFrac: 0.8,
  maxHull: 100,
  maxEnergy: 100,
  energyRegenPerSec: 8,    // passive energy recharge
  hitFlashMs: 120,
};

/** Sweeping gun / claw mechanism. */
export const GUN = {
  sweepDegrees: 160,        // total arc swept (centred straight up)
  sweepSpeedDeg: 64,        // degrees per second (slower, easier to aim)
  // Laser
  laserSpeed: 1400,         // px/s
  laserBaseDamage: 34,
  laserCost: 0,             // shooting is free; claw costs energy
  laserCooldownMs: 180,
  // Claw
  clawBaseExtendSpeed: 1300,  // px/s outward
  clawBaseRetractSpeed: 620,  // px/s inward at weight 1
  clawMaxLength: 900,         // px before auto-retract
  clawEnergyPerSec: 14,       // energy drained while a heavy item is hauled
  clawHeadRadius: 26,         // grab hit radius
};

/** Upgrade definitions (bought with Credits in the Shop). */
export const UPGRADES = {
  laser: {
    maxLevel: 5,
    cost: (lvl: number) => [120, 260, 520, 980, 1800][lvl] ?? 1800,
    /** +18% laser damage per level */
    bonusPct: 0.18,
  },
  claw: {
    maxLevel: 5,
    cost: (lvl: number) => [100, 230, 470, 900, 1650][lvl] ?? 1650,
    /** +15% extend & retract speed per level */
    bonusPct: 0.15,
  },
  fuel: {
    maxLevel: 5,
    cost: (lvl: number) => [90, 200, 420, 820, 1500][lvl] ?? 1500,
    /** -14% claw energy drain per level */
    bonusPct: 0.14,
  },
  radar: {
    maxLevel: 3,
    cost: (lvl: number) => [200, 500, 1100][lvl] ?? 1100,
    /** level 1 = reveal item silhouette; 2 = reveal rarity colour; 3 = reveal value */
  },
} as const;

export type UpgradeKey = keyof typeof UPGRADES;

/**
 * Active consumables — bought with Credits in the Shop, stockpiled, then
 * triggered mid-run from the HUD. Each gives a timed power boost.
 */
export const CONSUMABLES = {
  magnet:     { name: 'Tractor Magnet',   desc: 'Pull all loot to your ship', cost: 140, durationMs: 10000, color: '#9d4dff' },
  overcharge: { name: 'Laser Overcharge', desc: 'Double laser power',          cost: 170, durationMs: 8000,  color: '#ff2db4', mult: 2.3 },
  multishot:  { name: 'Spread Targeting', desc: 'Fire a 3-way laser spread',   cost: 150, durationMs: 12000, color: '#00f0ff' },
} as const;

export type ConsumableKey = keyof typeof CONSUMABLES;

/** Asteroid archetypes. */
export const ASTEROIDS = {
  rock:  { hp: 60,  radius: 46, fragments: 7,  tint: COLORS.rockGrey, glow: COLORS.rockGrey, weightBias: 0 },
  ice:   { hp: 90,  radius: 50, fragments: 9,  tint: COLORS.iceBlue,  glow: COLORS.ice,      weightBias: -0.2 },
  magma: { hp: 130, radius: 54, fragments: 11, tint: COLORS.magmaCore,glow: COLORS.magma,    weightBias: 0.3 },
} as const;

export type AsteroidKind = keyof typeof ASTEROIDS;

/** Harvestable item / hazard types revealed inside asteroids. */
export interface ItemDef {
  name: string;
  glyph: string;
  color: number;
  value: number;
  weight: number;
  rarity: string;
  /** Hazard kind — present only on harmful drops (no credit value). */
  hazard?: 'bomb' | 'frost';
}

export const ITEMS: Record<string, ItemDef> = {
  // Loot (positive)
  quartz: { name: 'Space Quartz', glyph: '◆', color: COLORS.ice,    value: 15,  weight: 0.7, rarity: 'common' },
  gold:   { name: 'Cosmic Gold',  glyph: '▰', color: COLORS.gold,   value: 45,  weight: 1.4, rarity: 'rare' },
  core:   { name: 'Energy Core',  glyph: '⬢', color: COLORS.cyan,   value: 90,  weight: 1.0, rarity: 'epic' },
  relic:  { name: 'Ancient Relic',glyph: '⛧', color: COLORS.purple, value: 180, weight: 2.0, rarity: 'legendary' },
  // Hazards (harmful — don't haul these!)
  bomb:   { name: 'Volatile Core',glyph: '✸', color: COLORS.magma,  value: 0,   weight: 1.0, rarity: 'common', hazard: 'bomb' },
  frost:  { name: 'Cryo Shard',   glyph: '❄', color: COLORS.ice,    value: 0,   weight: 0.8, rarity: 'common', hazard: 'frost' },
};

export type ItemKind = 'quartz' | 'gold' | 'core' | 'relic' | 'bomb' | 'frost';

/** Hazard tuning. */
export const HAZARDS = {
  bombDamage: 22,
  frostMs: 3000,
  /** Base chance an asteroid contains a hazard (scales up with level). */
  baseChance: 0.12,
  chancePerLevel: 0.015,
  maxChance: 0.32,
};

/** Per-level configuration. */
export const LEVELS = {
  durationSec: 90,          // base length of a mining run (more time)
  durationGrowSec: 10,      // +seconds per level
  spawnIntervalMs: 1700,    // base asteroid spawn cadence
  spawnSpeedupPerLevel: 0.93,// multiply interval each level (faster)
  scrollSpeed: 44,          // px/s starfield + asteroid drift (slower still)
  scrollGrowPerLevel: 7,    // +px/s per level
  maxLevel: 12,
};

/** Rarity → CSS colour for DOM item chips. */
export const RARITY_CSS: Record<string, string> = {
  common: '#7fd4ff',
  rare: '#ffc83d',
  epic: '#00f0ff',
  legendary: '#9d4dff',
};
