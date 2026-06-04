import localforage from 'localforage';
import { UPGRADES, UpgradeKey } from '../config.ts';

// =====================================================================
// GameState.ts — persistent profile (write-through). Credits + permanent
// ship upgrades + best run. In-memory is source of truth after hydrate.
// =====================================================================

export interface ProfileData {
  credits: number;
  bestCredits: number;
  won: boolean;
  upgrades: Record<UpgradeKey, number>;
  musicVol: number;
  sfxVol: number;
}

const STORE_KEY = 'aether_drift_profile_v1';
const DEFAULT: ProfileData = {
  credits: 0, bestCredits: 0, won: false,
  upgrades: { engine: 0, hull: 0, cargo: 0, weapon: 0 },
  musicVol: 0.45, sfxVol: 0.8,
};

localforage.config({ name: 'AetherDrift', storeName: 'profile' });

export class GameState {
  private static data: ProfileData = { ...DEFAULT, upgrades: { ...DEFAULT.upgrades } };
  private static ready = false;

  static async hydrate(): Promise<ProfileData> {
    try {
      const s = await localforage.getItem<ProfileData>(STORE_KEY);
      if (s) this.data = { ...DEFAULT, ...s, upgrades: { ...DEFAULT.upgrades, ...(s.upgrades ?? {}) } };
    } catch { this.data = { ...DEFAULT, upgrades: { ...DEFAULT.upgrades } }; }
    this.ready = true;
    return this.data;
  }
  private static persist(): void { if (this.ready) void localforage.setItem(STORE_KEY, this.data).catch(() => {}); }

  static getCredits(): number { return this.data.credits; }
  static addCredits(n: number): void { this.data.credits = Math.max(0, this.data.credits + Math.round(n)); if (this.data.credits > this.data.bestCredits) this.data.bestCredits = this.data.credits; this.persist(); }
  static spendCredits(n: number): boolean { if (this.data.credits >= n) { this.data.credits -= n; this.persist(); return true; } return false; }
  static getBest(): number { return this.data.bestCredits; }
  static hasWon(): boolean { return this.data.won; }
  static setWon(): void { this.data.won = true; this.persist(); }

  static getUpgrade(k: UpgradeKey): number { return this.data.upgrades[k] ?? 0; }
  static buyUpgrade(k: UpgradeKey): boolean {
    const lvl = this.getUpgrade(k);
    if (lvl >= UPGRADES[k].max) return false;
    const cost = UPGRADES[k].cost(lvl);
    if (!this.spendCredits(cost)) return false;
    this.data.upgrades[k] = lvl + 1; this.persist(); return true;
  }

  static getMusicVol(): number { return this.data.musicVol; }
  static getSfxVol(): number { return this.data.sfxVol; }
  static setMusicVol(v: number): void { this.data.musicVol = Math.max(0, Math.min(1, v)); this.persist(); }
  static setSfxVol(v: number): void { this.data.sfxVol = Math.max(0, Math.min(1, v)); this.persist(); }

  static reset(): void { this.data = { ...DEFAULT, upgrades: { ...DEFAULT.upgrades } }; this.persist(); }
}
export default GameState;
