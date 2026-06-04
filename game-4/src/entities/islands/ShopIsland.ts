import Phaser from 'phaser';
import Island from './Island.ts';
import { COLORS, ISLAND } from '../../core/GameConfig.ts';

// =====================================================================
// ShopIsland.ts — Pirate harbour with a detailed multi-storey building.
// =====================================================================

export class ShopIsland extends Island {
  dockRadius = ISLAND.shopDockRadius;
  private beacon!: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 150);
    this.drawDockRing(this.dockRadius, COLORS.gold);
    this.drawHarbour();
  }

  protected drawLand(g: Phaser.GameObjects.Graphics, r: number): void {
    super.drawLand(g, r, COLORS.gold);
  }

  private drawHarbour(): void {
    const g = this.scene.add.graphics();

    // ── DOCK ─────────────────────────────────────────────────────
    const dockTop = this.radius * 0.38;
    const dockBot = this.radius * 0.92;
    const hw = 28; // half-width

    // Wooden piles
    [-22, -8, 8, 22].forEach((px) => {
      g.fillStyle(0x3d2509, 1);
      g.fillRect(px - 3, dockTop + 4, 6, dockBot - dockTop);
      // Rope wrap at top of pile
      g.lineStyle(1.5, 0x8b6014, 0.9);
      for (let k = 0; k < 3; k++) g.strokeRect(px - 3, dockTop + 5 + k * 3, 6, 2);
    });
    // Deck boards
    g.fillStyle(0x7a5628, 1);
    g.fillRect(-hw, dockTop, hw * 2, 22);
    // Board grooves
    g.lineStyle(1, 0x5a3c18, 0.7);
    for (let i = 1; i < 5; i++) g.lineBetween(-hw, dockTop + i * 4.5, hw, dockTop + i * 4.5);
    // Dock edge
    g.lineStyle(2, 0xa07838, 0.9);
    g.strokeRect(-hw, dockTop, hw * 2, 22);
    // Mooring bollards
    [-18, 18].forEach((bx) => {
      g.fillStyle(0xa07838, 1);
      g.fillRect(bx - 3, dockTop - 5, 6, 7);
      g.fillStyle(0xc09848, 1);
      g.fillRect(bx - 4, dockTop - 7, 8, 3);
    });
    // Mooring rope (piecewise approximation)
    g.lineStyle(1.5, 0x9a8050, 0.6);
    const ropePoints = [[-18, dockTop - 4], [-12, dockTop + 5], [-5, dockTop + 9], [5, dockTop + 9], [12, dockTop + 5], [18, dockTop - 4]];
    for (let ri = 0; ri < ropePoints.length - 1; ri++) {
      g.lineBetween(ropePoints[ri][0], ropePoints[ri][1], ropePoints[ri + 1][0], ropePoints[ri + 1][1]);
    }

    // Barrel on dock
    g.fillStyle(0x5c3a18, 1);
    g.fillEllipse(-hw + 8, dockTop + 6, 12, 9);
    g.fillRect(-hw + 2, dockTop + 2, 12, 12);
    g.lineStyle(1, 0x9a6428, 0.9);
    g.strokeEllipse(-hw + 8, dockTop + 6, 12, 9);
    [4, 8].forEach((ry) => g.lineBetween(-hw + 2, dockTop + ry, -hw + 14, dockTop + ry));

    // ── GROUND FLOOR — stone masonry ─────────────────────────────
    const gfL = -50, gfR = 50, gfT = -26, gfB = dockTop;

    // Stone base fill
    g.fillStyle(0x252038, 1);
    g.fillRect(gfL, gfT, gfR - gfL, gfB - gfT);

    // Brick course lines (horizontal)
    g.lineStyle(1, 0x191428, 0.85);
    for (let row = gfT + 9; row < gfB; row += 9) g.lineBetween(gfL, row, gfR, row);
    // Brick joint verticals (alternating every other row)
    for (let row = gfT; row < gfB; row += 9) {
      const off = (Math.floor((row - gfT) / 9) % 2 === 0) ? 14 : 0;
      for (let vx = gfL + off; vx < gfR; vx += 28) g.lineBetween(vx, row, vx, row + 9);
    }
    // Quoin stones at corners (lighter raised blocks)
    g.fillStyle(0x302848, 1);
    [[gfL, gfT], [gfR - 9, gfT], [gfL, gfB - 9], [gfR - 9, gfB - 9]].forEach(([qx, qy]) => {
      g.fillRect(qx, qy, 9, 9);
      g.lineStyle(1, COLORS.gold, 0.3);
      g.strokeRect(qx, qy, 9, 9);
    });
    // Wall border
    g.lineStyle(2, COLORS.gold, 0.7);
    g.strokeRect(gfL, gfT, gfR - gfL, gfB - gfT);

    // Arched entrance door
    const doorH = gfB - gfT;
    const archH = Math.round(doorH * 0.65);
    g.fillStyle(0x08060f, 1);
    g.fillRect(-14, gfT + doorH - archH, 28, archH);
    g.fillEllipse(0, gfT + doorH - archH, 28, 22);
    g.lineStyle(2.5, COLORS.gold, 0.85);
    g.strokeRect(-14, gfT + doorH - archH, 28, archH);
    g.strokeEllipse(0, gfT + doorH - archH, 28, 22);
    // Keystone
    g.fillStyle(COLORS.gold, 0.75);
    g.fillTriangle(-4, gfT + doorH - archH - 4, 4, gfT + doorH - archH - 4, 0, gfT + doorH - archH + 4);
    // Door step
    g.fillStyle(0x3a2e58, 1);
    g.fillRect(-18, gfB - 5, 36, 5);

    // Ground floor windows (arrow slits / shuttered)
    [[-32, gfT + 8], [32, gfT + 8]].forEach(([wx, wy]) => {
      // Warm interior glow
      g.fillStyle(0xfbbf24, 0.15);
      g.fillRect((wx as number) - 12, (wy as number) - 3, 24, 19);
      // Window glass
      g.fillStyle(0xfbbf24, 0.72);
      g.fillRect((wx as number) - 11, wy as number, 22, 15);
      // Closed shutter halves
      g.fillStyle(0x4a300e, 1);
      g.fillRect((wx as number) - 11, wy as number, 10, 15);
      g.fillRect((wx as number) + 2, wy as number, 9, 15);
      // Warm crack between shutters
      g.fillStyle(0xfbbf24, 0.9);
      g.fillRect((wx as number) - 0.5, wy as number, 1.5, 15);
      // Window frame
      g.lineStyle(1.5, COLORS.gold, 0.85);
      g.strokeRect((wx as number) - 11, wy as number, 22, 15);
    });

    // ── UPPER FLOOR — timber-framed ───────────────────────────────
    const ufL = -42, ufR = 42, ufT = -66, ufB = gfT;

    // Overhang beam / jetty
    g.fillStyle(0x4a2c0a, 1);
    g.fillRect(ufL - 5, ufB, ufR - ufL + 10, 6);
    g.lineStyle(1, 0x7a5020, 0.85);
    g.strokeRect(ufL - 5, ufB, ufR - ufL + 10, 6);
    // Joist brackets
    [-30, -12, 12, 30].forEach((jx) => {
      g.fillStyle(0x5a3812, 1);
      g.fillTriangle(jx - 3, ufB + 6, jx + 3, ufB + 6, jx, ufB + 14);
    });

    // Timber frame fill
    g.fillStyle(0x302010, 1);
    g.fillRect(ufL, ufT, ufR - ufL, ufB - ufT);
    // Vertical timber studs
    g.lineStyle(3, 0x5a3810, 0.9);
    [ufL, ufL + 14, 0, ufR - 14, ufR].forEach((sx) => {
      g.lineBetween(sx, ufT, sx, ufB);
    });
    // Cross brace on left panel
    g.lineStyle(2, 0x5a3810, 0.7);
    g.lineBetween(ufL, ufT, ufL + 14, ufB);
    g.lineBetween(ufL, ufB, ufL + 14, ufT);
    // Cross brace on right panel
    g.lineBetween(ufR - 14, ufT, ufR, ufB);
    g.lineBetween(ufR - 14, ufB, ufR, ufT);
    // Outer timber border
    g.lineStyle(2, 0x7a5020, 0.9);
    g.strokeRect(ufL, ufT, ufR - ufL, ufB - ufT);
    // Plaster fill between studs (whitewash)
    [-34, -6, 24].forEach((ppx) => {
      g.fillStyle(0x3a2c52, 0.7);
      g.fillRect(ppx, ufT + 2, 10, ufB - ufT - 4);
    });

    // Upper windows
    [[-22, ufT + 9], [22, ufT + 9]].forEach(([wx, wy]) => {
      g.fillStyle(0xfbbf24, 0.78);
      g.fillRect((wx as number) - 10, wy as number, 20, 14);
      // Cross dividers
      g.lineStyle(1.5, 0x4a3010, 1);
      g.lineBetween(wx as number, wy as number, wx as number, (wy as number) + 14);
      g.lineBetween((wx as number) - 10, (wy as number) + 7, (wx as number) + 10, (wy as number) + 7);
      g.lineStyle(1.5, COLORS.gold, 0.9);
      g.strokeRect((wx as number) - 10, wy as number, 20, 14);
    });

    // Hanging shop sign (centre)
    g.fillStyle(0x4a2c0a, 1);
    g.fillRoundedRect(-16, ufT + 5, 32, 14, 4);
    g.lineStyle(2, COLORS.gold, 1);
    g.strokeRoundedRect(-16, ufT + 5, 32, 14, 4);
    // Chains
    [-12, 12].forEach((cx) => {
      g.lineStyle(1, 0xd4a520, 0.8);
      g.lineBetween(cx, ufT + 2, cx, ufT + 5);
    });
    // Coin on sign
    g.fillStyle(COLORS.gold, 1);
    g.fillCircle(0, ufT + 12, 5.5);
    g.fillStyle(0x4a2c0a, 1);
    g.fillCircle(0, ufT + 12, 2.5);

    // ── ROOF ─────────────────────────────────────────────────────
    const rfBase = ufT;
    const rfPeak = ufT - 48;

    // Main gable
    g.fillStyle(0x5c1616, 1);
    g.fillTriangle(-50, rfBase, 50, rfBase, 0, rfPeak);
    g.lineStyle(2.5, COLORS.crimson, 0.85);
    g.strokeTriangle(-50, rfBase, 50, rfBase, 0, rfPeak);

    // Pantile rows (alternating darker strips)
    for (let ti = 1; ti < 7; ti++) {
      const frac = ti / 7;
      const ty = rfBase + (rfPeak - rfBase) * frac;
      const tw = 50 * (1 - frac);
      g.fillStyle(ti % 2 ? 0x6e1e1e : 0x4c1010, 0.5);
      const prevFrac = (ti - 1) / 7;
      const prevY = rfBase + (rfPeak - rfBase) * prevFrac;
      const prevW = 50 * (1 - prevFrac);
      g.fillTriangle(-prevW, prevY, prevW, prevY, 0, rfPeak);
      if (ti < 6) {
        g.fillStyle(0x3c0c0c, 0.3);
        g.lineBetween(-tw, ty, tw, ty);
      }
    }
    // Roof tile lines
    g.lineStyle(1, 0x7e2020, 0.55);
    for (let ti = 1; ti < 7; ti++) {
      const frac = ti / 7;
      const ty = rfBase + (rfPeak - rfBase) * frac;
      const tw = 50 * (1 - frac);
      g.lineBetween(-tw, ty, tw, ty);
    }

    // Ridge cap beam
    g.lineStyle(4, 0x3c0c0c, 1);
    g.lineBetween(-3, rfPeak + 2, 3, rfPeak + 2);

    // Left chimney (larger, offset)
    const ch1x = -20;
    g.fillStyle(0x2a1c1c, 1);
    g.fillRect(ch1x - 6, rfPeak + 6, 12, 28);
    g.lineStyle(1.5, 0x4a2a2a, 1);
    g.strokeRect(ch1x - 6, rfPeak + 6, 12, 28);
    // Brick courses on chimney
    g.lineStyle(1, 0x1a0c0c, 0.7);
    for (let cr = rfPeak + 14; cr < rfPeak + 34; cr += 8) g.lineBetween(ch1x - 6, cr, ch1x + 6, cr);
    // Cap
    g.fillStyle(0x1a1010, 1);
    g.fillRect(ch1x - 8, rfPeak + 3, 16, 5);
    // Smoke wisps (piecewise)
    g.lineStyle(2, 0x6a5a5a, 0.28);
    const smoke1 = [[ch1x, rfPeak + 1], [ch1x + 2, rfPeak - 5], [ch1x - 2, rfPeak - 12], [ch1x + 2, rfPeak - 20]];
    for (let si = 0; si < smoke1.length - 1; si++) g.lineBetween(smoke1[si][0], smoke1[si][1], smoke1[si + 1][0], smoke1[si + 1][1]);
    g.lineStyle(1.5, 0x6a5a5a, 0.18);
    const smoke2 = [[ch1x - 2, rfPeak + 1], [ch1x - 4, rfPeak - 7], [ch1x + 3, rfPeak - 14], [ch1x - 2, rfPeak - 22]];
    for (let si = 0; si < smoke2.length - 1; si++) g.lineBetween(smoke2[si][0], smoke2[si][1], smoke2[si + 1][0], smoke2[si + 1][1]);

    // Right smaller chimney
    const ch2x = 24;
    g.fillStyle(0x2a1c1c, 1);
    g.fillRect(ch2x - 4, rfPeak + 12, 8, 20);
    g.lineStyle(1, 0x4a2a2a, 1);
    g.strokeRect(ch2x - 4, rfPeak + 12, 8, 20);
    g.fillStyle(0x1a1010, 1);
    g.fillRect(ch2x - 6, rfPeak + 9, 12, 4);

    // ── FLAG ─────────────────────────────────────────────────────
    // Pole
    g.fillStyle(0xd4a020, 1);
    g.fillRect(-1.5, rfPeak - 26, 3, 26);
    // Flag with skull
    g.fillStyle(0x8b1010, 1);
    g.fillTriangle(0, rfPeak - 26, 22, rfPeak - 19, 0, rfPeak - 12);
    g.lineStyle(1, 0xaa2020, 0.7);
    g.strokeTriangle(0, rfPeak - 26, 22, rfPeak - 19, 0, rfPeak - 12);
    g.fillStyle(0xfff0e0, 0.92);
    g.fillCircle(11, rfPeak - 19, 4);
    g.fillStyle(0x8b1010, 1);
    g.fillCircle(9.5, rfPeak - 20, 1.2);
    g.fillCircle(12.5, rfPeak - 20, 1.2);
    g.fillTriangle(9.5, rfPeak - 17, 12.5, rfPeak - 17, 11, rfPeak - 14.5);

    // ── LANTERNS ─────────────────────────────────────────────────
    [gfL + 6, gfR - 6].forEach((lx) => {
      // Bracket arm
      g.fillStyle(0xd4a020, 0.85);
      g.fillRect(lx < 0 ? lx : lx - 10, gfT - 5, 10, 3);
      g.fillRect(lx < 0 ? lx + 10 : lx - 2, gfT - 14, 3, 12);
      // Lantern body (hexagonal approximation)
      const ly = gfT - 20;
      const lhw = 6;
      g.fillStyle(0x2a2040, 1);
      g.fillRect(lx < 0 ? lx + 4 : lx - 10, ly - 6, lhw * 2, 12);
      g.lineStyle(1.5, COLORS.gold, 0.9);
      g.strokeRect(lx < 0 ? lx + 4 : lx - 10, ly - 6, lhw * 2, 12);
      // Flame glow
      g.fillStyle(0xfbbf24, 0.8);
      g.fillCircle(lx < 0 ? lx + 10 : lx - 4, ly, 3.5);
      // Outer glow
      g.fillStyle(0xfbbf24, 0.1);
      g.fillCircle(lx < 0 ? lx + 10 : lx - 4, ly, 12);
    });

    this.add(g);

    // ── ANIMATED BEACON ──────────────────────────────────────────
    this.beacon = this.scene.add.graphics();
    const bY = rfPeak - 36;
    this.beacon.fillStyle(COLORS.gold, 0.5);
    this.beacon.fillCircle(0, bY, 5);
    this.beacon.lineStyle(2, COLORS.gold, 0.6);
    this.beacon.strokeCircle(0, bY, 10);
    this.beacon.strokeCircle(0, bY, 16);
    this.add(this.beacon);
    this.scene.tweens.add({
      targets: this.beacon,
      alpha: 0.08,
      scale: 1.8,
      duration: 1100,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.inOut',
    });
  }
}

export default ShopIsland;
