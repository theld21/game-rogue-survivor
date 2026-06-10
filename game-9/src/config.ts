// =====================================================================
// config.ts — Abyss Descent: a vertical deep-sea survival dive.
//
// World is narrow & VERY tall (2000×10000). Y=0 is the surface base;
// deeper = darker, higher pressure, deadlier. Submarine with water drag +
// buoyancy. Survive Oxygen / Battery / Hull. Darkness is pierced only by
// the flashlight cone and expanding Sonar pings.
// =====================================================================

export const WORLD = { width: 3200, height: 10000, surfaceY: 360 };

/** Frustum cull margin (px beyond camera view). */
export const CULL_PAD = 300;
export const CHUNK_H = 1000;   // logical chunk height for sleep/wake

export const COLORS = {
  surface: 0x2a6e8c, shallow: 0x0a3550, mid: 0x041d30, abyss: 0x01080f, void: 0x000308,
  hull: 0xd8e4f0, hullDark: 0x4a5e7a, cockpit: 0x8ff0ff,
  light: 0xffe9a8, lightCone: 0xfff0c0,
  sonar: 0x46e8ff, sonarHot: 0xaaf6ff,
  ore: 0x9fb4c8, crystal: 0x57f0d0, salvage: 0xc9a86e, pearl: 0xfff0f6, biosample: 0x9affa0,
  danger: 0xff4a5a, vent: 0xff7a3c, warn: 0xffc24a,
  lurker: 0x6ad0ff, angler: 0xff5c7a, stalker: 0xb56cff,
  white: 0xffffff, kelp: 0x2f7d5a, coral: 0xff7faa,
};

export const CSS = {
  sonar: '#46e8ff', sonarHot: '#aaf6ff', light: '#ffe9a8', danger: '#ff4a5a',
  warn: '#ffc24a', crystal: '#57f0d0', salvage: '#c9a86e', pearl: '#fff0f6',
  ore: '#9fb4c8', biosample: '#9affa0', ink: '#cfe2f2', vent: '#ff7a3c',
} as const;

/** Submarine tuning (Arcade body in water). */
export const SUB = {
  startX: 1600,
  radius: 26,
  accel: 560,            // thrust
  maxSpeed: 320,
  drag: 440,             // heavy water resistance
  buoyancy: -22,         // gentle upward force (px/s²) — must thrust down to dive
  angularLerp: 0.12,
  maxHull: 100,
  maxOxygen: 100,
  maxBattery: 100,
  oxygenDrain: 0.85,     // per second (always)
  batteryMove: 1.1,      // per second while thrusting
  batteryLight: 2.0,     // per second while flashlight on
  batterySonar: 4,       // per ping
  cargoMax: 40,
};

/** Grappling claw (harvest tool). Fires from the muzzle, grabs the first
 *  node / loose item it reaches, reels it back. */
export const CLAW = { range: 230, extendMs: 260, reelMs: 220, cooldown: 360, batteryCost: 0.6 };

/** Energy blaster — fires pooled projectile bolts while held. */
export const BOLT = { speed: 580, dmg: 17, life: 820, rate: 150, batteryPerShot: 0.5, radius: 6 };

/** Sonar ping. */
export const SONAR = { baseRadius: 460, growMs: 1100, revealMs: 3000, cooldown: 900 };

/** Flashlight cone. */
export const LIGHT = { range: 360, halfAngle: 0.46 };

/** Pressure zones by depth (top→bottom). armorReq = hull-armor level needed. */
export interface Zone { name: string; yStart: number; armorReq: number; tint: number; crushDps: number; }
export const ZONES: Zone[] = [
  { name: 'Sunlit Shallows', yStart: 0,    armorReq: 0, tint: 0x0a3550, crushDps: 0 },
  { name: 'Twilight Trench', yStart: 3400, armorReq: 1, tint: 0x041d30, crushDps: 6 },
  { name: 'The Abyss',       yStart: 6800, armorReq: 2, tint: 0x01080f, crushDps: 12 },
];

/** Collectible resources. */
export type ResourceKind = 'ore' | 'crystal' | 'salvage' | 'pearl' | 'biosample';
export const RESOURCES: Record<ResourceKind, { name: string; color: number; css: string; value: number; glows: boolean }> = {
  ore:       { name: 'Iron Nodule',   color: 0x9fb4c8, css: '#9fb4c8', value: 12,  glows: false },
  crystal:   { name: 'Glow Crystal',  color: 0x57f0d0, css: '#57f0d0', value: 32,  glows: true },
  salvage:   { name: 'Ancient Relic', color: 0xc9a86e, css: '#c9a86e', value: 60,  glows: false },
  biosample: { name: 'Bio Sample',    color: 0x9affa0, css: '#9affa0', value: 78,  glows: true },
  pearl:     { name: 'Abyss Pearl',   color: 0xfff0f6, css: '#fff0f6', value: 150, glows: true },
};
export const RESOURCE_KINDS: ResourceKind[] = ['ore', 'crystal', 'salvage', 'biosample', 'pearl'];

/** Deep-sea creatures. `behavior` drives the AI, `shape` the art, `zoneMin`
 *  the shallowest zone it spawns in. Add species freely — no AI change needed.
 *   fear    — flees the flashlight cone
 *   attract — charges toward the lit lamp
 *   sound   — hunts your last sonar ping
 *   ambush  — drifts, then darts when the sub gets close
 *   crusher — relentless slow chase, heavy ram
 */
export type Behavior = 'fear' | 'attract' | 'sound' | 'ambush' | 'crusher';
export type CreatureShape = 'jelly' | 'angler' | 'eel' | 'crab' | 'squid';
export type CreatureKind = 'driftjelly' | 'swarmling' | 'lanternmaw' | 'gulper' | 'echowraith' | 'siren' | 'viper' | 'crusher';
export interface CreatureDefT { name: string; color: number; hp: number; speed: number; radius: number; dmg: number; behavior: Behavior; shape: CreatureShape; zoneMin: number; }
export const CREATURES: Record<CreatureKind, CreatureDefT> = {
  driftjelly: { name: 'Pale Drifter',  color: 0x6ad0ff, hp: 26, speed: 64,  radius: 22, dmg: 7,  behavior: 'fear',    shape: 'jelly',  zoneMin: 0 },
  swarmling:  { name: 'Glow Swarmling',color: 0x9affd0, hp: 16, speed: 120, radius: 14, dmg: 5,  behavior: 'fear',    shape: 'jelly',  zoneMin: 0 },
  lanternmaw: { name: 'Lantern Maw',   color: 0xff5c7a, hp: 46, speed: 150, radius: 26, dmg: 15, behavior: 'attract', shape: 'angler', zoneMin: 0 },
  gulper:     { name: 'Abyss Gulper',  color: 0xff8a3c, hp: 80, speed: 120, radius: 38, dmg: 22, behavior: 'attract', shape: 'angler', zoneMin: 2 },
  echowraith: { name: 'Echo Wraith',   color: 0xb56cff, hp: 56, speed: 132, radius: 28, dmg: 18, behavior: 'sound',   shape: 'eel',    zoneMin: 1 },
  siren:      { name: 'Deep Siren',    color: 0xff6cf0, hp: 70, speed: 150, radius: 26, dmg: 20, behavior: 'sound',   shape: 'squid',  zoneMin: 2 },
  viper:      { name: 'Trench Viper',  color: 0x57f0a0, hp: 40, speed: 90,  radius: 20, dmg: 16, behavior: 'ambush',  shape: 'eel',    zoneMin: 1 },
  crusher:    { name: 'Hull Crusher',  color: 0xc24a4a, hp: 130, speed: 64, radius: 42, dmg: 28, behavior: 'crusher', shape: 'crab',   zoneMin: 2 },
};
export const CREATURE_KINDS = Object.keys(CREATURES) as CreatureKind[];

/** Permanent upgrades bought at the surface base. */
export const UPGRADES = {
  oxygen:  { name: 'O₂ Tank',     max: 4, cost: (l: number) => 80 + l * 110, desc: '+ oxygen capacity' },
  battery: { name: 'Cell Bank',   max: 4, cost: (l: number) => 90 + l * 120, desc: '+ battery capacity' },
  armor:   { name: 'Pressure Hull', max: 2, cost: (l: number) => 170 + l * 240, desc: 'survive a deeper zone' },
  sonar:   { name: 'Sonar Array', max: 4, cost: (l: number) => 70 + l * 95, desc: '+ sonar radius & reveal' },
  hull:    { name: 'Hull Plating', max: 4, cost: (l: number) => 110 + l * 130, desc: '+ max hull integrity' },
  light:   { name: 'Beam Lens',   max: 3, cost: (l: number) => 100 + l * 130, desc: '+ flashlight range' },
} as const;
export type UpgradeKey = keyof typeof UPGRADES;

// ---- The win objective: repair the surface spaceship in 5 stages ----
// Each stage consumes a specific material, found at a specific depth via a
// specific tool. Finish all 5 → the ship launches → victory.
export type RepairTool = 'claw' | 'laser';
export interface RepairStage { mat: ResourceKind; need: number; part: string; where: string; how: string; tool: RepairTool; }
export const REPAIR: RepairStage[] = [
  { mat: 'ore',       need: 8, part: 'Landing Struts', where: 'Sunlit Shallows', how: 'Claw iron nodules off the rocks', tool: 'claw' },
  { mat: 'crystal',   need: 8, part: 'Power Core',     where: 'Twilight Trench',  how: 'Claw glowing crystal clusters',   tool: 'claw' },
  { mat: 'salvage',   need: 6, part: 'Hull Plates',    where: 'Twilight wrecks',  how: 'Claw drifting ancient relics',    tool: 'claw' },
  { mat: 'biosample', need: 6, part: 'Bio-Seals',      where: 'Anywhere (life)',  how: 'Laser deep-sea creatures',        tool: 'laser' },
  { mat: 'pearl',     need: 3, part: 'Nav Lens',       where: 'The Abyss',        how: 'Claw rare abyss pearls',          tool: 'claw' },
];
