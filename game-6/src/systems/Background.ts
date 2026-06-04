import Phaser from 'phaser';
import { WORLD, ThemeDef } from '../config.ts';

// =====================================================================
// Background.ts — Themed parallax backdrop baked to ONE RenderTexture.
//
// A tall world (up to ~2100px) drawn with retained Graphics would keep
// hundreds of draw commands alive. Instead we paint the gradient + skyline
// + stars once into a single RenderTexture (a GPU texture) seeded by route
// id (stable on replay) and let the camera scroll it. Per-frame cost: zero.
// =====================================================================

function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

export class Background {
  private rt: Phaser.GameObjects.RenderTexture;

  constructor(scene: Phaser.Scene, worldHeight: number, theme: ThemeDef, seed: number) {
    const W = WORLD.width;
    const rand = rng(seed * 2654435761 + 12345);
    const g = scene.make.graphics({ x: 0, y: 0 }, false);

    // Vertical gradient over the FULL world height
    const bands = Math.max(40, Math.floor(worldHeight / 24));
    const top = Phaser.Display.Color.ValueToColor(theme.skyTop);
    const low = Phaser.Display.Color.ValueToColor(theme.skyLow);
    for (let i = 0; i < bands; i++) {
      const c = Phaser.Display.Color.Interpolate.ColorWithColor(top, low, bands, i);
      g.fillStyle(Phaser.Display.Color.GetColor(c.r, c.g, c.b), 1);
      g.fillRect(0, (i / bands) * worldHeight, W, worldHeight / bands + 1);
    }

    // Far skyline layer (faint, upper-mid)
    this.skyline(g, rand, theme.cityAlt, worldHeight * 0.55, 0.5, theme, false);
    // Near skyline at the bottom (where the pad sits)
    this.skyline(g, rand, theme.city, worldHeight, 0.9, theme, true);

    // Stars / floating sparks in the upper third
    for (let i = 0; i < Math.floor(worldHeight / 18); i++) {
      g.fillStyle(theme.star, 0.25 + rand() * 0.5);
      g.fillCircle(rand() * W, rand() * worldHeight * 0.7, rand() * 1.4 + 0.3);
    }

    this.rt = scene.add.renderTexture(0, 0, W, worldHeight).setOrigin(0, 0).setDepth(-10);
    this.rt.draw(g);
    g.destroy();
  }

  private skyline(g: Phaser.GameObjects.Graphics, rand: () => number, color: number, baseY: number, alpha: number, theme: ThemeDef, lit: boolean): void {
    const W = WORLD.width;
    let x = -10;
    while (x < W + 10) {
      const bw = 18 + rand() * 36;
      const bh = 60 + rand() * 160;
      g.fillStyle(color, alpha);
      g.fillRect(x, baseY - bh, bw, bh);
      if (lit) {
        g.fillStyle(theme.windows, 0.5);
        for (let wy = baseY - bh + 8; wy < baseY - 18; wy += 14)
          for (let wx = x + 4; wx < x + bw - 4; wx += 10)
            if (rand() < 0.5) g.fillRect(wx, wy, 3, 4);
      }
      x += bw + 4;
    }
  }

  destroy(): void { this.rt.destroy(); }
}

export default Background;
