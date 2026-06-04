import Phaser from 'phaser';
import EventBus from '../EventBus.ts';
import AudioManager from '../core/AudioManager.ts';
import GameState from '../core/GameState.ts';
import { COLORS, CSS, WORLD, DRONE, TETHER, CAMERA, CARGO_TYPES, IMPACT, THEMES, CargoKind } from '../config.ts';
import { getRoute, generateGeometry, RouteDef, RouteGeometry, MAX_ROUTE } from '../data/Levels.ts';
import FX from '../systems/FX.ts';
import MagnetBeam from '../systems/MagnetBeam.ts';
import Background from '../systems/Background.ts';
import OffscreenArrow from '../systems/OffscreenArrow.ts';
import Drone from '../entities/Drone.ts';
import Cargo from '../entities/Cargo.ts';
import Wall from '../entities/Wall.ts';
import Mover from '../entities/Mover.ts';
import WindZone from '../entities/WindZone.ts';
import DeliveryPad from '../entities/DeliveryPad.ts';

// =====================================================================
// GamePlay.ts — Delivery run on a TALL scrolling world (real Arcade
// physics). Geometry is generated per route; the camera follows the drone
// down through wall gates to the pad. Off-screen arrow keeps the pad/cargo
// findable. Background + skyline baked to one RenderTexture for perf.
// =====================================================================

export class GamePlay extends Phaser.Scene {
  private route!: RouteDef;
  private geo!: RouteGeometry;
  private cargoKind: CargoKind = 'iron';

  private bg!: Background;
  private drone!: Drone;
  private cargo!: Cargo;
  private pad!: DeliveryPad;
  private walls: Wall[] = [];
  private movers: Mover[] = [];
  private winds: WindZone[] = [];
  private beam!: MagnetBeam;
  private arrow!: OffscreenArrow;
  private fx!: FX;

  private fuel = DRONE.maxFuel;
  private maxFuel = DRONE.maxFuel;
  private credits = 0;
  private streak = 0;

  private locked = false;
  private isOver = false;
  private isPaused = false;
  private hudAccum = 0;
  private lowFuelWarned = false;
  private stuckMs = 0;
  private droneLastSpeed = 0;
  private cargoLastSpeed = 0;

  constructor() { super('GamePlay'); }

  create(data: { route: number; cargo: CargoKind; streak?: number }): void {
    this.resetState();
    this.route = getRoute(data?.route ?? 1);
    this.cargoKind = data?.cargo ?? 'iron';
    this.streak = data?.streak ?? 0;
    this.geo = generateGeometry(this.route);
    const wh = this.geo.worldHeight;

    this.physics.world.setBounds(0, 0, WORLD.width, wh);
    this.physics.world.gravity.y = WORLD.gravityY * this.route.gravityMul;
    this.maxFuel = Math.round(DRONE.maxFuel * GameState.fuelMult());
    this.fuel = this.maxFuel;

    this.bg = new Background(this, wh, THEMES[this.route.theme], this.route.id);
    this.fx = new FX(this);
    this.beam = new MagnetBeam(this);
    this.drawBorder(wh);

    // Walls + hazards from generated geometry
    const theme = THEMES[this.route.theme];
    this.geo.walls.forEach((w) => this.walls.push(new Wall(this, w.x, w.y, w.w, w.h, theme.wall)));
    this.geo.hazards.forEach((h) => {
      if (h.type === 'mover') this.movers.push(new Mover(this, h.x, h.y, h.w, h.h, h.range, h.speed, h.phase));
      else this.winds.push(new WindZone(this, h.x, h.y, h.w, h.h, h.accelX));
    });

    this.pad = new DeliveryPad(this, this.geo.pad.cx, this.geo.pad.topY, this.geo.pad.w);
    this.cargo = new Cargo(this, this.geo.pickup.x, this.geo.pickup.y, this.cargoKind);
    this.drawPickupStation(this.geo.pickup.x, this.geo.pickup.y);
    this.drone = new Drone(this, WORLD.width / 2, 60);

    // Colliders (drone & cargo vs walls & movers; drone vs cargo)
    this.physics.add.collider(this.drone as any, this.walls as any, this.onDroneHit, undefined, this);
    this.physics.add.collider(this.drone as any, this.movers as any, this.onDroneHit, undefined, this);
    this.physics.add.collider(this.cargo as any, this.walls as any, this.onCargoHit, undefined, this);
    this.physics.add.collider(this.cargo as any, this.movers as any, this.onCargoHit, undefined, this);
    // NOTE: no drone↔cargo collider on purpose. They're joined by the tether;
    // a collider made the laden drone bump the (damped, slower-falling) cargo
    // below it and fall noticeably slower than unladen — an unfair asymmetry.

    // Camera follows the drone down the tall world, biased to show below.
    this.cameras.main.setBounds(0, 0, WORLD.width, wh);
    this.cameras.main.startFollow(this.drone, true, CAMERA.lerp, CAMERA.lerp);
    this.cameras.main.setFollowOffset(0, CAMERA.followOffsetY);
    this.cameras.main.setDeadzone(CAMERA.deadzoneW, CAMERA.deadzoneH);

    this.arrow = new OffscreenArrow(this);
    this.setupInput();
    this.registerHandlers();

    AudioManager.startMusic('game', this.route.id - 1);
    EventBus.emit('enter_game', { route: this.route.id, name: this.route.name, cargo: this.cargoKind });
    this.emitHud(true);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.teardown());
  }

  private resetState(): void {
    this.walls = []; this.movers = []; this.winds = [];
    this.fuel = DRONE.maxFuel; this.credits = 0;
    this.locked = false; this.isOver = false; this.isPaused = false;
    this.hudAccum = 0; this.lowFuelWarned = false; this.stuckMs = 0;
    this.droneLastSpeed = 0; this.cargoLastSpeed = 0;
    this.tornDown = false;
  }

  // -- Decorative ------------------------------------------------------
  private drawBorder(wh: number): void {
    const g = this.add.graphics().setDepth(13);
    g.lineStyle(4, COLORS.cyan, 0.4);
    g.strokeRect(2, 2, WORLD.width - 4, wh - 4);
  }

  private drawPickupStation(x: number, y: number): void {
    const g = this.add.graphics().setDepth(12);
    g.fillStyle(COLORS.violet, 0.18);
    g.fillRoundedRect(x - 34, y + 18, 68, 12, 4);
    g.lineStyle(2.5, COLORS.pink, 0.9);
    g.strokeRoundedRect(x - 34, y + 18, 68, 12, 4);
    g.lineStyle(2, COLORS.cyan, 0.7);
    g.lineBetween(x - 30, y + 18, x - 30, y - 6);
    g.lineBetween(x + 30, y + 18, x + 30, y - 6);
  }

  // -- Input -----------------------------------------------------------
  private setupInput(): void { this.input.addPointer(2); }

  private readEngines(): { left: boolean; right: boolean } {
    let left = false, right = false;
    if (this.fuel > 0 && !this.isPaused && !this.isOver) {
      for (const p of this.input.manager.pointers) {
        // Screen-half intent → use pointer.x (screen space), not worldX.
        if (p.isDown) { if (p.x < this.scale.width / 2) left = true; else right = true; }
      }
    }
    return { left, right };
  }

  // -- Collisions ------------------------------------------------------
  private onDroneHit(): void {
    const speed = this.droneLastSpeed;
    if (speed > 90) {
      this.fx.sparks(this.drone.x, this.drone.y + this.drone.bodyRadius, COLORS.cyan, 6);
      AudioManager.bump();
      this.drone.hitFlash();
      if (speed > IMPACT.droneThreshold) this.cameras.main.shake(120, 0.006);
    }
  }

  private onCargoHit(): void {
    const speed = this.cargoLastSpeed;
    if (speed > 80) this.fx.sparks(this.cargo.x, this.cargo.y, COLORS.yellow, 6);
    const res = this.cargo.takeImpact(speed);
    if (res.hurt) { AudioManager.bump(); this.cameras.main.shake(140, 0.007); this.emitHud(true); }
    if (res.broke) this.breakCargo();
  }

  // -- Main loop -------------------------------------------------------
  update(time: number, delta: number): void {
    if (this.isPaused || this.isOver) return;
    const dt = delta / 1000;

    const e = this.readEngines();
    this.drone.setEngines(e.left, e.right);
    this.drone.update(delta);
    this.movers.forEach((m) => m.update());

    // Wind zones push the drone (and locked cargo) while inside.
    if (this.winds.length) this.applyWind(dt);

    const enginesOn = (e.left ? 1 : 0) + (e.right ? 1 : 0);
    if (enginesOn > 0) {
      this.fuel = Math.max(0, this.fuel - DRONE.fuelBurnPerSec * enginesOn * dt);
      if (this.fuel <= 25 && !this.lowFuelWarned) { this.lowFuelWarned = true; AudioManager.lowFuel(); EventBus.emit('toast', { text: 'LOW FUEL', color: CSS.yellow }); }
    }

    if (!this.locked && this.cargo.state === 'idle') {
      const a = this.drone.getAnchor();
      if (Phaser.Math.Distance.Between(a.x, a.y, this.cargo.x, this.cargo.y) < TETHER.lockRange) this.lockCargo();
    }
    if (this.locked && this.cargo.state === 'locked') {
      const a = this.drone.getAnchor();
      this.cargo.tetherTo(a.x, a.y, delta);
      this.beam.draw(a.x, a.y, this.cargo.x, this.cargo.y, time);
      this.checkDelivery();
      if (!this.isOver) this.checkGroundImpact();
    }

    // Off-screen indicator → cargo (pre-lock) or pad (descending)
    if (!this.locked) this.arrow.update(this.cargo.x, this.cargo.y, COLORS.pink, true);
    else this.arrow.update(this.geo.pad.cx, this.geo.pad.topY, COLORS.lime, true);

    this.checkStuck(dt);

    this.droneLastSpeed = this.drone.body.speed;
    this.cargoLastSpeed = this.cargo.body.speed;

    this.hudAccum += delta;
    if (this.hudAccum > 100) { this.hudAccum = 0; this.emitHud(); }
  }

  /**
   * A hard slam into the WORLD bounds (ground/ceiling/side) also damages the
   * cargo — collider callbacks only cover obstacle walls, not the world edges.
   * Uses last-frame speed (pre-impact); takeImpact's cooldown dedupes with the
   * wall collider and prevents any resting-contact drain.
   */
  private checkGroundImpact(): void {
    const b = this.cargo.body.blocked;
    if (!(b.down || b.up || b.left || b.right)) return;
    if (this.cargoLastSpeed < 80) return;       // resting → no drain
    const res = this.cargo.takeImpact(this.cargoLastSpeed);
    if (res.hurt) {
      this.fx.sparks(this.cargo.x, this.cargo.y + this.cargo.bodyRadius, COLORS.yellow, 6);
      AudioManager.bump();
      this.cameras.main.shake(140, 0.007);
      this.emitHud(true);
    }
    if (res.broke) this.breakCargo();
  }

  private applyWind(dt: number): void {
    for (const w of this.winds) {
      if (w.contains(this.drone.x, this.drone.y)) this.drone.body.velocity.x += w.accelX * dt;
      if (this.locked && w.contains(this.cargo.x, this.cargo.y)) this.cargo.body.velocity.x += w.accelX * dt;
    }
  }

  private lockCargo(): void {
    this.locked = true;
    this.cargo.lock();
    this.drone.setLaden(CARGO_TYPES[this.cargoKind].weightMult);
    this.beam.setVisible(true);
    this.fx.pop(this.cargo.x, this.cargo.y, COLORS.cyan);
    AudioManager.magnetLock();
    EventBus.emit('toast', { text: 'CARGO LOCKED', color: CSS.cyan });
  }

  private checkDelivery(): void {
    if (!this.pad.contains(this.cargo.x, this.cargo.y)) return;
    if (this.cargo.body.speed > 120) return;   // a little bounce still counts
    this.deliver();
  }

  private deliver(): void {
    this.isOver = true;
    this.physics.pause();          // freeze all bodies behind the result popup
    this.cargo.setDelivered();
    this.beam.setVisible(false);
    this.cameras.main.stopFollow();
    const def = CARGO_TYPES[this.cargoKind];
    const fuelBonus = Math.round(this.fuel * 0.5);
    const hpBonus = Math.round((this.cargo.hp / this.cargo.maxHp) * 40);
    this.credits = def.reward + this.route.reward + fuelBonus + hpBonus;
    GameState.addCredits(this.credits);
    GameState.recordDelivery(this.streak + 1);
    GameState.clearRoute(this.route.id, this.credits, MAX_ROUTE);
    AudioManager.deliver();
    this.fx.pop(this.cargo.x, this.cargo.y, COLORS.lime);
    this.cameras.main.flash(200, 157, 255, 92);
    this.time.delayedCall(700, () => {
      EventBus.emit('run_complete', {
        route: this.route.id, cargo: this.cargoKind, reward: this.credits, fuelBonus, hpBonus,
        totalCredits: GameState.getCredits(), hasNext: this.route.id < MAX_ROUTE, streak: this.streak + 1,
        nextRoute: Math.min(MAX_ROUTE, this.route.id + 1),
      });
    });
  }

  private breakCargo(): void {
    if (this.isOver) return;
    this.isOver = true;
    this.physics.pause();          // freeze the drone mid-air behind the popup
    this.beam.setVisible(false);
    this.cameras.main.stopFollow();
    this.fx.shatter(this.cargo.x, this.cargo.y, CARGO_TYPES[this.cargoKind].glow);
    this.cargo.setVisible(false);
    this.cameras.main.shake(420, 0.014);
    AudioManager.crash();
    this.time.delayedCall(800, () => EventBus.emit('run_failed', { route: this.route.id, reason: 'cargo', totalCredits: GameState.getCredits() }));
  }

  private checkStuck(dt: number): void {
    if (this.fuel > 0) { this.stuckMs = 0; return; }
    const slow = this.drone.body.speed < 18 && (!this.locked || this.cargo.body.speed < 18);
    if (slow) {
      this.stuckMs += dt * 1000;
      if (this.stuckMs > 2200) {
        this.isOver = true;
        this.physics.pause();
        this.beam.setVisible(false);
        AudioManager.fail();
        this.time.delayedCall(500, () => EventBus.emit('run_failed', { route: this.route.id, reason: 'fuel', totalCredits: GameState.getCredits() }));
      }
    } else this.stuckMs = 0;
  }

  // -- HUD -------------------------------------------------------------
  private emitHud(force = false): void {
    void force;
    EventBus.emit('hud', {
      fuel: Math.round(this.fuel), maxFuel: this.maxFuel,
      integrity: Math.round(this.cargo.hp), maxIntegrity: this.cargo.maxHp,
      credits: this.credits, locked: this.locked,
      route: this.route.id, routeName: this.route.name,
    });
  }

  // -- UI intents ------------------------------------------------------
  private registerHandlers(): void {
    const on = (evt: string, fn: (...a: any[]) => void) => EventBus.on(evt, fn, this);
    on('ui_pause', () => { if (this.isOver) return; this.isPaused = true; this.physics.pause(); EventBus.emit('show_pause'); });
    on('ui_resume', () => { this.isPaused = false; this.physics.resume(); EventBus.emit('hide_pause'); });
    on('ui_quit_run', () => { this.teardown(); AudioManager.stopMusic(); this.scene.start('Menu'); });
    on('ui_retry', () => { const r = this.route.id, c = this.cargoKind; this.teardown(); this.scene.start('GamePlay', { route: r, cargo: c, streak: 0 }); });
    on('ui_next_run', (d: { route: number; cargo: CargoKind }) => { this.teardown(); this.scene.start('GamePlay', { route: d.route, cargo: d.cargo, streak: this.streak }); });
    on('ui_to_shop', () => { this.teardown(); AudioManager.stopMusic(); this.scene.start('Shop', { from: 'run' }); });
  }

  private tornDown = false;
  private teardown(): void {
    if (this.tornDown) return;          // idempotent (ui_* handler + SHUTDOWN both call)
    this.tornDown = true;
    ['ui_pause', 'ui_resume', 'ui_quit_run', 'ui_retry', 'ui_next_run', 'ui_to_shop'].forEach((e) => EventBus.removeAllListeners(e));
    if (this.cameras?.main) this.cameras.main.stopFollow();
    this.beam?.destroy();
    this.bg?.destroy();
    this.arrow?.destroy();
    this.walls.forEach((w) => w.destroy());
    this.movers.forEach((m) => m.destroy());
    this.winds.forEach((w) => w.destroy());
    this.drone?.destroy();
    this.cargo?.destroy();
    this.pad?.destroy();
    this.walls = []; this.movers = []; this.winds = [];
  }
}

export default GamePlay;
