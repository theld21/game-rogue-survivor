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
import { WORLD, CARGO_TYPES, UPGRADES, RARITY_CSS, CargoKind, UpgradeKey } from './config.ts';
import { ROUTES } from './data/Levels.ts';

// =====================================================================
// main.ts — Phaser bootstrap (FIXED 450×800, Scale.FIT) + DOM driver.
// =====================================================================

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.WEBGL,
  parent: 'game-container',
  backgroundColor: '#140a2e',
  physics: { default: 'arcade', arcade: { gravity: { x: 0, y: 0 }, debug: false } },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: WORLD.width,    // fixed logical resolution → deterministic physics
    height: WORLD.height,
  },
  render: { antialias: true, roundPixels: false } as any,
  scene: [Preloader, Menu, GamePlay, Shop],
};
const game = new Phaser.Game(config);
window.addEventListener('resize', () => game.scale.refresh());
window.addEventListener('orientationchange', () => game.scale.refresh());

const $ = (id: string) => document.getElementById(id)!;
const show = (id: string, d = 'flex') => ($(id).style.display = d);
const hide = (id: string) => ($(id).style.display = 'none');

// ---- Mission-board selection state ----
let selRoute = 1;
let selCargo: CargoKind = 'iron';
let pendingNext: { route: number; cargo: CargoKind } | null = null;

const CARGO_DESC: Record<CargoKind, string> = {
  iron: 'Heavy & tough — low pay, survives hard knocks.',
  alloy: 'Balanced pod — fair pay, moderate fragility.',
  nuclear: 'Featherweight — huge pay, a light tap detonates it!',
  crystal: 'Pricey & brittle — shatters on medium hits.',
  reactor: 'Very heavy — sluggish & swings hard, but near-indestructible.',
};

// ---- SVG cargo glyphs (drawn, not emoji) ----
const cargoGlyph = (kind: CargoKind): string => {
  const col: Record<CargoKind, string> = { iron: '#8a93b0', alloy: '#9d6bff', nuclear: '#9dff5c', crystal: '#ff4fa3', reactor: '#ff8a3d' };
  const c = col[kind];
  const s = (p: string) => `<svg viewBox="0 0 24 24" width="100%" height="100%" fill="none" stroke="${c}" stroke-width="2">${p}</svg>`;
  if (kind === 'iron') return s('<rect x="4" y="5" width="16" height="14" rx="1.5"/><path d="M4 10h16M4 14.5h16M9 5v14M15 5v14" stroke-width="1.4"/>');
  if (kind === 'alloy') return s('<path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z"/><circle cx="12" cy="12" r="3"/>');
  if (kind === 'nuclear') return s('<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="2" fill="' + c + '"/><path d="M12 4v4M19 16l-3.5-2M5 16l3.5-2"/>');
  if (kind === 'crystal') return s('<path d="M12 2l6 7-6 13-6-13z"/><path d="M6 9h12M12 2v20"/>');
  return s('<rect x="4" y="5" width="16" height="14" rx="3"/><circle cx="12" cy="12" r="3" fill="' + c + '"/><path d="M12 5v3M12 16v3"/>');
};

// =====================================================================
// Loading
// =====================================================================
EventBus.on('load_progress', (p: number) => { ($('loading-bar') as HTMLElement).style.width = Math.round(p * 100) + '%'; });
EventBus.on('load_complete', () => {
  const el = $('loading-screen');
  gsap.to(el, { opacity: 0, duration: 0.5, onComplete: () => (el.style.display = 'none') });
});

// =====================================================================
// Menu / Mission board
// =====================================================================
const REGION_NAMES = ['Sunset City', 'Night District', 'Industrial Zone', 'Storm Frontier'];
const REGION_COL = ['#22e3ff', '#ff4fa3', '#ffd83d', '#9dff5c'];
const ICON_STAR = '<svg viewBox="0 0 24 24" width="11" height="11" fill="currentColor"><path d="M12 2l3 6.5 7 .8-5 4.8 1.3 7L12 17.8 5.4 21l1.3-7-5-4.8 7-.8z"/></svg>';
const ICON_LOCK = '<svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" stroke-width="2.4"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>';
const ICON_DOT  = '<svg viewBox="0 0 24 24" width="9" height="9" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="6"/></svg>';

function renderMenu(): void {
  $('menu-credits').textContent = String(GameState.getCredits());
  if (!GameState.isRouteUnlocked(selRoute)) selRoute = GameState.getUnlockedRoute();
  ensureCargoValid();
  renderRoutes();
  renderCargo();
}

function ensureCargoValid(): void {
  const r = ROUTES.find((x) => x.id === selRoute)!;
  if (!r.cargoAllowed.includes(selCargo)) selCargo = r.cargoAllowed[0];
}

// Routes laid out as ONE horizontal scroll strip (no scrollbar). Region is
// shown by a coloured top accent; the strip is width-capped on big screens.
function renderRoutes(): void {
  const list = $('route-list'); list.innerHTML = '';
  ROUTES.forEach((r) => {
    const unlocked = GameState.isRouteUnlocked(r.id);
    const cleared = GameState.isRouteCleared(r.id);
    const sel = r.id === selRoute;
    const accent = REGION_COL[r.tier - 1];
    const btn = document.createElement('button');
    btn.className = 'card flex-none w-[52px] rounded-xl py-2 border flex flex-col items-center justify-center gap-0.5 ' +
      (sel ? 'selected' : '') + (unlocked ? '' : ' opacity-40');
    btn.style.borderColor = sel ? accent : cleared ? 'rgba(77,255,160,0.4)' : 'rgba(255,255,255,0.1)';
    btn.style.borderTopColor = accent;
    btn.style.borderTopWidth = '3px';
    const statusIcon = cleared
      ? `<span class="text-neonLime">${ICON_STAR}</span>`
      : unlocked ? `<span class="text-white/30">${ICON_DOT}</span>` : `<span class="text-white/30">${ICON_LOCK}</span>`;
    btn.innerHTML = `<span class="font-display font-bold text-sm ${sel ? '' : unlocked ? 'text-white/80' : 'text-white/40'}" ${sel ? `style="color:${accent}"` : ''}>${r.id}</span>${statusIcon}`;
    if (unlocked) btn.addEventListener('click', () => { selRoute = r.id; AudioManager.uiTap(); ensureCargoValid(); renderRoutes(); renderCargo(); });
    list.appendChild(btn);
  });
  // auto-scroll the selected chip into view
  const selEl = list.children[selRoute - 1] as HTMLElement | undefined;
  selEl?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  updateRouteInfo();
}

function updateRouteInfo(): void {
  const r = ROUTES.find((x) => x.id === selRoute)!;
  const best = GameState.getBestCredits(r.id);
  const el = $('route-info');
  if (el) el.innerHTML = `<span style="color:${REGION_COL[r.tier - 1]}" class="font-bold">${r.name}</span> <span class="text-white/40">· ${REGION_NAMES[r.tier - 1]} · ${r.gateCount} gates</span>${best ? ` · <span class="text-neonYellow">best ◈${best}</span>` : ''}`;
}

// Compact 3-pip meter for a cargo stat.
function statMeter(label: string, level: number, color: string): string {
  const pips = [0, 1, 2].map((i) => `<span class="inline-block w-2.5 h-1 rounded-full" style="background:${i < level ? color : 'rgba(255,255,255,0.15)'}"></span>`).join('');
  return `<span class="flex items-center gap-1"><span class="text-[8px] uppercase tracking-wider text-white/40">${label}</span><span class="flex gap-0.5">${pips}</span></span>`;
}

function renderCargo(): void {
  const r = ROUTES.find((x) => x.id === selRoute)!;
  const list = $('cargo-list'); list.innerHTML = '';
  r.cargoAllowed.forEach((k) => {
    const def = CARGO_TYPES[k];
    const sel = k === selCargo;
    const col = RARITY_CSS[def.rarity];
    // Derive 1-3 stat levels from the tuning numbers.
    const weight = def.weightMult < 0.85 ? 1 : def.weightMult < 1.15 ? 2 : 3;
    const tough = def.impactThreshold < 120 ? 1 : def.impactThreshold < 210 ? 2 : 3;
    const btn = document.createElement('button');
    btn.className = 'card rounded-2xl p-3 border flex items-center gap-3 pop-in ' + (sel ? 'selected' : 'border-white/10');
    btn.style.borderColor = sel ? col : '';
    btn.innerHTML = `
      <div class="w-11 h-11 flex-none p-2 rounded-xl" style="background:rgba(255,255,255,0.05);border:1px solid ${col}44">${cargoGlyph(k)}</div>
      <div class="flex-1 min-w-0">
        <div class="font-display font-bold text-sm flex items-center gap-2" style="color:${col}">${def.name}
          <span class="text-[10px] font-mono px-1.5 rounded-full ml-auto" style="background:${col}22">◈${def.reward}</span>
        </div>
        <div class="text-[10px] text-white/50 font-body leading-tight mb-1">${CARGO_DESC[k]}</div>
        <div class="flex items-center gap-3">${statMeter('Weight', weight, '#ffd83d')}${statMeter('Tough', tough, '#22e3ff')}</div>
      </div>`;
    btn.addEventListener('click', () => { selCargo = k; AudioManager.uiTap(); renderCargo(); });
    list.appendChild(btn);
  });
}

EventBus.on('enter_menu', () => {
  hide('hud'); hide('pause-panel'); hide('result-panel'); hide('shop-panel'); hide('settings-panel');
  renderMenu();
  show('menu-overlay');
});

$('btn-launch').addEventListener('click', () => {
  AudioManager.uiConfirm();
  hide('menu-overlay');
  EventBus.emit('start_run', { route: selRoute, cargo: selCargo });
});
$('btn-menu-shop').addEventListener('click', () => { hide('menu-overlay'); EventBus.emit('open_shop'); });

// =====================================================================
// HUD
// =====================================================================
EventBus.on('enter_game', (d: any) => {
  hide('menu-overlay'); hide('shop-panel'); hide('result-panel'); hide('pause-panel');
  show('hud', 'block');
  $('hud-route').textContent = `${d.route} · ${d.name}`;
  // briefly flash the touch-zone hints
  ['zone-left', 'zone-right'].forEach((z) => {
    $(z).style.opacity = '1';
    gsap.to($(z), { opacity: 0, duration: 0.6, delay: 2.2 });
  });
});

EventBus.on('hud', (d: any) => {
  ($('fuel-bar') as HTMLElement).style.width = Math.max(0, (d.fuel / d.maxFuel) * 100) + '%';
  ($('integrity-bar') as HTMLElement).style.width = Math.max(0, (d.integrity / d.maxIntegrity) * 100) + '%';
  $('hud-credits').textContent = String(d.credits);
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
// Result
// =====================================================================
EventBus.on('run_complete', (d: any) => {
  hide('hud');
  $('result-icon').textContent = '📦';
  $('result-title').textContent = 'DELIVERED!';
  $('result-title').style.color = '#4dffa0';
  $('result-sub').textContent = d.hasNext ? 'Smooth landing, pilot! Streak ' + d.streak : 'Route complete!';
  $('result-breakdown').innerHTML = `
    <div class="flex justify-between"><span class="text-white/50">Cargo + route</span><span class="text-neonYellow">◈ ${d.reward - d.fuelBonus - d.hpBonus}</span></div>
    <div class="flex justify-between"><span class="text-white/50">Fuel bonus</span><span class="text-neonCyan">◈ ${d.fuelBonus}</span></div>
    <div class="flex justify-between"><span class="text-white/50">Intact bonus</span><span class="text-neonLime">◈ ${d.hpBonus}</span></div>
    <div class="flex justify-between border-t border-white/10 pt-1 mt-1 font-bold"><span>Earned</span><span class="text-neonYellow">◈ ${d.reward}</span></div>
    <div class="flex justify-between text-white/40"><span>Total</span><span>◈ ${d.totalCredits}</span></div>`;
  // "Next Route" advances to the just-unlocked route with the same cargo if allowed.
  if (d.hasNext) {
    const nextR = ROUTES.find((x) => x.id === d.nextRoute);
    const nextCargo = nextR && nextR.cargoAllowed.includes(d.cargo) ? d.cargo : (nextR ? nextR.cargoAllowed[0] : d.cargo);
    pendingNext = { route: d.nextRoute, cargo: nextCargo };
    ($('btn-result-next') as HTMLElement).style.display = 'block';
  } else {
    pendingNext = null;
    ($('btn-result-next') as HTMLElement).style.display = 'none';
  }
  ($('btn-result-shop') as HTMLElement).style.display = 'block';
  show('result-panel');
});
EventBus.on('run_failed', (d: any) => {
  hide('hud');
  pendingNext = null;
  ($('btn-result-next') as HTMLElement).style.display = 'none';
  const fuel = d.reason === 'fuel';
  $('result-icon').textContent = fuel ? '⛽' : '💥';
  $('result-title').textContent = fuel ? 'OUT OF FUEL' : 'CARGO LOST';
  $('result-title').style.color = '#ff5470';
  $('result-sub').textContent = fuel ? 'The drone ran dry mid-route.' : 'The crate took one hit too many.';
  $('result-breakdown').innerHTML = `<div class="flex justify-between text-white/40"><span>Total credits</span><span>◈ ${d.totalCredits}</span></div>`;
  show('result-panel');
});
$('btn-result-next').addEventListener('click', () => {
  if (!pendingNext) return;
  hide('result-panel');
  selRoute = pendingNext.route; selCargo = pendingNext.cargo;
  EventBus.emit('ui_next_run', { route: pendingNext.route, cargo: pendingNext.cargo });
});
$('btn-result-shop').addEventListener('click', () => { hide('result-panel'); EventBus.emit('ui_to_shop'); });
$('btn-result-retry').addEventListener('click', () => { hide('result-panel'); EventBus.emit('ui_retry'); });
$('btn-result-menu').addEventListener('click', () => { hide('result-panel'); EventBus.emit('ui_quit_run'); });

// =====================================================================
// Shop
// =====================================================================
const UPGRADE_META: Record<UpgradeKey, { name: string; desc: string; icon: string; color: string }> = {
  engine: { name: 'Engine Power', desc: 'Stronger thrust, easier lift', color: '#22e3ff',
    icon: `<svg viewBox="0 0 24 24" width="100%" height="100%" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 2v6M12 16v6M5 12H2M22 12h-3"/><circle cx="12" cy="12" r="4"/></svg>` },
  fuel: { name: 'Fuel Tank', desc: 'Bigger tank, longer flights', color: '#9dff5c',
    icon: `<svg viewBox="0 0 24 24" width="100%" height="100%" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="4" y="6" width="12" height="14" rx="2"/><path d="M16 10h3v6M8 4h4"/></svg>` },
  shield: { name: 'Cargo Shield', desc: 'Dampers absorb impact damage', color: '#9d6bff',
    icon: `<svg viewBox="0 0 24 24" width="100%" height="100%" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 2l8 3v6c0 5-3.4 8.5-8 10-4.6-1.5-8-5-8-10V5z"/></svg>` },
};

EventBus.on('enter_shop', () => { hide('menu-overlay'); hide('hud'); hide('result-panel'); show('shop-panel'); });
EventBus.on('shop_data', (d: any) => {
  $('shop-credits').textContent = String(d.credits);
  const list = $('shop-list'); list.innerHTML = '';
  d.upgrades.forEach((u: any) => {
    const meta = UPGRADE_META[u.key as UpgradeKey];
    const maxLevel = UPGRADES[u.key as UpgradeKey].maxLevel;
    const affordable = !u.maxed && d.credits >= u.cost;
    const pips = Array.from({ length: maxLevel }, (_, i) => `<div class="pip ${i < u.level ? 'on' : ''}"></div>`).join('');
    const card = document.createElement('div');
    card.className = 'card rounded-2xl p-4 border pop-in';
    card.style.borderColor = u.maxed ? 'rgba(77,255,160,0.4)' : `${meta.color}33`;
    card.innerHTML = `
      <div class="flex items-start gap-3">
        <div class="w-11 h-11 rounded-xl flex items-center justify-center flex-none p-2.5" style="background:rgba(255,255,255,0.05);border:1px solid ${meta.color}44;color:${meta.color}">${meta.icon}</div>
        <div class="flex-1 min-w-0">
          <div class="font-display font-bold text-sm" style="color:${meta.color}">${meta.name}</div>
          <div class="text-[11px] text-white/50 font-body leading-tight">${meta.desc}</div>
          <div class="flex gap-1 mt-2">${pips}</div>
        </div>
        <button class="buy-btn neon-btn flex-none px-3 py-2 rounded-lg font-mono font-bold text-xs ${u.maxed ? 'opacity-50' : ''}"
          style="${u.maxed ? 'background:rgba(77,255,160,0.15);color:#4dffa0;border:1px solid rgba(77,255,160,0.4)' : affordable ? `background:${meta.color};color:#140a2e` : 'background:rgba(255,255,255,0.05);color:rgba(255,255,255,0.4);border:1px solid rgba(255,255,255,0.1)'}"
          ${u.maxed ? 'disabled' : ''}>${u.maxed ? 'MAX' : `◈ ${u.cost}`}</button>
      </div>`;
    if (!u.maxed) card.querySelector('.buy-btn')!.addEventListener('click', () => EventBus.emit('shop_buy', { key: u.key }));
    list.appendChild(card);
  });
});
$('btn-shop-close').addEventListener('click', () => { hide('shop-panel'); EventBus.emit('shop_close'); });

// =====================================================================
// Settings
// =====================================================================
$('btn-menu-settings').addEventListener('click', () => {
  AudioManager.uiTap();
  syncSlider('music-vol', 'music-val', Math.round(GameState.getMusicVol() * 100));
  syncSlider('sfx-vol', 'sfx-val', Math.round(GameState.getSfxVol() * 100));
  show('settings-panel');
});
$('btn-close-settings').addEventListener('click', () => { AudioManager.uiTap(); hide('settings-panel'); });
function syncSlider(id: string, valId: string, pct: number): void {
  const s = $(id) as HTMLInputElement; s.value = String(pct); s.style.setProperty('--pct', pct + '%'); $(valId).textContent = pct + '%';
}
function wireSlider(id: string, valId: string, cb: (v: number) => void): void {
  const s = $(id) as HTMLInputElement;
  s.addEventListener('input', () => { const pct = parseInt(s.value); s.style.setProperty('--pct', pct + '%'); $(valId).textContent = pct + '%'; cb(pct / 100); });
}
wireSlider('music-vol', 'music-val', (v) => { AudioManager.setMusicVolume(v); GameState.setMusicVol(v); });
wireSlider('sfx-vol', 'sfx-val', (v) => { AudioManager.setSfxVolume(v); GameState.setSfxVol(v); });
let resetPending = false;
$('btn-reset').addEventListener('click', () => {
  AudioManager.uiTap();
  if (!resetPending) { resetPending = true; $('reset-label').textContent = 'Tap again to confirm'; setTimeout(() => { resetPending = false; $('reset-label').textContent = 'Reset All Data'; }, 3000); }
  else { GameState.reset(); resetPending = false; $('reset-label').textContent = 'Reset All Data'; hide('settings-panel'); renderMenu(); }
});

// =====================================================================
// Toasts
// =====================================================================
EventBus.on('toast', (d: { text: string; color?: string }) => {
  const css = d.color ?? '#22e3ff';
  const t = document.createElement('div');
  t.className = 'px-4 py-2 rounded-xl text-sm font-display font-bold backdrop-blur-md border';
  t.style.background = 'rgba(29,20,66,0.9)'; t.style.borderColor = css; t.style.color = css;
  t.textContent = d.text;
  $('toast-container').appendChild(t);
  gsap.fromTo(t, { opacity: 0, y: -14, scale: 0.9 }, { opacity: 1, y: 0, scale: 1, duration: 0.3 });
  gsap.to(t, { opacity: 0, y: -10, duration: 0.4, delay: 1.6, onComplete: () => t.remove() });
});
