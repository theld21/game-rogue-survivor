import { CreatureKind, CREATURES, CREATURE_KINDS, ResourceKind, WORLD, ZONES } from '../config.ts';

// =====================================================================
// WorldGen.ts — deterministic procedural dive. Pure module (no Phaser).
// Scatters rocks, embedded ore/crystal/pearl NODES, drifting salvage/pearl
// LOOSE items, behaviour-tagged creatures by depth, vents & decor. Seeded.
// =====================================================================

export interface RockDef { x: number; y: number; r: number; seed: number; }
export interface NodeDef { kind: ResourceKind; x: number; y: number; }
export interface LooseDef { kind: ResourceKind; x: number; y: number; }
export interface CreatureDef { kind: CreatureKind; x: number; y: number; }
export interface VentDef { x: number; y: number; }
export interface DecorDef { kind: 'kelp' | 'coral'; x: number; y: number; h: number; }
export interface WorldData { rocks: RockDef[]; nodes: NodeDef[]; loose: LooseDef[]; creatures: CreatureDef[]; vents: VentDef[]; decor: DecorDef[]; }

function mulberry32(a: number) {
  return function () { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
function zoneAt(y: number): number { let z = 0; for (let i = 0; i < ZONES.length; i++) if (y >= ZONES[i].yStart) z = i; return z; }

export function generateWorld(seed = 7): WorldData {
  const rng = mulberry32(seed);
  const W = WORLD.width, H = WORLD.height, top = WORLD.surfaceY + 280;
  const rocks: RockDef[] = [], nodes: NodeDef[] = [], loose: LooseDef[] = [], creatures: CreatureDef[] = [], vents: VentDef[] = [], decor: DecorDef[] = [];

  // Rocks — line the walls of the (now wider) channel + mid spires.
  for (let y = top; y < H - 120; y += 150 + rng() * 110) {
    if (rng() < 0.85) { const r = 70 + rng() * 150; rocks.push({ x: r * 0.5 + rng() * 60, y, r, seed: Math.floor(rng() * 1e6) }); }
    if (rng() < 0.85) { const r = 70 + rng() * 150; rocks.push({ x: W - r * 0.5 - rng() * 60, y: y + 70, r, seed: Math.floor(rng() * 1e6) }); }
    if (rng() < 0.3) { const r = 50 + rng() * 110; rocks.push({ x: W * 0.25 + rng() * W * 0.5, y: y + 40, r, seed: Math.floor(rng() * 1e6) }); }
  }

  // Embedded nodes (clawed): ore shallow, crystal twilight, pearl abyss.
  for (let y = top + 120; y < H - 160; y += 170 + rng() * 150) {
    const z = zoneAt(y); const x = 260 + rng() * (W - 520);
    let kind: ResourceKind; const r = rng();
    if (z === 0) kind = r < 0.82 ? 'ore' : 'crystal';
    else if (z === 1) kind = r < 0.42 ? 'ore' : 'crystal';
    else kind = r < 0.5 ? 'crystal' : 'pearl';
    nodes.push({ kind, x, y });
    if (rng() < 0.3) nodes.push({ kind: z === 0 ? 'ore' : 'crystal', x: 260 + rng() * (W - 520), y: y + 60 });
  }

  // Loose drifting items (clawed mid-water): salvage relics + rare pearls.
  for (let y = ZONES[1].yStart; y < H - 160; y += 360 + rng() * 320) {
    const z = zoneAt(y); loose.push({ kind: 'salvage', x: 240 + rng() * (W - 480), y });
    if (z === 2 && rng() < 0.5) loose.push({ kind: 'pearl', x: 240 + rng() * (W - 480), y: y + 120 });
  }

  // Creatures — pick a species whose zoneMin <= local zone.
  for (let y = top + 360; y < H - 200; y += 320 + rng() * 240) {
    const z = zoneAt(y); const x = 220 + rng() * (W - 440);
    const cand = CREATURE_KINDS.filter((k) => CREATURES[k].zoneMin <= z);
    const kind = cand[Math.floor(rng() * cand.length)];
    creatures.push({ kind, x, y });
    if (rng() < 0.3) creatures.push({ kind: cand[Math.floor(rng() * cand.length)], x: 220 + rng() * (W - 440), y: y + 120 });
  }

  // Thermal vents — trench & abyss.
  for (let y = ZONES[1].yStart + 200; y < H - 120; y += 560 + rng() * 380) vents.push({ x: 180 + rng() * (W - 360), y: y + rng() * 220 });

  // Decor.
  for (let y = top; y < H - 100; y += 110 + rng() * 90) {
    const z = zoneAt(y);
    if (z === 0 && rng() < 0.5) decor.push({ kind: 'kelp', x: 60 + rng() * (W - 120), y, h: 70 + rng() * 130 });
    else if (rng() < 0.4) decor.push({ kind: 'coral', x: 60 + rng() * (W - 120), y, h: 24 + rng() * 44 });
  }

  return { rocks, nodes, loose, creatures, vents, decor };
}
