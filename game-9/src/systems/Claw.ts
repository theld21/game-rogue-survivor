import Phaser from 'phaser';
import { COLORS, CLAW, RESOURCES, ResourceKind } from '../config.ts';
import { ResourceNode } from '../entities/Props.ts';

// =====================================================================
// Claw.ts — the grappling harvest arm. Fire to extend a claw from the
// muzzle; it grabs the first embedded node or drifting item it reaches and
// reels the material back into the cargo. Kinematic + leak-free.
// =====================================================================

export interface LooseLike { x: number; y: number; kind: ResourceKind; alive: boolean; culled: boolean; grab(): void; }
export interface ClawWorld {
  nodes: ResourceNode[]; loose: LooseLike[];
  addCargo(kind: ResourceKind): boolean;
  onFull(x: number, y: number, kind: ResourceKind): void;
}

type State = 'idle' | 'out' | 'reel';

export class Claw {
  private gfx: Phaser.GameObjects.Graphics;
  private state: State = 'idle';
  private t = 0; private angle = 0; private len = 0; private reelFrom = 0;
  private carrying: ResourceKind | null = null;
  private cd = 0;
  busy(): boolean { return this.state !== 'idle'; }

  constructor(private scene: Phaser.Scene) { this.gfx = scene.add.graphics().setDepth(48); }

  /** Try to fire. Returns true if it launched (caller deducts battery). */
  fire(angle: number): boolean {
    if (this.state !== 'idle' || this.cd > 0) return false;
    this.state = 'out'; this.t = 0; this.angle = angle; this.len = 0; this.carrying = null; this.cd = CLAW.cooldown;
    return true;
  }

  update(dt: number, mx: number, my: number, world: ClawWorld): void {
    if (this.cd > 0) this.cd -= dt * 1000;
    const dirx = Math.cos(this.angle), diry = Math.sin(this.angle);

    if (this.state === 'out') {
      this.t += (dt * 1000) / CLAW.extendMs; const f = Math.min(1, this.t); this.len = CLAW.range * f;
      const hx = mx + dirx * this.len, hy = my + diry * this.len;
      // try to grab a node
      let grabbed = false;
      for (const n of world.nodes) {
        if (n.culled || n.depleted) continue;
        if (Math.hypot(n.x - hx, n.y - hy) < 30) { if (n.harvest()) { this.carrying = n.kind; grabbed = true; } break; }
      }
      if (!grabbed) for (const it of world.loose) {
        if (!it.alive || it.culled) continue;
        if (Math.hypot(it.x - hx, it.y - hy) < 30) { it.grab(); this.carrying = it.kind; grabbed = true; break; }
      }
      if (grabbed || f >= 1) { this.state = 'reel'; this.reelFrom = this.len; this.t = 0; }
    } else if (this.state === 'reel') {
      this.t += (dt * 1000) / CLAW.reelMs; const f = Math.min(1, this.t); this.len = this.reelFrom * (1 - f);
      if (f >= 1) {
        if (this.carrying) { if (!world.addCargo(this.carrying)) world.onFull(mx, my, this.carrying); }
        this.state = 'idle'; this.carrying = null; this.len = 0;
      }
    }
    this.draw(mx, my);
  }

  private draw(mx: number, my: number): void {
    const g = this.gfx; g.clear();
    if (this.state === 'idle') return;
    const hx = mx + Math.cos(this.angle) * this.len, hy = my + Math.sin(this.angle) * this.len;
    g.lineStyle(2, COLORS.hull, 0.85); g.lineBetween(mx, my, hx, hy);
    // claw head (two prongs)
    const pa = this.angle + Math.PI / 2;
    g.lineStyle(3, COLORS.hullDark, 1);
    g.lineBetween(hx, hy, hx + Math.cos(this.angle) * 8 + Math.cos(pa) * 6, hy + Math.sin(this.angle) * 8 + Math.sin(pa) * 6);
    g.lineBetween(hx, hy, hx + Math.cos(this.angle) * 8 - Math.cos(pa) * 6, hy + Math.sin(this.angle) * 8 - Math.sin(pa) * 6);
    g.fillStyle(COLORS.cockpit, 1); g.fillCircle(hx, hy, 4);
    if (this.carrying) { g.fillStyle(RESOURCES[this.carrying].color, 1); g.fillCircle(hx, hy, 6); }
  }

  destroy(): void { this.gfx.destroy(); }
}
export default Claw;
