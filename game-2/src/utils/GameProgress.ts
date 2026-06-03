export interface ProgressData {
  shards: number;
  highScore: number;
  maxDashes: number; // default: 1, upgradeable
  unstableTimer: number; // default: 3 (seconds), upgradeable
  activeTrail: string; // 'none' | 'rainbow' | 'flame' | 'spectral'
  unlockedTrails: string[]; // ['none']
  highestSector: number;
}

const STORAGE_KEY = 'neon_orbit_progress_v1';

const DEFAULT_PROGRESS: ProgressData = {
  shards: 0,
  highScore: 0,
  maxDashes: 1,
  unstableTimer: 3,
  activeTrail: 'none',
  unlockedTrails: ['none'],
  highestSector: 1
};

export class GameProgress {
  private static data: ProgressData = { ...DEFAULT_PROGRESS };

  static load(): ProgressData {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        this.data = { ...DEFAULT_PROGRESS, ...JSON.parse(saved) };
      } else {
        this.data = { ...DEFAULT_PROGRESS };
      }
    } catch (e) {
      console.warn('LocalStorage not accessible, using temporary state', e);
      this.data = { ...DEFAULT_PROGRESS };
    }
    return this.data;
  }

  static save(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
    } catch (e) {
      console.warn('Failed to save to LocalStorage', e);
    }
  }

  static getShards(): number {
    return this.data.shards;
  }

  static addShards(amount: number): void {
    this.data.shards += amount;
    this.save();
  }

  static deductShards(amount: number): boolean {
    if (this.data.shards >= amount) {
      this.data.shards -= amount;
      this.save();
      return true;
    }
    return false;
  }

  static getHighScore(): number {
    return this.data.highScore;
  }

  static updateHighScore(score: number): boolean {
    if (score > this.data.highScore) {
      this.data.highScore = score;
      this.save();
      return true;
    }
    return false;
  }

  static getHighestSector(): number {
    return this.data.highestSector || 1;
  }

  static updateHighestSector(sector: number): boolean {
    if (sector > (this.data.highestSector || 1)) {
      this.data.highestSector = sector;
      this.save();
      return true;
    }
    return false;
  }

  static getMaxDashes(): number {
    return this.data.maxDashes;
  }

  static upgradeDashes(cost: number): boolean {
    if (this.data.maxDashes < 4 && this.deductShards(cost)) {
      this.data.maxDashes += 1;
      this.save();
      return true;
    }
    return false;
  }

  static getUnstableTimer(): number {
    return this.data.unstableTimer;
  }

  static upgradeUnstableTimer(cost: number): boolean {
    if (this.data.unstableTimer < 6 && this.deductShards(cost)) {
      this.data.unstableTimer += 1;
      this.save();
      return true;
    }
    return false;
  }

  static getActiveTrail(): string {
    return this.data.activeTrail;
  }

  static setActiveTrail(trail: string): void {
    if (this.data.unlockedTrails.includes(trail)) {
      this.data.activeTrail = trail;
      this.save();
    }
  }

  static unlockTrail(trail: string, cost: number): boolean {
    if (!this.data.unlockedTrails.includes(trail)) {
      if (this.deductShards(cost)) {
        this.data.unlockedTrails.push(trail);
        this.save();
        return true;
      }
    }
    return false;
  }

  static getUnlockedTrails(): string[] {
    return this.data.unlockedTrails;
  }

  static reset(): void {
    this.data = { ...DEFAULT_PROGRESS };
    this.save();
  }
}
export default GameProgress;
