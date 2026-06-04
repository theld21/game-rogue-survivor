import Phaser from 'phaser';
import { ItemStack, rarityCss } from '../data/Items.ts';
import { RARITY } from '../core/GameConfig.ts';

// =====================================================================
// LootPickup.ts — Floating spoils.
//
// Dropped where an enemy ship sinks. Bobs on the waves until the player
// sails over it (collected into cargo if there's room). Pure vector art.
// =====================================================================

export class LootPickup extends Phaser.GameObjects.Container {
  stack: ItemStack;

  constructor(scene: Phaser.Scene, x: number, y: number, stack: ItemStack) {
    super(scene, x, y);
    this.stack = stack;
    scene.add.existing(this);
    this.setDepth(20);

    const color = RARITY[stack.def.rarity].color;
    const g = scene.add.graphics();
    // Floating crate
    g.fillStyle(0x3a2a18, 1);
    g.fillRoundedRect(-12, -12, 24, 24, 4);
    g.lineStyle(2.5, color, 1);
    g.strokeRoundedRect(-12, -12, 24, 24, 4);
    g.lineStyle(1.5, color, 0.7);
    g.strokeRect(-12, -2, 24, 0.5);
    this.add(g);

    // Rarity glyph
    const label = scene.add
      .text(0, 0, stack.def.glyph, { fontSize: '16px' })
      .setOrigin(0.5);
    this.add(label);

    // Halo
    const halo = scene.add.graphics();
    halo.fillStyle(color, 0.18);
    halo.fillCircle(0, 0, 20);
    this.addAt(halo, 0);

    // Bob
    scene.tweens.add({ targets: this, y: y - 8, duration: 1000, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    scene.tweens.add({ targets: halo, alpha: 0.05, scale: 1.3, duration: 1200, yoyo: true, repeat: -1 });
  }

  get cssColor(): string {
    return rarityCss(this.stack.def);
  }
}

export default LootPickup;
