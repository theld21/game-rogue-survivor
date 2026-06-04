// =====================================================================
// config.ts — Neon Transporter: Gravity Rush.
//
// FIXED LOGICAL RESOLUTION (450×800). Every physics constant, wall and pad
// is authored in this space so the game feels identical on every device;
// Scale.FIT letterboxes into the real viewport. NEVER use innerWidth here.
// =====================================================================

export const WORLD = {
  width: 450,
  height: 800,       // CAMERA VIEW height (canvas). Routes have their own taller worldHeight.
  gravityY: 360,     // a touch heavier for more weighty flight
};

/** Bright sunset-neon palette (numeric for Phaser). */
export const COLORS = {
  skyTop:    0x2a1a5e,
  skyMid:    0x7b3fa0,
  skyLow:    0xff7e5f,
  duskGlow:  0xfeb47b,
  nightInk:  0x140a2e,
  panelInk:  0x1d1442,

  cyan:      0x22e3ff,
  pink:      0xff4fa3,
  lime:      0x9dff5c,
  yellow:    0xffd83d,
  orange:    0xff8a3d,
  violet:    0x9d6bff,
  white:     0xffffff,

  hullGood:  0x4dffa0,
  hullWarn:  0xffd83d,
  hullBad:   0xff5470,

  wall:      0x3a2a6e,
  wallEdge:  0x22e3ff,
  steel:     0x8a93b0,
  nuclear:   0x9dff5c,
};

export const CSS = {
  cyan: '#22e3ff', pink: '#ff4fa3', lime: '#9dff5c',
  yellow: '#ffd83d', orange: '#ff8a3d', violet: '#9d6bff',
  hullGood: '#4dffa0', hullWarn: '#ffd83d', hullBad: '#ff5470',
} as const;

/** Drone tuning (tuned for the 450×800 space). */
export const DRONE = {
  startX: 225,
  startY: 72,
  bodyRadius: 18,
  // Thrust is applied as ACCELERATION while a side is held (delta-scaled),
  // angled inward as the spec wants: left engine pushes up-right, etc.
  thrustX: 230,      // horizontal accel component (px/s²)
  thrustY: 430,      // upward accel component (px/s²)
  maxSpeed: 380,
  drag: 14,          // lighter drag → snappier fall, less floaty
  // Bank tilt (visual only) — proportional to horizontal velocity
  maxBankDeg: 30,
  bankLerp: 0.12,
  // Carrying a cargo scales thrust down for a heavy feel
  ladenThrustMult: 0.72,
  // Fuel
  maxFuel: 100,
  fuelBurnPerSec: 9,   // per engine held
};

/** Cargo tether (spring-damper, simulated — Arcade has no joints). */
export const TETHER = {
  /** Anchor offset below the drone centre (the "tail"). */
  anchorBelow: 26,
  /** Spring stiffness: high enough to haul cargo, low enough not to explode. */
  stiffness: 34,
  /** Velocity damping kills sway oscillation (lower = cargo follows fall more naturally). */
  damping: 6.5,
  /** Clamp accel magnitude so a fast yank never detonates the sim. */
  maxAccel: 2600,
  lockRange: 56,     // drone must get this close to auto-lock the cargo
};

/** Cargo archetypes. */
export const CARGO_TYPES = {
  iron: {
    name: 'Iron Crate', color: COLORS.steel, glow: COLORS.cyan,
    radius: 20, maxHp: 100,
    impactThreshold: 210,   // only hard hits hurt it
    hpPerHit: 14,
    reward: 60, weightMult: 1.0,
    rarity: 'common',
  },
  alloy: {
    name: 'Alloy Pod', color: COLORS.violet, glow: COLORS.pink,
    radius: 17, maxHp: 70,
    impactThreshold: 150,
    hpPerHit: 20,
    reward: 130, weightMult: 0.85,
    rarity: 'rare',
  },
  nuclear: {
    name: 'Nuclear Core', color: COLORS.lime, glow: COLORS.lime,
    radius: 16, maxHp: 45,
    impactThreshold: 95,    // a light touch hurts it
    hpPerHit: 30,
    reward: 280, weightMult: 0.7,   // light & nimble but fragile
    rarity: 'legendary',
  },
  crystal: {
    name: 'Crystal Vault', color: COLORS.pink, glow: COLORS.violet,
    radius: 18, maxHp: 60,
    impactThreshold: 130,   // shatters on medium hits
    hpPerHit: 26,
    reward: 200, weightMult: 0.95,
    rarity: 'rare',
  },
  reactor: {
    name: 'Reactor Cell', color: COLORS.orange, glow: COLORS.yellow,
    radius: 23, maxHp: 150,
    impactThreshold: 240,   // very tough
    hpPerHit: 14,
    reward: 240, weightMult: 1.6,   // HEAVY → sluggish, swings hard
    rarity: 'legendary',
  },
} as const;

export type CargoKind = keyof typeof CARGO_TYPES;

/** Collision HP rules. */
export const IMPACT = {
  /** Min ms between two HP-dealing impacts on the same body (no resting drain). */
  cooldownMs: 350,
  /** Drone hull also takes a little damage on hard hits. */
  droneThreshold: 260,
};

/** Permanent upgrades (bought with Credits in the Shop). */
export const UPGRADES = {
  engine: { maxLevel: 5, cost: (l: number) => [120, 280, 560, 1000, 1700][l] ?? 1700, bonusPct: 0.12 },
  fuel:   { maxLevel: 5, cost: (l: number) => [100, 240, 500, 920, 1600][l] ?? 1600, bonusPct: 0.15 },
  shield: { maxLevel: 5, cost: (l: number) => [150, 340, 680, 1200, 2000][l] ?? 2000, bonusPct: 0.14 },
} as const;

export type UpgradeKey = keyof typeof UPGRADES;

export const RARITY_CSS: Record<string, string> = {
  common: '#8a93b0',
  rare: '#9d6bff',
  legendary: '#9dff5c',
};

// =====================================================================
// Scale-up systems: themes, corridor generation, camera.
// =====================================================================

/** Largest cargo radius — used to size the minimum flyable corridor gap. */
export const MAX_CARGO_RADIUS = Math.max(...Object.values(CARGO_TYPES).map((c) => c.radius));

/**
 * Corridor generator constants. The minimum gate gap is DERIVED from entity
 * sizes (drone Ø, cargo Ø, tether swing), so retuning the tether shifts ONE
 * number here instead of invalidating hand-placed walls.
 */
export const GEN = {
  topMargin: 130,       // pickup zone height at the top
  // Clearance between the LAST gate and the pad — must be tall enough for a
  // laden drone to swing into the (laterally offset) pad. Too small = the
  // crate can't be threaded in.
  bottomMargin: 200,
  wallThickness: 20,
  padApproach: 120,     // min vertical gap reserved above the pad
  // Drone & dangling cargo pass through sequentially; gap must fit the wider
  // of the two plus tether sway clearance.
  minGap: Math.round(Math.max(2 * DRONE.bodyRadius, 2 * MAX_CARGO_RADIUS) + 56),
  sideMargin: 30,       // keep gates off the exact world edges
};

/** Camera follow tuning for the scrolling tall world. */
export const CAMERA = {
  lerp: 0.12,
  // Bias the view DOWNWARD of the drone (you descend toward the pad and must
  // see where you're falling + the dangling cargo).
  followOffsetY: -90,   // negative pushes camera target up → shows more below
  deadzoneW: 120,
  deadzoneH: 150,
};

/**
 * Visual themes per difficulty tier (palette + skyline params). Pure data →
 * cheap, and baked into a RenderTexture per route so a tall world stays light.
 */
export interface ThemeDef {
  skyTop: number; skyLow: number;
  city: number; cityAlt: number;
  windows: number;
  wall: number; wallEdge: number;
  star: number;
}
export const THEMES: Record<string, ThemeDef> = {
  sunset:     { skyTop: 0x2a1a5e, skyLow: 0xff7e5f, city: 0x140a2e, cityAlt: 0x241246, windows: 0xffd83d, wall: 0x3a2a6e, wallEdge: 0x22e3ff, star: 0xffffff },
  night:      { skyTop: 0x0a0a2e, skyLow: 0x3b1a6e, city: 0x05030f, cityAlt: 0x140a2e, windows: 0x22e3ff, wall: 0x241858, wallEdge: 0xff4fa3, star: 0x9dff5c },
  industrial: { skyTop: 0x2e1f14, skyLow: 0x6e4a2a, city: 0x1a120a, cityAlt: 0x2e2014, windows: 0xff8a3d, wall: 0x4a3a2a, wallEdge: 0xffd83d, star: 0xffd83d },
  storm:      { skyTop: 0x141a2e, skyLow: 0x2a3a5e, city: 0x080a14, cityAlt: 0x14203a, windows: 0x9d6bff, wall: 0x2a3a5e, wallEdge: 0x9dff5c, star: 0xffffff },
  orbital:    { skyTop: 0x05030f, skyLow: 0x1a0a3e, city: 0x0a0518, cityAlt: 0x1a0a3e, windows: 0xff4fa3, wall: 0x2a1858, wallEdge: 0x22e3ff, star: 0xffffff },
};
export type ThemeKey = keyof typeof THEMES;
