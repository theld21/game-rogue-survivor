import Phaser from 'phaser';
import { Planet } from '../Planet.ts';
import Player from '../Player.ts';
import AudioManager from '../../utils/AudioManager.ts';

export default class BouncyPlanet extends Planet {
  constructor(scene: Phaser.Scene, x: number, y: number, radius: number, id: string) {
    super(scene, x, y, radius, 'bouncy', id);
    this.drawPlanet();
  }

  drawPlanet(): void {
    super.drawPlanet();
    if (this.isGoal) return;

    const now = this.scene.time.now;
    this.ringGraphics.lineStyle(3, 0xfbbf24, 1);
    const dashCount = 18;
    const angleStep = (Math.PI * 2) / dashCount;
    for (let i = 0; i < dashCount; i++) {
      const startAngle = i * angleStep;
      const endAngle = startAngle + angleStep * 0.5;
      this.ringGraphics.slice(0, 0, this.radius, startAngle, endAngle, false);
      this.ringGraphics.strokePath();
    }
    
    this.ringGraphics.fillStyle(0xfbbf24, 0.05);
    this.ringGraphics.fillCircle(0, 0, this.radius);
    
    this.ringGraphics.lineStyle(1.5, 0xffffff, 0.2);
    this.ringGraphics.strokeCircle(0, 0, this.radius - 12);

    // Concentric wavy inner shield ring
    this.ringGraphics.lineStyle(1.2, 0xfbbf24, 0.35);
    const wavePoints = 16;
    const waveAngle = now / 800;
    this.ringGraphics.beginPath();
    for (let i = 0; i <= wavePoints; i++) {
      const a = waveAngle + (i * Math.PI * 2) / wavePoints;
      const r = this.radius - 12 + Math.sin(i * 3 + now / 100) * 3;
      const px = Math.cos(a) * r;
      const py = Math.sin(a) * r;
      if (i === 0) this.ringGraphics.moveTo(px, py);
      else this.ringGraphics.lineTo(px, py);
    }
    this.ringGraphics.closePath();
    this.ringGraphics.strokePath();
  }

  handleBounceReflection(player: Player): void {
    if (!player.body) return;
    
    const dx = player.x - this.x;
    const dy = player.y - this.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    
    if (len === 0) return;
    
    const nx = dx / len;
    const ny = dy / len;
    
    const vx = player.body.velocity.x;
    const vy = player.body.velocity.y;
    
    const dotProduct = vx * nx + vy * ny;
    
    if (dotProduct < 0) {
      const rx = vx - 2 * dotProduct * nx;
      const ry = vy - 2 * dotProduct * ny;
      
      const bounceForceMultiplier = 1.15;
      player.body.setVelocity(rx * bounceForceMultiplier, ry * bounceForceMultiplier);
      
      AudioManager.playJump();
      
      // Flash bouncy planet ring
      this.ringGraphics.clear();
      this.ringGraphics.lineStyle(5, 0xffffff, 1);
      this.ringGraphics.strokeCircle(0, 0, this.radius);
      this.scene.time.delayedCall(100, () => this.drawPlanet());
    }
  }
}
