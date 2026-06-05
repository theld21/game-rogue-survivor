import Phaser from 'phaser';
import EventBus from '../EventBus.ts';
import AudioManager from '../core/AudioManager.ts';
import { COLORS } from '../config.ts';

// =====================================================================
// Menu.ts — a calm sinking-particles backdrop behind the DOM menu.
// Starts the Dive scene on the DOM 'start_dive' intent.
// =====================================================================
export class Menu extends Phaser.Scene {
  private bubbles: Phaser.GameObjects.Image[] = [];
  constructor() { super('Menu'); }
  create(): void {
    this.cameras.main.setBackgroundColor(0x041d30);
    const { width: w, height: h } = this.scale;
    const g = this.add.graphics().setDepth(-5);
    g.fillGradientStyle(COLORS.shallow, COLORS.shallow, COLORS.abyss, COLORS.abyss, 1); g.fillRect(0, 0, w, h);
    for (let i = 0; i < 24; i++) this.bubbles.push(this.add.image(Math.random() * w, Math.random() * h, 'bubble').setScale(0.2 + Math.random() * 0.5).setAlpha(0.25 + Math.random() * 0.3).setTint(COLORS.cockpit));
    EventBus.on('start_dive', this.startDive, this);
    EventBus.emit('enter_menu');
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => EventBus.off('start_dive', this.startDive, this));
  }
  update(_t: number, delta: number): void { const h = this.scale.height; for (const b of this.bubbles) { b.y -= (10 + b.scale * 20) * delta / 1000; if (b.y < -10) b.y = h + 10; } }
  private startDive(): void { AudioManager.uiConfirm(); this.scene.start('Dive'); }
}
export default Menu;
