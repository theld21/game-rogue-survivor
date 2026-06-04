import Phaser from 'phaser';
import EventBus from '../EventBus.ts';
import AudioManager from '../utils/AudioManager.ts';
import GameProgress from '../utils/GameProgress.ts';

export default class MenuScene extends Phaser.Scene {
  private gfx!: Phaser.GameObjects.Graphics;
  private bgStars: Array<{x:number, y:number, r:number, alpha:number, speed:number}> = [];
  private dpr!: number;
  private W!: number;
  private H!: number;
  private t: number = 0;

  constructor() { super('MenuScene'); }

  create(): void {
    this.dpr = window.devicePixelRatio || 1;
    this.W   = this.scale.width;
    this.H   = this.scale.height;

    this.gfx = this.add.graphics();

    // Generate background star field
    for (let i = 0; i < 140; i++) {
      this.bgStars.push({
        x: Math.random() * this.W,
        y: Math.random() * this.H,
        r: (0.5 + Math.random() * 1.5) * this.dpr,
        alpha: 0.3 + Math.random() * 0.6,
        speed: (0.1 + Math.random() * 0.3) * this.dpr,
      });
    }

    // Start background music
    AudioManager.startMusic('menu');

    // Notify DOM overlay
    EventBus.emit('menu_ready', {
      wins:      GameProgress.getWins(),
      stardust:  GameProgress.getStardust(),
    });

    // Listen to play trigger
    EventBus.on('ui_start_game', this._startGame, this);
  }

  update(_time: number, delta: number): void {
    this.t += delta;
    this.gfx.clear();
    this.gfx.fillStyle(0x030008, 1);
    this.gfx.fillRect(0, 0, this.W, this.H);

    for (const s of this.bgStars) {
      s.y += s.speed;
      if (s.y > this.H) { s.y = 0; s.x = Math.random() * this.W; }
      const pulse = 0.5 + 0.5 * Math.sin(this.t * 0.001 + s.x);
      this.gfx.fillStyle(0xffffff, s.alpha * pulse);
      this.gfx.fillCircle(s.x, s.y, s.r);
    }

    // Animate a few large faint constellation lines
    this._drawConstellationDeco();
  }

  private _drawConstellationDeco(): void {
    const cx = this.W / 2;
    const cy = this.H / 2;
    const nodes = [
      { x: cx,       y: cy - 220 * this.dpr },
      { x: cx - 120 * this.dpr, y: cy - 80  * this.dpr },
      { x: cx + 130 * this.dpr, y: cy - 60  * this.dpr },
      { x: cx - 90  * this.dpr, y: cy + 100 * this.dpr },
      { x: cx + 100 * this.dpr, y: cy + 90  * this.dpr },
      { x: cx,       y: cy + 240 * this.dpr },
    ];
    const edges = [[0,1],[0,2],[1,3],[2,4],[3,5],[4,5],[1,2]];
    const a = 0.06 + 0.04 * Math.sin(this.t * 0.0008);
    this.gfx.lineStyle(1 * this.dpr, 0x00AAFF, a);
    for (const [i, j] of edges) {
      this.gfx.beginPath();
      this.gfx.moveTo(nodes[i].x, nodes[i].y);
      this.gfx.lineTo(nodes[j].x, nodes[j].y);
      this.gfx.strokePath();
    }
    for (const n of nodes) {
      this.gfx.fillStyle(0x00AAFF, a * 3);
      this.gfx.fillCircle(n.x, n.y, 4 * this.dpr);
    }
  }

  private _startGame(): void {
    EventBus.off('ui_start_game', this._startGame, this);
    AudioManager.stopMusic();
    this.scene.start('PlayScene');
  }

  shutdown(): void {
    EventBus.off('ui_start_game', this._startGame, this);
  }
}
