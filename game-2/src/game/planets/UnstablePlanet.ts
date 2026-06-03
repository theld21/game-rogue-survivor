import Phaser from 'phaser';
import { Planet } from '../Planet.ts';
import Player from '../Player.ts';
import EventBus from '../../EventBus.ts';
import AudioManager from '../../utils/AudioManager.ts';
import GameProgress from '../../utils/GameProgress.ts';

export default class UnstablePlanet extends Planet {
  private countdownTimer: Phaser.Time.TimerEvent | null = null;
  private secondsRemaining: number = 3;
  private isExploded: boolean = false;
  private textTimer: Phaser.GameObjects.Text | null = null;

  constructor(scene: Phaser.Scene, x: number, y: number, radius: number, id: string) {
    super(scene, x, y, radius, 'unstable', id);
    this.drawPlanet();
  }

  drawPlanet(): void {
    super.drawPlanet();
    if (this.isGoal) return;

    const now = this.scene.time.now;
    const pulse = 1 + Math.sin(now / 120) * 0.08;
    this.ringGraphics.lineStyle(3, 0xef4444, 1);
    this.ringGraphics.strokeCircle(0, 0, this.radius * pulse);
    
    this.ringGraphics.fillStyle(0xef4444, 0.08);
    this.ringGraphics.fillCircle(0, 0, this.radius * pulse);
    
    // Inner danger core
    this.ringGraphics.lineStyle(1.5, 0xfbbf24, 0.6);
    this.ringGraphics.strokeCircle(0, 0, this.radius * 0.7);

    // Rotating hazard triangles in center
    const rotT = now / 400;
    this.ringGraphics.lineStyle(1.5, 0xef4444, 0.45);
    for (let i = 0; i < 3; i++) {
      const a = rotT + (i * Math.PI * 2) / 3;
      const x1 = Math.cos(a) * (this.radius * 0.4);
      const y1 = Math.sin(a) * (this.radius * 0.4);
      const x2 = Math.cos(a + 0.5) * (this.radius * 0.2);
      const y2 = Math.sin(a + 0.5) * (this.radius * 0.2);
      this.ringGraphics.lineBetween(x1, y1, x2, y2);
    }
  }

  onPlayerLand(player: Player): void {
    this.startCountdown(player);
  }

  onPlayerLeave(_player: Player): void {
    this.stopCountdown();
  }

  private startCountdown(player: Player): void {
    if (this.isExploded) return;
    
    this.secondsRemaining = GameProgress.getUnstableTimer();
    
    this.textTimer = this.scene.add.text(0, 0, this.secondsRemaining.toString(), {
      fontSize: '24px',
      color: '#ef4444',
      fontStyle: 'bold',
      fontFamily: 'Orbitron'
    }).setOrigin(0.5);
    this.add(this.textTimer);
    
    const tick = () => {
      this.secondsRemaining--;
      AudioManager.playWarning();
      
      if (this.textTimer) {
        this.textTimer.setText(this.secondsRemaining.toString());
      }
      
      if (this.secondsRemaining <= 0) {
        this.explodeUnstable(player);
      }
    };
    
    this.countdownTimer = this.scene.time.addEvent({
      delay: 1000,
      callback: tick,
      callbackScope: this,
      repeat: this.secondsRemaining - 1
    });
  }

  private stopCountdown(): void {
    if (this.countdownTimer) {
      this.countdownTimer.destroy();
      this.countdownTimer = null;
    }
    if (this.textTimer) {
      this.textTimer.destroy();
      this.textTimer = null;
    }
  }

  private explodeUnstable(player: Player): void {
    this.isExploded = true;
    this.stopCountdown();
    
    AudioManager.playExplosion();
    
    const emitter = this.scene.add.particles(this.x, this.y, 'trail_dot', {
      speed: { min: 80, max: 200 },
      angle: { min: 0, max: 360 },
      scale: { start: 1, end: 0 },
      alpha: { start: 1, end: 0 },
      lifespan: 600,
      tint: 0xef4444,
      maxParticles: 40
    });
    
    this.scene.time.delayedCall(700, () => emitter.destroy());
    
    EventBus.emit('player_died', { reason: 'unstable_explosion' });
    this.destroy();
  }

  destroy(fromScene?: boolean): void {
    this.stopCountdown();
    super.destroy(fromScene);
  }
}
