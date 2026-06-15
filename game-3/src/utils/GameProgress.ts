import localforage from 'localforage';

const STORAGE_KEY = 'stellar_net_v1';

interface TechTree {
  blackHoleReduction: number; // 0-3
  particleSpeed: number;      // 0-3
  supernovaRadius: number;    // 0-3
  pulsarSuppressor: number;   // 0-3
}

interface ProgressData {
  stardust: number;
  wins: number;
  totalMatches: number;
  techTree: TechTree;
  ownedArtifacts: string[];
  equippedArtifacts: string[]; // max 2
  ownedCosmetics: string[];
  activeStarColor: string;    // hex like '00AAFF'
  activeParticleShape: string; // 'circle' | 'cube' | 'spark'
  musicVolume: number;
  sfxVolume: number;
}

const DEFAULT_PROGRESS: ProgressData = {
  stardust: 0,
  wins: 0,
  totalMatches: 0,
  techTree: {
    blackHoleReduction: 0,
    particleSpeed: 0,
    supernovaRadius: 0,
    pulsarSuppressor: 0,
  },
  ownedArtifacts: [],
  equippedArtifacts: [],
  ownedCosmetics: ['starColor_default', 'particle_circle'],
  activeStarColor: '00AAFF',
  activeParticleShape: 'circle',
  musicVolume: 0.75,
  sfxVolume: 0.85,
};

export class GameProgress {
  private static data: ProgressData = { ...DEFAULT_PROGRESS };

  static async load(): Promise<ProgressData> {
    try {
      const saved = await localforage.getItem<ProgressData>(STORAGE_KEY);
      if (saved) {
        this.data = {
          ...DEFAULT_PROGRESS,
          ...saved,
          techTree: { ...DEFAULT_PROGRESS.techTree, ...(saved.techTree || {}) },
        };
      } else {
        this.data = { ...DEFAULT_PROGRESS };
      }
    } catch {
      this.data = { ...DEFAULT_PROGRESS };
    }
    return this.data;
  }

  static save(): void {
    localforage.setItem(STORAGE_KEY, this.data).catch(() => {});
  }

  // Stardust
  static getStardust(): number { return this.data.stardust; }
  static addStardust(amt: number): void { this.data.stardust += amt; this.save(); }
  static spendStardust(amt: number): boolean {
    if (this.data.stardust < amt) return false;
    this.data.stardust -= amt;
    this.save();
    return true;
  }

  // Wins
  static getWins(): number { return this.data.wins; }
  static getTotalMatches(): number { return this.data.totalMatches; }
  static recordMatchResult(won: boolean, stardustEarned: number): void {
    this.data.totalMatches++;
    if (won) this.data.wins++;
    this.data.stardust += stardustEarned;
    this.save();
  }

  // Difficulty based on wins
  static getDifficulty(): number {
    const w = this.data.wins;
    if (w < 3)  return 1;
    if (w < 7)  return 2;
    if (w < 12) return 3;
    if (w < 18) return 4;
    return 5;
  }

  // Tech tree
  static getTechLevel(key: keyof TechTree): number { return this.data.techTree[key]; }
  static upgradeTech(key: keyof TechTree, cost: number): boolean {
    if (this.data.techTree[key] >= 3) return false;
    if (!this.spendStardust(cost)) return false;
    this.data.techTree[key]++;
    this.save();
    return true;
  }

  // Computed upgrade values
  static getParticleSpeedBonus(): number  { return this.data.techTree.particleSpeed * 0.15; } // +15% per level
  static getSupernovaRadiusBonus(): number { return this.data.techTree.supernovaRadius * 20; } // +20px per level
  static getBlackHoleRadiusReduction(): number { return this.data.techTree.blackHoleReduction * 20; } // -20px per level
  static getPulsarIntervalBonus(): number { return this.data.techTree.pulsarSuppressor * 1500; } // +1.5s interval per level

  // Artifacts
  static getOwnedArtifacts(): string[] { return this.data.ownedArtifacts; }
  static getEquippedArtifacts(): string[] { return this.data.equippedArtifacts; }
  static buyArtifact(id: string, cost: number): boolean {
    if (this.data.ownedArtifacts.includes(id)) return false;
    if (!this.spendStardust(cost)) return false;
    this.data.ownedArtifacts.push(id);
    this.save();
    return true;
  }
  static equipArtifact(id: string): boolean {
    if (!this.data.ownedArtifacts.includes(id)) return false;
    if (this.data.equippedArtifacts.includes(id)) {
      this.data.equippedArtifacts = this.data.equippedArtifacts.filter(a => a !== id);
    } else {
      if (this.data.equippedArtifacts.length >= 2) this.data.equippedArtifacts.shift();
      this.data.equippedArtifacts.push(id);
    }
    this.save();
    return true;
  }
  static hasArtifact(id: string): boolean {
    return this.data.equippedArtifacts.includes(id);
  }

  // Cosmetics
  static getOwnedCosmetics(): string[] { return this.data.ownedCosmetics; }
  static getActiveStarColor(): string   { return this.data.activeStarColor; }
  static getActiveParticleShape(): string { return this.data.activeParticleShape; }
  static buyCosmetic(id: string, cost: number): boolean {
    if (this.data.ownedCosmetics.includes(id)) return false;
    if (!this.spendStardust(cost)) return false;
    this.data.ownedCosmetics.push(id);
    this.save();
    return true;
  }
  static setActiveStarColor(hex: string): void {
    this.data.activeStarColor = hex;
    this.save();
  }
  static setActiveParticleShape(shape: string): void {
    this.data.activeParticleShape = shape;
    this.save();
  }

  // Audio
  static getMusicVolume(): number { return this.data.musicVolume; }
  static getSfxVolume(): number   { return this.data.sfxVolume; }
  static setMusicVolume(v: number): void { this.data.musicVolume = Math.max(0, Math.min(1, v)); this.save(); }
  static setSfxVolume(v: number): void   { this.data.sfxVolume   = Math.max(0, Math.min(1, v)); this.save(); }
}

export default GameProgress;
