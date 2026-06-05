import Phaser from 'phaser';
import { gsap } from 'gsap';
import { COLORS, REPAIR } from '../config.ts';

// =====================================================================
// Spaceship.ts — the wrecked craft on the surface island. Each repaired
// stage lights a part up. When all are done, launch() flies it skyward.
// =====================================================================

export class Spaceship extends Phaser.GameObjects.Container {
  private parts: Phaser.GameObjects.Graphics[] = [];
  private flame!: Phaser.GameObjects.Graphics;
  private baseY: number;
  private launchEv?: Phaser.Time.TimerEvent;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y); this.baseY = y; scene.add.existing(this); this.setDepth(16);
    // base hull (always visible, dim)
    const hull = scene.add.graphics();
    hull.fillStyle(0x33485e, 1); hull.fillTriangle(-22, 30, 22, 30, 0, -52);
    hull.fillStyle(0x223445, 1); hull.fillTriangle(-22, 30, 0, 30, 0, -52);
    hull.lineStyle(2.5, COLORS.hull, 0.8); hull.strokeTriangle(-22, 30, 22, 30, 0, -52);
    this.add(hull);
    this.flame = scene.add.graphics(); this.add(this.flame);
    // 5 repair part lamps around the ship
    const spots: Array<[number, number]> = [[-14, 18], [14, 18], [0, -8], [-9, -28], [9, -28]];
    for (let i = 0; i < REPAIR.length; i++) {
      const g = scene.add.graphics(); const [px, py] = spots[i % spots.length];
      g.fillStyle(0x1a2a38, 1); g.fillCircle(px, py, 5); g.lineStyle(1.5, 0x44607a, 1); g.strokeCircle(px, py, 5);
      (g as any)._spot = [px, py]; this.add(g); this.parts.push(g);
    }
    // fins + window
    const trim = scene.add.graphics();
    trim.fillStyle(0x33485e, 1); trim.fillTriangle(-22, 30, -34, 44, -16, 22); trim.fillTriangle(22, 30, 34, 44, 16, 22);
    trim.fillStyle(COLORS.cockpit, 0.85); trim.fillCircle(0, -18, 6);
    this.add(trim);
  }

  setRepair(progress: number[]): void {
    for (let i = 0; i < this.parts.length; i++) {
      const done = (progress[i] ?? 0) >= REPAIR[i].need; const g = this.parts[i]; const [px, py] = (g as any)._spot;
      g.clear();
      g.fillStyle(done ? COLORS.crystal : 0x1a2a38, 1); g.fillCircle(px, py, 5);
      g.lineStyle(1.5, done ? COLORS.sonarHot : 0x44607a, 1); g.strokeCircle(px, py, 5);
      if (done) { g.fillStyle(COLORS.crystal, 0.25); g.fillCircle(px, py, 9); }
    }
  }

  launch(onDone: () => void): void {
    this.launchEv = this.scene.time.addEvent({ delay: 40, loop: true, callback: () => {
      if (!this.active) return;     // guard against a tick after destroy
      this.flame.clear(); const fl = 0.6 + Math.random() * 0.4;
      this.flame.fillStyle(COLORS.warn, 0.9); this.flame.fillTriangle(-12, 30, 12, 30, 0, 30 + (40 + fl * 30));
      this.flame.fillStyle(COLORS.vent, 0.8); this.flame.fillTriangle(-7, 30, 7, 30, 0, 30 + (28 + fl * 20));
    } });
    gsap.to(this, { y: this.baseY - 1400, duration: 3.2, ease: 'power2.in', onComplete: () => { this.launchEv?.remove(); this.launchEv = undefined; onDone(); } });
    gsap.to(this, { rotation: 0.1, duration: 0.4, yoyo: true, repeat: 7 });
  }

  destroy(fromScene?: boolean): void { this.launchEv?.remove(); this.launchEv = undefined; gsap.killTweensOf(this); super.destroy(fromScene); }
}
export default Spaceship;
