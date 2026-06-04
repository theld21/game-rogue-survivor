import './index.css';
import Phaser from 'phaser';
import { gsap } from 'gsap';
import Preloader from './scenes/Preloader.ts';
import Menu from './scenes/Menu.ts';
import World from './scenes/World.ts';
import EventBus from './EventBus.ts';
import GameState from './core/GameState.ts';
import AudioManager from './core/AudioManager.ts';
import { UPGRADES, UpgradeKey, ELEMENT_KINDS, ELEMENTS, CSS } from './config.ts';

// ---- Phaser (DPR-aware FIT, see playbook §1) ----
const dpr = Math.min(window.devicePixelRatio || 1, 2);
const game = new Phaser.Game({
  type: Phaser.WEBGL,
  parent: 'game-container',
  backgroundColor: '#0a1228',
  physics: { default: 'arcade', arcade: { gravity: { x: 0, y: 0 }, debug: false } },
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH, width: window.innerWidth * dpr, height: window.innerHeight * dpr },
  render: { antialias: true },
  scene: [Preloader, Menu, World],
});
window.addEventListener('resize', () => game.scale.refresh());
window.addEventListener('orientationchange', () => game.scale.refresh());

const $ = (id: string) => document.getElementById(id)!;
const show = (id: string, d = 'flex') => ($(id).style.display = d);
const hide = (id: string) => ($(id).style.display = 'none');

// ---- Icons (SVG inline, playbook §7) ----
const sv = (p: string, sw = 2) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" width="100%" height="100%">${p}</svg>`;
const ICONS: Record<string, string> = {
  wrench: sv('<path d="M14 7a4 4 0 0 1-5 5l-6 6 2 2 6-6a4 4 0 0 0 5-5l-2 2-2-2 2-2z"/>'),
  gear: sv('<circle cx="12" cy="12" r="3.2"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2"/>'),
  shield: sv('<path d="M12 2l8 3v6c0 5-3.4 8.5-8 10-4.6-1.5-8-5-8-10V5z"/>'),
  fuel: sv('<rect x="4" y="3" width="9" height="18" rx="1.5"/><path d="M13 8h3a2 2 0 0 1 2 2v6a1.5 1.5 0 0 0 3 0V9l-3-3"/>'),
  map: sv('<path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2z"/><path d="M9 4v14M15 6v14"/>'),
  pause: sv('<rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/>'),
  box: sv('<path d="M3 7l9-4 9 4-9 4-9-4z"/><path d="M3 7v10l9 4 9-4V7"/><path d="M12 11v10"/>'),
  beam: sv('<circle cx="12" cy="6" r="2.5"/><path d="M10 8l-5 12M14 8l5 12M8 20h8"/>'),
  target: sv('<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="2.5"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>'),
  x: sv('<path d="M6 6l12 12M18 6L6 18"/>', 2.4),
  heart: sv('<path d="M12 21s-7-4.5-9.3-9A5 5 0 0 1 12 6a5 5 0 0 1 9.3 6c-2.3 4.5-9.3 9-9.3 9z"/>'),
  boost: sv('<path d="M13 2L4 14h6l-1 8 9-12h-6z"/>'),
  core: sv('<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/>'),
};
document.querySelectorAll('[data-ic]').forEach((el) => { const k = (el as HTMLElement).dataset.ic!; if (ICONS[k]) el.innerHTML = ICONS[k]; });

// ---- Loading ----
EventBus.on('load_progress', (p: number) => { ($('loading-bar') as HTMLElement).style.width = Math.round(p * 100) + '%'; });
EventBus.on('load_complete', () => { const el = $('loading-screen'); gsap.to(el, { opacity: 0, duration: 0.5, onComplete: () => (el.style.display = 'none') }); });

// ---- Menu ----
EventBus.on('enter_menu', () => {
  ['hud', 'planet-panel', 'minimap-panel', 'hangar-panel', 'pause-panel', 'dead-overlay', 'gameover-overlay', 'win-overlay', 'settings-panel', 'event-banner'].forEach(hide);
  $('menu-credits').textContent = String(GameState.getCredits());
  $('menu-medal').style.display = GameState.hasWon() ? 'flex' : 'none';
  show('menu-overlay');
});
$('btn-launch').addEventListener('click', () => { AudioManager.uiConfirm(); hide('menu-overlay'); EventBus.emit('start_run'); });
$('btn-hangar').addEventListener('click', () => { AudioManager.uiTap(); renderHangar(); show('hangar-panel'); });
$('btn-hangar-close').addEventListener('click', () => { AudioManager.uiTap(); hide('hangar-panel'); });

EventBus.on('enter_world', () => { hide('menu-overlay'); show('hud', 'block'); });

// ---- HUD ----
EventBus.on('hud', (d: any) => {
  ($('hp-bar') as HTMLElement).style.width = Math.max(0, (d.hp / d.maxHp) * 100) + '%';
  ($('hp-bar') as HTMLElement).style.background = d.hp / d.maxHp < 0.3 ? '#ff5a47' : '#76e08a';
  ($('fuel-bar') as HTMLElement).style.width = Math.max(0, (d.fuel / d.maxFuel) * 100) + '%';
  ($('fuel-bar') as HTMLElement).style.background = d.fuel / d.maxFuel < 0.2 ? '#ff5a47' : '#ffcf5a';
  $('hud-credits').textContent = String(d.credits);
  $('hud-cargo').textContent = `${d.cargo}/${d.cargoMax}`;
  $('day-label').textContent = d.night ? 'NIGHT' : 'DAY';
  const lv = $('hud-lives'); const n = d.lives ?? 9;
  let h = ''; for (let i = 0; i < n; i++) h += '<span style="width:5px;height:5px;border-radius:9999px;background:#ff5a47;display:inline-block;box-shadow:0 0 4px #ff5a47"></span>';
  lv.innerHTML = h;
  const bf = $('hud-buffs');
  if (d.buffs) {
    const col: Record<string, string> = { shield: '#6ea8ff', heal: '#76e08a', speed: '#ff7a3c', redbullet: '#ff2b4e' };
    const lbl: Record<string, string> = { shield: 'SHLD', heal: 'HEAL', speed: 'SPD', redbullet: '2×DMG' };
    bf.innerHTML = d.buffs.map((b: any) => `<span class="glass rounded-md px-1.5 py-0.5 font-mono text-[10px]" style="color:${col[b.kind]};border:1px solid ${col[b.kind]}">${lbl[b.kind]} ${b.remain}s</span>`).join('');
  }
});

// ---- Radar compass + ship pos cache ----
let shipPos = { x: 2000, y: 2000 };
EventBus.on('radar', (d: any) => {
  shipPos = { x: d.x, y: d.y };
  const box = $('radar-blips');
  if (d.jammed) { box.innerHTML = '<div class="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 font-mono text-[8px] text-ember">JAMMED</div>'; return; }
  let html = '';
  for (const b of d.blips) {
    const r = Math.min(34, 7 + (b.dist / 1500) * 34);
    const x = 42 + Math.cos(b.angle) * r, y = 42 + Math.sin(b.angle) * r;
    html += `<div class="absolute rounded-full" style="left:${x}px;top:${y}px;width:6px;height:6px;transform:translate(-50%,-50%);background:${b.css};box-shadow:0 0 5px ${b.css}"></div>`;
  }
  box.innerHTML = html;
  if (mmOpen) drawMinimap();
});

// ---- Joystick ----
(() => {
  const zone = $('joy-zone'), base = $('joy-base'), knob = $('joy-knob');
  const R = 46; let id: number | null = null; let bx = 0, by = 0;
  const setBase = (cx: number, cy: number) => { base.style.left = cx + 'px'; base.style.top = cy + 'px'; base.style.transform = 'translate(-50%,-50%)'; base.style.opacity = '1'; bx = cx; by = cy; };
  zone.addEventListener('pointerdown', (e) => {
    id = e.pointerId; (zone as HTMLElement).setPointerCapture(id);
    setBase(e.clientX, e.clientY); knob.style.transform = 'translate(-50%,-50%)';
    AudioManager.init();
  });
  zone.addEventListener('pointermove', (e) => {
    if (id !== e.pointerId) return;
    let dx = e.clientX - bx, dy = e.clientY - by; const len = Math.hypot(dx, dy) || 1;
    const cl = Math.min(len, R); const kx = (dx / len) * cl, ky = (dy / len) * cl;
    knob.style.transform = `translate(calc(-50% + ${kx}px), calc(-50% + ${ky}px))`;
    EventBus.emit('joy', { x: dx / len, y: dy / len, mag: Math.min(1, len / R) });
  });
  const end = (e: PointerEvent) => { if (id !== e.pointerId) return; id = null; base.style.opacity = '0'; knob.style.transform = 'translate(-50%,-50%)'; EventBus.emit('joy', { x: 0, y: 0, mag: 0 }); };
  zone.addEventListener('pointerup', end); zone.addEventListener('pointercancel', end); zone.addEventListener('lostpointercapture', end);
})();

// ---- Fire / Mine buttons ----
const holdButton = (id: string, evt: string) => {
  const el = $(id);
  const dn = (e: Event) => { e.preventDefault(); EventBus.emit(evt, { down: true }); };
  const up = () => EventBus.emit(evt, { down: false });
  el.addEventListener('pointerdown', dn); el.addEventListener('pointerup', up); el.addEventListener('pointerleave', up); el.addEventListener('pointercancel', up);
};
holdButton('fire-btn', 'fire');
holdButton('boost-btn', 'boost');

// ---- Pause ----
$('btn-pause').addEventListener('click', () => { AudioManager.uiTap(); EventBus.emit('ui_pause'); });
EventBus.on('show_pause', () => { syncSlider('music-vol-p', 'music-val-p', Math.round(GameState.getMusicVol() * 100)); syncSlider('sfx-vol-p', 'sfx-val-p', Math.round(GameState.getSfxVol() * 100)); show('pause-panel'); });
EventBus.on('hide_pause', () => hide('pause-panel'));
wireSlider('music-vol-p', 'music-val-p', (v) => { AudioManager.setMusicVolume(v); GameState.setMusicVol(v); });
wireSlider('sfx-vol-p', 'sfx-val-p', (v) => { AudioManager.setSfxVolume(v); GameState.setSfxVol(v); });
$('btn-resume').addEventListener('click', () => { AudioManager.uiTap(); EventBus.emit('ui_resume'); });
$('btn-pause-menu').addEventListener('click', () => { hide('pause-panel'); EventBus.emit('ui_resume'); EventBus.emit('ui_to_menu'); });

// ---- Minimap ----
let mmOpen = false; let mmIslands: any[] = [];
EventBus.on('minimap', (d: any) => { mmIslands = d.islands; renderLegend(); });
$('btn-map').addEventListener('click', () => { AudioManager.uiTap(); mmOpen = true; drawMinimap(); show('minimap-panel'); });
$('btn-map-close').addEventListener('click', () => { AudioManager.uiTap(); mmOpen = false; hide('minimap-panel'); });
function drawMinimap(): void {
  const cv = $('minimap-canvas') as HTMLCanvasElement; const ctx = cv.getContext('2d'); if (!ctx) return;
  const S = cv.width, W = 4000; const sc = S / W;
  ctx.clearRect(0, 0, S, S);
  ctx.strokeStyle = 'rgba(79,224,216,0.12)'; ctx.lineWidth = 1;
  for (let i = 1; i < 5; i++) { ctx.beginPath(); ctx.moveTo(i * S / 5, 0); ctx.lineTo(i * S / 5, S); ctx.moveTo(0, i * S / 5); ctx.lineTo(S, i * S / 5); ctx.stroke(); }
  for (const i of mmIslands) {
    ctx.fillStyle = i.css; ctx.beginPath(); ctx.arc(i.x * sc, i.y * sc, Math.max(3, i.r * sc * 0.9), 0, Math.PI * 2); ctx.fill();
  }
  // ship
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(shipPos.x * sc, shipPos.y * sc, 4, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#8af7ff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(shipPos.x * sc, shipPos.y * sc, 7, 0, Math.PI * 2); ctx.stroke();
}
function renderLegend(): void {
  const seen = new Set<string>(); let html = '';
  const names: Record<string, string> = { mother: 'Mother', resource: 'Element', heal: 'Heal', storm: 'Storm', forge: 'Forge' };
  for (const i of mmIslands) { if (seen.has(i.role)) continue; seen.add(i.role); html += `<span class="flex items-center gap-1"><span class="w-2.5 h-2.5 rounded-full" style="background:${i.css}"></span>${names[i.role] ?? i.role}</span>`; }
  $('minimap-legend').innerHTML = html;
}

// ---- Planet docking (resource harvest / mother delivery / forge) ----
let dock: any = null;
EventBus.on('dock', (d: any) => {
  dock = d;
  if (d.role === 'forge') { hide('planet-panel'); renderHangar(); show('hangar-panel'); return; }
  positionPanel(d.role === 'mother');   // mother → dead-centre; resource → bottom
  renderPlanet(); show('planet-panel');
});
function positionPanel(centered: boolean): void {
  const p = $('planet-panel');
  if (centered) { p.style.top = '50%'; p.style.bottom = ''; p.style.transform = 'translate(-50%,-50%)'; }
  else { p.style.top = ''; p.style.bottom = 'max(env(safe-area-inset-bottom),18px)'; p.style.transform = 'translateX(-50%)'; }
}
EventBus.on('dock_update', (d: any) => { if (dock && dock.role === 'resource') { dock.cargo = d.cargo; dock.cargoMax = d.cargoMax; renderPlanet(); } });
EventBus.on('mother_progress', (d: any) => { if (dock && dock.role === 'mother') { dock.stock = d.stock; dock.require = d.require; dock.cargo = d.cargo; renderPlanet(); } });
EventBus.on('undock', () => { dock = null; hide('planet-panel'); hide('hangar-panel'); });
function cargoTotal(c: any): number { return ELEMENT_KINDS.reduce((s, k) => s + (c[k] ?? 0), 0); }
function elInv(cargo: any, highlight?: string): string {
  return ELEMENT_KINDS.map((k) => { const m = ELEMENTS[k]; const hl = k === highlight;
    return `<div class="flex items-center gap-1" style="color:${hl ? m.css : '#9fb0d0'};${hl ? 'font-weight:700' : ''}"><span class="w-2 h-2 rounded-full" style="background:${m.css}"></span><span class="font-mono text-[11px]">${cargo[k] ?? 0}</span></div>`;
  }).join('');
}
function renderPlanet(): void {
  const c = $('planet-content');
  if (dock.role === 'resource') {
    c.innerHTML = `<div class="flex items-center justify-between">
        <div><div class="font-display font-bold text-lg text-ink">${dock.name}</div>
          <div class="font-body text-xs tracking-wider" style="color:${dock.element.css}">HARVESTING ${dock.element.name.toUpperCase()} · +2/s</div></div>
        <div class="font-mono text-aether text-[11px]">CARGO ${cargoTotal(dock.cargo)}/${dock.cargoMax}</div>
      </div>
      <div class="grid grid-cols-5 gap-x-2 gap-y-1 mt-2">${elInv(dock.cargo, dock.element.key)}</div>`;
  } else if (dock.role === 'mother') {
    const req = dock.require; const tiers: number[] = dock.tiers ?? [req]; const tier = dock.tier ?? 0;
    const ticks = tiers.slice(0, -1).map((t: number) => `<div class="absolute top-0 bottom-0 w-px bg-skyNight/80" style="left:${(t / req) * 100}%"></div>`).join('');
    let rows = '';
    for (const k of ELEMENT_KINDS) { const m = ELEMENTS[k]; const s = dock.stock[k] ?? 0; const pct = Math.min(100, (s / req) * 100); const done = s >= req;
      rows += `<div class="flex items-center gap-2"><span class="w-2.5 h-2.5 rounded-full" style="background:${m.css}"></span>
        <span class="flex-1 font-body text-[12px] text-ink/80">${m.name}</span>
        <div class="relative w-24 h-1.5 bar-track"><div class="bar-fill" style="width:${pct}%;background:${done ? '#76e08a' : m.css}"></div>${ticks}</div>
        <span class="font-mono text-[10px] w-12 text-right ${done ? 'text-hpGood' : 'text-ink/50'}">${s}/${req}</span></div>`; }
    let transferBar = '';
    if (dock.transfer != null) transferBar = `<div class="mb-2"><div class="flex justify-between text-[11px] font-mono text-aether mb-0.5"><span>TRANSFERRING CARGO…</span><span>${Math.round(dock.transfer * 100)}%</span></div><div class="h-2 bar-track"><div class="bar-fill bg-aether" style="width:${dock.transfer * 100}%"></div></div></div>`;
    c.innerHTML = `<div class="flex items-center justify-between"><div class="font-display font-bold text-lg text-gold">${dock.name}</div>
        <div class="font-mono text-aetherHot text-sm">TIER ${tier}/${tiers.length}</div></div>
      <p class="font-body text-[12px] text-ink/55 mt-0.5 mb-2">Dock to deposit cargo · evolve the Heart to tier ${tiers.length} to win</p>
      ${transferBar}<div class="flex flex-col gap-1.5">${rows}</div>`;
  }
}
EventBus.on('win', () => { hide('hud'); hide('planet-panel'); show('win-overlay'); });

// ---- Events ----
let eventTimer: ReturnType<typeof setTimeout> | undefined;
EventBus.on('event', (d: any) => {
  const dur = d.dur ?? 5000;
  $('event-title').textContent = d.title; $('event-title').style.color = d.color;
  $('event-desc').textContent = d.desc;
  ($('event-card') as HTMLElement).style.borderColor = d.color;
  const el = $('event-banner');
  // Drive show/hide with GSAP only (no CSS keyframe) so rapid re-triggers don't flicker or stick.
  el.classList.remove('banner-in'); el.style.animation = 'none';
  el.style.display = 'block';
  gsap.killTweensOf(el);
  gsap.fromTo(el, { opacity: 0, y: -16, scale: 0.96 }, { opacity: 1, y: 0, scale: 1, duration: 0.25, ease: 'back.out(2)' });
  if (eventTimer) clearTimeout(eventTimer);
  eventTimer = setTimeout(() => {
    gsap.to(el, { opacity: 0, y: -12, duration: 0.3, ease: 'power2.in', onComplete: () => { el.style.display = 'none'; } });
  }, dur);
});

// ---- Death / respawn / game over ----
EventBus.on('dead', (d: any) => { $('dead-sub').textContent = `${d.lives} live${d.lives === 1 ? '' : 's'} left · all cargo lost`; show('dead-overlay'); });
EventBus.on('respawn', () => hide('dead-overlay'));
EventBus.on('gameover', (d: any) => { $('gameover-best').textContent = String(d.best); hide('hud'); show('gameover-overlay'); });

// ---- Toast ----
EventBus.on('toast', (d: { text: string; color?: string }) => {
  const css = d.color ?? CSS.aether;
  const t = document.createElement('div'); t.className = 'glass px-3.5 py-1.5 rounded-xl text-sm font-display font-bold';
  t.style.color = css; t.style.borderColor = css; t.textContent = d.text;
  $('toast-container').appendChild(t);
  gsap.fromTo(t, { opacity: 0, y: -12, scale: 0.9 }, { opacity: 1, y: 0, scale: 1, duration: 0.3 });
  gsap.to(t, { opacity: 0, y: -10, duration: 0.4, delay: 1.4, onComplete: () => t.remove() });
});

// ---- Hangar (upgrades) ----
const UMETA: Record<UpgradeKey, { color: string }> = { engine: { color: '#4fe0d8' }, hull: { color: '#76e08a' }, cargo: { color: '#ffcf5a' }, weapon: { color: '#ff9d3c' } };
function renderHangar(): void {
  $('hangar-credits').textContent = String(GameState.getCredits());
  const keys = Object.keys(UPGRADES) as UpgradeKey[];
  let html = '';
  for (const k of keys) {
    const u = UPGRADES[k]; const lvl = GameState.getUpgrade(k); const maxed = lvl >= u.max;
    const cost = maxed ? 0 : u.cost(lvl); const can = !maxed && GameState.getCredits() >= cost; const col = UMETA[k].color;
    const pips = Array.from({ length: u.max }, (_, i) => `<div class="w-5 h-1.5 rounded-full" style="background:${i < lvl ? col : 'rgba(255,255,255,0.15)'}"></div>`).join('');
    html += `<div class="glass rounded-2xl p-3.5">
      <div class="flex items-start gap-3">
        <div class="flex-1"><div class="font-display font-bold" style="color:${col}">${u.name}</div>
          <div class="font-body text-[12px] text-ink/55">${u.desc}</div>
          <div class="flex gap-1 mt-2">${pips}</div></div>
        <button data-up="${k}" ${maxed || !can ? 'disabled' : ''} class="neon-btn px-3 py-2 rounded-xl font-mono font-bold text-xs ${maxed ? 'opacity-60' : ''}"
          style="${maxed ? 'background:rgba(118,224,138,0.15);color:#76e08a' : can ? `background:${col};color:#0a1228` : 'background:rgba(255,255,255,0.06);color:rgba(255,255,255,0.4)'}">${maxed ? 'MAX' : '◈ ' + cost}</button>
      </div></div>`;
  }
  $('hangar-list').innerHTML = html;
  $('hangar-list').querySelectorAll('[data-up]').forEach((b) => b.addEventListener('click', () => {
    const k = (b as HTMLElement).dataset.up as UpgradeKey;
    if (GameState.buyUpgrade(k)) { AudioManager.uiConfirm(); EventBus.emit('toast', { text: UPGRADES[k].name + ' UP', color: UMETA[k].color }); }
    else AudioManager.uiTap();
    renderHangar(); $('menu-credits').textContent = String(GameState.getCredits());
  }));
}

// ---- Settings ----
$('btn-settings').addEventListener('click', () => { AudioManager.uiTap(); syncSlider('music-vol', 'music-val', Math.round(GameState.getMusicVol() * 100)); syncSlider('sfx-vol', 'sfx-val', Math.round(GameState.getSfxVol() * 100)); show('settings-panel'); });
$('btn-close-settings').addEventListener('click', () => { AudioManager.uiTap(); hide('settings-panel'); });
function syncSlider(id: string, valId: string, pct: number): void { const s = $(id) as HTMLInputElement; s.value = String(pct); s.style.setProperty('--pct', pct + '%'); $(valId).textContent = pct + '%'; }
function wireSlider(id: string, valId: string, cb: (v: number) => void): void { const s = $(id) as HTMLInputElement; s.addEventListener('input', () => { const pct = parseInt(s.value); s.style.setProperty('--pct', pct + '%'); $(valId).textContent = pct + '%'; cb(pct / 100); }); }
wireSlider('music-vol', 'music-val', (v) => { AudioManager.setMusicVolume(v); GameState.setMusicVol(v); });
wireSlider('sfx-vol', 'sfx-val', (v) => { AudioManager.setSfxVolume(v); GameState.setSfxVol(v); });
let resetPending = false;
$('btn-reset').addEventListener('click', () => { AudioManager.uiTap(); if (!resetPending) { resetPending = true; $('reset-label').textContent = 'Tap again to confirm'; setTimeout(() => { resetPending = false; $('reset-label').textContent = 'Reset All Data'; }, 3000); } else { GameState.reset(); resetPending = false; $('reset-label').textContent = 'Reset All Data'; hide('settings-panel'); $('menu-credits').textContent = '0'; } });
