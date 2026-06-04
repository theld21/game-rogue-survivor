// =====================================================================
// config.ts — Cyber Slash: Code Zero.
//
// FIXED LOGICAL RESOLUTION 450×800, Scale.FIT. Everything (platforms,
// walls, dead-zone) is authored in this space for determinism. The game is
// FULLY KINEMATIC — no Arcade bodies. Slow-motion is a single time scale:
// every entity integrates `dt = delta/1000 * gameScale`.
// =====================================================================

export const WORLD = {
  width: 450,
  height: 800,
  gravity: 1500,        // px/s² free-fall when out of stamina
};

export const COLORS = {
  voidBlack: 0x04060a,
  gridInk:   0x0a0f1a,
  panelInk:  0x0e1626,

  red:    0xff2b4e,
  cyan:   0x1cf2ff,
  lime:   0x62ff8a,
  amber:  0xffb020,
  violet: 0xa05cff,
  dataBlue: 0x3da8ff,
  glitch: 0xff5cf0,     // phaser (blinking-shield) accent
  white:  0xffffff,

  platform: 0x16324a,
  platformEdge: 0x1cf2ff,
  laser:  0xff2b4e,
  shield: 0x3da8ff,
};

export const CSS = {
  red: '#ff2b4e', cyan: '#1cf2ff', lime: '#62ff8a', amber: '#ffb020',
  violet: '#a05cff', dataBlue: '#3da8ff', glitch: '#ff5cf0',
} as const;

/** Time-scale tuning (the heart of the feel). */
export const TIME = {
  slow: 0.1,        // while holding (aiming)
  dash: 1.5,        // during the chain-dash resolution
  normal: 1.0,
  hitStopMs: 40,    // REAL-time freeze per kill
  dashNodeMs: 90,   // scaled time to travel between chain nodes
};

/** Ninja tuning. */
export const NINJA = {
  startX: 225,
  startY: 660,
  radius: 16,
  maxHp: 100,
  maxStamina: 3,        // base; upgradeable to 5
  stunMs: 1000,         // shield front-hit stun
  bounceDist: 90,       // how far a front-hit bounce throws the ninja back
  fallReturnHp: 0,      // dead-zone = instant fail
};

/** Path / chain-lock detection. */
export const PATH = {
  hitRadius: 30,        // segment-to-enemy lock distance
  minPointDist: 6,      // min px between recorded path points
  baseChainLimit: 3,
};

/** Enemy archetypes. */
export const ENEMIES = {
  grunt:    { name: 'Drone',   radius: 16, hp: 1, color: COLORS.red,    score: 100 },
  shielded: { name: 'Bulwark', radius: 18, hp: 1, color: COLORS.dataBlue, score: 200 },
  ranged:   { name: 'Sniper',  radius: 16, hp: 1, color: COLORS.amber,  score: 250, fireMs: 2600, bulletSpeed: 230 },
  // Sentry: a front-arc shield that ORBITS the body — read the rotation, strike the gap.
  orbiter:  { name: 'Sentry',  radius: 18, hp: 1, color: COLORS.violet, score: 300 },
  // Phantom: a FULL-RING shield that BLINKS on/off — strike in the dark window.
  phaser:   { name: 'Phantom', radius: 17, hp: 1, color: COLORS.glitch, score: 320 },
} as const;
export type EnemyKind = keyof typeof ENEMIES;

/** Shield front-arc half-angle (shielded + orbiter). */
export const SHIELD_ARC_HALF_DEG = 72;
/** Orbiter shield rotation speed (rad / real-second; slow-mo scales it). */
export const ORBIT_SPEED = 1.9;
/** Phaser blink timing (ms of REAL time; slow-mo scales the read). */
export const PHASE = { onMs: 950, offMs: 720 };

/** Border ricochet ("wall-bounce"): drag to a side border to stick + reflect. */
export const BOUNCE = {
  margin: 42,       // finger within this many px of x=0 / x=W sticks to the border
  rayLen: 900,      // how far the reflected ray is scanned for targets
};

/** Permanent upgrades (bought with Data Cubes). */
export const UPGRADES = {
  chain:  { maxLevel: 2, cost: (l: number) => [400, 900][l] ?? 900 },   // +1 chain each (3→5)
  parry:  { maxLevel: 1, cost: () => 600 },                              // -50% front-hit dmg
  emp:    { maxLevel: 1, cost: () => 800 },                              // EMP burst on landing
} as const;
export type UpgradeKey = keyof typeof UPGRADES;

export const EMP = { radius: 150, stunMs: 2000 };
export const FRONT_HIT_DMG = 22;
export const LASER_DMG_PER_SEC = 60;
export const BULLET_DMG = 16;
