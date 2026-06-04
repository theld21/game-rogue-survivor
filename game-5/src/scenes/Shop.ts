import Phaser from 'phaser';
import EventBus from '../EventBus.ts';
import AudioManager from '../core/AudioManager.ts';
import GameState from '../core/GameState.ts';
import Starfield from '../systems/Starfield.ts';
import { CONSUMABLES, ConsumableKey } from '../config.ts';

// =====================================================================
// Shop.ts — Between-runs upgrade bay (Cyberpunk glassmorphism DOM).
//
// Phaser side only paints the drifting starfield backdrop; all shop UI is
// Tailwind DOM in main.ts. The scene relays purchase intents to GameState
// and re-emits fresh shop data so the DOM can re-render.
// =====================================================================

interface ShopData {
  from: 'menu' | 'run';
  nextLevel?: number;
}

export class Shop extends Phaser.Scene {
  private starfield!: Starfield;
  private fromCtx: 'menu' | 'run' = 'menu';
  private nextLevel = 1;

  constructor() { super('Shop'); }

  create(data: ShopData): void {
    this.fromCtx = data?.from ?? 'menu';
    this.nextLevel = data?.nextLevel ?? GameState.getHighestLevel();

    this.starfield = new Starfield(this);
    AudioManager.startMusic('menu');

    EventBus.emit('enter_shop', { from: this.fromCtx, nextLevel: this.nextLevel });
    this.emitShopData();

    this.registerHandlers();
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.teardown());
  }

  private emitShopData(): void {
    const keys = ['laser', 'claw', 'fuel', 'radar'] as const;
    const upgrades = keys.map((k) => ({
      key: k,
      level: GameState.getUpgradeLevel(k),
      maxed: !GameState.canUpgrade(k),
      cost: GameState.upgradeCost(k),
    }));
    const cKeys = Object.keys(CONSUMABLES) as ConsumableKey[];
    const consumables = cKeys.map((k) => ({
      key: k,
      owned: GameState.getConsumable(k),
      cost: CONSUMABLES[k].cost,
    }));
    EventBus.emit('shop_data', {
      credits: GameState.getCredits(),
      upgrades,
      consumables,
      from: this.fromCtx,
      nextLevel: this.nextLevel,
    });
  }

  private registerHandlers(): void {
    const on = (evt: string, fn: (...a: any[]) => void) => EventBus.on(evt, fn, this);

    on('shop_buy', (d: { key: 'laser' | 'claw' | 'fuel' | 'radar' }) => {
      if (GameState.buyUpgrade(d.key)) {
        AudioManager.upgrade();
      } else {
        AudioManager.alarm();
      }
      this.emitShopData();
    });

    on('shop_buy_consumable', (d: { key: ConsumableKey }) => {
      const cost = CONSUMABLES[d.key].cost;
      if (GameState.spendCredits(cost)) {
        GameState.addConsumable(d.key, 1);
        AudioManager.upgrade();
      } else {
        AudioManager.alarm();
      }
      this.emitShopData();
    });

    on('shop_start_next', () => {
      AudioManager.uiConfirm();
      AudioManager.stopMusic();
      this.teardown();
      this.scene.start('GamePlay', { level: this.nextLevel });
    });

    on('shop_to_menu', () => {
      AudioManager.uiTap();
      AudioManager.stopMusic();
      this.teardown();
      this.scene.start('Menu');
    });
  }

  update(_time: number, delta: number): void {
    this.starfield.update(60, delta / 1000);
  }

  private teardown(): void {
    ['shop_buy', 'shop_buy_consumable', 'shop_start_next', 'shop_to_menu'].forEach((e) => EventBus.removeAllListeners(e));
    this.starfield?.destroy();
  }
}

export default Shop;
