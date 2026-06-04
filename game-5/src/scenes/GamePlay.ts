import Phaser from 'phaser';
import EventBus from '../EventBus.ts';
import AudioManager from '../core/AudioManager.ts';
import GameState from '../core/GameState.ts';
import { COLORS, CSS, SHIP, GUN, LEVELS, ASTEROIDS, ITEMS, CONSUMABLES, HAZARDS, AsteroidKind, ItemKind, ConsumableKey, RARITY_CSS } from '../config.ts';
import Starfield from '../systems/Starfield.ts';
import LaserPool from '../systems/LaserPool.ts';
import FX from '../systems/FX.ts';
import Spaceship from '../entities/Spaceship.ts';
import Gun, { GunMode } from '../entities/Gun.ts';
import Asteroid from '../entities/Asteroid.ts';
import Comet from '../entities/Comet.ts';
import Item from '../entities/Item.ts';

// =====================================================================
// GamePlay.ts — The mining run.
//
// Owns the scrolling world, ship, sweeping gun/claw, asteroid + item
// lifecycles, laser collisions, energy/hull economy and the level timer.
// Talks to the HTML HUD purely through the EventBus.
// =====================================================================

export class GamePlay extends Phaser.Scene {
  private level = 1;
  private starfield!: Starfield;
  private ship!: Spaceship;
  private gun!: Gun;
  private lasers!: LaserPool;
  private fx!: FX;

  private asteroids: Asteroid[] = [];
  private comets: Comet[] = [];
  private items: Item[] = [];

  private cometTimer = 0;

  private bounds!: Phaser.Geom.Rectangle;
  private scrollSpeed = LEVELS.scrollSpeed;
  private spawnInterval = LEVELS.spawnIntervalMs;
  private spawnTimer = 0;

  private energy = SHIP.maxEnergy;
  private credits = 0;
  private timeLeft = 0;

  private isOver = false;
  private isPaused = false;
  private hudAccum = 0;

  // Active consumable effect expiry timestamps (this.time.now based)
  private magnetUntil = 0;
  private overchargeUntil = 0;
  private multishotUntil = 0;

  constructor() { super('GamePlay'); }

  create(data: { level: number }): void {
    this.resetState();
    this.level = data?.level ?? 1;

    const w = this.scale.width;
    const h = this.scale.height;
    this.bounds = new Phaser.Geom.Rectangle(0, 0, w, h);

    // Difficulty scaling
    this.scrollSpeed = LEVELS.scrollSpeed + (this.level - 1) * LEVELS.scrollGrowPerLevel;
    this.spawnInterval = LEVELS.spawnIntervalMs * Math.pow(LEVELS.spawnSpeedupPerLevel, this.level - 1);
    this.timeLeft = LEVELS.durationSec + (this.level - 1) * LEVELS.durationGrowSec;

    this.starfield = new Starfield(this);
    this.fx = new FX(this);
    this.lasers = new LaserPool(this);

    // Ship anchored near the bottom
    const shipX = w / 2;
    const shipY = h * SHIP.anchorYFrac;
    this.ship = new Spaceship(this, shipX, shipY);
    this.ship.boostFlare();

    // Gun pivot sits just above the nose
    this.gun = new Gun(this, this.ship.muzzle.x, this.ship.muzzle.y);
    this.gun.onFireLaser = (x, y, ang, dmg) => {
      const now = this.time.now;
      const d = now < this.overchargeUntil ? dmg * CONSUMABLES.overcharge.mult : dmg;
      if (now < this.multishotUntil) {
        [-0.14, 0, 0.14].forEach((off) => this.lasers.fire(x, y, ang + off, d));
      } else {
        this.lasers.fire(x, y, ang, d);
      }
    };
    this.gun.onCollect = (item) => this.collectItem(item);
    this.gun.onModeChange = (mode) => this.onModeChange(mode);
    this.gun.onEnergyDrain = (amount) => { this.energy = Math.max(0, this.energy - amount); };

    this.setupInput();
    this.registerHandlers();

    AudioManager.startMusic('game', this.level - 1);   // track varies per level
    EventBus.emit('enter_game', { level: this.level });
    this.emitHud(true);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.teardown());
  }

  private resetState(): void {
    this.asteroids = [];
    this.comets = [];
    this.cometTimer = 0;
    this.items = [];
    this.energy = SHIP.maxEnergy;
    this.credits = 0;
    this.spawnTimer = 0;
    this.hudAccum = 0;
    this.isOver = false;
    this.isPaused = false;
    this.magnetUntil = 0;
    this.overchargeUntil = 0;
    this.multishotUntil = 0;
  }

  // -- Input ------------------------------------------------------------
  private setupInput(): void {
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (this.isOver || this.isPaused) return;
      this.handleTap(p);
    });
  }

  private handleTap(p: Phaser.Input.Pointer): void {
    if (this.gun.isFrozen) {
      this.fx.floatText(this.ship.x, this.ship.y - 60, 'FROZEN', CSS.ice);
      return;
    }
    // Claw mode launch requires a little energy to fire
    if (this.gun.mode === 'claw' && !this.gun.isClawBusy && this.energy < 5) {
      AudioManager.alarm();
      this.fx.floatText(this.ship.x, this.ship.y - 60, 'LOW ENERGY', CSS.magma);
      return;
    }
    // Shoot mode aims at the tapped point; claw mode uses the sweep.
    this.gun.handleTap(p.worldX, p.worldY);
  }

  // -- Main loop --------------------------------------------------------
  update(_time: number, delta: number): void {
    if (this.isPaused) return;
    const dt = delta / 1000;

    this.starfield.update(this.scrollSpeed, dt);
    if (this.isOver) return;

    // Timer
    this.timeLeft -= dt;
    if (this.timeLeft <= 0) {
      this.timeLeft = 0;
      this.winRun();
      return;
    }

    // Energy regen (only when not actively hauling)
    if (!this.gun.isClawBusy) {
      this.energy = Math.min(SHIP.maxEnergy, this.energy + SHIP.energyRegenPerSec * dt);
    }

    // Spawn asteroids
    this.spawnTimer += delta;
    if (this.spawnTimer >= this.spawnInterval) {
      this.spawnTimer -= this.spawnInterval;
      this.spawnAsteroid();
    }

    // Comets (level 3+)
    this.maybeSpawnComet(delta);

    // Update entities
    this.gun.update(delta, this.items);
    this.updateAsteroids(dt);
    this.updateComets(dt);
    this.updateItems(dt);
    this.updateMagnet(dt);
    this.lasers.update(dt, this.bounds);
    this.handleLaserHits();
    this.checkShipCollisions();

    // HUD throttle
    this.hudAccum += delta;
    if (this.hudAccum > 100) { this.hudAccum = 0; this.emitHud(); }
  }

  // -- Asteroids --------------------------------------------------------
  private spawnAsteroid(): void {
    const kinds: AsteroidKind[] = ['rock', 'ice', 'magma'];
    // Weight toward rock early, more magma later
    const roll = Math.random();
    let kind: AsteroidKind = 'rock';
    const magmaChance = Math.min(0.4, 0.08 + this.level * 0.03);
    const iceChance = 0.3;
    if (roll < magmaChance) kind = 'magma';
    else if (roll < magmaChance + iceChance) kind = 'ice';

    const contains = this.rollItem(kind);
    const r = ASTEROIDS[kind].radius;
    const x = Phaser.Math.Between(r + 20, this.scale.width - r - 20);
    const y = -r - 30;
    this.asteroids.push(new Asteroid(this, x, y, kind, contains));
  }

  private rollItem(kind: AsteroidKind): ItemKind {
    // Chance the asteroid is rigged with a hazard instead of loot (scales up)
    const hazChance = Math.min(HAZARDS.maxChance, HAZARDS.baseChance + (this.level - 1) * HAZARDS.chancePerLevel);
    if (Math.random() < hazChance) return Math.random() < 0.5 ? 'bomb' : 'frost';

    // Magma tends to hold rarer loot
    const r = Math.random();
    const bias = ASTEROIDS[kind].weightBias;
    if (r < 0.04 + bias * 0.1) return 'relic';
    if (r < 0.18 + bias * 0.1) return 'core';
    if (r < 0.46) return 'gold';
    return 'quartz';
  }

  private updateAsteroids(dt: number): void {
    this.asteroids = this.asteroids.filter((a) => {
      a.update(this.scrollSpeed, dt);
      // Despawn once fully past the bottom
      if (a.y > this.scale.height + a.radius + 40) {
        a.destroy();
        return false;
      }
      return true;
    });
  }

  // -- Comets (fast diagonal hazard, level 3+) -------------------------
  private maybeSpawnComet(delta: number): void {
    if (this.level < 3) return;
    this.cometTimer += delta;
    // Average one comet every ~9s, a bit more often at higher levels
    const interval = Math.max(4500, 10000 - this.level * 450);
    if (this.cometTimer < interval) return;
    this.cometTimer = 0;
    this.spawnComet();
  }

  private spawnComet(): void {
    const w = this.scale.width;
    // Enter from top, angled toward the lower half
    const fromX = Phaser.Math.Between(w * 0.1, w * 0.9);
    const y = -40;
    const speed = (this.scrollSpeed * 3.2) + 220 + this.level * 14;
    const ang = Phaser.Math.DegToRad(Phaser.Math.Between(60, 120)); // mostly downward
    const vx = Math.cos(ang) * speed * (Math.random() < 0.5 ? 1 : -1) * 0.5;
    const vy = Math.sin(ang) * speed;
    const bonus = 70 + this.level * 12;
    this.comets.push(new Comet(this, fromX, y, vx, vy, bonus));
  }

  private updateComets(dt: number): void {
    const m = 80;
    this.comets = this.comets.filter((c) => {
      if (c.dead) return false;
      c.update(dt);
      if (c.y > this.scale.height + m || c.x < -m || c.x > this.scale.width + m) {
        c.kill();
        return false;
      }
      return true;
    });
  }

  // -- Items ------------------------------------------------------------
  private updateItems(dt: number): void {
    this.items = this.items.filter((it) => {
      if (it.state === 'collected') return false;
      it.drift(this.scrollSpeed, dt);
      // Free items that drift off-screen are lost
      if (it.state === 'free' && it.y > this.scale.height + 60) {
        it.destroy();
        return false;
      }
      return true;
    });
  }

  /** Tractor Magnet: while active, pull all FREE items to the ship and auto-collect. */
  private updateMagnet(dt: number): void {
    if (this.time.now >= this.magnetUntil) return;
    const sx = this.ship.x, sy = this.ship.y - 20;
    const pullSpeed = 620;
    for (const it of this.items) {
      if (it.state !== 'free') continue;
      const ang = Math.atan2(sy - it.y, sx - it.x);
      it.x += Math.cos(ang) * pullSpeed * dt;
      it.y += Math.sin(ang) * pullSpeed * dt;
      if (Phaser.Math.Distance.Between(it.x, it.y, sx, sy) < 36) {
        this.collectItem(it);
      }
    }
  }

  private collectItem(item: Item): void {
    if (item.state === 'collected') return;
    if (item.hazard) { this.triggerHazard(item); return; }
    const def = ITEMS[item.kind];
    this.credits += def.value;
    this.fx.collectBurst(this.ship.x, this.ship.y - 30, def.color);
    this.fx.floatText(this.ship.x, this.ship.y - 70, `+${def.value}`, RARITY_CSS[def.rarity]);
    AudioManager.pickup(def.rarity);
    AudioManager.credits();
    item.collect();
    this.items = this.items.filter((i) => i !== item);
    this.emitHud(true);
  }

  /** A hazard drop was hauled/pulled in — apply its bad effect. */
  private triggerHazard(item: Item): void {
    item.collect();
    this.items = this.items.filter((i) => i !== item);
    if (item.hazard === 'bomb') {
      this.fx.shatter(this.ship.x, this.ship.y, COLORS.magma, 14);
      this.fx.floatText(this.ship.x, this.ship.y - 80, `-${HAZARDS.bombDamage} HULL`, CSS.magma);
      AudioManager.hullHit();
      this.damageShip(HAZARDS.bombDamage);   // handles shake + lose check + HUD
    } else {
      this.gun.freeze(HAZARDS.frostMs);
      this.fx.collectBurst(this.ship.x, this.ship.y - 30, COLORS.ice);
      this.fx.floatText(this.ship.x, this.ship.y - 80, `FROZEN ${Math.round(HAZARDS.frostMs / 1000)}s`, CSS.ice);
      AudioManager.alarm();
      this.emitHud(true);
    }
  }

  /** Activate a consumable (triggered from the HUD). */
  private useConsumable(key: ConsumableKey): void {
    if (this.isOver || this.isPaused) return;
    const now = this.time.now;
    // Don't allow re-activating while still running
    const activeUntil = key === 'magnet' ? this.magnetUntil
      : key === 'overcharge' ? this.overchargeUntil : this.multishotUntil;
    if (now < activeUntil) return;
    if (!GameState.useConsumable(key)) { AudioManager.alarm(); return; }

    const dur = CONSUMABLES[key].durationMs;
    if (key === 'magnet') this.magnetUntil = now + dur;
    else if (key === 'overcharge') this.overchargeUntil = now + dur;
    else this.multishotUntil = now + dur;

    AudioManager.uiConfirm();
    this.fx.floatText(this.ship.x, this.ship.y - 90, CONSUMABLES[key].name.toUpperCase(), CONSUMABLES[key].color);
    this.emitHud(true);
  }

  // -- Lasers vs asteroids / comets ------------------------------------
  private handleLaserHits(): void {
    const bolts = this.lasers.active();
    for (const b of bolts) {
      // Comets first (small, fast, worth bonus)
      let hitComet = false;
      for (const c of this.comets) {
        if (c.dead) continue;
        if (Phaser.Math.Distance.Between(b.x, b.y, c.x, c.y) < c.radius) {
          this.lasers.kill(b);
          this.destroyComet(c);
          hitComet = true;
          break;
        }
      }
      if (hitComet) continue;

      for (const a of this.asteroids) {
        if (a.cracked) continue;
        if (Phaser.Math.Distance.Between(b.x, b.y, a.x, a.y) < a.radius) {
          this.lasers.kill(b);
          const cracked = a.takeDamage(b.damage);
          if (cracked) {
            this.crackAsteroid(a);
          } else {
            this.fx.impact(b.x, b.y, ASTEROIDS[a.kind].glow);
            AudioManager.asteroidHit();
          }
          break;
        }
      }
    }
  }

  private destroyComet(c: Comet): void {
    this.credits += c.bonus;
    this.fx.shatter(c.x, c.y, COLORS.cyan, 12);
    this.fx.floatText(c.x, c.y - 20, `+${c.bonus}`, CSS.cyan);
    AudioManager.asteroidCrack();
    AudioManager.credits();
    this.cameras.main.shake(140, 0.005);
    c.kill();
    this.comets = this.comets.filter((x) => x !== c);
    this.emitHud(true);
  }

  private crackAsteroid(a: Asteroid): void {
    this.fx.shatter(a.x, a.y, ASTEROIDS[a.kind].glow, ASTEROIDS[a.kind].fragments);
    AudioManager.asteroidCrack();
    this.cameras.main.shake(120, 0.004);

    // Release the contained item at the asteroid's position
    const item = new Item(this, a.x, a.y, a.contains);
    // Give it a little outward drift so it doesn't sit exactly on centre
    this.items.push(item);

    a.destroy();
    this.asteroids = this.asteroids.filter((x) => x !== a);
    // Note: mode does NOT auto-switch to claw — the player toggles manually
    // (so they can keep shooting, and avoid hauling hazard drops).
  }

  // -- Ship collisions --------------------------------------------------
  private checkShipCollisions(): void {
    const sx = this.ship.x, sy = this.ship.y;
    for (const a of this.asteroids) {
      if (a.cracked) continue;
      const d = Phaser.Math.Distance.Between(sx, sy, a.x, a.y);
      if (d < a.radius + 28) {
        // Impact! Damage scales with asteroid size
        const dmg = Math.round(8 + a.radius * 0.25);
        this.damageShip(dmg);
        this.fx.shatter(a.x, a.y, ASTEROIDS[a.kind].glow, 6);
        AudioManager.hullHit();
        a.destroy();
        this.asteroids = this.asteroids.filter((x) => x !== a);
        break; // one hit per frame is enough
      }
    }
    // Comet collisions hurt more
    for (const c of this.comets) {
      if (c.dead) continue;
      if (Phaser.Math.Distance.Between(sx, sy, c.x, c.y) < c.radius + 26) {
        this.damageShip(20);
        this.fx.shatter(c.x, c.y, COLORS.cyan, 8);
        AudioManager.hullHit();
        c.kill();
        this.comets = this.comets.filter((x) => x !== c);
        break;
      }
    }
  }

  private damageShip(amount: number): void {
    this.ship.takeDamage(amount);
    this.cameras.main.shake(200, 0.008);
    this.emitHud(true);
    if (!this.ship.alive) this.loseRun();
  }

  // -- Mode change ------------------------------------------------------
  private onModeChange(mode: GunMode): void {
    EventBus.emit('mode_change', { mode });
    if (mode === 'claw') AudioManager.uiTap();
  }

  // -- Win / lose -------------------------------------------------------
  private winRun(): void {
    this.isOver = true;
    this.gun.forceReset();
    GameState.addCredits(this.credits);
    GameState.recordRun(this.credits);
    GameState.unlockLevel(this.level + 1, LEVELS.maxLevel);
    AudioManager.victory();
    this.time.delayedCall(700, () => {
      EventBus.emit('run_complete', {
        level: this.level,
        earned: this.credits,
        totalCredits: GameState.getCredits(),
        hasNext: this.level < LEVELS.maxLevel,
        survived: true,
      });
    });
  }

  private loseRun(): void {
    this.isOver = true;
    this.gun.forceReset();
    // Partial credits on death (50%)
    const kept = Math.round(this.credits * 0.5);
    GameState.addCredits(kept);
    GameState.recordRun(this.credits);
    AudioManager.defeat();
    this.cameras.main.shake(500, 0.012);
    this.fx.shatter(this.ship.x, this.ship.y, COLORS.magma, 16);
    this.ship.setVisible(false);
    this.gun.setVisible(false);
    this.time.delayedCall(900, () => {
      EventBus.emit('run_failed', {
        level: this.level,
        earned: kept,
        totalCredits: GameState.getCredits(),
      });
    });
  }

  // -- HUD --------------------------------------------------------------
  private consumableHud(): any[] {
    const now = this.time.now;
    const keys = Object.keys(CONSUMABLES) as ConsumableKey[];
    return keys.map((k) => {
      const until = k === 'magnet' ? this.magnetUntil : k === 'overcharge' ? this.overchargeUntil : this.multishotUntil;
      const activeLeft = Math.max(0, until - now);
      return {
        key: k,
        count: GameState.getConsumable(k),
        active: activeLeft > 0,
        activeFrac: activeLeft / CONSUMABLES[k].durationMs,
      };
    });
  }

  private emitHud(force = false): void {
    void force;
    EventBus.emit('hud', {
      hull: Math.round(this.ship.hull),
      maxHull: this.ship.maxHull,
      energy: Math.round(this.energy),
      maxEnergy: SHIP.maxEnergy,
      credits: this.credits,
      time: Math.ceil(this.timeLeft),
      level: this.level,
      mode: this.gun.mode,
      consumables: this.consumableHud(),
    });
  }

  // -- UI intents -------------------------------------------------------
  private registerHandlers(): void {
    const on = (evt: string, fn: (...a: any[]) => void) => EventBus.on(evt, fn, this);

    on('use_consumable', (d: { key: ConsumableKey }) => this.useConsumable(d.key));
    on('ui_toggle_mode', () => {
      if (this.isOver || this.isPaused) return;
      this.gun.toggleMode();
    });
    on('ui_pause', () => {
      if (this.isOver) return;
      this.isPaused = true;
      this.physics?.pause?.();
      EventBus.emit('show_pause');
    });
    on('ui_resume', () => {
      this.isPaused = false;
      EventBus.emit('hide_pause');
    });
    on('ui_quit_run', () => {
      this.teardown();
      AudioManager.stopMusic();
      this.scene.start('Menu');
    });
    on('ui_to_shop', () => {
      this.teardown();
      AudioManager.stopMusic();
      this.scene.start('Shop', { from: 'run', nextLevel: this.level + 1 });
    });
    on('ui_retry', () => {
      const lvl = this.level;
      this.teardown();
      this.scene.start('GamePlay', { level: lvl });
    });
    on('ui_next_level', () => {
      const next = Math.min(LEVELS.maxLevel, this.level + 1);
      this.teardown();
      this.scene.start('GamePlay', { level: next });
    });
  }

  private teardown(): void {
    [
      'use_consumable', 'ui_toggle_mode', 'ui_pause', 'ui_resume', 'ui_quit_run',
      'ui_to_shop', 'ui_retry', 'ui_next_level',
    ].forEach((e) => EventBus.removeAllListeners(e));
    this.lasers?.destroy();
    this.starfield?.destroy();

    // Explicitly destroy entities so their per-object cleanup runs (gsap tweens
    // in Item/Spaceship, Comet particle tails). Phaser's DisplayList.shutdown
    // also calls destroy(), but doing it here removes the hidden dependency on
    // that internal and is safe to call twice (Phaser guards `destroyed`).
    this.items.forEach((i) => i.destroy());
    this.comets.forEach((c) => c.destroy());
    this.asteroids.forEach((a) => a.destroy());
    this.ship?.destroy();
    this.gun?.destroy();
    this.items = [];
    this.comets = [];
    this.asteroids = [];
  }
}

export default GamePlay;
