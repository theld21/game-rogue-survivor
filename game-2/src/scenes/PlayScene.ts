import Phaser from 'phaser';
import Player from '../game/Player.ts';
import Planet, { PlanetType } from '../game/Planet.ts';
import PlanetFactory from '../game/PlanetFactory.ts';
import { LaserGrid, RoamingBlackHole, DebrisRing, SpeedBoostRing, RefractorCrystal, Meteor } from '../game/Hazards.ts';
import EventBus from '../EventBus.ts';
import AudioManager from '../utils/AudioManager.ts';
import GameProgress from '../utils/GameProgress.ts';
import { OrbitState } from '../game/PlayerState.ts';
import { GAME_CONFIG } from '../game/GameConfig.ts';

export class PlayScene extends Phaser.Scene {
  // Gameplay systems
  player!: Player;
  planets: Planet[] = [];
  hazardsGroup!: Phaser.GameObjects.Group;
  shardsGroup!: Phaser.Physics.Arcade.StaticGroup;
  laserGrids: LaserGrid[] = [];
  blackHoles: RoamingBlackHole[] = [];
  debrisRings: DebrisRing[] = [];
  speedRings: SpeedBoostRing[] = [];
  refractorCrystals: RefractorCrystal[] = [];
  
  goalPlanet: Planet | null = null;
  startPlanet: Planet | null = null;

  // Level Progression stats
  currentSector: number = 1;
  score: number = 0;
  shardsCollected: number = 0;
  shardsNeeded: number = 5;
  isGoalUnlocked: boolean = false;
  isGameOver: boolean = false;

  // Input Tracking
  private touchStartX: number = 0;
  private touchStartY: number = 0;
  private touchStartTime: number = 0;
  private lastClickTime: number = 0;
  private isPointerDown: boolean = false;

  // Double-tap input delay buffering variables
  private tapCount: number = 0;
  private tapTimer: Phaser.Time.TimerEvent | null = null;

  // Parallax starfield galaxy background variables
  private starfieldGraphics!: Phaser.GameObjects.Graphics;
  private stars: Array<{ x: number; y: number; speed: number; size: number; alpha: number }> = [];

  // Trap handlers
  private slowAnomalyTimer: Phaser.Time.TimerEvent | null = null;

  // Meteor hazard variables
  private meteorTimer: Phaser.Time.TimerEvent | null = null;
  private meteors: Meteor[] = [];

  // Device pixel ratio zoom value
  public zoomVal: number = 1.0;

  constructor() {
    super('PlayScene');
  }

  create(): void {
    this.isGameOver = false;
    this.shardsCollected = 0;
    this.isGoalUnlocked = false;
    this.laserGrids = [];
    this.blackHoles = [];
    this.debrisRings = [];
    this.speedRings = [];
    this.refractorCrystals = [];
    this.planets = [];
    this.meteors = [];
    this.meteorTimer = null;
    this.slowAnomalyTimer = null;
    this.tapCount = 0;
    this.tapTimer = null;

    // Starfield Background Graphics (added first to render underneath all other graphics elements)
    this.starfieldGraphics = this.add.graphics();
    this.initStarfield();

    // Play loop synthesizer music
    AudioManager.stopMusic();
    AudioManager.startMusic('ingame', this.currentSector);

    // 1. Establish Camera scale zoom base on device resolution
    const dpr = window.devicePixelRatio || 1;
    const baseZoom = 0.85; // slightly zoom out so they can see paths
    this.zoomVal = baseZoom * dpr;
    this.cameras.main.setZoom(this.zoomVal);
    this.cameras.main.setBackgroundColor('#05020c');

    // Create groups
    this.shardsGroup = this.physics.add.staticGroup();
    this.hazardsGroup = this.add.group();

    // 2. Generate procedural sector
    this.generateSector(this.currentSector);

    // 3. Register physical overlap colliders
    this.physics.add.overlap(this.player, this.shardsGroup, this.collectShard, undefined, this);
    
    // Setup inputs
    this.setupInputs();

    // Notify HTML overlay that gameplay HUD should activate
    EventBus.emit('play_started', {
      sector: this.currentSector,
      shardsNeeded: this.shardsNeeded,
      score: this.score
    });

    // Listen to UI action buttons
    EventBus.on('ui_pause_game', this.pauseGame, this);
    EventBus.on('ui_resume_game', this.resumeGame, this);
    EventBus.on('ui_quit_game', this.quitGame, this);
    EventBus.on('ui_retry_game', this.retryGame, this);

    // Watch for player death triggers
    EventBus.on('player_died', this.handlePlayerDeath, this);
  }

  update(time: number, delta: number): void {
    if (this.isGameOver) return;

    // Draw parallax galaxy starfield background first
    this.drawStarfield();

    // Check for Hold contraction activation after 200ms
    if (this.isPointerDown && !this.player.isHoldingContract) {
      const elapsed = Date.now() - this.touchStartTime;
      if (elapsed >= 200) {
        this.player.handleInput('HOLD_START');
      }
    }

    // Magnet Attractor Cell pulls nearby shards dynamically
    if (this.player.isMagnetActive) {
      this.shardsGroup.getChildren().forEach((shard: any) => {
        const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, shard.x, shard.y);
        if (dist < GAME_CONFIG.PLAYER.MAGNET_RANGE) {
          const angle = Phaser.Math.Angle.Between(shard.x, shard.y, this.player.x, this.player.y);
          shard.x += Math.cos(angle) * 8;
          shard.y += Math.sin(angle) * 8;
          if (shard.body) {
            shard.body.updateFromGameObject();
          }
        }
      });
    }

    // Update active player container
    this.player.update(time, delta);

    // Camera follow target (centers on planet if orbiting to reduce circle dizziness)
    let targetX = this.player.x;
    let targetY = this.player.y;
    let cameraLerp = 0.22; // Fast camera tracking during flight to keep player in view
    
    if (this.player.currentPlanet) {
      targetX = this.player.currentPlanet.x;
      targetY = this.player.currentPlanet.y;
      cameraLerp = 0.05; // Slow smooth centering on planets during orbit
    }
    
    const targetScrollX = targetX - this.cameras.main.width / 2;
    const targetScrollY = targetY - this.cameras.main.height / 2;
    this.cameras.main.scrollX += (targetScrollX - this.cameras.main.scrollX) * cameraLerp;
    this.cameras.main.scrollY += (targetScrollY - this.cameras.main.scrollY) * cameraLerp;

    // Check boundary check: lost in deep space (too far from any planet)
    if (this.player.getCurrentStateName() === 'STATE_FLYING' && !this.player.isFrozenInCrystal) {
      let minDistanceToPlanet = Infinity;
      this.planets.forEach(planet => {
        const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, planet.x, planet.y);
        const distToSurface = dist - planet.radius;
        if (distToSurface < minDistanceToPlanet) {
          minDistanceToPlanet = distToSurface;
        }
      });
      
      const threshold = GAME_CONFIG.PLAYER.DEEP_SPACE_THRESHOLD || 350;
      if (minDistanceToPlanet > threshold) {
        EventBus.emit('player_died', { reason: 'deep_space' });
        return;
      }
    }

    // Update and recycle meteors (and check player collision)
    const bounds = this.cameras.main.worldView;
    const mMargin = 300;
    for (let i = this.meteors.length - 1; i >= 0; i--) {
      const m = this.meteors[i];
      m.preUpdate(); // update emitter positions
      
      if (
        m.x < bounds.x - mMargin ||
        m.x > bounds.x + bounds.width + mMargin ||
        m.y < bounds.y - mMargin ||
        m.y > bounds.y + bounds.height + mMargin
      ) {
        m.destroy();
        this.meteors.splice(i, 1);
      } else {
        // Collision check
        if (this.player && !this.player.isFrozenInCrystal && !this.isGameOver) {
          const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, m.x, m.y);
          if (dist < 18) { // Ship bounds + Meteor bounds
            EventBus.emit('player_died', { reason: 'meteor' });
          }
        }
      }
    }

    // Update hazard structures
    this.blackHoles.forEach(bh => bh.update(time, delta, this.player));
    this.debrisRings.forEach(dr => dr.update(time, delta));
    
    // Check line intersects player for active Lasers
    this.laserGrids.forEach(laser => {
      if (laser.checkCollision(this.player)) {
        EventBus.emit('player_died', { reason: 'laser' });
      }
    });

    // Update planetary physics overlaps:
    // If player is flying, check if they cross orbit thresholds or hit bouncy/wormhole
    if (this.player.getCurrentStateName() === 'STATE_FLYING') {
      const dtSeconds = delta / 1000;
      
      // Bouncy planets collision reflection check
      this.planets.forEach(planet => {
        const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, planet.x, planet.y);
        
        // 1. Gravity Simulation (excluding bouncy planets, crystals, and pulsar shockwaves)
        if (planet.planetType !== 'bouncy' && planet.planetType !== 'pulsar' && dist > 10 && this.player.body && !this.player.isFrozenInCrystal) {
          const G = GAME_CONFIG.PLANETS.GRAVITY_CONSTANT || 3500;
          const force = (G * planet.radius) / (dist * dist);
          const cappedForce = Math.min(force, 25);
          
          const forceX = ((planet.x - this.player.x) / dist) * cappedForce;
          const forceY = ((planet.y - this.player.y) / dist) * cappedForce;
          
          // Apply velocity adjustment
          this.player.body.velocity.x += forceX * 60 * dtSeconds;
          this.player.body.velocity.y += forceY * 60 * dtSeconds;
        }

        // 2. Collision and Recapture checks
        if (planet.planetType === 'bouncy') {
          // if touching dashed perimeter
          if (dist <= planet.radius + 10 && dist >= planet.radius - 15) {
            planet.handleBounceReflection(this.player);
          }
        } else {
          // Check standard gravitational capture radius
          const captureRange = planet.radius + 20;
          
          // Bypass capture if it's the last planet and we haven't escaped yet
          if (planet === this.player.lastPlanet) {
            if (dist <= captureRange + 15) {
              return; // Skip capture check
            } else {
              this.player.lastPlanet = null; // Clean up since we successfully escaped
            }
          }
          
          if (dist <= captureRange) {
            // Check shift gate orange repell
            if (planet.planetType === 'shift_gate' && (planet as any).shiftGateState === 'orange') {
              // repel
              return;
            }
            
            // If goal planet, only allow land if unlocked!
            if (planet === this.goalPlanet && !this.isGoalUnlocked) {
              return;
            }
            
            // Attach to new planet orbit!
            this.player.setPosition(this.player.x, this.player.y);
            this.player.changeState(new OrbitState(planet));
            
            // Check sector win if landed on goal planet!
            if (planet === this.goalPlanet && this.isGoalUnlocked) {
              this.handleSectorCleared();
            }
          }
        }
      });

      // Interactive object overlaps:
      // 1. Refractor Crystals capture trigger
      this.refractorCrystals.forEach(crystal => {
        const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, crystal.x, crystal.y);
        if (dist < 20) {
          crystal.capturePlayer(this.player);
        }
      });

      // 2. Speed Boost Rings overlapping trigger
      this.speedRings.forEach(ring => {
        const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, ring.x, ring.y);
        if (dist < 20) {
          ring.triggerBoost(this.player);
        }
      });

      // 3. Debris rock overlaps
      this.debrisRings.forEach(ring => {
        ring.rocks.forEach(rock => {
          if (!this.player.isSpeedBoosted) {
            const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, rock.x, rock.y);
            if (dist < 14) {
              EventBus.emit('player_died', { reason: 'debris' });
            }
          }
        });
      });
    }
  }

  // --- TOUCH / CLICK INPUT HANDLERS ---

  private setupInputs(): void {
    // Touch / click starts
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (this.isGameOver) return;
      
      // Visual touch ripple in world coordinates
      const ripple = this.add.arc(pointer.worldX, pointer.worldY, 2, 0, 360, false, 0x00f0ff, 0.85);
      this.tweens.add({
        targets: ripple,
        radius: 24,
        alpha: 0,
        duration: 320,
        ease: 'Quad.easeOut',
        onComplete: () => ripple.destroy()
      });

      this.isPointerDown = true;
      this.touchStartX = pointer.x;
      this.touchStartY = pointer.y;
      this.touchStartTime = Date.now();
    });

    const handlePointerUp = (pointer: Phaser.Input.Pointer) => {
      if (this.isGameOver || !this.isPointerDown) return;
      
      this.isPointerDown = false;
      this.player.handleInput('HOLD_END');
      
      const elapsed = Date.now() - this.touchStartTime;
      const dx = pointer.x - this.touchStartX;
      const dy = pointer.y - this.touchStartY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      if (dist > 35 && elapsed < 400) {
        this.resetTapBuffer();
        this.player.handleInput('SWIPE_DASH', { dx, dy });
      } else {
        // Only trigger if it was a quick tap, not a long press (elapsed < 200ms)
        if (elapsed < 200) {
          this.tapCount++;
          
          if (this.tapCount === 1) {
            const bufferWindow = GAME_CONFIG.PLAYER.DOUBLE_TAP_WINDOW || 220;
            this.tapTimer = this.time.delayedCall(bufferWindow, () => {
              if (this.tapCount === 1) {
                this.player.handleInput('TAP_JUMP');
              }
              this.resetTapBuffer();
            });
          } else if (this.tapCount === 2) {
            this.resetTapBuffer();
            this.player.handleInput('DOUBLE_TAP');
          }
        }
      }
    };

    // Touch / click ends
    this.input.on('pointerup', handlePointerUp);
    this.input.on('pointerout', handlePointerUp);
    this.input.on('pointercancel', handlePointerUp);
  }

  private resetTapBuffer(): void {
    if (this.tapTimer) {
      this.tapTimer.destroy();
      this.tapTimer = null;
    }
    this.tapCount = 0;
  }

  // --- COLLECTIBLES overlaps ---

  private collectShard(playerObj: any, shardObj: any): void {
    const itemType = (shardObj as any).itemType || 'shard';
    const sx = shardObj.x;
    const sy = shardObj.y;
    shardObj.destroy();
    
    const values = GAME_CONFIG.ITEMS.VALUES;
    
    if (itemType === 'shard') {
      this.shardsCollected++;
      this.score += values.SHARD_SCORE;
      AudioManager.playShard();
    } 
    else if (itemType === 'gold_core') {
      this.shardsCollected += values.GOLD_CORE_SHARDS;
      this.score += values.GOLD_CORE_SCORE;
      AudioManager.playLevelUp();
      this.showToastMessage(`+${values.GOLD_CORE_SHARDS} Energy +${values.GOLD_CORE_SCORE} PTS`, 0xfbbf24);
    } 
    else if (itemType === 'shield') {
      this.player.activateShield();
      AudioManager.playLevelUp();
      this.showToastMessage("SHIELD CONFLICT ACTIVE", 0x00f0ff);
    } 
    else if (itemType === 'magnet') {
      this.activateMagnetEffect();
      AudioManager.playShard();
      this.showToastMessage("ATTRACTOR CELL ACTIVE", 0x22c55e);
    }
    else if (itemType === 'slow_anomaly') {
      this.activateSlowAnomaly();
    }
    else if (itemType === 'volatile_mine') {
      this.activateVolatileMine(sx, sy);
    }
    
    // Sync shards HUD counts
    EventBus.emit('hud_shards_update', {
      collected: this.shardsCollected,
      needed: this.shardsNeeded
    });

    // Award minor score points
    EventBus.emit('hud_score_update', this.score);

    // If collected enough, unlock the Goal Planet!
    if (this.shardsCollected >= this.shardsNeeded && !this.isGoalUnlocked) {
      this.unlockGoal();
    }
  }

  private unlockGoal(): void {
    this.isGoalUnlocked = true;
    
    // Draw goal unlocked sound sweep chime
    AudioManager.playLevelUp();
    
    if (this.goalPlanet) {
      this.goalPlanet.isGoalUnlocked = true;
      // Trigger golden vector animation inside Goal Planet
      this.tweens.add({
        targets: this.goalPlanet,
        scaleX: 1.2,
        scaleY: 1.2,
        duration: 300,
        yoyo: true
      });
    }
  }

  // --- SECTOR COMPILING (PROCEDURAL GENERATOR) ---

  private generateSector(sector: number): void {
    this.shardsCollected = 0;
    this.isGoalUnlocked = false;

    // Load the 20-sector progressive layout configuration
    const config = this.getLevelConfig(sector);
    this.shardsNeeded = Math.min(3 + sector, 10);
    
    // Start planet (cyan, stable)
    this.startPlanet = PlanetFactory.create(this, 100, 100, 50, 'standard', 'start');
    this.planets.push(this.startPlanet);

    // Create Goal planet progressively further away
    const angleToGoal = Math.random() * Math.PI * 2;
    const distanceToGoal = 700 + config.intermediatePlanets * 140;
    const goalX = 100 + Math.cos(angleToGoal) * distanceToGoal;
    const goalY = 100 + Math.sin(angleToGoal) * distanceToGoal;
    
    this.goalPlanet = PlanetFactory.create(this, goalX, goalY, 55, 'standard', 'goal');
    this.planets.push(this.goalPlanet);

    // Spawn intermediate planets using non-overlapping spacing rules
    const steps = config.intermediatePlanets;
    const wormholePairs: Planet[] = [];

    for (let i = 0; i < steps; i++) {
      const fraction = (i + 1) / (steps + 1);
      let px = 0, py = 0, r = 0;
      let placed = false;
      
      // Try up to 35 attempts to find a non-overlapping coordinate
      for (let attempt = 0; attempt < 35; attempt++) {
        r = 38 + Math.random() * 22;
        // Position along the path with variance
        px = 100 + (goalX - 100) * fraction + (Math.random() * 280 - 140);
        py = 100 + (goalY - 100) * fraction + (Math.random() * 280 - 140);

        // Check separation distance from existing planets
        let overlap = false;
        const minSep = GAME_CONFIG.PLANETS.MIN_SEPARATION || 140;
        for (const p of this.planets) {
          const dist = Phaser.Math.Distance.Between(px, py, p.x, p.y);
          if (dist < (r + p.radius + minSep)) {
            overlap = true;
            break;
          }
        }
        if (!overlap) {
          placed = true;
          break;
        }
      }

      // Fallback coordinate generation if layout was too tight
      if (!placed) {
        r = 35 + Math.random() * 15;
        px = 100 + (goalX - 100) * fraction + (Math.random() * 380 - 190);
        py = 100 + (goalY - 100) * fraction + (Math.random() * 380 - 190);
      }

      // Procedural type selection based on allowed types list
      const allowed = config.allowedTypes;
      const type = allowed[Math.floor(Math.random() * allowed.length)];

      const id = `planet_${i}`;
      const newPlanet = PlanetFactory.create(this, px, py, r, type, id);
      this.planets.push(newPlanet);

      if (type === 'wormhole') {
        wormholePairs.push(newPlanet);
      }

      // Debris Ring chance (only standard, unstable, shift_gates, and wormholes)
      if (Math.random() < config.debrisRingChance && type !== 'bouncy' && type !== 'pulsar') {
        const ring = new DebrisRing(this, px, py, r + 35, 3 + Math.min(sector, 5));
        this.debrisRings.push(ring);
      }
    }

    // Connect wormholes in pairs
    for (let j = 0; j < wormholePairs.length - 1; j += 2) {
      const w1 = wormholePairs[j];
      const w2 = wormholePairs[j+1];
      w1.partnerWormhole = w2;
      w2.partnerWormhole = w1;
    }

    // Place standard shards orbiting planets
    this.planets.forEach((planet) => {
      if (planet === this.goalPlanet) return;
      
      const shardRadius = planet.radius + 28;
      const shardAngle = Math.random() * Math.PI * 2;
      
      const px = planet.x + Math.cos(shardAngle) * shardRadius;
      const py = planet.y + Math.sin(shardAngle) * shardRadius;
      
      this.spawnProceduralItem(px, py, 'shard');
    });

    // Ensure we have exactly shardsNeeded shards, place extras in between
    const currentShardsCount = this.shardsGroup.getLength();
    if (currentShardsCount < this.shardsNeeded) {
      const neededExtras = this.shardsNeeded - currentShardsCount;
      for (let k = 0; k < neededExtras; k++) {
        const randPlanet = this.planets[Math.floor(Math.random() * this.planets.length)];
        const rx = randPlanet.x + (Math.random() * 200 - 100);
        const ry = randPlanet.y + (Math.random() * 200 - 100);
        this.spawnProceduralItem(rx, ry, 'shard');
      }
    }

    // Spawn trap items: Slow Anomalies (Sectors 4+)
    for (let s = 0; s < config.slowAnomalyCount; s++) {
      const randPlanet = this.planets[Math.floor(Math.random() * this.planets.length)];
      const angle = Math.random() * Math.PI * 2;
      const dist = randPlanet.radius + 60 + Math.random() * 50; // spawn in orbit periphery
      this.spawnProceduralItem(randPlanet.x + Math.cos(angle) * dist, randPlanet.y + Math.sin(angle) * dist, 'slow_anomaly');
    }

    // Spawn trap items: Volatile Mines (Sectors 6+)
    for (let m = 0; m < config.mineCount; m++) {
      const randPlanet = this.planets[Math.floor(Math.random() * this.planets.length)];
      const angle = Math.random() * Math.PI * 2;
      const dist = randPlanet.radius + 70 + Math.random() * 50;
      this.spawnProceduralItem(randPlanet.x + Math.cos(angle) * dist, randPlanet.y + Math.sin(angle) * dist, 'volatile_mine');
    }

    // Spawn Lasers connecting adjacent planets
    if (config.laserCount > 0) {
      for (let l = 0; l < config.laserCount; l++) {
        const pIndex = Math.min(l + 1, this.planets.length - 2);
        const pNext = pIndex + 1;
        if (pNext < this.planets.length) {
          const lGrid = new LaserGrid(
            this,
            this.planets[pIndex].x,
            this.planets[pIndex].y,
            this.planets[pNext].x,
            this.planets[pNext].y
          );
          this.laserGrids.push(lGrid);
        }
      }
    }

    // Spawn Roaming Black Holes
    if (config.blackHoleCount > 0) {
      for (let m = 0; m < config.blackHoleCount; m++) {
        const bx = 100 + (goalX - 100) * (0.3 + Math.random() * 0.4);
        const by = 100 + (goalY - 100) * (0.3 + Math.random() * 0.4) + (m * 80);
        const bh = new RoamingBlackHole(this, bx, by);
        this.blackHoles.push(bh);
      }
    }

    // Spawn Speed Boost Rings
    if (config.boostCount > 0) {
      for (let n = 0; n < config.boostCount; n++) {
        const rx = 100 + (goalX - 100) * (0.2 + Math.random() * 0.6);
        const ry = 100 + (goalY - 100) * (0.2 + Math.random() * 0.6) + (Math.random() * 60 - 30);
        const ring = new SpeedBoostRing(this, rx, ry);
        this.speedRings.push(ring);
      }
    }

    // Spawn Refractor Crystals
    if (config.crystalCount > 0) {
      for (let o = 0; o < config.crystalCount; o++) {
        const cx = 100 + (goalX - 100) * (0.25 + Math.random() * 0.5);
        const cy = 100 + (goalY - 100) * (0.25 + Math.random() * 0.5);
        const crystal = new RefractorCrystal(this, cx, cy);
        this.refractorCrystals.push(crystal);
      }
    }

    // Start Meteor spawning if scheduled
    if (config.meteorSpawnDelay > 0) {
      this.startMeteorSpawning(config.meteorSpawnDelay);
    }

    // Instantiates Player starting at Start Planet
    this.player = new Player(this, this.startPlanet.x, this.startPlanet.y - 70);
    this.player.changeState(new OrbitState(this.startPlanet));
  }



  // --- SECTOR FINISH / DEATH TRANSITIONS ---

  private handleSectorCleared(): void {
    this.isGameOver = true;
    AudioManager.playLevelUp();
    
    // Increment sector counts and shard updates
    const shardsEarned = 10 + this.currentSector * 2;
    GameProgress.addShards(shardsEarned);
    this.score += this.currentSector * 1000 + this.shardsCollected * 100;
    GameProgress.updateHighScore(this.score);
    GameProgress.updateHighestSector(this.currentSector + 1);

    this.tweens.add({
      targets: this.player,
      scaleX: 0,
      scaleY: 0,
      alpha: 0,
      duration: 500,
      onComplete: () => {
        if (this.currentSector >= 20) {
          // Trigger Campaign Win Overlay Screen!
          EventBus.emit('campaign_won', {
            score: this.score,
            shardsEarned: shardsEarned
          });
        } else {
          // Trigger Victory Overlay Screen
          EventBus.emit('sector_cleared', {
            sector: this.currentSector,
            score: this.score,
            shardsEarned: shardsEarned
          });
        }
      }
    });
  }

  private handlePlayerDeath(data: { reason: string }): void {
    if (this.isGameOver) return;
    
    // Shield Protection
    if (this.player.hasShield && data.reason !== 'deep_space') {
      this.player.deactivateShield();
      AudioManager.playWarning();
      this.showToastMessage("SHIELD BLOCKED DAMAGE", 0x00f0ff);
      
      this.player.alpha = 0.3;
      this.tweens.add({
        targets: this.player,
        alpha: 1.0,
        duration: 100,
        yoyo: true,
        repeat: 4
      });
      return;
    }

    this.isGameOver = true;
    
    AudioManager.playExplosion();
    
    // Disable inputs
    this.player.isFrozenInCrystal = true;
    if (this.player.body) {
      this.player.body.setVelocity(0, 0);
    }

    // Explosion particles
    const emitter = this.add.particles(this.player.x, this.player.y, 'trail_dot', {
      speed: { min: 60, max: 180 },
      scale: { start: 1, end: 0 },
      alpha: { start: 0.9, end: 0 },
      lifespan: 600,
      tint: 0x00f0ff,
      maxParticles: 35
    });

    this.tweens.add({
      targets: this.player,
      scaleX: 0,
      scaleY: 0,
      alpha: 0,
      duration: 300,
      onComplete: () => {
        emitter.destroy();
        EventBus.emit('game_over', {
          score: this.score,
          sectors: this.currentSector - 1,
          shardsEarned: Math.floor(this.shardsCollected / 2) // keep half shards if dead
        });
        GameProgress.addShards(Math.floor(this.shardsCollected / 2));
      }
    });
  }

  private spawnProceduralItem(x: number, y: number, forceType?: string): void {
    let texture = 'shard_dot';
    let tint = 0xd946ef;
    let type = forceType || 'shard';

    const chances = GAME_CONFIG.ITEMS.SPAWN_CHANCES;

    if (!forceType) {
      const rVal = Math.random();
      if (rVal < chances.SHIELD) {
        type = 'shield';
      } else if (rVal >= chances.SHIELD && rVal < (chances.SHIELD + chances.MAGNET)) {
        type = 'magnet';
      } else if (rVal >= (chances.SHIELD + chances.MAGNET) && rVal < (chances.SHIELD + chances.MAGNET + chances.GOLD_CORE)) {
        type = 'gold_core';
      } else {
        type = 'shard';
      }
    }

    if (type === 'shard') {
      texture = 'shard_dot';
      tint = 0xd946ef;
    } else if (type === 'gold_core') {
      texture = 'star_core';
      tint = 0xfbbf24;
    } else if (type === 'shield') {
      texture = 'shield_bubble';
      tint = 0x00f0ff;
    } else if (type === 'magnet') {
      texture = 'magnet_cell';
      tint = 0x22c55e;
    } else if (type === 'slow_anomaly') {
      texture = 'slow_anomaly';
      tint = 0xa855f7;
    } else if (type === 'volatile_mine') {
      texture = 'volatile_mine';
      tint = 0xef4444;
    }

    const item = this.add.sprite(x, y, texture);
    item.setTint(tint);
    (item as any).itemType = type;
    this.shardsGroup.add(item);
  }

  private showToastMessage(text: string, color: number): void {
    const toast = this.add.text(this.player.x, this.player.y - 40, text, {
      fontFamily: 'Orbitron',
      fontSize: '11px',
      color: '#' + color.toString(16).padStart(6, '0'),
      stroke: '#000000',
      strokeThickness: 2,
      fontStyle: 'bold'
    }).setOrigin(0.5);
    
    this.tweens.add({
      targets: toast,
      y: toast.y - 50,
      alpha: 0,
      duration: 1200,
      ease: 'Cubic.easeOut',
      onComplete: () => toast.destroy()
    });
  }

  private activateMagnetEffect(): void {
    this.player.isMagnetActive = true;
    
    const magnetRing = this.add.arc(0, 0, 30, 0, 360, false, 0x22c55e, 0);
    magnetRing.setStrokeStyle(1.5, 0x22c55e, 0.6);
    this.player.add(magnetRing);
    
    const repeatCount = Math.floor(GAME_CONFIG.PLAYER.MAGNET_DURATION / 800);
    this.tweens.add({
      targets: magnetRing,
      scaleX: 1.3,
      scaleY: 1.3,
      alpha: 0.1,
      duration: 800,
      repeat: repeatCount,
      onComplete: () => {
        magnetRing.destroy();
        this.player.isMagnetActive = false;
      }
    });
  }

  // --- 20-SECTOR PROGRESSIVE LEVEL CONFIGURATION SYSTEM ---

  private getLevelConfig(sector: number): LevelConfig {
    // scale intermediate planets from 2 to 14 (makes later levels longer and grander)
    const planetCount = 2 + Math.floor(sector / 1.5);
    
    // Allowed planet types by difficulty
    const types: PlanetType[] = ['standard'];
    if (sector >= 2) types.push('bouncy');
    if (sector >= 3) types.push('unstable');
    if (sector >= 4) types.push('wormhole');
    if (sector >= 5) types.push('shift_gate');
    if (sector >= 6) types.push('pulsar');

    // Sectors 1-3 have no hazards, obstacles, debris, or traps
    const isEarly = sector <= 3;

    const config: LevelConfig = {
      intermediatePlanets: planetCount,
      allowedTypes: types,
      laserCount: isEarly ? 0 : Math.min(Math.floor((sector - 2) / 2), 4),
      blackHoleCount: sector >= 6 ? Math.min(Math.floor((sector - 4) / 3), 2) : 0,
      boostCount: Math.max(1, Math.min(Math.floor(sector / 3), 3)),
      crystalCount: sector >= 5 ? Math.min(Math.floor((sector - 3) / 3), 2) : 0,
      debrisRingChance: isEarly ? 0 : Math.min(0.1 + (sector * 0.04), 0.45),
      meteorSpawnDelay: sector >= 8 ? Math.max(6200 - (sector * 250), 2400) : 0,
      slowAnomalyCount: sector >= 4 ? Math.min(1 + Math.floor((sector - 3) / 4), 3) : 0,
      mineCount: sector >= 6 ? Math.min(Math.floor((sector - 4) / 2), 3) : 0
    };

    return config;
  }

  // --- PARALLAX STARFIELD BACKGROUND ---

  private initStarfield(): void {
    this.stars = [];
    // Spawn 120 star particles at randomized coordinates
    for (let i = 0; i < 120; i++) {
      let speed = 0.05; // background layer
      let size = 1.0;
      let alpha = 0.2 + Math.random() * 0.3;
      
      if (i > 60 && i <= 95) {
        speed = 0.15; // midground layer
        size = 1.8;
        alpha = 0.5 + Math.random() * 0.3;
      } else if (i > 95) {
        speed = 0.32; // foreground layer
        size = 2.4;
        alpha = 0.7 + Math.random() * 0.3;
      }

      this.stars.push({
        x: Math.random() * 2400 - 1200,
        y: Math.random() * 2400 - 1200,
        speed: speed,
        size: size,
        alpha: alpha
      });
    }
  }

  private drawStarfield(): void {
    this.starfieldGraphics.clear();
    
    // Faint neon galactic core glow
    this.starfieldGraphics.fillStyle(0x3b0764, 0.02);
    this.starfieldGraphics.fillCircle(0, 0, 500);
    this.starfieldGraphics.fillStyle(0x0f172a, 0.03);
    this.starfieldGraphics.fillCircle(120, -120, 300);

    const camX = this.cameras.main.scrollX;
    const camY = this.cameras.main.scrollY;
    
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;
    const zoom = this.zoomVal;
    
    // Viewport boundaries
    const wrapW = width / zoom + 200;
    const wrapH = height / zoom + 200;
    const viewX = camX + width / 2;
    const viewY = camY + height / 2;

    this.stars.forEach(star => {
      // Parallax scroll position
      let sx = star.x - camX * star.speed;
      let sy = star.y - camY * star.speed;
      
      // Wrap coordinates dynamically to cover the viewport
      sx = Phaser.Math.Wrap(sx, viewX - wrapW / 2, viewX + wrapW / 2);
      sy = Phaser.Math.Wrap(sy, viewY - wrapH / 2, viewY + wrapH / 2);
      
      this.starfieldGraphics.fillStyle(0xffffff, star.alpha);
      this.starfieldGraphics.fillCircle(sx, sy, star.size);
    });
  }

  // --- TRAP OVERLAP CALLBACKS ---

  private activateSlowAnomaly(): void {
    if (this.player.isSlowed) {
      if (this.slowAnomalyTimer) this.slowAnomalyTimer.destroy();
    }
    
    this.player.isSlowed = true;
    AudioManager.playWarning(); // lower pitched alarm
    this.showToastMessage("GRAVITY WELL: SLOW SPEED", 0xa855f7);
    
    // Redraw spaceship immediately
    this.player.drawSpaceship();
    
    const duration = GAME_CONFIG.PLAYER.SLOW_ANOMALY_DURATION || 3500;
    this.slowAnomalyTimer = this.time.delayedCall(duration, () => {
      this.player.isSlowed = false;
      this.player.drawSpaceship();
      this.showToastMessage("GRAVITY WELL ESCAPED", 0x00f0ff);
      this.slowAnomalyTimer = null;
    });
  }

  private activateVolatileMine(x: number, y: number): void {
    AudioManager.playWarning();
    this.showToastMessage("MINE ARMED: ESCAPE FUSE!", 0xef4444);
    
    // Draw expanding red warning fuse circle at coordinate
    const fuseCircle = this.add.arc(x, y, 10, 0, 360, false, 0xef4444, 0.08);
    fuseCircle.setStrokeStyle(2.0, 0xef4444, 0.8);
    
    // Pulse animation
    this.tweens.add({
      targets: fuseCircle,
      scaleX: 3.2,
      scaleY: 3.2,
      alpha: 0.25,
      duration: 300,
      yoyo: true,
      repeat: 3
    });

    const fuseTime = GAME_CONFIG.PLAYER.VOLATILE_MINE_FUSE || 1200;
    
    this.time.delayedCall(fuseTime, () => {
      fuseCircle.destroy();
      
      // Explosion effect particles
      const explodeParticles = this.add.particles(x, y, 'trail_dot', {
        speed: { min: 80, max: 220 },
        scale: { start: 1.2, end: 0.01 },
        alpha: { start: 0.9, end: 0 },
        lifespan: 500,
        tint: 0xef4444,
        maxParticles: 35
      });
      this.time.delayedCall(600, () => explodeParticles.destroy());
      
      // Play heavy sound
      AudioManager.playExplosion();
      
      // Check distance from player to explosion center
      const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, x, y);
      const damageRadius = GAME_CONFIG.PLAYER.VOLATILE_MINE_RADIUS || 100;
      
      if (dist < damageRadius) {
        EventBus.emit('player_died', { reason: 'volatile_mine' });
      }
    });
  }

  // --- METEOR SPANNING SYSTEM ---

  private startMeteorSpawning(delay: number): void {
    this.meteors = [];
    this.meteorTimer = this.time.addEvent({
      delay: delay,
      callback: this.spawnMeteor,
      callbackScope: this,
      loop: true
    });
  }

  private spawnMeteor(): void {
    if (this.isGameOver) return;

    const cam = this.cameras.main;
    const bounds = cam.worldView;
    
    // Spawn slightly off-screen buffer
    const margin = 120;
    const minX = bounds.x - margin;
    const maxX = bounds.x + bounds.width + margin;
    const minY = bounds.y - margin;
    const maxY = bounds.y + bounds.height + margin;

    // Pick random spawn side (0 = Top, 1 = Bottom, 2 = Left, 3 = Right)
    const side = Phaser.Math.Between(0, 3);
    let sx = 0, sy = 0;
    
    if (side === 0) { // Top
      sx = Phaser.Math.Between(minX, maxX);
      sy = minY;
    } else if (side === 1) { // Bottom
      sx = Phaser.Math.Between(minX, maxX);
      sy = maxY;
    } else if (side === 2) { // Left
      sx = minX;
      sy = Phaser.Math.Between(minY, maxY);
    } else { // Right
      sx = maxX;
      sy = Phaser.Math.Between(minY, maxY);
    }

    // Aim meteor towards player's current location with minor error offset
    const tx = this.player.x + Phaser.Math.Between(-150, 150);
    const ty = this.player.y + Phaser.Math.Between(-150, 150);

    // Create the meteor
    const sector = this.currentSector;
    const speed = (GAME_CONFIG.HAZARDS.METEOR_SPEED || 220) + Math.min(sector * 4, 100);
    const meteor = new Meteor(this, sx, sy, tx, ty, speed);
    this.meteors.push(meteor);
  }

  // --- BUTTON API SYSTEM CALLBACKS ---

  private pauseGame(): void {
    this.physics.pause();
    this.scene.pause();
    AudioManager.stopMusic();
  }

  private resumeGame(): void {
    this.physics.resume();
    this.scene.resume();
    AudioManager.startMusic('ingame', this.currentSector);
  }

  private quitGame(): void {
    AudioManager.stopMusic();
    this.cleanUpEvents();
    this.scene.start('MenuScene');
  }

  private retryGame(): void {
    this.cleanUpEvents();
    this.scene.restart();
  }

  private cleanUpEvents(): void {
    EventBus.off('ui_pause_game', this.pauseGame, this);
    EventBus.off('ui_resume_game', this.resumeGame, this);
    EventBus.off('ui_quit_game', this.quitGame, this);
    EventBus.off('ui_retry_game', this.retryGame, this);
    EventBus.off('player_died', this.handlePlayerDeath, this);

    // Clean up custom timers and meteors
    if (this.meteorTimer) {
      this.meteorTimer.destroy();
      this.meteorTimer = null;
    }
    if (this.slowAnomalyTimer) {
      this.slowAnomalyTimer.destroy();
      this.slowAnomalyTimer = null;
    }
    this.meteors.forEach(m => m.destroy());
    this.meteors = [];
  }

  shutdown(): void {
    this.cleanUpEvents();
  }
}

// progression config interface
interface LevelConfig {
  intermediatePlanets: number;
  allowedTypes: PlanetType[];
  laserCount: number;
  blackHoleCount: number;
  boostCount: number;
  crystalCount: number;
  debrisRingChance: number;
  meteorSpawnDelay: number;
  slowAnomalyCount: number;
  mineCount: number;
}
export default PlayScene;
