import Phaser from 'phaser';
import { BALL, COLORS } from '../core/GameConfig.ts';

// =====================================================================
// CannonballPool.ts — Recycled projectiles.
//
// Cannonballs are arcade Images drawn from a pre-rendered glow texture
// ('cball', built in BootScene) so we never allocate Graphics per shot.
// Each ball carries its faction + damage and self-expires by lifespan
// or on leaving the world.
// =====================================================================

export type Faction = 'player' | 'enemy';

export interface Cannonball extends Phaser.Physics.Arcade.Image {
  faction: Faction;
  damage: number;
  dieAt: number;
}

export class CannonballPool {
  group: Phaser.Physics.Arcade.Group;

  constructor(private scene: Phaser.Scene) {
    this.group = scene.physics.add.group({ maxSize: 80, runChildUpdate: false });
  }

  fire(x: number, y: number, angle: number, faction: Faction, damage: number, speed = BALL.speed): void {
    const ball = this.group.get(x, y, 'cball') as Cannonball | null;
    if (!ball) return;
    ball.faction = faction;
    ball.damage = damage;
    ball.dieAt = this.scene.time.now + BALL.lifespan;

    ball.setActive(true).setVisible(true);
    ball.setDepth(40);
    ball.setTint(faction === 'player' ? COLORS.teal : COLORS.crimson);
    const body = ball.body as Phaser.Physics.Arcade.Body;
    body.setEnable(true);
    body.setCircle(BALL.radius, -BALL.radius, -BALL.radius);
    body.setAllowGravity(false);
    this.scene.physics.velocityFromRotation(angle, speed, body.velocity);
  }

  kill(ball: Cannonball): void {
    ball.setActive(false).setVisible(false);
    const body = ball.body as Phaser.Physics.Arcade.Body;
    body.setEnable(false);
    body.stop();
  }

  update(bounds: Phaser.Geom.Rectangle): void {
    const now = this.scene.time.now;
    (this.group.getChildren() as Cannonball[]).forEach((ball) => {
      if (!ball.active) return;
      if (now > ball.dieAt || !Phaser.Geom.Rectangle.Contains(bounds, ball.x, ball.y)) {
        this.kill(ball);
      }
    });
  }
}

export default CannonballPool;
