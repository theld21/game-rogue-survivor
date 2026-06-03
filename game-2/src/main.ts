import './index.css';
import Phaser from 'phaser';
import { gsap } from 'gsap';
import BootScene from './scenes/BootScene.ts';
import MenuScene from './scenes/MenuScene.ts';
import PlayScene from './scenes/PlayScene.ts';
import EventBus from './EventBus.ts';
import AudioManager from './utils/AudioManager.ts';
import GameProgress from './utils/GameProgress.ts';

// -------------------------------------------------------------
// I. PHASER INSTANCE CONFIGURATION (iOS High-DPI Scale Blueprint)
// -------------------------------------------------------------
const dpr = window.devicePixelRatio || 1;

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.WEBGL,
  width: window.innerWidth * dpr,
  height: window.innerHeight * dpr,
  parent: 'game-container',
  backgroundColor: '#05020c',
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 0 },
      debug: false
    }
  },
  scale: {
    mode: Phaser.Scale.NONE,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  render: {
    antialias: true,
    roundPixels: true,
    resolution: dpr
  } as any,
  scene: [BootScene, MenuScene, PlayScene]
};

const game = new Phaser.Game(config);

// Dynamic physical scale adjustments on rotation or resizing
window.addEventListener('resize', () => {
  const currentDpr = window.devicePixelRatio || 1;
  game.scale.resize(window.innerWidth * currentDpr, window.innerHeight * currentDpr);
});


// -------------------------------------------------------------
// II. DOM HTML OVERLAY DRIVER (GSAP, Tailwind, daisyUI)
// -------------------------------------------------------------

// Active State
let activeShopTab: 'upgrades' | 'trails' = 'upgrades';

// UI Nodes
const loadingScreen = document.getElementById('loading-screen')!;
const loadingProgress = document.getElementById('loading-progress')!;
const loadingStatus = document.getElementById('loading-status')!;

const menuOverlay = document.getElementById('menu-overlay')!;
const menuHighScore = document.getElementById('menu-highscore')!;
const menuHighestSector = document.getElementById('menu-highest-sector')!;
const menuShards = document.getElementById('menu-shards')!;
const btnContinue = document.getElementById('btn-continue')!;

const hudOverlay = document.getElementById('hud-overlay')!;
const hudLevel = document.getElementById('hud-level')!;
const hudScore = document.getElementById('hud-score')!;
const hudShardsCollected = document.getElementById('hud-shards-collected')!;
const hudShardsNeeded = document.getElementById('hud-shards-needed')!;
const hudDashDots = document.getElementById('hud-dash-dots')!;

const shopOverlay = document.getElementById('shop-overlay')!;
const shopBalance = document.getElementById('shop-balance')!;
const shopContent = document.getElementById('shop-content')!;
const tabUpgrades = document.getElementById('tab-upgrades')!;
const tabTrails = document.getElementById('tab-trails')!;

const settingsOverlay = document.getElementById('settings-overlay')!;
const pauseOverlay = document.getElementById('pause-overlay')!;
const gameoverOverlay = document.getElementById('gameover-overlay')!;

// 1. EVENTBUS SYNC HOOKS (Loading, Scenes, and HUDs)

// A. Loader progression
EventBus.on('load_progress', (value: number) => {
  const percentage = Math.floor(value * 100);
  gsap.to(loadingProgress, { width: `${percentage}%`, duration: 0.1 });
  
  if (value < 0.4) {
    loadingStatus.innerText = 'Synthesizing Vectored Space...';
  } else if (value < 0.8) {
    loadingStatus.innerText = 'Harmonizing Gravitational Waves...';
  } else {
    loadingStatus.innerText = 'Generating Neon Cores...';
  }
});

EventBus.on('load_complete', () => {
  // Fade out loader smoothly
  gsap.to(loadingScreen, {
    opacity: 0,
    duration: 0.4,
    onComplete: () => {
      loadingScreen.style.display = 'none';
      loadingScreen.style.pointerEvents = 'none';
    }
  });
});

// B. Main menu entry
EventBus.on('menu_ready', () => {
  GameProgress.load();
  menuHighScore.innerText = GameProgress.getHighScore().toString();
  menuShards.innerText = GameProgress.getShards().toString();
  
  const highestSec = GameProgress.getHighestSector();
  menuHighestSector.innerText = `Sector ${highestSec}`;
  
  const btnPlay = document.getElementById('btn-play')!;
  if (highestSec > 1) {
    btnContinue.style.display = 'block';
    btnContinue.style.pointerEvents = 'auto';
    btnContinue.innerText = `Continue Sector ${highestSec}`;
    btnPlay.innerText = 'New Campaign';
    btnPlay.className = 'w-full py-4 bg-[#171032cf] text-slate-300 hover:text-white font-black uppercase text-sm tracking-[0.15em] rounded-xl shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all duration-150 font-orbitron border border-slate-700 bg-clip-padding';
  } else {
    btnContinue.style.display = 'none';
    btnContinue.style.pointerEvents = 'none';
    btnPlay.innerText = 'Enter Orbit';
    btnPlay.className = 'w-full py-4 bg-gradient-to-r from-[#00f0ff] to-[#d946ef] text-black font-black uppercase text-sm tracking-[0.15em] rounded-xl shadow-[0_0_20px_rgba(0,240,255,0.4)] hover:scale-[1.02] active:scale-[0.98] transition-all duration-150 font-orbitron border border-[#ffffff20] bg-clip-padding';
  }
  
  // Transition in Main Menu overlays
  gsap.set(menuOverlay, { display: 'flex', opacity: 0 });
  menuOverlay.style.pointerEvents = 'auto';
  gsap.to(menuOverlay, { opacity: 1, duration: 0.35 });
});

// C. Sector play starts
EventBus.on('play_started', (data: { sector: number; shardsNeeded: number; score: number }) => {
  // Fade out menu
  gsap.to(menuOverlay, {
    opacity: 0,
    duration: 0.3,
    onComplete: () => {
      menuOverlay.style.display = 'none';
      menuOverlay.style.pointerEvents = 'none';
    }
  });
  
  // Sync initial HUD states
  hudLevel.innerText = `SECTOR ${data.sector}`;
  hudScore.innerText = String(data.score).padStart(5, '0');
  hudShardsCollected.innerText = '0';
  hudShardsNeeded.innerText = String(data.shardsNeeded);
  
  // Draw dash indicators
  drawDashCharges(GameProgress.getMaxDashes(), GameProgress.getMaxDashes());

  // Show HUD
  hudOverlay.style.display = 'flex';
});

// D. HUD Updaters
EventBus.on('hud_shards_update', (data: { collected: number; needed: number }) => {
  hudShardsCollected.innerText = String(data.collected);
  hudShardsNeeded.innerText = String(data.needed);
  
  // Flash collected score
  gsap.fromTo(hudShardsCollected, { scale: 1.3, color: '#ffffff' }, { scale: 1, color: '#d946ef', duration: 0.2 });
});

EventBus.on('hud_score_update', (score: number) => {
  hudScore.innerText = String(score).padStart(5, '0');
});

EventBus.on('dash_update', (data: { remaining: number; max: number }) => {
  drawDashCharges(data.remaining, data.max);
});

// E. Game end triggers (Win vs Loss)
EventBus.on('campaign_won', (data: { score: number; shardsEarned: number }) => {
  hudOverlay.style.display = 'none';
  
  const textSub = document.getElementById('gameover-sub')!;
  const textTitle = document.getElementById('gameover-title')!;
  const textScore = document.getElementById('gameover-score')!;
  const textShards = document.getElementById('gameover-shards')!;
  const btnRetry = document.getElementById('btn-retry')!;

  textSub.innerText = `CAMPAIGN COMPLETED`;
  textSub.className = 'text-xs text-[#fbbf24] font-bold uppercase tracking-widest font-orbitron';
  textTitle.innerText = 'GALAXY CONQUERED';
  textTitle.className = 'text-3xl font-black tracking-widest text-[#fbbf24] uppercase font-orbitron';
  
  textScore.innerText = `Total Score: ${data.score}`;
  textShards.innerText = `+${data.shardsEarned}`;
  btnRetry.innerText = 'Return to Menu';
  
  btnRetry.onclick = () => {
    const playScene = game.scene.getScene('PlayScene') as PlayScene;
    (playScene as any).currentSector = 1;
    
    gsap.to(gameoverOverlay, {
      opacity: 0,
      duration: 0.25,
      onComplete: () => {
        gameoverOverlay.style.display = 'none';
        gameoverOverlay.style.pointerEvents = 'none';
        EventBus.emit('ui_quit_game');
      }
    });
  };

  gsap.set(gameoverOverlay, { display: 'flex', opacity: 0 });
  gsap.to(gameoverOverlay, {
    opacity: 1,
    duration: 0.35,
    onComplete: () => {
      gameoverOverlay.style.pointerEvents = 'auto';
    }
  });
});

EventBus.on('sector_cleared', (data: { sector: number; score: number; shardsEarned: number }) => {
  hudOverlay.style.display = 'none';
  
  const textSub = document.getElementById('gameover-sub')!;
  const textTitle = document.getElementById('gameover-title')!;
  const textScore = document.getElementById('gameover-score')!;
  const textShards = document.getElementById('gameover-shards')!;
  const btnRetry = document.getElementById('btn-retry')!;

  textSub.innerText = `SECTOR ${data.sector} CLEARED`;
  textSub.className = 'text-xs text-[#00f0ff] font-bold uppercase tracking-widest font-orbitron';
  textTitle.innerText = 'ORBIT CAPTURED';
  textTitle.className = 'text-3xl font-black tracking-widest text-[#22c55e] uppercase font-orbitron';
  
  textScore.innerText = `Sector ${data.sector}`;
  textShards.innerText = `+${data.shardsEarned}`;
  btnRetry.innerText = 'Next Sector';
  
  // Setup callback to progress sector
  btnRetry.onclick = () => {
    const playScene = game.scene.getScene('PlayScene') as PlayScene;
    playScene.currentSector += 1;
    
    gsap.to(gameoverOverlay, {
      opacity: 0,
      duration: 0.25,
      onComplete: () => {
        gameoverOverlay.style.display = 'none';
        gameoverOverlay.style.pointerEvents = 'none';
        EventBus.emit('ui_retry_game');
      }
    });
  };

  gsap.set(gameoverOverlay, { display: 'flex', opacity: 0 });
  gameoverOverlay.style.pointerEvents = 'auto';
  gsap.to(gameoverOverlay, { opacity: 1, duration: 0.35 });
});

EventBus.on('game_over', (data: { score: number; sectors: number; shardsEarned: number }) => {
  hudOverlay.style.display = 'none';
  
  const textSub = document.getElementById('gameover-sub')!;
  const textTitle = document.getElementById('gameover-title')!;
  const textScore = document.getElementById('gameover-score')!;
  const textShards = document.getElementById('gameover-shards')!;
  const btnRetry = document.getElementById('btn-retry')!;

  textSub.innerText = 'ORBIT DECAY';
  textSub.className = 'text-xs text-rose-500 font-bold uppercase tracking-widest font-orbitron';
  textTitle.innerText = 'SYSTEM COLLAPSE';
  textTitle.className = 'text-3xl font-black tracking-widest text-[#ff007f] uppercase font-orbitron';
  
  textScore.innerText = String(data.sectors);
  textShards.innerText = `+${data.shardsEarned}`;
  btnRetry.innerText = 'Re-Orbit';
  
  // Restart same sector
  btnRetry.onclick = () => {
    gsap.to(gameoverOverlay, {
      opacity: 0,
      duration: 0.25,
      onComplete: () => {
        gameoverOverlay.style.display = 'none';
        gameoverOverlay.style.pointerEvents = 'none';
        EventBus.emit('ui_retry_game');
      }
    });
  };

  gsap.set(gameoverOverlay, { display: 'flex', opacity: 0 });
  gameoverOverlay.style.pointerEvents = 'auto';
  gsap.to(gameoverOverlay, { opacity: 1, duration: 0.35 });
});


// 2. UI NAVIGATION BUTTON CLICK TRIGGERS

// Play Button (starts at Sector 1, resets score)
document.getElementById('btn-play')!.addEventListener('click', () => {
  AudioManager.resumeContext();
  const playScene = game.scene.getScene('PlayScene') as PlayScene;
  if (playScene) {
    playScene.currentSector = 1;
    playScene.score = 0;
  }
  EventBus.emit('ui_start_game');
});

// Continue Button (starts at highest unlocked sector, resets run score)
btnContinue.addEventListener('click', () => {
  AudioManager.resumeContext();
  const playScene = game.scene.getScene('PlayScene') as PlayScene;
  if (playScene) {
    playScene.currentSector = GameProgress.getHighestSector();
    playScene.score = 0;
  }
  EventBus.emit('ui_start_game');
});

// Upgrades Store Panel Toggle
document.getElementById('btn-shop')!.addEventListener('click', () => {
  renderShop();
  gsap.set(shopOverlay, { display: 'flex', opacity: 0, y: 50 });
  shopOverlay.style.pointerEvents = 'auto';
  gsap.to(shopOverlay, { opacity: 1, y: 0, duration: 0.3, ease: 'power2.out' });
});

document.getElementById('btn-shop-close')!.addEventListener('click', () => {
  gsap.to(shopOverlay, {
    opacity: 0,
    y: 50,
    duration: 0.25,
    onComplete: () => {
      shopOverlay.style.display = 'none';
      shopOverlay.style.pointerEvents = 'none';
      // Refresh menu high-scores/shards in case they spent currency
      EventBus.emit('menu_ready');
    }
  });
});

// Audio Settings Panels Toggle
document.getElementById('btn-settings')!.addEventListener('click', () => {
  syncAudioSliders();
  gsap.set(settingsOverlay, { display: 'flex', opacity: 0, y: -50 });
  settingsOverlay.style.pointerEvents = 'auto';
  gsap.to(settingsOverlay, { opacity: 1, y: 0, duration: 0.3, ease: 'power2.out' });
});

document.getElementById('btn-settings-close')!.addEventListener('click', () => {
  gsap.to(settingsOverlay, {
    opacity: 0,
    y: -50,
    duration: 0.25,
    onComplete: () => {
      settingsOverlay.style.display = 'none';
      settingsOverlay.style.pointerEvents = 'none';
    }
  });
});

// In-Game Pause Trigger
document.getElementById('btn-pause')!.addEventListener('click', () => {
  EventBus.emit('ui_pause_game');
  syncAudioSliders();
  gsap.set(pauseOverlay, { display: 'flex', opacity: 0 });
  pauseOverlay.style.pointerEvents = 'auto';
  gsap.to(pauseOverlay, { opacity: 1, duration: 0.25 });
});

document.getElementById('btn-resume')!.addEventListener('click', () => {
  gsap.to(pauseOverlay, {
    opacity: 0,
    duration: 0.2,
    onComplete: () => {
      pauseOverlay.style.display = 'none';
      pauseOverlay.style.pointerEvents = 'none';
      EventBus.emit('ui_resume_game');
    }
  });
});

document.getElementById('btn-quit')!.addEventListener('click', () => {
  gsap.to(pauseOverlay, {
    opacity: 0,
    duration: 0.25,
    onComplete: () => {
      pauseOverlay.style.display = 'none';
      pauseOverlay.style.pointerEvents = 'none';
      hudOverlay.style.display = 'none';
      EventBus.emit('ui_quit_game');
      EventBus.emit('menu_ready');
    }
  });
});

document.getElementById('btn-gameover-lobby')!.addEventListener('click', () => {
  gsap.to(gameoverOverlay, {
    opacity: 0,
    duration: 0.25,
    onComplete: () => {
      gameoverOverlay.style.display = 'none';
      gameoverOverlay.style.pointerEvents = 'none';
      hudOverlay.style.display = 'none';
      EventBus.emit('ui_quit_game');
      EventBus.emit('menu_ready');
    }
  });
});


// 3. SHOP SYSTEM RENDERER AND BUSINESS LOGIC

tabUpgrades.addEventListener('click', () => {
  activeShopTab = 'upgrades';
  tabUpgrades.className = 'flex-1 py-2.5 border-b-2 border-[#d946ef] text-[#d946ef] text-xs font-black uppercase tracking-wider font-orbitron transition-all';
  tabTrails.className = 'flex-1 py-2.5 border-b-2 border-transparent text-slate-400 text-xs font-bold uppercase tracking-wider font-orbitron transition-all';
  renderShop();
});

tabTrails.addEventListener('click', () => {
  activeShopTab = 'trails';
  tabTrails.className = 'flex-1 py-2.5 border-b-2 border-[#d946ef] text-[#d946ef] text-xs font-black uppercase tracking-wider font-orbitron transition-all';
  tabUpgrades.className = 'flex-1 py-2.5 border-b-2 border-transparent text-slate-400 text-xs font-bold uppercase tracking-wider font-orbitron transition-all';
  renderShop();
});

function renderShop(): void {
  GameProgress.load();
  const currentShards = GameProgress.getShards();
  shopBalance.innerText = currentShards.toString();
  
  shopContent.innerHTML = '';
  
  if (activeShopTab === 'upgrades') {
    // --- Render attributes upgrades ---
    
    // Upgrade 1: Max Dashes
    const maxD = GameProgress.getMaxDashes();
    const dashUpgradeCost = maxD * 35; // 35, 70, 105 shards
    const dashMaxed = maxD >= 3;
    
    const cardDash = document.createElement('div');
    cardDash.className = 'bg-[#140e2d] border border-[#ffffff04] rounded-2xl p-4 flex justify-between items-center shadow-lg';
    cardDash.innerHTML = `
      <div class="flex flex-col gap-0.5">
        <span class="text-sm font-black uppercase tracking-wide text-cyan-300 font-orbitron">Hyper Dash Core</span>
        <span class="text-[10px] text-slate-400">Increase maximum mid-air dash charges. Current: <b>${maxD}</b></span>
        <div class="flex gap-1.5 mt-2">
          ${Array(3).fill(0).map((_, idx) => `
            <div class="w-3.5 h-1.5 rounded-full ${idx < maxD ? 'bg-[#00f0ff] shadow-[0_0_8px_#00f0ff]' : 'bg-slate-800'}"></div>
          `).join('')}
        </div>
      </div>
      <div>
        ${dashMaxed ? `
          <button class="btn btn-sm btn-disabled font-bold text-xs uppercase font-orbitron rounded-xl border border-slate-700 bg-transparent text-slate-500">MAXED</button>
        ` : `
          <button id="buy-dash" class="btn btn-sm py-2 px-4 h-auto bg-gradient-to-r from-[#00f0ff] to-[#d946ef] text-black border-none font-black text-xs uppercase font-orbitron rounded-xl shadow-[0_0_12px_rgba(0,240,255,0.25)] hover:scale-105 transition-transform active:scale-95 flex flex-col items-center">
            <span>Upgrade</span>
            <span class="text-[9px] text-[#2c0044] font-extrabold mt-0.5">${dashUpgradeCost} Shards</span>
          </button>
        `}
      </div>
    `;
    shopContent.appendChild(cardDash);
    
    if (!dashMaxed) {
      document.getElementById('buy-dash')!.addEventListener('click', () => {
        if (GameProgress.upgradeDashes(dashUpgradeCost)) {
          AudioManager.playLevelUp();
          renderShop();
        } else {
          AudioManager.playWarning();
        }
      });
    }

    // Upgrade 2: Unstable Planet timer
    const unstableTimer = GameProgress.getUnstableTimer();
    const timerUpgradeCost = (unstableTimer - 2) * 25; // 25, 50, 75 shards
    const timerMaxed = unstableTimer >= 6;
    
    const cardTimer = document.createElement('div');
    cardTimer.className = 'bg-[#140e2d] border border-[#ffffff04] rounded-2xl p-4 flex justify-between items-center shadow-lg';
    cardTimer.innerHTML = `
      <div class="flex flex-col gap-0.5">
        <span class="text-sm font-black uppercase tracking-wide text-rose-400 font-orbitron">Thermite Stasis</span>
        <span class="text-[10px] text-slate-400">Delay unstable planet detonations. Current: <b>${unstableTimer}s</b></span>
        <div class="flex gap-1.5 mt-2">
          ${Array(4).fill(0).map((_, idx) => `
            <div class="w-3.5 h-1.5 rounded-full ${idx < (unstableTimer - 2) ? 'bg-[#ef4444] shadow-[0_0_8px_#ef4444]' : 'bg-slate-800'}"></div>
          `).join('')}
        </div>
      </div>
      <div>
        ${timerMaxed ? `
          <button class="btn btn-sm btn-disabled font-bold text-xs uppercase font-orbitron rounded-xl border border-slate-700 bg-transparent text-slate-500">MAXED</button>
        ` : `
          <button id="buy-timer" class="btn btn-sm py-2 px-4 h-auto bg-gradient-to-r from-[#00f0ff] to-[#d946ef] text-black border-none font-black text-xs uppercase font-orbitron rounded-xl shadow-[0_0_12px_rgba(0,240,255,0.25)] hover:scale-105 transition-transform active:scale-95 flex flex-col items-center">
            <span>Upgrade</span>
            <span class="text-[9px] text-[#2c0044] font-extrabold mt-0.5">${timerUpgradeCost} Shards</span>
          </button>
        `}
      </div>
    `;
    shopContent.appendChild(cardTimer);
    
    if (!timerMaxed) {
      document.getElementById('buy-timer')!.addEventListener('click', () => {
        if (GameProgress.upgradeUnstableTimer(timerUpgradeCost)) {
          AudioManager.playLevelUp();
          renderShop();
        } else {
          AudioManager.playWarning();
        }
      });
    }
    
  } else {
    // --- Render particle cosmetic skin trails ---
    const activeTrail = GameProgress.getActiveTrail();
    const unlockedTrails = GameProgress.getUnlockedTrails();
    
    const skins = [
      { id: 'none', name: 'Default Cyan', desc: 'Sleek standard neon cyan light emissions.', cost: 0 },
      { id: 'rainbow', name: 'Spectrum Glide', desc: 'Chroma particle trail cycling through the HSL scale.', cost: 25 },
      { id: 'flame', name: 'Ignition Burn', desc: 'High velocity thermodynamic pink-gold heat sparks.', cost: 55 },
      { id: 'spectral', name: 'Ecto Shift', desc: 'Haunting purple micro-rings with delayed alpha decays.', cost: 95 }
    ];
    
    skins.forEach(skin => {
      const isUnlocked = unlockedTrails.includes(skin.id);
      const isActive = activeTrail === skin.id;
      
      const cardSkin = document.createElement('div');
      cardSkin.className = `border rounded-2xl p-4 flex justify-between items-center shadow-lg transition-all ${
        isActive ? 'bg-[#18113cf6] border-[#d946ef90]' : 'bg-[#140e2d] border-transparent'
      }`;
      
      let buttonHtml = '';
      if (isActive) {
        buttonHtml = `<button class="btn btn-sm btn-ghost text-[#d946ef] font-black text-xs uppercase font-orbitron rounded-xl border border-[#d946ef40] pointer-events-none">EQUIPPED</button>`;
      } else if (isUnlocked) {
        buttonHtml = `<button id="equip-${skin.id}" class="btn btn-sm py-2 px-4 h-auto bg-[#1a113d] border border-[#00f0ff70] text-[#00f0ff] font-bold text-xs uppercase font-orbitron rounded-xl hover:bg-[#00f0ff] hover:text-black transition-all">EQUIP</button>`;
      } else {
        buttonHtml = `
          <button id="buy-${skin.id}" class="btn btn-sm py-2 px-4 h-auto bg-gradient-to-r from-[#00f0ff] to-[#d946ef] text-black border-none font-black text-xs uppercase font-orbitron rounded-xl shadow-[0_0_12px_rgba(0,240,255,0.2)] hover:scale-105 active:scale-95 transition-transform flex flex-col items-center">
            <span>Unlock</span>
            <span class="text-[9px] text-[#2c0044] font-extrabold mt-0.5">${skin.cost} Shards</span>
          </button>
        `;
      }
      
      cardSkin.innerHTML = `
        <div class="flex flex-col gap-0.5 pr-4 max-w-[70%]">
          <span class="text-sm font-black uppercase tracking-wide font-orbitron flex items-center gap-2">
            ${skin.name}
            ${isActive ? '<span class="badge badge-sm badge-secondary text-[8px] font-extrabold uppercase font-orbitron px-1.5 py-0.5 rounded-full">ACTIVE</span>' : ''}
          </span>
          <span class="text-[10px] text-slate-400">${skin.desc}</span>
        </div>
        <div>
          ${buttonHtml}
        </div>
      `;
      
      shopContent.appendChild(cardSkin);
      
      // Bind click triggers
      if (isUnlocked && !isActive) {
        document.getElementById(`equip-${skin.id}`)!.addEventListener('click', () => {
          GameProgress.setActiveTrail(skin.id);
          AudioManager.playShard();
          renderShop();
        });
      } else if (!isUnlocked) {
        document.getElementById(`buy-${skin.id}`)!.addEventListener('click', () => {
          if (GameProgress.unlockTrail(skin.id, skin.cost)) {
            AudioManager.playLevelUp();
            GameProgress.setActiveTrail(skin.id);
            renderShop();
          } else {
            AudioManager.playWarning();
          }
        });
      }
    });
  }
}

// Draw Dash Charges Dots in HUD
function drawDashCharges(remaining: number, max: number): void {
  hudDashDots.innerHTML = '';
  for (let i = 0; i < max; i++) {
    const dot = document.createElement('div');
    if (i < remaining) {
      dot.className = 'w-2 h-2 rounded-full bg-[#00f0ff] shadow-[0_0_8px_#00f0ff] border border-white';
    } else {
      dot.className = 'w-2 h-2 rounded-full bg-slate-800 border border-[#ffffff10]';
    }
    hudDashDots.appendChild(dot);
  }
}


// -------------------------------------------------------------
// III. AUDIO SYNC CONTROLLERS
// -------------------------------------------------------------

// Input sliders
const sliderMusic = document.getElementById('slider-music') as HTMLInputElement;
const sliderSfx = document.getElementById('slider-sfx') as HTMLInputElement;
const sliderSettingsMusic = document.getElementById('slider-settings-music') as HTMLInputElement;
const sliderSettingsSfx = document.getElementById('slider-settings-sfx') as HTMLInputElement;

// Labels
const lblMusic = document.getElementById('lbl-music-volume')!;
const lblSfx = document.getElementById('lbl-sfx-volume')!;
const lblSettingsMusic = document.getElementById('lbl-settings-music')!;
const lblSettingsSfx = document.getElementById('lbl-settings-sfx')!;

function syncAudioSliders(): void {
  const musicVal = Math.floor(AudioManager.getMusicVolume() * 100);
  const sfxVal = Math.floor(AudioManager.getSfxVolume() * 100);
  
  // Set slider values
  sliderMusic.value = String(musicVal);
  sliderSfx.value = String(sfxVal);
  sliderSettingsMusic.value = String(musicVal);
  sliderSettingsSfx.value = String(sfxVal);
  
  // Update labels
  lblMusic.innerText = `${musicVal}%`;
  lblSfx.innerText = `${sfxVal}%`;
  lblSettingsMusic.innerText = `${musicVal}%`;
  lblSettingsSfx.innerText = `${sfxVal}%`;
}

// Bind Sliders Events
function handleSliderChange(slider: HTMLInputElement, label: HTMLElement, isMusic: boolean) {
  const value = parseInt(slider.value, 10);
  label.innerText = `${value}%`;
  
  if (isMusic) {
    AudioManager.setMusicVolume(value / 100);
  } else {
    AudioManager.setSfxVolume(value / 100);
  }
}

sliderMusic.addEventListener('input', () => handleSliderChange(sliderMusic, lblMusic, true));
sliderSfx.addEventListener('input', () => handleSliderChange(sliderSfx, lblSfx, false));
sliderSettingsMusic.addEventListener('input', () => handleSliderChange(sliderSettingsMusic, lblSettingsMusic, true));
sliderSettingsSfx.addEventListener('input', () => handleSliderChange(sliderSettingsSfx, lblSettingsSfx, false));
