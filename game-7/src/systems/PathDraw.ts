import Phaser from 'phaser';
import { COLORS, PATH, BOUNCE, WORLD } from '../config.ts';
import Enemy from '../entities/Enemy.ts';
import { WallDef } from '../data/Levels.ts';

// =====================================================================
// PathDraw.ts — records the finger path during slow-mo aiming and locks
// enemies whose centre lies within PATH.hitRadius of a drawn segment AND
// whose DASH segment (previous chain node → enemy) is not blocked by a wall.
//
// WALL-BOUNCE: drag the finger to a side border (x≈0 / x≈W) and the path
// STICKS there — the last segment reflects off the border and the dash
// shoots back toward the opposite side, hitting enemies on the reflected
// ray (the only way to backstab a shield whose open side faces a wall).
// Once stuck you can only slide up/down the border to re-aim; no more
// chain links are added. Pure-geometry, so solvability stays verifiable.
// =====================================================================

function segDist(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax, dy = by - ay;
  const l2 = dx * dx + dy * dy;
  let t = l2 ? ((px - ax) * dx + (py - ay) * dy) / l2 : 0;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

/** Does the dash segment p0→p1 cross any wall rectangle? */
export function segmentBlocked(p0x: number, p0y: number, p1x: number, p1y: number, walls: WallDef[]): boolean {
  const line = new Phaser.Geom.Line(p0x, p0y, p1x, p1y);
  for (const w of walls) {
    const rect = new Phaser.Geom.Rectangle(w.x - w.w / 2, w.y - w.h / 2, w.w, w.h);
    if (Phaser.Geom.Intersects.LineToRectangle(line, rect)) return true;
  }
  return false;
}

export class PathDraw {
  chain: Enemy[] = [];
  // Bounce state (null until the finger sticks to a border).
  // axis 'v' = left/right border (slide in Y, reflect X); 'h' = top border (slide in X, reflect Y).
  bounce: { x: number; y: number; axis: 'v' | 'h' } | null = null;
  bounceDir: { x: number; y: number } | null = null;
  bounceTargets: Enemy[] = [];

  private points: Array<{ x: number; y: number }> = [];
  private gfx: Phaser.GameObjects.Graphics;
  private startX = 0;
  private startY = 0;

  constructor(scene: Phaser.Scene) {
    this.gfx = scene.add.graphics().setDepth(50);
  }

  begin(startX: number, startY: number): void {
    this.clear();
    this.startX = startX; this.startY = startY;
    this.points.push({ x: startX, y: startY });
  }

  /** Last node the dash will jump FROM (start, or the last locked enemy). */
  private lastNode(): { x: number; y: number } {
    const e = this.chain[this.chain.length - 1];
    return e ? { x: e.x, y: e.y } : { x: this.startX, y: this.startY };
  }

  addPoint(x: number, y: number, enemies: Enemy[], walls: WallDef[], chainLimit: number): void {
    const last = this.points[this.points.length - 1];
    if (last && Math.hypot(x - last.x, y - last.y) < PATH.minPointDist) return;
    const prev = last ?? { x: this.startX, y: this.startY };
    this.points.push({ x, y });

    const onLeft = x <= BOUNCE.margin;
    const onRight = x >= WORLD.width - BOUNCE.margin;
    const onTop = y <= BOUNCE.margin;

    // Already stuck to a border → only slide ALONG it to re-aim the reflection.
    if (this.bounce) {
      if (this.bounce.axis === 'v' && (onLeft || onRight)) this.setBounce('v', this.bounce.x, y, enemies, walls, chainLimit);
      else if (this.bounce.axis === 'h' && onTop) this.setBounce('h', this.bounce.y, x, enemies, walls, chainLimit);
      return;
    }

    // Normal chain locking: finger brushes enemy AND the dash hop is wall-free.
    if (this.chain.length < chainLimit) {
      for (const e of enemies) {
        if (!e.alive || e.locked) continue;
        if (segDist(e.x, e.y, prev.x, prev.y, x, y) >= e.radius + PATH.hitRadius) continue;
        const from = this.lastNode();
        if (segmentBlocked(from.x, from.y, e.x, e.y, walls)) continue;
        e.lock();
        this.chain.push(e);
        if (this.chain.length >= chainLimit) break;
      }
    }

    // Finger reached a border → stick to the NEAREST one and reflect.
    if (onTop || onLeft || onRight) {
      const dTop = onTop ? y : Infinity;
      const dLeft = onLeft ? x : Infinity;
      const dRight = onRight ? WORLD.width - x : Infinity;
      if (dTop <= dLeft && dTop <= dRight) this.setBounce('h', 0, x, enemies, walls, chainLimit);
      else if (dLeft <= dRight) this.setBounce('v', 0, y, enemies, walls, chainLimit);
      else this.setBounce('v', WORLD.width, y, enemies, walls, chainLimit);
    }
  }

  /** Stick to a border (axis 'v' at x=fixed / 'h' at y=fixed), slide along it, lock reflected-ray targets. */
  private setBounce(axis: 'v' | 'h', fixed: number, slideRaw: number, enemies: Enemy[], walls: WallDef[], chainLimit: number): void {
    let bx: number, by: number;
    if (axis === 'v') { bx = fixed; by = Phaser.Math.Clamp(slideRaw, 24, WORLD.height - 80); }
    else { by = fixed; bx = Phaser.Math.Clamp(slideRaw, 24, WORLD.width - 24); }
    const from = this.lastNode();
    // The hop to the border must itself be wall-free, else no bounce here.
    if (segmentBlocked(from.x, from.y, bx, by, walls)) return;

    let dx = bx - from.x, dy = by - from.y;
    const l = Math.hypot(dx, dy) || 1; dx /= l; dy /= l;
    const rx = axis === 'v' ? -dx : dx;      // vertical border flips X, horizontal flips Y
    const ry = axis === 'v' ? dy : -dy;

    this.bounceTargets.forEach((e) => e.unlock());
    this.bounceTargets = [];
    this.bounce = { x: bx, y: by, axis };
    this.bounceDir = { x: rx, y: ry };

    const remaining = chainLimit - this.chain.length;
    if (remaining <= 0) return;

    // Enemies near the reflected ray, ordered by distance along it.
    const hits: Array<{ e: Enemy; t: number }> = [];
    for (const e of enemies) {
      if (!e.alive || e.locked) continue;
      const t = (e.x - bx) * rx + (e.y - by) * ry;          // projection onto unit ray
      if (t <= 0 || t > BOUNCE.rayLen) continue;
      const px = bx + rx * t, py = by + ry * t;
      if (Math.hypot(e.x - px, e.y - py) >= e.radius + PATH.hitRadius) continue;
      hits.push({ e, t });
    }
    hits.sort((a, b) => a.t - b.t);

    // Lock in order while each consecutive hop stays wall-free.
    let fx = bx, fy = by;
    for (const h of hits) {
      if (this.bounceTargets.length >= remaining) break;
      if (segmentBlocked(fx, fy, h.e.x, h.e.y, walls)) break;
      h.e.lock();
      this.bounceTargets.push(h.e);
      fx = h.e.x; fy = h.e.y;
    }
  }

  draw(): void {
    const g = this.gfx; g.clear();
    if (this.points.length > 1) {
      g.lineStyle(2, COLORS.cyan, 0.22);
      g.beginPath(); g.moveTo(this.points[0].x, this.points[0].y);
      for (let i = 1; i < this.points.length; i++) g.lineTo(this.points[i].x, this.points[i].y);
      g.strokePath();
    }
    if (this.chain.length) {
      const nodes = [{ x: this.startX, y: this.startY }, ...this.chain.map((e) => ({ x: e.x, y: e.y }))];
      g.lineStyle(6, COLORS.lime, 0.18); this.polyline(g, nodes);
      g.lineStyle(2.5, COLORS.lime, 0.95); this.polyline(g, nodes);
      g.lineStyle(1, COLORS.white, 0.9); this.polyline(g, nodes);
      nodes.forEach((n, i) => { g.fillStyle(i === 0 ? COLORS.cyan : COLORS.lime, 1); g.fillCircle(n.x, n.y, 3.5); });
    }
    if (this.bounce && this.bounceDir) {
      const from = this.lastNode();
      const b = this.bounce, d = this.bounceDir;
      // incoming hop to the border
      g.lineStyle(2.5, COLORS.cyan, 0.85); g.lineBetween(from.x, from.y, b.x, b.y);
      // border impact marker
      g.fillStyle(COLORS.amber, 1); g.fillCircle(b.x, b.y, 5);
      g.lineStyle(2, COLORS.amber, 0.6); g.strokeCircle(b.x, b.y, 9);
      // reflected ray (dashed) out to the last target / ray end
      const end = this.bounceTargets.length
        ? this.bounceTargets[this.bounceTargets.length - 1]
        : { x: b.x + d.x * 260, y: b.y + d.y * 260 };
      this.dashedLine(g, b.x, b.y, end.x, end.y, COLORS.amber);
      // reflected target markers
      let px = b.x, py = b.y;
      this.bounceTargets.forEach((e) => {
        g.lineStyle(2.5, COLORS.amber, 0.95); g.lineBetween(px, py, e.x, e.y);
        g.fillStyle(COLORS.amber, 1); g.fillCircle(e.x, e.y, 3.5);
        px = e.x; py = e.y;
      });
    }
  }

  private dashedLine(g: Phaser.GameObjects.Graphics, x1: number, y1: number, x2: number, y2: number, color: number): void {
    const len = Math.hypot(x2 - x1, y2 - y1); const seg = 10; const n = Math.floor(len / seg);
    const ux = (x2 - x1) / len, uy = (y2 - y1) / len;
    g.lineStyle(2, color, 0.5);
    for (let i = 0; i < n; i += 2) g.lineBetween(x1 + ux * i * seg, y1 + uy * i * seg, x1 + ux * (i + 1) * seg, y1 + uy * (i + 1) * seg);
  }

  private polyline(g: Phaser.GameObjects.Graphics, nodes: Array<{ x: number; y: number }>): void {
    g.beginPath(); g.moveTo(nodes[0].x, nodes[0].y);
    for (let i = 1; i < nodes.length; i++) g.lineTo(nodes[i].x, nodes[i].y);
    g.strokePath();
  }

  clear(): void {
    this.points = [];
    this.chain.forEach((e) => e.unlock());
    this.bounceTargets.forEach((e) => e.unlock());
    this.chain = []; this.bounceTargets = [];
    this.bounce = null; this.bounceDir = null;
    this.gfx.clear();
  }
  hide(): void { this.gfx.clear(); }
  destroy(): void { this.gfx.destroy(); }
}

export default PathDraw;
