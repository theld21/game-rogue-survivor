import Phaser from 'phaser';
import { gsap } from 'gsap';
import { COLORS, POWERUPS, PowerKind } from '../config.ts';

// =====================================================================
// PowerUps.ts — pooled buff drops from slain enemies. Each shows a small
// glowing icon, scatters then magnets to the ship, and applies its effect
// on pickup. Zero-GC pool; GSAP only for the spawn pop / collect.
// =====================================================================

interface PU {
  cont: Phaser.GameObjects.Container; gfx: Phaser.GameObjects.Graphics; active: boolean;
  kind: PowerKind; x: number; y: number; vx: number; vy: number; scatter: number; tween?: gsap.core.Tween;
}

export class PowerUps {
  private pool: PU[] = [];
  constructor(private scene: Phaser.Scene, size = 18) {
    for (let i = 0; i < size; i++) {
      const gfx = scene.add.graphics();
      const cont = scene.add.container(0, 0, [gfx]).setDepth(46).setActive(false).setVisible(false);
      this.pool.push({ cont, gfx, active: false, kind: 'shield', x: 0, y: 0, vx: 0, vy: 0, scatter: 0 });
    }
  }

  spawn(x: number, y: number, kind: PowerKind): void {
    const p = this.pool.find((q) => !q.active); if (!p) return;
    const a = Math.random() * Math.PI * 2, sp = 70 + Math.random() * 60;
    p.active = true; p.kind = kind; p.x = x; p.y = y; p.vx = Math.cos(a) * sp; p.vy = Math.sin(a) * sp; p.scatter = 0.4;
    this.drawIcon(p.gfx, kind);
    p.cont.setActive(true).setVisible(true).setPosition(x, y).setScale(0.1).setAlpha(1);
    p.tween?.kill();
    p.tween = gsap.to(p.cont, { scale: 1, duration: 0.26, ease: 'back.out(2.6)' });
  }

  update(dt: number, sx: number, sy: number, magnetR: number, onCollect: (k: PowerKind) => void): void {
    const bob = Math.sin(this.scene.time.now * 0.006) * 2;
    for (const p of this.pool) {
      if (!p.active) continue;
      if (p.scatter > 0) { p.scatter -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.9; p.vy *= 0.9; }
      else {
        const dx = sx - p.x, dy = sy - p.y, d = Math.hypot(dx, dy) || 1;
        if (d < magnetR) { const pull = Math.min(1, (1 - d / magnetR) + 0.25) * 560; p.x += (dx / d) * pull * dt; p.y += (dy / d) * pull * dt; if (d < 28) { onCollect(p.kind); this.collect(p); continue; } }
      }
      p.cont.setPosition(p.x, p.y + bob);
    }
  }

  private collect(p: PU): void {
    p.tween?.kill();
    p.tween = gsap.to(p.cont, { scale: 1.8, alpha: 0, duration: 0.2, ease: 'power2.out', onComplete: () => { p.active = false; p.cont.setActive(false).setVisible(false); } });
  }

  private drawIcon(g: Phaser.GameObjects.Graphics, kind: PowerKind): void {
    const c = POWERUPS[kind].color; g.clear();
    g.fillStyle(c, 0.18); g.fillCircle(0, 0, 15);
    g.lineStyle(2, c, 0.9); g.strokeCircle(0, 0, 12);
    if (kind === 'shield') {
      const pts = [new Phaser.Geom.Point(0, -9), new Phaser.Geom.Point(7, -5), new Phaser.Geom.Point(7, 3), new Phaser.Geom.Point(0, 9), new Phaser.Geom.Point(-7, 3), new Phaser.Geom.Point(-7, -5)];
      g.fillStyle(c, 0.5); g.fillPoints(pts, true); g.lineStyle(2, COLORS.white, 0.8); g.strokePoints(pts, true, true);
    } else if (kind === 'heal' || kind === 'life') {
      g.fillStyle(c, 1); g.fillCircle(-3.5, -2, 3.6); g.fillCircle(3.5, -2, 3.6); g.fillTriangle(-7, 0, 7, 0, 0, 8);
      if (kind === 'life') { g.lineStyle(1.6, COLORS.white, 0.9); g.beginPath(); g.moveTo(-3.5, -4); g.lineTo(-1, -1); g.strokePath(); }
    } else if (kind === 'speed') {
      g.fillStyle(c, 0.95); g.fillTriangle(0, -10, -6, 5, 6, 5);
      g.fillStyle(COLORS.gold, 1); g.fillTriangle(0, -3, -3, 5, 3, 5);
    } else { // redbullet
      g.fillStyle(c, 1); g.fillPoints([new Phaser.Geom.Point(0, -8), new Phaser.Geom.Point(4, 0), new Phaser.Geom.Point(0, 8), new Phaser.Geom.Point(-4, 0)], true);
      g.lineStyle(2, c, 0.9); for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + Math.PI / 4; g.lineBetween(Math.cos(a) * 7, Math.sin(a) * 7, Math.cos(a) * 11, Math.sin(a) * 11); }
    }
  }

  destroy(): void { this.pool.forEach((p) => { p.tween?.kill(); p.cont.destroy(); }); this.pool = []; }
}
export default PowerUps;
