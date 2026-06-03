import Phaser from 'phaser';
import Player from '../Player.ts';
import { GAME_CONFIG } from '../GameConfig.ts';

export class RoamingBlackHole extends Phaser.GameObjects.Container {
  declare body: Phaser.Physics.Arcade.Body;
  
  private gravityRadius: number = 180;
  private pullForce: number = GAME_CONFIG.HAZARDS.BLACK_HOLE_PULL;
  private moveSpeed: number = 60;
  
  private coreGraphics: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y);
    
    this.coreGraphics = scene.add.graphics();
    this.add(this.coreGraphics);
    
    scene.add.existing(this);
    scene.physics.add.existing(this);
    
    this.body.setCircle(15, -15, -15);
    
    // Choose random trajectory
    const angle = Math.random() * Math.PI * 2;
    this.body.setVelocity(Math.cos(angle) * this.moveSpeed, Math.sin(angle) * this.moveSpeed);
    this.body.setCollideWorldBounds(true);
    this.body.setBounce(1, 1);
  }

  update(time: number, delta: number, player: Player): void {
    // Draw swirling vector black hole
    this.coreGraphics.clear();
    const now = this.scene.time.now;
    
    // Outer gravitational field ripple
    this.coreGraphics.lineStyle(1.5, 0xd946ef, 0.15 + Math.sin(now / 150) * 0.05);
    this.coreGraphics.strokeCircle(0, 0, this.gravityRadius);
    
    // Swirling core
    this.coreGraphics.lineStyle(2, 0xd946ef, 0.8);
    const rot = now / 300;
    for (let i = 0; i < 3; i++) {
      const angle = rot + (i * Math.PI * 2) / 3;
      this.coreGraphics.slice(0, 0, 15, angle, angle + Math.PI * 0.4, false);
      this.coreGraphics.strokePath();
    }
    
    // Dark void center
    this.coreGraphics.fillStyle(0x0a0518, 1);
    this.coreGraphics.fillCircle(0, 0, 8);
    
    // Gravitational pull math: pull player towards core when flying
    if (player.getCurrentStateName() === 'STATE_FLYING' && !player.isSpeedBoosted) {
      const dx = this.x - player.x;
      const dy = this.y - player.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      if (dist < this.gravityRadius && dist > 10 && player.body) {
        const force = this.pullForce / (dist * dist);
        const cappedForce = Math.min(force, 18); 
        
        const forceX = (dx / dist) * cappedForce;
        const forceY = (dy / dist) * cappedForce;
        
        const dtSeconds = delta / 1000;
        player.body.velocity.x += forceX * 60 * dtSeconds;
        player.body.velocity.y += forceY * 60 * dtSeconds;
      }
    }
  }
}
export default RoamingBlackHole;
