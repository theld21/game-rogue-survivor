import Phaser from 'phaser';
import { COLORS } from '../config.ts';

// =====================================================================
// Starfield.ts — Multi-layer parallax space background.
//
// Three TileSprite layers (baked nebula + far/near stars) scroll downward
// to sell the "ship racing forward" feel. GPU-only: tilePosition offset
// each frame, no per-frame Graphics allocation.
// =====================================================================

export class Starfield {
  private nebula: Phaser.GameObjects.TileSprite;
  private farStars: Phaser.GameObjects.TileSprite;
  private nearStars: Phaser.GameObjects.TileSprite;
  private offsetFar = 0;
  private offsetNear = 0;
  private offsetNebula = 0;

  constructor(scene: Phaser.Scene) {
    const w = scene.scale.width;
    const h = scene.scale.height;

    this.nebula = scene.add.tileSprite(w / 2, h / 2, w, h, 'nebula_tile')
      .setDepth(0).setScrollFactor(0).setAlpha(0.8);
    this.farStars = scene.add.tileSprite(w / 2, h / 2, w, h, 'stars_far')
      .setDepth(1).setScrollFactor(0);
    this.nearStars = scene.add.tileSprite(w / 2, h / 2, w, h, 'stars_near')
      .setDepth(2).setScrollFactor(0);

    // Subtle nebula tint drift
    this.nebula.setTint(COLORS.nebula);
  }

  update(scrollSpeed: number, dt: number): void {
    // Parallax: near layer fastest
    this.offsetNebula += scrollSpeed * 0.12 * dt;
    this.offsetFar += scrollSpeed * 0.4 * dt;
    this.offsetNear += scrollSpeed * 1.0 * dt;
    this.nebula.tilePositionY = -this.offsetNebula;
    this.farStars.tilePositionY = -this.offsetFar;
    this.nearStars.tilePositionY = -this.offsetNear;
  }

  resize(w: number, h: number): void {
    [this.nebula, this.farStars, this.nearStars].forEach((ts) => {
      ts.setPosition(w / 2, h / 2);
      ts.setSize(w, h);
    });
  }

  destroy(): void {
    this.nebula.destroy();
    this.farStars.destroy();
    this.nearStars.destroy();
  }
}

export default Starfield;
