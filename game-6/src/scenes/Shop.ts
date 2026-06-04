import Phaser from 'phaser';
import EventBus from '../EventBus.ts';
import AudioManager from '../core/AudioManager.ts';
import GameState from '../core/GameState.ts';
import { COLORS, WORLD, UpgradeKey } from '../config.ts';

// =====================================================================
// Shop.ts — Upgrade bay (DOM-driven). Backdrop + relays purchase intents.
// =====================================================================

export class Shop extends Phaser.Scene {
  constructor() { super('Shop'); }

  create(): void {
    const g = this.add.graphics().setDepth(-10);
    const bands = 24;
    for (let i = 0; i < bands; i++) {
      const c = Phaser.Display.Color.Interpolate.ColorWithColor(
        Phaser.Display.Color.ValueToColor(COLORS.skyTop),
        Phaser.Display.Color.ValueToColor(COLORS.skyMid),
        bands, i);
      g.fillStyle(Phaser.Display.Color.GetColor(c.r, c.g, c.b), 1);
      g.fillRect(0, (i / bands) * WORLD.height, WORLD.width, WORLD.height / bands + 1);
    }

    AudioManager.startMusic('menu');
    EventBus.emit('enter_shop');
    this.emitShopData();

    const on = (evt: string, fn: (...a: any[]) => void) => EventBus.on(evt, fn, this);
    on('shop_buy', (d: { key: UpgradeKey }) => {
      if (GameState.buyUpgrade(d.key)) AudioManager.upgrade(); else AudioManager.fail();
      this.emitShopData();
    });
    on('shop_close', () => { AudioManager.uiTap(); AudioManager.stopMusic(); this.teardown(); this.scene.start('Menu'); });

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.teardown());
  }

  private emitShopData(): void {
    const keys: UpgradeKey[] = ['engine', 'fuel', 'shield'];
    EventBus.emit('shop_data', {
      credits: GameState.getCredits(),
      upgrades: keys.map((k) => ({ key: k, level: GameState.getUpgradeLevel(k), maxed: !GameState.canUpgrade(k), cost: GameState.upgradeCost(k) })),
    });
  }

  private teardown(): void {
    ['shop_buy', 'shop_close'].forEach((e) => EventBus.removeAllListeners(e));
  }
}

export default Shop;
