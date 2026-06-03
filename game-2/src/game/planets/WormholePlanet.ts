import Phaser from 'phaser';
import { Planet } from '../Planet.ts';
import Player from '../Player.ts';
import { FlyState } from '../PlayerState.ts';
import AudioManager from '../../utils/AudioManager.ts';

export default class WormholePlanet extends Planet {
  private static wormholeCooldown: boolean = false;

  constructor(scene: Phaser.Scene, x: number, y: number, radius: number, id: string) {
    super(scene, x, y, radius, 'wormhole', id);
    this.drawPlanet();
  }

  drawPlanet(): void {
    super.drawPlanet();
    if (this.isGoal) return;

    const now = this.scene.time.now;
    const rotationAngle = now / 1000;
    
    this.ringGraphics.lineStyle(2, 0xd946ef, 1);
    this.ringGraphics.strokeCircle(0, 0, this.radius);
    this.ringGraphics.lineStyle(1.5, 0xff007f, 0.5);
    this.ringGraphics.strokeCircle(0, 0, this.radius - 6);
    
    // Swirling vortex graphic
    this.ringGraphics.lineStyle(2, 0xd946ef, 0.75);
    for (let i = 0; i < 4; i++) {
      const start = rotationAngle + (i * Math.PI / 2);
      const end = start + 1.2;
      this.ringGraphics.beginPath();
      this.ringGraphics.arc(0, 0, this.radius * 0.6, start, end, false);
      this.ringGraphics.strokePath();
    }
  }

  onPlayerLand(player: Player): void {
    this.triggerWormholeTeleport(player);
  }

  private triggerWormholeTeleport(player: Player): void {
    if (WormholePlanet.wormholeCooldown || !this.partnerWormhole) return;
    
    WormholePlanet.wormholeCooldown = true;
    
    player.isFrozenInCrystal = true;
    if (player.body) {
      player.body.setVelocity(0, 0);
    }
    
    AudioManager.playTeleport();
    
    this.scene.tweens.add({
      targets: player,
      scaleX: 0.1,
      scaleY: 0.1,
      alpha: 0.2,
      duration: 200,
      ease: 'Back.easeIn',
      onComplete: () => {
        player.setPosition(this.partnerWormhole!.x, this.partnerWormhole!.y);
        
        this.scene.tweens.add({
          targets: player,
          scaleX: 1.0,
          scaleY: 1.0,
          alpha: 1.0,
          duration: 250,
          ease: 'Back.easeOut',
          onComplete: () => {
            player.isFrozenInCrystal = false;
            
            const launchAngle = Math.random() * Math.PI * 2;
            const launchSpeed = 480;
            
            player.changeState(new FlyState(
              Math.cos(launchAngle) * launchSpeed,
              Math.sin(launchAngle) * launchSpeed
            ));
            
            this.scene.time.delayedCall(1000, () => {
              WormholePlanet.wormholeCooldown = false;
            });
          }
        });
      }
    });
  }
}
