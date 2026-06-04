import localforage from 'localforage';
import type { Lang } from './i18n.ts';
import { UPGRADE_SHOP } from './GameConfig.ts';

// =====================================================================
// Storage.ts — Persistent player profile.
//
// Two-currency design:
//   ☀️ suns  — persistent, earned from map sun pickups + level-clear bonus.
//              Used ONLY for permanent upgrades in the home-screen shop.
//   🪙 gold  — session-only, tracked by PlayScene (not stored here).
//              Earned by selling loot in the harbour, spent on repairs/gear
//              within that same level run, reset to 0 on level start.
// =====================================================================

export interface ProfileData {
  suns: number;
  highestLevel: number;
  levelsCleared: number[];
  totalRaids: number;
  lang: Lang;
  musicVol: number;
  sfxVol: number;
  upgrades: {
    speed: number;
    fireRate: number;
    hp: number;
  };
}

// Bump key so stale v2 profiles (which had `gold`) don't cause confusion.
const STORE_KEY = 'sea_of_neon_profile_v3';

const DEFAULT: ProfileData = {
  suns: 0,
  highestLevel: 1,
  levelsCleared: [],
  totalRaids: 0,
  lang: 'en',
  musicVol: 0.55,
  sfxVol: 0.85,
  upgrades: { speed: 0, fireRate: 0, hp: 0 },
};

localforage.config({ name: 'SeaOfNeon', storeName: 'profile' });

export class Storage {
  private static data: ProfileData = { ...DEFAULT, upgrades: { ...DEFAULT.upgrades } };
  private static ready = false;

  static async hydrate(): Promise<ProfileData> {
    try {
      // Try v3 first
      let saved = await localforage.getItem<ProfileData>(STORE_KEY);
      if (!saved) {
        // Migrate from v2: `gold` → `suns`
        const v2 = await localforage.getItem<any>('sea_of_neon_profile_v2');
        if (v2) saved = { ...v2, suns: v2.gold ?? 0 };
      }
      if (saved) {
        this.data = {
          ...DEFAULT,
          ...saved,
          upgrades: { ...DEFAULT.upgrades, ...(saved.upgrades ?? {}) },
        };
        if (!Array.isArray(this.data.levelsCleared)) this.data.levelsCleared = [];
      }
    } catch (e) {
      console.warn('[Storage] hydrate failed', e);
      this.data = { ...DEFAULT, upgrades: { ...DEFAULT.upgrades } };
    }
    this.ready = true;
    return this.data;
  }

  private static persist(): void {
    if (!this.ready) return;
    void localforage.setItem(STORE_KEY, this.data).catch(() => {});
  }

  // ---- ☀️ Suns (meta currency) -----------------------------------
  static getSuns(): number { return this.data.suns; }

  static addSuns(amount: number): void {
    this.data.suns = Math.max(0, this.data.suns + Math.round(amount));
    this.persist();
  }

  static spendSuns(amount: number): boolean {
    if (this.data.suns >= amount) {
      this.data.suns -= amount;
      this.persist();
      return true;
    }
    return false;
  }

  // ---- Level progression ----------------------------------------
  static getHighestLevel(): number { return this.data.highestLevel; }
  static isLevelUnlocked(level: number): boolean { return level <= this.data.highestLevel; }
  static isLevelCleared(level: number): boolean { return this.data.levelsCleared.includes(level); }
  static getTotalRaids(): number { return this.data.totalRaids; }

  static markLevelCleared(level: number, maxLevel: number): void {
    if (!this.data.levelsCleared.includes(level)) this.data.levelsCleared.push(level);
    this.data.totalRaids += 1;
    const next = Math.min(maxLevel, level + 1);
    if (next > this.data.highestLevel) this.data.highestLevel = next;
    this.persist();
  }

  // ---- Language / audio ----------------------------------------
  static getLang(): Lang { return this.data.lang; }
  static setLang(lang: Lang): void { this.data.lang = lang; this.persist(); }
  static getMusicVol(): number { return this.data.musicVol; }
  static getSfxVol(): number { return this.data.sfxVol; }
  static setMusicVol(v: number): void { this.data.musicVol = Math.min(1, Math.max(0, v)); this.persist(); }
  static setSfxVol(v: number): void { this.data.sfxVol = Math.min(1, Math.max(0, v)); this.persist(); }

  // ---- Permanent upgrades (paid in ☀️ suns) ---------------------
  static getUpgradeLevel(key: 'speed' | 'fireRate' | 'hp'): number {
    return this.data.upgrades[key];
  }
  static canUpgrade(key: 'speed' | 'fireRate' | 'hp'): boolean {
    return this.data.upgrades[key] < UPGRADE_SHOP[key].maxLevel;
  }
  static upgradeCost(key: 'speed' | 'fireRate' | 'hp'): number {
    return UPGRADE_SHOP[key].cost(this.data.upgrades[key]);
  }
  static buyUpgrade(key: 'speed' | 'fireRate' | 'hp'): boolean {
    if (!this.canUpgrade(key)) return false;
    if (!this.spendSuns(this.upgradeCost(key))) return false;
    this.data.upgrades[key]++;
    this.persist();
    return true;
  }

  // ---- Effective player stats from permanent upgrades -----------
  static effectiveMaxSpeed(base: number): number {
    return Math.round(base * (1 + this.data.upgrades.speed * UPGRADE_SHOP.speed.bonusPct));
  }
  static effectiveFireCooldown(base: number): number {
    return Math.round(base * (1 - this.data.upgrades.fireRate * UPGRADE_SHOP.fireRate.bonusPct));
  }
  static effectiveMaxHp(base: number): number {
    return base + this.data.upgrades.hp * UPGRADE_SHOP.hp.bonusFlat;
  }

  static reset(): void {
    this.data = { ...DEFAULT, upgrades: { ...DEFAULT.upgrades } };
    this.persist();
  }
}

export default Storage;
