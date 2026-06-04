// =====================================================================
// Levels.ts — 20 delivery routes as PARAMETER records + a corridor-first
// generator. Geometry is generated (not hand-placed) so it's compact,
// deterministic (seeded by route id), and PROVABLY solvable — every gate
// gap is ≥ the entity-derived minimum and the gate path stays in bounds.
//
// Pure module (no Phaser) → the reachability assertion runs headless.
// =====================================================================

import { GEN, WORLD, CargoKind, ThemeKey, CARGO_TYPES } from '../config.ts';

const W = WORLD.width;

export interface WallDef { x: number; y: number; w: number; h: number; }

export type HazardDef =
  | { type: 'mover'; x: number; y: number; w: number; h: number; range: number; speed: number; phase: number }
  | { type: 'wind'; x: number; y: number; w: number; h: number; accelX: number };

export interface RouteDef {
  id: number;
  tier: number;          // 1..4 (difficulty band / region)
  theme: ThemeKey;
  name: string;
  gateCount: number;     // number of wall gates to pass
  gapWidth: number;      // opening width (>= GEN.minGap, enforced)
  drift: number;         // max horizontal wander of consecutive gates
  gateSpacing: number;   // vertical px between gates
  cargoAllowed: CargoKind[];
  gravityMul: number;
  movers: number;        // moving platforms (tier-gated)
  winds: number;         // wind zones (tier-gated)
  reward: number;
}

export interface RouteGeometry {
  worldHeight: number;
  pickup: { x: number; y: number };
  pad: { cx: number; topY: number; w: number };
  walls: WallDef[];
  hazards: HazardDef[];
}

// ---- Deterministic RNG (mulberry32) — stable geometry per route ----
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

// ---- Route definitions (compact params; geometry is generated) ----
const NAMES = [
  'Rooftop Run', 'Neon Alley', 'Skyline Hop', 'Dawn Delivery', 'Plaza Drop',
  'Midnight Mile', 'Glass Canyon', 'Circuit Maze', 'Vortex Vault', 'Pulse Tower',
  'Foundry Fall', 'Piston Pass', 'Molten Maze', 'Gear Gorge', 'Furnace Chute',
  'Storm Spiral', 'Tempest Towers', 'Ion Gauntlet', 'Orbit Gate', 'The Crucible',
];
const TIER_THEME: ThemeKey[] = ['sunset', 'night', 'industrial', 'orbital'];

export const ROUTES: RouteDef[] = Array.from({ length: 20 }, (_, i) => {
  const id = i + 1;
  const tier = Math.min(4, Math.floor(i / 5) + 1);          // 5 routes per tier
  const within = i % 5;                                     // 0..4 within tier
  const theme: ThemeKey = (tier === 4 ? (within < 3 ? 'storm' : 'orbital') : TIER_THEME[tier - 1]);
  // Difficulty scales with both tier and position-in-tier.
  const diff = (tier - 1) * 5 + within;                     // 0..19
  const gateCount = 4 + Math.floor(diff / 2.0);             // 4 → ~13 (even route 1 winds)
  const gapWidth = Math.round(clamp(158 - diff * 3.2, GEN.minGap + 6, 158));  // tighter: no free-fall
  const drift = Math.round(70 + diff * 3.4);                // zigzag amplitude (capped in generator)
  const gateSpacing = Math.round(clamp(205 - diff * 2.4, 150, 205));
  const cargoAllowed: CargoKind[] =
    tier === 1 ? ['iron']
      : tier === 2 ? ['iron', 'alloy']
      : tier === 3 ? ['iron', 'alloy', 'crystal', 'nuclear']
      : ['alloy', 'crystal', 'nuclear', 'reactor'];
  return {
    id, tier, theme, name: NAMES[i],
    gateCount, gapWidth, drift, gateSpacing,
    cargoAllowed,
    gravityMul: 1 + (tier - 1) * 0.06,
    movers: tier >= 2 ? Math.min(3, within) : 0,
    winds: tier >= 3 ? Math.min(2, Math.floor(within / 2) + 1) : 0,
    reward: diff * 18,
  };
});

export const MAX_ROUTE = ROUTES.length;
export function getRoute(id: number): RouteDef { return ROUTES.find((r) => r.id === id) ?? ROUTES[0]; }

// ---- Corridor-first geometry generator ----
export function generateGeometry(route: RouteDef): RouteGeometry {
  const rand = rng(route.id * 1009 + 7);
  const gap = route.gapWidth;
  const half = gap / 2;
  const minX = half + GEN.sideMargin;
  const maxX = W - half - GEN.sideMargin;

  const worldHeight = GEN.topMargin + route.gateCount * route.gateSpacing + GEN.bottomMargin;

  // ZIGZAG gates: centres alternate left/right each gate so the player MUST
  // steer back and forth (no free-fall path). Amplitude is capped to stay
  // flyable within one gate spacing.
  const amp = Math.min(route.drift, route.gateSpacing * 0.65, (maxX - minX) / 2);
  const gateX: number[] = [];
  const gateY: number[] = [];
  let side = rand() < 0.5 ? -1 : 1;
  for (let i = 0; i < route.gateCount; i++) {
    const jitter = (rand() - 0.5) * amp * 0.5;
    const cx = clamp(W / 2 + side * amp + jitter, minX, maxX);
    gateX.push(cx);
    gateY.push(GEN.topMargin + (i + 1) * route.gateSpacing);
    side = -side;
  }

  // Walls flanking each gate.
  const walls: WallDef[] = [];
  const th = GEN.wallThickness;
  for (let i = 0; i < route.gateCount; i++) {
    const gx = gateX[i], gy = gateY[i];
    const leftW = gx - half;                 // span [0, gx-half]
    const rightStart = gx + half;
    const rightW = W - rightStart;           // span [gx+half, W]
    if (leftW > 6) walls.push({ x: leftW / 2, y: gy, w: leftW, h: th });
    if (rightW > 6) walls.push({ x: rightStart + rightW / 2, y: gy, w: rightW, h: th });
  }

  // Pickup above the first gate. Pad sits on the OPPOSITE side of the last
  // gate, forcing a final lateral push — you can never just drop onto it.
  const pickup = { x: gateX[0], y: GEN.topMargin - 50 };
  const padW = clamp(140 - route.tier * 8, 88, 140);
  const lastSide = Math.sign(gateX[gateX.length - 1] - W / 2) || 1;
  // Offset to the opposite side for a final lateral push, but modestly so a
  // laden drone can still thread into it within the bottom clearance.
  const padCx = clamp(W / 2 - lastSide * amp * 0.45, padW / 2 + 8, W - padW / 2 - 8);
  const pad = { cx: padCx, topY: worldHeight - 50, w: padW };

  // Hazards placed in the OPEN corridor between gates (never blocking the gap).
  const hazards: HazardDef[] = [];
  for (let m = 0; m < route.movers; m++) {
    const gi = 1 + Math.floor(rand() * Math.max(1, route.gateCount - 2));
    const y = (gateY[gi - 1] + gateY[gi]) / 2;
    const w = 60 + rand() * 50;
    const x = clamp(gateX[gi] + (rand() - 0.5) * 80, w / 2 + 10, W - w / 2 - 10);
    hazards.push({ type: 'mover', x, y, w, h: th, range: 50 + rand() * 60, speed: 40 + rand() * 50, phase: rand() * Math.PI * 2 });
  }
  for (let wd = 0; wd < route.winds; wd++) {
    const gi = 1 + Math.floor(rand() * Math.max(1, route.gateCount - 1));
    const y = (gateY[gi - 1] + gateY[gi]) / 2;
    hazards.push({ type: 'wind', x: gateX[gi], y, w: 150, h: route.gateSpacing * 0.7, accelX: (rand() < 0.5 ? -1 : 1) * (120 + rand() * 100) });
  }

  return { worldHeight, pickup, pad, walls, hazards };
}

/**
 * Headless reachability check — asserts every route is flyable by construction.
 * Returns a list of problems (empty = all good). Run from a test harness.
 */
export function assertReachable(): string[] {
  const issues: string[] = [];
  for (const route of ROUTES) {
    if (route.gapWidth < GEN.minGap) issues.push(`Route ${route.id}: gap ${route.gapWidth} < minGap ${GEN.minGap}`);
    const geo = generateGeometry(route);
    // Recover gate centres from wall pairs by y.
    const byY = new Map<number, WallDef[]>();
    for (const wll of geo.walls) { const a = byY.get(wll.y) ?? []; a.push(wll); byY.set(wll.y, a); }
    let prevX: number | null = null;
    for (const [y, pair] of byY) {
      // Gap = the open span between the two flanking walls (or wall→edge).
      const left = pair.find((p) => p.x - p.w / 2 <= 1);
      const right = pair.find((p) => p.x + p.w / 2 >= W - 1);
      const leftEdge = left ? left.x + left.w / 2 : 0;
      const rightEdge = right ? right.x - right.w / 2 : W;
      const gap = rightEdge - leftEdge;
      if (gap < GEN.minGap - 1) issues.push(`Route ${route.id} @y${y}: gap ${gap.toFixed(0)} < minGap ${GEN.minGap}`);
      const gx = (leftEdge + rightEdge) / 2;
      // Flyability: horizontal travel between gates must fit within the
      // vertical drop (drone can steer ~1.6× the descent sideways).
      if (prevX !== null && Math.abs(gx - prevX) > route.gateSpacing * 1.6) issues.push(`Route ${route.id} @y${y}: lateral ${(gx - prevX).toFixed(0)} > flyable ${(route.gateSpacing * 1.6).toFixed(0)}`);
      prevX = gx;
    }
    if (geo.worldHeight < WORLD.height) issues.push(`Route ${route.id}: worldHeight ${geo.worldHeight} < view ${WORLD.height}`);
    // Pad must sit a clear distance below the last gate AND be reachable
    // laterally within that vertical gap (so a laden drone can thread in).
    const lastGateY = GEN.topMargin + route.gateCount * route.gateSpacing;
    const vGap = geo.pad.topY - lastGateY;
    if (vGap < GEN.padApproach - 1) issues.push(`Route ${route.id}: pad clearance ${vGap.toFixed(0)} < ${GEN.padApproach}`);
    if (prevX !== null && Math.abs(geo.pad.cx - prevX) > vGap * 1.6) issues.push(`Route ${route.id}: pad lateral ${(geo.pad.cx - prevX).toFixed(0)} unreachable in ${vGap.toFixed(0)}`);
  }
  // Sanity: minGap must actually fit the largest cargo + drone through.
  const need = Math.max(2 * 18, 2 * Math.max(...Object.values(CARGO_TYPES).map((c) => c.radius)));
  if (GEN.minGap < need) issues.push(`minGap ${GEN.minGap} < entity need ${need}`);
  return issues;
}

export { W as WORLD_W };
