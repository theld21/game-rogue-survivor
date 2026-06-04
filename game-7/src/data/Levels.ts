import { EnemyKind, SHIELD_ARC_HALF_DEG, WORLD } from '../config.ts';

// =====================================================================
// Levels.ts — 50 arenas built from shared layouts × escalating enemy
// loadouts. Walls OCCLUDE the dash, so placement is a routing puzzle, and
// shielded enemies must be struck from their open side — often only
// reachable via a BORDER BOUNCE. Pure module (no Phaser) so the
// facing + bounce aware solvability assertion runs headless.
// =====================================================================

export interface PlatformDef { x: number; y: number; w: number; }
export interface WallDef { x: number; y: number; w: number; h: number; }
export interface SpawnDef { kind: EnemyKind; x: number; y: number; facing?: number; }

export interface LevelDef {
  id: number;
  name: string;
  platforms: PlatformDef[];
  walls: WallDef[];
  enemies: SpawnDef[];
  reward: number;
}

const DOWN = Math.PI / 2, UP = -Math.PI / 2, LEFT = Math.PI, RIGHT = 0;

// ---- Shared arena layouts (platforms + occluding walls) ----
interface Arena { platforms: PlatformDef[]; walls: WallDef[]; }
const ARENAS: Arena[] = [
  // 0 — open
  { platforms: [{ x: 225, y: 710, w: 160 }, { x: 225, y: 300, w: 120 }], walls: [] },
  // 1 — center pillar (route around)
  { platforms: [{ x: 110, y: 710, w: 120 }, { x: 340, y: 710, w: 120 }, { x: 225, y: 320, w: 120 }],
    walls: [{ x: 225, y: 540, w: 20, h: 260 }] },
  // 2 — twin firewalls
  { platforms: [{ x: 225, y: 720, w: 150 }, { x: 225, y: 330, w: 130 }],
    walls: [{ x: 95, y: 520, w: 18, h: 280 }, { x: 355, y: 520, w: 18, h: 280 }] },
  // 3 — staggered shelves
  { platforms: [{ x: 110, y: 720, w: 120 }, { x: 340, y: 560, w: 120 }, { x: 150, y: 380, w: 120 }],
    walls: [{ x: 250, y: 470, w: 18, h: 200 }] },
  // 4 — fortress
  { platforms: [{ x: 225, y: 730, w: 130 }, { x: 90, y: 530, w: 100 }, { x: 360, y: 530, w: 100 }, { x: 225, y: 300, w: 120 }],
    walls: [{ x: 150, y: 640, w: 16, h: 130 }, { x: 300, y: 640, w: 16, h: 130 }, { x: 225, y: 440, w: 130, h: 14 }] },
  // 5 — Z ledges (horizontal occluders force bounce routing)
  { platforms: [{ x: 120, y: 710, w: 110 }, { x: 330, y: 470, w: 110 }, { x: 120, y: 250, w: 110 }],
    walls: [{ x: 235, y: 590, w: 150, h: 14 }, { x: 235, y: 360, w: 150, h: 14 }] },
  // 6 — citadel (central column + two upper pillars)
  { platforms: [{ x: 225, y: 720, w: 140 }, { x: 110, y: 470, w: 100 }, { x: 340, y: 470, w: 100 }, { x: 225, y: 230, w: 110 }],
    walls: [{ x: 225, y: 600, w: 16, h: 150 }, { x: 160, y: 360, w: 16, h: 150 }, { x: 290, y: 360, w: 16, h: 150 }] },
];

interface LevelSpec { name: string; arena: number; enemies: SpawnDef[]; }

const SPEC: LevelSpec[] = [
  // ---- Tier 1 — grunts: learn the draw ----
  { name: 'Boot Sector', arena: 0, enemies: [{ kind: 'grunt', x: 150, y: 470 }, { kind: 'grunt', x: 225, y: 420 }, { kind: 'grunt', x: 300, y: 470 }] },
  { name: 'Cold Start', arena: 0, enemies: [{ kind: 'grunt', x: 120, y: 490 }, { kind: 'grunt', x: 200, y: 420 }, { kind: 'grunt', x: 280, y: 420 }, { kind: 'grunt', x: 340, y: 490 }] },
  { name: 'Packet Loss', arena: 1, enemies: [{ kind: 'grunt', x: 110, y: 460 }, { kind: 'grunt', x: 340, y: 460 }, { kind: 'grunt', x: 225, y: 250 }] },
  { name: 'Handshake', arena: 3, enemies: [{ kind: 'grunt', x: 110, y: 560 }, { kind: 'grunt', x: 340, y: 400 }, { kind: 'grunt', x: 150, y: 250 }, { kind: 'grunt', x: 320, y: 250 }] },
  { name: 'Null Route', arena: 2, enemies: [{ kind: 'grunt', x: 225, y: 560 }, { kind: 'grunt', x: 150, y: 250 }, { kind: 'grunt', x: 300, y: 250 }, { kind: 'grunt', x: 225, y: 200 }] },
  { name: 'Subnet', arena: 1, enemies: [{ kind: 'grunt', x: 110, y: 460 }, { kind: 'grunt', x: 340, y: 460 }, { kind: 'grunt', x: 160, y: 260 }, { kind: 'grunt', x: 290, y: 260 }, { kind: 'grunt', x: 225, y: 190 }] },

  // ---- Tier 2 — shielded + intro border-bounce ----
  { name: 'Bulwark', arena: 0, enemies: [{ kind: 'shielded', x: 225, y: 460, facing: DOWN }, { kind: 'grunt', x: 130, y: 350 }, { kind: 'grunt', x: 320, y: 350 }] },
  { name: 'Sidewall', arena: 1, enemies: [{ kind: 'shielded', x: 110, y: 450, facing: RIGHT }, { kind: 'grunt', x: 340, y: 450 }, { kind: 'grunt', x: 225, y: 240 }] },
  { name: 'Crossfire', arena: 2, enemies: [{ kind: 'shielded', x: 225, y: 520, facing: DOWN }, { kind: 'grunt', x: 150, y: 280 }, { kind: 'grunt', x: 300, y: 280 }, { kind: 'grunt', x: 225, y: 210 }] },
  { name: 'Twin Guard', arena: 3, enemies: [{ kind: 'shielded', x: 110, y: 540, facing: UP }, { kind: 'shielded', x: 340, y: 420, facing: LEFT }, { kind: 'grunt', x: 150, y: 250 }] },
  { name: 'Lockdown', arena: 4, enemies: [{ kind: 'shielded', x: 225, y: 230, facing: DOWN }, { kind: 'grunt', x: 120, y: 400 }, { kind: 'grunt', x: 330, y: 400 }, { kind: 'grunt', x: 225, y: 360 }] },
  { name: 'Deadbolt', arena: 2, enemies: [{ kind: 'shielded', x: 150, y: 520, facing: RIGHT }, { kind: 'shielded', x: 300, y: 520, facing: LEFT }, { kind: 'grunt', x: 225, y: 250 }, { kind: 'grunt', x: 225, y: 300 }] },

  // ---- Tier 3 — ranged ----
  { name: 'Sniper Alley', arena: 1, enemies: [{ kind: 'ranged', x: 110, y: 250 }, { kind: 'ranged', x: 340, y: 250 }, { kind: 'grunt', x: 110, y: 460 }, { kind: 'grunt', x: 340, y: 460 }] },
  { name: 'Firewall', arena: 2, enemies: [{ kind: 'ranged', x: 225, y: 230 }, { kind: 'shielded', x: 150, y: 520, facing: RIGHT }, { kind: 'grunt', x: 300, y: 520 }, { kind: 'grunt', x: 225, y: 460 }] },
  { name: 'Sentinel', arena: 3, enemies: [{ kind: 'shielded', x: 340, y: 400, facing: LEFT }, { kind: 'shielded', x: 110, y: 540, facing: RIGHT }, { kind: 'ranged', x: 360, y: 230 }, { kind: 'grunt', x: 150, y: 250 }] },
  { name: 'Crossvault', arena: 4, enemies: [{ kind: 'ranged', x: 90, y: 400 }, { kind: 'ranged', x: 360, y: 400 }, { kind: 'shielded', x: 225, y: 230, facing: DOWN }, { kind: 'grunt', x: 150, y: 360 }, { kind: 'grunt', x: 300, y: 360 }] },
  { name: 'Kill Switch', arena: 2, enemies: [{ kind: 'shielded', x: 225, y: 520, facing: DOWN }, { kind: 'ranged', x: 150, y: 240 }, { kind: 'ranged', x: 300, y: 240 }, { kind: 'grunt', x: 150, y: 470 }, { kind: 'grunt', x: 300, y: 470 }] },
  { name: 'Black Site', arena: 4, enemies: [{ kind: 'shielded', x: 90, y: 440, facing: RIGHT }, { kind: 'shielded', x: 360, y: 440, facing: LEFT }, { kind: 'ranged', x: 90, y: 250 }, { kind: 'ranged', x: 360, y: 250 }, { kind: 'grunt', x: 225, y: 230 }] },

  // ---- Tier 4 — orbiter (rotating shield) ----
  { name: 'Rotor', arena: 0, enemies: [{ kind: 'orbiter', x: 225, y: 440 }, { kind: 'grunt', x: 130, y: 330 }, { kind: 'grunt', x: 320, y: 330 }] },
  { name: 'Gyre', arena: 1, enemies: [{ kind: 'orbiter', x: 110, y: 450 }, { kind: 'orbiter', x: 340, y: 450 }, { kind: 'grunt', x: 225, y: 240 }] },
  { name: 'Carousel', arena: 3, enemies: [{ kind: 'orbiter', x: 340, y: 400 }, { kind: 'shielded', x: 110, y: 540, facing: UP }, { kind: 'grunt', x: 150, y: 250 }] },
  { name: 'Turbine', arena: 2, enemies: [{ kind: 'orbiter', x: 225, y: 520 }, { kind: 'ranged', x: 150, y: 240 }, { kind: 'ranged', x: 300, y: 240 }, { kind: 'grunt', x: 225, y: 200 }] },
  { name: 'Vortex', arena: 4, enemies: [{ kind: 'orbiter', x: 90, y: 440 }, { kind: 'orbiter', x: 360, y: 440 }, { kind: 'shielded', x: 225, y: 230, facing: DOWN }, { kind: 'grunt', x: 160, y: 360 }, { kind: 'grunt', x: 290, y: 360 }] },
  { name: 'Spin Lock', arena: 5, enemies: [{ kind: 'orbiter', x: 120, y: 470 }, { kind: 'orbiter', x: 330, y: 250 }, { kind: 'grunt', x: 120, y: 250 }, { kind: 'grunt', x: 330, y: 470 }] },
  { name: 'Flywheel', arena: 6, enemies: [{ kind: 'orbiter', x: 225, y: 490 }, { kind: 'orbiter', x: 110, y: 440 }, { kind: 'orbiter', x: 340, y: 440 }, { kind: 'grunt', x: 225, y: 300 }] },
  { name: 'Spin Up', arena: 4, enemies: [{ kind: 'orbiter', x: 90, y: 440 }, { kind: 'ranged', x: 360, y: 250 }, { kind: 'shielded', x: 360, y: 440, facing: LEFT }, { kind: 'grunt', x: 90, y: 250 }, { kind: 'grunt', x: 225, y: 230 }] },

  // ---- Tier 5 — phaser (blinking full-ring shield) ----
  { name: 'Flicker', arena: 0, enemies: [{ kind: 'phaser', x: 225, y: 440 }, { kind: 'grunt', x: 130, y: 330 }, { kind: 'grunt', x: 320, y: 330 }] },
  { name: 'Blackout', arena: 1, enemies: [{ kind: 'phaser', x: 110, y: 450 }, { kind: 'phaser', x: 340, y: 450 }, { kind: 'grunt', x: 225, y: 240 }] },
  { name: 'Strobe', arena: 3, enemies: [{ kind: 'phaser', x: 340, y: 400 }, { kind: 'shielded', x: 110, y: 540, facing: UP }, { kind: 'grunt', x: 150, y: 250 }] },
  { name: 'Phase Shift', arena: 2, enemies: [{ kind: 'phaser', x: 225, y: 520 }, { kind: 'ranged', x: 150, y: 240 }, { kind: 'ranged', x: 300, y: 240 }, { kind: 'grunt', x: 225, y: 200 }] },
  { name: 'Ghost Net', arena: 4, enemies: [{ kind: 'phaser', x: 90, y: 440 }, { kind: 'phaser', x: 360, y: 440 }, { kind: 'shielded', x: 225, y: 230, facing: DOWN }, { kind: 'grunt', x: 160, y: 360 }, { kind: 'grunt', x: 290, y: 360 }] },
  { name: 'Static', arena: 5, enemies: [{ kind: 'phaser', x: 120, y: 470 }, { kind: 'orbiter', x: 330, y: 250 }, { kind: 'grunt', x: 120, y: 250 }, { kind: 'grunt', x: 330, y: 470 }] },
  { name: 'Mainframe', arena: 6, enemies: [{ kind: 'phaser', x: 110, y: 440 }, { kind: 'phaser', x: 340, y: 440 }, { kind: 'orbiter', x: 225, y: 300 }, { kind: 'grunt', x: 225, y: 490 }] },
  { name: 'Daemon', arena: 4, enemies: [{ kind: 'phaser', x: 90, y: 250 }, { kind: 'orbiter', x: 360, y: 250 }, { kind: 'shielded', x: 90, y: 440, facing: RIGHT }, { kind: 'shielded', x: 360, y: 440, facing: LEFT }, { kind: 'grunt', x: 225, y: 230 }] },

  // ---- Tier 6 — dense mixed ----
  { name: 'Kernel Panic', arena: 2, enemies: [{ kind: 'shielded', x: 225, y: 520, facing: DOWN }, { kind: 'ranged', x: 150, y: 240 }, { kind: 'ranged', x: 300, y: 240 }, { kind: 'orbiter', x: 150, y: 470 }, { kind: 'orbiter', x: 300, y: 470 }] },
  { name: 'Stack Trace', arena: 3, enemies: [{ kind: 'shielded', x: 340, y: 400, facing: LEFT }, { kind: 'phaser', x: 110, y: 540 }, { kind: 'orbiter', x: 360, y: 230 }, { kind: 'grunt', x: 150, y: 250 }, { kind: 'grunt', x: 150, y: 560 }] },
  { name: 'Overflow', arena: 1, enemies: [{ kind: 'orbiter', x: 110, y: 450 }, { kind: 'phaser', x: 340, y: 450 }, { kind: 'ranged', x: 225, y: 240 }, { kind: 'grunt', x: 160, y: 280 }, { kind: 'grunt', x: 290, y: 280 }] },
  { name: 'Segfault', arena: 4, enemies: [{ kind: 'shielded', x: 90, y: 440, facing: RIGHT }, { kind: 'shielded', x: 360, y: 440, facing: LEFT }, { kind: 'orbiter', x: 225, y: 230 }, { kind: 'ranged', x: 90, y: 250 }, { kind: 'ranged', x: 360, y: 250 }, { kind: 'grunt', x: 225, y: 360 }] },
  { name: 'Race Condition', arena: 6, enemies: [{ kind: 'orbiter', x: 110, y: 440 }, { kind: 'phaser', x: 340, y: 440 }, { kind: 'shielded', x: 225, y: 230, facing: DOWN }, { kind: 'ranged', x: 225, y: 490 }, { kind: 'grunt', x: 110, y: 250 }, { kind: 'grunt', x: 340, y: 250 }] },
  { name: 'Deadlock', arena: 5, enemies: [{ kind: 'shielded', x: 120, y: 470, facing: RIGHT }, { kind: 'shielded', x: 330, y: 250, facing: LEFT }, { kind: 'phaser', x: 120, y: 250 }, { kind: 'orbiter', x: 330, y: 470 }, { kind: 'grunt', x: 225, y: 470 }] },
  { name: 'Honeypot', arena: 2, enemies: [{ kind: 'phaser', x: 225, y: 520 }, { kind: 'ranged', x: 150, y: 240 }, { kind: 'ranged', x: 300, y: 240 }, { kind: 'orbiter', x: 150, y: 470 }, { kind: 'orbiter', x: 300, y: 470 }, { kind: 'shielded', x: 225, y: 200, facing: DOWN }] },
  { name: 'Rootkit', arena: 4, enemies: [{ kind: 'orbiter', x: 90, y: 440 }, { kind: 'orbiter', x: 360, y: 440 }, { kind: 'phaser', x: 225, y: 230 }, { kind: 'ranged', x: 90, y: 250 }, { kind: 'ranged', x: 360, y: 250 }, { kind: 'shielded', x: 225, y: 360, facing: DOWN }] },
  { name: 'Zero Day', arena: 3, enemies: [{ kind: 'shielded', x: 340, y: 400, facing: LEFT }, { kind: 'shielded', x: 110, y: 540, facing: RIGHT }, { kind: 'orbiter', x: 360, y: 230 }, { kind: 'phaser', x: 150, y: 250 }, { kind: 'ranged', x: 150, y: 560 }, { kind: 'grunt', x: 225, y: 300 }] },
  { name: 'Backdoor', arena: 6, enemies: [{ kind: 'orbiter', x: 110, y: 440 }, { kind: 'orbiter', x: 340, y: 440 }, { kind: 'phaser', x: 225, y: 300 }, { kind: 'shielded', x: 225, y: 490, facing: UP }, { kind: 'ranged', x: 110, y: 250 }, { kind: 'ranged', x: 340, y: 250 }] },

  // ---- Tier 7 — gauntlet finale ----
  { name: 'Logic Bomb', arena: 4, enemies: [{ kind: 'shielded', x: 90, y: 440, facing: RIGHT }, { kind: 'shielded', x: 360, y: 440, facing: LEFT }, { kind: 'orbiter', x: 90, y: 250 }, { kind: 'orbiter', x: 360, y: 250 }, { kind: 'phaser', x: 225, y: 230 }, { kind: 'ranged', x: 160, y: 360 }, { kind: 'ranged', x: 290, y: 360 }] },
  { name: 'Cipher', arena: 2, enemies: [{ kind: 'shielded', x: 150, y: 520, facing: RIGHT }, { kind: 'shielded', x: 300, y: 520, facing: LEFT }, { kind: 'phaser', x: 225, y: 470 }, { kind: 'ranged', x: 150, y: 240 }, { kind: 'ranged', x: 300, y: 240 }, { kind: 'orbiter', x: 225, y: 200 }, { kind: 'grunt', x: 225, y: 300 }] },
  { name: 'Brute Force', arena: 6, enemies: [{ kind: 'orbiter', x: 110, y: 440 }, { kind: 'orbiter', x: 340, y: 440 }, { kind: 'phaser', x: 225, y: 490 }, { kind: 'shielded', x: 225, y: 300, facing: DOWN }, { kind: 'ranged', x: 110, y: 250 }, { kind: 'ranged', x: 340, y: 250 }, { kind: 'grunt', x: 120, y: 560 }, { kind: 'grunt', x: 330, y: 560 }] },
  { name: 'ICE Breaker', arena: 5, enemies: [{ kind: 'shielded', x: 120, y: 470, facing: RIGHT }, { kind: 'shielded', x: 330, y: 470, facing: LEFT }, { kind: 'orbiter', x: 120, y: 250 }, { kind: 'orbiter', x: 330, y: 250 }, { kind: 'phaser', x: 225, y: 470 }, { kind: 'ranged', x: 225, y: 250 }, { kind: 'grunt', x: 225, y: 560 }] },
  { name: 'Singularity', arena: 4, enemies: [{ kind: 'shielded', x: 90, y: 440, facing: RIGHT }, { kind: 'shielded', x: 360, y: 440, facing: LEFT }, { kind: 'orbiter', x: 90, y: 250 }, { kind: 'orbiter', x: 360, y: 250 }, { kind: 'phaser', x: 225, y: 230 }, { kind: 'phaser', x: 225, y: 360 }, { kind: 'ranged', x: 160, y: 530 }, { kind: 'ranged', x: 290, y: 530 }] },
  { name: 'Code Zero', arena: 6, enemies: [{ kind: 'orbiter', x: 110, y: 440 }, { kind: 'orbiter', x: 340, y: 440 }, { kind: 'phaser', x: 225, y: 490 }, { kind: 'shielded', x: 225, y: 300, facing: DOWN }, { kind: 'shielded', x: 110, y: 250, facing: RIGHT }, { kind: 'shielded', x: 340, y: 250, facing: LEFT }, { kind: 'ranged', x: 160, y: 560 }, { kind: 'ranged', x: 290, y: 560 }, { kind: 'grunt', x: 225, y: 150 }] },
];

export const LEVELS: LevelDef[] = SPEC.map((s, i) => ({
  id: i + 1, name: s.name,
  platforms: ARENAS[s.arena].platforms,
  walls: ARENAS[s.arena].walls,
  enemies: s.enemies,
  reward: 60 + i * 11,
}));

export const MAX_LEVEL = LEVELS.length;
export function getLevel(id: number): LevelDef { return LEVELS.find((l) => l.id === id) ?? LEVELS[0]; }

// ---- Pure geometry (headless, no Phaser) ----
function segRect(x1: number, y1: number, x2: number, y2: number, rx: number, ry: number, rw: number, rh: number): boolean {
  if ((x1 >= rx && x1 <= rx + rw && y1 >= ry && y1 <= ry + rh) || (x2 >= rx && x2 <= rx + rw && y2 >= ry && y2 <= ry + rh)) return true;
  const edges = [[rx, ry, rx + rw, ry], [rx + rw, ry, rx + rw, ry + rh], [rx + rw, ry + rh, rx, ry + rh], [rx, ry + rh, rx, ry]];
  for (const [ex1, ey1, ex2, ey2] of edges) if (segSeg(x1, y1, x2, y2, ex1, ey1, ex2, ey2)) return true;
  return false;
}
function segSeg(ax: number, ay: number, bx: number, by: number, cx: number, cy: number, dx: number, dy: number): boolean {
  const d1 = cross(cx, cy, dx, dy, ax, ay), d2 = cross(cx, cy, dx, dy, bx, by);
  const d3 = cross(ax, ay, bx, by, cx, cy), d4 = cross(ax, ay, bx, by, dx, dy);
  return ((d1 > 0) !== (d2 > 0)) && ((d3 > 0) !== (d4 > 0));
}
function cross(ax: number, ay: number, bx: number, by: number, px: number, py: number): number {
  return (bx - ax) * (py - ay) - (by - ay) * (px - ax);
}
function blocked(x1: number, y1: number, x2: number, y2: number, walls: WallDef[]): boolean {
  return walls.some((w) => segRect(x1, y1, x2, y2, w.x - w.w / 2, w.y - w.h / 2, w.w, w.h));
}

const ARC_COS = Math.cos((SHIELD_ARC_HALF_DEG * Math.PI) / 180);
const DEAD_Y = WORLD.height - 44;

/** Would a dash from (fx,fy) into a STATIC shielded enemy hit its front arc? */
function frontStatic(e: SpawnDef, fx: number, fy: number): boolean {
  if (e.kind !== 'shielded') return false;          // orbiter/phaser are dynamic → eventually open
  const facing = e.facing ?? UP;
  const ax = e.x - fx, ay = e.y - fy;
  const len = Math.hypot(ax, ay) || 1;
  const d = (ax / len) * Math.cos(facing) + (ay / len) * Math.sin(facing);
  return d < -ARC_COS;
}

/** Direct wall-free, non-front approach from a source point. */
function killableDirect(e: SpawnDef, sx: number, sy: number, walls: WallDef[]): boolean {
  return !blocked(sx, sy, e.x, e.y, walls) && !frontStatic(e, sx, sy);
}

/** Border-bounce approach: reflect off x=0, x=W (vertical) or y=0 (top) to strike the open side. */
function killableBounce(e: SpawnDef, sx: number, sy: number, walls: WallDef[]): boolean {
  // Vertical borders: mirror enemy across x=border.
  for (const border of [0, WORLD.width]) {
    const mx = 2 * border - e.x;
    if (mx === sx) continue;
    const t = (border - sx) / (mx - sx);
    if (t <= 0 || t >= 1) continue;
    const by = sy + t * (e.y - sy);
    if (by < 16 || by > DEAD_Y) continue;
    if (blocked(sx, sy, border, by, walls)) continue;
    if (blocked(border, by, e.x, e.y, walls)) continue;
    if (frontStatic(e, border, by)) continue;
    return true;
  }
  // Top border: mirror enemy across y=0.
  const my = -e.y;
  if (my !== sy) {
    const t = (0 - sy) / (my - sy);
    if (t > 0 && t < 1) {
      const bx = sx + t * (e.x - sx);
      if (bx >= 16 && bx <= WORLD.width - 16 && !blocked(sx, sy, bx, 0, walls) && !blocked(bx, 0, e.x, e.y, walls) && !frontStatic(e, bx, 0)) return true;
    }
  }
  return false;
}

/**
 * Headless solvability: every enemy must be killable (wall-free, non-front)
 * from the ninja start, a platform top, OR another killable enemy — directly
 * OR via a border bounce. Catches enemies that walls/facing have boxed off.
 */
export function assertSolvable(): string[] {
  const issues: string[] = [];
  for (const lv of LEVELS) {
    const start = lv.platforms.reduce((a, b) => (b.y > a.y ? b : a));
    const sources = [{ x: start.x, y: start.y - 16 }, ...lv.platforms.map((p) => ({ x: p.x, y: p.y - 16 }))];
    const reached = new Array(lv.enemies.length).fill(false);
    const can = (e: SpawnDef, sx: number, sy: number) => killableDirect(e, sx, sy, lv.walls) || killableBounce(e, sx, sy, lv.walls);

    let changed = true;
    while (changed) {
      changed = false;
      for (let i = 0; i < lv.enemies.length; i++) {
        if (reached[i]) continue;
        const e = lv.enemies[i];
        const fromSource = sources.some((s) => can(e, s.x, s.y));
        const fromEnemy = !fromSource && lv.enemies.some((o, j) => reached[j] && can(e, o.x, o.y));
        if (fromSource || fromEnemy) { reached[i] = true; changed = true; }
      }
    }
    reached.forEach((r, i) => { if (!r) issues.push(`Level ${lv.id} (${lv.name}): enemy #${i} ${lv.enemies[i].kind} @${lv.enemies[i].x},${lv.enemies[i].y} facing ${lv.enemies[i].facing ?? 'n/a'} is unsolvable`); });
  }
  return issues;
}
