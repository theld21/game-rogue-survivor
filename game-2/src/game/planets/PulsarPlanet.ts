import Phaser from 'phaser';
import { Planet } from '../Planet.ts';
import Player from '../Player.ts';
import { FlyState } from '../PlayerState.ts';
import AudioManager from '../../utils/AudioManager.ts';

export default class PulsarPlanet extends Planet {
  private pulsarTimer: Phaser.Time.TimerEvent | null = null;
  private shockwaveRadius: number = 0;
  private isPulsing: boolean = false;

  constructor(scene: Phaser.Scene, x: number, y: number, radius: number, id: string) {
    super(scene, x, y, radius, 'pulsar', id);
    this.initPulsar();
  }

  drawPlanet(): void {
    super.drawPlanet();
    if (this.isGoal) return;

    const now = this.scene.time.now;
    this.ringGraphics.lineStyle(3, 0xa855f7, 1);
    this.ringGraphics.strokeCircle(0, 0, this.radius);
    
    this.ringGraphics.fillStyle(0xfbbf24, 0.08);
    this.ringGraphics.fillCircle(0, 0, this.radius * 0.7);
    this.ringGraphics.lineStyle(2, 0xfbbf24, 1);
    this.ringGraphics.strokeCircle(0, 0, this.radius * 0.7);

    const starsize = this.radius * 0.3 * (1 + Math.sin(now / 100) * 0.15);
    this.ringGraphics.fillStyle(0xffffff, 0.9);
    this.ringGraphics.fillCircle(0, 0, starsize);

    if (this.isPulsing && this.shockwaveRadius > 0) {
      const alpha = 1 - (this.shockwaveRadius - this.radius) / 130;
      this.ringGraphics.lineStyle(3, 0xfbbf24, alpha);
      this.ringGraphics.strokeCircle(0, 0, this.shockwaveRadius);

      this.ringGraphics.lineStyle(1.5, 0xa855f7, alpha * 0.5);
      this.ringGraphics.strokeCircle(0, 0, this.shockwaveRadius - 15);
    }
  }

  private initPulsar(): void {
    const pulse = () => {
      this.isPulsing = true;
      this.shockwaveRadius = this.radius;
      
      this.scene.tweens.add({
        targets: this,
        shockwaveRadius: this.radius + 135,
        duration: 900,
        ease: 'Cubic.easeOut',
        onComplete: () => {
          this.isPulsing = false;
          this.shockwaveRadius = 0;
        }
      });

      AudioManager.playWarning();

      const activePlayer = (this.scene as any).player as Player | undefined;
      if (activePlayer && activePlayer.body && !activePlayer.isFrozenInCrystal) {
        const dist = Phaser.Math.Distance.Between(activePlayer.x, activePlayer.y, this.x, this.y);
        if (dist < this.radius + 135) {
          const dx = activePlayer.x - this.x;
          const dy = activePlayer.y - this.y;
          const len = Math.sqrt(dx * dx + dy * dy);
          if (len > 0) {
            const pushStrength = 420;
            activePlayer.changeState(new FlyState(
              (dx / len) * pushStrength,
              (dy / len) * pushStrength
            ));
            
            activePlayer.alpha = 0.5;
            this.scene.tweens.add({
              targets: activePlayer,
              alpha: 1.0,
              duration: 200
            });
          }
        }
      }
    };

    this.pulsarTimer = this.scene.time.addEvent({
      delay: 2500,
      callback: pulse,
      callbackScope: this,
      loop: true
    });
  }

  destroy(fromScene?: boolean): void {
    if (this.pulsarTimer) {
      this.pulsarTimer.destroy();
    }
    super.destroy(fromScene);
  }
}
