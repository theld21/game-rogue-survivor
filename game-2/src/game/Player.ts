import Phaser from 'phaser';
import { PlayerState, OrbitState } from './PlayerState.ts';
import Planet from './Planet.ts';
import EventBus from '../EventBus.ts';
import GameProgress from '../utils/GameProgress.ts';

export class Player extends Phaser.GameObjects.Container {
  declare body: Phaser.Physics.Arcade.Body;
  
  // State Machine
  private currentState!: PlayerState;
  
  // Orbit Math variables
  orbitAngle: number = 0;
  orbitRadius: number = 0;
  orbitDirection: number = 1; // 1 = CW, -1 = CCW
  isHoldingContract: boolean = false;
  
  // Upgraded parameters
  maxDashes: number = 1;
  dashesRemaining: number = 1;
  
  // Environmental stats
  currentPlanet: Planet | null = null;
  lastPlanet: Planet | null = null; // Track last ejected planet to prevent immediate recapture
  isFrozenInCrystal: boolean = false;
  isSpeedBoosted: boolean = false;
  isSlowed: boolean = false; // Negative slow anomaly trap state
  hasShield: boolean = false;
  isMagnetActive: boolean = false;
  
  // Visual nodes
  private shipGraphics: Phaser.GameObjects.Graphics;
  private shieldBubble: Phaser.GameObjects.Arc | null = null;
  private trailEmitter: Phaser.GameObjects.Particles.ParticleEmitter | null = null;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y);
    
    // Read upgrades
    this.maxDashes = GameProgress.getMaxDashes();
    this.dashesRemaining = this.maxDashes;

    // Create the visual spaceship representation using procedural graphics
    this.shipGraphics = scene.add.graphics();
    this.add(this.shipGraphics);
    this.drawSpaceship();
    
    // Add player container to scene
    scene.add.existing(this);
    scene.physics.add.existing(this);
    
    // Configure physics properties
    this.body.setCircle(12, -12, -12); // match physics bounds to container center
    this.body.setCollideWorldBounds(false); // levels are larger, we handle outer boundary ourselves
    
    // Initialize particle trail
    this.initTrailEmitter();
  }

  changeState(newState: PlayerState): void {
    this.currentState = newState;
    this.currentState.enter(this);
    EventBus.emit('player_state_change', this.currentState.name);
  }

  getCurrentStateName(): string {
    return this.currentState ? this.currentState.name : '';
  }

  setCurrentPlanet(planet: Planet | null): void {
    this.currentPlanet = planet;
  }

  update(time: number, delta: number): void {
    if (this.currentState) {
      this.currentState.update(this, time, delta);
    }
    
    // Update visual trailing effect position
    if (this.trailEmitter) {
      this.trailEmitter.setPosition(this.x, this.y);
    }

    // Redraw spaceship to animate thruster fire flicker
    this.drawSpaceship();
  }

  handleInput(action: string, data?: any): void {
    if (this.currentState) {
      this.currentState.handleInput(this, action, data);
    }
  }

  resetDashes(): void {
    this.maxDashes = GameProgress.getMaxDashes();
    this.dashesRemaining = this.maxDashes;
    this.emitDashUpdate();
  }

  emitDashUpdate(): void {
    EventBus.emit('dash_update', {
      remaining: this.dashesRemaining,
      max: this.maxDashes
    });
  }

  setSpeedBoostActive(active: boolean): void {
    this.drawSpaceship();
  }

  // Draw procedural vector spaceship pointing right
  drawSpaceship(): void {
    this.shipGraphics.clear();
    
    // Determine neon colors
    let shipColor = 0x00f0ff; // Cyan
    if (this.isSpeedBoosted) {
      shipColor = 0x22c55e; // Green
    } else if (this.isSlowed) {
      shipColor = 0xa855f7; // Purple
    }

    // 1. Draw outer neon glow (larger, semi-transparent)
    this.shipGraphics.fillStyle(shipColor, 0.25);
    this.shipGraphics.beginPath();
    this.shipGraphics.moveTo(15, 0);
    this.shipGraphics.lineTo(-10, -10);
    this.shipGraphics.lineTo(-5, 0);
    this.shipGraphics.lineTo(-10, 10);
    this.shipGraphics.closePath();
    this.shipGraphics.fillPath();

    // 2. Draw solid wing/hull
    this.shipGraphics.fillStyle(shipColor, 1);
    this.shipGraphics.lineStyle(1.8, 0xffffff, 0.9);
    this.shipGraphics.beginPath();
    this.shipGraphics.moveTo(11, 0);       // Nose cone
    this.shipGraphics.lineTo(-7, -7);      // Left wing tip
    this.shipGraphics.lineTo(-4, 0);       // Center back engine
    this.shipGraphics.lineTo(-7, 7);       // Right wing tip
    this.shipGraphics.closePath();
    this.shipGraphics.fillPath();
    this.shipGraphics.strokePath();

    // 3. Draw cockpit highlight (gold window)
    this.shipGraphics.fillStyle(0xfbbf24, 0.95);
    this.shipGraphics.beginPath();
    this.shipGraphics.moveTo(4, 0);
    this.shipGraphics.lineTo(-2, -2.5);
    this.shipGraphics.lineTo(-2, 2.5);
    this.shipGraphics.closePath();
    this.shipGraphics.fillPath();

    // 4. Thruster fire animation (flickering orange flame behind engine)
    const isFlying = this.getCurrentStateName() === 'STATE_FLYING';
    const flameLen = isFlying ? (10 + Math.random() * 8) : (4 + Math.random() * 4);

    this.shipGraphics.fillStyle(0xff7f00, 0.7 + Math.random() * 0.3);
    this.shipGraphics.beginPath();
    this.shipGraphics.moveTo(-4, -2.5);
    this.shipGraphics.lineTo(-4 - flameLen, 0);
    this.shipGraphics.lineTo(-4, 2.5);
    this.shipGraphics.closePath();
    this.shipGraphics.fillPath();

    // Inner bright white thruster core
    this.shipGraphics.fillStyle(0xffffff, 0.95);
    this.shipGraphics.beginPath();
    this.shipGraphics.moveTo(-4, -1.2);
    this.shipGraphics.lineTo(-4 - (flameLen * 0.5), 0);
    this.shipGraphics.lineTo(-4, 1.2);
    this.shipGraphics.closePath();
    this.shipGraphics.fillPath();
  }

  // --- PROCEDURAL TRAIL GRAPHICS EMITTER ---

  private initTrailEmitter(): void {
    const activeTrail = GameProgress.getActiveTrail();
    let tint = 0x00f0ff;
    let blendMode = Phaser.BlendModes.ADD;
    let lifespan = 400;
    let scaleSpeed = -0.002;
    let trailFreq = 12; // lower frequency = thicker trail

    // Modify appearance based on selected neon cosmetic theme
    switch (activeTrail) {
      case 'rainbow':
        // Handle rainbow tint dynamically via emitter updater
        tint = 0xffffff;
        lifespan = 600;
        break;
      case 'flame':
        tint = 0xff007f; // Neon Pink / Orange
        lifespan = 500;
        scaleSpeed = -0.003;
        break;
      case 'spectral':
        tint = 0xd946ef; // Ghostly violet
        lifespan = 800;
        blendMode = Phaser.BlendModes.SCREEN;
        scaleSpeed = -0.001;
        break;
      default: // default simple cyan
        tint = 0x00f0ff;
        lifespan = 350;
        break;
    }

    // Create emitter using procedurally generated 'trail_dot' texture from preloader
    this.trailEmitter = this.scene.add.particles(0, 0, 'trail_dot', {
      speed: 0,
      scale: { start: 0.8, end: 0.1 },
      alpha: { start: 0.8, end: 0 },
      blendMode: blendMode,
      lifespan: lifespan,
      frequency: trailFreq,
      tint: tint
    });
    
    // Put trail behind player visually
    this.scene.children.sendToBack(this.trailEmitter);

    if (activeTrail === 'rainbow') {
      let hue = 0;
      this.scene.events.on('update', () => {
        hue = (hue + 2) % 360;
        const color = Phaser.Display.Color.HSLToColor(hue / 360, 1, 0.6);
        if (this.trailEmitter) {
          this.trailEmitter.setParticleTint(color.color);
        }
      });
    } else if (activeTrail === 'flame') {
      // randomly shift tint between neonpink and gold
      this.scene.events.on('update', () => {
        if (this.trailEmitter && Math.random() > 0.5) {
          const colorKey = Math.random() > 0.5 ? 0xff007f : 0xfbbf24;
          this.trailEmitter.setParticleTint(colorKey);
        }
      });
    }
  }

  activateShield(): void {
    if (this.hasShield) return;
    this.hasShield = true;
    this.shieldBubble = this.scene.add.arc(0, 0, 22, 0, 360, false, 0x00f0ff, 0);
    this.shieldBubble.setStrokeStyle(2, 0x00f0ff, 0.85);
    this.add(this.shieldBubble);
    this.scene.tweens.add({
      targets: this.shieldBubble,
      scaleX: 1.15,
      scaleY: 1.15,
      duration: 1000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
  }

  deactivateShield(): void {
    if (!this.hasShield) return;
    this.hasShield = false;
    if (this.shieldBubble) {
      const bubble = this.shieldBubble;
      this.scene.tweens.add({
        targets: bubble,
        scaleX: 1.8,
        scaleY: 1.8,
        alpha: 0,
        duration: 250,
        onComplete: () => bubble.destroy()
      });
      this.shieldBubble = null;
    }
  }

  destroy(fromScene?: boolean): void {
    if (this.trailEmitter) {
      this.trailEmitter.destroy();
    }
    super.destroy(fromScene);
  }
}
export default Player;
