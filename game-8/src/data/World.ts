import { ElementKind, ELEMENTS, ELEMENT_KINDS, PlanetRole, WORLD } from '../config.ts';

// =====================================================================
// World.ts — deterministic planet layout. The MOTHER sits at spawn
// (centre). The other 15 planets are spread on an even angular ring so
// the two Storm and two Heal planets never cluster. Pure module.
// =====================================================================

export interface IslandData {
  id: number; name: string; role: PlanetRole; element?: ElementKind;
  x: number; y: number; radius: number;
}
export interface WorldData { islands: IslandData[]; motherId: number; }

function mulberry32(a: number) {
  return function () { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

// Ring order (15 entries) — storms at 0 & 8 (opposite), heals at 3 & 11 (apart),
// forge at 7, the 10 element planets fill the rest.
type Slot = { role: PlanetRole; element?: ElementKind };
function buildSlots(): Slot[] {
  const els = [...ELEMENT_KINDS];
  const take = (): ElementKind => els.shift()!;
  return [
    { role: 'storm' },
    { role: 'resource', element: take() },
    { role: 'resource', element: take() },
    { role: 'heal' },
    { role: 'resource', element: take() },
    { role: 'resource', element: take() },
    { role: 'resource', element: take() },
    { role: 'forge' },
    { role: 'storm' },
    { role: 'resource', element: take() },
    { role: 'resource', element: take() },
    { role: 'heal' },
    { role: 'resource', element: take() },
    { role: 'resource', element: take() },
    { role: 'resource', element: take() },
  ];
}

const FORGE_NAME = 'The Forge';
const STORM_NAMES = ['Voltspire', 'Thunderhead'];
const HEAL_NAMES = ['Verdant Spring', 'Mender Reef'];

export function generateWorld(seed = 1337): WorldData {
  const rng = mulberry32(seed);
  const cx = WORLD.width / 2, cy = WORLD.height / 2;
  const islands: IslandData[] = [];

  // Mother at spawn
  islands.push({ id: 0, name: 'Heart of the Sky', role: 'mother', x: cx, y: cy, radius: 175 });

  const slots = buildSlots();
  let storm = 0, heal = 0;
  slots.forEach((s, i) => {
    const a = (i / slots.length) * Math.PI * 2 + (rng() - 0.5) * 0.18;
    const dist = 880 + (i % 3) * 320 + (rng() - 0.5) * 120;   // 3 staggered rings
    const x = cx + Math.cos(a) * dist, y = cy + Math.sin(a) * dist;
    let radius = 90 + Math.floor(rng() * 30); let name = '';
    if (s.role === 'resource') { radius = 80 + Math.floor(rng() * 35); name = ELEMENTS[s.element!].name; }
    else if (s.role === 'storm') { radius = storm === 0 ? 150 : 95; name = STORM_NAMES[storm++]; }   // varied size → varied yield
    else if (s.role === 'heal') { radius = heal === 0 ? 145 : 100; name = HEAL_NAMES[heal++]; }
    else if (s.role === 'forge') { radius = 120; name = FORGE_NAME; }
    islands.push({ id: i + 1, name, role: s.role, element: s.element, x, y, radius });
  });

  return { islands, motherId: 0 };
}
