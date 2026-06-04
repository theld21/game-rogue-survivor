import Phaser from 'phaser';
import Island from './Island.ts';
import { COLORS, ISLAND } from '../../core/GameConfig.ts';
import { Container } from '../../systems/Inventory.ts';
import { rollIslandLoot } from '../../data/Items.ts';

// =====================================================================
// LootIsland.ts — Wild island with a treasure chest.
//
// Owns its own chest Container (max 4) and a hidden respawn timer: every
// `spawnIntervalMs` a new random good drops into a free chest slot. When the
// chest is full the timer PAUSES (no over-spawning); it resumes the instant a
// slot frees (e.g. the player loots into their cargo). The scene calls
// updateSpawner() each frame; the DOM chest popup renders the Container.
// =====================================================================

export class LootIsland extends Island {
  dockRadius = ISLAND.dockRadius;
  chest = new Container(ISLAND.chestSlots);

  private nextSpawnAt: number;
  private chestIcon!: Phaser.GameObjects.Graphics;
  private glint!: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 120);
    this.drawDockRing(this.dockRadius, COLORS.cyan);
    this.drawChest();
    // Seed the chest so it's never empty on arrival
    this.chest.add(rollIslandLoot());
    this.chest.add(rollIslandLoot());
    this.nextSpawnAt = scene.time.now + ISLAND.spawnIntervalMs;
  }

  private drawChest(): void {
    const g = this.scene.add.graphics();
    // Chest body
    g.fillStyle(0x4a2f17, 1);
    g.fillRoundedRect(-16, -8, 32, 22, 4);
    g.lineStyle(2.5, COLORS.gold, 1);
    g.strokeRoundedRect(-16, -8, 32, 22, 4);
    // Lid
    g.fillStyle(0x5c3a1d, 1);
    g.fillRoundedRect(-16, -16, 32, 10, 3);
    g.lineStyle(2, COLORS.gold, 1);
    g.strokeRoundedRect(-16, -16, 32, 10, 3);
    // Lock
    g.fillStyle(COLORS.gold, 1);
    g.fillCircle(0, -2, 3.5);
    this.chestIcon = g;
    this.add(g);

    // Sparkle glint above the chest
    this.glint = this.scene.add.graphics();
    this.glint.fillStyle(COLORS.cyan, 0.8);
    this.glint.fillCircle(0, -30, 4);
    this.add(this.glint);
    this.scene.tweens.add({
      targets: this.glint,
      alpha: 0.2,
      y: -36,
      duration: 1100,
      yoyo: true,
      repeat: -1,
    });
  }

  /** Hidden respawn tick. Pauses while the chest is full. */
  updateSpawner(now: number): boolean {
    if (this.chest.isFull) {
      // Keep the timer "fresh" so a freed slot waits a full interval again.
      this.nextSpawnAt = now + ISLAND.spawnIntervalMs;
      return false;
    }
    if (now >= this.nextSpawnAt) {
      this.chest.add(rollIslandLoot());
      this.nextSpawnAt = now + ISLAND.spawnIntervalMs;
      // Little pop on the chest to signal a fresh drop
      this.scene.tweens.add({
        targets: this.chestIcon,
        scale: 1.3,
        duration: 140,
        yoyo: true,
      });
      return true;
    }
    return false;
  }

  /** Seconds until the next drop (for the HUD/popup), or -1 if paused. */
  secondsToSpawn(now: number): number {
    if (this.chest.isFull) return -1;
    return Math.max(0, Math.ceil((this.nextSpawnAt - now) / 1000));
  }
}

export default LootIsland;
