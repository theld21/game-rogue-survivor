import './index.css';
import Phaser from 'phaser';
import { gsap } from 'gsap';
import BootScene from './scenes/BootScene.ts';
import MenuScene from './scenes/MenuScene.ts';
import PlayScene from './scenes/PlayScene.ts';
import EventBus from './EventBus.ts';
import AudioManager from './utils/AudioManager.ts';
import GameProgress from './utils/GameProgress.ts';

// ── Tech / Artifact shop data ──────────────────────────────────────
const TECH_UPGRADES = [
  { id: 'blackHoleReduction', name: 'Gravity Damper',      desc: 'Reduces black hole pull radius by 20px per level.',    costs: [30, 70, 120] },
  { id: 'particleSpeed',      name: 'Warp Engine',         desc: 'Increases troop travel speed by 15% per level.',       costs: [25, 60, 100] },
  { id: 'supernovaRadius',    name: 'Stellar Ignition',    desc: 'Increases Supernova blast radius by 20px per level.',  costs: [35, 80, 140] },
  { id: 'pulsarSuppressor',   name: 'Pulse Suppressor',    desc: 'Adds 1.5s to Pulsar shockwave interval per level.',    costs: [40, 90, 150] },
] as const;

const ARTIFACTS = [
  { id: 'quantumLens',  name: 'Quantum Lens',  desc: 'Reveals true troop count in Nebula stars.',    cost: 50  },
  { id: 'warpDrive',    name: 'Warp Drive',    desc: 'First troop wave is sent at 2× speed.',         cost: 75  },
  { id: 'ironCore',     name: 'Iron Core',     desc: 'White Dwarf damage reduction increases to 70%.', cost: 60  },
  { id: 'timeCrystal',  name: 'Time Crystal',  desc: 'Each match lasts 10 seconds longer.',           cost: 80  },
] as const;

const STAR_COSMETICS = [
  { id: 'starColor_default', name: 'Neon Blue',     hex: '00AAFF', cost: 0   },
  { id: 'starColor_emerald', name: 'Emerald Core',  hex: '00FF88', cost: 40  },
  { id: 'starColor_gold',    name: 'Stellar Gold',  hex: 'FFAA00', cost: 60  },
  { id: 'starColor_violet',  name: 'Void Violet',   hex: 'AA55FF', cost: 80  },
];

const PARTICLE_COSMETICS = [
  { id: 'particle_circle', name: 'Sphere',     shape: 'circle', cost: 0  },
  { id: 'particle_cube',   name: 'Nano Cube',  shape: 'cube',   cost: 45 },
  { id: 'particle_spark',  name: 'Spark Trail',shape: 'spark',  cost: 70 },
];

// ── Bootstrap ──────────────────────────────────────────────────────
(async () => {
  await GameProgress.load();

  const dpr = window.devicePixelRatio || 1;

  const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.WEBGL,
    width:  window.innerWidth  * dpr,
    height: window.innerHeight * dpr,
    parent: 'game-container',
    backgroundColor: '#030008',
    physics: { default: 'arcade', arcade: { gravity: { x:0, y:0 }, debug: false } },
    scale: { mode: Phaser.Scale.NONE, autoCenter: Phaser.Scale.CENTER_BOTH },
    render: { antialias: true, roundPixels: true, resolution: dpr } as Phaser.Types.Core.RenderConfig,
    scene: [BootScene, MenuScene, PlayScene],
  };

  const game = new Phaser.Game(config);

  window.addEventListener('resize', () => {
    const d = window.devicePixelRatio || 1;
    game.scale.resize(window.innerWidth * d, window.innerHeight * d);
  });

  AudioManager.init(GameProgress.getMusicVolume(), GameProgress.getSfxVolume());

  // ── DOM Element refs ──────────────────────────────────────────────
  const loadingScreen   = document.getElementById('loading-screen')!;
  const loadingProgress = document.getElementById('loading-progress')!;
  const loadingStatus   = document.getElementById('loading-status')!;

  const menuOverlay  = document.getElementById('menu-overlay')!;
  const menuWins     = document.getElementById('menu-wins')!;
  const menuStardust = document.getElementById('menu-stardust')!;

  const hudOverlay     = document.getElementById('hud-overlay')!;
  const hudTimer       = document.getElementById('hud-timer')!;
  const hudPlayerStars = document.getElementById('hud-player-stars')!;
  const hudEnemyStars  = document.getElementById('hud-enemy-stars')!;

  const pauseOverlay  = document.getElementById('pause-overlay')!;
  const resultOverlay = document.getElementById('result-overlay')!;
  const resultSub     = document.getElementById('result-sub')!;
  const resultTitle   = document.getElementById('result-title')!;
  const resultPStars  = document.getElementById('result-player-stars')!;
  const resultEStars  = document.getElementById('result-enemy-stars')!;
  const resultDust    = document.getElementById('result-stardust')!;

  const arsenalOverlay  = document.getElementById('arsenal-overlay')!;
  const arsenalStardust = document.getElementById('arsenal-stardust')!;
  const arsenalContent  = document.getElementById('arsenal-content')!;

  const settingsOverlay = document.getElementById('settings-overlay')!;
  const sliderMusic  = document.getElementById('slider-music')  as HTMLInputElement;
  const sliderSfx    = document.getElementById('slider-sfx')    as HTMLInputElement;
  const lblMusic     = document.getElementById('lbl-music')!;
  const lblSfx       = document.getElementById('lbl-sfx')!;

  let activeArsenalTab: 'tech' | 'artifacts' | 'cosmetics' = 'tech';

  // ── EventBus → DOM ───────────────────────────────────────────────

  EventBus.on('load_progress', (v: number) => {
    const pct = Math.floor(v * 100);
    gsap.to(loadingProgress, { width: `${pct}%`, duration: 0.1 });
    loadingStatus.textContent =
      v < 0.4 ? 'Charting star systems…'
      : v < 0.8 ? 'Calibrating constellations…'
      : 'Initialising tactical AI…';
  });

  EventBus.on('load_complete', () => {
    gsap.to(loadingScreen, {
      opacity: 0, duration: 0.45,
      onComplete: () => { loadingScreen.style.display = 'none'; },
    });
  });

  EventBus.on('menu_ready', (data: {wins: number, stardust: number}) => {
    menuWins.textContent     = String(data.wins);
    menuStardust.textContent = String(data.stardust);
    gsap.set(menuOverlay, { display: 'flex', opacity: 0 });
    menuOverlay.style.pointerEvents = 'auto';
    gsap.to(menuOverlay, { opacity: 1, duration: 0.4 });
  });

  EventBus.on('game_started', (data: {timeLimit: number}) => {
    gsap.to(menuOverlay, { opacity: 0, duration: 0.3, onComplete: () => {
      menuOverlay.style.display = 'none';
      menuOverlay.style.pointerEvents = 'none';
    }});
    hudTimer.textContent       = String(data.timeLimit);
    hudPlayerStars.textContent = '1';
    hudEnemyStars.textContent  = '1';
    hudOverlay.style.display   = 'block';
  });

  EventBus.on('hud_update', (data: {playerStars:number, enemyStars:number, timeRemaining:number, total?:number, shipsLeft?:number}) => {
    hudTimer.textContent       = String(data.timeRemaining);
    // Repurpose HUD: left = planets evolved, right = enemy ships left
    hudPlayerStars.textContent = `${data.playerStars}/${data.total ?? '?'}`;
    hudEnemyStars.textContent  = String(data.shipsLeft ?? data.enemyStars);
    hudTimer.style.color        = data.timeRemaining <= 20 ? '#FF3355' : '#ffffff';
    hudTimer.style.textShadow   = data.timeRemaining <= 20 ? '0 0 12px #FF3355' : 'none';
  });


  EventBus.on('match_over', (data: {won:boolean, playerStars:number, enemyStars:number, stardust:number}) => {
    hudOverlay.style.display = 'none';

    resultSub.textContent   = data.won ? 'VICTORY' : 'DEFEAT';
    resultSub.style.color   = data.won ? '#00FF88' : '#FF3355';
    resultTitle.textContent = data.won ? 'Galaxy Defended' : 'Colony Lost';
    resultTitle.style.color = data.won ? '#00AAFF' : '#FF3355';

    resultPStars.textContent = String(data.playerStars); // planets evolved
    resultEStars.textContent = String(data.enemyStars);  // ships remaining
    resultDust.textContent   = `+${data.stardust}`;

    gsap.set(resultOverlay, { display: 'flex', opacity: 0, y: 30 });
    resultOverlay.style.pointerEvents = 'auto';
    gsap.to(resultOverlay, { opacity: 1, y: 0, duration: 0.45, ease: 'power2.out' });
  });

  // ── Button handlers ───────────────────────────────────────────────

  document.getElementById('btn-play')!.addEventListener('click', () => {
    AudioManager.resumeContext();
    EventBus.emit('ui_start_game');
  });

  document.getElementById('btn-pause')!.addEventListener('click', () => {
    EventBus.emit('ui_pause_game');
    gsap.set(pauseOverlay, { display: 'flex', opacity: 0 });
    pauseOverlay.style.pointerEvents = 'auto';
    gsap.to(pauseOverlay, { opacity: 1, duration: 0.25 });
  });

  document.getElementById('btn-resume')!.addEventListener('click', () => {
    gsap.to(pauseOverlay, { opacity: 0, duration: 0.2, onComplete: () => {
      pauseOverlay.style.display = 'none';
      pauseOverlay.style.pointerEvents = 'none';
      EventBus.emit('ui_resume_game');
    }});
  });

  document.getElementById('btn-quit')!.addEventListener('click', () => {
    gsap.to(pauseOverlay, { opacity: 0, duration: 0.2, onComplete: () => {
      pauseOverlay.style.display      = 'none';
      pauseOverlay.style.pointerEvents = 'none';
      hudOverlay.style.display        = 'none';
      EventBus.emit('ui_quit_game');
    }});
  });

  document.getElementById('btn-retry')!.addEventListener('click', () => {
    gsap.to(resultOverlay, { opacity: 0, y: 20, duration: 0.25, onComplete: () => {
      resultOverlay.style.display      = 'none';
      resultOverlay.style.pointerEvents = 'none';
      hudOverlay.style.display         = 'none';
      AudioManager.resumeContext();
      // Restart PlayScene directly (fixes freeze — MenuScene is not active here)
      game.scene.stop('PlayScene');
      game.scene.start('PlayScene');
    }});
  });

  document.getElementById('btn-result-menu')!.addEventListener('click', () => {
    gsap.to(resultOverlay, { opacity: 0, duration: 0.25, onComplete: () => {
      resultOverlay.style.display      = 'none';
      resultOverlay.style.pointerEvents = 'none';
      hudOverlay.style.display         = 'none';
      game.scene.start('MenuScene');
      EventBus.emit('menu_ready', {
        wins: GameProgress.getWins(),
        stardust: GameProgress.getStardust(),
      });
    }});
  });

  // Arsenal open/close
  document.getElementById('btn-arsenal')!.addEventListener('click', () => {
    arsenalStardust.textContent = String(GameProgress.getStardust());
    renderArsenal();
    gsap.set(arsenalOverlay, { display: 'flex', opacity: 0, y: 40 });
    arsenalOverlay.style.pointerEvents = 'auto';
    gsap.to(arsenalOverlay, { opacity: 1, y: 0, duration: 0.35, ease: 'power2.out' });
  });

  document.getElementById('btn-arsenal-close')!.addEventListener('click', () => {
    gsap.to(arsenalOverlay, { opacity: 0, y: 30, duration: 0.25, onComplete: () => {
      arsenalOverlay.style.display = 'none';
      arsenalOverlay.style.pointerEvents = 'none';
      // Refresh menu stats
      EventBus.emit('menu_ready', {
        wins: GameProgress.getWins(),
        stardust: GameProgress.getStardust(),
      });
    }});
  });

  // Arsenal tabs
  const TAB_ACTIVE  = 'border-b-2 border-[#00AAFF] text-[#00AAFF]';
  const TAB_INACTIVE = 'border-b-2 border-transparent text-slate-500';
  const tabTech       = document.getElementById('tab-tech')!;
  const tabArtifacts  = document.getElementById('tab-artifacts')!;
  const tabCosmetics  = document.getElementById('tab-cosmetics')!;

  function setTab(tab: 'tech' | 'artifacts' | 'cosmetics'): void {
    activeArsenalTab = tab;
    tabTech.className      = `flex-1 py-3 text-[11px] font-bold uppercase tracking-wider font-orbitron transition-all pointer-events-auto ${tab === 'tech'      ? TAB_ACTIVE : TAB_INACTIVE}`;
    tabArtifacts.className = `flex-1 py-3 text-[11px] font-bold uppercase tracking-wider font-orbitron transition-all pointer-events-auto ${tab === 'artifacts'  ? TAB_ACTIVE : TAB_INACTIVE}`;
    tabCosmetics.className = `flex-1 py-3 text-[11px] font-bold uppercase tracking-wider font-orbitron transition-all pointer-events-auto ${tab === 'cosmetics'  ? TAB_ACTIVE : TAB_INACTIVE}`;
    renderArsenal();
  }

  tabTech.addEventListener('click',      () => setTab('tech'));
  tabArtifacts.addEventListener('click', () => setTab('artifacts'));
  tabCosmetics.addEventListener('click', () => setTab('cosmetics'));

  // Settings
  document.getElementById('btn-settings')!.addEventListener('click', () => {
    sliderMusic.value = String(Math.round(GameProgress.getMusicVolume() * 100));
    sliderSfx.value   = String(Math.round(GameProgress.getSfxVolume()   * 100));
    lblMusic.textContent = sliderMusic.value + '%';
    lblSfx.textContent   = sliderSfx.value   + '%';
    gsap.set(settingsOverlay, { display: 'flex', opacity: 0, y: -30 });
    settingsOverlay.style.pointerEvents = 'auto';
    gsap.to(settingsOverlay, { opacity: 1, y: 0, duration: 0.3, ease: 'power2.out' });
  });

  document.getElementById('btn-settings-close')!.addEventListener('click', () => {
    gsap.to(settingsOverlay, { opacity: 0, y: -20, duration: 0.25, onComplete: () => {
      settingsOverlay.style.display = 'none';
      settingsOverlay.style.pointerEvents = 'none';
    }});
  });

  sliderMusic.addEventListener('input', () => {
    const v = parseInt(sliderMusic.value) / 100;
    lblMusic.textContent = sliderMusic.value + '%';
    AudioManager.setMusicVolume(v);
    GameProgress.setMusicVolume(v);
  });
  sliderSfx.addEventListener('input', () => {
    const v = parseInt(sliderSfx.value) / 100;
    lblSfx.textContent = sliderSfx.value + '%';
    AudioManager.setSfxVolume(v);
    GameProgress.setSfxVolume(v);
  });


  // ── How To Play ───────────────────────────────────────────────────
  const htpOverlay = document.getElementById('howtoplay-overlay')!;

  function openHowToPlay(): void {
    gsap.set(htpOverlay, { display: 'flex', opacity: 0 });
    htpOverlay.style.pointerEvents = 'auto';
    gsap.to(htpOverlay, { opacity: 1, duration: 0.35, ease: 'power2.out' });
    startDemoAnimation();
  }
  function closeHowToPlay(): void {
    gsap.to(htpOverlay, { opacity: 0, duration: 0.25, onComplete: () => {
      htpOverlay.style.display = 'none';
      htpOverlay.style.pointerEvents = 'none';
      stopDemoAnimation();
    }});
  }

  document.getElementById('btn-howtoplay')!.addEventListener('click', openHowToPlay);
  document.getElementById('btn-htp-close')!.addEventListener('click', closeHowToPlay);
  document.getElementById('btn-htp-play')!.addEventListener('click', () => {
    closeHowToPlay();
    AudioManager.resumeContext();
    EventBus.emit('ui_start_game');
  });

  // ── Demo canvas animation ─────────────────────────────────────────
  let demoRaf = 0;
  function stopDemoAnimation(): void {
    cancelAnimationFrame(demoRaf);
    demoRaf = 0;
  }

  function startDemoAnimation(): void {
    const canvas = document.getElementById('demo-canvas') as HTMLCanvasElement;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const W = canvas.width, H = canvas.height;

    // Demo stars
    const BLUE  = '#00AAFF', RED = '#FF3355', GREY = '#8899AA', GOLD = '#FFAA00';
    const stars = [
      { x: W/2,      y: H - 55,  r: 22, color: BLUE,  label: '25', owner: 'player', selected: false },
      { x: W/2 - 70, y: H/2 - 10, r: 18, color: GREY,  label: '8',  owner: 'neutral' },
      { x: W/2 + 65, y: H/2 + 20, r: 18, color: GREY,  label: '10', owner: 'neutral' },
      { x: W/2,      y: 55,      r: 22, color: RED,   label: '22', owner: 'enemy' },
    ];

    // Animation phases (each phase has a duration in ms)
    // Phase 0: idle, fade in stars
    // Phase 1: show "Tap your star" → tap effect on player star
    // Phase 2: selection ring + aim at neutral star
    // Phase 3: particles fly to neutral → neutral turns blue
    // Phase 4: aim at enemy → particles fly → loop
    const phases = [
      { dur: 1200, label: '' },
      { dur: 1400, label: '① Tap your blue star to select' },
      { dur: 1200, label: '② Now tap the grey neutral star' },
      { dur: 1600, label: '   Troops flying... ✈' },
      { dur: 1000, label: '   Captured! ✓' },
      { dur: 1400, label: '③ Tap enemy star to attack' },
      { dur: 1800, label: '   Troops flying... ✈' },
      { dur: 1000, label: '   Attacking! ⚔' },
    ];
    let phaseTime = 0;
    let phaseIdx  = 0;
    let startTs   = 0;
    let particles: Array<{x:number,y:number,tx:number,ty:number,prog:number,color:string}> = [];
    let neutral0Captured = false;
    let tapRipple: {x:number,y:number,r:number,alpha:number} | null = null;

    const totalDur = phases.reduce((a, p) => a + p.dur, 0);

    function lerp(a: number, b: number, t: number): number { return a + (b - a) * t; }

    function drawStar(s: typeof stars[0], glow: boolean, selectionPulse: number): void {
      const col = s.color;
      // Glow
      if (glow) {
        const g = ctx.createRadialGradient(s.x, s.y, s.r * 0.5, s.x, s.y, s.r * 2.5);
        g.addColorStop(0, col + '44'); g.addColorStop(1, col + '00');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(s.x, s.y, s.r * 2.5, 0, Math.PI * 2); ctx.fill();
      }
      // Body
      ctx.strokeStyle = col; ctx.lineWidth = 2;
      ctx.fillStyle   = col + '30'; ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill(); ctx.stroke();
      // Selection ring
      if (selectionPulse > 0) {
        ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2;
        ctx.globalAlpha = selectionPulse;
        ctx.beginPath(); ctx.arc(s.x, s.y, s.r + 7, 0, Math.PI * 2); ctx.stroke();
        ctx.globalAlpha = 1;
      }
      // Label
      ctx.fillStyle = '#ffffff'; ctx.font = 'bold 11px Orbitron, monospace';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(s.label, s.x, s.y);
    }

    function frame(ts: number): void {
      if (demoRaf === 0) return;
      if (startTs === 0) startTs = ts;
      const elapsed = (ts - startTs) % totalDur;

      // Compute phase
      let acc = 0;
      phaseIdx = 0; phaseTime = 0;
      for (let i = 0; i < phases.length; i++) {
        if (elapsed < acc + phases[i].dur) { phaseIdx = i; phaseTime = elapsed - acc; break; }
        acc += phases[i].dur;
      }
      const pt = phaseTime / phases[phaseIdx].dur; // 0..1 within phase

      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = '#060010'; ctx.fillRect(0, 0, W, H);

      // Background grid dots
      ctx.fillStyle = '#ffffff12';
      for (let gx = 10; gx < W; gx += 22) for (let gy = 10; gy < H; gy += 22) {
        ctx.beginPath(); ctx.arc(gx, gy, 0.8, 0, Math.PI * 2); ctx.fill();
      }

      // Connection lines (faint)
      ctx.strokeStyle = '#ffffff08'; ctx.lineWidth = 1;
      for (let i = 1; i < stars.length; i++) {
        ctx.beginPath(); ctx.moveTo(stars[0].x, stars[0].y);
        ctx.lineTo(stars[i].x, stars[i].y); ctx.stroke();
      }

      // Update particles
      if (phaseIdx === 3) {
        // Troops flying to neutral[0]
        if (particles.length === 0) {
          for (let i = 0; i < 5; i++) particles.push({ x: stars[0].x, y: stars[0].y, tx: stars[1].x, ty: stars[1].y, prog: i * 0.15, color: BLUE });
        }
      } else if (phaseIdx === 4) {
        neutral0Captured = true; particles = [];
        stars[1].color = BLUE; stars[1].label = '4'; stars[1].owner = 'player';
      } else if (phaseIdx === 6) {
        if (particles.length === 0) {
          for (let i = 0; i < 5; i++) particles.push({ x: stars[0].x, y: stars[0].y, tx: stars[3].x, ty: stars[3].y, prog: i * 0.15, color: BLUE });
        }
      } else if (phaseIdx === 7 || phaseIdx === 0) {
        particles = [];
        if (phaseIdx === 0 && pt < 0.2) { neutral0Captured = false; stars[1].color = GREY; stars[1].label = '8'; stars[1].owner = 'neutral'; stars[3].color = RED; stars[3].label = '22'; }
      }

      // Draw particles
      for (const p of particles) {
        p.prog = Math.min(1, p.prog + 0.012);
        const px = lerp(p.x, p.tx, p.prog), py = lerp(p.y, p.ty, p.prog);
        ctx.fillStyle = p.color; ctx.globalAlpha = 0.9;
        ctx.beginPath(); ctx.arc(px, py, 4, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 0.25;
        ctx.beginPath(); ctx.arc(px, py, 8, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1;
      }

      // Tap ripple
      if (phaseIdx === 1 && pt > 0.3 && pt < 0.9) {
        const r = 6 + (pt - 0.3) * 30;
        ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.5;
        ctx.globalAlpha = Math.max(0, 0.7 - (pt - 0.3));
        ctx.beginPath(); ctx.arc(stars[0].x, stars[0].y, r, 0, Math.PI * 2); ctx.stroke();
        ctx.globalAlpha = 1;
      }

      // Draw stars
      const selPulse = (phaseIdx === 2 || phaseIdx === 3) ? 0.5 + 0.4 * Math.sin(ts * 0.01) : 0;
      const selPulseEn = (phaseIdx === 5 || phaseIdx === 6) ? 0.5 + 0.4 * Math.sin(ts * 0.01) : 0;
      for (let i = 0; i < stars.length; i++) {
        const glow = i === 0 || (neutral0Captured && i === 1);
        const sp   = i === 0 ? selPulse : (i === 3 ? selPulseEn : 0);
        drawStar(stars[i], glow, sp);
      }

      // Aim line
      if (phaseIdx === 2 || phaseIdx === 3) {
        ctx.strokeStyle = BLUE + '60'; ctx.lineWidth = 1.5; ctx.setLineDash([5, 5]);
        ctx.beginPath(); ctx.moveTo(stars[0].x, stars[0].y); ctx.lineTo(stars[1].x, stars[1].y); ctx.stroke();
        ctx.setLineDash([]);
      }
      if (phaseIdx === 5 || phaseIdx === 6) {
        ctx.strokeStyle = BLUE + '60'; ctx.lineWidth = 1.5; ctx.setLineDash([5, 5]);
        ctx.beginPath(); ctx.moveTo(stars[0].x, stars[0].y); ctx.lineTo(stars[3].x, stars[3].y); ctx.stroke();
        ctx.setLineDash([]);
      }

      // Phase label
      const label = phases[phaseIdx].label;
      if (label) {
        ctx.font = '11px "Space Grotesk", sans-serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillStyle = '#ffffff'; ctx.globalAlpha = Math.min(1, pt * 4);
        ctx.fillText(label, W / 2, H - 16);
        ctx.globalAlpha = 1;
      }

      demoRaf = requestAnimationFrame(frame);
    }

    demoRaf = requestAnimationFrame(frame);
  }

  // ── Arsenal render ─────────────────────────────────────────────────
  function renderArsenal(): void {
    arsenalContent.innerHTML = '';
    arsenalStardust.textContent = String(GameProgress.getStardust());

    if (activeArsenalTab === 'tech') {
      for (const upg of TECH_UPGRADES) {
        const level  = GameProgress.getTechLevel(upg.id as Parameters<typeof GameProgress.getTechLevel>[0]);
        const maxed  = level >= 3;
        const cost   = upg.costs[level] ?? 0;

        const card = document.createElement('div');
        card.className = 'bg-[#0C001F] border border-[#ffffff06] rounded-2xl p-4 flex justify-between items-start gap-3';
        card.innerHTML = `
          <div class="flex-1 min-w-0">
            <div class="text-sm font-black text-[#00AAFF] font-orbitron uppercase tracking-wide truncate">${upg.name}</div>
            <div class="text-[10px] text-slate-400 mt-0.5 leading-snug">${upg.desc}</div>
            <div class="flex gap-1 mt-2">
              ${[0,1,2].map(i => `<div class="w-4 h-1 rounded-full ${i < level ? 'bg-[#00AAFF]' : 'bg-[#1A003A]'}"></div>`).join('')}
            </div>
          </div>
          <div class="shrink-0">
            ${maxed
              ? `<div class="px-3 py-1.5 rounded-xl bg-[#1A003A] text-slate-600 text-[10px] font-bold font-orbitron uppercase">MAXED</div>`
              : `<button class="buy-tech px-3 py-2 rounded-xl font-black text-black text-[10px] uppercase font-orbitron active:scale-95 transition-all flex flex-col items-center"
                   style="background:linear-gradient(135deg,#00AAFF,#8855FF)" data-id="${upg.id}" data-cost="${cost}">
                   <span>Upgrade</span>
                   <span class="text-[8px] font-extrabold text-[#002040] mt-0.5">${cost} ✦</span>
                 </button>`
            }
          </div>`;
        arsenalContent.appendChild(card);
      }

      arsenalContent.querySelectorAll('.buy-tech').forEach(btn => {
        btn.addEventListener('click', () => {
          const id   = (btn as HTMLElement).dataset.id as Parameters<typeof GameProgress.upgradeTech>[0];
          const cost = parseInt((btn as HTMLElement).dataset.cost ?? '0');
          if (GameProgress.upgradeTech(id, cost)) {
            AudioManager.playBuy();
            renderArsenal();
          } else {
            AudioManager.playError();
          }
        });
      });
    }

    else if (activeArsenalTab === 'artifacts') {
      const owned    = GameProgress.getOwnedArtifacts();
      const equipped = GameProgress.getEquippedArtifacts();

      for (const art of ARTIFACTS) {
        const isOwned    = owned.includes(art.id);
        const isEquipped = equipped.includes(art.id);

        const card = document.createElement('div');
        card.className = `bg-[#0C001F] rounded-2xl p-4 flex justify-between items-start gap-3 border transition-all ${isEquipped ? 'border-[#FFAA0050]' : 'border-[#ffffff06]'}`;
        card.innerHTML = `
          <div class="flex-1 min-w-0">
            <div class="text-sm font-black text-[#FFAA00] font-orbitron uppercase tracking-wide truncate">${art.name}
              ${isEquipped ? '<span class="ml-1 text-[8px] bg-[#FFAA0020] text-[#FFAA00] px-1.5 py-0.5 rounded font-orbitron">EQUIPPED</span>' : ''}
            </div>
            <div class="text-[10px] text-slate-400 mt-0.5 leading-snug">${art.desc}</div>
          </div>
          <div class="shrink-0">
            ${isOwned
              ? `<button class="equip-art px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase font-orbitron active:scale-95 transition-all border ${isEquipped ? 'text-[#FFAA00] border-[#FFAA0050] bg-[#FFAA0010]' : 'text-slate-300 border-[#ffffff12] bg-[#1A003A]'}" data-id="${art.id}">${isEquipped ? '✓ Unequip' : 'Equip'}</button>`
              : `<button class="buy-art px-3 py-2 rounded-xl font-black text-black text-[10px] uppercase font-orbitron active:scale-95 transition-all flex flex-col items-center" style="background:linear-gradient(135deg,#FFAA00,#FF6600)" data-id="${art.id}" data-cost="${art.cost}">
                   <span>Buy</span><span class="text-[8px] font-extrabold text-[#3a1a00] mt-0.5">${art.cost} ✦</span>
                 </button>`
            }
          </div>`;
        arsenalContent.appendChild(card);
      }

      arsenalContent.querySelectorAll('.buy-art').forEach(btn => {
        btn.addEventListener('click', () => {
          const id   = (btn as HTMLElement).dataset.id!;
          const cost = parseInt((btn as HTMLElement).dataset.cost ?? '0');
          if (GameProgress.buyArtifact(id, cost)) { AudioManager.playBuy(); renderArsenal(); }
          else                                     { AudioManager.playError(); }
        });
      });
      arsenalContent.querySelectorAll('.equip-art').forEach(btn => {
        btn.addEventListener('click', () => {
          GameProgress.equipArtifact((btn as HTMLElement).dataset.id!);
          renderArsenal();
        });
      });
    }

    else {
      // Cosmetics
      const owned  = GameProgress.getOwnedCosmetics();
      const curCol = GameProgress.getActiveStarColor();
      const curSha = GameProgress.getActiveParticleShape();

      // Star colour section
      const secHeader = (t: string): HTMLElement => {
        const d = document.createElement('div');
        d.className = 'text-[10px] text-slate-500 uppercase tracking-widest font-orbitron px-1 pt-1';
        d.textContent = t;
        return d;
      };
      arsenalContent.appendChild(secHeader('Star Colour'));

      for (const c of STAR_COSMETICS) {
        const isOwned  = owned.includes(c.id);
        const isActive = curCol === c.hex;
        const color    = `#${c.hex}`;

        const card = document.createElement('div');
        card.className = `bg-[#0C001F] rounded-2xl p-3 flex justify-between items-center gap-3 border transition-all ${isActive ? 'border-[#ffffff25]' : 'border-[#ffffff06]'}`;
        card.innerHTML = `
          <div class="flex items-center gap-3">
            <div class="w-5 h-5 rounded-full shrink-0" style="background:${color};box-shadow:0 0 8px ${color}55"></div>
            <span class="text-sm font-bold text-white font-grotesk">${c.name}</span>
          </div>
          <div class="shrink-0">
            ${isActive
              ? `<div class="px-3 py-1 rounded-xl text-[10px] font-bold font-orbitron" style="background:#${c.hex}20;color:${color}">ACTIVE</div>`
              : isOwned
              ? `<button class="apply-color px-3 py-1 rounded-xl text-[10px] font-bold text-slate-300 border border-[#ffffff12] bg-[#1A003A] font-orbitron active:scale-95" data-hex="${c.hex}">Apply</button>`
              : `<button class="buy-color px-3 py-1.5 rounded-xl font-black text-black text-[10px] font-orbitron active:scale-95 flex items-center gap-1" style="background:linear-gradient(135deg,${color},#8855FF)" data-id="${c.id}" data-hex="${c.hex}" data-cost="${c.cost}">${c.cost} ✦</button>`
            }
          </div>`;
        arsenalContent.appendChild(card);
      }

      arsenalContent.appendChild(secHeader('Particle Shape'));

      for (const p of PARTICLE_COSMETICS) {
        const isOwned  = owned.includes(p.id);
        const isActive = curSha === p.shape;

        const card = document.createElement('div');
        card.className = `bg-[#0C001F] rounded-2xl p-3 flex justify-between items-center gap-3 border transition-all ${isActive ? 'border-[#ffffff25]' : 'border-[#ffffff06]'}`;
        card.innerHTML = `
          <span class="text-sm font-bold text-white font-grotesk">${p.name}</span>
          <div class="shrink-0">
            ${isActive
              ? `<div class="px-3 py-1 rounded-xl text-[10px] font-bold text-[#00AAFF] bg-[#00AAFF15] font-orbitron">ACTIVE</div>`
              : isOwned
              ? `<button class="apply-shape px-3 py-1 rounded-xl text-[10px] font-bold text-slate-300 border border-[#ffffff12] bg-[#1A003A] font-orbitron active:scale-95" data-shape="${p.shape}">Apply</button>`
              : `<button class="buy-shape px-3 py-1.5 rounded-xl font-black text-black text-[10px] font-orbitron active:scale-95 flex items-center gap-1" style="background:linear-gradient(135deg,#00AAFF,#8855FF)" data-id="${p.id}" data-shape="${p.shape}" data-cost="${p.cost}">${p.cost} ✦</button>`
            }
          </div>`;
        arsenalContent.appendChild(card);
      }

      // Bind buy/apply
      arsenalContent.querySelectorAll('.buy-color').forEach(btn => {
        btn.addEventListener('click', () => {
          const el   = btn as HTMLElement;
          const cost = parseInt(el.dataset.cost ?? '0');
          if (GameProgress.buyCosmetic(el.dataset.id!, cost)) {
            GameProgress.setActiveStarColor(el.dataset.hex!);
            AudioManager.playBuy(); renderArsenal();
          } else { AudioManager.playError(); }
        });
      });
      arsenalContent.querySelectorAll('.apply-color').forEach(btn => {
        btn.addEventListener('click', () => {
          GameProgress.setActiveStarColor((btn as HTMLElement).dataset.hex!);
          renderArsenal();
        });
      });
      arsenalContent.querySelectorAll('.buy-shape').forEach(btn => {
        btn.addEventListener('click', () => {
          const el   = btn as HTMLElement;
          const cost = parseInt(el.dataset.cost ?? '0');
          if (GameProgress.buyCosmetic(el.dataset.id!, cost)) {
            GameProgress.setActiveParticleShape(el.dataset.shape!);
            AudioManager.playBuy(); renderArsenal();
          } else { AudioManager.playError(); }
        });
      });
      arsenalContent.querySelectorAll('.apply-shape').forEach(btn => {
        btn.addEventListener('click', () => {
          GameProgress.setActiveParticleShape((btn as HTMLElement).dataset.shape!);
          renderArsenal();
        });
      });
    }
  }
})();
