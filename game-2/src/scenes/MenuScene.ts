import Phaser from 'phaser';
import EventBus from '../EventBus.ts';
import AudioManager from '../utils/AudioManager.ts';

export class MenuScene extends Phaser.Scene {
  private bgGraphics!: Phaser.GameObjects.Graphics;
  private animAngle: number = 0;
  private stars: Array<{ dist: number; angle: number; speed: number; phase: number; size: number; baseAlpha: number }> = [];

  constructor() {
    super('MenuScene');
  }

  create(): void {
    // Add lobby graphics node
    this.bgGraphics = this.add.graphics();
    
    // Spawn menu background stars for cosmic effect
    this.stars = [];
    const maxRadius = Math.max(this.scale.width, this.scale.height, 1000);
    for (let i = 0; i < 70; i++) {
      this.stars.push({
        dist: 30 + Math.random() * (maxRadius - 30),
        angle: Math.random() * Math.PI * 2,
        speed: 0.4 + Math.random() * 1.2,
        phase: Math.random() * Math.PI * 2,
        size: 1 + Math.random() * 2.2,
        baseAlpha: 0.2 + Math.random() * 0.6
      });
    }

    // Play menu synthesizer music
    AudioManager.stopMusic();
    AudioManager.startMusic('menu');

    // Sync current high scores and shard balance to HTML UI
    EventBus.emit('menu_ready');

    // Register UI trigger to start game
    EventBus.once('ui_start_game', () => {
      AudioManager.stopMusic();
      this.scene.start('PlayScene');
    });
  }

  update(time: number, delta: number): void {
    this.bgGraphics.clear();
    
    const dtSeconds = delta / 1000;
    this.animAngle += 0.8 * dtSeconds;
    
    const centerX = this.scale.width / 2;
    const centerY = this.scale.height / 2;
    
    // 1. Render dynamic twinkling rotating starfield
    this.stars.forEach(star => {
      // Slow rotation over time
      star.angle += 0.015 * dtSeconds * (star.speed > 0.8 ? 1 : -1);
      
      const sx = centerX + star.dist * Math.cos(star.angle);
      const sy = centerY + star.dist * Math.sin(star.angle);
      
      // Calculate twinkling opacity
      const alpha = star.baseAlpha + 0.22 * Math.sin(this.animAngle * star.speed + star.phase);
      const finalAlpha = Math.max(0.1, Math.min(0.95, alpha));
      
      this.bgGraphics.fillStyle(0xffffff, finalAlpha);
      this.bgGraphics.fillCircle(sx, sy, star.size);
    });

    // 2. Render concentric neon orbital tracks (Brighter opacities per user request)
    // Orbit 1 (Cyan)
    this.bgGraphics.lineStyle(1.5, 0x00f0ff, 0.38);
    this.bgGraphics.strokeCircle(centerX, centerY, 120);
    
    // Orbit 2 (Pink)
    this.bgGraphics.lineStyle(1.5, 0xff007f, 0.32);
    this.bgGraphics.strokeCircle(centerX, centerY, 200);
    
    // Orbit 3 (Purple)
    this.bgGraphics.lineStyle(1.5, 0xd946ef, 0.26);
    this.bgGraphics.strokeCircle(centerX, centerY, 280);
    
    // 3. Render Central Sun and glowing halos (Cosmic Energy source)
    const pulseFactor1 = 1 + 0.06 * Math.sin(this.animAngle * 2.5);
    const pulseFactor2 = 1 + 0.12 * Math.sin(this.animAngle * 2.5 + Math.PI / 2);
    
    // Outer halo 2 (Faint)
    this.bgGraphics.fillStyle(0xfbbf24, 0.05);
    this.bgGraphics.fillCircle(centerX, centerY, 58 * pulseFactor2);

    // Outer halo 1
    this.bgGraphics.fillStyle(0xfbbf24, 0.12);
    this.bgGraphics.fillCircle(centerX, centerY, 42 * pulseFactor1);

    // Sun solid core
    this.bgGraphics.fillStyle(0xfbbf24, 0.9);
    this.bgGraphics.fillCircle(centerX, centerY, 28);

    // Sun inner core highlights
    this.bgGraphics.fillStyle(0xffffff, 0.5);
    this.bgGraphics.fillCircle(centerX, centerY, 10);
    
    // 4. Render automatic rotating dot indicators
    // Dot 1
    const d1x = centerX + 120 * Math.cos(this.animAngle);
    const d1y = centerY + 120 * Math.sin(this.animAngle);
    this.bgGraphics.fillStyle(0x00f0ff, 0.85);
    this.bgGraphics.fillCircle(d1x, d1y, 6);
    this.bgGraphics.lineStyle(2, 0xffffff, 0.7);
    this.bgGraphics.strokeCircle(d1x, d1y, 10);
    
    // Dot 2 (opposite direction)
    const d2x = centerX + 200 * Math.cos(-this.animAngle * 0.7);
    const d2y = centerY + 200 * Math.sin(-this.animAngle * 0.7);
    this.bgGraphics.fillStyle(0xff007f, 0.85);
    this.bgGraphics.fillCircle(d2x, d2y, 8);
    this.bgGraphics.lineStyle(2, 0xffffff, 0.6);
    this.bgGraphics.strokeCircle(d2x, d2y, 12);
    
    // Dot 3
    const d3x = centerX + 280 * Math.cos(this.animAngle * 0.4);
    const d3y = centerY + 280 * Math.sin(this.animAngle * 0.4);
    this.bgGraphics.fillStyle(0xd946ef, 0.7);
    this.bgGraphics.fillCircle(d3x, d3y, 7);
  }
}
export default MenuScene;
