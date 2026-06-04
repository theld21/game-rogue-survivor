import localforage from 'localforage';
import { UPGRADES, UpgradeKey, ConsumableKey } from '../config.ts';

// =====================================================================
// GameState.ts — Persistent player profile.
//
// In-memory `data` is the synchronous source of truth; hydrate once on
// boot, then write-through (fire-and-forget) to localforage on every
// mutation so credits/upgrades survive app restarts.
// =====================================================================

export interface ProfileData {
  credits: number;
  highestLevel: number;
  bestRunCredits: number;
  totalRuns: number;
  musicVol: number;
  sfxVol: number;
  upgrades: {
    laser: number;
    claw: number;
    fuel: number;
    radar: number;
  };
  consumables: {
    magnet: number;
    overcharge: number;
    multishot: number;
  };
}

const STORE_KEY = 'cosmic_miner_profile_v1';

const DEFAULT: ProfileData = {
  credits: 0,
  highestLevel: 1,
  bestRunCredits: 0,
  totalRuns: 0,
  musicVol: 0.5,
  sfxVol: 0.8,
  upgrades: { laser: 0, claw: 0, fuel: 0, radar: 0 },
  consumables: { magnet: 0, overcharge: 0, multishot: 0 },
};

localforage.config({ name: 'CosmicMiner', storeName: 'profile' });

export class GameState {
  private static data: ProfileData = { ...DEFAULT, upgrades: { ...DEFAULT.upgrades } };
  private static ready = false;

  static async hydrate(): Promise<ProfileData> {
    try {
      const saved = await localforage.getItem<ProfileData>(STORE_KEY);
      if (saved) {
        this.data = {
          ...DEFAULT,
          ...saved,
          upgrades: { ...DEFAULT.upgrades, ...(saved.upgrades ?? {}) },
          consumables: { ...DEFAULT.consumables, ...(saved.consumables ?? {}) },
        };
      }
    } catch (e) {
      console.warn('[GameState] hydrate failed, using volatile profile', e);
      this.data = { ...DEFAULT, upgrades: { ...DEFAULT.upgrades }, consumables: { ...DEFAULT.consumables } };
    }
    this.ready = true;
    return this.data;
  }

  private static persist(): void {
    if (!this.ready) return;
    void localforage.setItem(STORE_KEY, this.data).catch(() => {});
  }

  // ---- Credits ------------------------------------------------------
  static getCredits(): number { return this.data.credits; }
  static addCredits(n: number): void {
    this.data.credits = Math.max(0, this.data.credits + Math.round(n));
    this.persist();
  }
  static spendCredits(n: number): boolean {
    if (this.data.credits >= n) {
      this.data.credits -= n;
      this.persist();
      return true;
    }
    return false;
  }

  // ---- Progression --------------------------------------------------
  static getHighestLevel(): number { return this.data.highestLevel; }
  static unlockLevel(level: number, maxLevel: number): void {
    const next = Math.min(maxLevel, level);
    if (next > this.data.highestLevel) this.data.highestLevel = next;
    this.persist();
  }
  static recordRun(creditsEarned: number): void {
    this.data.totalRuns += 1;
    if (creditsEarned > this.data.bestRunCredits) this.data.bestRunCredits = creditsEarned;
    this.persist();
  }
  static getBestRun(): number { return this.data.bestRunCredits; }
  static getTotalRuns(): number { return this.data.totalRuns; }

  // ---- Audio --------------------------------------------------------
  static getMusicVol(): number { return this.data.musicVol; }
  static getSfxVol(): number { return this.data.sfxVol; }
  static setMusicVol(v: number): void { this.data.musicVol = clamp01(v); this.persist(); }
  static setSfxVol(v: number): void { this.data.sfxVol = clamp01(v); this.persist(); }

  // ---- Upgrades -----------------------------------------------------
  static getUpgradeLevel(key: UpgradeKey): number { return this.data.upgrades[key]; }

  static canUpgrade(key: UpgradeKey): boolean {
    return this.data.upgrades[key] < UPGRADES[key].maxLevel;
  }
  static upgradeCost(key: UpgradeKey): number {
    return UPGRADES[key].cost(this.data.upgrades[key]);
  }
  static buyUpgrade(key: UpgradeKey): boolean {
    if (!this.canUpgrade(key)) return false;
    if (!this.spendCredits(this.upgradeCost(key))) return false;
    this.data.upgrades[key]++;
    this.persist();
    return true;
  }

  // ---- Effective stats from upgrades --------------------------------
  static laserDamageMult(): number {
    return 1 + this.data.upgrades.laser * UPGRADES.laser.bonusPct;
  }
  static clawSpeedMult(): number {
    return 1 + this.data.upgrades.claw * UPGRADES.claw.bonusPct;
  }
  static fuelDrainMult(): number {
    return Math.max(0.2, 1 - this.data.upgrades.fuel * UPGRADES.fuel.bonusPct);
  }
  static radarLevel(): number {
    return this.data.upgrades.radar;
  }

  // ---- Consumables (active items) -----------------------------------
  static getConsumable(key: ConsumableKey): number { return this.data.consumables[key]; }
  static addConsumable(key: ConsumableKey, n = 1): void {
    this.data.consumables[key] = Math.max(0, this.data.consumables[key] + n);
    this.persist();
  }
  /** Spend one if available. Returns true on success. */
  static useConsumable(key: ConsumableKey): boolean {
    if (this.data.consumables[key] <= 0) return false;
    this.data.consumables[key]--;
    this.persist();
    return true;
  }

  static reset(): void {
    this.data = { ...DEFAULT, upgrades: { ...DEFAULT.upgrades }, consumables: { ...DEFAULT.consumables } };
    this.persist();
  }
}

function clamp01(v: number): number { return Math.min(1, Math.max(0, v)); }

export default GameState;
