import Phaser from 'phaser';
import EventBus from '../EventBus.ts';
import AudioManager from '../core/AudioManager.ts';
import Storage from '../core/Storage.ts';
import { COLORS, PLAYER, SUPPORT_ITEMS } from '../core/GameConfig.ts';
import { t, getLang } from '../core/i18n.ts';
import { getLevel, LevelDef, MAX_LEVEL } from '../data/Levels.ts';
import { ItemStack, valueOf, rollEnemyLoot, rollSeaItem, seaItemReward, itemName, supportItemName } from '../data/Items.ts';
import { Container, SlotView, transfer } from '../systems/Inventory.ts';
import CannonballPool, { Cannonball } from '../systems/CannonballPool.ts';
import Effects from '../systems/Effects.ts';
import SeaItem from '../systems/SeaItem.ts';
import SunPickup from '../entities/SunPickup.ts';
import Ocean from '../entities/Ocean.ts';
import PlayerShip, { Targetable } from '../entities/PlayerShip.ts';
import EnemyShip from '../entities/EnemyShip.ts';
import LootPickup from '../entities/LootPickup.ts';
import ShopIsland from '../entities/islands/ShopIsland.ts';
import LootIsland from '../entities/islands/LootIsland.ts';
import SkullIsland from '../entities/islands/SkullIsland.ts';

// =====================================================================
// PlayScene.ts — The raid.
// =====================================================================

/** All levels always have 2 suns on the map (respawn on collect). */
function sunCountForLevel(_id: number): number {
  return 2;
}

export class PlayScene extends Phaser.Scene {
  private level!: LevelDef;
  private ocean!: Ocean;
  private player!: PlayerShip;
  private enemies: EnemyShip[] = [];
  private pickups: LootPickup[] = [];
  private seaItems: SeaItem[] = [];
  private sunPickups: SunPickup[] = [];

  // 🪙 Session-only gold (resets per level, NOT persisted to Storage)
  private sessionGold = 0;

  private shop!: ShopIsland;
  private lootIslands: LootIsland[] = [];
  private skull!: SkullIsland;
  private islands: Phaser.GameObjects.Container[] = [];

  private pool!: CannonballPool;
  private fx!: Effects;
  private bounds!: Phaser.Geom.Rectangle;
  private minimap!: Phaser.GameObjects.Graphics;

  private pointerActive = false;
  private steerAnchor = new Phaser.Math.Vector2();

  private isPaused = false;
  private isOver = false;

  private activeLoot: LootIsland | null = null;
  private nearShop = false;
  private uiOpen: 'none' | 'chest' | 'shop' = 'none';

  private hudAccum = 0;
  private lastObjective = '';

  // Respawn system
  private respawnTimer = 0;
  private readonly RESPAWN_INTERVAL = 35000;  // 35 s between patrol respawns

  // Sea item system
  private seaItemTimer = 0;
  private readonly SEA_ITEM_MIN_MS = 25000;

  // Collision damage cooldowns
  private collisionCooldown = new Map<EnemyShip, number>();

  constructor() { super('PlayScene'); }

  create(data: { level: number }): void {
    this.resetState();
    this.level = getLevel(data?.level ?? 1);

    const size = this.level.size;
    this.bounds = new Phaser.Geom.Rectangle(0, 0, size, size);
    this.physics.world.setBounds(0, 0, size, size);

    this.ocean = new Ocean(this);
    this.fx = new Effects(this);
    this.pool = new CannonballPool(this);

    this.drawBorderFrame(size);
    this.buildIslands();      // skull/shop/loot islands (no sun yet — player not ready)
    this.buildPlayer();       // this.player created here
    this.spawnInitialSuns();  // suns spawn after player so nearPlayer check works
    this.spawnPatrols();
    this.buildMinimap();

    this.setupInput();
    this.registerUiHandlers();

    this.cameras.main.startFollow(this.player, true, 0.18, 0.18);
    this.cameras.main.setZoom(1);

    AudioManager.startMusic('ingame');
    EventBus.emit('enter_play', { level: this.level.id });
    this.emitHud(true);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.teardown());
  }

  private resetState(): void {
    this.enemies = [];
    this.pickups = [];
    this.seaItems = [];
    this.sunPickups = [];
    this.sessionGold = 0;
    this.lootIslands = [];
    this.islands = [];
    this.isPaused = false;
    this.isOver = false;
    this.activeLoot = null;
    this.nearShop = false;
    this.uiOpen = 'none';
    this.pointerActive = false;
    this.hudAccum = 0;
    this.lastObjective = '';
    this.respawnTimer = 0;
    this.seaItemTimer = 0;
    this.collisionCooldown.clear();
  }

  // -------------------------------------------------------------------
  // World construction
  // -------------------------------------------------------------------
  private drawBorderFrame(size: number): void {
    const g = this.add.graphics().setDepth(8);
    const t = 10;
    g.fillStyle(0x010912, 1);
    g.fillRect(-200, -200, size + 400, 200);
    g.fillRect(-200, size, size + 400, 200);
    g.fillRect(-200, 0, 200, size);
    g.fillRect(size, 0, 200, size);
    g.lineStyle(t, COLORS.cyan, 0.55);
    g.strokeRect(0, 0, size, size);
    g.lineStyle(2, COLORS.teal, 0.9);
    g.strokeRect(t, t, size - 2 * t, size - 2 * t);
    [[0, 0], [size, 0], [0, size], [size, size]].forEach(([cx, cy]) => {
      g.fillStyle(COLORS.gold, 0.9); g.fillCircle(cx, cy, 12);
      g.fillStyle(COLORS.seaDeep, 1); g.fillCircle(cx, cy, 6);
    });
  }

  private buildIslands(): void {
    this.shop = new ShopIsland(this, this.level.shop.x, this.level.shop.y);
    this.islands.push(this.shop);
    this.level.lootIslands.forEach((p) => {
      const li = new LootIsland(this, p.x, p.y);
      this.lootIslands.push(li);
      this.islands.push(li);
    });
    this.skull = new SkullIsland(this, this.level.skull.x, this.level.skull.y, this.level.enemyHpMul);
    this.skull.setDamage(Math.round(9 * this.level.enemyDmgMul));
    this.islands.push(this.skull);
  }

  private spawnInitialSuns(): void {
    const count = sunCountForLevel(this.level.id);
    for (let i = 0; i < count; i++) this.spawnSun();
  }

  private buildPlayer(): void {
    this.player = new PlayerShip(this, this.level.playerStart.x, this.level.playerStart.y);
    this.physics.add.collider(this.player as any, this.islands as any);
  }

  private spawnPatrols(): void {
    const dmg = Math.round(7 * this.level.enemyDmgMul);
    const hp  = Math.round(44 * this.level.enemyHpMul);
    for (let i = 0; i < this.level.patrolCount; i++) {
      this.spawnOnePatrol(dmg, hp);
    }
  }

  private spawnOnePatrol(dmg?: number, hp?: number): EnemyShip {
    const d = dmg ?? Math.round(7 * this.level.enemyDmgMul);
    const h = hp  ?? Math.round(44 * this.level.enemyHpMul);
    // Speed scaled per level: 95 px/s (lvl 1) → 160 px/s (lvl 6)
    // Always well below the player's base 200 px/s so the player can escape.
    const speed = Math.round(95 + (this.level.id - 1) * 13);
    const pos = this.randomOpenPoint();
    const e = new EnemyShip(this, pos.x, pos.y, {
      kind: 'patrol',
      maxHp: h,
      damage: d,
      anchor: new Phaser.Math.Vector2(pos.x, pos.y),
      leashRadius: 0,
      bounds: this.bounds,
      speed,
    });
    // If skull is already triggered, new patrol converges immediately
    if (this.skull?.triggered) e.converge = true;
    this.registerEnemy(e);
    return e;
  }

  private spawnGuardians(): void {
    const dmg = Math.round(10 * this.level.enemyDmgMul);
    const hp  = Math.round(65 * this.level.enemyHpMul);
    // Guardians slightly faster than patrols: 112 (lvl 1) → 177 (lvl 6)
    const speed = Math.round(112 + (this.level.id - 1) * 13);
    for (let i = 0; i < this.level.guardianCount; i++) {
      const a = (i / this.level.guardianCount) * Math.PI * 2;
      const r = 240;
      const x = this.skull.x + Math.cos(a) * r;
      const y = this.skull.y + Math.sin(a) * r;
      const e = new EnemyShip(this, x, y, {
        kind: 'guardian',
        maxHp: hp,
        damage: dmg,
        anchor: new Phaser.Math.Vector2(this.skull.x, this.skull.y),
        leashRadius: this.skull.leashRadius,
        bounds: this.bounds,
        speed,
      });
      this.registerEnemy(e);
      this.fx.explosion(x, y);
    }
    // All patrols now converge on the player
    this.enemies.filter(e => e.kind === 'patrol').forEach(e => (e.converge = true));
    AudioManager.alarm();
    EventBus.emit('toast', { text: t('toast.guardians'), color: COLORS.guardian });
  }

  private registerEnemy(e: EnemyShip): void {
    this.enemies.push(e);
    this.physics.add.collider(e as any, this.islands as any);
    this.physics.add.collider(e as any, this.player as any);
  }

  private randomOpenPoint(): Phaser.Math.Vector2 {
    const m = 400;
    for (let tries = 0; tries < 40; tries++) {
      const x = Phaser.Math.Between(m, this.level.size - m);
      const y = Phaser.Math.Between(m, this.level.size - m);
      const nearPlayer  = Phaser.Math.Distance.Between(x, y, this.level.playerStart.x, this.level.playerStart.y) < 800;
      const nearIsland  = this.islands.some((is) => Phaser.Math.Distance.Between(x, y, is.x, is.y) < 420);
      const nearSkull   = Phaser.Math.Distance.Between(x, y, this.level.skull.x, this.level.skull.y) < this.skull.triggerRadius;
      if (!nearPlayer && !nearIsland && !nearSkull) return new Phaser.Math.Vector2(x, y);
    }
    return new Phaser.Math.Vector2(this.level.size / 2, this.level.size / 2);
  }

  private buildMinimap(): void {
    this.minimap = this.add.graphics().setScrollFactor(0).setDepth(80);
  }

  // -------------------------------------------------------------------
  // Input
  // -------------------------------------------------------------------
  private setupInput(): void {
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (this.isPaused || this.isOver) return;
      this.pointerActive = true;
      this.steerAnchor.set(p.x, p.y);
    });
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (!this.pointerActive || this.isPaused || this.isOver) return;
      this.player.setSteer((p.x - this.steerAnchor.x) / 90, (p.y - this.steerAnchor.y) / 90);
    });
    const release = () => { this.pointerActive = false; if (this.player) this.player.clearSteer(); };
    this.input.on('pointerup', release);
    this.input.on('pointerupoutside', release);
  }

  // -------------------------------------------------------------------
  // Main loop
  // -------------------------------------------------------------------
  update(time: number, delta: number): void {
    this.ocean.update(this.cameras.main, time);
    if (this.isPaused || this.isOver) return;

    const targets: Targetable[] =
      this.skull.vulnerable && !this.skull.destroyed
        ? [...this.enemies, { x: this.skull.x, y: this.skull.y, alive: true }]
        : this.enemies;
    this.player.update(delta, targets, this.pool, this.fx);
    this.enemies.forEach((e) => e.update(delta, this.player, this.pool, this.fx, this.enemies));
    this.skull.updateCannons(time, this.player, this.pool, this.fx);

    this.handleCannonballs();
    this.handleCollisionDamage();
    this.pool.update(this.bounds);
    this.updateSpawners(time);
    this.collectPickups();
    this.collectSuns();
    this.updateSeaItems(delta);
    this.updateProximity();
    this.maybeTriggerSkull();
    this.maybeRespawnPatrol(delta);
    this.maybeSpawnSeaItem(delta);
    this.checkWinLose();
    this.updateMinimap();

    this.hudAccum += delta;
    if (this.hudAccum > 120) { this.hudAccum = 0; this.emitHud(); }
  }

  private handleCannonballs(): void {
    const balls = this.pool.group.getChildren() as Cannonball[];
    for (const ball of balls) {
      if (!ball.active) continue;
      if (ball.faction === 'player') {
        for (const e of this.enemies) {
          if (!e.alive) continue;
          if (Phaser.Math.Distance.Between(ball.x, ball.y, e.x, e.y) < e.bodyRadius + 6) {
            this.pool.kill(ball);
            this.damageEnemy(e, ball.damage);
            break;
          }
        }
        if (!ball.active) continue;
        // vs skull
        if (!this.skull.destroyed) {
          const dSkull = Phaser.Math.Distance.Between(ball.x, ball.y, this.skull.x, this.skull.y);
          if (dSkull < 75) {
            this.pool.kill(ball);
            this.fx.explosion(ball.x, ball.y);
            AudioManager.hitHull();
            if (this.skull.vulnerable) {
              if (this.skull.takeDamage(ball.damage)) this.onSkullDestroyed();
            } else {
              this.skull.shieldHit();
              EventBus.emit('toast', { text: t('toast.shieldBlock'), color: COLORS.purple });
            }
          }
        }
      } else {
        if (Phaser.Math.Distance.Between(ball.x, ball.y, this.player.x, this.player.y) < PLAYER.bodyRadius + 6) {
          this.pool.kill(ball);
          this.fx.explosion(ball.x, ball.y);
          AudioManager.hitHull();
          this.player.takeDamage(ball.damage);
          this.emitHud(true);
        }
      }
    }
  }

  /** Small damage when ships physically collide (with per-pair cooldown). */
  private handleCollisionDamage(): void {
    const now = this.time.now;
    for (const e of this.enemies) {
      if (!e.alive) continue;
      const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, e.x, e.y);
      const minDist = (PLAYER.bodyRadius + e.bodyRadius) * 1.15;
      if (d < minDist) {
        const last = this.collisionCooldown.get(e) ?? 0;
        if (now - last > 900) {
          this.collisionCooldown.set(e, now);
          this.player.takeDamage(3);
          e.takeDamage(2);
          // Must check death here — if alive=false, onEnemyKilled was never called
          // from this path, leaving the ship frozen/translucent in the enemies array.
          if (!e.alive) {
            this.onEnemyKilled(e);
          }
          this.fx.explosion(this.player.x, this.player.y);
          AudioManager.hitHull();
          this.emitHud(true);
        }
      }
    }
  }

  private damageEnemy(e: EnemyShip, dmg: number): void {
    this.fx.explosion(e.x, e.y);
    AudioManager.hitHull();
    e.takeDamage(dmg);
    if (!e.alive) this.onEnemyKilled(e);
  }

  private onEnemyKilled(e: EnemyShip): void {
    this.fx.explosion(e.x, e.y, true);
    AudioManager.explosion();
    const drops = e.kind === 'guardian' ? 2 : 1;
    for (let i = 0; i < drops; i++) {
      const a = Math.random() * Math.PI * 2;
      this.pickups.push(new LootPickup(this, e.x + Math.cos(a) * 26, e.y + Math.sin(a) * 26, rollEnemyLoot()));
    }
    e.destroy();
    this.enemies = this.enemies.filter((x) => x !== e);
    this.collisionCooldown.delete(e);

    if (this.skull.triggered && !this.skull.vulnerable) {
      const guardiansLeft = this.enemies.filter((x) => x.kind === 'guardian').length;
      if (guardiansLeft === 0) {
        this.skull.dropShield();
        AudioManager.victory();
        EventBus.emit('toast', { text: t('toast.shieldBroke'), color: COLORS.gold });
      }
    }
  }

  private onSkullDestroyed(): void {
    this.isOver = true;
    this.fx.explosion(this.skull.x, this.skull.y, true);
    for (let i = 0; i < 6; i++) {
      this.time.delayedCall(i * 160, () => {
        const a = Math.random() * Math.PI * 2;
        this.fx.explosion(this.skull.x + Math.cos(a) * 80, this.skull.y + Math.sin(a) * 80, true);
        AudioManager.explosion();
      });
    }
    // Level-clear gives 1-2 bonus suns (small, main source is map pickups)
    const sunBonus = this.level.id >= 4 ? 2 : 1;
    Storage.addSuns(sunBonus);
    Storage.markLevelCleared(this.level.id, MAX_LEVEL);
    AudioManager.victory();
    this.cameras.main.shake(600, 0.012);
    this.time.delayedCall(900, () => {
      EventBus.emit('level_won', {
        level: this.level.id,
        sunBonus,
        suns: Storage.getSuns(),
        hasNext: this.level.id < MAX_LEVEL,
      });
    });
  }

  // -------------------------------------------------------------------
  // Patrol respawn
  // -------------------------------------------------------------------
  private maybeRespawnPatrol(delta: number): void {
    if (this.isOver) return;
    this.respawnTimer += delta;
    if (this.respawnTimer < this.RESPAWN_INTERVAL) return;
    this.respawnTimer = 0;

    const livePatrols = this.enemies.filter(e => e.kind === 'patrol').length;
    if (livePatrols < this.level.patrolCount) {
      this.spawnOnePatrol();
      EventBus.emit('toast', { text: t('toast.respawn'), color: COLORS.ember });
    }
  }

  // -------------------------------------------------------------------
  // Sea items
  // -------------------------------------------------------------------
  // -------------------------------------------------------------------
  // Sun pickups
  // -------------------------------------------------------------------
  private spawnSun(): void {
    const m = 400;
    // Use player position if available, otherwise fall back to level start
    const px = this.player?.x ?? this.level.playerStart.x;
    const py = this.player?.y ?? this.level.playerStart.y;
    for (let tries = 0; tries < 30; tries++) {
      const x = Phaser.Math.Between(m, this.level.size - m);
      const y = Phaser.Math.Between(m, this.level.size - m);
      const nearIsland  = this.islands.some(is => Phaser.Math.Distance.Between(x, y, is.x, is.y) < 350);
      const nearPlayer  = Phaser.Math.Distance.Between(x, y, px, py) < 600;
      const nearOtherSun = this.sunPickups.some(s => !s.collected && Phaser.Math.Distance.Between(x, y, s.x, s.y) < 300);
      if (!nearIsland && !nearPlayer && !nearOtherSun) {
        this.sunPickups.push(new SunPickup(this, x, y));
        return;
      }
    }
    // Fallback: spawn at map centre quadrant
    this.sunPickups.push(new SunPickup(this,
      Phaser.Math.Between(this.level.size * 0.3, this.level.size * 0.7),
      Phaser.Math.Between(this.level.size * 0.3, this.level.size * 0.7),
    ));
  }

  private collectSuns(): void {
    const toRespawn: SunPickup[] = [];
    this.sunPickups = this.sunPickups.filter((sun) => {
      if (sun.collected) return false;
      if (sun.checkCollect(this.player.x, this.player.y)) {
        sun.collectEffect();
        Storage.addSuns(1);
        AudioManager.gold();
        this.fx.floatText(sun.x, sun.y, '☀️ +1', '#fbbf24');
        EventBus.emit('sun_collected', { suns: Storage.getSuns() });
        toRespawn.push(sun);
        return false;
      }
      return true;
    });
    // Respawn at new location for each collected sun
    toRespawn.forEach(() => this.spawnSun());
  }

  private maybeSpawnSeaItem(delta: number): void {
    if (this.level.seaItemChance <= 0 || this.isOver) return;
    this.seaItemTimer += delta;
    if (this.seaItemTimer < this.SEA_ITEM_MIN_MS) return;

    // Roll based on chance per second
    const roll = Math.random();
    if (roll < this.level.seaItemChance * (delta / 1000)) {
      this.seaItemTimer = 0;
      this.spawnSeaItem();
    }
  }

  private spawnSeaItem(): void {
    const m = 500;
    for (let tries = 0; tries < 20; tries++) {
      const x = Phaser.Math.Between(m, this.level.size - m);
      const y = Phaser.Math.Between(m, this.level.size - m);
      const nearIsland = this.islands.some(is => Phaser.Math.Distance.Between(x, y, is.x, is.y) < 300);
      if (!nearIsland) {
        const def = rollSeaItem();
        this.seaItems.push(new SeaItem(this, x, y, def));
        EventBus.emit('toast', { text: t('toast.seaItemSpawn'), color: COLORS.gold });
        return;
      }
    }
  }

  private updateSeaItems(delta: number): void {
    this.seaItems = this.seaItems.filter((item) => {
      if (item.collected) { item.destroy(); return false; }
      if (item.tick(delta, this.player.x, this.player.y)) {
        // Collected!
        const name = itemName(item.def, getLang());
        if (item.def.id === 'sea_potion') {
          this.player.heal(35);
          this.emitHud(true);
        } else {
          // Sea map items give session gold (not suns)
          const gold = seaItemReward(item.def, this.level.id);
          this.sessionGold += gold;
          this.emitHud(true);
        }
        this.fx.explosion(item.x, item.y);
        AudioManager.loot();
        EventBus.emit('toast', { text: t('toast.seaCollected', name), color: COLORS.gold });
        item.destroy();
        return false;
      }
      return true;
    });
  }

  // -------------------------------------------------------------------
  // Spawners & pickups
  // -------------------------------------------------------------------
  private updateSpawners(time: number): void {
    this.lootIslands.forEach((li) => {
      const dropped = li.updateSpawner(time);
      if (dropped && this.uiOpen === 'chest' && this.activeLoot === li) this.emitChestData();
    });
  }

  private collectPickups(): void {
    this.pickups = this.pickups.filter((pk) => {
      const d = Phaser.Math.Distance.Between(pk.x, pk.y, this.player.x, this.player.y);
      if (d < 40 && !this.player.cargo.isFull) {
        this.player.cargo.add(pk.stack);
        this.fx.floatText(pk.x, pk.y, pk.stack.def.glyph + ' +1', pk.cssColor);
        AudioManager.loot();
        pk.destroy();
        this.emitHud(true);
        return false;
      }
      return true;
    });
  }

  // -------------------------------------------------------------------
  // Proximity docking
  // -------------------------------------------------------------------
  private updateProximity(): void {
    let near: LootIsland | null = null;
    let bestD = Infinity;
    for (const li of this.lootIslands) {
      const d = li.distanceTo(this.player.x, this.player.y);
      if (d < li.dockRadius && d < bestD) { bestD = d; near = li; }
    }
    if (near !== this.activeLoot) {
      this.activeLoot = near;
      EventBus.emit('near_loot', { active: !!near });
      if (!near && this.uiOpen === 'chest') this.closeUi();
    }

    const shopD = this.shop.distanceTo(this.player.x, this.player.y);
    const nowNearShop = shopD < this.shop.dockRadius;
    if (nowNearShop !== this.nearShop) {
      this.nearShop = nowNearShop;
      EventBus.emit('near_shop', { active: nowNearShop });
      if (!nowNearShop && this.uiOpen === 'shop') this.closeUi();
    }
  }

  private maybeTriggerSkull(): void {
    if (this.skull.triggered) return;
    if (this.skull.distanceTo(this.player.x, this.player.y) < this.skull.triggerRadius) {
      this.skull.triggered = true;
      this.spawnGuardians();
    }
  }

  private checkWinLose(): void {
    if (this.isOver) return;
    if (!this.player.alive) {
      this.isOver = true;
      this.fx.explosion(this.player.x, this.player.y, true);
      AudioManager.explosion(); AudioManager.defeat();
      this.cameras.main.shake(500, 0.01);
      this.time.delayedCall(700, () => EventBus.emit('level_lost', { level: this.level.id }));
    }
  }

  // -------------------------------------------------------------------
  // Minimap
  // -------------------------------------------------------------------
  private updateMinimap(): void {
    const S = 132, pad = 12;
    const x0 = this.scale.width - S - pad;
    const y0 = pad + 70;
    const k = S / this.level.size;
    const g = this.minimap;
    g.clear();
    g.fillStyle(0x010912, 0.7);
    g.fillRoundedRect(x0 - 4, y0 - 4, S + 8, S + 8, 6);
    g.lineStyle(1.5, COLORS.cyan, 0.5);
    g.strokeRoundedRect(x0 - 4, y0 - 4, S + 8, S + 8, 6);

    const dot = (wx: number, wy: number, color: number, r: number) => {
      g.fillStyle(color, 1); g.fillCircle(x0 + wx * k, y0 + wy * k, r);
    };
    dot(this.shop.x, this.shop.y, COLORS.gold, 3);
    this.lootIslands.forEach((li) => dot(li.x, li.y, COLORS.cyan, 2.5));
    dot(this.skull.x, this.skull.y, COLORS.crimson, 4);
    this.enemies.forEach((e) => dot(e.x, e.y, e.kind === 'guardian' ? COLORS.guardian : COLORS.crimson, 2));
    this.seaItems.forEach((si) => dot(si.x, si.y, COLORS.gold, 2));
    this.sunPickups.filter(s => !s.collected).forEach(s => dot(s.x, s.y, 0xffe566, 3.5));
    dot(this.player.x, this.player.y, COLORS.teal, 3);
  }

  // -------------------------------------------------------------------
  // HUD + objective
  // -------------------------------------------------------------------
  private objectiveText(): string {
    if (this.skull.destroyed) return t('obj.won');
    if (!this.skull.triggered) return t('obj.approach');
    const left = this.enemies.filter((e) => e.kind === 'guardian').length;
    if (left > 0) return t('obj.guardian', left);
    if (!this.skull.vulnerable) return t('obj.shielded');
    return t('obj.attack');
  }

  private emitHud(force = false): void {
    const objective = this.objectiveText();
    this.lastObjective = objective;
    EventBus.emit('hud', {
      hp: Math.round(this.player.hp),
      maxHp: this.player.maxHp,
      gold: this.sessionGold,    // session-only 🪙, resets per level
      cargo: this.player.cargo.count,
      cargoMax: this.player.cargo.capacity,
      level: this.level.id,
      objective,
    });
  }

  // -------------------------------------------------------------------
  // Inventory snapshots
  // -------------------------------------------------------------------
  private slotView = (s: ItemStack): SlotView => ({
    uid: s.uid,
    id: s.def.id,
    name: getLang() === 'en' ? s.def.nameEn : s.def.name,
    glyph: s.def.glyph,
    rarity: s.def.rarity,
    value: valueOf(s.def, this.level.id),
  });

  private viewOf(c: Container): SlotView[] { return c.items.map(this.slotView); }

  private emitChestData(): void {
    if (!this.activeLoot) return;
    EventBus.emit('chest_data', {
      chest: this.viewOf(this.activeLoot.chest),
      cargo: this.viewOf(this.player.cargo),
      chestMax: this.activeLoot.chest.capacity,
      cargoMax: this.player.cargo.capacity,
      spawnIn: this.activeLoot.secondsToSpawn(this.time.now),
    });
  }

  private repairCost(): number {
    return Math.ceil((this.player.maxHp - this.player.hp) * 1.4);
  }

  private emitShopData(): void {
    const activeBuff = this._activeBuff;
    // Effective stats shown to the player (base × upgrades × active buffs)
    const effSpeed  = Math.round(Storage.effectiveMaxSpeed(PLAYER.maxSpeed) * this.player.speedMult);
    const effDmg    = Math.round(PLAYER.cannonDamage * this.player.damageMult);
    const effCd     = Math.round(Storage.effectiveFireCooldown(PLAYER.fireCooldown) * this.player.fireCooldownMult);
    const effArmor  = this.player.armorMult;   // < 1 = takes less damage
    const fullCost   = this.repairCost();
    const canPartial = this.sessionGold > 0 && this.sessionGold < fullCost && fullCost > 0;
    EventBus.emit('shop_data', {
      cargo: this.viewOf(this.player.cargo),
      gold: this.sessionGold,
      hp: Math.round(this.player.hp),
      maxHp: this.player.maxHp,
      repairCost: fullCost,
      canPartialRepair: canPartial,
      partialCost: canPartial ? this.sessionGold : 0,
      levelId: this.level.id,
      activeBuff,
      stats: {
        maxHp:    this.player.maxHp,
        speed:    effSpeed,
        damage:   effDmg,
        fireMs:   effCd,         // cooldown in ms; lower = faster
        armor:    effArmor,
        cargo:    this.player.cargo.capacity,
        upgSpeed: Storage.getUpgradeLevel('speed'),
        upgFire:  Storage.getUpgradeLevel('fireRate'),
        upgHp:    Storage.getUpgradeLevel('hp'),
      },
    });
  }

  // Track current active buff (only one at a time for simplicity)
  private _activeBuff: string | null = null;

  // -------------------------------------------------------------------
  // UI intent handlers
  // -------------------------------------------------------------------
  private registerUiHandlers(): void {
    const on = (evt: string, fn: (...a: any[]) => void) => EventBus.on(evt, fn, this);

    on('ui_open_chest', () => {
      if (!this.activeLoot || this.isOver) return;
      this.uiOpen = 'chest';
      this.pauseGame();
      this.emitChestData();
      EventBus.emit('show_chest');
      AudioManager.uiTap();
    });

    on('ui_open_shop', () => {
      if (!this.nearShop || this.isOver) return;
      this.uiOpen = 'shop';
      this.pauseGame();
      this.emitShopData();
      EventBus.emit('show_shop');
      AudioManager.uiTap();
    });

    on('ui_close_panel', () => this.closeUi());

    on('chest_transfer', (d: { uid: number; to: 'chest' | 'ship' }) => {
      if (!this.activeLoot) return;
      const ok = d.to === 'ship'
        ? transfer(this.activeLoot.chest, this.player.cargo, d.uid)
        : transfer(this.player.cargo, this.activeLoot.chest, d.uid);
      AudioManager.uiTap();
      if (ok) { this.emitChestData(); this.emitHud(true); }
      else EventBus.emit('toast', { text: t('toast.chestFull'), color: COLORS.crimson });
    });

    on('chest_discard', (d: { uid: number; from: 'chest' | 'ship' }) => {
      const c = d.from === 'chest' ? this.activeLoot?.chest : this.player.cargo;
      if (c?.removeByUid(d.uid)) { AudioManager.discard(); this.emitChestData(); this.emitHud(true); }
    });

    on('shop_sell', (d: { uid: number }) => {
      const stack = this.player.cargo.removeByUid(d.uid);
      if (stack) {
        this.sessionGold += valueOf(stack.def, this.level.id);
        AudioManager.gold();
        this.emitShopData();
        this.emitHud(true);
      }
    });

    on('shop_sell_all', () => {
      let total = 0;
      this.player.cargo.clear().forEach((s) => (total += valueOf(s.def, this.level.id)));
      if (total > 0) {
        this.sessionGold += total;
        AudioManager.gold();
        EventBus.emit('toast', { text: t('toast.soldAll', total), color: COLORS.gold });
      }
      this.emitShopData();
      this.emitHud(true);
    });

    on('shop_repair', () => {
      const cost = this.repairCost();
      if (cost <= 0) {
        EventBus.emit('toast', { text: t('toast.repairFull'), color: COLORS.green });
        return;
      }
      if (this.sessionGold <= 0) {
        EventBus.emit('toast', { text: t('toast.noGold'), color: COLORS.crimson });
        return;
      }
      if (this.sessionGold >= cost) {
        // Full repair
        this.sessionGold -= cost;
        this.player.healFull();
        AudioManager.repair();
        EventBus.emit('toast', { text: t('toast.repairDone'), color: COLORS.green });
      } else {
        // Partial repair — spend ALL remaining gold, heal proportionally
        const ratio = this.sessionGold / cost;
        const healAmt = Math.max(1, Math.round((this.player.maxHp - this.player.hp) * ratio));
        this.sessionGold = 0;
        this.player.heal(healAmt);
        AudioManager.repair();
        EventBus.emit('toast', { text: t('toast.repairPartial', healAmt), color: COLORS.teal });
      }
      this.emitShopData();
      this.emitHud(true);
    });

    on('shop_buy_support', (d: { effectId: string }) => {
      const def = SUPPORT_ITEMS.find(s => s.id === d.effectId);
      if (!def) return;
      if (this.sessionGold < def.cost) {
        EventBus.emit('toast', { text: t('toast.noGold'), color: COLORS.crimson });
        return;
      }
      this.sessionGold -= def.cost;
      if (def.effect === 'heal_35') {
        this.player.heal(35);
        this.emitHud(true);
      } else {
        this.player.applyBuff(def.effect, def.mult, def.duration);
        this._activeBuff = def.id;
        // Clear activeBuff tracker after duration
        if (def.duration > 0) {
          this.time.delayedCall(def.duration, () => {
            if (this._activeBuff === def.id) this._activeBuff = null;
          });
        }
      }
      AudioManager.gold();
      const name = supportItemName(d.effectId, getLang());
      EventBus.emit('toast', { text: t('toast.buffActive', name), color: COLORS.cyan });
      this.emitShopData();
    });

    on('ui_pause', () => {
      if (this.isOver || this.uiOpen !== 'none') return;
      this.pauseGame();
      EventBus.emit('show_pause');
    });
    on('ui_resume', () => this.closeUi());
    on('ui_quit', () => this.cleanupAndGoMenu());
    on('ui_restart', () => { const lvl = this.level.id; this.teardown(); this.scene.restart({ level: lvl }); });
    on('ui_next_level', () => { const next = Math.min(MAX_LEVEL, this.level.id + 1); this.teardown(); this.scene.restart({ level: next }); });
  }

  private pauseGame(): void {
    this.isPaused = true;
    this.physics.pause();
    if (this.player) this.player.clearSteer();
  }

  private resumeGame(): void {
    this.isPaused = false;
    this.physics.resume();
  }

  private closeUi(): void {
    if (this.uiOpen !== 'none' || this.isPaused) {
      this.uiOpen = 'none';
      this.resumeGame();
      EventBus.emit('hide_panels');
      // updateProximity() only emits when state CHANGES. After closing a panel
      // the player is still in the same spot, so the cached state matches and
      // no event fires. Force re-emit so dock buttons reappear immediately.
      if (this.activeLoot) EventBus.emit('near_loot', { active: true });
      if (this.nearShop)   EventBus.emit('near_shop',  { active: true });
    }
  }

  private cleanupAndGoMenu(): void {
    this.teardown();
    AudioManager.stopMusic();
    this.scene.start('MenuScene');
  }

  private teardown(): void {
    [
      'ui_open_chest', 'ui_open_shop', 'ui_close_panel', 'chest_transfer',
      'chest_discard', 'shop_sell', 'shop_sell_all', 'shop_repair',
      'shop_buy_support', 'ui_pause', 'ui_resume', 'ui_quit',
      'ui_restart', 'ui_next_level',
    ].forEach((evt) => EventBus.removeAllListeners(evt));
  }
}

export default PlayScene;
