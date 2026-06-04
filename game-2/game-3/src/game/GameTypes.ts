import type { PlanetType, PlanetState } from './GameConfig.ts';

export interface PlanetData {
  id: string;
  type: PlanetType;
  state: PlanetState;
  x: number; y: number;
  radius: number;
  vitality: number;    // 0–100
  isHome: boolean;
  shootCooldown: number;
  shootInterval: number;
  shootRange: number;
  bulletDamage: number;
  energyAccum: number;
  genEnergy: number;
}

export interface EnemyShip {
  id: string;
  x: number; y: number;
  hp: number; maxHp: number;
  vx: number; vy: number;
  targetX: number; targetY: number;
  shootCooldown: number;
  active: boolean;
  angle: number;
}

export interface Bridge {
  id: string;
  sourceId: string;
  targetId: string;
  sx: number; sy: number;
  tx: number; ty: number;
  totalLen: number;
  builtLen: number;   // 0 → totalLen
  built: boolean;
  packets: BridgePacket[];
  done: boolean;
  alpha: number;
}

export interface BridgePacket {
  t: number;      // 0→1 along bridge
  active: boolean;
}

export interface Bullet {
  id: number;
  x: number; y: number;
  vx: number; vy: number;
  damage: number;
  owner: 'planet' | 'enemy';
  active: boolean;
  color: number;
  targetId: string;
}

export interface BgStar {
  x: number; y: number; r: number; alpha: number; speed: number;
}

export interface FxRing {
  x: number; y: number;
  radius: number; maxRadius: number;
  alpha: number; color: number; speed: number;
}

export interface MapData {
  planets: PlanetData[];
  ships: EnemyShip[];
  worldW: number;
  worldH: number;
}
