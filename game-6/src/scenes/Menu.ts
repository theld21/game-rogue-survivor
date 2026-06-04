import Phaser from 'phaser';
import EventBus from '../EventBus.ts';
import AudioManager from '../core/AudioManager.ts';
import { COLORS, WORLD, CargoKind } from '../config.ts';

// =====================================================================
// Menu.ts — Title backdrop only (sunset neon city). Mission board + shop
// are pure DOM (main.ts). Emits scene transitions from DOM intents.
// =====================================================================

export class Menu extends Phaser.Scene {
  private cloudOffset = 0;
  private clouds!: Phaser.GameObjects.Graphics;

  constructor() { super('Menu'); }

  create(): void {
    this.drawBackdrop();
    AudioManager.startMusic('menu');

    EventBus.emit('enter_menu');
    EventBus.removeAllListeners('start_run');
    EventBus.removeAllListeners('open_shop');
    EventBus.on('start_run', (d: { route: number; cargo: CargoKind }) => {
      AudioManager.uiConfirm();
      AudioManager.stopMusic();
      this.scene.start('GamePlay', { route: d.route, cargo: d.cargo, streak: 0 });
    });
    EventBus.on('open_shop', () => { AudioManager.uiTap(); this.scene.start('Shop', { from: 'menu' }); });

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      EventBus.removeAllListeners('start_run');
      EventBus.removeAllListeners('open_shop');
    });
  }

  private drawBackdrop(): void {
    const g = this.add.graphics().setDepth(-10);
    const bands = 32;
    for (let i = 0; i < bands; i++) {
      const c = Phaser.Display.Color.Interpolate.ColorWithColor(
        Phaser.Display.Color.ValueToColor(COLORS.skyTop),
        Phaser.Display.Color.ValueToColor(COLORS.skyLow),
        bands, i);
      g.fillStyle(Phaser.Display.Color.GetColor(c.r, c.g, c.b), 1);
      g.fillRect(0, (i / bands) * WORLD.height, WORLD.width, WORLD.height / bands + 1);
    }
    // Sun
    g.fillStyle(COLORS.yellow, 0.9); g.fillCircle(WORLD.width / 2, WORLD.height * 0.5, 70);
    g.fillStyle(COLORS.duskGlow, 0.4); g.fillCircle(WORLD.width / 2, WORLD.height * 0.5, 95);
    // City
    const city = this.add.graphics().setDepth(-9);
    let x = -10;
    while (x < WORLD.width + 10) {
      const bw = 20 + Math.random() * 36, bh = 80 + Math.random() * 180;
      city.fillStyle(COLORS.nightInk, 0.9);
      city.fillRect(x, WORLD.height - bh, bw, bh);
      city.fillStyle(COLORS.yellow, 0.5);
      for (let wy = WORLD.height - bh + 8; wy < WORLD.height - 20; wy += 14)
        for (let wx = x + 4; wx < x + bw - 4; wx += 10)
          if (Math.random() < 0.5) city.fillRect(wx, wy, 3, 4);
      x += bw + 5;
    }
    // Drifting cloud strips
    this.clouds = this.add.graphics().setDepth(-9);
  }

  update(_t: number, delta: number): void {
    this.cloudOffset += delta * 0.004;
    const g = this.clouds; g.clear();
    g.fillStyle(COLORS.duskGlow, 0.12);
    for (let i = 0; i < 4; i++) {
      const y = 120 + i * 70;
      const x = ((this.cloudOffset * (20 + i * 8)) % (WORLD.width + 200)) - 100;
      g.fillRoundedRect(x, y, 120, 16, 8);
      g.fillRoundedRect(x - 200, y, 120, 16, 8);
    }
  }
}

export default Menu;
