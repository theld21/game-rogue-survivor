import Phaser from 'phaser';
import EventBus from '../EventBus.ts';
import AudioManager from '../core/AudioManager.ts';
import Starfield from '../systems/Starfield.ts';

// =====================================================================
// Menu.ts — Title scene.
//
// Only draws the animated starfield backdrop; the hero ship and title are
// pure DOM (main.ts / index.html) so they share one flex layout and can
// never overlap on any device. Listens for 'start_run' / 'open_shop'.
// =====================================================================

export class Menu extends Phaser.Scene {
  private starfield!: Starfield;

  constructor() { super('Menu'); }

  create(): void {
    this.starfield = new Starfield(this);
    AudioManager.startMusic('menu');

    EventBus.emit('enter_menu');

    EventBus.removeAllListeners('start_run');
    EventBus.removeAllListeners('open_shop');
    EventBus.on('start_run', (level: number) => {
      AudioManager.uiConfirm();
      AudioManager.stopMusic();
      this.scene.start('GamePlay', { level });
    });
    EventBus.on('open_shop', () => {
      AudioManager.uiTap();
      this.scene.start('Shop', { from: 'menu' });
    });

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      EventBus.removeAllListeners('start_run');
      EventBus.removeAllListeners('open_shop');
      this.starfield.destroy();
    });
  }

  update(_time: number, delta: number): void {
    this.starfield.update(70, delta / 1000);
  }
}

export default Menu;
