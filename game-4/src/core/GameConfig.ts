// =====================================================================
// GameConfig.ts — Central tuning, palette and balance constants.
// Everything that a designer might want to tweak lives here so the
// entity/scene code reads like prose and stays free of magic numbers.
// =====================================================================

/** Neon vector palette (numeric Phaser colors + css strings for the DOM). */
export const COLORS = {
  seaDeep: 0x041122,
  seaMid: 0x062a44,
  seaShallow: 0x0a3a5c,
  foam: 0x7ff0ff,

  cyan: 0x22d3ee,
  teal: 0x2dd4bf,
  gold: 0xfbbf24,
  crimson: 0xfb1d5a,
  purple: 0xa855f7,
  green: 0x4ade80,
  white: 0xffffff,
  ember: 0xff7a18,

  player: 0x2dd4bf,
  enemy: 0xfb1d5a,
  guardian: 0xa855f7,

  sand: 0xe6c08a,
  rock: 0x3b4a66,
  skull: 0xf1f5f9,
};

export const CSS = {
  cyan: '#22d3ee',
  teal: '#2dd4bf',
  gold: '#fbbf24',
  crimson: '#fb1d5a',
  purple: '#a855f7',
  green: '#4ade80',
} as const;

/** Player ship base tuning (weaker than before — upgrade via menu shop). */
export const PLAYER = {
  maxHp: 80,
  accel: 340,
  maxSpeed: 165,        // reduced further — upgrade in menu shop
  drag: 280,
  turnLerp: 0.1,
  bodyRadius: 22,
  fireCooldown: 1400,   // ms — slower initial fire rate; upgradeable
  cannonRange: 340,
  cannonDamage: 8,      // reduced from 12 — upgradeable in-game
  cargoSlots: 6,
};

/** Cannonball tuning. */
export const BALL = {
  speed: 440,
  radius: 6,
  lifespan: 1500,
};

/** Loot island chest behaviour. */
export const ISLAND = {
  dockRadius: 260,
  chestSlots: 4,
  spawnIntervalMs: 15000,
  shopDockRadius: 280,
};

/** Skull-island guardian AI. */
export const SKULL = {
  triggerRadius: 800,
  leashRadius: 650,
  islandHp: 360,
};

export const WORLD = {
  borderPad: 0,
};

/** Per-rarity colour + base sell value. */
export const RARITY = {
  common:    { color: 0x9fb4c7, css: '#9fb4c7', value: 12 },
  rare:      { color: 0x38bdf8, css: '#38bdf8', value: 34 },
  epic:      { color: 0xa855f7, css: '#a855f7', value: 78 },
  legendary: { color: 0xfbbf24, css: '#fbbf24', value: 160 },
} as const;

export type Rarity = keyof typeof RARITY;

/**
 * Permanent upgrade shop costs in ☀️ SUNS.
 *
 * Suns respawn immediately on collect, so players can farm them continuously.
 * The curve is intentionally steep (~×2.5 per tier) so early upgrades feel
 * rewarding and later tiers require real dedication.
 *
 *   Tier:          1    2    3     4     5   │ total
 *   Speed:         6   15   38    95   235   │  389 ☀️
 *   Fire rate:     8   20   50   120   295   │  493 ☀️
 *   HP:            5   13   32    80   195   │  325 ☀️
 *                                             │ 1207 ☀️ to max all
 *
 * At ~10 suns per active farming session that's ~120 sessions to max out.
 */
export const UPGRADE_SHOP = {
  speed: {
    maxLevel: 5,
    cost: (lvl: number) => [6, 15, 38, 95, 235][lvl] ?? 235,
    /** Bonus per level: +12% max speed */
    bonusPct: 0.12,
  },
  fireRate: {
    maxLevel: 5,
    cost: (lvl: number) => [8, 20, 50, 120, 295][lvl] ?? 295,
    /** Bonus per level: -12% fire cooldown (faster) */
    bonusPct: 0.12,
  },
  hp: {
    maxLevel: 5,
    cost: (lvl: number) => [5, 13, 32, 80, 195][lvl] ?? 195,
    /** Bonus per level: +25 max HP */
    bonusFlat: 25,
  },
} as const;

/** In-game support items buyable at the Harbour (per-raid, no carry-over). */
export const SUPPORT_ITEMS = [
  { id: 'explosive_shells', glyph: '🧨', cost: 50,  effect: 'dmg_boost',   duration: 90000, mult: 1.6 },
  { id: 'tailwind',         glyph: '💨', cost: 40,  effect: 'speed_boost', duration: 90000, mult: 1.45 },
  { id: 'hull_armor',       glyph: '🛡️', cost: 55,  effect: 'armor',       duration: 90000, mult: 0.65 },
  { id: 'quick_repair',     glyph: '🔧', cost: 30,  effect: 'heal_35',     duration: 0,     mult: 1 },
  { id: 'rapid_fire',       glyph: '⚡', cost: 60,  effect: 'fire_rate',   duration: 60000, mult: 0.5 },
] as const;

export type SupportEffectId = typeof SUPPORT_ITEMS[number]['id'];
