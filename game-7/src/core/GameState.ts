import localforage from 'localforage';
import { UPGRADES, UpgradeKey } from '../config.ts';

// =====================================================================
// GameState.ts — Persistent profile (write-through). Data Cubes are the
// meta currency; upgrades persist.
// =====================================================================

export interface ProfileData {
  dataCubes: number;
  highScore: number;
  highestLevel: number;
  clearedLevels: number[];
  musicVol: number;
  sfxVol: number;
  upgrades: { chain: number; parry: number; emp: number };
}

const STORE_KEY = 'cyber_slash_profile_v1';
const DEFAULT: ProfileData = {
  dataCubes: 0, highScore: 0, highestLevel: 1, clearedLevels: [],
  musicVol: 0.5, sfxVol: 0.8, upgrades: { chain: 0, parry: 0, emp: 0 },
};

localforage.config({ name: 'CyberSlash', storeName: 'profile' });

export class GameState {
  private static data: ProfileData = { ...DEFAULT, upgrades: { ...DEFAULT.upgrades }, clearedLevels: [] };
  private static ready = false;

  static async hydrate(): Promise<ProfileData> {
    try {
      const saved = await localforage.getItem<ProfileData>(STORE_KEY);
      if (saved) {
        this.data = {
          ...DEFAULT, ...saved,
          upgrades: { ...DEFAULT.upgrades, ...(saved.upgrades ?? {}) },
          clearedLevels: Array.isArray(saved.clearedLevels) ? saved.clearedLevels : [],
        };
      }
    } catch (e) {
      console.warn('[GameState] hydrate failed', e);
      this.data = { ...DEFAULT, upgrades: { ...DEFAULT.upgrades }, clearedLevels: [] };
    }
    this.ready = true;
    return this.data;
  }

  private static persist(): void {
    if (!this.ready) return;
    void localforage.setItem(STORE_KEY, this.data).catch(() => {});
  }

  // Currency
  static getCubes(): number { return this.data.dataCubes; }
  static addCubes(n: number): void { this.data.dataCubes = Math.max(0, this.data.dataCubes + Math.round(n)); this.persist(); }
  static spendCubes(n: number): boolean {
    if (this.data.dataCubes >= n) { this.data.dataCubes -= n; this.persist(); return true; }
    return false;
  }

  // Score / progression
  static getHighScore(): number { return this.data.highScore; }
  static recordScore(s: number): void { if (s > this.data.highScore) { this.data.highScore = s; this.persist(); } }
  static getHighestLevel(): number { return this.data.highestLevel; }
  static isLevelUnlocked(id: number): boolean { return id <= this.data.highestLevel; }
  static isLevelCleared(id: number): boolean { return this.data.clearedLevels.includes(id); }
  static clearLevel(id: number, maxLevel: number): void {
    if (!this.data.clearedLevels.includes(id)) this.data.clearedLevels.push(id);
    const next = Math.min(maxLevel, id + 1);
    if (next > this.data.highestLevel) this.data.highestLevel = next;
    this.persist();
  }

  // Audio
  static getMusicVol(): number { return this.data.musicVol; }
  static getSfxVol(): number { return this.data.sfxVol; }
  static setMusicVol(v: number): void { this.data.musicVol = clamp01(v); this.persist(); }
  static setSfxVol(v: number): void { this.data.sfxVol = clamp01(v); this.persist(); }

  // Upgrades
  static getUpgradeLevel(k: UpgradeKey): number { return this.data.upgrades[k]; }
  static canUpgrade(k: UpgradeKey): boolean { return this.data.upgrades[k] < UPGRADES[k].maxLevel; }
  static upgradeCost(k: UpgradeKey): number { return UPGRADES[k].cost(this.data.upgrades[k]); }
  static buyUpgrade(k: UpgradeKey): boolean {
    if (!this.canUpgrade(k)) return false;
    if (!this.spendCubes(this.upgradeCost(k))) return false;
    this.data.upgrades[k]++;
    this.persist();
    return true;
  }

  // Effective
  static chainLimit(base: number): number { return base + this.data.upgrades.chain; }
  static hasParry(): boolean { return this.data.upgrades.parry > 0; }
  static hasEmp(): boolean { return this.data.upgrades.emp > 0; }

  static reset(): void {
    this.data = { ...DEFAULT, upgrades: { ...DEFAULT.upgrades }, clearedLevels: [] };
    this.persist();
  }
}

function clamp01(v: number): number { return Math.min(1, Math.max(0, v)); }
export default GameState;
