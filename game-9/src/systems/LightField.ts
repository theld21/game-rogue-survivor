import Phaser from 'phaser';
import { COLORS, SONAR, LIGHT } from '../config.ts';

// =====================================================================
// LightField.ts — the mysterious darkness. A screen-fixed RenderTexture is
// filled near-black each frame, then the flashlight CONE and expanding
// SONAR reveal discs are ERASED out of it (punching holes that reveal the
// world beneath). Also draws the visible sonar pulse rings above the dark.
//   isLit(x,y) answers AI/visibility queries analytically.
// =====================================================================

const CONE_REF = 400;   // baked cone reference length; scaled to real range
const GLOW_REF = 128;   // baked glow texture radius

interface Ping { x: number; y: number; start: number; maxR: number; }

export class LightField {
  private dark!: Phaser.GameObjects.RenderTexture;
  private cone!: Phaser.GameObjects.Image;
  private glow!: Phaser.GameObjects.Image;
  private rings!: Phaser.GameObjects.Graphics;
  private pings: Ping[] = [];
  sonarRadius: number;
  private revealMs: number;

  constructor(private scene: Phaser.Scene, sonarLevel: number) {
    this.sonarRadius = SONAR.baseRadius + sonarLevel * 130;
    this.revealMs = SONAR.revealMs + sonarLevel * 500;
    const cam = scene.cameras.main;
    this.dark = scene.add.renderTexture(0, 0, cam.width, cam.height).setOrigin(0).setScrollFactor(0).setDepth(90);
    this.cone = scene.make.image({ key: 'cone', add: false }).setOrigin(0.06, 0.5);
    this.glow = scene.make.image({ key: 'glow', add: false }).setOrigin(0.5);
    this.rings = scene.add.graphics().setDepth(95);
  }

  resize(): void { const cam = this.scene.cameras.main; this.dark.setSize(cam.width, cam.height).setPosition(0, 0); }

  ping(x: number, y: number): void {
    this.pings.push({ x, y, start: this.scene.time.now, maxR: this.sonarRadius });
    if (this.pings.length > 4) this.pings.shift();
  }
  lastPing(): { x: number; y: number; t: number } | null {
    const p = this.pings[this.pings.length - 1]; return p ? { x: p.x, y: p.y, t: p.start } : null;
  }

  /** Analytic lit test (flashlight cone OR an active sonar disc). */
  isLit(x: number, y: number, subX: number, subY: number, heading: number, lightOn: boolean, range: number): boolean {
    if (lightOn) {
      const dx = x - subX, dy = y - subY, d = Math.hypot(dx, dy);
      if (d < range) { const da = Math.abs(Phaser.Math.Angle.Wrap(Math.atan2(dy, dx) - heading)); if (da < LIGHT.halfAngle * 1.15) return true; }
    }
    const now = this.scene.time.now;
    for (const p of this.pings) { const age = now - p.start; if (age > this.revealMs) continue; const rr = Math.min(p.maxR, p.maxR * age / SONAR.growMs); if (Math.hypot(x - p.x, y - p.y) < rr) return true; }
    return false;
  }

  update(subX: number, subY: number, heading: number, lightOn: boolean, range: number, darkAlpha: number): void {
    const cam = this.scene.cameras.main; const now = this.scene.time.now;
    const sx = subX - cam.scrollX, sy = subY - cam.scrollY;
    // near the surface it is bright — skip the costly full-screen fill/erase entirely
    const drawDark = darkAlpha > 0.085;
    this.dark.setVisible(drawDark);
    if (drawDark) {
      this.dark.clear();
      this.dark.fill(COLORS.void, darkAlpha);
      this.glow.setPosition(sx, sy).setScale(90 / GLOW_REF).setAlpha(0.6); this.dark.erase(this.glow);   // pocket around sub
      if (lightOn) { this.cone.setPosition(sx, sy).setRotation(heading).setScale(range / CONE_REF).setAlpha(1); this.dark.erase(this.cone); }
    }

    // sonar reveal discs + visible pulse rings (rings always shown; discs only carve dark when dark)
    this.rings.clear();
    for (let i = this.pings.length - 1; i >= 0; i--) {
      const p = this.pings[i]; const age = now - p.start;
      if (age > this.revealMs) { this.pings.splice(i, 1); continue; }
      const grow = Math.min(1, age / SONAR.growMs);
      const rr = p.maxR * grow;
      if (drawDark) {
        const fade = age < this.revealMs * 0.6 ? 1 : Math.max(0, (this.revealMs - age) / (this.revealMs * 0.4));
        this.glow.setPosition(p.x - cam.scrollX, p.y - cam.scrollY).setScale(rr / GLOW_REF).setAlpha(0.95 * fade);
        this.dark.erase(this.glow);
      }
      if (grow < 1) {
        this.rings.lineStyle(3, COLORS.sonar, 0.9 * (1 - grow)); this.rings.strokeCircle(p.x, p.y, rr);
        this.rings.lineStyle(1.5, COLORS.sonarHot, 0.7 * (1 - grow)); this.rings.strokeCircle(p.x, p.y, rr * 0.7);
      }
    }
  }

  destroy(): void { this.dark.destroy(); this.cone.destroy(); this.glow.destroy(); this.rings.destroy(); this.pings = []; }
}
export default LightField;
