import Phaser from 'phaser';
import { COLORS } from '../config.ts';

// =====================================================================
// MagnetBeam.ts — Electric tether drawn between drone tail and cargo.
//
// ONE reused Graphics object, cleared + redrawn each frame as a jagged
// zig-zag whose offsets shift over time (sine noise) so it looks like a
// crackling current physically pulling the crate. No per-frame allocation.
// =====================================================================

export class MagnetBeam {
  private gfx: Phaser.GameObjects.Graphics;
  private visible = false;

  constructor(scene: Phaser.Scene) {
    this.gfx = scene.add.graphics().setDepth(37);
  }

  setVisible(v: boolean): void {
    this.visible = v;
    if (!v) this.gfx.clear();
  }

  /** Redraw the crackling beam from (x1,y1) to (x2,y2). */
  draw(x1: number, y1: number, x2: number, y2: number, time: number): void {
    if (!this.visible) return;
    const g = this.gfx;
    g.clear();

    const dx = x2 - x1, dy = y2 - y1;
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len, ny = dx / len;   // perpendicular
    const segs = Math.max(5, Math.floor(len / 14));

    // Build jagged points
    const pts: Array<[number, number]> = [];
    for (let i = 0; i <= segs; i++) {
      const t = i / segs;
      const baseX = x1 + dx * t;
      const baseY = y1 + dy * t;
      // taper amplitude to 0 at both ends, noisy in the middle
      const taper = Math.sin(t * Math.PI);
      const wob = Math.sin(time * 0.02 + i * 1.7) * 6 * taper
                + Math.sin(time * 0.035 + i * 3.1) * 3 * taper;
      pts.push([baseX + nx * wob, baseY + ny * wob]);
    }

    const stroke = (width: number, color: number, alpha: number) => {
      g.lineStyle(width, color, alpha);
      g.beginPath();
      g.moveTo(pts[0][0], pts[0][1]);
      for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]);
      g.strokePath();
    };
    // Glow → core layered
    stroke(7, COLORS.cyan, 0.18);
    stroke(3.5, COLORS.cyan, 0.7);
    stroke(1.5, COLORS.white, 0.95);

    // End clamps
    g.fillStyle(COLORS.cyan, 0.9);
    g.fillCircle(x1, y1, 4);
    g.fillStyle(COLORS.white, 1);
    g.fillCircle(x2, y2, 3);

    // Random spark nodes along the beam
    if (Math.floor(time / 60) % 2 === 0) {
      const i = 1 + Math.floor((time / 40) % (segs - 1));
      g.fillStyle(COLORS.white, 0.9);
      g.fillCircle(pts[i][0], pts[i][1], 2);
    }
  }

  destroy(): void { this.gfx.destroy(); }
}

export default MagnetBeam;
