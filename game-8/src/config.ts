// =====================================================================
// config.ts — Aether Drift: a compact open-world sky game.
//
// Top-down 360° airship across a 4000×4000 world. Gather 10 elements from
// 10 resource planets, deliver them to the MOTHER planet at spawn to win.
// Heal/Storm planets (proximity, no trade) restore hull / Aether fuel.
// One Forge planet sells skill upgrades for gold earned killing enemies.
// =====================================================================

export const WORLD = { width: 4000, height: 4000 };

/** Culling: entities outside camera view + this margin are frozen. */
export const CULL_PAD = 220;

/** Hex colours for Phaser graphics. */
export const COLORS = {
  skyNight: 0x0a1228,
  skyDeep: 0x10204a,
  aether: 0x4fe0d8,
  aetherHot: 0x8af7ff,
  gold: 0xffcf5a,
  amber: 0xff9d3c,
  ember: 0xff5a47,
  leviathan: 0xb06bff,
  ruin: 0xc9b690,
  storm: 0x6ea8ff,
  forest: 0x76e08a,
  foundry: 0xffa052,
  dark: 0x2a1f44,
  hull: 0xcdd9f2,
  hullDark: 0x3a4a6e,
  white: 0xffffff,
  cloud: 0xbfd0f0,
  heal: 0x76e08a,
};

/** CSS strings for the DOM HUD. */
export const CSS = {
  aether: '#4fe0d8', aetherHot: '#8af7ff', gold: '#ffcf5a', amber: '#ff9d3c',
  ember: '#ff5a47', leviathan: '#b06bff', heal: '#76e08a', storm: '#6ea8ff', ink: '#dfe9ff',
} as const;

/** Player ship tuning (Arcade body). */
export const SHIP = {
  startX: 2000, startY: 2000,
  accel: 520,          // px/s² thrust
  maxSpeed: 360,       // px/s
  drag: 280,           // inertia damping
  turnLerp: 0.16,      // heading smoothing toward thrust dir
  radius: 20,
  maxHp: 100,
  maxFuel: 100,
  fuelBurn: 1.7,       // per second at full thrust
  fuelIdle: 0.05,
  cargoMax: 90,        // total elements carried at once
  fireRate: 240,       // ms between cannon shots
  bulletSpeed: 620,
  bulletDmg: 18,
  bulletLife: 900,     // ms
  emptyFuelMult: 0.5,  // top speed multiplier when out of fuel (limp home)
};

/** Boost (hold button while thrusting). */
export const BOOST = { mult: 1.6, fuelMult: 2 };

/** Run / survival + objective rules. */
export const RUN = {
  lives: 10,                // deaths allowed per run before game over
  collectPerSec: 2,         // elements gained per second while docked at a resource planet
  motherTiers: [100, 140, 180], // EACH element needed to complete tiers 1/2/3 (fill tier 3 = win)
  depositMs: 2000,          // mother transfer duration (progress bar)
  healBasePerSec: 6,        // hull/s near a heal planet, scaled by planet size
  stormRefuelBase: 7,       // fuel per lightning jolt, scaled by planet size
  stormStrikeMs: 550,       // base ms between lightning jolts (twice as fast as before)
  proximityMult: 2.0,       // heal/storm effect radius = planet.radius * this
};

/** The 10 elements (one per resource planet). */
export type ElementKind = 'wood' | 'glass' | 'water' | 'iron' | 'stone' | 'crystal' | 'ember' | 'ice' | 'bio' | 'plasma';
export const ELEMENTS: Record<ElementKind, { name: string; color: number; css: string }> = {
  wood:    { name: 'Aether Wood', color: 0x76e08a, css: '#76e08a' },
  glass:   { name: 'Sky Glass',   color: 0x8af7ff, css: '#8af7ff' },
  water:   { name: 'Cloud Water', color: 0x4fa8ff, css: '#4fa8ff' },
  iron:    { name: 'Sky Iron',    color: 0xb8c0d0, css: '#b8c0d0' },
  stone:   { name: 'Float Stone', color: 0xa08c6e, css: '#a08c6e' },
  crystal: { name: 'Aether Crystal', color: 0xc08aff, css: '#c08aff' },
  ember:   { name: 'Sun Ember',   color: 0xff7a3c, css: '#ff7a3c' },
  ice:     { name: 'Rime Ice',    color: 0xaef0ff, css: '#aef0ff' },
  bio:     { name: 'Bio Spore',   color: 0x9aff6e, css: '#9aff6e' },
  plasma:  { name: 'Void Plasma', color: 0xff5cf0, css: '#ff5cf0' },
};
export const ELEMENT_KINDS: ElementKind[] = ['wood', 'glass', 'water', 'iron', 'stone', 'crystal', 'ember', 'ice', 'bio', 'plasma'];

/** Planet roles. */
export type PlanetRole = 'mother' | 'resource' | 'heal' | 'storm' | 'forge';

/** Power-ups dropped by slain enemies. */
export type PowerKind = 'shield' | 'heal' | 'speed' | 'redbullet' | 'life';
export const POWERUPS: Record<PowerKind, { name: string; color: number; css: string; durMs: number; weight: number }> = {
  shield:    { name: 'Shield (-50% dmg)', color: 0x6ea8ff, css: '#6ea8ff', durMs: 40000, weight: 26 },
  heal:      { name: 'Green Heart (heal 5s)', color: 0x76e08a, css: '#76e08a', durMs: 5000, weight: 26 },
  speed:     { name: 'Ember (+20% speed 60s)', color: 0xff7a3c, css: '#ff7a3c', durMs: 60000, weight: 24 },
  redbullet: { name: 'Red Rounds (×2 dmg 40s)', color: 0xff2b4e, css: '#ff2b4e', durMs: 40000, weight: 18 },
  life:      { name: 'Heart (+1 life)', color: 0xff5cc8, css: '#ff5cc8', durMs: 0, weight: 6 },
};
export const POWER_KINDS: PowerKind[] = ['shield', 'heal', 'speed', 'redbullet', 'life'];
export const DROP_CHANCE = 0.32;          // chance a slain enemy drops a power-up
export const POWER = { healPerSec: 8, speedMult: 1.2, redDmgMult: 2, shieldDmgMult: 0.5 };

/** Enemy tuning. New types unlock as the Mother evolves (worm → pirate → leviathan).
 *  `biteMs` throttles melee contact damage so rams can't drain HP every frame. */
export const ENEMY = {
  worm: { hp: 55, speed: 100, radius: 24, ramDmg: 10, biteMs: 900, fireRate: 0, bulletSpeed: 0, bulletDmg: 0, score: 18, aggroRange: 820 },
  pirate: { hp: 40, speed: 190, radius: 18, fireRate: 1300, bulletSpeed: 360, bulletDmg: 9, ramDmg: 0, biteMs: 0, score: 14, aggroRange: 760 },
  leviathan: { hp: 130, speed: 95, radius: 46, ramDmg: 16, biteMs: 900, fireRate: 0, bulletSpeed: 0, bulletDmg: 0, score: 40, aggroRange: 900 },
  maxAlive: 5,
  spawnEvery: 9000,
};

/** Random world events (every EVENTS.interval). */
export const EVENTS = { interval: 120000, jamMs: 30000, windMs: 22000 };

/** Day/night full cycle in ms (GSAP-driven tint). */
export const DAYNIGHT = { cycleMs: 180000 };

/** Permanent skill upgrades bought at the Forge planet with gold. */
export const UPGRADES = {
  engine: { name: 'Aether Drive', max: 4, cost: (l: number) => (200 + l * 260) * 5, desc: '+ thrust & top speed' },
  hull:   { name: 'Hull Plating', max: 4, cost: (l: number) => (220 + l * 280) * 5, desc: '+ max integrity' },
  cargo:  { name: 'Cargo Bay', max: 4, cost: (l: number) => (180 + l * 240) * 5, desc: '+ cargo capacity' },
  weapon: { name: 'Arc Cannon', max: 4, cost: (l: number) => (240 + l * 300) * 5, desc: '+ cannon damage' },
} as const;
export type UpgradeKey = keyof typeof UPGRADES;
