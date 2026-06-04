import Phaser from 'phaser';
import { gsap } from 'gsap';
import { COLORS } from '../config.ts';
import { IslandData } from '../data/World.ts';

// =====================================================================
// Puzzle.ts — ruin-isle environmental puzzle: shove the floating energy
// blocks (with your cannon) onto the circuit sockets. Seat them all and
// the ancient vault cracks open. Blocks have drag; bullets impart shove.
// =====================================================================

interface Block { x: number; y: number; vx: number; vy: number; gfx: Phaser.GameObjects.Graphics; seated: boolean; }
interface Socket { x: number; y: number; gfx: Phaser.GameObjects.Graphics; }

export class Puzzle {
  solved = false;
  culled = false;
  private blocks: Block[] = [];
  private sockets: Socket[] = [];
  private chest!: Phaser.GameObjects.Container;
  private wires!: Phaser.GameObjects.Graphics;
  private cx: number; private cy: number; private R: number;

  constructor(private scene: Phaser.Scene, island: IslandData, private onSolve: (x: number, y: number) => void) {
    this.cx = island.x; this.cy = island.y; this.R = island.radius;
    const ring = this.R * 1.28;

    this.wires = scene.add.graphics().setDepth(18);

    // two sockets + two blocks (opposite the sockets)
    const N = 2;
    for (let i = 0; i < N; i++) {
      const sa = (i / N) * Math.PI * 2 - Math.PI / 2;
      const sx = this.cx + Math.cos(sa) * this.R * 1.05, sy = this.cy + Math.sin(sa) * this.R * 1.05;
      const sg = scene.add.graphics().setDepth(19); this.drawSocket(sg, false); sg.setPosition(sx, sy);
      this.sockets.push({ x: sx, y: sy, gfx: sg });

      const ba = sa + Math.PI + (i - 0.5) * 0.5;
      const bx = this.cx + Math.cos(ba) * ring, by = this.cy + Math.sin(ba) * ring;
      const bg = scene.add.graphics().setDepth(24); this.drawBlock(bg);
      const blk: Block = { x: bx, y: by, vx: 0, vy: 0, gfx: bg, seated: false };
      bg.setPosition(bx, by);
      this.blocks.push(blk);
    }

    // vault chest (closed) at island centre rim
    this.chest = scene.add.container(this.cx, this.cy - this.R * 0.0).setDepth(23);
    const cg = scene.add.graphics();
    cg.fillStyle(0x4a3a1f, 1); cg.fillRoundedRect(-16, -12, 32, 24, 4);
    cg.lineStyle(2, COLORS.gold, 0.9); cg.strokeRoundedRect(-16, -12, 32, 24, 4);
    cg.fillStyle(COLORS.gold, 0.8); cg.fillCircle(0, 0, 4);
    this.chest.add(cg);
  }

  private drawSocket(g: Phaser.GameObjects.Graphics, on: boolean): void {
    g.clear();
    g.lineStyle(2.5, on ? COLORS.aetherHot : COLORS.ruin, on ? 1 : 0.7);
    g.strokeCircle(0, 0, 16);
    g.fillStyle(on ? COLORS.aetherHot : COLORS.ruin, on ? 0.45 : 0.12); g.fillCircle(0, 0, 12);
    for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + Math.PI / 4; g.lineBetween(Math.cos(a) * 16, Math.sin(a) * 16, Math.cos(a) * 22, Math.sin(a) * 22); }
  }
  private drawBlock(g: Phaser.GameObjects.Graphics): void {
    g.clear();
    g.fillStyle(0x244a6e, 1); g.fillRoundedRect(-14, -14, 28, 28, 5);
    g.lineStyle(2.5, COLORS.aether, 1); g.strokeRoundedRect(-14, -14, 28, 28, 5);
    g.fillStyle(COLORS.aetherHot, 0.9); g.fillCircle(0, 0, 5);
  }

  /** A bullet at (bx,by) travelling along angle tries to shove a block. Returns true if it hit one. */
  tryPush(bx: number, by: number, angle: number): boolean {
    if (this.solved) return false;
    for (const blk of this.blocks) {
      if (Math.hypot(blk.x - bx, blk.y - by) < 24) {
        blk.vx += Math.cos(angle) * 150; blk.vy += Math.sin(angle) * 150;
        return true;
      }
    }
    return false;
  }

  update(dt: number): void {
    if (this.solved) return;
    let seatedCount = 0;
    for (const blk of this.blocks) {
      blk.x += blk.vx * dt; blk.y += blk.vy * dt; blk.vx *= 0.9; blk.vy *= 0.9;
      // keep within play ring around the island
      const d = Math.hypot(blk.x - this.cx, blk.y - this.cy);
      const maxR = this.R * 1.5, minR = this.R * 0.95;
      if (d > maxR) { const a = Math.atan2(blk.y - this.cy, blk.x - this.cx); blk.x = this.cx + Math.cos(a) * maxR; blk.y = this.cy + Math.sin(a) * maxR; blk.vx *= -0.3; blk.vy *= -0.3; }
      if (d < minR) { const a = Math.atan2(blk.y - this.cy, blk.x - this.cx); blk.x = this.cx + Math.cos(a) * minR; blk.y = this.cy + Math.sin(a) * minR; }
      // snap onto a socket
      let seated = false;
      for (const s of this.sockets) { if (Math.hypot(blk.x - s.x, blk.y - s.y) < 22) { seated = true; } }
      if (seated && !blk.seated) { blk.seated = true; } else if (!seated) blk.seated = false;
      blk.gfx.setPosition(blk.x, blk.y);
      if (blk.seated) seatedCount++;
    }
    // light sockets that hold a block + redraw wires
    this.wires.clear();
    this.sockets.forEach((s) => {
      const held = this.blocks.some((b) => Math.hypot(b.x - s.x, b.y - s.y) < 22);
      this.drawSocket(s.gfx, held);
      if (held) { this.wires.lineStyle(3, COLORS.aetherHot, 0.6); this.wires.lineBetween(s.x, s.y, this.cx, this.cy); }
    });

    if (seatedCount >= this.sockets.length) this.solve();
  }

  private solve(): void {
    if (this.solved) return; this.solved = true;
    // open chest with a pop + glow burst
    gsap.to(this.chest, { scaleX: 1.4, scaleY: 1.4, duration: 0.2, yoyo: true, repeat: 1 });
    const g = this.scene.add.graphics({ x: this.cx, y: this.cy }).setDepth(60);
    g.lineStyle(4, COLORS.gold, 0.9); g.strokeCircle(0, 0, 20);
    this.scene.tweens.add({ targets: g, scaleX: 4, scaleY: 4, alpha: 0, duration: 500, onComplete: () => g.destroy() });
    this.onSolve(this.cx, this.cy);
  }

  setCulled(off: boolean): void {
    if (this.culled === off) return; this.culled = off;
    this.blocks.forEach((b) => b.gfx.setVisible(!off));
    this.sockets.forEach((s) => s.gfx.setVisible(!off));
    this.wires.setVisible(!off); this.chest.setVisible(!off);
  }

  destroy(): void {
    this.blocks.forEach((b) => b.gfx.destroy()); this.sockets.forEach((s) => s.gfx.destroy());
    this.wires.destroy(); this.chest.destroy();
  }
}
export default Puzzle;
