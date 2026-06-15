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
import { WORLD, UPGRADES, UpgradeKey, ENEMIES, EnemyKind, CSS } from './config.ts';
import { LEVELS } from './data/Levels.ts';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.WEBGL,
  parent: 'game-container',
  backgroundColor: '#04060a',
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH, width: WORLD.width, height: WORLD.height },
  render: { antialias: true, roundPixels: false } as any,
  scene: [Preloader, Menu, GamePlay, Shop],
};
const game = new Phaser.Game(config);
window.addEventListener('resize', () => game.scale.refresh());
window.addEventListener('orientationchange', () => game.scale.refresh());

const $ = (id: string) => document.getElementById(id)!;
const show = (id: string, d = 'flex') => ($(id).style.display = d);
const hide = (id: string) => ($(id).style.display = 'none');

let selLevel = 1;
let pendingNext: number | null = null;

// ---- Loading ----
EventBus.on('load_progress', (p: number) => { ($('loading-bar') as HTMLElement).style.width = Math.round(p * 100) + '%'; });
EventBus.on('load_complete', () => { const el = $('loading-screen'); gsap.to(el, { opacity: 0, duration: 0.5, onComplete: () => (el.style.display = 'none') }); });

// ---- Menu / level select ----
const ICON_STAR = '<svg viewBox="0 0 24 24" width="11" height="11" fill="currentColor"><path d="M12 2l3 6.5 7 .8-5 4.8 1.3 7L12 17.8 5.4 21l1.3-7-5-4.8 7-.8z"/></svg>';
const ICON_LOCK = '<svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" stroke-width="2.4"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>';
const ICON_DOT  = '<svg viewBox="0 0 24 24" width="9" height="9" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="6"/></svg>';

function renderMenu(): void {
  $('menu-cubes').textContent = String(GameState.getCubes());
  if (!GameState.isLevelUnlocked(selLevel)) selLevel = GameState.getHighestLevel();
  renderLevels();
}
// Vertical winding "intrusion map": level 1 at the top (entry), deeper sectors descend.
const ROW_H = 76;
function renderLevels(): void {
  const map = $('level-map');
  const n = LEVELS.length;
  const contentH = n * ROW_H + 50;
  map.style.height = contentH + 'px';
  const nx = (i: number) => 50 + Math.sin(i * 0.95) * 30;          // winding x in %
  const ny = (i: number) => i * ROW_H + 42;                        // level 1 at top, deeper = down

  // Connector polyline (SVG stretched across the width)
  let svg = `<svg width="100%" height="${contentH}" viewBox="0 0 100 ${contentH}" preserveAspectRatio="none" style="position:absolute;inset:0;pointer-events:none">`;
  for (let i = 0; i < n - 1; i++) {
    const cleared = GameState.isLevelCleared(LEVELS[i + 1].id) || GameState.isLevelCleared(LEVELS[i].id);
    const unlocked = GameState.isLevelUnlocked(LEVELS[i + 1].id);
    const col = cleared ? '#62ff8a' : unlocked ? '#1cf2ff' : '#2a3550';
    svg += `<line x1="${nx(i)}" y1="${ny(i)}" x2="${nx(i + 1)}" y2="${ny(i + 1)}" stroke="${col}" stroke-width="2" stroke-dasharray="${unlocked ? '0' : '5 5'}" vector-effect="non-scaling-stroke" opacity="0.7"/>`;
  }
  svg += '</svg>';

  // Node buttons (absolute over the SVG)
  let nodes = '';
  LEVELS.forEach((lv, i) => {
    const unlocked = GameState.isLevelUnlocked(lv.id);
    const cleared = GameState.isLevelCleared(lv.id);
    const sel = lv.id === selLevel;
    const ring = sel ? '#1cf2ff' : cleared ? 'rgba(98,255,138,0.6)' : unlocked ? 'rgba(28,242,255,0.35)' : 'rgba(255,255,255,0.12)';
    const numCol = sel ? '#1cf2ff' : unlocked ? '#dfe8ff' : 'rgba(255,255,255,0.4)';
    const badge = cleared ? `<span class="absolute -top-1.5 -right-1.5 text-neonLime">${ICON_STAR}</span>` : !unlocked ? `<span class="absolute -bottom-1 -right-1 text-white/40">${ICON_LOCK}</span>` : '';
    nodes += `<button data-id="${lv.id}" ${unlocked ? '' : 'disabled'} class="lvl-node ${sel ? 'sel' : ''}" style="position:absolute;left:${nx(i)}%;top:${ny(i)}px;transform:translate(-50%,-50%);width:46px;height:46px;border-radius:14px;border:2px solid ${ring};background:rgba(14,22,38,0.85);box-shadow:${sel ? '0 0 16px rgba(28,242,255,0.5)' : 'none'};${unlocked ? '' : 'opacity:0.5;'}">
      <span class="font-display font-bold text-sm" style="color:${numCol}">${lv.id}</span>${badge}</button>`;
  });
  map.innerHTML = svg + nodes;

  map.querySelectorAll('.lvl-node').forEach((el) => {
    el.addEventListener('click', () => {
      const id = parseInt((el as HTMLElement).dataset.id!);
      if (!GameState.isLevelUnlocked(id)) return;
      selLevel = id; AudioManager.uiTap(); renderLevels();
    });
  });

  // Scroll selected node into view
  const selNode = map.querySelector('.lvl-node.sel') as HTMLElement | null;
  selNode?.scrollIntoView({ behavior: 'smooth', block: 'center' });

  const lv = LEVELS.find((x) => x.id === selLevel)!;
  $('level-info').innerHTML = `<span class="text-neonCyan font-bold">SECTOR ${lv.id} · ${lv.name}</span> <span class="text-white/40">· ${lv.enemies.length} hostiles</span>`;
}

EventBus.on('enter_menu', () => { hide('hud'); hide('pause-panel'); hide('result-panel'); hide('shop-panel'); hide('settings-panel'); hide('guide-panel'); renderMenu(); show('menu-overlay'); });
$('btn-launch').addEventListener('click', () => { AudioManager.uiConfirm(); hide('menu-overlay'); EventBus.emit('start_run', selLevel); });
$('btn-menu-shop').addEventListener('click', () => { hide('menu-overlay'); EventBus.emit('open_shop'); });

// ---- HUD ----
EventBus.on('enter_game', (d: any) => { hide('menu-overlay'); hide('shop-panel'); hide('result-panel'); hide('pause-panel'); show('hud', 'block'); $('hud-level').textContent = `${d.level} · ${d.name}`; });
EventBus.on('hud', (d: any) => {
  ($('hp-bar') as HTMLElement).style.width = Math.max(0, (d.hp / d.maxHp) * 100) + '%';
  $('hud-score').textContent = String(d.score);
  // stamina cells
  const cells = $('stamina-cells');
  if (cells.children.length !== d.maxStamina) {
    cells.innerHTML = '';
    for (let i = 0; i < d.maxStamina; i++) { const c = document.createElement('div'); c.className = 'stam'; cells.appendChild(c); }
  }
  for (let i = 0; i < cells.children.length; i++) (cells.children[i] as HTMLElement).className = 'stam' + (i < d.stamina ? ' on' : '');
  // combo flash
  if (d.combo >= 2) {
    const f = $('combo-flash'); f.textContent = `${d.combo}× COMBO`;
    if (f.style.opacity !== '1') { gsap.killTweensOf(f); gsap.fromTo(f, { opacity: 1, scale: 1.4 }, { opacity: 0, scale: 1, duration: 0.6 }); }
  }
});
$('btn-pause').addEventListener('click', () => { AudioManager.uiTap(); EventBus.emit('ui_pause'); });

// ---- Pause ----
EventBus.on('show_pause', () => show('pause-panel'));
EventBus.on('hide_pause', () => hide('pause-panel'));
$('btn-resume').addEventListener('click', () => { AudioManager.uiTap(); EventBus.emit('ui_resume'); });
$('btn-pause-retry').addEventListener('click', () => { hide('pause-panel'); EventBus.emit('ui_retry'); });
$('btn-pause-quit').addEventListener('click', () => { hide('pause-panel'); EventBus.emit('ui_quit_run'); });

// ---- Result ----
EventBus.on('run_complete', (d: any) => {
  hide('hud');
  $('result-icon').textContent = '⚔️';
  $('result-title').textContent = 'SECTOR CLEARED';
  $('result-title').style.color = '#62ff8a';
  $('result-sub').textContent = d.hasNext ? 'Flawless execution, runner.' : 'You reached Code Zero.';
  $('result-breakdown').innerHTML = `
    <div class="flex justify-between"><span class="text-white/50">Score</span><span class="text-dataBlue">${d.score}</span></div>
    <div class="flex justify-between"><span class="text-white/50">Data harvested</span><span class="text-neonLime">◈ ${d.cubes}</span></div>
    <div class="flex justify-between text-white/40 border-t border-white/10 pt-1 mt-1"><span>Total Data</span><span>◈ ${d.totalCubes}</span></div>`;
  if (d.hasNext) { pendingNext = d.nextLevel; ($('btn-result-next') as HTMLElement).style.display = 'block'; }
  else { pendingNext = null; ($('btn-result-next') as HTMLElement).style.display = 'none'; }
  show('result-panel');
});
EventBus.on('run_failed', (d: any) => {
  hide('hud'); pendingNext = null; ($('btn-result-next') as HTMLElement).style.display = 'none';
  $('result-icon').textContent = d.reason === 'pit' ? '☠️' : '💥';
  $('result-title').textContent = d.reason === 'pit' ? 'DELETED' : 'SYSTEM FAILURE';
  $('result-title').style.color = '#ff2b4e';
  $('result-sub').textContent = d.reason === 'pit' ? 'You fell into the dead-zone.' : 'Integrity dropped to zero.';
  $('result-breakdown').innerHTML = `<div class="flex justify-between"><span class="text-white/50">Score</span><span class="text-dataBlue">${d.score}</span></div><div class="flex justify-between text-white/40"><span>Total Data</span><span>◈ ${d.totalCubes}</span></div>`;
  show('result-panel');
});
$('btn-result-next').addEventListener('click', () => { if (!pendingNext) return; hide('result-panel'); selLevel = pendingNext; EventBus.emit('ui_next_run', { level: pendingNext }); });
$('btn-result-shop').addEventListener('click', () => { hide('result-panel'); EventBus.emit('ui_to_shop'); });
$('btn-result-retry').addEventListener('click', () => { hide('result-panel'); EventBus.emit('ui_retry'); });
$('btn-result-menu').addEventListener('click', () => { hide('result-panel'); EventBus.emit('ui_quit_run'); });

// ---- Shop ----
const UPGRADE_META: Record<UpgradeKey, { name: string; desc: string; icon: string; color: string }> = {
  chain: { name: 'Chain Capacity', desc: 'Lock +1 target per slash (3→5)', color: '#1cf2ff', icon: `<svg viewBox="0 0 24 24" width="100%" height="100%" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="6" cy="6" r="3"/><circle cx="18" cy="18" r="3"/><path d="M8.5 8.5l7 7"/></svg>` },
  parry: { name: 'Parry Shield', desc: 'Front-hit damage halved', color: '#3da8ff', icon: `<svg viewBox="0 0 24 24" width="100%" height="100%" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 2l8 3v6c0 5-3.4 8.5-8 10-4.6-1.5-8-5-8-10V5z"/></svg>` },
  emp: { name: 'EMP Burst', desc: 'Landing stuns nearby foes 2s', color: '#a05cff', icon: `<svg viewBox="0 0 24 24" width="100%" height="100%" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="3"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4M5 5l3 3M16 16l3 3M19 5l-3 3M8 16l-3 3"/></svg>` },
};
EventBus.on('enter_shop', () => { hide('menu-overlay'); hide('hud'); hide('result-panel'); show('shop-panel'); });
EventBus.on('shop_data', (d: any) => {
  $('shop-cubes').textContent = String(d.cubes);
  const list = $('shop-list'); list.innerHTML = '';
  d.upgrades.forEach((u: any) => {
    const meta = UPGRADE_META[u.key as UpgradeKey];
    const maxLevel = UPGRADES[u.key as UpgradeKey].maxLevel;
    const affordable = !u.maxed && d.cubes >= u.cost;
    const pips = Array.from({ length: maxLevel }, (_, i) => `<div class="pip ${i < u.level ? 'on' : ''}"></div>`).join('');
    const card = document.createElement('div');
    card.className = 'card rounded-2xl p-4 border pop-in';
    card.style.borderColor = u.maxed ? 'rgba(98,255,138,0.4)' : `${meta.color}33`;
    card.innerHTML = `
      <div class="flex items-start gap-3">
        <div class="w-11 h-11 rounded-xl flex items-center justify-center flex-none p-2.5" style="background:rgba(255,255,255,0.05);border:1px solid ${meta.color}44;color:${meta.color}">${meta.icon}</div>
        <div class="flex-1 min-w-0"><div class="font-display font-bold text-sm" style="color:${meta.color}">${meta.name}</div><div class="text-[11px] text-white/50 font-body leading-tight">${meta.desc}</div><div class="flex gap-1 mt-2">${pips}</div></div>
        <button class="buy-btn neon-btn flex-none px-3 py-2 rounded-lg font-mono font-bold text-xs ${u.maxed ? 'opacity-50' : ''}" style="${u.maxed ? 'background:rgba(98,255,138,0.15);color:#62ff8a;border:1px solid rgba(98,255,138,0.4)' : affordable ? `background:${meta.color};color:#04060a` : 'background:rgba(255,255,255,0.05);color:rgba(255,255,255,0.4);border:1px solid rgba(255,255,255,0.1)'}" ${u.maxed ? 'disabled' : ''}>${u.maxed ? 'MAX' : `◈ ${u.cost}`}</button>
      </div>`;
    if (!u.maxed) card.querySelector('.buy-btn')!.addEventListener('click', () => EventBus.emit('shop_buy', { key: u.key }));
    list.appendChild(card);
  });
});
$('btn-shop-close').addEventListener('click', () => { hide('shop-panel'); EventBus.emit('shop_close'); });

// ---- Settings ----
$('btn-menu-settings').addEventListener('click', () => { AudioManager.uiTap(); syncSlider('music-vol', 'music-val', Math.round(GameState.getMusicVol() * 100)); syncSlider('sfx-vol', 'sfx-val', Math.round(GameState.getSfxVol() * 100)); show('settings-panel'); });
['btn-close-settings', 'btn-settings-done'].forEach((id) => $(id).addEventListener('click', () => { AudioManager.uiTap(); hide('settings-panel'); }));
function syncSlider(id: string, valId: string, pct: number): void { const s = $(id) as HTMLInputElement; s.value = String(pct); s.style.setProperty('--pct', pct + '%'); $(valId).textContent = pct + '%'; }
function wireSlider(id: string, valId: string, cb: (v: number) => void): void { const s = $(id) as HTMLInputElement; s.addEventListener('input', () => { const pct = parseInt(s.value); s.style.setProperty('--pct', pct + '%'); $(valId).textContent = pct + '%'; cb(pct / 100); }); }
wireSlider('music-vol', 'music-val', (v) => { AudioManager.setMusicVolume(v); GameState.setMusicVol(v); });
wireSlider('sfx-vol', 'sfx-val', (v) => { AudioManager.setSfxVolume(v); GameState.setSfxVol(v); });
let resetPending = false;
$('btn-reset').addEventListener('click', () => { AudioManager.uiTap(); if (!resetPending) { resetPending = true; $('reset-label').textContent = 'Tap again to confirm'; setTimeout(() => { resetPending = false; $('reset-label').textContent = 'Reset All Data'; }, 3000); } else { GameState.reset(); resetPending = false; $('reset-label').textContent = 'Reset All Data'; hide('settings-panel'); renderMenu(); } });

// ---- How to Play (built from config so it never drifts from the real game) ----
const hex = (n: number) => '#' + n.toString(16).padStart(6, '0');
const svg = (p: string) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="100%" height="100%">${p}</svg>`;
const GUIDE_IC: Record<string, string> = {
  hold: svg('<path d="M9 11V6a2 2 0 0 1 4 0v5"/><path d="M13 8a2 2 0 0 1 4 0v4"/><path d="M5 12a2 2 0 0 1 4 0M5 12v3a6 6 0 0 0 6 6h1a6 6 0 0 0 6-6v-3"/>'),
  chain: svg('<circle cx="6" cy="6" r="3"/><circle cx="18" cy="18" r="3"/><path d="M8.5 8.5l7 7"/>'),
  slash: svg('<path d="M4 20L20 4"/><path d="M14 4h6v6"/>'),
  bounce: svg('<path d="M4 4v16"/><path d="M4 8h10l-3-3M14 8l-3 3"/><path d="M20 16h-8"/>'),
  star: svg('<polygon points="12 2 15 8.5 22 9.3 17 14.1 18.3 21 12 17.8 5.7 21 7 14.1 2 9.3 9 8.5"/>'),
  hp: svg('<path d="M12 21C7 17 3 13.5 3 9a4.5 4.5 0 0 1 9-1 4.5 4.5 0 0 1 9 1c0 4.5-4 8-9 12z"/>'),
  pit: svg('<path d="M12 3v12"/><path d="M8 11l4 4 4-4"/><path d="M4 20h16"/>'),
};
function renderGuide(): void {
  const sec = (color: string, title: string, inner: string) => `<div class="glass rounded-2xl p-4 flex flex-col gap-3">
    <div class="flex items-center gap-2"><span class="w-1.5 h-4 rounded-full flex-none" style="background:${color}"></span><span class="font-display font-bold text-[11px] tracking-[0.2em] uppercase text-white/90">${title}</span></div>${inner}</div>`;
  const row = (icon: string, color: string, name: string, body: string) => `<div class="flex gap-3 items-start">
    <span class="w-6 h-6 flex-none mt-0.5" style="color:${color}">${GUIDE_IC[icon] ?? ''}</span>
    <div><div class="font-display font-bold text-[13px]" style="color:${color}">${name}</div><div class="font-body text-[12.5px] text-white/65 leading-relaxed">${body}</div></div></div>`;
  const chip = (color: string, label: string, extra = '') => `<span class="px-2.5 py-1 rounded-full text-[11.5px] flex items-center gap-1.5" style="background:rgba(14,22,38,0.7);border:1px solid ${color}44"><span class="w-2 h-2 rounded-full flex-none" style="background:${color}"></span>${label}${extra}</span>`;

  const objective = sec(CSS.lime, 'Objective', `<div class="font-body text-[12.5px] text-white/70 leading-relaxed">You are a code-ninja breaching <b style="color:${CSS.cyan}">${LEVELS.length} sectors</b> of an enemy mainframe. Each sector is a one-screen puzzle: wipe out <b style="color:${CSS.red}">every hostile</b> in a single chained slash to clear it and harvest <b style="color:${CSS.dataBlue}">Data ◈</b>. Clear all sectors to reach <b style="color:${CSS.lime}">CODE ZERO → YOU WIN</b>.</div>`);

  const controls = sec(CSS.cyan, 'Controls', [
    row('hold', CSS.cyan, 'Hold — Slow Time', 'Touch & HOLD anywhere to almost freeze time and aim your strike from the ninja.'),
    row('chain', CSS.violet, 'Drag — Chain Targets', 'While holding, DRAG over enemies to lock them into the slash path. Walls block the line — route around them.'),
    row('slash', CSS.red, 'Release — Slash', 'RELEASE to dash through every locked target in one blur, then land back on a platform.'),
    row('bounce', CSS.amber, 'Border Bounce', 'Drag your finger to a left/right/top edge to stick & ricochet the line — the only way to strike a shield from behind.'),
  ].join(''));

  const survival = sec(CSS.lime, 'Survival', [
    row('hp', '#62ff8a', 'Integrity (HP)', 'Hits from front shields and enemy fire drain it. Reaches 0 → SYSTEM FAILURE.'),
    row('hold', CSS.cyan, 'Stamina', 'Each slash spends one charge. Out of charges → you free-fall, so land safely and let it refill.'),
    row('pit', CSS.red, 'Dead-Zone', 'The bottom of the screen is a delete-zone — fall in and you are instantly DELETED.'),
  ].join(''));

  const ekind = Object.keys(ENEMIES) as EnemyKind[];
  const EDESC: Record<EnemyKind, string> = {
    grunt: 'Unarmored — strike from any side.',
    shielded: 'Front-arc shield — hit its open back, often via a border bounce.',
    ranged: 'Fires at you on a timer — close the distance fast.',
    orbiter: 'Shield ORBITS the body — read the rotation and strike the gap.',
    phaser: 'Full-ring shield that BLINKS — strike in the dark window.',
  };
  const enemies = sec(CSS.red, 'Hostiles', `<div class="flex flex-col gap-2">` + ekind.map((k) => `<div class="text-[12.5px] leading-relaxed"><span class="font-display font-bold" style="color:${hex(ENEMIES[k].color)}">${ENEMIES[k].name}</span> <span class="text-white/65">— ${EDESC[k]}</span></div>`).join('') + `</div><div class="flex flex-wrap gap-2 pt-1">` + ekind.map((k) => chip(hex(ENEMIES[k].color), ENEMIES[k].name, ` <span class="text-dataBlue font-mono ml-0.5">+${ENEMIES[k].score}</span>`)).join('') + `</div>`);

  const ups = sec(CSS.violet, 'Upgrades (buy with ◈)', `<div class="flex flex-col gap-2.5">` + (Object.keys(UPGRADES) as UpgradeKey[]).map((k) => { const m = UPGRADE_META[k]; return `<div class="flex items-center justify-between gap-3 text-[12.5px]"><span class="font-display font-bold flex-none" style="color:${m.color}">${m.name}</span><span class="text-white/55 text-[11px] text-right leading-tight">${m.desc}</span></div>`; }).join('') + `</div>`);

  const scoring = sec(CSS.dataBlue, 'Scoring & Data', `<div class="font-body text-[12.5px] text-white/70 leading-relaxed">Every kill adds <b style="color:${CSS.dataBlue}">Score</b>; chaining multiple kills in one slash builds a <b style="color:${CSS.red}">COMBO</b> for bonus points. Clearing a sector converts your run into <b style="color:${CSS.dataBlue}">Data ◈</b> — spend it in the Upgrade shop.</div>`);

  const tips = sec(CSS.lime, 'Runner Tips', `<div class="flex flex-col gap-2">` + ['Plan the whole route while time is slow — the slash is committed on release.', 'Chain enemies in an order that keeps each segment wall-free.', 'For shielded foes, bounce off a border to reach their open side.', 'Buy Chain Capacity early to clear denser sectors in one strike.'].map((t) => `<div class="flex gap-2.5 text-[12.5px] text-white/70 leading-relaxed"><span class="flex-none" style="color:${CSS.lime}">▸</span>${t}</div>`).join('') + `</div>`);

  $('guide-body').innerHTML = objective + controls + survival + enemies + ups + scoring + tips;
}
// One opener, two triggers (menu + in-game pause) — same modal, layered on top (z-50).
const openGuide = () => { AudioManager.uiTap(); renderGuide(); show('guide-panel'); $('guide-body').scrollTop = 0; };
$('btn-menu-guide').addEventListener('click', openGuide);
$('btn-pause-guide').addEventListener('click', openGuide);
$('btn-guide-close').addEventListener('click', () => { AudioManager.uiTap(); hide('guide-panel'); });

// ---- Toasts ----
EventBus.on('toast', (d: { text: string; color?: string }) => {
  const css = d.color ?? '#1cf2ff';
  const t = document.createElement('div'); t.className = 'px-4 py-2 rounded-xl text-sm font-display font-bold backdrop-blur-md border';
  t.style.background = 'rgba(14,22,38,0.9)'; t.style.borderColor = css; t.style.color = css; t.textContent = d.text;
  $('toast-container').appendChild(t);
  gsap.fromTo(t, { opacity: 0, y: -14, scale: 0.9 }, { opacity: 1, y: 0, scale: 1, duration: 0.3 });
  gsap.to(t, { opacity: 0, y: -10, duration: 0.4, delay: 1.6, onComplete: () => t.remove() });
});
