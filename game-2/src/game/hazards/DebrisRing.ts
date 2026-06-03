import Phaser from 'phaser';

export class DebrisRing extends Phaser.GameObjects.Group {
  private planetX: number;
  private planetY: number;
  private orbitRadius: number;
  private speed: number; // radians per second
  private currentAngle: number = 0;
  
  rocks: Phaser.GameObjects.Arc[] = [];

  constructor(scene: Phaser.Scene, planetX: number, planetY: number, radius: number, rockCount: number = 4) {
    super(scene);
    this.planetX = planetX;
    this.planetY = planetY;
    this.orbitRadius = radius;
    this.speed = (0.6 + Math.random() * 0.4) * (Math.random() > 0.5 ? 1 : -1);

    for (let i = 0; i < rockCount; i++) {
      const startAngle = (i * Math.PI * 2) / rockCount;
      const rx = this.planetX + this.orbitRadius * Math.cos(startAngle);
      const ry = this.planetY + this.orbitRadius * Math.sin(startAngle);
      
      const rock = scene.add.arc(rx, ry, 6, 0, 360, false, 0xffa500, 1);
      scene.physics.add.existing(rock, true);
      (rock.body as Phaser.Physics.Arcade.Body).setCircle(6);
      
      this.add(rock);
      this.rocks.push(rock);
    }
  }

  update(time: number, delta: number): void {
    const dtSeconds = delta / 1000;
    this.currentAngle += this.speed * dtSeconds;

    const rockCount = this.rocks.length;
    for (let i = 0; i < rockCount; i++) {
      const rock = this.rocks[i];
      const offsetAngle = this.currentAngle + (i * Math.PI * 2) / rockCount;
      const rx = this.planetX + this.orbitRadius * Math.cos(offsetAngle);
      const ry = this.planetY + this.orbitRadius * Math.sin(offsetAngle);
      
      rock.setPosition(rx, ry);
      if (rock.body) {
        const body = rock.body as Phaser.Physics.Arcade.Body;
        body.x = rx - 6;
        body.y = ry - 6;
      }
    }
  }

  destroy(destroyChildren?: boolean): void {
    for (const r of this.rocks) {
      r.destroy();
    }
    super.destroy(destroyChildren);
  }
}
export default DebrisRing;
