import Phaser from 'phaser';
import { WORLD } from '../config.ts';

// =====================================================================
// OffscreenArrow.ts — Edge indicator pointing to an off-screen target
// (cargo before pickup, pad during descent). Fixed to the camera; hidden
// when the target is on screen. This is the "don't lose the player" aid.
// =====================================================================

export class OffscreenArrow {
  private gfx: Phaser.GameObjects.Graphics;
  private label: Phaser.GameObjects.Text;
  private cam: Phaser.Cameras.Scene2D.Camera;

  constructor(private scene: Phaser.Scene) {
    this.cam = scene.cameras.main;
    this.gfx = scene.add.graphics().setScrollFactor(0).setDepth(80);
    this.label = scene.add.text(0, 0, '', { fontFamily: 'Share Tech Mono, monospace', fontSize: '11px', color: '#ffffff' })
      .setOrigin(0.5).setScrollFactor(0).setDepth(81).setVisible(false);
  }

  /** Point to a world target with a colour; hide if on screen. */
  update(tx: number, ty: number, color: number, show: boolean): void {
    this.gfx.clear();
    if (!show) { this.label.setVisible(false); return; }

    const viewH = WORLD.height;
    const sx = tx - this.cam.scrollX;
    const sy = ty - this.cam.scrollY;
    const margin = 26;
    const onScreen = sx >= 0 && sx <= WORLD.width && sy >= margin && sy <= viewH - margin;
    if (onScreen) { this.label.setVisible(false); return; }

    // Clamp the indicator to the viewport edge, pointing toward the target.
    const cxv = WORLD.width / 2, cyv = viewH / 2;
    const ang = Math.atan2(sy - cyv, sx - cxv);
    const ex = Phaser.Math.Clamp(sx, margin, WORLD.width - margin);
    const ey = Phaser.Math.Clamp(sy, margin + 30, viewH - margin);
    const px = Phaser.Math.Clamp(ex, margin, WORLD.width - margin);
    const py = Phaser.Math.Clamp(ey, margin + 30, viewH - margin);

    // Arrow triangle
    this.gfx.fillStyle(color, 0.95);
    const size = 12;
    this.gfx.beginPath();
    this.gfx.moveTo(px + Math.cos(ang) * size, py + Math.sin(ang) * size);
    this.gfx.lineTo(px + Math.cos(ang + 2.5) * size, py + Math.sin(ang + 2.5) * size);
    this.gfx.lineTo(px + Math.cos(ang - 2.5) * size, py + Math.sin(ang - 2.5) * size);
    this.gfx.closePath();
    this.gfx.fillPath();
    // Glow ring
    this.gfx.lineStyle(2, color, 0.5);
    this.gfx.strokeCircle(px, py, size + 4);

    // Distance label
    const dist = Math.round(Math.hypot(tx - (this.cam.scrollX + cxv), ty - (this.cam.scrollY + cyv)));
    this.label.setText(`${dist}`).setPosition(px, py + 20).setColor('#' + color.toString(16).padStart(6, '0')).setVisible(true);
  }

  destroy(): void { this.gfx.destroy(); this.label.destroy(); }
}

export default OffscreenArrow;
