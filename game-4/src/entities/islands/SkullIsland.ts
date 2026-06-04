import Phaser from 'phaser';
import Island from './Island.ts';
import { COLORS, SKULL } from '../../core/GameConfig.ts';
import CannonballPool from '../../systems/CannonballPool.ts';
import Effects from '../../systems/Effects.ts';
import AudioManager from '../../core/AudioManager.ts';
import type PlayerShip from '../PlayerShip.ts';

// =====================================================================
// SkullIsland.ts — The boss objective.
//
// Once triggered the fortress fires cannons at the player from its
// four corner turrets. Shielded → slower fire, vulnerable → faster.
// =====================================================================

// 4 cannon turret positions (compass directions around the fortress)
const CANNON_ANGLES = [
  -Math.PI / 2,  // North
  0,             // East
  Math.PI / 2,   // South
  Math.PI,       // West
];
const CANNON_RADIUS = 82;  // how far from centre the muzzle sits

export class SkullIsland extends Island {
  triggerRadius = SKULL.triggerRadius;
  leashRadius = SKULL.leashRadius;

  maxHp = SKULL.islandHp;
  hp = SKULL.islandHp;

  triggered = false;
  vulnerable = false;
  destroyed = false;

  private shield!: Phaser.GameObjects.Graphics;
  private hpBar!: Phaser.GameObjects.Graphics;
  private skullArt!: Phaser.GameObjects.Graphics;
  private cannonArt!: Phaser.GameObjects.Graphics;

  // Cannon timing
  private fireReadyAt = 0;
  private damage = 10;  // set from PlayScene via setDamage()

  constructor(scene: Phaser.Scene, x: number, y: number, hpMul = 1) {
    super(scene, x, y, 168);
    this.maxHp = Math.round(SKULL.islandHp * hpMul);
    this.hp = this.maxHp;
    this.drawLeashRing();
    this.drawSkull();
    this.drawCannons();
    this.drawShield();
  }

  setDamage(dmg: number): void {
    this.damage = dmg;
  }

  protected drawLand(g: Phaser.GameObjects.Graphics, r: number): void {
    super.drawLand(g, r, COLORS.crimson);
  }

  private drawLeashRing(): void {
    const ring = this.scene.add.graphics();
    ring.lineStyle(2, COLORS.crimson, 0.16);
    ring.strokeCircle(0, 0, this.leashRadius);
    ring.setDepth(2);
    this.addAt(ring, 0);
  }

  private drawCannons(): void {
    this.cannonArt = this.scene.add.graphics();
    const g = this.cannonArt;
    // Draw a small cannon barrel at each turret position
    CANNON_ANGLES.forEach((angle) => {
      const cx = Math.cos(angle) * (CANNON_RADIUS - 10);
      const cy = Math.sin(angle) * (CANNON_RADIUS - 10);
      // Turret base
      g.fillStyle(0x241522, 1);
      g.fillCircle(cx, cy, 11);
      g.lineStyle(1.5, COLORS.crimson, 0.8);
      g.strokeCircle(cx, cy, 11);
      // Barrel (pointing outward)
      const bx2 = cx + Math.cos(angle) * 16;
      const by2 = cy + Math.sin(angle) * 16;
      g.lineStyle(5, 0x2a1020, 1);
      g.lineBetween(cx, cy, bx2, by2);
      g.lineStyle(3, COLORS.ember, 0.9);
      g.lineBetween(cx, cy, bx2, by2);
    });
    this.add(this.cannonArt);
  }

  private drawSkull(): void {
    const g = this.scene.add.graphics();
    // Outer fortress wall
    g.fillStyle(0x1a1028, 1);
    g.fillCircle(0, 0, 58);
    g.lineStyle(3, 0x3d1f3d, 1);
    g.strokeCircle(0, 0, 58);
    // Battlements (crenellations) — notches around the rim
    g.lineStyle(2, COLORS.crimson, 0.6);
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      const r1 = 52, r2 = 62;
      g.lineBetween(Math.cos(a) * r1, Math.sin(a) * r1, Math.cos(a) * r2, Math.sin(a) * r2);
    }
    // Inner dark fill
    g.fillStyle(0x12080f, 1);
    g.fillCircle(0, 4, 42);
    // Skull cranium
    g.fillStyle(COLORS.skull, 1);
    g.fillCircle(0, -8, 30);
    g.fillRoundedRect(-20, -8, 40, 30, 7);
    // Eye sockets
    g.fillStyle(0x0a0008, 1);
    g.fillCircle(-11, -8, 8);
    g.fillCircle(11, -8, 8);
    // Glowing eyes
    g.fillStyle(COLORS.crimson, 1);
    g.fillCircle(-11, -8, 4);
    g.fillCircle(11, -8, 4);
    // Nose
    g.fillStyle(0x0a0008, 1);
    g.fillTriangle(-4, 4, 4, 4, 0, 12);
    // Teeth row
    g.fillStyle(COLORS.skull, 1);
    for (let i = -2; i <= 2; i++) {
      g.fillRect(i * 7 - 2.5, 18, 5, 7);
    }
    g.lineStyle(1.2, 0x0a0008, 1);
    for (let i = -2; i <= 2; i++) {
      g.strokeRect(i * 7 - 2.5, 18, 5, 7);
    }
    this.skullArt = g;
    this.add(g);

    // Eye glow pulse
    this.scene.tweens.add({
      targets: this.skullArt,
      alpha: 0.8,
      duration: 1100,
      yoyo: true,
      repeat: -1,
    });
  }

  private drawShield(): void {
    this.shield = this.scene.add.graphics();
    this.shield.lineStyle(3, COLORS.purple, 0.6);
    this.shield.strokeCircle(0, 0, 96);
    this.shield.lineStyle(1.5, COLORS.cyan, 0.4);
    this.shield.strokeCircle(0, 0, 86);
    this.add(this.shield);
    this.scene.tweens.add({
      targets: this.shield,
      alpha: 0.4,
      scale: 1.04,
      duration: 1000,
      yoyo: true,
      repeat: -1,
    });
  }

  dropShield(): void {
    if (this.vulnerable) return;
    this.vulnerable = true;
    this.scene.tweens.killTweensOf(this.shield);
    this.scene.tweens.add({
      targets: this.shield,
      alpha: 0,
      scale: 1.6,
      duration: 500,
      onComplete: () => this.shield.destroy(),
    });
    this.hpBar = this.scene.add.graphics();
    this.add(this.hpBar);
    this.redrawHpBar();
  }

  // ---- Cannon fire ------------------------------------------------
  /** Called every frame from PlayScene when triggered. */
  updateCannons(time: number, player: PlayerShip, pool: CannonballPool, fx: Effects): void {
    if (this.destroyed || !this.triggered || !player.alive) return;

    // Slower when shielded, faster when exposed
    const cooldown = this.vulnerable ? 1600 : 2400;
    if (time < this.fireReadyAt) return;
    this.fireReadyAt = time + cooldown;

    // Find the turret angle closest to pointing at the player
    const aimToPlayer = Math.atan2(player.y - this.y, player.x - this.x);
    let bestAngle = CANNON_ANGLES[0];
    let bestDiff = Math.abs(Phaser.Math.Angle.Wrap(CANNON_ANGLES[0] - aimToPlayer));
    CANNON_ANGLES.forEach((a) => {
      const diff = Math.abs(Phaser.Math.Angle.Wrap(a - aimToPlayer));
      if (diff < bestDiff) { bestDiff = diff; bestAngle = a; }
    });

    const ox = this.x + Math.cos(bestAngle) * CANNON_RADIUS;
    const oy = this.y + Math.sin(bestAngle) * CANNON_RADIUS;

    // Add slight spread so shots are harder to dodge
    const spread = (Math.random() - 0.5) * 0.25;
    pool.fire(ox, oy, aimToPlayer + spread, 'enemy', this.damage);
    fx.muzzleFlash(ox, oy, COLORS.crimson);
    AudioManager.cannon();

    // Flash the turret
    this.scene.tweens.add({
      targets: this.cannonArt,
      alpha: 0.4,
      duration: 60,
      yoyo: true,
    });
  }

  // ---- Damage / shield -------------------------------------------
  shieldHit(): void {
    if (this.vulnerable || this.destroyed) return;
    this.scene.tweens.killTweensOf(this.shield);
    this.scene.tweens.add({
      targets: this.shield,
      scale: 1.28,
      alpha: 1,
      duration: 70,
      yoyo: true,
      onComplete: () => {
        if (!this.vulnerable) {
          this.scene.tweens.add({
            targets: this.shield,
            alpha: 0.4,
            scale: 1.04,
            duration: 1000,
            yoyo: true,
            repeat: -1,
          });
        }
      },
    });
  }

  takeDamage(amount: number): boolean {
    if (!this.vulnerable || this.destroyed) return false;
    this.hp = Math.max(0, this.hp - amount);
    this.redrawHpBar();
    this.scene.tweens.add({ targets: this.skullArt, alpha: 0.3, duration: 60, yoyo: true });
    if (this.hp <= 0) {
      this.destroyed = true;
      return true;
    }
    return false;
  }

  private redrawHpBar(): void {
    if (!this.hpBar) return;
    const w = 140, h = 9, y = -108;
    const ratio = Phaser.Math.Clamp(this.hp / this.maxHp, 0, 1);
    const g = this.hpBar;
    g.clear();
    g.fillStyle(0x000000, 0.6);
    g.fillRoundedRect(-w / 2 - 2, y - 2, w + 4, h + 4, 4);
    g.fillStyle(0x2a0a16, 1);
    g.fillRoundedRect(-w / 2, y, w, h, 3);
    g.fillStyle(COLORS.crimson, 1);
    g.fillRoundedRect(-w / 2, y, Math.max(1, w * ratio), h, 3);
  }
}

export default SkullIsland;
