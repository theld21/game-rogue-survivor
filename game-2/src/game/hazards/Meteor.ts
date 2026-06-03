import Phaser from 'phaser';

export class Meteor extends Phaser.GameObjects.Container {
  declare body: Phaser.Physics.Arcade.Body;
  private particleEmitter: Phaser.GameObjects.Particles.ParticleEmitter | null = null;
  private sprite: Phaser.GameObjects.Sprite;

  constructor(scene: Phaser.Scene, x: number, y: number, targetX: number, targetY: number, speed: number = 220) {
    super(scene, x, y);
    
    // Add sprite representing the rock (using our procedurally generated 'meteor' texture)
    this.sprite = scene.add.sprite(0, 0, 'meteor');
    this.sprite.setTint(0xf97316); // Glow orange-red cracks tint
    this.add(this.sprite);

    scene.add.existing(this);
    scene.physics.add.existing(this);

    // Circle body bounds
    this.body.setCircle(10, -10, -10);

    // Calculate heading vector to target and set speed
    const dx = targetX - x;
    const dy = targetY - y;
    const len = Math.sqrt(dx * dx + dy * dy);
    
    if (len > 0) {
      this.body.setVelocity((dx / len) * speed, (dy / len) * speed);
      
      // Face the velocity direction
      const angle = Math.atan2(dy, dx);
      this.setRotation(angle);
    }

    // Set up burning flame particle tail emitter behind the meteor
    this.initEmitter();
  }

  private initEmitter(): void {
    // Glowing orange/red fire tail
    this.particleEmitter = this.scene.add.particles(0, 0, 'trail_dot', {
      speed: 0,
      scale: { start: 0.8, end: 0.1 },
      alpha: { start: 0.7, end: 0 },
      lifespan: 350,
      frequency: 20,
      tint: 0xf97316, // Orange neon
      blendMode: Phaser.BlendModes.ADD
    });
    
    // Put trail behind other game elements
    this.scene.children.sendToBack(this.particleEmitter);
  }

  preUpdate(): void {
    if (this.particleEmitter) {
      this.particleEmitter.setPosition(this.x, this.y);
    }
  }

  destroy(fromScene?: boolean): void {
    if (this.particleEmitter) {
      this.particleEmitter.destroy();
    }
    super.destroy(fromScene);
  }
}

export default Meteor;
