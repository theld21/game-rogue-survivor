import Phaser from 'phaser';
import EventBus from '../EventBus.ts';
import AudioManager from '../core/AudioManager.ts';
import Ocean from '../entities/Ocean.ts';
import { COLORS } from '../core/GameConfig.ts';

// =====================================================================
// MenuScene.ts — Title sea.
//
// Lightweight: an animated ocean with a bobbing hero ship behind the DOM
// title/level-select overlay. The HTML menu (main.ts) reads progress from
// Storage and emits 'start_level'; we listen and launch PlayScene.
// =====================================================================

export class MenuScene extends Phaser.Scene {
  private ocean!: Ocean;
  private hero!: Phaser.GameObjects.Container;

  constructor() {
    super('MenuScene');
  }

  create(): void {
    this.ocean = new Ocean(this);
    AudioManager.startMusic('menu');

    this.drawHeroShip();

    EventBus.emit('enter_menu');

    EventBus.removeAllListeners('start_level');
    EventBus.on('start_level', (level: number) => {
      AudioManager.uiTap();
      AudioManager.stopMusic();
      this.scene.start('PlayScene', { level });
    });

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      EventBus.removeAllListeners('start_level');
    });
  }

  private drawHeroShip(): void {
    const cx = this.scale.width / 2;
    const cy = this.scale.height * 0.62;
    this.hero = this.add.container(cx, cy).setDepth(5);

    const g = this.add.graphics();
    const L = 120;
    const W = 60;
    // Hull (pointing up)
    g.fillStyle(0x081826, 0.96);
    const pts = [
      new Phaser.Geom.Point(0, -0.55 * L),
      new Phaser.Geom.Point(0.5 * W, -0.2 * L),
      new Phaser.Geom.Point(0.46 * W, 0.42 * L),
      new Phaser.Geom.Point(0.22 * W, 0.5 * L),
      new Phaser.Geom.Point(-0.22 * W, 0.5 * L),
      new Phaser.Geom.Point(-0.46 * W, 0.42 * L),
      new Phaser.Geom.Point(-0.5 * W, -0.2 * L),
    ];
    g.fillPoints(pts, true);
    g.lineStyle(3, COLORS.teal, 1);
    g.strokePoints(pts, true);
    // Mast + sails
    g.fillStyle(COLORS.cyan, 0.85);
    g.fillTriangle(-2, -0.2 * L, -0.42 * W, 0.25 * L, -2, 0.25 * L);
    g.fillTriangle(2, -0.2 * L, 0.42 * W, 0.25 * L, 2, 0.25 * L);
    g.lineStyle(2, COLORS.teal, 0.9);
    g.strokeTriangle(-2, -0.2 * L, -0.42 * W, 0.25 * L, -2, 0.25 * L);
    g.strokeTriangle(2, -0.2 * L, 0.42 * W, 0.25 * L, 2, 0.25 * L);
    // Flag
    g.fillStyle(COLORS.gold, 1);
    g.fillTriangle(0, -0.55 * L, 26, -0.5 * L, 0, -0.42 * L);
    this.hero.add(g);

    // Bob + sway
    this.tweens.add({ targets: this.hero, y: cy - 14, duration: 2200, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    this.tweens.add({ targets: this.hero, angle: 4, duration: 2600, yoyo: true, repeat: -1, ease: 'Sine.inOut' });

    // Drift the camera slowly for living water
    this.tweens.add({ targets: this.cameras.main, scrollX: 200, duration: 9000, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
  }

  update(time: number): void {
    this.ocean.update(this.cameras.main, time);
  }
}

export default MenuScene;
