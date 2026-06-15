import type { MapData, PlanetData, EnemyShip } from './GameTypes.ts';
import { PLANET_CFG, ENEMY_CFG, VITALITY_MAX } from './GameConfig.ts';
import type { PlanetType } from './GameConfig.ts';

const TYPES: PlanetType[] = ['rocky','gas_giant','ice','volcanic','oceanic'];
let _id = 0;
function uid(p: string): string { return `${p}${_id++}`; }
function dist(ax:number,ay:number,bx:number,by:number):number{ return Math.sqrt((ax-bx)**2+(ay-by)**2); }

export function generateMap(visW: number, visH: number, difficulty: number): MapData {
  _id = 0;
  // World = exactly the visible viewport — everything fits on screen at once
  const LW = visW;
  const LH = visH;
  const pad = 36;
  const minDist = 58;

  const planets: PlanetData[] = [];
  const ships:   EnemyShip[]  = [];

  // Home planet (oceanic, fully alive, larger base radius)
  const home = makePlanet(uid('p'), 'oceanic', LW/2, LH - 70, true);
  home.vitality = VITALITY_MAX;
  home.state    = 'alive';
  home.radius   = 22; // home is slightly bigger
  planets.push(home);

  // Dead planets
  const count = 5 + difficulty; // 6–10 planets total
  let attempts = 0;
  while (planets.length < count + 1 && attempts < 3000) {
    attempts++;
    const x = pad + Math.random() * (LW - pad*2);
    const y = pad + Math.random() * (LH - pad*2 - 120);
    if (planets.some(p => dist(p.x, p.y, x, y) < minDist)) continue;
    const type = TYPES[Math.floor(Math.random() * TYPES.length)];
    planets.push(makePlanet(uid('p'), type, x, y, false));
  }

  // Enemy ships (start at top)
  const numShips = 1 + Math.floor(difficulty / 2);
  for (let i = 0; i < numShips; i++) {
    const sx = pad + Math.random() * (LW - pad*2);
    const sy = 40 + Math.random() * 80;
    ships.push({
      id: uid('s'),
      x: sx, y: sy,
      hp: ENEMY_CFG.hp + difficulty * 30,
      maxHp: ENEMY_CFG.hp + difficulty * 30,
      vx: 0, vy: 0,
      targetX: sx, targetY: sy,
      shootCooldown: ENEMY_CFG.shootInterval * (0.5 + Math.random()),
      active: true,
      angle: Math.PI / 2,
    });
  }

  return { planets, ships, worldW: LW, worldH: LH };
}

function makePlanet(id: string, type: PlanetType, x: number, y: number, isHome: boolean): PlanetData {
  const cfg = PLANET_CFG[type];
  return {
    id, type, state: 'dead',
    x, y, radius: cfg.radius,
    vitality: 0,
    isHome,
    shootCooldown: cfg.shootInterval,
    shootInterval: cfg.shootInterval,
    shootRange: cfg.shootRange,
    bulletDamage: cfg.bulletDamage,
    energyAccum: 0,
    genEnergy: cfg.genEnergy,
  };
}
