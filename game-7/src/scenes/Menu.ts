import Phaser from 'phaser';
import EventBus from '../EventBus.ts';
import AudioManager from '../core/AudioManager.ts';
import { COLORS, WORLD } from '../config.ts';

export class Menu extends Phaser.Scene {
  private t = 0;
  private grid!: Phaser.GameObjects.Graphics;

  constructor() { super('Menu'); }

  create(): void {
    const bg = this.add.graphics().setDepth(-10);
    bg.fillStyle(COLORS.voidBlack, 1); bg.fillRect(0, 0, WORLD.width, WORLD.height);
    this.grid = this.add.graphics().setDepth(-9);
    AudioManager.startMusic('menu');

    EventBus.emit('enter_menu');
    EventBus.removeAllListeners('start_run');
    EventBus.removeAllListeners('open_shop');
    EventBus.on('start_run', (level: number) => { AudioManager.uiConfirm(); AudioManager.stopMusic(); this.scene.start('GamePlay', { level }); });
    EventBus.on('open_shop', () => { AudioManager.uiTap(); this.scene.start('Shop'); });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => { EventBus.removeAllListeners('start_run'); EventBus.removeAllListeners('open_shop'); });
  }

  update(_t: number, delta: number): void {
    this.t += delta * 0.001;
    const g = this.grid; g.clear();
    // Perspective scroll grid
    const off = (this.t * 30) % 36;
    g.lineStyle(1, COLORS.cyan, 0.1);
    for (let x = 0; x <= WORLD.width; x += 36) g.lineBetween(x, 0, x, WORLD.height);
    for (let y = off; y <= WORLD.height; y += 36) g.lineBetween(0, y, WORLD.width, y);
    g.lineStyle(1, COLORS.violet, 0.06);
    const pulse = WORLD.height * 0.35 + Math.sin(this.t) * 20;
    g.lineBetween(0, pulse, WORLD.width, pulse);
  }
}
export default Menu;
