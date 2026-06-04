import Phaser from 'phaser';
import EventBus from '../EventBus.ts';
import AudioManager from '../core/AudioManager.ts';

// =====================================================================
// Menu.ts — a calm drifting-stars backdrop behind the DOM menu overlay
// (title / launch / hangar live in index.html). Starts the World scene
// on the DOM's 'start_run' intent.
// =====================================================================

export class Menu extends Phaser.Scene {
  private stars?: Phaser.GameObjects.TileSprite;
  constructor() { super('Menu'); }

  create(): void {
    this.cameras.main.setBackgroundColor(0x0a1228);
    this.stars = this.add.tileSprite(0, 0, this.scale.width, this.scale.height, 'stars').setOrigin(0).setScrollFactor(0);
    EventBus.on('start_run', this.startRun, this);
    EventBus.emit('enter_menu');
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => EventBus.off('start_run', this.startRun, this));
  }
  update(): void { if (this.stars) { this.stars.tilePositionX += 0.18; this.stars.tilePositionY += 0.06; } }
  private startRun(): void { AudioManager.uiConfirm(); this.scene.start('World'); }
}
export default Menu;
