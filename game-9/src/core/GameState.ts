import { UPGRADES, UpgradeKey, REPAIR } from '../config.ts';

// =====================================================================
// GameState.ts — persistent profile (write-through). Credits + permanent
// sub upgrades + deepest depth reached. In-memory source of truth.
// =====================================================================

export interface ProfileData {
  credits: number;
  deepest: number;
  repair: number[];   // material deposited per repair stage
  won: boolean;
  upgrades: Record<UpgradeKey, number>;
  musicVol: number;
  sfxVol: number;
}

const STORE_KEY = 'abyss_descent_profile_v2';
const DEFAULT: ProfileData = {
  credits: 0, deepest: 0, repair: REPAIR.map(() => 0), won: false,
  upgrades: { oxygen: 0, battery: 0, armor: 0, sonar: 0, hull: 0, light: 0 },
  musicVol: 0.4, sfxVol: 0.8,
};

export class GameState {
  private static data: ProfileData = { ...DEFAULT, upgrades: { ...DEFAULT.upgrades } };
  private static ready = false;

  static async hydrate(): Promise<ProfileData> {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (raw) {
        const s = JSON.parse(raw) as ProfileData;
        this.data = { ...DEFAULT, ...s, upgrades: { ...DEFAULT.upgrades, ...(s.upgrades ?? {}) }, repair: Array.isArray(s.repair) && s.repair.length === REPAIR.length ? s.repair : REPAIR.map(() => 0) };
      }
    } catch { this.data = { ...DEFAULT, upgrades: { ...DEFAULT.upgrades } }; }
    this.ready = true;
    return this.data;
  }
  private static persist(): void {
    if (this.ready) {
      try {
        localStorage.setItem(STORE_KEY, JSON.stringify(this.data));
      } catch (e) {
        console.warn('Failed to save to localStorage:', e);
      }
    }
  }

  static getCredits(): number { return this.data.credits; }
  static addCredits(n: number): void { this.data.credits = Math.max(0, this.data.credits + Math.round(n)); this.persist(); }
  static spendCredits(n: number): boolean { if (this.data.credits >= n) { this.data.credits -= n; this.persist(); return true; } return false; }

  static getDeepest(): number { return this.data.deepest; }
  static recordDepth(d: number): void { if (d > this.data.deepest) { this.data.deepest = d; this.persist(); } }

  // Repair objective
  static getRepair(): number[] { return this.data.repair; }
  static repairStageDone(i: number): boolean { return (this.data.repair[i] ?? 0) >= REPAIR[i].need; }
  static currentStage(): number { for (let i = 0; i < REPAIR.length; i++) if (!this.repairStageDone(i)) return i; return REPAIR.length; }
  /** Deposit up to `have` of stage i's material; returns amount actually used. */
  static deposit(i: number, have: number): number {
    const need = REPAIR[i].need - (this.data.repair[i] ?? 0); const give = Math.max(0, Math.min(have, need));
    if (give > 0) { this.data.repair[i] = (this.data.repair[i] ?? 0) + give; this.persist(); }
    return give;
  }
  static allRepaired(): boolean { return REPAIR.every((_, i) => this.repairStageDone(i)); }
  static hasWon(): boolean { return this.data.won; }
  static setWon(): void { this.data.won = true; this.persist(); }

  static getUpgrade(k: UpgradeKey): number { return this.data.upgrades[k] ?? 0; }
  static buyUpgrade(k: UpgradeKey): boolean {
    const lvl = this.getUpgrade(k);
    if (lvl >= UPGRADES[k].max) return false;
    if (!this.spendCredits(UPGRADES[k].cost(lvl))) return false;
    this.data.upgrades[k] = lvl + 1; this.persist(); return true;
  }

  static getMusicVol(): number { return this.data.musicVol; }
  static getSfxVol(): number { return this.data.sfxVol; }
  static setMusicVol(v: number): void { this.data.musicVol = Math.max(0, Math.min(1, v)); this.persist(); }
  static setSfxVol(v: number): void { this.data.sfxVol = Math.max(0, Math.min(1, v)); this.persist(); }
  static reset(): void { this.data = { ...DEFAULT, upgrades: { ...DEFAULT.upgrades } }; this.persist(); }
}
export default GameState;
