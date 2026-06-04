import Phaser from 'phaser';
import { COLORS, ENEMY } from '../config.ts';

// =====================================================================
// Enemy.ts — kinematic sky threats. `pirate` raiders chase + fire; `sky
// leviathan` slowly rams. Manual movement (no arcade body) + distance
// checks; culling freezes offscreen ones. `aiState` not `state`
// (Container reserves `state`).
// =====================================================================

export type EnemyKind = 'worm' | 'pirate' | 'leviathan';

export class Enemy extends Phaser.GameObjects.Container {
  kind: EnemyKind;
  hp: number; maxHp: number;
  radius: number;
  alive = true;
  aiState: 'roam' | 'chase' = 'roam';
  culled = false;
  private fireTimer = 0;
  private biteTimer = 0;
  private hullGfx!: Phaser.GameObjects.Graphics;
  private flashUntil = 0;
  private heading = 0;
  private wobble = Math.random() * Math.PI * 2;

  constructor(scene: Phaser.Scene, x: number, y: number, kind: EnemyKind) {
    super(scene, x, y);
    this.kind = kind;
    const cfg = ENEMY[kind];
    this.hp = cfg.hp; this.maxHp = cfg.hp; this.radius = cfg.radius;
    scene.add.existing(this);
    this.setDepth(40);
    this.buildArt();
  }

  private buildArt(): void {
    const g = this.scene.add.graphics(); const r = this.radius;
    if (this.kind === 'worm') {
      // Sky worm: segmented crawler, head toward +x
      for (let i = 0; i < 4; i++) { const x = -r * 0.5 - i * r * 0.55; const rr = r * (0.62 - i * 0.1); g.fillStyle(0x6bbf4a, 0.9 - i * 0.12); g.fillCircle(x, 0, rr); g.lineStyle(2, 0x9aff6e, 0.5); g.strokeCircle(x, 0, rr); }
      g.fillStyle(0x9aff6e, 1); g.fillCircle(0, 0, r);
      g.lineStyle(2.5, 0x4a8c2e, 1); g.strokeCircle(0, 0, r);
      // mandibles + eyes
      g.lineStyle(3, 0x4a8c2e, 1); g.lineBetween(r * 0.7, -r * 0.4, r * 1.2, -r * 0.7); g.lineBetween(r * 0.7, r * 0.4, r * 1.2, r * 0.7);
      g.fillStyle(0x18060c, 1); g.fillCircle(r * 0.4, -r * 0.35, 3.5); g.fillCircle(r * 0.4, r * 0.35, 3.5);
      g.fillStyle(COLORS.ember, 1); g.fillCircle(r * 0.45, 0, r * 0.16);
    } else if (this.kind === 'pirate') {
      g.fillStyle(COLORS.ember, 0.45); g.fillTriangle(-r * 0.2, -r, -r, -r * 0.2, r * 0.1, -r * 0.3);
      g.fillStyle(COLORS.ember, 0.45); g.fillTriangle(-r * 0.2, r, -r, r * 0.2, r * 0.1, r * 0.3);
      g.fillStyle(0x3a1418, 1);
      g.fillPoints([new Phaser.Geom.Point(r * 1.3, 0), new Phaser.Geom.Point(-r * 0.9, -r * 0.6), new Phaser.Geom.Point(-r * 1.1, 0), new Phaser.Geom.Point(-r * 0.9, r * 0.6)], true);
      g.lineStyle(2, COLORS.ember, 1);
      g.strokePoints([new Phaser.Geom.Point(r * 1.3, 0), new Phaser.Geom.Point(-r * 0.9, -r * 0.6), new Phaser.Geom.Point(-r * 1.1, 0), new Phaser.Geom.Point(-r * 0.9, r * 0.6)], true, true);
      g.fillStyle(COLORS.ember, 1); g.fillCircle(r * 0.3, 0, 4);
    } else {
      // Leviathan: glowing body + tail segments + maw
      for (let i = 0; i < 4; i++) { const x = -r * 0.6 - i * r * 0.5; const rr = r * (0.7 - i * 0.13); g.fillStyle(COLORS.leviathan, 0.85 - i * 0.12); g.fillCircle(x, 0, rr); g.lineStyle(2, COLORS.aetherHot, 0.5); g.strokeCircle(x, 0, rr); }
      g.fillStyle(COLORS.leviathan, 1); g.fillCircle(0, 0, r);
      g.lineStyle(3, COLORS.aetherHot, 0.8); g.strokeCircle(0, 0, r);
      // fins
      g.fillStyle(COLORS.leviathan, 0.7); g.fillTriangle(0, -r, -r * 0.5, -r * 1.6, r * 0.3, -r * 0.7); g.fillTriangle(0, r, -r * 0.5, r * 1.6, r * 0.3, r * 0.7);
      // maw + eyes
      g.fillStyle(COLORS.ember, 1); g.fillCircle(r * 0.6, 0, r * 0.22);
      g.fillStyle(COLORS.white, 1); g.fillCircle(r * 0.3, -r * 0.4, 3.5); g.fillCircle(r * 0.3, r * 0.4, 3.5);
    }
    this.hullGfx = g;
    this.add(g);
  }

  /** Move toward ship; pirates return a fire angle when in range, else null. */
  /** Melee contact damage gate — returns true at most once per `biteMs`. */
  bite(): boolean {
    if (this.biteTimer > 0) return false;
    this.biteTimer = (ENEMY[this.kind] as any).biteMs ?? 600;
    return true;
  }

  update(dt: number, ship: { x: number; y: number }): { angle: number } | null {
    if (!this.alive) return null;
    if (this.biteTimer > 0) this.biteTimer -= dt * 1000;
    const cfg = ENEMY[this.kind];
    const dx = ship.x - this.x, dy = ship.y - this.y, dist = Math.hypot(dx, dy) || 1;
    this.aiState = dist < cfg.aggroRange ? 'chase' : 'roam';
    this.wobble += dt * 2;

    let vx = 0, vy = 0;
    if (this.aiState === 'chase') {
      if (this.kind === 'pirate') {
        // keep a firing distance, strafe a little
        const want = 320; const dir = dist > want ? 1 : -0.6;
        const perp = Math.atan2(dy, dx) + Math.PI / 2;
        vx = (dx / dist) * dir * cfg.speed + Math.cos(perp) * Math.sin(this.wobble) * 60;
        vy = (dy / dist) * dir * cfg.speed + Math.sin(perp) * Math.sin(this.wobble) * 60;
      } else {
        vx = (dx / dist) * cfg.speed; vy = (dy / dist) * cfg.speed;
      }
    } else {
      vx = Math.cos(this.wobble) * cfg.speed * 0.4; vy = Math.sin(this.wobble * 0.7) * cfg.speed * 0.4;
    }
    this.x += vx * dt; this.y += vy * dt;
    this.heading = Phaser.Math.Angle.RotateTo(this.heading, Math.atan2(dy, dx), 0.1 * (dt * 60));
    this.rotation = this.heading;

    if (this.flashUntil && this.scene.time.now > this.flashUntil) { this.hullGfx.setAlpha(1); this.flashUntil = 0; }

    if (this.kind === 'pirate' && this.aiState === 'chase') {
      this.fireTimer += dt * 1000;
      if (this.fireTimer >= (ENEMY.pirate as any).fireRate && dist < cfg.aggroRange) {
        this.fireTimer = 0; return { angle: Math.atan2(dy, dx) };
      }
    }
    return null;
  }

  takeDamage(n: number): boolean {
    if (!this.alive) return false;
    this.hp -= n; this.hullGfx.setAlpha(0.4); this.flashUntil = this.scene.time.now + 80;
    if (this.hp <= 0) { this.alive = false; return true; }
    return false;
  }

  setCulled(off: boolean): void { if (this.culled === off) return; this.culled = off; this.setVisible(!off); this.setActive(!off); }
}
export default Enemy;
