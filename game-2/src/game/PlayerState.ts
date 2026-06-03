import Player from './Player.ts';
import Planet from './Planet.ts';
import AudioManager from '../utils/AudioManager.ts';
import { GAME_CONFIG } from './GameConfig.ts';

export interface PlayerState {
  name: string;
  enter(player: Player): void;
  update(player: Player, time: number, delta: number): void;
  handleInput(player: Player, action: string, data?: any): void;
}

export class OrbitState implements PlayerState {
  name = 'STATE_ORBITING';
  private targetPlanet: Planet;
  
  constructor(planet: Planet) {
    this.targetPlanet = planet;
  }

  enter(player: Player): void {
    player.setCurrentPlanet(this.targetPlanet);
    
    // Stop physics movement while orbiting
    if (player.body) {
      player.body.setVelocity(0, 0);
    }
    
    // Calculate initial angle from planet center to player
    const dx = player.x - this.targetPlanet.x;
    const dy = player.y - this.targetPlanet.y;
    player.orbitAngle = Math.atan2(dy, dx);
    
    // Reset dash charges upon landing
    player.resetDashes();

    // Reset crystal state
    player.isFrozenInCrystal = false;
    player.isSpeedBoosted = false;

    // Trigger planet landing hooks (like unstable planet start countdown)
    this.targetPlanet.onPlayerLand(player);
  }

  update(player: Player, _time: number, delta: number): void {
    if (!this.targetPlanet) return;

    // Smooth radius contraction/expansion
    const targetRadius = player.isHoldingContract 
      ? this.targetPlanet.radius * GAME_CONFIG.PLAYER.JUMP_SHRINK_RADIUS_FACTOR 
      : this.targetPlanet.radius + 20;
    
    // Lerp radius for visual smoothness
    player.orbitRadius += (targetRadius - player.orbitRadius) * 0.15;
    
    // Calculate orbit speed (smaller radius = faster angular speed)
    // base speed is modified by planet parameters (e.g. shift gate green = 200%)
    const baseOrbitSpeed = GAME_CONFIG.PLAYER.BASE_ORBIT_SPEED;
    const planetSpeedMultiplier = this.targetPlanet.getSpeedMultiplier();
    
    // Higher speed when contracted
    const contractionBonus = player.isHoldingContract ? GAME_CONFIG.PLAYER.CONTRACT_MULTIPLIER : 1.0;
    
    // Apply speed reduction if slowed by trap item
    const slowMultiplier = player.isSlowed ? (GAME_CONFIG.PLAYER.SLOW_ANOMALY_MULTIPLIER || 0.55) : 1.0;
    const speed = baseOrbitSpeed * planetSpeedMultiplier * contractionBonus * slowMultiplier;
    
    // Update angle
    const dtSeconds = delta / 1000;
    player.orbitAngle += player.orbitDirection * speed * dtSeconds;
    
    // Constrain angle to [0, 2*PI] to avoid overflow
    const twoPi = Math.PI * 2;
    player.orbitAngle = (player.orbitAngle % twoPi + twoPi) % twoPi;
    
    // Set position
    const targetX = this.targetPlanet.x + player.orbitRadius * Math.cos(player.orbitAngle);
    const targetY = this.targetPlanet.y + player.orbitRadius * Math.sin(player.orbitAngle);
    
    player.setPosition(targetX, targetY);

    // Rotate player spaceship to face tangentially to its orbit path
    const heading = player.orbitAngle + (player.orbitDirection * Math.PI / 2);
    player.setRotation(heading);
  }

  handleInput(player: Player, action: string, data?: any): void {
    if (action === 'HOLD_START') {
      player.isHoldingContract = true;
    } 
    else if (action === 'HOLD_END') {
      player.isHoldingContract = false;
    } 
    else if (action === 'DOUBLE_TAP') {
      // Reverse orbit direction
      player.orbitDirection *= -1;
      AudioManager.playJump(); // Quick low pitch sweep
    } 
    else if (action === 'TAP_JUMP') {
      // Release orbit, launch tangentially
      this.launch(player);
    }
  }

  private launch(player: Player): void {
    if (!this.targetPlanet) return;
    
    player.isHoldingContract = false;
    player.lastPlanet = this.targetPlanet; // Save the planet we are launching from
    
    // Tangent vector is perpendicular to radial vector (cos, sin)
    // Clockwise: (-sin, cos)
    // Counter-clockwise: (sin, -cos)
    const angle = player.orbitAngle;
    const dir = player.orbitDirection;
    
    const tangentX = -Math.sin(angle) * dir;
    const tangentY = Math.cos(angle) * dir;
    
    // Trigger launch sound
    AudioManager.playJump();
    
    // Leave planet landing hook (stop countdown)
    this.targetPlanet.onPlayerLeave(player);
    
    // Set fly velocity
    const slowMultiplier = player.isSlowed ? (GAME_CONFIG.PLAYER.SLOW_ANOMALY_MULTIPLIER || 0.55) : 1.0;
    const jumpSpeed = GAME_CONFIG.PLAYER.JUMP_SPEED * slowMultiplier;
    player.changeState(new FlyState(tangentX * jumpSpeed, tangentY * jumpSpeed));
  }
}

export class FlyState implements PlayerState {
  name = 'STATE_FLYING';
  private startVelX: number;
  private startVelY: number;
  
  constructor(vx: number, vy: number) {
    this.startVelX = vx;
    this.startVelY = vy;
  }

  enter(player: Player): void {
    player.setCurrentPlanet(null);
    if (player.body) {
      player.body.setVelocity(this.startVelX, this.startVelY);
    }
  }

  update(player: Player, _time: number, _delta: number): void {
    // Keep orientation facing velocity direction
    if (player.body && (player.body.velocity.x !== 0 || player.body.velocity.y !== 0)) {
      const angle = Math.atan2(player.body.velocity.y, player.body.velocity.x);
      player.setRotation(angle);
    }
  }

  handleInput(player: Player, action: string, data?: any): void {
    if (action === 'SWIPE_DASH' && data) {
      this.dash(player, data.dx, data.dy);
    }
  }

  private dash(player: Player, dx: number, dy: number): void {
    if (player.dashesRemaining <= 0 || player.isFrozenInCrystal) return;
    
    player.dashesRemaining--;
    AudioManager.playDash();
    
    // Normalize swipe direction
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len === 0) return;
    const dirX = dx / len;
    const dirY = dy / len;
    
    const dashSpeed = GAME_CONFIG.PLAYER.DASH_SPEED;
    
    // Perform short high velocity impulse
    if (player.body) {
      player.body.setVelocity(dirX * dashSpeed, dirY * dashSpeed);
      
      // After a short delay, restore normal flying speed or inherit direction
      player.scene.time.delayedCall(GAME_CONFIG.PLAYER.DASH_DURATION, () => {
        if (player.getCurrentStateName() === 'STATE_FLYING' && player.body) {
          const normSpeed = GAME_CONFIG.PLAYER.DASH_RESTORE_SPEED;
          const currentVel = player.body.velocity;
          const currentLen = Math.sqrt(currentVel.x * currentVel.x + currentVel.y * currentVel.y);
          if (currentLen > 0) {
            player.body.setVelocity(
              (currentVel.x / currentLen) * normSpeed,
              (currentVel.y / currentLen) * normSpeed
            );
          }
        }
      });
    }
    
    // Fire event to update HUD
    player.emitDashUpdate();
  }
}
export default OrbitState;
