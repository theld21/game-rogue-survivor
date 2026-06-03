import Phaser from 'phaser';
import Player from '../Player.ts';
import { FlyState } from '../PlayerState.ts';
import AudioManager from '../../utils/AudioManager.ts';

export class RefractorCrystal extends Phaser.GameObjects.Container {
  declare body: Phaser.Physics.Arcade.Body;
  
  private graphics: Phaser.GameObjects.Graphics;
  private pointerGraphics: Phaser.GameObjects.Graphics;
  private isCaptured: boolean = false;
  private pointerAngle: number = 0;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y);
    
    this.graphics = scene.add.graphics();
    this.add(this.graphics);

    this.pointerGraphics = scene.add.graphics();
    this.add(this.pointerGraphics);

    scene.add.existing(this);
    scene.physics.add.existing(this, true);

    this.body.setCircle(15, -15, -15);
    this.drawCrystal();
  }

  private drawCrystal(): void {
    this.graphics.clear();
    const now = this.scene.time.now;
    
    this.graphics.fillStyle(0xfbbf24, this.isCaptured ? 0.3 : 0.1);
    this.graphics.lineStyle(2.5, 0xfbbf24, 1);
    
    this.graphics.beginPath();
    this.graphics.moveTo(0, -15);
    this.graphics.lineTo(12, 0);
    this.graphics.lineTo(0, 15);
    this.graphics.lineTo(-12, 0);
    this.graphics.closePath();
    this.graphics.fillPath();
    this.graphics.strokePath();

    if (!this.isCaptured) {
      this.y += Math.sin(now / 200) * 0.05;
    }
  }

  preUpdate(time: number, delta: number): void {
    this.drawCrystal();
    
    if (this.isCaptured) {
      const rotSpeed = 3.8;
      const dtSeconds = delta / 1000;
      this.pointerAngle += rotSpeed * dtSeconds;
      
      this.pointerGraphics.clear();
      
      this.pointerGraphics.lineStyle(3, 0xfbbf24, 0.9);
      const len = 35;
      const px = Math.cos(this.pointerAngle) * len;
      const py = Math.sin(this.pointerAngle) * len;
      this.pointerGraphics.lineBetween(0, 0, px, py);
      
      const tipAngle = this.pointerAngle;
      const tx = Math.cos(tipAngle) * (len + 6);
      const ty = Math.sin(tipAngle) * (len + 6);
      
      const wing1x = Math.cos(tipAngle + 2.5) * 10 + px;
      const wing1y = Math.sin(tipAngle + 2.5) * 10 + py;
      const wing2x = Math.cos(tipAngle - 2.5) * 10 + px;
      const wing2y = Math.sin(tipAngle - 2.5) * 10 + py;
      
      this.pointerGraphics.fillStyle(0xfbbf24, 1);
      this.pointerGraphics.beginPath();
      this.pointerGraphics.moveTo(tx, ty);
      this.pointerGraphics.lineTo(wing1x, wing1y);
      this.pointerGraphics.lineTo(wing2x, wing2y);
      this.pointerGraphics.closePath();
      this.pointerGraphics.fillPath();
    } else {
      this.pointerGraphics.clear();
    }
  }

  capturePlayer(player: Player): void {
    if (this.isCaptured || player.isFrozenInCrystal) return;
    
    this.isCaptured = true;
    player.isFrozenInCrystal = true;
    
    player.setPosition(this.x, this.y);
    if (player.body) {
      player.body.setVelocity(0, 0);
    }
    
    AudioManager.playShard();
    
    this.scene.tweens.add({
      targets: this,
      scaleX: 1.25,
      scaleY: 1.25,
      duration: 100,
      yoyo: true
    });

    const releaseTime = 550;
    
    const handleTapRelease = () => {
      this.releasePlayer(player);
    };
    
    this.scene.input.once('pointerdown', handleTapRelease);
    
    this.scene.time.delayedCall(releaseTime, () => {
      this.scene.input.off('pointerdown', handleTapRelease);
      this.releasePlayer(player);
    });
  }

  private releasePlayer(player: Player): void {
    if (!this.isCaptured) return;
    this.isCaptured = false;
    
    player.isFrozenInCrystal = false;
    AudioManager.playJump();
    
    const launchSpeed = 500;
    const vx = Math.cos(this.pointerAngle) * launchSpeed;
    const vy = Math.sin(this.pointerAngle) * launchSpeed;
    
    player.changeState(new FlyState(vx, vy));
    
    this.body.enable = false;
    this.scene.time.delayedCall(1200, () => {
      this.body.enable = true;
    });
  }
}
export default RefractorCrystal;
