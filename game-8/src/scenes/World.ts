import Phaser from 'phaser';
import EventBus from '../EventBus.ts';
import AudioManager from '../core/AudioManager.ts';
import GameState from '../core/GameState.ts';
import { COLORS, CSS, WORLD, CULL_PAD, SHIP, RUN, POWER, POWERUPS, PowerKind, ELEMENTS, ELEMENT_KINDS, ElementKind } from '../config.ts';
import { generateWorld } from '../data/World.ts';
import PlayerShip from '../entities/PlayerShip.ts';
import Island from '../entities/Island.ts';
import { BulletPool } from '../systems/Pool.ts';
import PowerUps from '../systems/PowerUps.ts';
import Clouds from '../systems/Clouds.ts';
import DayNight from '../systems/DayNight.ts';
import EnemyManager from '../systems/EnemyManager.ts';
import WorldEvents from '../systems/WorldEvents.ts';

// =====================================================================
// World.ts — open-world orchestrator. Gather the 10 elements from the 10
// resource planets (dock → +2/s), deliver them to the Mother at spawn to
// win. Heal / Storm planets work by PROXIMITY (auras, no popup). Forge
// sells skill upgrades for gold. Everything is culled outside the view.
// =====================================================================

type DockRole = 'resource' | 'mother' | 'forge' | null;

export class World extends Phaser.Scene {
  private ship!: PlayerShip;
  private islands: Island[] = [];
  private bullets!: BulletPool;
  private powerups!: PowerUps;
  private clouds!: Clouds;
  private dayNight!: DayNight;
  private enemyMgr!: EnemyManager;
  private worldEvents!: WorldEvents;

  private joy = { x: 0, y: 0, mag: 0 };
  private firing = false; private boost = false;
  private fireCd = 0;
  private vignette!: Phaser.GameObjects.Image;
  private auras!: Phaser.GameObjects.Graphics;
  private pickupRing!: Phaser.GameObjects.Graphics;

  private dockedId = -1; private dockRole: DockRole = null;
  private collectAcc = 0;
  private stock: Record<string, number> = {};
  private transferring = false; private transferT = 0;
  private transferGoal: Record<string, number> = {}; private transferGiven: Record<string, number> = {};
  private motherLevel = 0; private pulseCd = 0;
  private hudCd = 0; private stormCd = 0;
  private isOver = false; private won = false;
  private lives = RUN.lives;

  constructor() { super('World'); }

  create(): void {
    this.resetState();
    this.cameras.main.setBounds(0, 0, WORLD.width, WORLD.height);
    this.physics.world.setBounds(0, 0, WORLD.width, WORLD.height);
    this.cameras.main.setBackgroundColor(0x0a1228);
    this.add.tileSprite(0, 0, WORLD.width, WORLD.height, 'stars').setOrigin(0).setDepth(-10).setScrollFactor(1);

    const world = generateWorld(1337);
    world.islands.forEach((d) => this.islands.push(new Island(this, d)));
    ELEMENT_KINDS.forEach((k) => (this.stock[k] = 0));

    const mother = world.islands[world.motherId];
    this.ship = new PlayerShip(this, mother.x, mother.y + mother.radius + 110);
    this.ship.body.setCollideWorldBounds(true);
    this.physics.add.collider(this.ship as any, this.islands as any);

    this.clouds = new Clouds(this);
    this.dayNight = new DayNight(this);
    this.bullets = new BulletPool(this);
    this.powerups = new PowerUps(this);
    this.enemyMgr = new EnemyManager(this, this.bullets, this.powerups);
    this.worldEvents = new WorldEvents(this, this.clouds);

    this.auras = this.add.graphics().setDepth(49);
    this.pickupRing = this.add.graphics().setDepth(52).setVisible(false);   // single reusable pickup ring
    this.vignette = this.add.image(0, 0, 'vignette').setOrigin(0.5).setScrollFactor(0).setDepth(78).setVisible(false).setTint(0x05060f);
    this.positionVignette();

    this.cameras.main.startFollow(this.ship, true, 0.09, 0.09);
    this.setupInput();
    AudioManager.startMusic();
    EventBus.emit('enter_world');
    this.emitMinimap();
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.teardown());
    this.scale.on('resize', this.onResize, this);
  }

  private resetState(): void {
    this.islands = []; this.joy = { x: 0, y: 0, mag: 0 }; this.firing = false; this.boost = false;
    this.fireCd = 0; this.dockedId = -1; this.dockRole = null; this.collectAcc = 0; this.stock = {};
    this.transferring = false; this.transferT = 0; this.transferGoal = {}; this.transferGiven = {};
    this.motherLevel = 0; this.pulseCd = 0;
    this.hudCd = 0; this.stormCd = 0; this.isOver = false; this.won = false; this.lives = RUN.lives; this.tornDown = false;
  }

  private onResize(): void { this.dayNight?.resize(); this.positionVignette(); }
  private positionVignette(scale = 1.5): void {
    const cam = this.cameras.main; const d = Math.hypot(cam.width, cam.height) * scale;
    this.vignette.setPosition(cam.width / 2, cam.height / 2).setDisplaySize(d, d);
  }

  // -- Input -----------------------------------------------------------
  private setupInput(): void {
    const on = (e: string, fn: (...a: any[]) => void) => EventBus.on(e, fn, this);
    on('joy', (v: { x: number; y: number; mag: number }) => { this.joy = v; });
    on('fire', (d: { down: boolean }) => { this.firing = d.down; });
    on('boost', (d: { down: boolean }) => { this.boost = d.down; });
    on('ui_pause', () => { if (!this.isOver) { this.scene.pause(); EventBus.emit('show_pause'); } });
    on('ui_resume', () => { this.scene.resume(); EventBus.emit('hide_pause'); });
    on('ui_to_menu', () => { this.teardown(); AudioManager.stopMusic(); this.scene.stop(); this.scene.start('Menu'); });
  }

  // -- Main loop -------------------------------------------------------
  update(_t: number, delta: number): void {
    if (this.isOver) return;
    const dt = Math.min(delta, 50) / 1000;

    this.ship.drive(dt, this.joy.x, this.joy.y, this.joy.mag, this.boost, this.dayNight.isNight);
    this.pickupRing.setPosition(this.ship.x, this.ship.y);   // ring stays stuck to the ship
    const wind = this.clouds.windPush();
    if (wind.x || wind.y) { this.ship.body.velocity.x += wind.x * dt; this.ship.body.velocity.y += wind.y * dt; }
    this.clouds.update(dt);

    this.cull();
    this.updateCombat(dt);
    this.enemyMgr.update(dt, this.ship, (n) => { this.ship.takeDamage(n); });
    this.bullets.update(dt);
    this.powerups.update(dt, this.ship.x, this.ship.y, 170, (k) => this.onPower(k));
    if (this.ship.healActive()) this.ship.repair(POWER.healPerSec * dt);   // green-heart heal-over-time
    this.updateProximity(dt);
    this.updateDocking(dt);
    this.motherPulse(dt);
    this.enemyMgr.spawnTick(dt, this.ship, this.cameras.main.worldView, this.motherLevel);
    this.worldEvents.update(dt, this.ship);

    if (!this.ship.alive) { this.onDeath(); return; }
    this.hudCd -= delta;
    if (this.hudCd <= 0) { this.hudCd = 110; this.emitHud(); this.emitRadar(); }
  }

  private cull(): void {
    const v = this.cameras.main.worldView;
    const inView = (x: number, y: number, r: number) => x + r > v.x - CULL_PAD && x - r < v.right + CULL_PAD && y + r > v.y - CULL_PAD && y - r < v.bottom + CULL_PAD;
    this.islands.forEach((i) => i.setCulled(!inView(i.x, i.y, i.info.radius)));
    this.enemyMgr.cull(inView);
  }

  // -- Combat ----------------------------------------------------------
  private updateCombat(dt: number): void {
    this.fireCd -= dt * 1000;
    if (this.firing && this.fireCd <= 0 && this.ship.alive) {
      this.fireCd = SHIP.fireRate;
      const m = this.ship.muzzle();
      const red = this.ship.redActive();
      this.bullets.fire(m.x, m.y, m.angle, SHIP.bulletSpeed, SHIP.bulletLife, red ? this.ship.bulletDmg * POWER.redDmgMult : this.ship.bulletDmg, 'player', red ? 0xff2b4e : undefined);
      AudioManager.laser();
    }
    for (const b of this.bullets.active()) {
      if (b.team !== 'player') continue;
      if (this.enemyMgr.hit(b.x, b.y, b.dmg)) this.bullets.kill(b);
    }
    for (const b of this.bullets.active()) {
      if (b.team !== 'enemy') continue;
      if (Math.hypot(this.ship.x - b.x, this.ship.y - b.y) < this.ship.radius + 5) {
        this.ship.takeDamage(b.dmg); AudioManager.hurt(); this.cameras.main.shake(120, 0.006); this.bullets.kill(b);
      }
    }
  }

  // -- Proximity planets: heal + storm (auras, no popup) ---------------
  private updateProximity(dt: number): void {
    let heal: Island | null = null, storm: Island | null = null;
    for (const isl of this.islands) {
      if (isl.culled) continue;
      const d = Math.hypot(isl.x - this.ship.x, isl.y - this.ship.y);
      if (isl.info.role === 'heal' && d < isl.proximity(RUN.proximityMult)) heal = isl;
      if (isl.info.role === 'storm' && d < isl.proximity(RUN.proximityMult)) storm = isl;
    }
    // gradual heal (bigger planet = faster)
    if (heal && this.ship.hp < this.ship.maxHp) this.ship.repair(RUN.healBasePerSec * (heal.info.radius / 100) * dt);
    // storm lightning recharges fuel (bigger planet = more)
    if (storm) {
      this.stormCd -= dt * 1000;
      if (this.stormCd <= 0) {
        this.stormCd = RUN.stormStrikeMs + Math.random() * RUN.stormStrikeMs;   // ~2× faster
        const tx = this.ship.x + (Math.random() - 0.5) * 220, ty = this.ship.y + (Math.random() - 0.5) * 220;
        this.lightning(tx, ty);
        if (Math.hypot(tx - this.ship.x, ty - this.ship.y) < 70) { this.ship.takeDamage(10); this.cameras.main.shake(200, 0.012); }
        const gain = Math.round(RUN.stormRefuelBase * (storm.info.radius / 100));
        this.ship.refuel(gain); this.floatText(this.ship.x, this.ship.y - 28, `+${gain} FUEL`, CSS.gold);
        AudioManager.thunder();
      }
    }
    this.drawAuras(heal, storm);
  }

  private drawAuras(heal: Island | null, storm: Island | null): void {
    const g = this.auras; g.clear();
    const sx = this.ship.x, sy = this.ship.y, t = this.time.now * 0.006;
    if (heal) {
      for (let k = 0; k < 3; k++) { const rr = 26 + ((t * 30 + k * 18) % 54); g.lineStyle(2.5, COLORS.heal, 0.5 * (1 - rr / 80)); g.strokeCircle(sx, sy, rr); }
      g.fillStyle(COLORS.heal, 0.9); g.fillRect(sx - 2, sy - 8, 4, 16); g.fillRect(sx - 8, sy - 2, 16, 4);
    }
    if (storm) {
      // charging arcs in amber/orange
      g.lineStyle(2, COLORS.amber, 0.85);
      for (let i = 0; i < 6; i++) { const a = t * 2 + (i / 6) * Math.PI * 2; const r1 = 24, r2 = 34 + Math.sin(t * 6 + i) * 6; g.lineBetween(sx + Math.cos(a) * r1, sy + Math.sin(a) * r1, sx + Math.cos(a + 0.3) * r2, sy + Math.sin(a + 0.3) * r2); }
      g.lineStyle(1.5, COLORS.gold, 0.5); g.strokeCircle(sx, sy, 30);
    }
  }

  private lightning(x: number, y: number): void {
    const g = this.add.graphics().setDepth(70); g.lineStyle(3, COLORS.aetherHot, 1);
    let px = x, py = y - 320; g.beginPath(); g.moveTo(px, py);
    for (let i = 0; i < 8; i++) { px += (Math.random() - 0.5) * 50; py += 40 + Math.random() * 20; g.lineTo(px, py); }
    g.strokePath(); this.cameras.main.flash(120, 180, 220, 255);
    this.tweens.add({ targets: g, alpha: 0, duration: 260, onComplete: () => g.destroy() });
  }

  // -- Docking: resource (collect) / mother (deliver) / forge ----------
  private updateDocking(dt: number): void {
    let near = -1; let role: DockRole = null;
    for (const isl of this.islands) {
      if (isl.culled) continue;
      const r = isl.info.role;
      if (r !== 'resource' && r !== 'mother' && r !== 'forge') continue;   // heal/storm = proximity only
      const d = Math.hypot(isl.x - this.ship.x, isl.y - this.ship.y);
      if (d < isl.info.radius + 70 && this.ship.body.velocity.length() < 80) { near = isl.info.id; role = r; break; }
    }
    if (near !== this.dockedId) {
      this.dockedId = near; this.dockRole = role; this.collectAcc = 0;
      if (near >= 0) { this.onDock(this.islands.find((i) => i.info.id === near)!); AudioManager.uiConfirm(); }
      else EventBus.emit('undock');
    }
    if (this.dockedId >= 0) {
      if (this.dockRole === 'resource') this.collectTick(dt);
      else if (this.dockRole === 'mother' && this.transferring) this.updateTransfer(dt);
    }
  }

  private onDock(isl: Island): void {
    if (isl.info.role === 'resource') {
      const el = isl.info.element!;
      EventBus.emit('dock', { role: 'resource', name: isl.info.name, element: { key: el, name: ELEMENTS[el].name, css: ELEMENTS[el].css }, cargo: { ...this.ship.cargo }, cargoMax: this.ship.cargoMax });
    } else if (isl.info.role === 'mother') {
      EventBus.emit('dock', this.motherPayload(null));
      this.startTransfer();   // 2s progress transfer of cargo → mother
    } else {
      EventBus.emit('dock', { role: 'forge', name: isl.info.name });
    }
  }

  private collectTick(dt: number): void {
    const isl = this.islands.find((i) => i.info.id === this.dockedId); if (!isl) return;
    if (this.ship.cargoFull()) { this.collectAcc = 0; return; }   // don't let the accumulator grow unbounded
    const el = isl.info.element as ElementKind;
    this.collectAcc += RUN.collectPerSec * dt;
    while (this.collectAcc >= 1 && !this.ship.cargoFull()) {
      this.collectAcc -= 1; this.ship.cargo[el] = (this.ship.cargo[el] ?? 0) + 1;
      this.floatText(this.ship.x + (Math.random() - 0.5) * 16, this.ship.y - 18, `+1 ${ELEMENTS[el].name}`, ELEMENTS[el].css);
      AudioManager.pickup();
      EventBus.emit('dock_update', { role: 'resource', cargo: { ...this.ship.cargo }, cargoMax: this.ship.cargoMax });
    }
  }

  private finalReq(): number { return RUN.motherTiers[RUN.motherTiers.length - 1]; }
  private motherLevelFromStock(): number { return RUN.motherTiers.filter((thr) => ELEMENT_KINDS.every((k) => (this.stock[k] ?? 0) >= thr)).length; }
  private motherPayload(transfer: number | null): any {
    return { role: 'mother', name: 'Heart of the Sky', stock: { ...this.stock }, require: this.finalReq(), tiers: RUN.motherTiers, tier: this.motherLevel, cargo: { ...this.ship.cargo }, transfer };
  }

  private startTransfer(): void {
    const final = this.finalReq(); this.transferGoal = {}; this.transferGiven = {}; let total = 0;
    for (const k of ELEMENT_KINDS) { const have = this.ship.cargo[k] ?? 0; const need = Math.max(0, final - (this.stock[k] ?? 0)); const goal = Math.min(have, need); this.transferGoal[k] = goal; this.transferGiven[k] = 0; total += goal; }
    if (total <= 0) { this.transferring = false; EventBus.emit('mother_progress', this.motherPayload(null)); return; }
    this.transferring = true; this.transferT = 0; AudioManager.trade();
    EventBus.emit('mother_progress', this.motherPayload(0));
  }

  private updateTransfer(dt: number): void {
    this.transferT += dt;
    const frac = Math.min(1, this.transferT / (RUN.depositMs / 1000));
    for (const k of ELEMENT_KINDS) {
      const want = Math.floor((this.transferGoal[k] ?? 0) * frac); const give = want - (this.transferGiven[k] ?? 0);
      if (give > 0) { this.stock[k] = (this.stock[k] ?? 0) + give; this.ship.cargo[k] = (this.ship.cargo[k] ?? 0) - give; this.transferGiven[k] += give; }
    }
    EventBus.emit('mother_progress', this.motherPayload(frac));
    if (frac >= 1) { this.transferring = false; this.finalizeTransfer(); }
  }

  private finalizeTransfer(): void {
    const prev = this.motherLevel; this.motherLevel = this.motherLevelFromStock();
    if (this.motherLevel > prev) {
      this.islands.find((i) => i.info.role === 'mother')?.setMotherLevel(this.motherLevel);
      AudioManager.event(); this.cameras.main.flash(320, 138, 255, 200);
      EventBus.emit('toast', { text: `MOTHER · TIER ${this.motherLevel}`, color: CSS.gold });
    }
    EventBus.emit('mother_progress', this.motherPayload(null));
    if (this.motherLevel >= RUN.motherTiers.length) this.win();
  }

  // Mother occasionally emits a gentle signal pulse when on-screen.
  private motherPulse(dt: number): void {
    const mom = this.islands.find((i) => i.info.role === 'mother');
    if (!mom || mom.culled) { this.pulseCd = 600; return; }
    this.pulseCd -= dt * 1000;
    if (this.pulseCd <= 0) {
      this.pulseCd = 3400 + Math.random() * 2600;
      const g = this.add.graphics({ x: mom.x, y: mom.y }).setDepth(19);
      g.lineStyle(2.5, COLORS.aetherHot, 0.45); g.strokeCircle(0, 0, mom.info.radius * 0.9);
      this.tweens.add({ targets: g, scaleX: 1.9, scaleY: 1.9, alpha: 0, duration: 1900, ease: 'Cubic.out', onComplete: () => g.destroy() });
    }
  }

  private win(): void {
    if (this.won) return; this.won = true; this.isOver = true;
    GameState.setWon();
    AudioManager.victory();
    this.cameras.main.flash(600, 138, 255, 200);
    for (let i = 0; i < 5; i++) this.time.delayedCall(i * 160, () => {
      const burst = this.add.particles(this.ship.x + (Math.random() - 0.5) * 200, this.ship.y + (Math.random() - 0.5) * 200, 'spark', { speed: { min: 100, max: 360 }, scale: { start: 1, end: 0 }, lifespan: { min: 400, max: 900 }, quantity: 30, blendMode: 'ADD', tint: [COLORS.gold, COLORS.aetherHot, COLORS.white], emitting: false }).setDepth(70);
      burst.explode(34); this.time.delayedCall(1000, () => burst.destroy());
    });
    EventBus.emit('win', { best: GameState.getBest() });
    this.time.delayedCall(4200, () => { this.teardown(); AudioManager.stopMusic(); this.scene.stop(); this.scene.start('Menu'); });
  }

  // -- Death -----------------------------------------------------------
  private onDeath(): void {
    if (this.isOver) return; this.isOver = true;
    this.lives--;   // a death costs a life + all cargo (credits/gold are kept)
    const burst = this.add.particles(this.ship.x, this.ship.y, 'spark', { speed: { min: 100, max: 360 }, scale: { start: 0.9, end: 0 }, lifespan: { min: 300, max: 700 }, quantity: 30, blendMode: 'ADD', tint: [COLORS.ember, COLORS.gold, COLORS.white], emitting: false }).setDepth(60);
    burst.explode(34); this.time.delayedCall(900, () => burst.destroy());   // free the emitter (was leaking per death)
    this.cameras.main.shake(500, 0.02); this.cameras.main.flash(300, 255, 90, 71);
    AudioManager.explode(); this.ship.setVisible(false);
    if (this.lives <= 0) {
      EventBus.emit('gameover', { best: GameState.getBest() });
      this.time.delayedCall(2400, () => { this.teardown(); AudioManager.stopMusic(); this.scene.stop(); this.scene.start('Menu'); });
    } else {
      EventBus.emit('dead', { lives: this.lives });
      this.time.delayedCall(1600, () => this.respawn());
    }
  }

  private respawn(): void {
    const mother = this.islands.find((i) => i.info.role === 'mother')!;
    this.ship.setVisible(true); this.ship.alive = true; this.ship.hp = this.ship.maxHp; this.ship.fuel = this.ship.maxFuel;
    ELEMENT_KINDS.forEach((k) => (this.ship.cargo[k] = 0));
    this.ship.setPosition(mother.x, mother.y + mother.info.radius + 110); this.ship.body.setVelocity(0, 0);
    this.enemyMgr.reset(); this.dockedId = -1; this.dockRole = null; this.isOver = false;
    EventBus.emit('respawn'); this.emitHud();
  }

  private onPower(kind: PowerKind): void {
    AudioManager.pickup();
    this.pickupAura(POWERUPS[kind].color);   // single ring flash on the ship (no text, no ghosts)
    EventBus.emit('event', { title: POWERUPS[kind].name, desc: 'Power-up acquired', color: POWERUPS[kind].css, dur: 2000 });
    if (kind === 'life') { this.lives++; this.emitHud(); }
    else this.ship.applyPower(kind);
  }

  // ONE reusable ring stuck to the ship — re-triggering just restarts its flash.
  private pickupAura(color: number): void {
    const g = this.pickupRing;
    this.tweens.killTweensOf(g);
    g.clear();
    g.fillStyle(color, 0.18); g.fillCircle(0, 0, this.ship.radius + 8);
    g.lineStyle(3, color, 0.95); g.strokeCircle(0, 0, this.ship.radius + 8);
    g.setVisible(true).setAlpha(1).setScale(1).setPosition(this.ship.x, this.ship.y);
    this.tweens.add({ targets: g, scaleX: 2.2, scaleY: 2.2, alpha: 0, duration: 460, ease: 'Cubic.out', onComplete: () => g.setVisible(false) });
  }

  // -- HUD feeds -------------------------------------------------------
  private floatText(x: number, y: number, text: string, color: string): void {
    const t = this.add.text(x, y, text, { fontFamily: 'Rajdhani, sans-serif', fontStyle: 'bold', fontSize: '16px', color, stroke: '#0a1228', strokeThickness: 4 }).setOrigin(0.5).setDepth(62);
    this.tweens.add({ targets: t, y: y - 46, alpha: 0, duration: 900, ease: 'Cubic.out', onComplete: () => t.destroy() });
  }
  private emitHud(): void {
    const now = this.time.now; const buffs: Array<{ kind: PowerKind; remain: number }> = [];
    const add = (k: PowerKind, until: number) => { if (now < until) buffs.push({ kind: k, remain: Math.ceil((until - now) / 1000) }); };
    add('shield', this.ship.shieldUntil); add('speed', this.ship.speedUntil); add('redbullet', this.ship.redUntil); add('heal', this.ship.healUntil);
    EventBus.emit('hud', {
      hp: Math.round(this.ship.hp), maxHp: this.ship.maxHp, fuel: Math.round(this.ship.fuel), maxFuel: this.ship.maxFuel,
      credits: GameState.getCredits(), cargo: this.ship.cargoCount(), cargoMax: this.ship.cargoMax,
      night: this.dayNight.isNight, lives: this.lives, buffs,
    });
  }
  private emitRadar(): void {
    const jammed = this.worldEvents.jammed(this.time.now);
    const blips = jammed ? [] : this.islands
      .map((i) => ({ dx: i.x - this.ship.x, dy: i.y - this.ship.y, css: rgbHex(i.tint()), role: i.info.role }))
      .filter((b) => Math.hypot(b.dx, b.dy) < 1700)
      .map((b) => ({ angle: Math.atan2(b.dy, b.dx), dist: Math.hypot(b.dx, b.dy), css: b.css }));
    EventBus.emit('radar', { jammed, x: this.ship.x, y: this.ship.y, blips });
  }
  private emitMinimap(): void {
    EventBus.emit('minimap', { w: WORLD.width, h: WORLD.height, islands: this.islands.map((i) => ({ x: i.x, y: i.y, css: rgbHex(i.tint()), r: i.info.radius, role: i.info.role })) });
  }

  // -- Teardown --------------------------------------------------------
  private tornDown = false;
  private teardown(): void {
    if (this.tornDown) return; this.tornDown = true;
    ['joy', 'fire', 'boost', 'ui_pause', 'ui_resume', 'ui_to_menu'].forEach((e) => EventBus.removeAllListeners(e));
    this.scale.off('resize', this.onResize, this);
    this.dayNight?.destroy(); this.clouds?.destroy(); this.bullets?.destroy(); this.powerups?.destroy();
    this.enemyMgr?.destroy(); this.islands.forEach((i) => i.destroy()); this.ship?.destroy();
  }
}

function rgbHex(c: number): string { return '#' + c.toString(16).padStart(6, '0'); }
export default World;
