import Phaser from 'phaser';
import { Planet } from '../Planet.ts';
import Player from '../Player.ts';
import { FlyState } from '../PlayerState.ts';
import AudioManager from '../../utils/AudioManager.ts';

export default class ShiftGatePlanet extends Planet {
  public shiftGateState: 'green' | 'orange' = 'green';
  private shiftGateTimer: Phaser.Time.TimerEvent | null = null;

  constructor(scene: Phaser.Scene, x: number, y: number, radius: number, id: string) {
    super(scene, x, y, radius, 'shift_gate', id);
    this.initShiftGate();
  }

  getSpeedMultiplier(): number {
    return this.shiftGateState === 'green' ? 2.0 : -0.8;
  }

  drawPlanet(): void {
    super.drawPlanet();
    if (this.isGoal) return;

    const now = this.scene.time.now;
    const activeColor = this.shiftGateState === 'green' ? 0x22c55e : 0xffa500;
    
    this.ringGraphics.lineStyle(3.5, activeColor, 1);
    this.ringGraphics.strokeCircle(0, 0, this.radius);
    
    this.ringGraphics.fillStyle(activeColor, 0.06);
    this.ringGraphics.fillCircle(0, 0, this.radius);
    
    this.ringGraphics.lineStyle(2, activeColor, 0.4);
    if (this.shiftGateState === 'green') {
      this.ringGraphics.strokeCircle(0, 0, this.radius - 12);
    } else {
      const spikes = 8;
      for (let i = 0; i < spikes; i++) {
        const angle = (i * Math.PI * 2) / spikes;
        const sx = Math.cos(angle) * (this.radius - 16);
        const sy = Math.sin(angle) * (this.radius - 16);
        const ex = Math.cos(angle) * (this.radius - 4);
        const ey = Math.sin(angle) * (this.radius - 4);
        this.ringGraphics.lineBetween(sx, sy, ex, ey);
      }
    }

    const postAngle = now / 500;
    this.ringGraphics.lineStyle(4.0, activeColor, 0.85);
    this.ringGraphics.beginPath();
    this.ringGraphics.arc(0, 0, this.radius + 6, postAngle, postAngle + 0.4, false);
    this.ringGraphics.strokePath();
    
    this.ringGraphics.beginPath();
    this.ringGraphics.arc(0, 0, this.radius + 6, postAngle + Math.PI, postAngle + Math.PI + 0.4, false);
    this.ringGraphics.strokePath();
  }

  onPlayerLand(player: Player): void {
    if (this.shiftGateState === 'orange') {
      this.ejectPlayer(player);
    }
  }

  private ejectPlayer(player: Player): void {
    const dx = player.x - this.x;
    const dy = player.y - this.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    
    if (len === 0) return;
    
    const nx = dx / len;
    const ny = dy / len;
    const pushSpeed = 550;
    
    AudioManager.playWarning();
    
    player.changeState(new FlyState(
      nx * pushSpeed,
      ny * pushSpeed
    ));
  }

  private initShiftGate(): void {
    this.shiftGateState = 'green';
    this.drawPlanet();
    
    const swapState = () => {
      this.shiftGateState = this.shiftGateState === 'green' ? 'orange' : 'green';
      this.drawPlanet();
      
      const activePlayer = (this.scene as any).player as Player | undefined;
      if (activePlayer && activePlayer.currentPlanet === this && this.shiftGateState === 'orange') {
        this.ejectPlayer(activePlayer);
      }
    };
    
    this.shiftGateTimer = this.scene.time.addEvent({
      delay: 2000,
      callback: swapState,
      callbackScope: this,
      loop: true
    });
  }

  destroy(fromScene?: boolean): void {
    if (this.shiftGateTimer) {
      this.shiftGateTimer.destroy();
    }
    super.destroy(fromScene);
  }
}
