import Phaser from 'phaser';
import EventBus from '../EventBus.ts';
import AudioManager from '../core/AudioManager.ts';
import GameState from '../core/GameState.ts';
import { COLORS, CSS, WORLD, ENEMY } from '../config.ts';
import { POWERUPS, POWER_KINDS, DROP_CHANCE, PowerKind } from '../config.ts';
import Enemy, { EnemyKind } from '../entities/Enemy.ts';
import { BulletPool } from './Pool.ts';
import PowerUps from './PowerUps.ts';

// =====================================================================
// EnemyManager.ts — owns the sky threats: spawn just outside the view,
// run AI (pirate fire / leviathan ram), cull, and resolve kills (reward +
// salvage + fx). Extracted from World to keep the scene lean.
// =====================================================================

interface ShipLike { x: number; y: number; radius: number; }

export class EnemyManager {
  enemies: Enemy[] = [];
  private spawnCd = ENEMY.spawnEvery;

  constructor(private scene: Phaser.Scene, private bullets: BulletPool, private powerups: PowerUps) {}

  private rollDrop(): PowerKind | null {
    if (Math.random() >= DROP_CHANCE) return null;
    const total = POWER_KINDS.reduce((s, k) => s + POWERUPS[k].weight, 0);
    let r = Math.random() * total;
    for (const k of POWER_KINDS) { r -= POWERUPS[k].weight; if (r <= 0) return k; }
    return 'shield';
  }

  reset(): void { this.enemies.forEach((e) => e.destroy()); this.enemies = []; this.spawnCd = ENEMY.spawnEvery; }

  cull(inView: (x: number, y: number, r: number) => boolean): void {
    this.enemies.forEach((e) => e.setCulled(!inView(e.x, e.y, e.radius)));
  }

  /** AI + fire + leviathan ram. `hurt` applies damage to the ship. */
  update(dt: number, ship: ShipLike, hurt: (n: number) => void): void {
    for (const e of this.enemies) {
      if (e.culled || !e.alive) continue;
      const shot = e.update(dt, ship);
      if (shot) { this.bullets.fire(e.x, e.y, shot.angle, ENEMY.pirate.bulletSpeed, 1600, ENEMY.pirate.bulletDmg, 'enemy'); AudioManager.enemyShot(); }
      if ((e.kind === 'leviathan' || e.kind === 'worm') && Math.hypot(e.x - ship.x, e.y - ship.y) < e.radius + ship.radius && e.bite()) {
        hurt((ENEMY[e.kind] as any).ramDmg); this.scene.cameras.main.shake(160, 0.009); AudioManager.hurt();
      }
    }
  }

  spawnTick(dt: number, ship: ShipLike, view: Phaser.Geom.Rectangle, motherLevel: number): void {
    this.spawnCd -= dt * 1000;
    if (this.spawnCd > 0 || this.enemies.length >= ENEMY.maxAlive) return;
    this.spawnCd = ENEMY.spawnEvery;
    const a = Math.random() * Math.PI * 2; const d = Math.max(view.width, view.height) * 0.62;
    let x = ship.x + Math.cos(a) * d, y = ship.y + Math.sin(a) * d;
    x = Phaser.Math.Clamp(x, 60, WORLD.width - 60); y = Phaser.Math.Clamp(y, 60, WORLD.height - 60);
    // worm is the staple; occasional pirate shooters return; leviathans at higher tiers
    const r = Math.random();
    let kind: EnemyKind = 'worm';
    if (motherLevel >= 2 && r < 0.15) kind = 'leviathan';
    else if (r < 0.4) kind = 'pirate';   // ~25% occasional shooting ships
    this.enemies.push(new Enemy(this.scene, x, y, kind));
  }

  /** Player bullet vs enemies — returns true if it struck one. */
  hit(bx: number, by: number, dmg: number): boolean {
    for (const e of this.enemies) {
      if (e.culled || !e.alive) continue;
      if (Math.hypot(e.x - bx, e.y - by) < e.radius + 6) {
        AudioManager.hit();
        if (e.takeDamage(dmg)) this.kill(e);
        return true;
      }
    }
    return false;
  }

  private kill(e: Enemy): void {
    const cfg: any = ENEMY[e.kind];
    AudioManager.explode();
    this.scene.cameras.main.shake(200, 0.008);
    const burst = this.scene.add.particles(e.x, e.y, 'spark', { speed: { min: 80, max: 280 }, scale: { start: 0.7, end: 0 }, lifespan: { min: 200, max: 520 }, quantity: 20, blendMode: 'ADD', tint: [COLORS.ember, COLORS.gold, COLORS.white], emitting: false }).setDepth(60);
    burst.explode(22); this.scene.time.delayedCall(600, () => burst.destroy());
    GameState.addCredits(cfg.score);
    EventBus.emit('toast', { text: `+${cfg.score}◈`, color: CSS.gold });
    const drop = this.rollDrop(); if (drop) this.powerups.spawn(e.x, e.y, drop);
    e.destroy();
    this.enemies = this.enemies.filter((x) => x !== e);
  }

  destroy(): void { this.enemies.forEach((e) => e.destroy()); this.enemies = []; }
}
export default EnemyManager;
