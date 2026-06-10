import Phaser from 'phaser';
import { gsap } from 'gsap';
import EventBus from '../EventBus.ts';
import AudioManager from '../core/AudioManager.ts';
import GameState from '../core/GameState.ts';
import { COLORS, CSS, WORLD, CULL_PAD, SUB, CLAW, SONAR, BOLT, ZONES, RESOURCES, RESOURCE_KINDS, ResourceKind, REPAIR } from '../config.ts';
import { generateWorld } from '../data/WorldGen.ts';
import Sub from '../entities/Sub.ts';
import Creature from '../entities/Creature.ts';
import Spaceship from '../entities/Spaceship.ts';
import { Rock, ResourceNode, Vent, Decor, LooseItem } from '../entities/Props.ts';
import { BubblePool, BoltPool, PickupPool } from '../systems/Pool.ts';
import LightField from '../systems/LightField.ts';
import Claw, { ClawWorld } from '../systems/Claw.ts';

// =====================================================================
// Dive.ts — orchestrator. Pilot down the trench: claw resources, laser
// creatures, dodge the dark with sonar, fight pressure. Deposit materials
// at the surface station to repair the spaceship — 5 stages → launch → win.
// =====================================================================

export class Dive extends Phaser.Scene {
  private sub!: Sub;
  private rocks: Rock[] = [];
  private nodes: ResourceNode[] = [];
  private loose: LooseItem[] = [];
  private vents: Vent[] = [];
  private decor: Decor[] = [];
  private creatures: Creature[] = [];
  private ship!: Spaceship;
  private bubbles!: BubblePool;
  private bolts!: BoltPool;
  private pickups!: PickupPool;
  private light!: LightField;
  private claw!: Claw;
  private clawWorld!: ClawWorld;
  private crushVig!: Phaser.GameObjects.Rectangle;

  private joy = { x: 0, y: 0, mag: 0 };
  private lightOn = true; private firing = false;
  private fireCd = 0; private sonarCd = 0;
  private nearBase = false; private stationOpen = false;
  private crushShakeCd = 0; private hudCd = 0; private isOver = false; private won = false;

  constructor() { super('Dive'); }

  create(): void {
    this.resetState();
    this.cameras.main.setBounds(0, 0, WORLD.width, WORLD.height);
    this.physics.world.setBounds(0, 0, WORLD.width, WORLD.height);

    this.drawBackground();
    this.drawSurfaceBase();
    this.ship = new Spaceship(this, SUB.startX, WORLD.surfaceY - 30);
    this.ship.setRepair(GameState.getRepair());

    const world = generateWorld(7);
    world.rocks.forEach((d) => this.rocks.push(new Rock(this, d)));
    world.decor.forEach((d) => this.decor.push(new Decor(this, d)));
    world.vents.forEach((d) => this.vents.push(new Vent(this, d)));
    world.nodes.forEach((d) => this.nodes.push(new ResourceNode(this, d)));
    world.loose.forEach((d) => this.loose.push(new LooseItem(this, d)));
    world.creatures.forEach((d) => this.creatures.push(new Creature(this, d.x, d.y, d.kind)));

    this.sub = new Sub(this, SUB.startX, WORLD.surfaceY + 300);
    this.sub.body.setCollideWorldBounds(true);

    this.bubbles = new BubblePool(this);
    this.bolts = new BoltPool(this);
    this.pickups = new PickupPool(this);
    this.claw = new Claw(this);
    this.clawWorld = { nodes: this.nodes, loose: this.loose, addCargo: (k) => this.sub.addCargo(k), onFull: (x, y, k) => this.pickups.spawn(x, y, k) };
    this.light = new LightField(this, GameState.getUpgrade('sonar'));
    this.crushVig = this.add.rectangle(0, 0, this.cameras.main.width, this.cameras.main.height, COLORS.danger, 0).setOrigin(0).setScrollFactor(0).setDepth(96);

    this.cameras.main.startFollow(this.sub, true, 0.1, 0.1); this.cameras.main.setFollowOffset(0, 110);

    this.setupInput();
    AudioManager.startMusic();
    EventBus.emit('enter_dive');
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.teardown());
    this.scale.on('resize', this.onResize, this);
  }

  private resetState(): void {
    this.rocks = []; this.nodes = []; this.loose = []; this.vents = []; this.decor = []; this.creatures = [];
    this.joy = { x: 0, y: 0, mag: 0 }; this.lightOn = true; this.firing = false; this.fireCd = 0; this.sonarCd = 0;
    this.nearBase = false; this.stationOpen = false; this.crushShakeCd = 0; this.hudCd = 0; this.isOver = false; this.won = false; this.tornDown = false;
  }
  private onResize(): void { this.light?.resize(); const cam = this.cameras.main; this.crushVig?.setSize(cam.width, cam.height); }

  private drawBackground(): void {
    const g = this.add.graphics().setDepth(-10);
    g.fillGradientStyle(COLORS.surface, COLORS.surface, COLORS.shallow, COLORS.shallow, 1); g.fillRect(0, 0, WORLD.width, ZONES[1].yStart);
    g.fillGradientStyle(COLORS.shallow, COLORS.shallow, COLORS.mid, COLORS.mid, 1); g.fillRect(0, ZONES[1].yStart, WORLD.width, ZONES[2].yStart - ZONES[1].yStart);
    g.fillGradientStyle(COLORS.mid, COLORS.mid, COLORS.void, COLORS.void, 1); g.fillRect(0, ZONES[2].yStart, WORLD.width, WORLD.height - ZONES[2].yStart);
    for (let i = 1; i < ZONES.length; i++) { g.lineStyle(2, COLORS.sonar, 0.12); g.lineBetween(0, ZONES[i].yStart, WORLD.width, ZONES[i].yStart); }
  }

  private drawSurfaceBase(): void {
    const g = this.add.graphics().setDepth(15); const y = WORLD.surfaceY, cx = SUB.startX;
    g.fillStyle(0x6fd0e8, 0.16); g.fillRect(0, 0, WORLD.width, y);
    g.lineStyle(3, 0x9fe8ff, 0.5); g.lineBetween(0, y, WORLD.width, y);
    g.fillStyle(0x223547, 1); g.fillRoundedRect(cx - 160, y - 14, 320, 30, 8);
    g.lineStyle(3, COLORS.sonar, 0.8); g.strokeRoundedRect(cx - 160, y - 14, 320, 30, 8);
    g.fillStyle(COLORS.warn, 1); for (let i = -2; i <= 2; i++) g.fillCircle(cx + i * 60, y - 14, 4);
    g.fillStyle(COLORS.sonar, 0.05); g.fillRect(cx - 220, y, 440, 230);
    this.add.text(cx, y - 70, 'SURFACE STATION', { fontFamily: 'Rajdhani, sans-serif', fontSize: '16px', color: '#9fe8ff', stroke: '#041d30', strokeThickness: 4 }).setOrigin(0.5).setDepth(15);
  }

  private setupInput(): void {
    const on = (e: string, fn: (...a: any[]) => void) => EventBus.on(e, fn, this);
    on('joy', (v: { x: number; y: number; mag: number }) => { this.joy = v; });
    on('fire', (d: { down: boolean }) => { this.firing = d.down; });
    on('claw', () => this.fireClaw());
    on('light', () => { this.lightOn = !this.lightOn; EventBus.emit('light_state', { on: this.lightOn }); AudioManager.uiTap(); });
    on('sonar', () => this.doSonar());
    on('open_station', () => this.openStation());
    on('close_station', () => this.closeStation());
    on('deposit', () => this.deposit());
    on('sell', () => this.sell());
    on('ui_pause', () => { if (!this.isOver && !this.stationOpen) { this.scene.pause(); EventBus.emit('show_pause'); } });
    on('ui_resume', () => { this.scene.resume(); EventBus.emit('hide_pause'); });
    on('ui_to_menu', () => { this.teardown(); AudioManager.stopMusic(); this.scene.stop(); this.scene.start('Menu'); });
  }

  private doSonar(): void {
    if (this.sonarCd > 0 || this.sub.battery < SUB.batterySonar || this.isOver) return;
    this.sonarCd = SONAR.cooldown; this.sub.battery = Math.max(0, this.sub.battery - SUB.batterySonar);
    this.light.ping(this.sub.x, this.sub.y); AudioManager.sonar();
  }
  private fireClaw(): void {
    if (this.isOver || this.claw.busy() || this.sub.battery <= 0) return;
    if (this.claw.fire(this.aimClaw())) { this.sub.battery = Math.max(0, this.sub.battery - 0.6); AudioManager.harvest(); }
  }
  /** Auto-aim: snap the claw toward the nearest grabbable node/loose in reach
   *  (any direction), else fire straight ahead. Claw only grabs minerals/relics
   *  — drifting creatures are not loot (laser them). */
  private aimClaw(): number {
    const m = this.sub.muzzle(); const reach = CLAW.range + 36;
    let best = Infinity, bestA = this.sub.heading;
    const consider = (x: number, y: number) => { const d = Math.hypot(x - m.x, y - m.y); if (d < reach && d < best) { best = d; bestA = Math.atan2(y - m.y, x - m.x); } };
    for (const n of this.nodes) if (!n.culled && !n.depleted) consider(n.x, n.y);
    for (const l of this.loose) if (!l.culled && l.alive) consider(l.x, l.y);
    return bestA;
  }

  // -- Loop ------------------------------------------------------------
  update(_t: number, delta: number): void {
    if (this.isOver) return;
    const dt = Math.min(delta, 50) / 1000;

    const thrusting = this.sub.drive(dt, this.joy.x, this.joy.y, this.joy.mag);
    // keep the sub under the waterline
    if (this.sub.y < WORLD.surfaceY + 4) { this.sub.y = WORLD.surfaceY + 4; if (this.sub.body.velocity.y < 0) this.sub.body.velocity.y = 0; }
    if (thrusting && Math.random() < 0.5) this.bubbles.emit(this.sub.x - Math.cos(this.sub.heading) * 30, this.sub.y - Math.sin(this.sub.heading) * 30, 1);
    this.bubbles.update(dt);

    this.sub.oxygen = Math.max(0, this.sub.oxygen - SUB.oxygenDrain * dt);
    if (thrusting) this.sub.battery = Math.max(0, this.sub.battery - SUB.batteryMove * dt);
    if (this.lightOn) this.sub.battery = Math.max(0, this.sub.battery - SUB.batteryLight * dt);
    if (this.sub.battery <= 0) this.lightOn = false;
    this.fireCd -= delta; this.sonarCd -= delta;

    this.cull();
    this.collideRocks();
    this.updateVents(dt);
    this.updateClaw(dt);
    this.updateBolts(dt);
    this.updateCreatures(dt);
    this.loose.forEach((l) => { if (!l.culled && l.alive) l.bob(dt); });
    this.pickups.update(dt, this.sub.x, this.sub.y, 160, (k) => this.sub.addCargo(k) && (AudioManager.pickup(), true));
    this.decor.forEach((d) => { if (!d.culled) d.sway(dt); });
    this.pressure(dt);
    this.docking();

    const dark = this.depthAlpha(this.sub.y);
    this.light.update(this.sub.x, this.sub.y, this.sub.heading, this.lightOn, this.sub.lightRange, dark);

    GameState.recordDepth(Math.max(0, Math.round((this.sub.y - WORLD.surfaceY) / 10)));
    if (!this.sub.alive || this.sub.oxygen <= 0 || this.sub.battery <= 0) { this.onDeath(); return; }
    this.hudCd -= delta; if (this.hudCd <= 0) { this.hudCd = 120; this.emitHud(); }
  }

  private depthAlpha(y: number): number {
    if (y < WORLD.surfaceY + 280) return 0.06;
    const t = Phaser.Math.Clamp((y - (WORLD.surfaceY + 250)) / 3200, 0, 1);
    const t2 = Phaser.Math.Clamp((y - ZONES[2].yStart) / 3000, 0, 1);
    return Math.min(0.97, 0.12 + t * 0.7 + t2 * 0.17);
  }

  private cull(): void {
    const v = this.cameras.main.worldView;
    const inView = (y: number, r: number) => y + r > v.y - CULL_PAD && y - r < v.bottom + CULL_PAD;
    this.rocks.forEach((o) => o.setCulled(!inView(o.y, o.r)));
    this.nodes.forEach((o) => o.setCulled(!inView(o.y, 40)));
    this.loose.forEach((o) => o.setCulled(!inView(o.y, 40)));
    this.vents.forEach((o) => o.setCulled(!inView(o.y, 60)));
    this.decor.forEach((o) => o.setCulled(!inView(o.y, 150)));
    this.creatures.forEach((o) => o.setCulled(!inView(o.y, o.radius + 40)));
  }

  private collideRocks(): void {
    const s = this.sub;
    for (const rock of this.rocks) {
      if (rock.culled) continue;
      const dx = s.x - rock.x, dy = s.y - rock.y, dd = Math.hypot(dx, dy) || 1;
      const minD = s.radius + rock.r * 0.84;
      if (dd < minD) {
        const nx = dx / dd, ny = dy / dd; s.x = rock.x + nx * minD; s.y = rock.y + ny * minD;
        const vel = s.body.velocity; const speed = vel.length(); const dot = vel.x * nx + vel.y * ny;
        vel.x -= nx * dot * 1.4; vel.y -= ny * dot * 1.4;
        if (speed > 160) { s.takeDamage(4); AudioManager.hurt(); this.bubbles.emit(s.x, s.y, 2); }
      }
    }
  }

  private updateVents(dt: number): void {
    for (const vent of this.vents) {
      if (vent.culled) continue;
      vent.pulse(dt);
      if (Math.random() < 0.3) this.bubbles.emit(vent.x + 2, vent.y - 42, 1, 8);
      const dx = this.sub.x - vent.x, dy = this.sub.y - (vent.y - 30);
      if (Math.hypot(dx, dy) < 72) { this.sub.body.velocity.y -= 210 * dt; this.sub.takeDamage(10 * dt); }
    }
  }

  private updateClaw(dt: number): void {
    const m = this.sub.muzzle();
    this.claw.update(dt, m.x, m.y, this.clawWorld);   // adapter built once (no per-frame closures)
    // (node regrow schedules itself in ResourceNode.harvest)
  }

  // Energy blaster — pooled projectile bolts (hold to fire).
  private updateBolts(dt: number): void {
    if (this.firing && this.fireCd <= 0 && this.sub.battery > 0) {
      this.fireCd = BOLT.rate; this.sub.battery = Math.max(0, this.sub.battery - BOLT.batteryPerShot);
      const m = this.sub.muzzle(); this.bolts.fire(m.x, m.y, m.angle, BOLT.speed, BOLT.life, BOLT.dmg); AudioManager.harpoon();
    }
    this.bolts.update(dt);
    for (const b of this.bolts.active()) {
      for (const c of this.creatures) {
        if (c.culled || !c.alive) continue;
        if (Math.hypot(c.x - b.x, c.y - b.y) < c.radius + BOLT.radius) { AudioManager.hitCreature(); this.bubbles.emit(b.x, b.y, 1, 6); if (c.takeDamage(b.dmg)) this.killCreature(c); this.bolts.kill(b); break; }
      }
    }
  }

  private updateCreatures(dt: number): void {
    const ping = this.light.lastPing(); const now = this.time.now;
    for (const c of this.creatures) {
      if (c.culled || !c.alive) continue;
      const litByCone = this.lightOn && this.light.isLit(c.x, c.y, this.sub.x, this.sub.y, this.sub.heading, this.lightOn, this.sub.lightRange);
      const dmg = c.update(dt, { subX: this.sub.x, subY: this.sub.y, lightOn: this.lightOn, litByCone, ping, now });
      if (dmg > 0) { this.sub.takeDamage(dmg); AudioManager.hurt(); this.cameras.main.shake(130, 0.006); this.bubbles.emit(this.sub.x, this.sub.y, 2); }
    }
  }

  private killCreature(c: Creature): void {
    AudioManager.creature(); this.cameras.main.shake(150, 0.005);
    const burst = this.add.particles(c.x, c.y, 'bubble', { speed: { min: 40, max: 160 }, scale: { start: 0.5, end: 0 }, lifespan: { min: 200, max: 500 }, quantity: 12, tint: [COLORS.white], emitting: false }).setDepth(48);
    burst.explode(12); this.time.delayedCall(550, () => burst.destroy());
    this.pickups.spawn(c.x, c.y, 'biosample'); if (Math.random() < 0.4) this.pickups.spawn(c.x, c.y, 'biosample');
    c.destroy(); this.creatures = this.creatures.filter((x) => x !== c);
  }

  private pressure(dt: number): void {
    const zi = this.zoneIndex(this.sub.y); const armor = GameState.getUpgrade('armor');
    if (zi > armor && this.sub.alive) {
      // crush ramps up with depth INTO the over-pressured zone: gentle on the
      // shallow shelf (harvest a little under-armored) → full deeper down.
      const ramp = Phaser.Math.Clamp((this.sub.y - ZONES[zi].yStart) / 900, 0.25, 1);
      this.sub.takeDamage(ZONES[zi].crushDps * ramp * dt, true);
      this.crushShakeCd -= dt * 1000;
      if (this.crushShakeCd <= 0) { this.crushShakeCd = 650; this.cameras.main.shake(320, 0.012); AudioManager.warn(); gsap.killTweensOf(this.crushVig); gsap.fromTo(this.crushVig, { fillAlpha: 0.28 }, { fillAlpha: 0, duration: 0.6 }); EventBus.emit('crush', { zone: ZONES[zi].name }); }
    }
  }
  private zoneIndex(y: number): number { let z = 0; for (let i = 0; i < ZONES.length; i++) if (y >= ZONES[i].yStart) z = i; return z; }

  // -- Station (manual open via button near base; refills while near) ---
  private docking(): void {
    const atBase = this.sub.y < WORLD.surfaceY + 240 && this.sub.y > WORLD.surfaceY - 40 && Math.abs(this.sub.x - SUB.startX) < 320;
    if (atBase) this.sub.refill();
    if (atBase !== this.nearBase) { this.nearBase = atBase; EventBus.emit('near_base', { on: atBase }); if (!atBase && this.stationOpen) this.closeStation(); }
  }
  private openStation(): void {
    if (!this.nearBase || this.stationOpen || this.isOver) return;
    this.stationOpen = true; this.scene.pause(); AudioManager.uiConfirm(); this.emitStation();
  }
  private closeStation(): void { if (!this.stationOpen) return; this.stationOpen = false; this.scene.resume(); }
  private emitStation(): void { EventBus.emit('station', { cargo: { ...this.sub.cargo }, credits: GameState.getCredits() }); }

  private deposit(): void {
    const stage = GameState.currentStage();
    if (stage >= REPAIR.length) return;
    const mat = REPAIR[stage].mat; const have = this.sub.cargo[mat] ?? 0;
    const used = GameState.deposit(stage, have);
    if (used > 0) { this.sub.cargo[mat] -= used; AudioManager.trade(); this.ship.setRepair(GameState.getRepair()); EventBus.emit('toast', { text: `Installed ${used} ${RESOURCES[mat].name}`, color: CSS.crystal }); }
    this.emitStation();
    if (GameState.allRepaired()) this.win();
  }
  private sell(): void {
    let sold = 0; for (const k of RESOURCE_KINDS) { sold += (this.sub.cargo[k] ?? 0) * RESOURCES[k].value; }
    if (sold > 0) { GameState.addCredits(sold); this.sub.clearCargo(); AudioManager.trade(); EventBus.emit('toast', { text: `Sold cargo +${sold}◈`, color: CSS.warn }); }
    this.emitStation();
  }

  private win(): void {
    if (this.won) return; this.won = true; this.isOver = true; this.stationOpen = false;
    GameState.setWon(); this.scene.resume();
    AudioManager.uiConfirm(); EventBus.emit('hide_station');
    this.cameras.main.stopFollow(); this.cameras.main.pan(SUB.startX, WORLD.surfaceY - 200, 1200, 'Sine.inOut');
    this.ship.setRepair(GameState.getRepair());
    this.ship.launch(() => { EventBus.emit('win'); this.time.delayedCall(2600, () => { this.teardown(); AudioManager.stopMusic(); this.scene.stop(); this.scene.start('Menu'); }); });
    AudioManager.victory();
  }

  private onDeath(): void {
    if (this.isOver) return; this.isOver = true;
    const burst = this.add.particles(this.sub.x, this.sub.y, 'bubble', { speed: { min: 80, max: 280 }, scale: { start: 0.7, end: 0 }, lifespan: { min: 300, max: 700 }, quantity: 26, tint: [COLORS.warn, COLORS.white, COLORS.danger], emitting: false }).setDepth(70);
    burst.explode(28); this.time.delayedCall(800, () => burst.destroy());
    this.cameras.main.shake(500, 0.02); this.cameras.main.flash(300, 255, 90, 90); AudioManager.explode();
    this.sub.setVisible(false);
    const reason = this.sub.oxygen <= 0 ? 'oxygen' : this.sub.battery <= 0 ? 'battery' : 'hull';
    EventBus.emit('dead', { reason });
    this.time.delayedCall(1800, () => this.respawn());
  }
  private respawn(): void {
    this.sub.setVisible(true); this.sub.alive = true; this.sub.refill(); this.sub.clearCargo();
    this.sub.setPosition(SUB.startX, WORLD.surfaceY + 300); this.sub.body.setVelocity(0, 0);
    this.lightOn = true; this.isOver = false; this.nearBase = false;
    EventBus.emit('respawn'); this.emitHud();
  }

  private emitHud(): void {
    const depth = Math.max(0, Math.round((this.sub.y - WORLD.surfaceY) / 10));
    const zi = this.zoneIndex(this.sub.y); const armor = GameState.getUpgrade('armor');
    const stage = GameState.currentStage(); const rep = GameState.getRepair();
    const obj = stage < REPAIR.length ? { part: REPAIR[stage].part, mat: RESOURCES[REPAIR[stage].mat].name, have: rep[stage], need: REPAIR[stage].need, stage: stage + 1, total: REPAIR.length } : { part: 'COMPLETE', mat: '', have: 0, need: 0, stage: REPAIR.length, total: REPAIR.length };
    EventBus.emit('hud', {
      hull: Math.round(this.sub.hull), maxHull: this.sub.maxHull,
      oxygen: Math.round(this.sub.oxygen), maxOxygen: this.sub.maxOxygen,
      battery: Math.round(this.sub.battery), maxBattery: this.sub.maxBattery,
      depth, zone: ZONES[zi].name, crushing: zi > armor, lightOn: this.lightOn,
      sonarReady: this.sonarCd <= 0, credits: GameState.getCredits(),
      cargo: this.sub.cargoCount(), cargoMax: this.sub.cargoMax, nearBase: this.nearBase, obj,
    });
  }

  private tornDown = false;
  private teardown(): void {
    if (this.tornDown) return; this.tornDown = true;
    ['joy', 'fire', 'claw', 'light', 'sonar', 'open_station', 'close_station', 'deposit', 'sell', 'ui_pause', 'ui_resume', 'ui_to_menu'].forEach((e) => EventBus.removeAllListeners(e));
    this.scale.off('resize', this.onResize, this);
    gsap.killTweensOf(this.crushVig);
    this.light?.destroy(); this.bubbles?.destroy(); this.bolts?.destroy(); this.pickups?.destroy(); this.claw?.destroy();
    this.creatures.forEach((c) => c.destroy()); this.rocks.forEach((r) => r.destroy()); this.loose.forEach((l) => l.destroy());
    this.nodes.forEach((n) => n.destroy()); this.vents.forEach((v) => v.destroy()); this.decor.forEach((d) => d.destroy());
    this.ship?.destroy(); this.sub?.destroy();
  }
}
export default Dive;
