import Phaser from 'phaser';
import { COLORS } from '../core/GameConfig.ts';

// =====================================================================
// Ocean.ts — Animated parallax sea.
//
// A single screen-sized TileSprite (texture 'ocean_tile', pre-rendered in
// BootScene) is pinned to the camera (scrollFactor 0). We offset its
// tilePosition by a fraction of the camera scroll to fake depth parallax,
// plus a slow drift so the water is always alive — all on the GPU, no
// per-frame Graphics. A couple of slow swell bands add large-scale motion.
// =====================================================================

export class Ocean {
  private tile: Phaser.GameObjects.TileSprite;
  private swell: Phaser.GameObjects.TileSprite;

  constructor(scene: Phaser.Scene) {
    const w = scene.scale.width;
    const h = scene.scale.height;

    this.swell = scene.add
      .tileSprite(0, 0, w, h, 'ocean_swell')
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(-12)
      .setAlpha(0.5);

    this.tile = scene.add
      .tileSprite(0, 0, w, h, 'ocean_tile')
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(-10);

    scene.cameras.main.setBackgroundColor(COLORS.seaDeep);
  }

  update(cam: Phaser.Cameras.Scene2D.Camera, time: number): void {
    // Parallax: foam detail moves with camera at 0.6x; swell at 0.3x.
    this.tile.tilePositionX = cam.scrollX * 0.6 + Math.sin(time * 0.0004) * 14;
    this.tile.tilePositionY = cam.scrollY * 0.6 + time * 0.01;
    this.swell.tilePositionX = cam.scrollX * 0.3;
    this.swell.tilePositionY = cam.scrollY * 0.3 - time * 0.006;
  }

  resize(w: number, h: number): void {
    this.tile.setSize(w, h);
    this.swell.setSize(w, h);
  }
}

export default Ocean;
