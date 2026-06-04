import Phaser from 'phaser';
import EventBus from '../EventBus.ts';

export default class BootScene extends Phaser.Scene {
  constructor() { super('BootScene'); }

  preload(): void {
    // Simulate progress for procedural-only game (no real assets to load)
    let progress = 0;
    const interval = window.setInterval(() => {
      progress = Math.min(1, progress + 0.08 + Math.random() * 0.06);
      EventBus.emit('load_progress', progress);
      if (progress >= 1) {
        window.clearInterval(interval);
      }
    }, 80);
  }

  create(): void {
    // Small delay so the final progress bar animation completes
    this.time.delayedCall(400, () => {
      EventBus.emit('load_complete');
      this.scene.start('MenuScene');
    });
  }
}
