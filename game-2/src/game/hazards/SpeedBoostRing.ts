import Phaser from 'phaser';
import Player from '../Player.ts';
import AudioManager from '../../utils/AudioManager.ts';

export class SpeedBoostRing extends Phaser.GameObjects.Container {
  declare body: Phaser.Physics.Arcade.Body;
  private graphics: Phaser.GameObjects.Graphics;
  private isUsed: boolean = false;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y);
    
    this.graphics = scene.add.graphics();
    this.add(this.graphics);

    scene.add.existing(this);
    scene.physics.add.existing(this, true);

    this.body.setCircle(18, -18, -18);
    this.drawRing();
  }

  private drawRing(): void {
    this.graphics.clear();
    const now = this.scene.time.now;
    const pulse = 1 + Math.sin(now / 150) * 0.05;
    
    if (!this.isUsed) {
      this.graphics.lineStyle(2.5, 0x22c55e, 1);
      this.graphics.strokeCircle(0, 0, 18 * pulse);
      this.graphics.lineStyle(1, 0xffffff, 0.4);
      this.graphics.strokeCircle(0, 0, 14 * pulse);
    } else {
      this.graphics.lineStyle(1.5, 0x22c55e, 0.2);
      this.graphics.strokeCircle(0, 0, 18);
    }
  }

  preUpdate(): void {
    this.drawRing();
  }

  triggerBoost(player: Player): void {
    if (this.isUsed) return;
    this.isUsed = true;
    
    AudioManager.playShard();
    
    player.isSpeedBoosted = true;
    player.setSpeedBoostActive(true);
    
    if (player.body) {
      const vx = player.body.velocity.x;
      const vy = player.body.velocity.y;
      const len = Math.sqrt(vx * vx + vy * vy);
      if (len > 0) {
        const boostSpeed = 820;
        player.body.setVelocity((vx / len) * boostSpeed, (vy / len) * boostSpeed);
      }
    }

    const boostParticles = this.scene.add.particles(this.x, this.y, 'trail_dot', {
      speed: { min: 40, max: 120 },
      scale: { start: 0.8, end: 0.01 },
      alpha: { start: 0.8, end: 0 },
      lifespan: 500,
      tint: 0x22c55e,
      maxParticles: 20
    });
    this.scene.time.delayedCall(600, () => boostParticles.destroy());
    
    this.scene.time.delayedCall(1200, () => {
      player.isSpeedBoosted = false;
      player.setSpeedBoostActive(false);
    });
  }

  resetRing(): void {
    this.isUsed = false;
  }
}
export default SpeedBoostRing;
