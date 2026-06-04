import Phaser from 'phaser';
import { COLORS } from '../core/GameConfig.ts';
import type { ItemDef } from '../data/Items.ts';

// =====================================================================
// SeaItem.ts — Rare floating collectible that appears on open water.
//
// When the player stays within collectRange for CHANNEL_MS, it's
// collected. A progress ring fills as the player lingers nearby.
// =====================================================================

const CHANNEL_MS = 1500;
const COLLECT_RANGE = 55;

export class SeaItem extends Phaser.GameObjects.Container {
  def: ItemDef;
  collected = false;
  channelMs = 0;

  private ring!: Phaser.GameObjects.Graphics;
  private icon!: Phaser.GameObjects.Text;
  private glow!: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene, x: number, y: number, def: ItemDef) {
    super(scene, x, y);
    this.def = def;
    scene.add.existing(this);
    this.setDepth(18);

    this.buildArt();

    // Bob up/down tween
    scene.tweens.add({
      targets: this,
      y: y - 12,
      duration: 1400,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.inOut',
    });
    // Spin glow slowly
    scene.tweens.add({
      targets: this.glow,
      rotation: Math.PI * 2,
      duration: 4000,
      repeat: -1,
    });
  }

  private buildArt(): void {
    // Glow halo
    this.glow = this.scene.add.graphics();
    this.glow.fillStyle(COLORS.gold, 0.15);
    this.glow.fillCircle(0, 0, 28);
    this.glow.lineStyle(1.5, COLORS.gold, 0.5);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      this.glow.lineBetween(
        Math.cos(a) * 14, Math.sin(a) * 14,
        Math.cos(a) * 22, Math.sin(a) * 22,
      );
    }
    this.add(this.glow);

    // Progress ring (hidden until channeling)
    this.ring = this.scene.add.graphics();
    this.add(this.ring);

    // Emoji glyph
    this.icon = this.scene.add.text(0, 0, this.def.glyph, {
      fontSize: '24px',
      stroke: '#000',
      strokeThickness: 3,
    }).setOrigin(0.5);
    this.add(this.icon);
  }

  /** Update from PlayScene each frame. Returns true when collected. */
  tick(delta: number, playerX: number, playerY: number): boolean {
    const dist = Phaser.Math.Distance.Between(this.x, this.y, playerX, playerY);
    if (dist < COLLECT_RANGE) {
      this.channelMs = Math.min(CHANNEL_MS, this.channelMs + delta);
    } else {
      this.channelMs = Math.max(0, this.channelMs - delta * 2.5);
    }

    const progress = this.channelMs / CHANNEL_MS;
    this.drawRing(progress);

    if (this.channelMs >= CHANNEL_MS) {
      this.collected = true;
      return true;
    }
    return false;
  }

  private drawRing(progress: number): void {
    this.ring.clear();
    if (progress <= 0) return;
    const r = 32;
    // Track
    this.ring.lineStyle(4, COLORS.gold, 0.25);
    this.ring.beginPath();
    this.ring.arc(0, 0, r, 0, Math.PI * 2);
    this.ring.strokePath();
    // Fill arc
    this.ring.lineStyle(4, COLORS.gold, 1);
    this.ring.beginPath();
    this.ring.arc(0, 0, r, -Math.PI / 2, -Math.PI / 2 + progress * Math.PI * 2);
    this.ring.strokePath();
  }

  getCollectRange(): number { return COLLECT_RANGE; }
}

export default SeaItem;
