import Phaser from 'phaser';
import { COLORS, CREATURES, CreatureKind } from '../config.ts';

// =====================================================================
// Creature.ts — deep-sea AI driven by `behavior` (see config). Kinematic,
// culled offscreen. `aiState` not `state`. Art switches on `shape` so new
// species are pure config additions.
// =====================================================================

export interface AICtx { subX: number; subY: number; lightOn: boolean; litByCone: boolean; ping: { x: number; y: number; t: number } | null; now: number; }

// How close the sub gets before a predator senses & chases it WITHOUT the
// flashlight (engine hum / pressure wake). Light & sonar extend detection
// much farther; this guarantees threat even when you run dark.
const NOTICE = 340;

export class Creature extends Phaser.GameObjects.Container {
  kind: CreatureKind;
  hp: number; radius: number; alive = true; culled = true; built = false;
  aiState: 'idle' | 'flee' | 'charge' | 'hunt' | 'dart' = 'idle';
  private bodyGfx!: Phaser.GameObjects.Graphics;
  private heading = Math.random() * Math.PI * 2;
  private wob = Math.random() * Math.PI * 2;
  private biteTimer = 0;
  private huntUntil = 0; private huntX = 0; private huntY = 0;
  private flashUntil = 0;

  constructor(scene: Phaser.Scene, x: number, y: number, kind: CreatureKind) {
    super(scene, x, y);
    this.kind = kind; const c = CREATURES[kind]; this.hp = c.hp; this.radius = c.radius;
    scene.add.existing(this); this.setDepth(40); this.setVisible(false);   // art built lazily on first reveal
  }

  private glow(g: Phaser.GameObjects.Graphics, x: number, y: number, rr: number, c: number): void {
    g.fillStyle(c, 0.3); g.fillCircle(x, y, rr * 2); g.fillStyle(c, 0.95); g.fillCircle(x, y, rr); g.fillStyle(COLORS.white, 0.8); g.fillCircle(x, y, rr * 0.4);
  }

  private buildArt(): void {
    const g = this.scene.add.graphics(); const def = CREATURES[this.kind]; const r = this.radius; const c = def.color;
    g.fillStyle(c, 0.12); g.fillCircle(0, 0, r * 1.6);
    switch (def.shape) {
      case 'jelly': {
        // bioluminescent alien bell + glowing nucleus + drifting light-tendrils
        g.fillStyle(c, 0.32); g.fillEllipse(0, -r * 0.2, r * 2.0, r * 1.5);
        g.fillStyle(c, 0.5); g.fillEllipse(0, -r * 0.25, r * 1.5, r * 1.15);
        g.lineStyle(2, c, 0.9); g.strokeEllipse(0, -r * 0.2, r * 2.0, r * 1.5);
        for (let i = -3; i <= 3; i++) { g.lineStyle(2, c, 0.55); g.beginPath(); g.moveTo(i * r * 0.22, r * 0.5); g.lineTo(i * r * 0.3, r * 1.5); g.strokePath(); this.glow(g, i * r * 0.3, r * 1.5, 1.6, c); }
        this.glow(g, 0, -r * 0.2, 3, COLORS.white);
        for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2; this.glow(g, Math.cos(a) * r * 0.7, -r * 0.2 + Math.sin(a) * r * 0.5, 1.4, c); }
        break;
      }
      case 'angler': {
        // alien predator — dark bulb, jagged maw, scattered eyes + bio-spots
        g.fillStyle(0x140812, 1); g.fillCircle(0, 0, r); g.lineStyle(2.5, c, 1); g.strokeCircle(0, 0, r);
        g.fillStyle(c, 0.85); for (let i = 0; i < 9; i++) { const a = -0.7 + i * 0.18; g.fillTriangle(Math.cos(a) * r, Math.sin(a) * r, Math.cos(a) * r * 1.45, Math.sin(a) * r * 1.15, Math.cos(a + 0.08) * r, Math.sin(a + 0.08) * r); }
        g.fillStyle(COLORS.white, 0.95); for (let i = -3; i <= 3; i++) g.fillTriangle(r * 0.45 + i * 5, r * 0.05, r * 0.45 + i * 5 - 2.5, r * 0.42, r * 0.45 + i * 5 + 2.5, r * 0.42);
        for (let i = -3; i <= 3; i++) g.fillTriangle(r * 0.45 + i * 5, r * 0.05, r * 0.45 + i * 5 - 2.5, -r * 0.32, r * 0.45 + i * 5 + 2.5, -r * 0.32);
        this.glow(g, r * 0.3, -r * 0.4, 3, COLORS.warn); this.glow(g, r * 0.15, r * 0.45, 2, COLORS.warn); this.glow(g, -r * 0.4, -r * 0.2, 2, c);
        g.lineStyle(2, 0x88607a, 1); g.lineBetween(r * 0.1, -r, r * 0.8, -r * 1.7); this.glow(g, r * 0.8, -r * 1.7, 3.5, COLORS.warn);
        break;
      }
      case 'eel': {
        // bioluminescent alien serpent — segmented with a glowing dorsal ridge
        for (let i = 0; i < 6; i++) { const x = -r * 0.5 - i * r * 0.55; const rr = r * (0.92 - i * 0.13); g.fillStyle(c, 0.82 - i * 0.12); g.fillCircle(x, Math.sin(i * 1.3) * 5, rr); g.lineStyle(1.5, COLORS.white, 0.25); g.strokeCircle(x, Math.sin(i * 1.3) * 5, rr); this.glow(g, x, Math.sin(i * 1.3) * 5 - rr * 0.7, 1.5, c); }
        g.fillStyle(c, 1); g.fillEllipse(r * 0.1, 0, r * 1.6, r * 1.2);
        g.lineStyle(3, c, 0.8); g.lineBetween(r * 0.5, -r * 0.5, r * 1.2, -r * 0.9); g.lineBetween(r * 0.5, r * 0.5, r * 1.2, r * 0.9);
        this.glow(g, r * 0.5, -r * 0.32, 2.6, COLORS.danger); this.glow(g, r * 0.5, r * 0.32, 2.6, COLORS.danger);
        g.fillStyle(COLORS.danger, 0.9); for (let i = -2; i <= 2; i++) g.fillTriangle(r * 0.7 + i * 4, 0, r * 0.7 + i * 4 - 2, r * 0.25, r * 0.7 + i * 4 + 2, r * 0.25);
        break;
      }
      case 'crab': {
        // armored alien leviathan — carapace with glowing seams, mandibles, spikes
        g.fillStyle(0x2a0e0e, 1); g.fillEllipse(0, 0, r * 2.2, r * 1.6); g.lineStyle(3.5, c, 1); g.strokeEllipse(0, 0, r * 2.2, r * 1.6);
        g.lineStyle(2, c, 0.5); for (let i = -1; i <= 1; i++) { g.beginPath(); g.arc(0, 0, r * 0.8, -0.5 + i, 0.5 + i); g.strokePath(); }
        // back spikes
        g.fillStyle(c, 0.9); for (let i = -2; i <= 2; i++) g.fillTriangle(i * r * 0.4, -r * 0.7, i * r * 0.4 - r * 0.12, -r * 1.15, i * r * 0.4 + r * 0.12, -r * 1.15);
        // mandibles
        g.fillStyle(c, 1); g.fillTriangle(r * 0.95, -r * 0.5, r * 1.8, -r * 0.8, r * 1.4, -r * 0.2); g.fillTriangle(r * 0.95, r * 0.5, r * 1.8, r * 0.8, r * 1.4, r * 0.2);
        // glowing eye cluster
        this.glow(g, r * 0.55, -r * 0.28, 3, COLORS.warn); this.glow(g, r * 0.55, r * 0.28, 3, COLORS.warn); this.glow(g, r * 0.75, 0, 2.4, COLORS.danger);
        for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; this.glow(g, Math.cos(a) * r * 0.9, Math.sin(a) * r * 0.6, 1.3, c); }
        break;
      }
      case 'squid': {
        // alien mantle with a ring of eyes + long glowing tentacles
        g.fillStyle(c, 0.85); g.fillEllipse(0, -r * 0.35, r * 1.5, r * 1.9); g.lineStyle(2, COLORS.white, 0.35); g.strokeEllipse(0, -r * 0.35, r * 1.5, r * 1.9);
        g.fillStyle(0x2a0a2a, 0.5); g.fillEllipse(0, -r * 0.7, r * 1.0, r * 0.9);
        for (let i = -4; i <= 4; i++) { g.lineStyle(3, c, 0.8); g.beginPath(); g.moveTo(i * r * 0.16, r * 0.5); g.lineTo(i * r * 0.3, r * 1.7); g.strokePath(); this.glow(g, i * r * 0.3, r * 1.7, 1.5, COLORS.white); }
        // eye ring
        for (let i = 0; i < 6; i++) { const a = Math.PI * 0.2 + (i / 6) * Math.PI * 1.6; this.glow(g, Math.cos(a) * r * 0.6, -r * 0.35 + Math.sin(a) * r * 0.7, 2.2, COLORS.white); }
        this.glow(g, 0, -r * 0.9, 3, c);
        break;
      }
    }
    this.bodyGfx = g; this.add(g);
  }

  /** Returns contact damage to apply this frame (0 if none). */
  update(dt: number, ctx: AICtx): number {
    if (!this.alive) return 0;
    if (this.biteTimer > 0) this.biteTimer -= dt * 1000;
    const def = CREATURES[this.kind]; const sp = def.speed;
    const dx = ctx.subX - this.x, dy = ctx.subY - this.y, dist = Math.hypot(dx, dy) || 1;
    this.wob += dt * 3;
    let vx = 0, vy = 0; const drift = () => { this.aiState = 'idle'; vx = Math.cos(this.wob) * sp * 0.35; vy = Math.sin(this.wob * 0.7) * sp * 0.35; };

    switch (def.behavior) {
      case 'fear':
        if (ctx.litByCone) { this.aiState = 'flee'; vx = -(dx / dist) * sp * 1.7; vy = -(dy / dist) * sp * 1.7; } else { drift(); vy -= 8; }
        break;
      case 'attract':
        // lured to the lamp from afar, AND charges the sub once it's noticed up close (even in the dark)
        if ((ctx.lightOn && dist < 760) || dist < NOTICE) { this.aiState = 'charge'; vx = (dx / dist) * sp; vy = (dy / dist) * sp; } else drift();
        break;
      case 'sound':
        if (ctx.ping && ctx.ping.t !== this.huntUntil) { this.huntUntil = ctx.ping.t; this.huntX = ctx.ping.x; this.huntY = ctx.ping.y; }
        if (ctx.now < this.huntUntil + 4200) { this.aiState = 'hunt'; const near = Math.hypot(this.huntX - this.x, this.huntY - this.y) < 80; const tx = near ? ctx.subX : this.huntX, ty = near ? ctx.subY : this.huntY; const a = Math.atan2(ty - this.y, tx - this.x); vx = Math.cos(a) * sp; vy = Math.sin(a) * sp; }
        else if (dist < NOTICE) { this.aiState = 'hunt'; vx = (dx / dist) * sp; vy = (dy / dist) * sp; }   // hears your engine up close
        else drift();
        break;
      case 'ambush':
        if (dist < 230) { this.aiState = 'dart'; vx = (dx / dist) * sp * 1.9; vy = (dy / dist) * sp * 1.9; } else { drift(); vx *= 0.5; vy *= 0.5; }
        break;
      case 'crusher':
        this.aiState = 'charge'; vx = (dx / dist) * sp; vy = (dy / dist) * sp;
        break;
    }

    this.x += vx * dt; this.y += vy * dt;
    if (vx || vy) this.heading = Phaser.Math.Angle.RotateTo(this.heading, Math.atan2(vy, vx), 0.12 * (dt * 60));
    this.rotation = this.heading;
    if (this.flashUntil && this.scene.time.now > this.flashUntil) { this.bodyGfx.setAlpha(1); this.flashUntil = 0; }

    if (this.aiState !== 'flee' && dist < this.radius + 24 && this.biteTimer <= 0) { this.biteTimer = 850; return def.dmg; }
    return 0;
  }

  takeDamage(n: number): boolean {
    if (!this.alive) return false;
    this.hp -= n; this.bodyGfx.setAlpha(0.4); this.flashUntil = this.scene.time.now + 70;
    if (this.hp <= 0) { this.alive = false; return true; }
    return false;
  }
  setCulled(off: boolean): void {
    if (this.culled === off) return; this.culled = off;
    this.setVisible(!off && this.built); this.setActive(!off);
  }
  ensureBuilt(): void { if (this.built) return; this.buildArt(); this.built = true; this.setVisible(!this.culled); }
}
export default Creature;
