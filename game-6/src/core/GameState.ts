import localforage from 'localforage';
import { UPGRADES, UpgradeKey } from '../config.ts';

// =====================================================================
// GameState.ts — Persistent profile (write-through to localforage).
// Hydrate once on boot; in-memory is the synchronous source of truth.
// =====================================================================

export interface ProfileData {
  credits: number;
  deliveries: number;
  bestStreak: number;
  unlockedRoute: number;        // highest route the player may attempt
  clearedRoutes: number[];      // route ids delivered at least once
  bestCredits: Record<number, number>;  // best payout per route id
  musicVol: number;
  sfxVol: number;
  upgrades: { engine: number; fuel: number; shield: number };
}

const STORE_KEY = 'neon_transporter_profile_v1';

const DEFAULT: ProfileData = {
  credits: 0,
  deliveries: 0,
  bestStreak: 0,
  unlockedRoute: 1,
  clearedRoutes: [],
  bestCredits: {},
  musicVol: 0.5,
  sfxVol: 0.8,
  upgrades: { engine: 0, fuel: 0, shield: 0 },
};

localforage.config({ name: 'NeonTransporter', storeName: 'profile' });

export class GameState {
  private static data: ProfileData = { ...DEFAULT, upgrades: { ...DEFAULT.upgrades } };
  private static ready = false;

  static async hydrate(): Promise<ProfileData> {
    try {
      const saved = await localforage.getItem<ProfileData>(STORE_KEY);
      if (saved) {
        this.data = {
          ...DEFAULT, ...saved,
          upgrades: { ...DEFAULT.upgrades, ...(saved.upgrades ?? {}) },
          bestCredits: { ...(saved.bestCredits ?? {}) },
          clearedRoutes: Array.isArray(saved.clearedRoutes) ? saved.clearedRoutes : [],
        };
      }
    } catch (e) {
      console.warn('[GameState] hydrate failed', e);
      this.data = { ...DEFAULT, upgrades: { ...DEFAULT.upgrades } };
    }
    this.ready = true;
    return this.data;
  }

  private static persist(): void {
    if (!this.ready) return;
    void localforage.setItem(STORE_KEY, this.data).catch(() => {});
  }

  // Credits
  static getCredits(): number { return this.data.credits; }
  static addCredits(n: number): void { this.data.credits = Math.max(0, this.data.credits + Math.round(n)); this.persist(); }
  static spendCredits(n: number): boolean {
    if (this.data.credits >= n) { this.data.credits -= n; this.persist(); return true; }
    return false;
  }

  // Stats
  static getDeliveries(): number { return this.data.deliveries; }
  static getBestStreak(): number { return this.data.bestStreak; }
  static recordDelivery(streak: number): void {
    this.data.deliveries += 1;
    if (streak > this.data.bestStreak) this.data.bestStreak = streak;
    this.persist();
  }

  // Route progression
  static getUnlockedRoute(): number { return this.data.unlockedRoute; }
  static isRouteUnlocked(id: number): boolean { return id <= this.data.unlockedRoute; }
  static isRouteCleared(id: number): boolean { return this.data.clearedRoutes.includes(id); }
  static getBestCredits(id: number): number { return this.data.bestCredits[id] ?? 0; }
  static clearRoute(id: number, payout: number, maxRoute: number): void {
    if (!this.data.clearedRoutes.includes(id)) this.data.clearedRoutes.push(id);
    if (payout > (this.data.bestCredits[id] ?? 0)) this.data.bestCredits[id] = payout;
    const next = Math.min(maxRoute, id + 1);
    if (next > this.data.unlockedRoute) this.data.unlockedRoute = next;
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
    if (!this.spendCredits(this.upgradeCost(k))) return false;
    this.data.upgrades[k]++;
    this.persist();
    return true;
  }

  // Effective stats
  static engineMult(): number { return 1 + this.data.upgrades.engine * UPGRADES.engine.bonusPct; }
  static fuelMult(): number { return 1 + this.data.upgrades.fuel * UPGRADES.fuel.bonusPct; }
  static shieldMult(): number { return Math.max(0.3, 1 - this.data.upgrades.shield * UPGRADES.shield.bonusPct); }

  static reset(): void {
    this.data = { ...DEFAULT, upgrades: { ...DEFAULT.upgrades }, clearedRoutes: [], bestCredits: {} };
    this.persist();
  }
}

function clamp01(v: number): number { return Math.min(1, Math.max(0, v)); }
export default GameState;
