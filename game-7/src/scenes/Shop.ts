import Phaser from 'phaser';
import EventBus from '../EventBus.ts';
import AudioManager from '../core/AudioManager.ts';
import GameState from '../core/GameState.ts';
import { COLORS, WORLD, UpgradeKey } from '../config.ts';

export class Shop extends Phaser.Scene {
  constructor() { super('Shop'); }
  create(): void {
    const g = this.add.graphics().setDepth(-10);
    g.fillStyle(COLORS.gridInk, 1); g.fillRect(0, 0, WORLD.width, WORLD.height);
    g.lineStyle(1, COLORS.violet, 0.08);
    for (let y = 0; y <= WORLD.height; y += 30) g.lineBetween(0, y, WORLD.width, y);

    AudioManager.startMusic('menu');
    EventBus.emit('enter_shop');
    this.emitShopData();

    const on = (evt: string, fn: (...a: any[]) => void) => EventBus.on(evt, fn, this);
    on('shop_buy', (d: { key: UpgradeKey }) => { if (GameState.buyUpgrade(d.key)) AudioManager.upgrade(); else AudioManager.fail(); this.emitShopData(); });
    on('shop_close', () => { AudioManager.uiTap(); AudioManager.stopMusic(); this.teardown(); this.scene.start('Menu'); });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.teardown());
  }
  private emitShopData(): void {
    const keys: UpgradeKey[] = ['chain', 'parry', 'emp'];
    EventBus.emit('shop_data', {
      cubes: GameState.getCubes(),
      upgrades: keys.map((k) => ({ key: k, level: GameState.getUpgradeLevel(k), maxed: !GameState.canUpgrade(k), cost: GameState.upgradeCost(k) })),
    });
  }
  private teardown(): void { ['shop_buy', 'shop_close'].forEach((e) => EventBus.removeAllListeners(e)); }
}
export default Shop;
