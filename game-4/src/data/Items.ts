import { RARITY, Rarity } from '../core/GameConfig.ts';
import type { Lang } from '../core/i18n.ts';

// =====================================================================
// Items.ts — Loot catalogue + sea-item definitions.
// =====================================================================

export interface ItemDef {
  id: string;
  name: string;         // Vietnamese
  nameEn: string;       // English
  rarity: Rarity;
  glyph: string;
  seaItem?: boolean;    // floating sea collectible (not a cargo item)
}

export interface ItemStack {
  def: ItemDef;
  uid: number;
}

export const ITEMS: Record<string, ItemDef> = {
  barrel:   { id: 'barrel',   name: 'Thùng Rượu',     nameEn: 'Rum Barrel',    rarity: 'common',    glyph: '🛢️' },
  rope:     { id: 'rope',     name: 'Cuộn Thừng',     nameEn: 'Rope Coil',     rarity: 'common',    glyph: '🪢' },
  fish:     { id: 'fish',     name: 'Cá Khô',         nameEn: 'Dried Fish',    rarity: 'common',    glyph: '🐟' },
  plank:    { id: 'plank',    name: 'Ván Gỗ',         nameEn: 'Oak Plank',     rarity: 'common',    glyph: '🪵' },
  coin:     { id: 'coin',     name: 'Túi Bạc',        nameEn: 'Silver Pouch',  rarity: 'rare',      glyph: '🪙' },
  rum:      { id: 'rum',      name: 'Rượu Rum Hảo',   nameEn: 'Fine Rum',      rarity: 'rare',      glyph: '🍾' },
  spice:    { id: 'spice',    name: 'Hộp Gia Vị',     nameEn: 'Spice Box',     rarity: 'rare',      glyph: '🧂' },
  pearl:    { id: 'pearl',    name: 'Ngọc Trai',      nameEn: 'Pearl',         rarity: 'epic',      glyph: '🦪' },
  gem:      { id: 'gem',      name: 'Đá Quý Neon',    nameEn: 'Neon Gem',      rarity: 'epic',      glyph: '💎' },
  cannon:   { id: 'cannon',   name: 'Đại Bác Cổ',     nameEn: 'Old Cannon',    rarity: 'epic',      glyph: '🔫' },
  crown:    { id: 'crown',    name: 'Vương Miện',     nameEn: 'Gold Crown',    rarity: 'legendary', glyph: '👑' },
  skullgem: { id: 'skullgem', name: 'Sọ Vàng',        nameEn: 'Skull Gem',     rarity: 'legendary', glyph: '💀' },
  chest:    { id: 'chest',    name: 'Rương Báu',      nameEn: 'Treasure Chest',rarity: 'legendary', glyph: '🧰' },
  // Sea-only floating collectibles (not in cargo pool, instant reward on collect)
  // Icons chosen for rarity & visual distinctiveness in a neon-sea setting:
  //   🔮 crystal ball  — mystical sea oracle, gives gold bonus
  //   🧿 nazar amulet  — ancient sea talisman, restores HP
  sea_map:    { id: 'sea_map',    name: 'Tiên Tri Biển', nameEn: 'Sea Oracle',   rarity: 'rare',  glyph: '🔮', seaItem: true },
  sea_potion: { id: 'sea_potion', name: 'Bùa Hộ Mệnh',  nameEn: 'Sea Talisman', rarity: 'epic',  glyph: '🧿', seaItem: true },
};

/** Localised item name helper. */
export function itemName(def: ItemDef, lang: Lang): string {
  return lang === 'en' ? def.nameEn : def.name;
}

/** Support item names, both languages. */
export const SUPPORT_ITEM_NAMES: Record<string, { vi: string; en: string }> = {
  explosive_shells: { vi: 'Đạn Nổ',    en: 'Explosive Shells' },
  tailwind:         { vi: 'Gió Thuận', en: 'Tailwind' },
  hull_armor:       { vi: 'Vỏ Giáp',   en: 'Hull Armor' },
  quick_repair:     { vi: 'Sửa Nhanh', en: 'Quick Repair' },
  rapid_fire:       { vi: 'Bắn Nhanh', en: 'Rapid Fire' },
};

export function supportItemName(id: string, lang: Lang): string {
  const n = SUPPORT_ITEM_NAMES[id];
  if (!n) return id;
  return lang === 'en' ? n.en : n.vi;
}

/** Sell value for an item, scaled a touch by level depth. */
export function valueOf(def: ItemDef, level = 1): number {
  const base = RARITY[def.rarity].value;
  return Math.round(base * (1 + (level - 1) * 0.12));
}

/** Gold reward when collecting a sea item. */
export function seaItemReward(def: ItemDef, level: number): number {
  if (def.id === 'sea_map')    return 60 + level * 10;
  if (def.id === 'sea_potion') return 0; // heals instead
  return 40;
}

const ISLAND_POOL: string[] = [
  'barrel', 'barrel', 'rope', 'rope', 'fish', 'fish', 'plank', 'plank',
  'coin', 'rum', 'spice', 'pearl', 'gem',
];

const ENEMY_POOL: string[] = [
  'coin', 'rum', 'spice', 'pearl', 'pearl', 'gem', 'gem', 'cannon',
  'crown', 'skullgem',
];

const SEA_ITEM_POOL: string[] = ['sea_map', 'sea_map', 'sea_potion'];

let UID = 1;

function makeStack(id: string): ItemStack {
  return { def: ITEMS[id], uid: UID++ };
}

export function rollIslandLoot(): ItemStack { return makeStack(ISLAND_POOL[Math.floor(Math.random() * ISLAND_POOL.length)]); }
export function rollEnemyLoot(): ItemStack  { return makeStack(ENEMY_POOL[Math.floor(Math.random() * ENEMY_POOL.length)]); }
export function rollSeaItem(): ItemDef       { return ITEMS[SEA_ITEM_POOL[Math.floor(Math.random() * SEA_ITEM_POOL.length)]]; }

export function rarityCss(def: ItemDef): string { return RARITY[def.rarity].css; }
