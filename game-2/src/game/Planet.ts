import Phaser from 'phaser';
import Player from './Player.ts';

export type PlanetType = 'standard' | 'unstable' | 'bouncy' | 'wormhole' | 'shift_gate' | 'pulsar';

export class Planet extends Phaser.GameObjects.Container {
  declare body: Phaser.Physics.Arcade.Body;
  
  planetId: string;
  planetType: PlanetType;
  radius: number;
  
  speedMultiplier: number = 1.0;
  isGoal: boolean = false;
  isGoalUnlocked: boolean = false;
  partnerWormhole: Planet | null = null;
  
  protected ringGraphics: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene, x: number, y: number, radius: number, type: PlanetType, id: string) {
    super(scene, x, y);
    
    this.planetId = id;
    this.planetType = type;
    this.radius = radius;
    if (id === 'goal') {
      this.isGoal = true;
    }

    this.ringGraphics = scene.add.graphics();
    this.add(this.ringGraphics);

    scene.add.existing(this);
    scene.physics.add.existing(this, true); // Static body
    
    this.body.setCircle(this.radius, -this.radius, -this.radius);
  }

  getSpeedMultiplier(): number {
    return this.speedMultiplier;
  }

  drawPlanet(): void {
    this.ringGraphics.clear();
    if (this.isGoal) {
      this.drawGoalPlanet();
    }
  }

  protected drawGoalPlanet(): void {
    const now = this.scene.time.now;
    if (!this.isGoalUnlocked) {
      // Reddish locked outer lock rings
      this.ringGraphics.lineStyle(3, 0xfbbf24, 0.9);
      this.ringGraphics.strokeCircle(0, 0, this.radius);
      
      // Locked bars indicator
      this.ringGraphics.lineStyle(1.5, 0xef4444, 0.7);
      const dashCount = 8;
      const angle = now / 400;
      for (let i = 0; i < dashCount; i++) {
        const baseAngle = angle + (i * Math.PI * 2) / dashCount;
        this.ringGraphics.beginPath();
        this.ringGraphics.arc(0, 0, this.radius + 6, baseAngle, baseAngle + 0.3, false);
        this.ringGraphics.strokePath();
      }

      this.ringGraphics.fillStyle(0xfbbf24, 0.05);
      this.ringGraphics.fillCircle(0, 0, this.radius);
    } else {
      // Glowing golden exit portal
      this.ringGraphics.lineStyle(3, 0xfbbf24, 1);
      this.ringGraphics.strokeCircle(0, 0, this.radius);
      this.ringGraphics.fillStyle(0xfbbf24, 0.15);
      this.ringGraphics.fillCircle(0, 0, this.radius);
      
      this.ringGraphics.lineStyle(2, 0xffffff, 0.6);
      this.ringGraphics.strokeCircle(0, 0, this.radius - 8);
    }
  }

  preUpdate(time: number, delta: number): void {
    const cam = this.scene.cameras.main;
    if (cam && cam.worldView) {
      const bounds = cam.worldView;
      const margin = this.radius + 50;
      const isVisible = (
        this.x + margin >= bounds.x &&
        this.x - margin <= bounds.x + bounds.width &&
        this.y + margin >= bounds.y &&
        this.y - margin <= bounds.y + bounds.height
      );
      
      this.setVisible(isVisible);
      if (isVisible) {
        this.drawPlanet();
      }
    } else {
      this.drawPlanet();
    }
  }

  onPlayerLand(player: Player): void {
    // Override in subclasses
  }

  onPlayerLeave(player: Player): void {
    // Override in subclasses
  }

  handleBounceReflection(player: Player): void {
    // Override in subclasses
  }
}
export default Planet;
