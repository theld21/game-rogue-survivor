import './index.css';
import Phaser from 'phaser';
import { gsap } from 'gsap';
import Preloader from './scenes/Preloader.ts';
import Menu from './scenes/Menu.ts';
import Dive from './scenes/Dive.ts';
import EventBus from './EventBus.ts';
import GameState from './core/GameState.ts';
import AudioManager from './core/AudioManager.ts';
import { UPGRADES, UpgradeKey, REPAIR, RESOURCES, CSS } from './config.ts';

// ---- Phaser (DPR-aware FIT) ----
const dpr = Math.min(window.devicePixelRatio || 1, 2);
const game = new Phaser.Game({
  type: Phaser.WEBGL,
  parent: 'game-container',
  backgroundColor: '#01080f',
  physics: { default: 'arcade', arcade: { gravity: { x: 0, y: 0 }, debug: false } },
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH, width: window.innerWidth * dpr, height: window.innerHeight * dpr },
  render: { antialias: true },
  scene: [Preloader, Menu, Dive],
});
window.addEventListener('resize', () => game.scale.refresh());
window.addEventListener('orientationchange', () => game.scale.refresh());

const $ = (id: string) => document.getElementById(id)!;
const show = (id: string, d = 'flex') => ($(id).style.display = d);
const hide = (id: string) => ($(id).style.display = 'none');

// ---- Icons ----
const sv = (p: string, sw = 2) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" width="100%" height="100%">${p}</svg>`;
const ICONS: Record<string, string> = {
  wrench: sv('<path d="M14 7a4 4 0 0 1-5 5l-6 6 2 2 6-6a4 4 0 0 0 5-5l-2 2-2-2 2-2z"/>'),
  gear: sv('<circle cx="12" cy="12" r="3.2"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2"/>'),
  depth: sv('<path d="M12 3v14M7 12l5 5 5-5"/><path d="M5 21h14"/>'),
  hull: sv('<path d="M3 11l9-7 9 7v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>'),
  oxygen: sv('<circle cx="9" cy="9" r="5"/><circle cx="16" cy="15" r="4"/>'),
  battery: sv('<rect x="3" y="8" width="15" height="9" rx="2"/><path d="M21 11v3"/><path d="M7 12h4"/>'),
  pause: sv('<rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/>'),
  box: sv('<path d="M3 7l9-4 9 4-9 4-9-4z"/><path d="M3 7v10l9 4 9-4V7"/>'),
  sonar: sv('<circle cx="12" cy="12" r="1.7" fill="currentColor"/><path d="M16.2 12a4.2 4.2 0 0 0-4.2-4.2M19.6 12A7.6 7.6 0 0 0 12 4.4M12 16.2a4.2 4.2 0 0 0 4.2-4.2"/>'),
  light: sv('<rect x="3.5" y="9.5" width="8" height="5" rx="1.5"/><path d="M11.5 10.2l4-1.8v7.2l-4-1.8z"/><path d="M18.5 8.5v7M21.5 6.5v11" opacity="0.9"/>'),
  claw: sv('<path d="M12 4v5"/><path d="M9 9.5V7a3 3 0 0 0-3 3v1.5M15 9.5V7a3 3 0 0 1 3 3v1.5"/><path d="M6.2 11.5l1.6 7.5M17.8 11.5l-1.6 7.5M8 19h8"/>'),
  laser: sv('<circle cx="5" cy="12" r="2.4"/><circle cx="13" cy="12" r="1.4" fill="currentColor"/><circle cx="18" cy="12" r="1.4" fill="currentColor"/><circle cx="22" cy="12" r="1.2" fill="currentColor"/>'),
  rocket: sv('<path d="M12 3c3 2 5 6 5 10l-2 4h-6l-2-4c0-4 2-8 5-10zM12 12a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z"/>'),
  x: sv('<path d="M6 6l12 12M18 6L6 18"/>', 2.4),
};
document.querySelectorAll('[data-ic]').forEach((el) => { const k = (el as HTMLElement).dataset.ic!; if (ICONS[k]) el.innerHTML = ICONS[k]; });

// ---- Loading ----
EventBus.on('load_progress', (p: number) => { ($('loading-bar') as HTMLElement).style.width = Math.round(p * 100) + '%'; });
EventBus.on('load_complete', () => { const el = $('loading-screen'); gsap.to(el, { opacity: 0, duration: 0.5, onComplete: () => (el.style.display = 'none') }); });

// ---- Menu ----
EventBus.on('enter_menu', () => {
  ['hud', 'base-panel', 'pause-panel', 'dead-overlay', 'win-overlay', 'settings-panel', 'event-banner', 'station-wrap'].forEach(hide);
  $('menu-credits').textContent = String(GameState.getCredits());
  $('menu-deepest').textContent = String(GameState.getDeepest());
  show('menu-overlay');
});
$('btn-dive').addEventListener('click', () => { AudioManager.uiConfirm(); hide('menu-overlay'); EventBus.emit('start_dive'); });
$('btn-base').addEventListener('click', () => { AudioManager.uiTap(); stationCargo = {}; renderStation(); show('base-panel'); });
EventBus.on('enter_dive', () => { hide('menu-overlay'); show('hud', 'block'); });

// ---- HUD ----
EventBus.on('hud', (d: any) => {
  const bar = (id: string, v: number, m: number, good: string) => { const el = $(id) as HTMLElement; el.style.width = Math.max(0, (v / m) * 100) + '%'; el.style.background = v / m < 0.22 ? '#ff4a5a' : good; };
  bar('hull-bar', d.hull, d.maxHull, '#76e08a'); bar('oxygen-bar', d.oxygen, d.maxOxygen, '#46e8ff'); bar('battery-bar', d.battery, d.maxBattery, '#ffc24a');
  $('hud-depth').textContent = String(d.depth);
  $('hud-zone').textContent = (d.zone as string).toUpperCase(); ($('hud-zone') as HTMLElement).style.color = d.crushing ? '#ff4a5a' : '#aaf6ff';
  $('hud-cargo').textContent = `${d.cargo}/${d.cargoMax}`;
  $('hud-credits').textContent = String(d.credits);
  $('crush-warn').style.display = d.crushing ? 'block' : 'none';
  ($('light-btn') as HTMLElement).classList.toggle('light-active', d.lightOn);
  if (d.obj) $('obj-text').innerHTML = d.obj.part === 'COMPLETE' ? '<span style="color:#76e08a">Ship repaired!</span>' : `<b style="color:#aaf6ff">${d.obj.stage}/${d.obj.total}</b> ${d.obj.part} · <span style="color:#57f0d0">${d.obj.have}/${d.obj.need} ${d.obj.mat}</span>`;
  ($('station-wrap') as HTMLElement).style.display = d.nearBase ? 'block' : 'none';
});
EventBus.on('light_state', (d: any) => ($('light-btn') as HTMLElement).classList.toggle('light-active', d.on));
EventBus.on('near_base', (d: any) => { ($('station-wrap') as HTMLElement).style.display = d.on ? 'block' : 'none'; });

// ---- Joystick ----
(() => {
  const zone = $('joy-zone'), base = $('joy-base'), knob = $('joy-knob');
  const R = 46; let id: number | null = null; let bx = 0, by = 0;
  zone.addEventListener('pointerdown', (e) => {
    id = e.pointerId; (zone as HTMLElement).setPointerCapture(id);
    bx = e.clientX; by = e.clientY; base.style.left = bx + 'px'; base.style.top = by + 'px'; base.style.transform = 'translate(-50%,-50%)'; base.style.opacity = '1';
    knob.style.transform = 'translate(-50%,-50%)'; AudioManager.init();
  });
  zone.addEventListener('pointermove', (e) => {
    if (id !== e.pointerId) return;
    let dx = e.clientX - bx, dy = e.clientY - by; const len = Math.hypot(dx, dy) || 1; const cl = Math.min(len, R);
    knob.style.transform = `translate(calc(-50% + ${(dx / len) * cl}px), calc(-50% + ${(dy / len) * cl}px))`;
    EventBus.emit('joy', { x: dx / len, y: dy / len, mag: Math.min(1, len / R) });
  });
  const end = (e: PointerEvent) => { if (id !== e.pointerId) return; id = null; base.style.opacity = '0'; knob.style.transform = 'translate(-50%,-50%)'; EventBus.emit('joy', { x: 0, y: 0, mag: 0 }); };
  zone.addEventListener('pointerup', end); zone.addEventListener('pointercancel', end); zone.addEventListener('lostpointercapture', end);
})();

// ---- Buttons ----
$('fire-btn').addEventListener('pointerdown', (e) => { e.preventDefault(); EventBus.emit('fire', { down: true }); });
['pointerup', 'pointerleave', 'pointercancel'].forEach((ev) => $('fire-btn').addEventListener(ev, () => EventBus.emit('fire', { down: false })));
// Use pointerdown (not click) so buttons respond even while the other thumb holds the joystick.
$('claw-btn').addEventListener('pointerdown', (e) => { e.preventDefault(); EventBus.emit('claw'); });
$('light-btn').addEventListener('pointerdown', (e) => { e.preventDefault(); EventBus.emit('light'); });
$('sonar-btn').addEventListener('pointerdown', (e) => {
  e.preventDefault(); EventBus.emit('sonar');
  const el = $('sonar-btn'); el.classList.add('pressed'); setTimeout(() => el.classList.remove('pressed'), 260);
});
$('station-btn').addEventListener('click', () => { AudioManager.uiTap(); EventBus.emit('open_station'); });

// ---- Pause ----
$('btn-pause').addEventListener('click', () => { AudioManager.uiTap(); EventBus.emit('ui_pause'); });
EventBus.on('show_pause', () => { syncSlider('music-vol-p', 'music-val-p', Math.round(GameState.getMusicVol() * 100)); syncSlider('sfx-vol-p', 'sfx-val-p', Math.round(GameState.getSfxVol() * 100)); show('pause-panel'); });
EventBus.on('hide_pause', () => hide('pause-panel'));
$('btn-resume').addEventListener('click', () => { AudioManager.uiTap(); EventBus.emit('ui_resume'); });
$('btn-pause-menu').addEventListener('click', () => { hide('pause-panel'); EventBus.emit('ui_resume'); EventBus.emit('ui_to_menu'); });

// ---- Station (dive) ----
let stationCargo: Record<string, number> = {};
let stationTab: 'repair' | 'upgrade' = 'repair';
EventBus.on('station', (d: any) => { stationCargo = d.cargo ?? {}; if ($('base-panel').style.display === 'none') show('base-panel'); renderStation(); });
EventBus.on('hide_station', () => hide('base-panel'));
$('btn-base-close').addEventListener('click', () => { AudioManager.uiTap(); hide('base-panel'); EventBus.emit('close_station'); });
$('btn-sell').addEventListener('click', () => EventBus.emit('sell'));
$('tab-repair').addEventListener('click', () => { stationTab = 'repair'; renderStation(); });
$('tab-upgrade').addEventListener('click', () => { stationTab = 'upgrade'; renderStation(); });

function renderStation(): void {
  $('base-credits').textContent = String(GameState.getCredits());
  ($('tab-repair') as HTMLElement).classList.toggle('active', stationTab === 'repair');
  ($('tab-upgrade') as HTMLElement).classList.toggle('active', stationTab === 'upgrade');
  $('repair-view').style.display = stationTab === 'repair' ? 'flex' : 'none';
  $('upgrade-view').style.display = stationTab === 'upgrade' ? 'flex' : 'none';
  if (stationTab === 'repair') renderRepair(); else renderUpgrades();
}
function renderRepair(): void {
  const rep = GameState.getRepair(); const cur = GameState.currentStage();
  let html = '';
  REPAIR.forEach((s, i) => {
    const have = rep[i] ?? 0; const done = have >= s.need; const isCur = i === cur; const m = RESOURCES[s.mat]; const carry = stationCargo[s.mat] ?? 0;
    const pct = Math.min(100, (have / s.need) * 100);
    html += `<div class="glass rounded-2xl p-3 ${isCur ? '' : 'opacity-80'}" style="${isCur ? 'border:1px solid #46e8ff' : ''}">
      <div class="flex items-center justify-between">
        <div class="font-display font-bold text-sm" style="color:${done ? '#76e08a' : m.css}">${done ? '✓ ' : ''}${s.part}</div>
        <div class="font-mono text-[10px] ${done ? 'text-hpGood' : 'text-ink/50'}">${have}/${s.need} ${m.name}</div>
      </div>
      <div class="font-body text-[11px] text-ink/50 mt-0.5">${s.how} · <span style="color:${m.css}">${s.where}</span></div>
      <div class="h-1.5 bar-track mt-2"><div class="bar-fill" style="width:${pct}%;background:${done ? '#76e08a' : m.css}"></div></div>
      ${isCur && !done ? `<button id="btn-deposit" class="neon-btn w-full mt-2 py-1.5 rounded-lg font-mono text-xs ${carry > 0 ? '' : 'opacity-50'}" style="background:${carry > 0 ? m.css : 'rgba(255,255,255,0.06)'};color:#041d30">INSTALL (have ${carry})</button>` : ''}
    </div>`;
  });
  if (GameState.allRepaired()) html += `<div class="text-center font-display text-hpGood py-2">SHIP FULLY REPAIRED — LIFTOFF READY</div>`;
  $('repair-view').innerHTML = html;
  const dep = document.getElementById('btn-deposit'); if (dep) dep.addEventListener('click', () => EventBus.emit('deposit'));
}
const UMETA: Record<UpgradeKey, string> = { oxygen: '#46e8ff', battery: '#ffc24a', armor: '#ff7a3c', sonar: '#aaf6ff', hull: '#76e08a', light: '#ffe9a8' };
function renderUpgrades(): void {
  const keys = Object.keys(UPGRADES) as UpgradeKey[]; let html = '';
  for (const k of keys) {
    const u = UPGRADES[k]; const lvl = GameState.getUpgrade(k); const maxed = lvl >= u.max; const cost = maxed ? 0 : u.cost(lvl); const can = !maxed && GameState.getCredits() >= cost; const col = UMETA[k];
    const pips = Array.from({ length: u.max }, (_, i) => `<div class="w-5 h-1.5 rounded-full" style="background:${i < lvl ? col : 'rgba(255,255,255,0.15)'}"></div>`).join('');
    html += `<div class="glass rounded-2xl p-3"><div class="flex items-start gap-3">
      <div class="flex-1"><div class="font-display font-bold text-sm" style="color:${col}">${u.name}</div><div class="font-body text-[11px] text-ink/55">${u.desc}</div><div class="flex gap-1 mt-1.5">${pips}</div></div>
      <button data-up="${k}" ${maxed || !can ? 'disabled' : ''} class="neon-btn px-3 py-2 rounded-xl font-mono font-bold text-xs ${maxed ? 'opacity-60' : ''}" style="${maxed ? 'background:rgba(118,224,138,0.15);color:#76e08a' : can ? `background:${col};color:#041d30` : 'background:rgba(255,255,255,0.06);color:rgba(255,255,255,0.4)'}">${maxed ? 'MAX' : '◈ ' + cost}</button>
    </div></div>`;
  }
  $('upgrade-view').innerHTML = html;
  $('upgrade-view').querySelectorAll('[data-up]').forEach((b) => b.addEventListener('click', () => {
    const k = (b as HTMLElement).dataset.up as UpgradeKey;
    if (GameState.buyUpgrade(k)) { AudioManager.uiConfirm(); EventBus.emit('toast', { text: UPGRADES[k].name + ' UP', color: UMETA[k] }); } else AudioManager.uiTap();
    renderStation(); $('menu-credits').textContent = String(GameState.getCredits());
  }));
}

// ---- Dead / win ----
const DEATH: Record<string, string> = { oxygen: 'Oxygen ran out.', battery: 'Power cells died in the dark.', hull: 'The hull caved in.' };
EventBus.on('dead', (d: any) => { $('dead-sub').textContent = `${DEATH[d.reason] ?? ''} Cargo lost — recovering…`; show('dead-overlay'); });
EventBus.on('respawn', () => hide('dead-overlay'));
EventBus.on('win', () => { hide('hud'); hide('base-panel'); show('win-overlay'); });

// ---- Banner ----
let eventTimer: ReturnType<typeof setTimeout> | undefined;
function banner(title: string, desc: string, color: string, dur = 2200): void {
  $('event-title').textContent = title; ($('event-title') as HTMLElement).style.color = color;
  $('event-desc').textContent = desc; ($('event-card') as HTMLElement).style.borderColor = color;
  const el = $('event-banner'); el.style.display = 'block';
  gsap.killTweensOf(el); gsap.fromTo(el, { opacity: 0, y: -16, scale: 0.96 }, { opacity: 1, y: 0, scale: 1, duration: 0.25, ease: 'back.out(2)' });
  if (eventTimer) clearTimeout(eventTimer);
  eventTimer = setTimeout(() => gsap.to(el, { opacity: 0, y: -12, duration: 0.3, onComplete: () => (el.style.display = 'none') }), dur);
}
EventBus.on('crush', (d: any) => banner('PRESSURE CRITICAL', `${d.zone} crushes your hull — upgrade your Pressure Hull!`, CSS.danger, 2000));

// ---- Toast ----
EventBus.on('toast', (d: { text: string; color?: string }) => {
  const css = d.color ?? CSS.sonar;
  const t = document.createElement('div'); t.className = 'glass px-3.5 py-1.5 rounded-xl text-sm font-display font-bold';
  t.style.color = css; t.style.borderColor = css; t.textContent = d.text;
  $('toast-container').appendChild(t);
  gsap.fromTo(t, { opacity: 0, y: -12, scale: 0.9 }, { opacity: 1, y: 0, scale: 1, duration: 0.3 });
  gsap.to(t, { opacity: 0, y: -10, duration: 0.4, delay: 1.6, onComplete: () => t.remove() });
});

// ---- Settings ----
$('btn-settings').addEventListener('click', () => { AudioManager.uiTap(); syncSlider('music-vol', 'music-val', Math.round(GameState.getMusicVol() * 100)); syncSlider('sfx-vol', 'sfx-val', Math.round(GameState.getSfxVol() * 100)); show('settings-panel'); });
$('btn-close-settings').addEventListener('click', () => { AudioManager.uiTap(); hide('settings-panel'); });
function syncSlider(id: string, valId: string, pct: number): void { const s = $(id) as HTMLInputElement; s.value = String(pct); s.style.setProperty('--pct', pct + '%'); $(valId).textContent = pct + '%'; }
function wireSlider(id: string, valId: string, cb: (v: number) => void): void { const s = $(id) as HTMLInputElement; s.addEventListener('input', () => { const pct = parseInt(s.value); s.style.setProperty('--pct', pct + '%'); $(valId).textContent = pct + '%'; cb(pct / 100); }); }
wireSlider('music-vol', 'music-val', (v) => { AudioManager.setMusicVolume(v); GameState.setMusicVol(v); });
wireSlider('sfx-vol', 'sfx-val', (v) => { AudioManager.setSfxVolume(v); GameState.setSfxVol(v); });
wireSlider('music-vol-p', 'music-val-p', (v) => { AudioManager.setMusicVolume(v); GameState.setMusicVol(v); });
wireSlider('sfx-vol-p', 'sfx-val-p', (v) => { AudioManager.setSfxVolume(v); GameState.setSfxVol(v); });
let resetPending = false;
$('btn-reset').addEventListener('click', () => { AudioManager.uiTap(); if (!resetPending) { resetPending = true; $('reset-label').textContent = 'Tap again to confirm'; setTimeout(() => { resetPending = false; $('reset-label').textContent = 'Reset All Data'; }, 3000); } else { GameState.reset(); resetPending = false; $('reset-label').textContent = 'Reset All Data'; hide('settings-panel'); $('menu-credits').textContent = '0'; $('menu-deepest').textContent = '0'; } });
