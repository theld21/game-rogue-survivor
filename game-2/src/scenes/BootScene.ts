import Phaser from 'phaser';
import { SplashScreen } from '@capacitor/splash-screen';
import EventBus from '../EventBus.ts';
import AudioManager from '../utils/AudioManager.ts';
import GameProgress from '../utils/GameProgress.ts';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  init(): void {
    // 1. Hide native Capacitor splash screen as soon as Phaser starts
    try {
      SplashScreen.hide();
    } catch (e) {
      // Ignore if not running in capacitor native shell
      console.log('Capacitor shell not detected, skipping native splash hide.');
    }

    // Initialize audio systems and load saves
    AudioManager.init();
    GameProgress.load();
  }

  preload(): void {
    // Since we are not loading external images (0 pngs), we will draw all textures 
    // onto canvases at boot time, and inject them into Phaser's texture cache.
    this.createProceduralTextures();

    // Trigger loading bar increments for UI overlay synchronization
    this.load.on('progress', (progress: number) => {
      EventBus.emit('load_progress', progress);
    });

    this.load.on('complete', () => {
      EventBus.emit('load_progress', 1.0);
      this.time.delayedCall(1000, () => {
        EventBus.emit('load_complete');
        this.scene.start('MenuScene');
      });
    });
  }

  private createProceduralTextures(): void {
    // 1. Particle Trail blur dot ('trail_dot')
    const canvas = this.textures.createCanvas('trail_dot', 16, 16);
    if (canvas) {
      const ctx = canvas.getContext();
      const grad = ctx.createRadialGradient(8, 8, 0, 8, 8, 8);
      grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
      grad.addColorStop(0.3, 'rgba(255, 255, 255, 0.8)');
      grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
      
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(8, 8, 8, 0, Math.PI * 2);
      ctx.fill();
      canvas.refresh();
    }

    // 2. Standard Collectible Energy Shard diamond texture ('shard_dot')
    const canvas2 = this.textures.createCanvas('shard_dot', 16, 16);
    if (canvas2) {
      const ctx = canvas2.getContext();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(8, 0);
      ctx.lineTo(16, 8);
      ctx.lineTo(8, 16);
      ctx.lineTo(0, 8);
      ctx.closePath();
      ctx.fill();
      canvas2.refresh();
    }

    // 3. Golden Core: Star texture ('star_core')
    const canvas3 = this.textures.createCanvas('star_core', 16, 16);
    if (canvas3) {
      const ctx = canvas3.getContext();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      const cx = 8, cy = 8, spikes = 5, outerRadius = 8, innerRadius = 3;
      let rot = (Math.PI / 2) * 3;
      let x = cx, y = cy;
      const step = Math.PI / spikes;
      ctx.moveTo(cx, cy - outerRadius);
      for (let i = 0; i < spikes; i++) {
        x = cx + Math.cos(rot) * outerRadius;
        y = cy + Math.sin(rot) * outerRadius;
        ctx.lineTo(x, y);
        rot += step;
        x = cx + Math.cos(rot) * innerRadius;
        y = cy + Math.sin(rot) * innerRadius;
        ctx.lineTo(x, y);
        rot += step;
      }
      ctx.closePath();
      ctx.fill();
      canvas3.refresh();
    }

    // 4. Shield Bubble powerup texture ('shield_bubble')
    const canvas4 = this.textures.createCanvas('shield_bubble', 16, 16);
    if (canvas4) {
      const ctx = canvas4.getContext();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
      ctx.beginPath();
      ctx.arc(8, 8, 6.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(8, 4); ctx.lineTo(8, 12);
      ctx.moveTo(4, 8); ctx.lineTo(12, 8);
      ctx.stroke();
      canvas4.refresh();
    }

    // 5. Magnet Cell powerup texture ('magnet_cell')
    const canvas5 = this.textures.createCanvas('magnet_cell', 16, 16);
    if (canvas5) {
      const ctx = canvas5.getContext();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2.0;
      ctx.beginPath();
      ctx.arc(8, 7, 4.5, 0, Math.PI, true);
      ctx.lineTo(3.5, 12.5);
      ctx.moveTo(12.5, 7);
      ctx.lineTo(12.5, 12.5);
      ctx.stroke();
      canvas5.refresh();
    }

    // 6. Slow Anomaly trap texture ('slow_anomaly')
    const canvas6 = this.textures.createCanvas('slow_anomaly', 16, 16);
    if (canvas6) {
      const ctx = canvas6.getContext();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.beginPath();
      ctx.arc(8, 8, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      // Draw inner biohazard-like / hourglass lines
      ctx.beginPath();
      ctx.moveTo(5, 5); ctx.lineTo(11, 11);
      ctx.moveTo(11, 5); ctx.lineTo(5, 11);
      ctx.stroke();
      canvas6.refresh();
    }

    // 7. Volatile Mine trap texture ('volatile_mine')
    const canvas7 = this.textures.createCanvas('volatile_mine', 16, 16);
    if (canvas7) {
      const ctx = canvas7.getContext();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.8;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
      
      // Draw spiked core
      ctx.beginPath();
      const cx = 8, cy = 8, r = 4;
      const spikes = 8;
      ctx.moveTo(cx + r, cy);
      for (let i = 0; i < spikes; i++) {
        const angle = (i * Math.PI * 2) / spikes;
        ctx.lineTo(cx + Math.cos(angle) * (r + 3.5), cy + Math.sin(angle) * (r + 3.5));
        ctx.lineTo(cx + Math.cos(angle + Math.PI / spikes) * r, cy + Math.sin(angle + Math.PI / spikes) * r);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      canvas7.refresh();
    }

    // 8. Meteor obstacle texture ('meteor')
    const canvas8 = this.textures.createCanvas('meteor', 24, 24);
    if (canvas8) {
      const ctx = canvas8.getContext();
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      
      // Draw jagged asteroid shape
      ctx.beginPath();
      const cx = 12, cy = 12, r = 8;
      const points = 7;
      for (let i = 0; i < points; i++) {
        const angle = (i * Math.PI * 2) / points;
        const radiusOffset = (Math.sin(i * 3) * 2.5); // Jaggedness
        const pr = r + radiusOffset;
        const px = cx + Math.cos(angle) * pr;
        const py = cy + Math.sin(angle) * pr;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      canvas8.refresh();
    }
  }
}
export default BootScene;
