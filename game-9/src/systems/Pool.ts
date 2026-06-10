import Phaser from 'phaser';
import { gsap } from 'gsap';
import { COLORS, RESOURCES, ResourceKind } from '../config.ts';

// =====================================================================
// Pool.ts — strict object pools (zero-GC, iOS-friendly). Bubbles capped
// well under 100 on screen. Harpoons + resource pickups recycle Images.
// =====================================================================

interface Bubble { img: Phaser.GameObjects.Image; active: boolean; x: number; y: number; vx: number; vy: number; life: number; }
export class BubblePool {
  private pool: Bubble[] = [];
  constructor(scene: Phaser.Scene, size = 84) {
    for (let i = 0; i < size; i++) {
      const img = scene.add.image(0, 0, 'bubble').setActive(false).setVisible(false).setDepth(44).setAlpha(0.5);
      this.pool.push({ img, active: false, x: 0, y: 0, vx: 0, vy: 0, life: 0 });
    }
  }
  emit(x: number, y: number, n = 1, spread = 16): void {
    for (let i = 0; i < n; i++) {
      const b = this.pool.find((p) => !p.active); if (!b) return;
      b.active = true; b.x = x + (Math.random() - 0.5) * spread; b.y = y + (Math.random() - 0.5) * spread;
      b.vx = (Math.random() - 0.5) * 14; b.vy = -28 - Math.random() * 40; b.life = 0.9 + Math.random() * 1.2;
      const s = 0.2 + Math.random() * 0.4;
      b.img.setActive(true).setVisible(true).setPosition(b.x, b.y).setScale(s).setAlpha(0.5).setTint(COLORS.cockpit);
    }
  }
  update(dt: number): void {
    for (const b of this.pool) {
      if (!b.active) continue;
      b.life -= dt; if (b.life <= 0) { b.active = false; b.img.setActive(false).setVisible(false); continue; }
      b.x += b.vx * dt; b.y += b.vy * dt; b.vx *= 0.98;
      b.img.setPosition(b.x, b.y).setAlpha(Math.min(0.5, b.life));
    }
  }
  destroy(): void { this.pool.forEach((b) => b.img.destroy()); this.pool = []; }
}

interface Bolt { img: Phaser.GameObjects.Image; active: boolean; x: number; y: number; vx: number; vy: number; life: number; dmg: number; }
export class BoltPool {
  private pool: Bolt[] = [];
  constructor(scene: Phaser.Scene, size = 40) {
    for (let i = 0; i < size; i++) {
      const img = scene.add.image(0, 0, 'bubble').setActive(false).setVisible(false).setDepth(47).setScale(0.55).setTint(COLORS.light);
      this.pool.push({ img, active: false, x: 0, y: 0, vx: 0, vy: 0, life: 0, dmg: 0 });
    }
  }
  fire(x: number, y: number, angle: number, speed: number, lifeMs: number, dmg: number): void {
    const b = this.pool.find((p) => !p.active); if (!b) return;
    b.active = true; b.x = x; b.y = y; b.vx = Math.cos(angle) * speed; b.vy = Math.sin(angle) * speed; b.life = lifeMs / 1000; b.dmg = dmg;
    b.img.setActive(true).setVisible(true).setPosition(x, y).setRotation(angle);
  }
  update(dt: number): void { for (const b of this.pool) { if (!b.active) continue; b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt; if (b.life <= 0) { this.kill(b); continue; } b.img.setPosition(b.x, b.y); } }
  /** Allocation-free iteration over live bolts (no per-frame filter array). */
  forEachActive(fn: (b: Bolt) => void): void { for (const b of this.pool) if (b.active) fn(b); }
  kill(b: Bolt): void { b.active = false; b.img.setActive(false).setVisible(false); }
  destroy(): void { this.pool.forEach((b) => b.img.destroy()); this.pool = []; }
}

interface Pickup { gfx: Phaser.GameObjects.Graphics; active: boolean; x: number; y: number; vx: number; vy: number; kind: ResourceKind; scatter: number; tween?: gsap.core.Tween; }
export class PickupPool {
  private pool: Pickup[] = [];
  constructor(scene: Phaser.Scene, size = 60) {
    for (let i = 0; i < size; i++) {
      const gfx = scene.add.graphics().setActive(false).setVisible(false).setDepth(46);
      this.pool.push({ gfx, active: false, x: 0, y: 0, vx: 0, vy: 0, kind: 'ore', scatter: 0 });
    }
  }
  private draw(g: Phaser.GameObjects.Graphics, kind: ResourceKind): void {
    const c = RESOURCES[kind].color; g.clear();
    g.fillStyle(c, 0.3); g.fillCircle(0, 0, 10);
    g.fillStyle(c, 1); g.fillPoints([new Phaser.Geom.Point(0, -6), new Phaser.Geom.Point(5, 0), new Phaser.Geom.Point(0, 6), new Phaser.Geom.Point(-5, 0)], true);
    g.lineStyle(1, COLORS.white, 0.7); g.strokePoints([new Phaser.Geom.Point(0, -6), new Phaser.Geom.Point(5, 0), new Phaser.Geom.Point(0, 6), new Phaser.Geom.Point(-5, 0)], true, true);
  }
  spawn(x: number, y: number, kind: ResourceKind): void {
    const p = this.pool.find((q) => !q.active); if (!p) return;
    const a = Math.random() * Math.PI * 2, sp = 50 + Math.random() * 50;
    p.active = true; p.x = x; p.y = y; p.vx = Math.cos(a) * sp; p.vy = Math.sin(a) * sp; p.kind = kind; p.scatter = 0.36;
    this.draw(p.gfx, kind);
    p.gfx.setActive(true).setVisible(true).setPosition(x, y).setScale(0.1).setAlpha(1);
    p.tween?.kill(); p.tween = gsap.to(p.gfx, { scale: 1, duration: 0.24, ease: 'back.out(2.4)' });
  }
  update(dt: number, sx: number, sy: number, magnetR: number, onCollect: (k: ResourceKind) => boolean): void {
    for (const p of this.pool) {
      if (!p.active) continue;
      if (p.scatter > 0) { p.scatter -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.9; p.vy *= 0.9; }
      else { const dx = sx - p.x, dy = sy - p.y, d = Math.hypot(dx, dy) || 1; if (d < magnetR) { const pull = Math.min(1, (1 - d / magnetR) + 0.25) * 520; p.x += (dx / d) * pull * dt; p.y += (dy / d) * pull * dt; if (d < 26) { if (onCollect(p.kind)) this.collect(p); continue; } } }
      p.gfx.setPosition(p.x, p.y);
    }
  }
  private collect(p: Pickup): void { p.active = false; p.tween?.kill(); p.tween = gsap.to(p.gfx, { scale: 0, duration: 0.14, ease: 'power2.in', onComplete: () => p.gfx.setActive(false).setVisible(false) }); }
  destroy(): void { this.pool.forEach((p) => { p.tween?.kill(); p.gfx.destroy(); }); this.pool = []; }
}
