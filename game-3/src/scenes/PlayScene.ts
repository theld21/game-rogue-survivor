import Phaser from 'phaser';
import EventBus from '../EventBus.ts';
import AudioManager from '../utils/AudioManager.ts';
import GameProgress from '../utils/GameProgress.ts';
import { generateMap } from '../game/MapGenerator.ts';
import {
  PLANET_CFG, ENEMY_CFG, VITALITY_MAX, SHOOT_THRESHOLD,
  BRIDGE_SPEED, PACKET_SPEED, PACKET_ENERGY, PACKETS_PER_SEND,
  BULLET_SPEED_PLANET, BULLET_SPEED_ENEMY, BULLET_RADIUS,
} from '../game/GameConfig.ts';
import type { PlanetData, EnemyShip, Bridge, BridgePacket, Bullet, BgStar, FxRing, MapData } from '../game/GameTypes.ts';

export default class PlayScene extends Phaser.Scene {
  private bgGfx!:  Phaser.GameObjects.Graphics;
  private wGfx!:   Phaser.GameObjects.Graphics; // world objects
  private uiGfx!:  Phaser.GameObjects.Graphics; // minimap + selection

  private planets: PlanetData[]  = [];
  private ships:   EnemyShip[]   = [];
  private bridges: Bridge[]      = [];
  private bullets: Bullet[]      = [];
  private bgStars: BgStar[]      = [];
  private fxRings: FxRing[]      = [];
  private labels:  Map<string, Phaser.GameObjects.Text> = new Map();
  private bulletId = 0;
  private bridgeId = 0;

  private D!: number;        // raw dpr
  private ZOOM!: number;     // camera zoom = 0.8 * dpr  (like game-2's 0.85 * dpr)
  private W!: number;
  private H!: number;
  private WORLD_W = 0;
  private WORLD_H = 0;

  private selectedPlanetId: string | null = null;
  private ptrCurWX = 0; ptrCurWY = 0; // current pointer in world coords (for aim line)

  private matchOver = false;
  private matchTimerEvt!: Phaser.Time.TimerEvent;
  private timeRemaining   = 180;
  private enemyBulletDmg  = 7; // scales with difficulty

  constructor() { super('PlayScene'); }

  // ── World coords for drawing — use raw world px (Phaser camera handles transform)
  // Screen → world conversion (for hit tests, minimap click)
  private sw(sx: number): number { return this.cameras.main.scrollX + sx / this.ZOOM; }
  private sh(sy: number): number { return this.cameras.main.scrollY + sy / this.ZOOM; }
  // World → minimap screen (for minimap rendering only)
  private mmX(worldX: number, mmLeft: number, scX: number): number { return mmLeft + worldX * scX; }
  private mmY(worldY: number, mmTop:  number, scY: number): number { return mmTop  + worldY * scY; }

  // ================================================================
  create(): void {
    this.D    = window.devicePixelRatio || 1;
    this.ZOOM = 0.8 * this.D;            // same approach as game-2: 0.85 * dpr
    this.W    = this.scale.width;
    this.H    = this.scale.height;

    // Set Phaser camera zoom (handles DPR-aware rendering like game-2)
    this.cameras.main.setZoom(this.ZOOM);

    this.planets=[]; this.ships=[]; this.bridges=[]; this.bullets=[];
    this.bgStars=[]; this.fxRings=[];
    this.labels.forEach(l=>l.destroy()); this.labels.clear();
    this.matchOver=false; this.selectedPlanetId=null;
    this.timeRemaining = 180;

    const diff = GameProgress.getDifficulty();
    this.enemyBulletDmg = 4 + diff * 2;
    // World = exactly visible area (no scrolling needed)
    const visW = this.W / this.ZOOM;
    const visH = this.H / this.ZOOM;
    const map: MapData = generateMap(visW, visH, diff);
    this.planets   = map.planets;
    this.ships     = map.ships;
    this.WORLD_W   = map.worldW;
    this.WORLD_H   = map.worldH;

    // Graphics layers
    // wGfx: world-space (scrolls + zooms with camera)
    // bgGfx, uiGfx: screen-fixed (setScrollFactor(0) = no scroll; drawn at physical px / zoom)
    this.bgGfx = this.add.graphics().setDepth(0).setScrollFactor(0);
    this.wGfx  = this.add.graphics().setDepth(1);
    this.uiGfx = this.add.graphics().setDepth(3).setScrollFactor(0);

    // Vitality labels
    for (const p of this.planets) {
      // fontSize in logical world px; camera zoom renders at ~10 CSS px
      const lbl = this.add.text(0, 0, '', {
        fontFamily: 'Orbitron, monospace',
        fontSize:   `${Math.round(11 / 0.8)}px`, // = ~14px logical → ~11 CSS at zoom 0.8*dpr
        color: '#ffffff', align: 'center',
      }).setOrigin(0.5, 0.5).setDepth(2);
      this.labels.set(p.id, lbl);
    }

    // Background stars
    for (let i = 0; i < 180; i++) {
      this.bgStars.push({
        x: Math.random() * (this.W / this.D),
        y: Math.random() * (this.H / this.D),
        r: 0.4 + Math.random() * 1.1,
        alpha: 0.15 + Math.random() * 0.5,
        speed: 0.05 + Math.random() * 0.18,
      });
    }

    // No scrolling — world fits exactly in viewport, camera stays at origin
    this.cameras.main.scrollX = 0;
    this.cameras.main.scrollY = 0;

    this._setupInput();

    this.matchTimerEvt = this.time.addEvent({ delay:1000, loop:true, callback:()=>{
      this.timeRemaining--;
      if (this.timeRemaining <= 0) this._endGame(false);
    }});

    AudioManager.startMusic('ingame');
    EventBus.emit('game_started', { timeLimit: this.timeRemaining });
    EventBus.on('ui_pause_game',  this._pause,  this);
    EventBus.on('ui_resume_game', this._resume, this);
    EventBus.on('ui_quit_game',   this._quit,   this);
  }

  update(_t: number, delta: number): void {
    if (this.matchOver) return;
    const dt = delta / 1000;

    this._updateBridges(dt);
    this._updateSelfHeal(dt);
    this._updateShipAI(dt);
    this._updatePlanetShooting(dt);
    this._updateBullets(dt);
    this._updateFxRings(dt);
    this._checkWinLose();
    this._drawAll();
    this._updateLabels();
    this._emitHud();
  }

  shutdown(): void {
    EventBus.off('ui_pause_game',  this._pause,  this);
    EventBus.off('ui_resume_game', this._resume, this);
    EventBus.off('ui_quit_game',   this._quit,   this);
    this.labels.forEach(l => l.destroy());
    this.labels.clear();
    AudioManager.stopMusic();
    this.matchTimerEvt?.destroy();
  }

  // ================================================================
  // INPUT
  // ================================================================
  private _setupInput(): void {
    this.input.on('pointermove', (ptr: Phaser.Input.Pointer) => {
      const wp = this.cameras.main.getWorldPoint(ptr.x, ptr.y);
      this.ptrCurWX = wp.x; this.ptrCurWY = wp.y;
    });

    this.input.on('pointerup', (ptr: Phaser.Input.Pointer) => {
      const wp = this.cameras.main.getWorldPoint(ptr.x, ptr.y);
      const tapped = this._planetAt(wp.x, wp.y);

      if (!tapped) { this.selectedPlanetId=null; return; }

      if (this.selectedPlanetId && this.selectedPlanetId !== tapped.id) {
        const src = this._getPlanet(this.selectedPlanetId);
        if (src && src.state==='alive') {
          this._startBridge(src, tapped);
        }
        this.selectedPlanetId=null;
      } else if (tapped.state==='alive') {
        this.selectedPlanetId = tapped.id;
      } else {
        this.selectedPlanetId=null;
      }
    });
  }

  // ================================================================
  // BRIDGE
  // ================================================================
  private _startBridge(src: PlanetData, tgt: PlanetData): void {
    if (src.id === tgt.id) return;
    if (tgt.state === 'alive') return; // can't colonize already alive planet
    // Remove existing bridge to same target
    this.bridges = this.bridges.filter(b => !(b.sourceId===src.id && b.targetId===tgt.id));
    const dx=tgt.x-src.x, dy=tgt.y-src.y;
    const len=Math.sqrt(dx*dx+dy*dy);
    this.bridges.push({
      id:`b${this.bridgeId++}`,
      sourceId:src.id, targetId:tgt.id,
      sx:src.x, sy:src.y, tx:tgt.x, ty:tgt.y,
      totalLen:len, builtLen:0, built:false,
      packets:[], done:false, alpha:1,
    });
    AudioManager.playSend();
  }

  private _updateBridges(dt: number): void {
    for (const b of this.bridges) {
      if (b.done) { b.alpha -= dt * 1.5; continue; }

      const tgt = this._getPlanet(b.targetId);
      const src = this._getPlanet(b.sourceId);
      if (!tgt || !src || tgt.state==='alive' || src.state!=='alive') {
        b.done=true; continue;
      }

      // Build phase
      if (!b.built) {
        b.builtLen += BRIDGE_SPEED * dt;
        if (b.builtLen >= b.totalLen) {
          b.builtLen = b.totalLen;
          b.built = true;
          // Spawn packets equal to energy needed to fill target
          const needed = Math.max(1, VITALITY_MAX - (this._getPlanet(b.targetId)?.vitality ?? 0));
          const numPkts = Math.max(1, Math.min(PACKETS_PER_SEND * 2, Math.ceil(needed / PACKET_ENERGY)));
          for (let i=0; i<numPkts; i++) {
            b.packets.push({ t: -(i * 0.15), active: true });
          }
        }
        return;
      }

      // Move packets
      let allArrived = true;
      for (const pkt of b.packets) {
        if (!pkt.active) continue;
        allArrived = false;
        pkt.t += (PACKET_SPEED / b.totalLen) * dt;
        if (pkt.t >= 1) {
          pkt.active = false;
          // Deliver energy
          if (tgt.state !== 'alive') {
            tgt.vitality = Math.min(VITALITY_MAX, tgt.vitality + PACKET_ENERGY);
            tgt.state = 'colonizing';
            if (tgt.vitality >= VITALITY_MAX) {
              tgt.vitality = VITALITY_MAX;
              tgt.state = 'alive';
              AudioManager.playCapture();
              this.fxRings.push({ x:tgt.x, y:tgt.y, radius:tgt.radius, maxRadius:tgt.radius*3.5, alpha:1, color:0x00FFAA, speed:200 });
            }
          }
        }
      }
      if (allArrived && b.packets.every(p=>!p.active)) b.done = true;
    }
    this.bridges = this.bridges.filter(b => b.alpha > 0);
  }

  // ================================================================
  // SELF-HEAL (oceanic-type planets above 50% vitality)
  // ================================================================
  private _updateSelfHeal(dt: number): void {
    for (const p of this.planets) {
      if (p.isHome) continue;
      const cfg = PLANET_CFG[p.type];
      if (!cfg.selfHeal) continue;
      if (p.vitality >= 50 && p.vitality < VITALITY_MAX) {
        p.vitality = Math.min(VITALITY_MAX, p.vitality + cfg.healRate * dt);
        if (p.state === 'dead') p.state = 'colonizing';
      }
    }
  }

  // ================================================================
  // ENEMY SHIP AI
  // ================================================================
  private _updateShipAI(dt: number): void {
    const t = this.time.now;
    for (const s of this.ships) {
      if (!s.active) continue;

      // Find nearest NON-HOME planet (home is protected, never targeted)
      const alivePlanets = this.planets.filter(p => !p.isHome && p.state==='alive');
      const anyPlanets   = this.planets.filter(p => !p.isHome);
      const pool = alivePlanets.length ? alivePlanets : anyPlanets;
      if (pool.length === 0) continue;

      let nearest = pool[0]!;
      let nearDist = Infinity;
      for (const p of pool) {
        const d=Math.sqrt((p.x-s.x)**2+(p.y-s.y)**2);
        if (d<nearDist){ nearDist=d; nearest=p; }
      }

      // Move toward nearest
      const targetX = nearest.x + Math.sin(t*0.001 + s.id.charCodeAt(1))*60;
      const targetY = nearest.y + Math.cos(t*0.001 + s.id.charCodeAt(1))*60;
      const dx=targetX-s.x, dy=targetY-s.y;
      const d=Math.sqrt(dx*dx+dy*dy);
      if (d > 5) {
        s.vx = (dx/d)*ENEMY_CFG.speed;
        s.vy = (dy/d)*ENEMY_CFG.speed;
        s.angle = Math.atan2(dy, dx);
      } else { s.vx=0; s.vy=0; }
      s.x += s.vx*dt; s.y += s.vy*dt;

      // Shoot at nearest planet within range
      s.shootCooldown -= delta_ms(dt);
      if (s.shootCooldown <= 0 && nearDist < ENEMY_CFG.shootRange) {
        s.shootCooldown = ENEMY_CFG.shootInterval;
        const nx=nearest.x-s.x, ny=nearest.y-s.y;
        const nl=Math.sqrt(nx*nx+ny*ny);
        this.bullets.push({
          id:this.bulletId++, x:s.x, y:s.y,
          vx:(nx/nl)*BULLET_SPEED_ENEMY, vy:(ny/nl)*BULLET_SPEED_ENEMY,
          damage: this.enemyBulletDmg, owner:'enemy',
          active:true, color:ENEMY_CFG.color, targetId:nearest.id,
        });
      }
    }
  }

  // ================================================================
  // PLANET AUTO-SHOOT
  // ================================================================
  private _updatePlanetShooting(dt: number): void {
    for (const p of this.planets) {
      // Home planet never shoots; only planets >= 90% vitality shoot
      if (p.isHome) continue;
      if (p.vitality < VITALITY_MAX * SHOOT_THRESHOLD) continue;
      p.shootCooldown -= delta_ms(dt);
      if (p.shootCooldown > 0) continue;

      // Find nearest active enemy in range
      let target: EnemyShip | null = null;
      let nearD = p.shootRange;
      for (const s of this.ships) {
        if (!s.active) continue;
        const d=Math.sqrt((s.x-p.x)**2+(s.y-p.y)**2);
        if (d<nearD){ nearD=d; target=s; }
      }
      if (!target) continue;
      p.shootCooldown = p.shootInterval;
      const dx=target.x-p.x, dy=target.y-p.y;
      const dl=Math.sqrt(dx*dx+dy*dy);
      const cfg = PLANET_CFG[p.type];
      this.bullets.push({
        id:this.bulletId++, x:p.x, y:p.y,
        vx:(dx/dl)*BULLET_SPEED_PLANET, vy:(dy/dl)*BULLET_SPEED_PLANET,
        damage:p.bulletDamage, owner:'planet',
        active:true, color:cfg.glowColor, targetId:target.id,
      });
    }
  }

  // ================================================================
  // BULLETS
  // ================================================================
  private _updateBullets(dt: number): void {
    for (const b of this.bullets) {
      if (!b.active) continue;
      b.x+=b.vx*dt; b.y+=b.vy*dt;

      // Out of world bounds
      const off=300;
      if (b.x<-off||b.x>this.WORLD_W+off||b.y<-off||b.y>this.WORLD_H+off){
        b.active=false; continue;
      }

      if (b.owner==='enemy') {
        // Hit any planet except home planet
        for (const p of this.planets) {
          if (p.isHome) continue; // home planet is invulnerable
          const d=Math.sqrt((p.x-b.x)**2+(p.y-b.y)**2);
          if (d<p.radius+4) {
            b.active=false;
            p.vitality = Math.max(0, p.vitality - b.damage);
            if (p.vitality===0 && p.state!=='dead'){
              p.state='dead';
              this.fxRings.push({x:p.x,y:p.y,radius:p.radius,maxRadius:p.radius*3,alpha:1,color:0xFF4400,speed:180});
              AudioManager.playPulsar();
            } else if (p.vitality<VITALITY_MAX && p.state==='alive') {
              p.state='colonizing'; // damaged alive planet drops back
            }
            break;
          }
        }
      } else {
        // Planet bullet hits enemy ships
        for (const s of this.ships) {
          if (!s.active) continue;
          const d=Math.sqrt((s.x-b.x)**2+(s.y-b.y)**2);
          if (d<ENEMY_CFG.radius+4) {
            b.active=false;
            s.hp -= b.damage;
            if (s.hp<=0) {
              s.active=false;
              this.fxRings.push({x:s.x,y:s.y,radius:ENEMY_CFG.radius,maxRadius:80,alpha:1,color:0xFF2244,speed:240});
              AudioManager.playSupernova();
            }
            break;
          }
        }
      }
    }
    if (this.bullets.length>400) this.bullets=this.bullets.filter(b=>b.active);
  }

  private _updateFxRings(dt: number): void {
    for (const r of this.fxRings){ r.radius+=r.speed*dt; r.alpha-=dt*1.4; }
    this.fxRings=this.fxRings.filter(r=>r.alpha>0);
  }

  // ================================================================
  // WIN / LOSE
  // ================================================================
  private _checkWinLose(): void {
    if (this.matchOver) return;
    const home = this._getPlanet('p0');
    if (home && home.vitality <= 0) { this._endGame(false); return; }

    const allEvolved  = this.planets.every(p => p.state==='alive');
    const allShipsDead= this.ships.every(s => !s.active);
    if (allEvolved || allShipsDead) this._endGame(true);
  }

  private _endGame(won: boolean): void {
    if (this.matchOver) return;
    this.matchOver = true;
    this.matchTimerEvt.destroy();
    const evolved  = this.planets.filter(p=>p.state==='alive').length;
    const stardust = evolved * 8 + (won ? 15 : 0);
    GameProgress.recordMatchResult(won, stardust);
    AudioManager.stopMusic();
    setTimeout(()=>{ won ? AudioManager.playWin() : AudioManager.playLose(); }, 200);
    EventBus.emit('match_over', { won, playerStars: evolved, enemyStars: this.ships.filter(s=>s.active).length, stardust });
  }

  // ================================================================
  // DRAWING
  // ================================================================
  private _drawAll(): void {
    // D = dpr (for screen-fixed elements drawn on bgGfx/uiGfx)
    // World elements on wGfx use raw world coordinates — Phaser camera zoom handles rendering
    const D=this.D, t=this.time.now;
    this.bgGfx.clear(); this.wGfx.clear(); this.uiGfx.clear();
    this._drawBg(D);
    this._drawBridges(t);
    this._drawBullets();
    this._drawFxRings();
    this._drawPlanets(t);
    this._drawShips(t);
    this._drawSelection(t);
    this._drawMinimap(D);
  }

  private _drawBg(D: number): void {
    // bgGfx has setScrollFactor(0) — draw at physical px / ZOOM to get screen coords
    const Z = this.ZOOM;
    const SW = this.W / Z, SH = this.H / Z; // screen size in "unzoomed" coords
    this.bgGfx.fillStyle(0x020008,1);
    this.bgGfx.fillRect(0, 0, SW, SH);
    for (const s of this.bgStars) {
      s.y += s.speed * (1/60);
      if (s.y > SH) { s.y=0; s.x=Math.random()*SW; }
      this.bgGfx.fillStyle(0xffffff, s.alpha);
      this.bgGfx.fillCircle(s.x, s.y, s.r);
    }
  }

  private _drawBridges(t: number): void {
    for (const b of this.bridges) {
      const alpha = b.alpha * 0.85;
      if (alpha <= 0) continue;
      const frac = b.totalLen > 0 ? (b.built ? 1 : b.builtLen/b.totalLen) : 0;
      const ex = b.sx + frac*(b.tx-b.sx);
      const ey = b.sy + frac*(b.ty-b.sy);
      const segLen = 10; // world px per dash segment
      const segs = Math.floor(b.builtLen / segLen);

      // Dashed line (world coords — camera zoom scales line width automatically)
      for (let i=0; i<segs; i+=2) {
        const t0=i/segs*frac, t1=Math.min((i+1)/segs*frac,frac);
        this.wGfx.lineStyle(1.5, 0x00AAFF, alpha*0.8);
        this.wGfx.beginPath();
        this.wGfx.moveTo(b.sx+t0*(b.tx-b.sx), b.sy+t0*(b.ty-b.sy));
        this.wGfx.lineTo(b.sx+t1*(b.tx-b.sx), b.sy+t1*(b.ty-b.sy));
        this.wGfx.strokePath();
      }
      // Outer glow line
      this.wGfx.lineStyle(4, 0x0044FF, alpha*0.12);
      this.wGfx.beginPath();
      this.wGfx.moveTo(b.sx, b.sy); this.wGfx.lineTo(ex, ey);
      this.wGfx.strokePath();

      // Energy packets (dots traveling along bridge)
      for (const pkt of b.packets) {
        if (!pkt.active || pkt.t<0 || pkt.t>1) continue;
        const px2=b.sx+pkt.t*(b.tx-b.sx), py2=b.sy+pkt.t*(b.ty-b.sy);
        this.wGfx.fillStyle(0x00FFFF, 0.25);
        this.wGfx.fillCircle(px2, py2, 7);
        this.wGfx.fillStyle(0xAAFFFF, 1);
        this.wGfx.fillCircle(px2, py2, 3);
      }
    }
  }

  private _drawPlanets(t: number): void {
    for (const p of this.planets) {
      const cx=p.x, cy=p.y; // raw world coords — Phaser camera handles transform
      const r=p.radius;

      const cfg  = PLANET_CFG[p.type];
      const alive = p.state==='alive';
      const dead  = p.state==='dead';
      const pct   = p.vitality / VITALITY_MAX;

      // Atmosphere glow (alive or colonizing)
      if (!dead) {
        for (let i=4;i>=1;i--) {
          const ga=0.05*i*(0.7+0.3*Math.sin(t*0.002+i));
          this.wGfx.fillStyle(cfg.glowColor, ga);
          this.wGfx.fillCircle(cx, cy, r+i*5);
        }
      }

      // Planet sphere
      const baseCol = dead ? 0x333344 : cfg.baseColor;
      this.wGfx.fillStyle(baseCol, 1);
      this.wGfx.fillCircle(cx, cy, r);

      // Surface features
      if (!dead) {
        this._drawPlanetSurface(p.type, cx, cy, r, t, pct);
      } else {
        for (let i=0;i<3;i++){
          const ang=(i/3)*Math.PI*2+0.3;
          this.wGfx.fillStyle(0x1A1A2A, 0.6);
          this.wGfx.fillCircle(cx+Math.cos(ang)*r*0.35, cy+Math.sin(ang)*r*0.35, r*(0.18+i*0.07));
        }
      }

      // Gas giant ring
      if (cfg.hasRing) {
        const ringCol = dead ? 0x444455 : cfg.ringColor;
        this.wGfx.lineStyle(2, ringCol, dead?0.3:0.7);
        this.wGfx.strokeEllipse(cx, cy, r*3.2, r*0.75);
        this.wGfx.lineStyle(1, ringCol, dead?0.15:0.4);
        this.wGfx.strokeEllipse(cx, cy, r*2.4, r*0.5);
      }

      // Lighting
      this.wGfx.fillStyle(0xffffff, dead?0.06:0.18);
      this.wGfx.fillCircle(cx-r*0.28, cy-r*0.32, r*0.55);
      this.wGfx.fillStyle(0x000000, dead?0.5:0.45);
      this.wGfx.fillCircle(cx+r*0.28, cy+r*0.2, r*0.75);

      // Outline
      this.wGfx.lineStyle(1.2, alive?cfg.glowColor:0x2A2A3A, alive?0.9:0.4);
      this.wGfx.strokeCircle(cx, cy, r);

      // Vitality bar
      if (!alive || p.vitality < VITALITY_MAX) {
        const bw=r*2.4, bh=2.5;
        const bx=cx-bw/2, by=cy+r+4;
        this.wGfx.fillStyle(0x111122, 0.8); this.wGfx.fillRect(bx,by,bw,bh);
        const barCol = p.state==='colonizing'?0x00AAFF:(alive?cfg.glowColor:0x334455);
        this.wGfx.fillStyle(barCol, 0.9); this.wGfx.fillRect(bx,by,bw*pct,bh);
        this.wGfx.lineStyle(0.5, 0xffffff, 0.15); this.wGfx.strokeRect(bx,by,bw,bh);
      }

      // Home indicator ring
      if (p.isHome && alive) {
        const pulse=0.4+0.3*Math.sin(t*0.008);
        this.wGfx.lineStyle(1.5, 0x00FFAA, pulse);
        this.wGfx.strokeCircle(cx, cy, r+8);
      }
    }
  }

  private _drawPlanetSurface(type: string, cx: number, cy: number, r: number, t: number, _pct: number): void {
    if (type==='gas_giant') {
      for (const b of [0.3,0.5,0.7]) {
        this.wGfx.fillStyle(0xFFD080,0.18);
        this.wGfx.fillRect(cx-r, cy+(-0.5+b)*r*2-1.5, r*2, 3);
      }
    } else if (type==='volcanic') {
      for (let i=0;i<4;i++){
        const ang=(i/4)*Math.PI*2+t*0.0005;
        this.wGfx.lineStyle(1.2, 0xFF6600, 0.5+0.3*Math.sin(t*0.004+i));
        this.wGfx.beginPath();
        this.wGfx.moveTo(cx,cy);
        this.wGfx.lineTo(cx+Math.cos(ang)*r*0.85, cy+Math.sin(ang)*r*0.85);
        this.wGfx.strokePath();
      }
      this.wGfx.fillStyle(0xFF8800,0.35); this.wGfx.fillCircle(cx,cy,r*0.3);
    } else if (type==='ice') {
      this.wGfx.fillStyle(0xEEFFFF,0.5); this.wGfx.fillCircle(cx,cy-r*0.55,r*0.45);
      for (let i=0;i<3;i++){
        const ang=(i/3)*Math.PI+0.5;
        this.wGfx.lineStyle(0.8,0x88CCFF,0.4);
        this.wGfx.beginPath();
        this.wGfx.moveTo(cx,cy); this.wGfx.lineTo(cx+Math.cos(ang)*r*0.9,cy+Math.sin(ang)*r*0.9);
        this.wGfx.strokePath();
      }
    } else if (type==='oceanic') {
      this.wGfx.fillStyle(0x224422,0.55); this.wGfx.fillCircle(cx-r*0.25,cy+r*0.15,r*0.38);
      this.wGfx.fillStyle(0x336633,0.4);  this.wGfx.fillCircle(cx+r*0.3,cy-r*0.25,r*0.28);
      const ca=0.18+0.08*Math.sin(t*0.001);
      this.wGfx.fillStyle(0xffffff,ca);
      this.wGfx.fillCircle(cx-r*0.1,cy-r*0.45,r*0.2);
      this.wGfx.fillCircle(cx+r*0.25,cy-r*0.35,r*0.15);
    } else {
      for (let i=0;i<4;i++){
        const ang=(i/4)*Math.PI*2+0.8;
        this.wGfx.fillStyle(0x5A3A1A,0.45);
        this.wGfx.fillCircle(cx+Math.cos(ang)*r*0.4,cy+Math.sin(ang)*r*0.4,r*0.2);
      }
    }
  }

  private _drawShips(t: number): void {
    for (const s of this.ships) {
      if (!s.active) continue;
      this._drawWarship(s.x, s.y, s.angle, s.hp/s.maxHp, t);
    }
  }

  private _drawWarship(cx:number, cy:number, ang:number, hpFrac:number, t:number): void {
    const r = ENEMY_CFG.radius; // world px; camera zoom scales to screen
    const glow = 0.5 + 0.35 * Math.sin(t * 0.018);
    const R = (lx:number, ly:number) => new Phaser.Geom.Point(
      cx + Math.cos(ang)*lx - Math.sin(ang)*ly,
      cy + Math.sin(ang)*lx + Math.cos(ang)*ly,
    );

    // Engine nacelles
    const engL=R(-r*1.3,-r*0.55), engR=R(-r*1.3,r*0.55);
    this.wGfx.fillStyle(0xFF3300,glow*0.35);
    this.wGfx.fillCircle(engL.x,engL.y,r*0.75); this.wGfx.fillCircle(engR.x,engR.y,r*0.75);
    this.wGfx.fillStyle(0xFF8844,glow);
    this.wGfx.fillCircle(engL.x,engL.y,r*0.32); this.wGfx.fillCircle(engR.x,engR.y,r*0.32);

    // Swept wings
    const wingL=[R(r*0.3,-r*0.7),R(-r*0.6,-r*1.8),R(-r*1.4,-r*0.45)];
    const wingR=[R(r*0.3, r*0.7),R(-r*0.6, r*1.8),R(-r*1.4, r*0.45)];
    this.wGfx.fillStyle(0x1A0025,1);
    this.wGfx.fillPoints(wingL,true); this.wGfx.fillPoints(wingR,true);
    this.wGfx.lineStyle(0.8,0xCC0033,0.7);
    this.wGfx.strokePoints(wingL,true); this.wGfx.strokePoints(wingR,true);
    this.wGfx.lineStyle(0.7,0xFF2244,0.5);
    this.wGfx.beginPath(); this.wGfx.moveTo(R(r*0.1,-r*0.65).x,R(r*0.1,-r*0.65).y);
    this.wGfx.lineTo(R(-r*0.5,-r*1.4).x,R(-r*0.5,-r*1.4).y); this.wGfx.strokePath();
    this.wGfx.beginPath(); this.wGfx.moveTo(R(r*0.1,r*0.65).x,R(r*0.1,r*0.65).y);
    this.wGfx.lineTo(R(-r*0.5,r*1.4).x,R(-r*0.5,r*1.4).y); this.wGfx.strokePath();

    // Main fuselage
    const hull=[R(r*2,0),R(r*1.1,-r*0.45),R(0,-r*0.65),R(-r*0.5,-r*0.55),
                R(-r*1.2,-r*0.35),R(-r*1.2,r*0.35),R(-r*0.5,r*0.55),R(0,r*0.65),R(r*1.1,r*0.45)];
    this.wGfx.fillStyle(0x120018,1); this.wGfx.fillPoints(hull,true);
    this.wGfx.lineStyle(1.2,0xFF1133,0.9); this.wGfx.strokePoints(hull,true);
    this.wGfx.lineStyle(0.7,0xFF4466,0.55);
    this.wGfx.beginPath(); this.wGfx.moveTo(R(-r*1.1,0).x,R(-r*1.1,0).y);
    this.wGfx.lineTo(R(r*1.8,0).x,R(r*1.8,0).y); this.wGfx.strokePath();

    // Weapon hardpoints
    const wp1=R(r*0.6,-r*0.55), wp2=R(r*0.6,r*0.55);
    const wpP=0.6+0.4*Math.sin(t*0.012);
    this.wGfx.fillStyle(0xFF0044,wpP);
    this.wGfx.fillCircle(wp1.x,wp1.y,r*0.2); this.wGfx.fillCircle(wp2.x,wp2.y,r*0.2);
    this.wGfx.lineStyle(0.6,0xFF2255,wpP*0.5);
    this.wGfx.strokeCircle(wp1.x,wp1.y,r*0.32); this.wGfx.strokeCircle(wp2.x,wp2.y,r*0.32);

    // Cockpit
    const nose=R(r*1.7,0);
    this.wGfx.fillStyle(0xFF0033,0.9); this.wGfx.fillCircle(nose.x,nose.y,r*0.28);
    this.wGfx.fillStyle(0xFFAAAA,0.6); this.wGfx.fillCircle(R(r*1.6,-r*0.06).x,R(r*1.6,-r*0.06).y,r*0.1);

    // Shield glow
    this.wGfx.lineStyle(1.2,0xFF1133,glow*0.22); this.wGfx.strokeCircle(cx,cy,r*2.3);

    // HP bar
    const bw=r*3.5, bh=2;
    const bx=cx-bw/2, by=cy-r*2.6;
    this.wGfx.fillStyle(0x330000,0.8); this.wGfx.fillRect(bx,by,bw,bh);
    const hpCol=hpFrac>0.5?0xFF2244:hpFrac>0.25?0xFF6600:0xFFAA00;
    this.wGfx.fillStyle(hpCol,0.95); this.wGfx.fillRect(bx,by,bw*hpFrac,bh);
    this.wGfx.lineStyle(0.4,0xff0000,0.3); this.wGfx.strokeRect(bx,by,bw,bh);
  }

  private _drawBullets(): void {
    for (const b of this.bullets) {
      if (!b.active) continue;
      this.wGfx.fillStyle(b.color, 0.3);
      this.wGfx.fillCircle(b.x, b.y, BULLET_RADIUS*2.5);
      this.wGfx.fillStyle(b.owner==='planet'?0xAAFFFF:0xFF6655, 1);
      this.wGfx.fillCircle(b.x, b.y, BULLET_RADIUS);
    }
  }

  private _drawFxRings(): void {
    for (const r of this.fxRings) {
      this.wGfx.lineStyle(1.5, r.color, r.alpha);
      this.wGfx.strokeCircle(r.x, r.y, r.radius);
      this.wGfx.fillStyle(r.color, r.alpha*0.1);
      this.wGfx.fillCircle(r.x, r.y, r.radius);
    }
  }

  private _drawSelection(t: number): void {
    if (!this.selectedPlanetId) return;
    const p = this._getPlanet(this.selectedPlanetId);
    if (!p) return;
    const pulse = 0.5+0.4*Math.sin(t*0.012);
    // Selection ring + aim line drawn on wGfx (world-space, camera zooms it)
    this.wGfx.lineStyle(1.5, 0xffffff, pulse);
    this.wGfx.strokeCircle(p.x, p.y, p.radius+8);
    const tp = this._planetAt(this.ptrCurWX, this.ptrCurWY);
    if (!tp || tp.id===p.id) {
      this.wGfx.lineStyle(1, 0x00AAFF, 0.3);
      this.wGfx.beginPath();
      this.wGfx.moveTo(p.x, p.y);
      this.wGfx.lineTo(this.ptrCurWX, this.ptrCurWY);
      this.wGfx.strokePath();
    }
  }

  private _drawMinimap(D: number): void {
    // uiGfx has setScrollFactor(0) — draw at physical_px / ZOOM = "unzoomed screen coords"
    const Z  = this.ZOOM;
    const SW = this.W / Z;   // screen width  in unzoomed coords
    const SH = this.H / Z;   // screen height in unzoomed coords
    const mmW=72, mmH=56;    // minimap size in unzoomed px
    const mmX=SW-mmW-8, mmY=SH-mmH-96; // bottom-right; raised to leave room for the pause button below it
    const scX=mmW/this.WORLD_W, scY=mmH/this.WORLD_H;

    this.uiGfx.fillStyle(0x000000,0.65); this.uiGfx.fillRect(mmX,mmY,mmW,mmH);
    this.uiGfx.lineStyle(0.5,0xffffff,0.25); this.uiGfx.strokeRect(mmX,mmY,mmW,mmH);

    for (const p of this.planets) {
      const col = p.state==='alive' ? PLANET_CFG[p.type].glowColor : 0x444466;
      this.uiGfx.fillStyle(col,0.9);
      this.uiGfx.fillCircle(mmX+p.x*scX, mmY+p.y*scY, 2.5);
    }
    for (const s of this.ships) {
      if (!s.active) continue;
      this.uiGfx.fillStyle(0xFF2244,0.9);
      this.uiGfx.fillCircle(mmX+s.x*scX, mmY+s.y*scY, 2);
    }
    // Current viewport rectangle
    const cam = this.cameras.main;
    const visW = cam.width  / Z;
    const visH = cam.height / Z;
    this.uiGfx.lineStyle(1,0xffffff,0.7);
    this.uiGfx.strokeRect(mmX+cam.scrollX*scX, mmY+cam.scrollY*scY, visW*scX, visH*scY);
  }

  // ================================================================
  // LABELS / HUD
  // ================================================================
  private _updateLabels(): void {
    for (const p of this.planets) {
      const lbl=this.labels.get(p.id);
      if (!lbl) continue;
      lbl.setVisible(true);
      lbl.setText(p.state==='alive' ? '★' : `${Math.floor(p.vitality)}%`);
      lbl.setPosition(p.x, p.y); // world coords — camera handles zoom+scroll
      lbl.setStyle({ color: p.state==='alive'?'#00FFAA':'#aabbcc' });
    }
  }

  private _emitHud(): void {
    const evolved  = this.planets.filter(p=>p.state==='alive').length;
    const total    = this.planets.length;
    const shipsLeft= this.ships.filter(s=>s.active).length;
    EventBus.emit('hud_update', {
      playerStars: evolved,
      enemyStars:  shipsLeft,
      timeRemaining: this.timeRemaining,
      canSupernova: false,
      evolved, total, shipsLeft,
    });
  }

  // ================================================================
  // PAUSE / QUIT
  // ================================================================
  private _pause(): void  { this.scene.pause(); }
  private _resume(): void { this.scene.resume(); }
  private _quit(): void {
    this.matchOver=true;
    this.matchTimerEvt?.destroy();
    AudioManager.stopMusic();
    this.scene.start('MenuScene');
  }

  // ================================================================
  // HELPERS
  // ================================================================
  private _planetAt(wx: number, wy: number): PlanetData|null {
    for (const p of this.planets)
      if (Math.sqrt((p.x-wx)**2+(p.y-wy)**2)<=p.radius+10) return p;
    return null;
  }
  private _getPlanet(id: string): PlanetData|null {
    return this.planets.find(p=>p.id===id)??null;
  }
}

// helper to avoid 'delta' naming collision
function delta_ms(dt: number): number { return dt * 1000; }
