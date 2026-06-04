// =====================================================================
// Levels.ts — Six hand-placed level maps. Maps are ~40% wider than v1.
// =====================================================================

export interface Vec2 { x: number; y: number; }

export interface LevelDef {
  id: number;
  size: number;
  playerStart: Vec2;
  shop: Vec2;
  lootIslands: Vec2[];
  skull: Vec2;
  patrolCount: number;
  guardianCount: number;
  enemyHpMul: number;
  enemyDmgMul: number;
  /** Probability per second that a sea item spawns (0 = none). Level 3+ only. */
  seaItemChance: number;
}

export const MAX_LEVEL = 6;

export const LEVELS: LevelDef[] = [
  {
    id: 1, size: 4200,
    playerStart: { x: 2100, y: 3600 },
    shop:        { x: 2100, y: 3400 },
    lootIslands: [{ x: 980, y: 2380 }, { x: 3220, y: 2380 }, { x: 2100, y: 1610 }],
    skull:       { x: 2100, y: 730 },
    patrolCount: 2, guardianCount: 1,
    enemyHpMul: 1.0, enemyDmgMul: 1.0, seaItemChance: 0,
  },
  {
    id: 2, size: 4500,
    playerStart: { x: 840, y: 3780 },
    shop:        { x: 1050, y: 3570 },
    lootIslands: [
      { x: 2380, y: 3220 }, { x: 3500, y: 2380 },
      { x: 1820, y: 1820 }, { x: 3710, y: 3710 },
    ],
    skull:       { x: 3780, y: 840 },
    patrolCount: 3, guardianCount: 2,
    enemyHpMul: 1.15, enemyDmgMul: 1.1, seaItemChance: 0,
  },
  {
    id: 3, size: 4800,
    playerStart: { x: 2400, y: 4200 },
    shop:        { x: 2400, y: 3990 },
    lootIslands: [
      { x: 980, y: 3080 }, { x: 3850, y: 3080 },
      { x: 1540, y: 1820 }, { x: 3360, y: 1820 },
    ],
    skull:       { x: 2400, y: 840 },
    patrolCount: 3, guardianCount: 2,
    enemyHpMul: 1.3, enemyDmgMul: 1.2, seaItemChance: 0.004,
  },
  {
    id: 4, size: 5200,
    playerStart: { x: 2600, y: 4550 },
    shop:        { x: 2340, y: 4290 },
    lootIslands: [
      { x: 840, y: 3360 }, { x: 4290, y: 3360 },
      { x: 1260, y: 1680 }, { x: 3780, y: 1680 },
    ],
    skull:       { x: 2600, y: 700 },
    patrolCount: 4, guardianCount: 3,
    enemyHpMul: 1.5, enemyDmgMul: 1.35, seaItemChance: 0.005,
  },
  {
    id: 5, size: 5600,
    playerStart: { x: 980, y: 4620 },
    shop:        { x: 1190, y: 4410 },
    lootIslands: [
      { x: 2660, y: 4340 }, { x: 4480, y: 3500 },
      { x: 2100, y: 2380 }, { x: 4340, y: 1540 },
    ],
    skull:       { x: 980, y: 980 },
    patrolCount: 4, guardianCount: 3,
    enemyHpMul: 1.7, enemyDmgMul: 1.5, seaItemChance: 0.006,
  },
  {
    id: 6, size: 6000,
    playerStart: { x: 3000, y: 5250 },
    shop:        { x: 3000, y: 5040 },
    lootIslands: [
      { x: 910, y: 3640 }, { x: 4690, y: 3640 },
      { x: 1680, y: 2100 }, { x: 3920, y: 2100 },
    ],
    skull:       { x: 3000, y: 980 },
    patrolCount: 5, guardianCount: 3,
    enemyHpMul: 2.0, enemyDmgMul: 1.7, seaItemChance: 0.007,
  },
];

export function getLevel(id: number): LevelDef {
  return LEVELS.find((l) => l.id === id) ?? LEVELS[0];
}
