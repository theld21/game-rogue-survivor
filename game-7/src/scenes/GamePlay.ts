import Phaser from 'phaser';
import { gsap } from 'gsap';
import EventBus from '../EventBus.ts';
import AudioManager from '../core/AudioManager.ts';
import GameState from '../core/GameState.ts';
import { COLORS, CSS, WORLD, NINJA, TIME, PATH, EMP, BOUNCE, FRONT_HIT_DMG, LASER_DMG_PER_SEC, BULLET_DMG } from '../config.ts';
import { getLevel, LevelDef, MAX_LEVEL, PlatformDef, WallDef } from '../data/Levels.ts';
import FX from '../systems/FX.ts';
import PathDraw from '../systems/PathDraw.ts';
import BulletPool from '../systems/BulletPool.ts';
import Ninja from '../entities/Ninja.ts';
import Enemy from '../entities/Enemy.ts';

// =====================================================================
// GamePlay.ts — Tactical slingshot core loop.
//
// Time is ONE scalar `gameScale`: hold → slow (0.1), release → dash (1.5),
// idle → 1. Every entity integrates `dt = realDt * gameScale`. Hit-stop is
// a REAL-time freeze that ignores gameScale. Dash is a manual node queue.
// =====================================================================

type DashState = 'idle' | 'aiming' | 'dashing';

export class GamePlay extends Phaser.Scene {
  private level!: LevelDef;
  private ninja!: Ninja;
  private enemies: Enemy[] = [];
  private platforms: PlatformDef[] = [];
  private walls: WallDef[] = [];
  private deadZoneY = 760;
  private bounds!: Phaser.Geom.Rectangle;

  private path!: PathDraw;
  private bullets!: BulletPool;
  private fx!: FX;
  private slowOverlay!: Phaser.GameObjects.Graphics;

  // time
  private gameScale = TIME.normal;
  private hitStopRemaining = 0;

  // dash sequencer
  private dashState: DashState = 'idle';
  private dashQueue: Enemy[] = [];
  private dashIndex = 0;
  private dashFrom = { x: 0, y: 0 };
  private dashTarget: Enemy | null = null;
  private dashT = 0;
  private combo = 0;
  private dashBounce: { point: { x: number; y: number }; beforeIndex: number } | null = null;
  // Free-fly: a bounce with NO target — fly along the reflected ray until a wall/edge, then fall.
  private dashFreeFly: { via: { x: number; y: number }; to: { x: number; y: number } } | null = null;
  private freeFlyActive = false;
  private freeFlyFrom = { x: 0, y: 0 };

  private stunUntil = 0;
  private chainLimit = PATH.baseChainLimit;
  private score = 0;
  private isOver = false;
  private isPaused = false;
  private hudAccum = 0;

  constructor() { super('GamePlay'); }

  create(data: { level: number }): void {
    this.resetState();
    this.level = getLevel(data?.level ?? 1);
    this.bounds = new Phaser.Geom.Rectangle(0, 0, WORLD.width, WORLD.height);
    this.chainLimit = GameState.chainLimit(PATH.baseChainLimit);

    this.drawBackground();
    this.fx = new FX(this);
    this.path = new PathDraw(this);
    this.bullets = new BulletPool(this);

    this.platforms = this.level.platforms;
    this.walls = this.level.walls;
    this.drawArena();

    this.level.enemies.forEach((s) => this.enemies.push(new Enemy(this, s.x, s.y, s.kind, s.facing)));

    // Ninja on the lowest platform
    const start = this.platforms.reduce((a, b) => (b.y > a.y ? b : a));
    this.ninja = new Ninja(this, start.x, start.y - NINJA.radius);
    this.ninja.setMode('idle');

    this.buildSlowOverlay();

    this.setupInput();
    this.registerHandlers();

    AudioManager.startMusic('game', this.level.id - 1);
    EventBus.emit('enter_game', { level: this.level.id, name: this.level.name });
    this.emitHud(true);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.teardown());
  }

  private resetState(): void {
    this.enemies = []; this.platforms = []; this.walls = [];
    this.gameScale = TIME.normal; this.hitStopRemaining = 0;
    this.dashState = 'idle'; this.dashQueue = []; this.dashIndex = 0; this.dashT = 0; this.dashTarget = null; this.dashBounce = null;
    this.dashFreeFly = null; this.freeFlyActive = false;
    this.combo = 0; this.stunUntil = 0; this.score = 0;
    this.isOver = false; this.isPaused = false; this.hudAccum = 0;
    this.tornDown = false;
  }

  // -- Visuals ---------------------------------------------------------
  private drawBackground(): void {
    const g = this.add.graphics().setDepth(-10);
    g.fillStyle(COLORS.voidBlack, 1); g.fillRect(0, 0, WORLD.width, WORLD.height);
    // Cyber grid
    g.lineStyle(1, COLORS.cyan, 0.06);
    for (let x = 0; x <= WORLD.width; x += 30) g.lineBetween(x, 0, x, WORLD.height);
    for (let y = 0; y <= WORLD.height; y += 30) g.lineBetween(0, y, WORLD.width, y);
    // Scanline glow bands
    g.fillStyle(COLORS.violet, 0.04);
    for (let y = 0; y < WORLD.height; y += 120) g.fillRect(0, y, WORLD.width, 40);
  }

  private drawArena(): void {
    const g = this.add.graphics().setDepth(10);
    // Platforms
    this.platforms.forEach((p) => {
      g.fillStyle(COLORS.platform, 1);
      g.fillRoundedRect(p.x - p.w / 2, p.y, p.w, 12, 4);
      g.lineStyle(2.5, COLORS.platformEdge, 0.9);
      g.strokeRoundedRect(p.x - p.w / 2, p.y, p.w, 12, 4);
      g.fillStyle(COLORS.cyan, 0.5);
      for (let i = 0; i < 3; i++) g.fillCircle(p.x - p.w / 2 + 10 + i * (p.w - 20) / 2, p.y + 6, 1.5);
    });
    // Laser walls
    this.walls.forEach((w) => {
      g.fillStyle(COLORS.laser, 0.18); g.fillRect(w.x - w.w / 2, w.y - w.h / 2, w.w, w.h);
      g.lineStyle(2.5, COLORS.laser, 0.9); g.strokeRect(w.x - w.w / 2, w.y - w.h / 2, w.w, w.h);
    });
    // Dead-zone spikes at the bottom
    const dz = this.add.graphics().setDepth(11);
    this.deadZoneY = WORLD.height - 44;
    dz.fillStyle(COLORS.red, 0.12); dz.fillRect(0, this.deadZoneY, WORLD.width, 44);
    dz.fillStyle(COLORS.red, 0.85);
    for (let x = 0; x < WORLD.width; x += 22) dz.fillTriangle(x, WORLD.height, x + 11, this.deadZoneY + 6, x + 22, WORLD.height);
    dz.lineStyle(2, COLORS.red, 0.7); dz.lineBetween(0, this.deadZoneY, WORLD.width, this.deadZoneY);
  }

  // Slow-mo vignette: darkened edges + faint cyan tint, faded in while aiming.
  private buildSlowOverlay(): void {
    const g = this.add.graphics().setScrollFactor(0).setDepth(70).setAlpha(0);
    g.fillStyle(COLORS.cyan, 0.05); g.fillRect(0, 0, WORLD.width, WORLD.height);
    for (let k = 0; k < 10; k++) { g.lineStyle(8, COLORS.voidBlack, 0.07); g.strokeRect(k * 7, k * 7, WORLD.width - k * 14, WORLD.height - k * 14); }
    g.lineStyle(2, COLORS.cyan, 0.35); g.strokeRect(3, 3, WORLD.width - 6, WORLD.height - 6);
    this.slowOverlay = g;
  }
  private fadeSlow(on: boolean): void {
    gsap.killTweensOf(this.slowOverlay);
    gsap.to(this.slowOverlay, { alpha: on ? 1 : 0, duration: on ? 0.18 : 0.25 });
  }

  // -- Input -----------------------------------------------------------
  private setupInput(): void {
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (this.isOver || this.isPaused) return;
      if (this.dashState !== 'idle') return;
      if (this.ninja.state === 'stunned' || !this.ninja.alive) return;
      this.beginAim(p);
    });
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (this.dashState === 'aiming' && p.isDown) this.path.addPoint(p.worldX, p.worldY, this.enemies, this.walls, this.chainLimit);
    });
    const release = () => { if (this.dashState === 'aiming') this.endAim(); };
    this.input.on('pointerup', release);
    this.input.on('pointerupoutside', release);
  }

  private beginAim(_p: Phaser.Input.Pointer): void {
    this.dashState = 'aiming';
    this.gameScale = TIME.slow;
    this.ninja.vy = 0;                 // hover while planning
    this.ninja.setMode('aiming');
    this.path.begin(this.ninja.x, this.ninja.y);
    this.fadeSlow(true);
    AudioManager.slowEnter();
  }

  private endAim(): void {
    // A bounce always dashes — even with no target it free-flies off the wall.
    if (this.path.chain.length > 0 || this.path.bounceTargets.length > 0 || this.path.bounce) this.startDash();
    else { this.cancelAim(); }
  }

  private cancelAim(): void {
    this.path.clear();
    this.gameScale = TIME.normal;
    this.ninja.setMode('falling');
    this.fadeSlow(false);
    AudioManager.slowExit();
  }

  // -- Dash sequencer --------------------------------------------------
  private startDash(): void {
    this.dashQueue = [...this.path.chain, ...this.path.bounceTargets];
    this.dashBounce = (this.path.bounce && this.path.bounceTargets.length)
      ? { point: { ...this.path.bounce }, beforeIndex: this.path.chain.length }
      : null;
    // No reflected target → free-fly from the border point until a wall/edge.
    this.dashFreeFly = (this.path.bounce && this.path.bounceDir && this.path.bounceTargets.length === 0)
      ? { via: { x: this.path.bounce.x, y: this.path.bounce.y }, to: this.computeFlyEnd(this.path.bounce, this.path.bounceDir) }
      : null;
    this.path.hide();
    this.dashState = 'dashing';
    this.dashIndex = 0;
    this.combo = 0;
    this.gameScale = TIME.dash;
    this.ninja.setMode('dashing');
    this.fadeSlow(false);
    AudioManager.slowExit();
    this.startNode();
  }

  private startNode(): void {
    if (this.dashIndex >= this.dashQueue.length) {
      if (this.dashFreeFly) { this.startFreeFly(); return; }   // bounce with no target → fly off
      this.finishDash(); return;
    }
    if (!this.ninja.spendStamina()) {        // ran out mid-chain → fall
      this.unlockRemaining();
      this.finishDash();
      return;
    }
    this.dashFrom = { x: this.ninja.x, y: this.ninja.y };
    this.dashTarget = this.dashQueue[this.dashIndex];
    this.dashT = 0;
  }

  private advanceDash(dt: number): void {
    const target = this.dashTarget;
    if (!target) return;
    // A bounce node bends the hop through the border point B: from→B→target.
    const bend = (this.dashBounce && this.dashIndex === this.dashBounce.beforeIndex) ? this.dashBounce.point : null;
    this.dashT += dt / (TIME.dashNodeMs / 1000) / (bend ? 1.6 : 1);   // bent hop travels a little longer
    const tc = Math.min(1, this.dashT);
    if (bend) {
      if (tc < 0.5) {
        const p = 1 - Math.pow(1 - tc / 0.5, 3);
        this.ninja.x = Phaser.Math.Linear(this.dashFrom.x, bend.x, p);
        this.ninja.y = Phaser.Math.Linear(this.dashFrom.y, bend.y, p);
      } else {
        const p = 1 - Math.pow(1 - (tc - 0.5) / 0.5, 3);
        this.ninja.x = Phaser.Math.Linear(bend.x, target.x, p);
        this.ninja.y = Phaser.Math.Linear(bend.y, target.y, p);
      }
    } else {
      const p = 1 - Math.pow(1 - tc, 3);   // easeOutCubic
      this.ninja.x = Phaser.Math.Linear(this.dashFrom.x, target.x, p);
      this.ninja.y = Phaser.Math.Linear(this.dashFrom.y, target.y, p);
    }
    if (this.dashT >= 1) this.resolveNode();
  }

  private resolveNode(): void {
    const target = this.dashTarget!;
    // For a bounced hop the EFFECTIVE approach (for shield + bounce-back) is the border point.
    const bend = (this.dashBounce && this.dashIndex === this.dashBounce.beforeIndex) ? this.dashBounce.point : null;
    const from = bend ?? this.dashFrom;
    if (bend) this.fx.slash(this.dashFrom.x, this.dashFrom.y, bend.x, bend.y);
    this.fx.slash(from.x, from.y, target.x, target.y);

    if (target.isFrontHit(from.x, from.y)) {
      // Blocked! bounce back + stun + damage (parry halves)
      const ang = Math.atan2(target.y - from.y, target.x - from.x);
      this.ninja.x = target.x - Math.cos(ang) * NINJA.bounceDist;
      this.ninja.y = target.y - Math.sin(ang) * NINJA.bounceDist;
      const dmg = GameState.hasParry() ? FRONT_HIT_DMG * 0.5 : FRONT_HIT_DMG;
      this.ninja.takeDamage(dmg);
      this.fx.floatText(this.ninja.x, this.ninja.y - 30, 'BLOCKED', CSS.dataBlue);
      AudioManager.shieldBounce();
      this.cameras.main.shake(160, 0.008);
      this.stunUntil = this.time.now + NINJA.stunMs;
      this.ninja.setMode('stunned');
      this.unlockRemaining();
      this.endDashToIdle(false);
      if (!this.ninja.alive) this.lose('hp');
      return;
    }

    // Kill
    this.combo++;
    this.score += target.score * this.combo;
    this.fx.afterimage(this.dashFrom.x, this.dashFrom.y);   // ghost trail
    this.fx.splatter(target.x, target.y);
    this.fx.comboText(target.x, target.y - 10, this.combo);
    AudioManager.slash(this.combo);
    AudioManager.combo(this.combo);
    this.cameras.main.shake(70 + this.combo * 14, 0.004 + this.combo * 0.0012);   // shake scales with combo
    this.ninja.refillStamina();              // a kill refills stamina to full
    this.hitStopRemaining = TIME.hitStopMs / 1000;   // real-time freeze
    target.unlock();
    target.destroy();
    this.enemies = this.enemies.filter((e) => e !== target);

    this.dashIndex++;
    this.startNode();
  }

  private finishDash(): void {
    this.endDashToIdle(true);
  }

  // Bounce-with-no-target: dash to the border point, then fly along the reflected
  // ray until a wall/edge, stop there and fall ("chạm vào đâu thì dừng và rơi").
  private startFreeFly(): void {
    if (!this.ninja.spendStamina()) { this.finishDash(); return; }
    this.freeFlyFrom = { x: this.ninja.x, y: this.ninja.y };
    this.freeFlyActive = true;
    this.dashT = 0;
    this.fx.afterimage(this.freeFlyFrom.x, this.freeFlyFrom.y);
  }

  private advanceFreeFly(dt: number): void {
    const fly = this.dashFreeFly!; const from = this.freeFlyFrom;
    this.dashT += dt / (TIME.dashNodeMs / 1000) / 1.6;       // bent hop, a touch longer
    const tc = Math.min(1, this.dashT);
    if (tc < 0.5) {
      const p = 1 - Math.pow(1 - tc / 0.5, 3);
      this.ninja.x = Phaser.Math.Linear(from.x, fly.via.x, p);
      this.ninja.y = Phaser.Math.Linear(from.y, fly.via.y, p);
    } else {
      const p = 1 - Math.pow(1 - (tc - 0.5) / 0.5, 3);
      this.ninja.x = Phaser.Math.Linear(fly.via.x, fly.to.x, p);
      this.ninja.y = Phaser.Math.Linear(fly.via.y, fly.to.y, p);
    }
    if (this.dashT >= 1) {
      this.fx.slash(from.x, from.y, fly.via.x, fly.via.y);
      this.fx.slash(fly.via.x, fly.via.y, fly.to.x, fly.to.y);
      this.fx.sparksAt(fly.to.x, fly.to.y);
      AudioManager.land();
      this.freeFlyActive = false;
      this.dashFreeFly = null;
      this.endDashToIdle(true);                              // stop here, fall
    }
  }

  /** March the reflected ray from the border point B until it touches a wall,
   *  lands on a platform, or leaves the field — that's where the fly stops. */
  private computeFlyEnd(b: { x: number; y: number }, dir: { x: number; y: number }): { x: number; y: number } {
    const r = this.ninja.radius; const step = 5;
    let px = b.x, py = b.y;
    for (let t = step; t <= BOUNCE.rayLen; t += step) {
      const x = b.x + dir.x * t, y = b.y + dir.y * t;
      if (x < 0 || x > WORLD.width || y < 0 || y > this.deadZoneY) break;     // left the field
      if (this.walls.some((w) => this.circleRect(x, y, r, w))) break;          // hit a laser wall
      let landed = false;                                                      // flew onto a platform top
      for (const p of this.platforms) {
        if (x >= p.x - p.w / 2 && x <= p.x + p.w / 2 && y + r >= p.y && y + r <= p.y + 16) { landed = true; break; }
      }
      px = x; py = y;
      if (landed) break;
    }
    return { x: Phaser.Math.Clamp(px, r, WORLD.width - r), y: Phaser.Math.Clamp(py, r, this.deadZoneY - r) };
  }

  private endDashToIdle(toFalling: boolean): void {
    this.gameScale = TIME.normal;
    this.dashState = 'idle';
    this.dashTarget = null;
    this.freeFlyActive = false;
    this.dashQueue = [];
    if (this.ninja.state !== 'stunned') this.ninja.setMode(toFalling ? 'falling' : 'idle');
    this.checkWin();
  }

  private unlockRemaining(): void {
    for (let i = this.dashIndex; i < this.dashQueue.length; i++) this.dashQueue[i]?.unlock();
  }

  // -- Main loop -------------------------------------------------------
  update(_time: number, delta: number): void {
    if (this.isOver || this.isPaused) return;
    const realDt = delta / 1000;

    // Hit-stop: freeze everything in REAL time (ignores gameScale)
    if (this.hitStopRemaining > 0) { this.hitStopRemaining -= realDt; return; }

    const dt = realDt * this.gameScale;

    // Stun recovery
    if (this.ninja.state === 'stunned' && this.time.now > this.stunUntil) this.ninja.setMode('falling');

    this.ninja.update(dt);

    // Enemies: advance dynamic shields (orbiter/phaser) + ranged fire (slow-mo scaled)
    for (const e of this.enemies) {
      e.tickShield(dt);
      const shot = e.tickFire(dt, this.ninja.x, this.ninja.y);
      if (shot) { this.bullets.fire(e.x, e.y, shot.angle); AudioManager.bullet(); }
    }
    this.bullets.update(dt, this.bounds);
    this.checkBulletHits();

    if (this.dashState === 'aiming') this.path.draw();
    if (this.dashState === 'dashing') { if (this.freeFlyActive) this.advanceFreeFly(dt); else this.advanceDash(dt); }

    this.checkHazards(dt);

    this.hudAccum += delta;
    if (this.hudAccum > 80) { this.hudAccum = 0; this.emitHud(); }
  }

  private checkBulletHits(): void {
    for (const b of this.bullets.active()) {
      if (Phaser.Math.Distance.Between(b.x, b.y, this.ninja.x, this.ninja.y) < this.ninja.radius + 4) {
        this.bullets.kill(b);
        this.ninja.takeDamage(BULLET_DMG);
        this.fx.splatter(this.ninja.x, this.ninja.y, COLORS.amber);
        AudioManager.hurt();
        this.emitHud(true);
        if (!this.ninja.alive) { this.lose('hp'); return; }
      }
    }
  }

  private checkHazards(dt: number): void {
    const n = this.ninja;
    // Dead-zone
    if (n.y + n.radius >= this.deadZoneY && n.state !== 'aiming') { this.lose('pit'); return; }

    // Platform landing (only while falling downward)
    if (n.state === 'falling' && n.vy >= 0) {
      for (const p of this.platforms) {
        if (n.x >= p.x - p.w / 2 && n.x <= p.x + p.w / 2) {
          const top = p.y;
          if (n.y + n.radius >= top && n.y + n.radius <= top + 26) { this.land(p, top); break; }
        }
      }
    }

    // Laser walls
    for (const w of this.walls) {
      if (this.circleRect(n.x, n.y, n.radius, w)) {
        n.takeDamage(LASER_DMG_PER_SEC * dt);
        if (Math.random() < 0.3) this.fx.sparksAt(n.x, n.y);
        this.emitHud(true);
        if (!n.alive) { this.lose('hp'); return; }
      }
    }
  }

  private land(_p: PlatformDef, top: number): void {
    const n = this.ninja;
    n.y = top - n.radius; n.vy = 0;
    n.setMode('idle');
    n.refillStamina();
    n.squash();
    this.fx.dust(n.x, n.y + n.radius);
    AudioManager.land();
    if (GameState.hasEmp()) {
      this.fx.emp(n.x, n.y, EMP.radius);
      AudioManager.emp();
      this.enemies.forEach((e) => { if (Phaser.Math.Distance.Between(e.x, e.y, n.x, n.y) < EMP.radius) e.stun(EMP.stunMs); });
    }
    this.emitHud(true);
  }

  private circleRect(cx: number, cy: number, r: number, w: WallDef): boolean {
    const rx = w.x - w.w / 2, ry = w.y - w.h / 2;
    const nx = Phaser.Math.Clamp(cx, rx, rx + w.w);
    const ny = Phaser.Math.Clamp(cy, ry, ry + w.h);
    return Phaser.Math.Distance.Between(cx, cy, nx, ny) < r;
  }

  private checkWin(): void {
    if (this.isOver) return;
    if (this.enemies.length === 0) this.win();
  }

  private win(): void {
    this.isOver = true;
    const cubes = this.level.reward + Math.floor(this.score / 20);
    GameState.addCubes(cubes);
    GameState.recordScore(this.score);
    GameState.clearLevel(this.level.id, MAX_LEVEL);
    AudioManager.victory();
    this.cameras.main.flash(220, 98, 255, 138);
    this.time.delayedCall(700, () => {
      EventBus.emit('run_complete', {
        level: this.level.id, score: this.score, cubes, totalCubes: GameState.getCubes(),
        hasNext: this.level.id < MAX_LEVEL, nextLevel: Math.min(MAX_LEVEL, this.level.id + 1),
      });
    });
  }

  private lose(reason: 'pit' | 'hp'): void {
    if (this.isOver) return;
    this.isOver = true;
    this.fx.splatter(this.ninja.x, this.ninja.y, COLORS.red);
    this.ninja.setVisible(false);
    this.cameras.main.shake(400, 0.014);
    AudioManager.fail();
    this.time.delayedCall(800, () => EventBus.emit('run_failed', { level: this.level.id, reason, score: this.score, totalCubes: GameState.getCubes() }));
  }

  // -- HUD -------------------------------------------------------------
  private emitHud(force = false): void {
    void force;
    EventBus.emit('hud', {
      hp: Math.round(this.ninja.hp), maxHp: this.ninja.maxHp,
      stamina: this.ninja.stamina, maxStamina: this.ninja.maxStamina,
      score: this.score, combo: this.combo, level: this.level.id, name: this.level.name,
    });
  }

  // -- UI intents ------------------------------------------------------
  private registerHandlers(): void {
    const on = (evt: string, fn: (...a: any[]) => void) => EventBus.on(evt, fn, this);
    on('ui_pause', () => { if (this.isOver) return; this.isPaused = true; EventBus.emit('show_pause'); });
    on('ui_resume', () => { this.isPaused = false; EventBus.emit('hide_pause'); });
    on('ui_quit_run', () => { this.teardown(); AudioManager.stopMusic(); this.scene.start('Menu'); });
    on('ui_retry', () => { const l = this.level.id; this.teardown(); this.scene.start('GamePlay', { level: l }); });
    on('ui_next_run', (d: { level: number }) => { this.teardown(); this.scene.start('GamePlay', { level: d.level }); });
    on('ui_to_shop', () => { this.teardown(); AudioManager.stopMusic(); this.scene.start('Shop'); });
  }

  private tornDown = false;
  private teardown(): void {
    if (this.tornDown) return; this.tornDown = true;
    ['ui_pause', 'ui_resume', 'ui_quit_run', 'ui_retry', 'ui_next_run', 'ui_to_shop'].forEach((e) => EventBus.removeAllListeners(e));
    if (this.slowOverlay) gsap.killTweensOf(this.slowOverlay);
    this.path?.destroy();
    this.bullets?.destroy();
    this.enemies.forEach((e) => e.destroy());
    this.ninja?.destroy();
    this.enemies = [];
  }
}

export default GamePlay;
