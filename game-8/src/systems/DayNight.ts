import Phaser from 'phaser';
import { gsap } from 'gsap';
import { DAYNIGHT, WORLD } from '../config.ts';

// =====================================================================
// DayNight.ts — a full-screen tint overlay (scrollFactor 0) cycling
// dawn → day → dusk → night, driven smoothly by GSAP. Exposes isNight so
// the ship lights its headlight and dark isles thicken their fog.
// =====================================================================

interface Key { t: number; color: number; alpha: number; }
const KEYS: Key[] = [
  { t: 0.00, color: 0xff9d3c, alpha: 0.20 },  // dawn
  { t: 0.22, color: 0x8af7ff, alpha: 0.04 },  // morning
  { t: 0.45, color: 0xffffff, alpha: 0.00 },  // day
  { t: 0.62, color: 0xff7a3c, alpha: 0.22 },  // dusk
  { t: 0.80, color: 0x10204a, alpha: 0.46 },  // night
  { t: 1.00, color: 0xff9d3c, alpha: 0.20 },  // back to dawn
];

function lerpColor(a: number, b: number, t: number): number {
  const ar = (a >> 16) & 255, ag = (a >> 8) & 255, ab = a & 255;
  const br = (b >> 16) & 255, bg = (b >> 8) & 255, bb = b & 255;
  return ((Math.round(ar + (br - ar) * t) << 16) | (Math.round(ag + (bg - ag) * t) << 8) | Math.round(ab + (bb - ab) * t));
}

export class DayNight {
  private overlay: Phaser.GameObjects.Rectangle;
  private proxy = { t: 0.3 };
  private tween: gsap.core.Tween;
  isNight = false;

  constructor(private scene: Phaser.Scene) {
    this.overlay = scene.add.rectangle(0, 0, WORLD.width, WORLD.height, 0xffffff, 0)
      .setOrigin(0).setScrollFactor(0).setDepth(80);
    this.resize();
    this.tween = gsap.to(this.proxy, { t: 1.3, duration: DAYNIGHT.cycleMs / 1000, ease: 'none', repeat: -1,
      onUpdate: () => this.apply(), onRepeat: () => { this.proxy.t -= 1; } });
    this.apply();
  }

  resize(): void {
    const cam = this.scene.cameras.main;
    this.overlay.setPosition(0, 0).setSize(cam.width, cam.height).setScrollFactor(0);
  }

  private apply(): void {
    const t = ((this.proxy.t % 1) + 1) % 1;
    let i = 0; while (i < KEYS.length - 1 && t > KEYS[i + 1].t) i++;
    const a = KEYS[i], b = KEYS[Math.min(i + 1, KEYS.length - 1)];
    const span = (b.t - a.t) || 1; const f = Phaser.Math.Clamp((t - a.t) / span, 0, 1);
    this.overlay.setFillStyle(lerpColor(a.color, b.color, f), a.alpha + (b.alpha - a.alpha) * f);
    this.isNight = t > 0.68 && t < 0.92;
  }

  destroy(): void { this.tween?.kill(); this.overlay.destroy(); }
}
export default DayNight;
