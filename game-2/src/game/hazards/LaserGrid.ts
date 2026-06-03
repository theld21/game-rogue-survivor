import Phaser from 'phaser';
import Player from '../Player.ts';
import { GAME_CONFIG } from '../GameConfig.ts';

export class LaserGrid extends Phaser.GameObjects.Container {
  p1: { x: number; y: number };
  p2: { x: number; y: number };
  isActive: boolean = false;
  
  private graphics: Phaser.GameObjects.Graphics;
  private toggleTimer: Phaser.Time.TimerEvent | null = null;
  private lineGeom: Phaser.Geom.Line;

  constructor(scene: Phaser.Scene, x1: number, y1: number, x2: number, y2: number) {
    super(scene, 0, 0);
    this.p1 = { x: x1, y: y1 };
    this.p2 = { x: x2, y: y2 };
    this.lineGeom = new Phaser.Geom.Line(x1, y1, x2, y2);

    this.graphics = scene.add.graphics();
    this.add(this.graphics);

    scene.add.existing(this);
    
    this.startToggling();
  }

  private startToggling(): void {
    const cycle = () => {
      this.isActive = !this.isActive;
      this.drawLaser();
    };

    this.toggleTimer = this.scene.time.addEvent({
      delay: GAME_CONFIG.HAZARDS.LASER_CYCLE_TIME,
      callback: cycle,
      callbackScope: this,
      loop: true
    });
    
    this.drawLaser();
  }

  private drawLaser(): void {
    this.graphics.clear();
    
    if (this.isActive) {
      this.graphics.lineStyle(6, 0xef4444, 0.3);
      this.graphics.lineBetween(this.p1.x, this.p1.y, this.p2.x, this.p2.y);
      
      this.graphics.lineStyle(2, 0xffffff, 1);
      this.graphics.lineBetween(this.p1.x, this.p1.y, this.p2.x, this.p2.y);
      
      this.graphics.fillStyle(0xef4444, 1);
      this.graphics.fillCircle(this.p1.x, this.p1.y, 4);
      this.graphics.fillCircle(this.p2.x, this.p2.y, 4);
    } else {
      this.graphics.lineStyle(1.5, 0xef4444, 0.15);
      const points = Phaser.Geom.Line.BresenhamPoints(this.lineGeom, 10);
      for (let i = 0; i < points.length; i += 2) {
        if (i + 1 < points.length) {
          this.graphics.lineBetween(points[i].x, points[i].y, points[i + 1].x, points[i + 1].y);
        }
      }
    }
  }

  checkCollision(player: Player): boolean {
    if (!this.isActive || player.isSpeedBoosted) return false;
    const playerCircle = new Phaser.Geom.Circle(player.x, player.y, 8);
    return Phaser.Geom.Intersects.LineToCircle(this.lineGeom, playerCircle);
  }

  destroy(fromScene?: boolean): void {
    if (this.toggleTimer) {
      this.toggleTimer.destroy();
    }
    super.destroy(fromScene);
  }
}
export default LaserGrid;
