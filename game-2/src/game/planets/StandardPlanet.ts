import Phaser from 'phaser';
import { Planet } from '../Planet.ts';

export default class StandardPlanet extends Planet {
  constructor(scene: Phaser.Scene, x: number, y: number, radius: number, id: string) {
    super(scene, x, y, radius, 'standard', id);
    this.drawPlanet();
  }

  drawPlanet(): void {
    super.drawPlanet();
    if (this.isGoal) return;

    const now = this.scene.time.now;
    this.ringGraphics.lineStyle(3, 0x00f0ff, 1);
    this.ringGraphics.strokeCircle(0, 0, this.radius);
    
    this.ringGraphics.fillStyle(0x00f0ff, 0.05);
    this.ringGraphics.fillCircle(0, 0, this.radius);
    
    this.ringGraphics.lineStyle(1.5, 0xffffff, 0.4);
    this.ringGraphics.strokeCircle(0, 0, this.radius - 8);
    
    // Outer dotted rotating ring
    this.ringGraphics.lineStyle(1.2, 0x00f0ff, 0.35);
    const dotCount = 12;
    const offsetAngle = now / 650;
    for (let i = 0; i < dotCount; i++) {
      const a = offsetAngle + (i * Math.PI * 2) / dotCount;
      this.ringGraphics.beginPath();
      this.ringGraphics.arc(0, 0, this.radius + 12, a, a + 0.15, false);
      this.ringGraphics.strokePath();
    }
  }
}
