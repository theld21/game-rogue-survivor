import './index.css';
import Phaser from 'phaser';
import { gsap } from 'gsap';
import Preloader from './scenes/Preloader.ts';
import Menu from './scenes/Menu.ts';
import GamePlay from './scenes/GamePlay.ts';
import Shop from './scenes/Shop.ts';
import EventBus from './EventBus.ts';
import GameState from './core/GameState.ts';
import AudioManager from './core/AudioManager.ts';
import { UPGRADES, UpgradeKey, CONSUMABLES, ConsumableKey } from './config.ts';

// =====================================================================
// main.ts — Phaser bootstrap + HTML/Tailwind overlay driver.
// Scenes emit gameplay state; this file owns the DOM and wires intents
// back through the EventBus.
// =====================================================================

// ---- Phaser instance (iOS high-DPI, responsive) ----
// Internal resolution = viewport × DPR (crisp on retina); Scale.FIT lets
// Phaser scale the canvas via CSS to fit the viewport exactly. Using NONE
// here would render the canvas at native pixel size (3× too big on iPhone,
// pushing the bottom-anchored ship off-screen).
const dpr = Math.min(window.devicePixelRatio || 1, 2);
const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.WEBGL,
  parent: 'game-container',
  backgroundColor: '#05060f',
  physics: { default: 'arcade', arcade: { gravity: { x: 0, y: 0 }, debug: false } },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: window.innerWidth * dpr,
    height: window.innerHeight * dpr,
  },
  render: { antialias: true, roundPixels: false } as any,
  scene: [Preloader, Menu, GamePlay, Shop],
};
const game = new Phaser.Game(config);
window.addEventListener('resize', () => game.scale.refresh());
window.addEventListener('orientationchange', () => game.scale.refresh());

// ---- DOM helpers ----
const $ = (id: string) => document.getElementById(id)!;
const show = (id: string, display = 'flex') => ($(id).style.display = display);
const hide = (id: string) => ($(id).style.display = 'none');

// Inline SVG icon set (stroke = currentColor) — replaces emoji on UI chrome.
const svg = (paths: string, sw = 2) =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" width="100%" height="100%">${paths}</svg>`;

const ICONS = {
  // crosshair / laser targeting
  laser: svg('<circle cx="12" cy="12" r="7"/><line x1="12" y1="1" x2="12" y2="5"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="1" y1="12" x2="5" y2="12"/><line x1="19" y1="12" x2="23" y2="12"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/>'),
  // mechanical claw / gripper
  claw: svg('<path d="M12 3v6"/><path d="M8 9 5 5"/><path d="m16 9 3-4"/><path d="M7 9h10l-1.5 7a3.5 3.5 0 0 1-7 0z"/><circle cx="12" cy="20" r="1.5"/>'),
  // battery / fuel cell
  fuel: svg('<rect x="2" y="7" width="16" height="10" rx="2"/><line x1="22" y1="11" x2="22" y2="13"/><line x1="6" y1="10" x2="6" y2="14"/><line x1="10" y1="10" x2="10" y2="14"/>'),
  // radar sweep
  radar: svg('<path d="M12 12 19 5"/><path d="M4.93 19.07a10 10 0 1 1 14.14 0"/><path d="M7.76 16.24a6 6 0 1 1 8.48 0"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/>'),
  // energy bolt
  bolt: svg('<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" fill="currentColor" stroke="none"/>'),
  // shield
  shield: svg('<path d="M12 2 4 5v6c0 5 3.4 8.5 8 10 4.6-1.5 8-5 8-10V5z"/>'),
  // magnet (tractor)
  magnet: svg('<path d="M6 3v7a6 6 0 0 0 12 0V3"/><line x1="6" y1="3" x2="10" y2="3"/><line x1="14" y1="3" x2="18" y2="3"/><line x1="8" y1="10" x2="8" y2="3"/><line x1="16" y1="10" x2="16" y2="3"/>'),
  // overcharge (double bolt)
  overcharge: svg('<polygon points="11 2 4 13 10 13 9 22 16 11 10 11 11 2" fill="currentColor" stroke="none"/>'),
  // multishot (spread)
  multishot: svg('<path d="M12 20V8"/><path d="m6 20 2-9"/><path d="m18 20-2-9"/><circle cx="12" cy="5" r="2.5"/>'),
};

const CONSUMABLE_ICONS: Record<string, string> = {
  magnet: ICONS.magnet,
  overcharge: ICONS.overcharge,
  multishot: ICONS.multishot,
};

/** Render an inline SVG icon string into an element keyed by id. */
function setIcon(id: string, icon: string): void {
  const el = document.getElementById(id);
  if (el) el.innerHTML = icon;
}

const UPGRADE_META: Record<UpgradeKey, { name: string; desc: string; icon: string; color: string }> = {
  laser: { name: 'Laser Intensity', desc: 'Break asteroids faster', icon: ICONS.laser, color: '#00f0ff' },
  claw:  { name: 'Claw Servos',     desc: 'Launch & retract faster', icon: ICONS.claw, color: '#ffc83d' },
  fuel:  { name: 'Fuel Cell',       desc: 'Heavy hauls drain less energy', icon: ICONS.fuel, color: '#3dffa0' },
  radar: { name: 'Radar Scanner',   desc: 'Preview loot inside asteroids', icon: ICONS.radar, color: '#9d4dff' },
};

// =====================================================================
// Loading
// =====================================================================
EventBus.on('load_progress', (p: number) => {
  ($('loading-bar') as HTMLElement).style.width = Math.round(p * 100) + '%';
});
EventBus.on('load_complete', () => {
  // Populate static how-to-play icons once
  setIcon('how-1', ICONS.laser);
  setIcon('how-2', ICONS.claw);
  setIcon('how-3', ICONS.bolt);
  setIcon('how-4', ICONS.shield);
  const el = $('loading-screen');
  gsap.to(el, { opacity: 0, duration: 0.5, onComplete: () => (el.style.display = 'none') });
});

// =====================================================================
// Menu
// =====================================================================
function renderMenu(): void {
  $('menu-credits').textContent = String(GameState.getCredits());
  $('menu-best').textContent = String(GameState.getBestRun());
  $('menu-runs').textContent = String(GameState.getTotalRuns());
}

EventBus.on('enter_menu', () => {
  hide('hud'); hide('pause-panel'); hide('result-panel'); hide('shop-panel'); hide('settings-panel');
  renderMenu();
  show('menu-overlay');
});

$('btn-play').addEventListener('click', () => {
  AudioManager.uiConfirm();
  hide('menu-overlay');
  EventBus.emit('start_run', GameState.getHighestLevel());
});
$('btn-menu-shop').addEventListener('click', () => {
  hide('menu-overlay');
  EventBus.emit('open_shop');
});

// =====================================================================
// HUD
// =====================================================================
EventBus.on('enter_game', () => {
  hide('menu-overlay'); hide('shop-panel'); hide('result-panel'); hide('pause-panel');
  show('hud', 'block');
  updateModePill('shoot');
});

EventBus.on('hud', (d: any) => {
  $('hud-credits').textContent = String(d.credits);
  $('hud-time').textContent = String(d.time);
  ($('hull-bar') as HTMLElement).style.width = Math.max(0, (d.hull / d.maxHull) * 100) + '%';
  ($('energy-bar') as HTMLElement).style.width = Math.max(0, (d.energy / d.maxEnergy) * 100) + '%';
  // Timer urgency colour
  $('hud-time').style.color = d.time <= 10 ? '#ff5a2d' : '#00f0ff';
  if (d.consumables) renderConsumableBar(d.consumables);
});

// Render the in-game consumable activation buttons (only those owned).
let consumableBarKeys = '';
function renderConsumableBar(list: any[]): void {
  const bar = $('consumable-bar');
  // Only rebuild DOM when the set of owned items changes; else just update state
  const owned = list.filter((c) => c.count > 0 || c.active);
  const sig = owned.map((c) => c.key + c.count + (c.active ? 'A' : '')).join('|');
  if (sig !== consumableBarKeys) {
    consumableBarKeys = sig;
    bar.innerHTML = '';
    owned.forEach((c) => {
      const meta = CONSUMABLES[c.key as ConsumableKey];
      const btn = document.createElement('button');
      btn.className = 'neon-btn relative w-12 h-12 rounded-xl flex items-center justify-center backdrop-blur-md';
      btn.style.background = c.active ? `${meta.color}33` : 'rgba(10,14,31,0.7)';
      btn.style.border = `1px solid ${meta.color}${c.active ? 'ff' : '66'}`;
      btn.style.color = meta.color;
      btn.innerHTML = `
        <span class="w-6 h-6">${CONSUMABLE_ICONS[c.key]}</span>
        <span class="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-voidDeep border text-[10px] font-mono font-bold flex items-center justify-center" style="border-color:${meta.color};color:${meta.color}">${c.count}</span>`;
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        AudioManager.uiTap();
        EventBus.emit('use_consumable', { key: c.key });
      });
      bar.appendChild(btn);
    });
  }
}

EventBus.on('mode_change', (d: { mode: string }) => updateModePill(d.mode));

function updateModePill(mode: string): void {
  const pill = $('mode-pill');
  const icon = $('mode-icon');
  if (mode === 'claw') {
    pill.style.background = 'rgba(255,200,61,0.15)';
    pill.style.borderColor = 'rgba(255,200,61,0.6)';
    pill.style.color = '#ffc83d';
    icon.innerHTML = ICONS.claw;
    $('mode-text').textContent = 'CLAW';
    $('mode-text').style.color = '#ffc83d';
  } else {
    pill.style.background = 'rgba(0,240,255,0.12)';
    pill.style.borderColor = 'rgba(0,240,255,0.6)';
    pill.style.color = '#00f0ff';
    icon.innerHTML = ICONS.laser;
    $('mode-text').textContent = 'LASER';
    $('mode-text').style.color = '#00f0ff';
  }
  pill.classList.add('pulse-glow');
}

$('mode-pill').addEventListener('click', (e) => {
  e.stopPropagation();
  AudioManager.uiTap();
  EventBus.emit('ui_toggle_mode');
});
$('btn-pause').addEventListener('click', () => { AudioManager.uiTap(); EventBus.emit('ui_pause'); });

// =====================================================================
// Pause
// =====================================================================
EventBus.on('show_pause', () => show('pause-panel'));
EventBus.on('hide_pause', () => hide('pause-panel'));
$('btn-resume').addEventListener('click', () => { AudioManager.uiTap(); EventBus.emit('ui_resume'); });
$('btn-pause-retry').addEventListener('click', () => { hide('pause-panel'); EventBus.emit('ui_retry'); });
$('btn-pause-quit').addEventListener('click', () => { hide('pause-panel'); EventBus.emit('ui_quit_run'); });

// =====================================================================
// Result (win / lose)
// =====================================================================
EventBus.on('run_complete', (d: any) => {
  hide('hud');
  $('result-icon').textContent = '🏆';
  $('result-title').textContent = 'SECTOR CLEARED';
  $('result-title').style.color = '#3dffa0';
  $('result-sub').textContent = d.hasNext ? 'Stellar mining, Captain. The next sector awaits.' : 'You conquered the Star Horizon!';
  $('result-earned').textContent = `+${d.earned}`;
  $('result-total').textContent = String(d.totalCredits);
  ($('btn-result-shop') as HTMLElement).style.display = 'block';
  show('result-panel');
});
EventBus.on('run_failed', (d: any) => {
  hide('hud');
  $('result-icon').textContent = '💥';
  $('result-title').textContent = 'HULL BREACH';
  $('result-title').style.color = '#ff5a2d';
  $('result-sub').textContent = 'Your ship was destroyed. Salvaged 50% of credits.';
  $('result-earned').textContent = `+${d.earned}`;
  $('result-total').textContent = String(d.totalCredits);
  show('result-panel');
});
$('btn-result-shop').addEventListener('click', () => { hide('result-panel'); EventBus.emit('ui_to_shop'); });
$('btn-result-retry').addEventListener('click', () => { hide('result-panel'); EventBus.emit('ui_retry'); });
$('btn-result-menu').addEventListener('click', () => { hide('result-panel'); EventBus.emit('ui_quit_run'); });

// =====================================================================
// Shop
// =====================================================================
EventBus.on('enter_shop', () => {
  hide('menu-overlay'); hide('hud'); hide('result-panel');
  show('shop-panel');
});

EventBus.on('shop_data', (d: any) => {
  $('shop-credits').textContent = String(d.credits);
  $('shop-next-level').textContent = String(d.nextLevel ?? '');
  const list = $('shop-list');
  list.innerHTML = '';
  d.upgrades.forEach((u: any) => {
    const meta = UPGRADE_META[u.key as UpgradeKey];
    const maxLevel = UPGRADES[u.key as UpgradeKey].maxLevel;
    const affordable = !u.maxed && d.credits >= u.cost;
    const card = document.createElement('div');
    card.className = 'upgrade-card rounded-2xl p-4 pop-in';
    card.style.borderColor = u.maxed ? 'rgba(61,255,160,0.4)' : 'rgba(157,77,255,0.2)';
    const pips = Array.from({ length: maxLevel }, (_, i) =>
      `<div class="pip ${i < u.level ? 'on' : ''}"></div>`).join('');
    card.innerHTML = `
      <div class="flex items-start gap-3">
        <div class="w-11 h-11 rounded-xl flex items-center justify-center flex-none p-2.5" style="background:rgba(255,255,255,0.05);border:1px solid ${meta.color}44;color:${meta.color}">${meta.icon}</div>
        <div class="flex-1 min-w-0">
          <div class="font-display font-bold text-sm" style="color:${meta.color}">${meta.name}</div>
          <div class="text-[11px] text-white/50 font-body leading-tight">${meta.desc}</div>
          <div class="flex gap-1 mt-2">${pips}</div>
        </div>
        <button class="buy-btn neon-btn flex-none px-3 py-2 rounded-lg font-mono font-bold text-xs ${u.maxed ? 'opacity-50' : ''}"
          style="${u.maxed ? 'background:rgba(61,255,160,0.15);color:#3dffa0;border:1px solid rgba(61,255,160,0.4)' : affordable ? 'background:linear-gradient(90deg,#9d4dff,#ff2db4);color:#fff' : 'background:rgba(255,255,255,0.05);color:rgba(255,255,255,0.4);border:1px solid rgba(255,255,255,0.1)'}"
          ${u.maxed ? 'disabled' : ''}>
          ${u.maxed ? 'MAX' : `⬡ ${u.cost}`}
        </button>
      </div>`;
    if (!u.maxed) {
      card.querySelector('.buy-btn')!.addEventListener('click', () => EventBus.emit('shop_buy', { key: u.key }));
    }
    list.appendChild(card);
  });

  // ---- Consumables section ----
  if (d.consumables?.length) {
    const header = document.createElement('div');
    header.className = 'text-[10px] font-display uppercase tracking-widest text-cosmicGold/70 mt-2 mb-0.5 px-1';
    header.textContent = '◆ Combat Consumables';
    list.appendChild(header);

    d.consumables.forEach((c: any) => {
      const meta = CONSUMABLES[c.key as ConsumableKey];
      const affordable = d.credits >= c.cost;
      const card = document.createElement('div');
      card.className = 'upgrade-card rounded-2xl p-4 pop-in';
      card.style.borderColor = `${meta.color}33`;
      card.innerHTML = `
        <div class="flex items-start gap-3">
          <div class="w-11 h-11 rounded-xl flex items-center justify-center flex-none p-2.5" style="background:rgba(255,255,255,0.05);border:1px solid ${meta.color}44;color:${meta.color}">${CONSUMABLE_ICONS[c.key]}</div>
          <div class="flex-1 min-w-0">
            <div class="font-display font-bold text-sm flex items-center gap-2" style="color:${meta.color}">${meta.name}
              ${c.owned > 0 ? `<span class="text-[10px] font-mono px-1.5 rounded-full" style="background:${meta.color}22;color:${meta.color}">×${c.owned}</span>` : ''}
            </div>
            <div class="text-[11px] text-white/50 font-body leading-tight">${meta.desc} · ${Math.round(meta.durationMs / 1000)}s</div>
          </div>
          <button class="buy-btn neon-btn flex-none px-3 py-2 rounded-lg font-mono font-bold text-xs"
            style="${affordable ? `background:${meta.color};color:#05060f` : 'background:rgba(255,255,255,0.05);color:rgba(255,255,255,0.4);border:1px solid rgba(255,255,255,0.1)'}">
            ⬡ ${c.cost}
          </button>
        </div>`;
      card.querySelector('.buy-btn')!.addEventListener('click', () => EventBus.emit('shop_buy_consumable', { key: c.key }));
      list.appendChild(card);
    });
  }
});

$('btn-shop-launch').addEventListener('click', () => { hide('shop-panel'); EventBus.emit('shop_start_next'); });
$('btn-shop-menu').addEventListener('click', () => { hide('shop-panel'); EventBus.emit('shop_to_menu'); });

// =====================================================================
// Settings
// =====================================================================
$('btn-menu-settings').addEventListener('click', () => {
  AudioManager.uiTap();
  const mv = Math.round(GameState.getMusicVol() * 100);
  const sv = Math.round(GameState.getSfxVol() * 100);
  syncSlider('music-vol', 'music-val', mv);
  syncSlider('sfx-vol', 'sfx-val', sv);
  show('settings-panel');
});
$('btn-close-settings').addEventListener('click', () => { AudioManager.uiTap(); hide('settings-panel'); });

function syncSlider(id: string, valId: string, pct: number): void {
  const s = $(id) as HTMLInputElement;
  s.value = String(pct);
  s.style.setProperty('--pct', pct + '%');
  $(valId).textContent = pct + '%';
}
function wireSlider(id: string, valId: string, onChange: (v: number) => void): void {
  const s = $(id) as HTMLInputElement;
  s.addEventListener('input', () => {
    const pct = parseInt(s.value);
    s.style.setProperty('--pct', pct + '%');
    $(valId).textContent = pct + '%';
    onChange(pct / 100);
  });
}
wireSlider('music-vol', 'music-val', (v) => { AudioManager.setMusicVolume(v); GameState.setMusicVol(v); });
wireSlider('sfx-vol', 'sfx-val', (v) => { AudioManager.setSfxVolume(v); GameState.setSfxVol(v); });

let resetPending = false;
$('btn-reset').addEventListener('click', () => {
  AudioManager.uiTap();
  if (!resetPending) {
    resetPending = true;
    $('reset-label').textContent = 'Tap again to confirm';
    setTimeout(() => { resetPending = false; $('reset-label').textContent = 'Reset All Data'; }, 3000);
  } else {
    GameState.reset();
    resetPending = false;
    $('reset-label').textContent = 'Reset All Data';
    hide('settings-panel');
    renderMenu();
  }
});

// =====================================================================
// Toasts
// =====================================================================
EventBus.on('toast', (d: { text: string; color?: string }) => {
  const css = d.color ?? '#00f0ff';
  const t = document.createElement('div');
  t.className = 'px-4 py-2 rounded-xl text-sm font-display font-bold backdrop-blur-md border';
  t.style.background = 'rgba(10,14,31,0.9)';
  t.style.borderColor = css;
  t.style.color = css;
  t.textContent = d.text;
  $('toast-container').appendChild(t);
  gsap.fromTo(t, { opacity: 0, y: -14, scale: 0.9 }, { opacity: 1, y: 0, scale: 1, duration: 0.3 });
  gsap.to(t, { opacity: 0, y: -10, duration: 0.4, delay: 1.8, onComplete: () => t.remove() });
});
