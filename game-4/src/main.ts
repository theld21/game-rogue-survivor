import './index.css';
import Phaser from 'phaser';
import { gsap } from 'gsap';
import BootScene from './scenes/BootScene.ts';
import MenuScene from './scenes/MenuScene.ts';
import PlayScene from './scenes/PlayScene.ts';
import EventBus from './EventBus.ts';
import Storage from './core/Storage.ts';
import AudioManager from './core/AudioManager.ts';
import { LEVELS, MAX_LEVEL } from './data/Levels.ts';
import { SUPPORT_ITEMS, UPGRADE_SHOP } from './core/GameConfig.ts';
import { supportItemName } from './data/Items.ts';
import { t, setLang, getLang } from './core/i18n.ts';
import { SlotView } from './systems/Inventory.ts';
import type { Lang } from './core/i18n.ts';

// =====================================================================
// main.ts — Phaser bootstrap + HTML/Tailwind overlay driver.
// Scenes emit state; this file owns the DOM and EventBus wiring.
// =====================================================================

// ---- Phaser bootstrap ----
// Internal resolution = viewport × DPR (crisp on retina); Scale.FIT lets
// Phaser scale the canvas via CSS to fit the viewport exactly. Using NONE
// would render the canvas at native pixel size (2-3× too big on iPhone).
const dpr = Math.min(window.devicePixelRatio || 1, 2);
const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.WEBGL,
  parent: 'game-container',
  backgroundColor: '#020a14',
  physics: { default: 'arcade', arcade: { gravity: { x: 0, y: 0 }, debug: false } },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: window.innerWidth * dpr,
    height: window.innerHeight * dpr,
  },
  render: { antialias: true, roundPixels: true } as any,
  scene: [BootScene, MenuScene, PlayScene],
};
const game = new Phaser.Game(config);
window.addEventListener('resize', () => game.scale.refresh());
window.addEventListener('orientationchange', () => game.scale.refresh());

// ---- DOM helpers ----
const $ = (id: string) => document.getElementById(id)!;
const show = (id: string, display = 'flex') => ($(id).style.display = display);
const hide = (id: string) => ($(id).style.display = 'none');

const RARITY_CSS: Record<string, string> = {
  common: '#9fb4c7', rare: '#38bdf8', epic: '#a855f7', legendary: '#fbbf24',
};

// ---- i18n DOM update ----
function applyLang(): void {
  // Loading
  $('loading-status').textContent = t('loading.status');
  // Menu
  $('menu-raids-label').textContent = t('menu.raids');
  $('menu-select-label').textContent = t('menu.selectLevel');
  // How to play
  const how = $('how-title');
  if (how) how.textContent = t('menu.howToPlay');
  setHowToPlay();
  // HUD
  $('hud-level-label').textContent = t('hud.level');
  // Dock buttons
  $('btn-chest-label').textContent = t('btn.openChest');
  $('btn-shop-label').textContent = t('btn.openShop');
  // Chest
  $('chest-title').textContent = t('chest.title');
  $('chest-island-label').textContent = t('chest.islandPane');
  $('chest-ship-label').textContent = t('chest.shipPane');
  $('chest-hint').textContent = t('chest.hint');
  $('btn-discard-label').textContent = t('chest.discard');
  // Shop
  $('shop-title').textContent = t('shop.title');
  $('shop-gold-label').textContent = t('shop.yourGold');
  $('shop-repair-label').textContent = t('shop.repair');
  $('shop-hp-label').textContent = t('shop.hp');
  $('shop-sell-label').textContent = t('shop.sellPlunder');
  $('btn-sell-all').textContent = t('shop.sellAll');
  $('shop-empty').textContent = t('shop.empty');
  $('shop-support-label').textContent = t('shop.buyGear');
  // Pause
  $('pause-title').textContent = t('pause.title');
  $('pause-resume-label').textContent = t('pause.resume');
  $('pause-restart-label').textContent = t('pause.restart');
  $('pause-quit-label').textContent = t('pause.quit');
  // Result
  $('result-next-label').textContent = t('result.next');
  $('result-retry-label').textContent = t('result.retry');
  $('result-menu-label').textContent = t('result.menu');
  // Settings
  $('settings-title').textContent = t('settings.title');
  $('settings-lang-label').textContent = t('settings.lang');
  $('settings-music-label').textContent = t('settings.music');
  $('settings-sfx-label').textContent = t('settings.sfx');
  $('settings-reset-label').textContent = t('settings.reset');
  // Upgrade shop
  $('upgrade-title').textContent = t('upgrades.title');
  $('upgrade-desc').textContent = t('upgrades.desc');
  $('upg-speed-name').textContent = t('upgrades.speed');
  $('upg-fire-name').textContent = t('upgrades.fireRate');
  $('upg-hp-name').textContent = t('upgrades.hp');
  // Banner
  $('banner-voyage-label').textContent = t('banner.voyage');
  // Lang toggle visual
  const isVi = getLang() === 'vi';
  $('btn-lang-vi').className = $('btn-lang-vi').className.replace(/border-white\/20|border-seaCyan/g, isVi ? 'border-seaCyan' : 'border-white/20').replace(/text-slate-400|text-seaCyan/g, isVi ? 'text-seaCyan' : 'text-slate-400');
  $('btn-lang-en').className = $('btn-lang-en').className.replace(/border-white\/20|border-seaCyan/g, !isVi ? 'border-seaCyan' : 'border-white/20').replace(/text-slate-400|text-seaCyan/g, !isVi ? 'text-seaCyan' : 'text-slate-400');
}

function setHowToPlay(): void {
  [
    ['how-1', '🕹️', 'how.steer'],
    ['how-2', '💥', 'how.cannon'],
    ['how-3', '🧰', 'how.chest'],
    ['how-4', '🏪', 'how.shop'],
    ['how-5', '☠️', 'how.skull'],
    ['how-6', '🔮', 'how.sea'],
  ].forEach(([id, icon, key]) => {
    const el = $(id);
    if (!el) return;
    el.className = 'flex items-start gap-2.5';
    el.innerHTML = `<span class="flex-none text-base leading-[1.3]">${icon}</span><span>${t(key)}</span>`;
  });
}

// ---- Loading ----
EventBus.on('load_progress', (p: number) => {
  ($('loading-progress') as HTMLElement).style.width = Math.round(p * 100) + '%';
});
EventBus.on('load_complete', () => {
  applyLang();
  const el = $('loading-screen');
  gsap.to(el, { opacity: 0, duration: 0.5, onComplete: () => (el.style.display = 'none') });
});
EventBus.on('lang_changed', () => applyLang());

// ---- Menu ----
function renderMenu(): void {
  $('menu-gold').textContent = String(Storage.getSuns());
  $('menu-raids').textContent = String(Storage.getTotalRaids());
  const grid = $('level-grid');
  grid.innerHTML = '';
  LEVELS.forEach((lv) => {
    const unlocked = Storage.isLevelUnlocked(lv.id);
    const cleared = Storage.isLevelCleared(lv.id);
    const name = t(`level.${lv.id}.name`);
    const sub = t(`level.${lv.id}.sub`);
    const btn = document.createElement('button');
    btn.className =
      'neon-btn relative rounded-2xl p-3 border text-left backdrop-blur-md ' +
      (unlocked ? 'bg-[#06182acc] border-seaCyan/40' : 'bg-[#06182a66] border-white/10 opacity-50');
    btn.innerHTML = `
      <div class="flex items-center justify-between">
        <span class="font-display font-black text-lg ${unlocked ? 'text-seaCyan' : 'text-slate-500'}">${lv.id}</span>
        <span class="text-sm">${cleared ? '⭐' : unlocked ? '⚓' : '🔒'}</span>
      </div>
      <div class="font-pirate text-base ${unlocked ? 'text-white' : 'text-slate-500'} leading-tight mt-1">${name}</div>
      <div class="text-[9px] text-slate-400 uppercase tracking-wider">${sub}</div>`;
    if (unlocked) {
      btn.addEventListener('click', () => {
        AudioManager.uiTap();
        hide('menu-overlay');
        show('hud', 'block');
        EventBus.emit('start_level', lv.id);
      });
    }
    grid.appendChild(btn);
  });
}

EventBus.on('enter_menu', () => {
  hide('hud'); hide('chest-panel'); hide('shop-panel');
  hide('pause-panel'); hide('result-panel'); hide('btn-chest'); hide('btn-shop');
  hide('settings-panel'); hide('upgrade-shop-panel');
  renderMenu();
  show('menu-overlay');
  applyLang();
});

// ---- Play / HUD ----
EventBus.on('enter_play', (d: { level: number }) => {
  hide('menu-overlay');
  show('hud', 'block');
  const name = t(`level.${d.level}.name`);
  const sub  = t(`level.${d.level}.sub`);
  $('banner-name').textContent = name;
  $('banner-sub').textContent = sub;
  const banner = $('level-banner');
  banner.style.display = 'flex';
  gsap.fromTo(banner, { opacity: 0 }, { opacity: 1, duration: 0.4 });
  gsap.to(banner, { opacity: 0, duration: 0.6, delay: 1.8, onComplete: () => (banner.style.display = 'none') });
});

EventBus.on('hud', (d: any) => {
  $('hud-level').textContent = d.level;
  $('hud-gold').textContent = d.gold;
  $('hud-objective').textContent = d.objective;
  $('hp-text').textContent = String(d.hp);
  ($('hp-fill') as HTMLElement).style.width = Math.max(0, (d.hp / d.maxHp) * 100) + '%';
  $('cargo-text').textContent = `${d.cargo} / ${d.cargoMax}`;
});

// dock buttons
EventBus.on('near_loot', (d: { active: boolean }) => {
  if (d.active && !panelOpen()) show('btn-chest'); else hide('btn-chest');
});
EventBus.on('near_shop', (d: { active: boolean }) => {
  if (d.active && !panelOpen()) show('btn-shop'); else hide('btn-shop');
});
function panelOpen(): boolean {
  return ['chest-panel', 'shop-panel', 'pause-panel', 'result-panel'].some(
    (id) => $(id).style.display !== 'none',
  );
}

$('btn-pause').addEventListener('click', () => EventBus.emit('ui_pause'));
$('btn-chest').addEventListener('click', () => EventBus.emit('ui_open_chest'));
$('btn-shop').addEventListener('click', () => EventBus.emit('ui_open_shop'));

// ---- Chest two-pane ----
let selUid = -1;
let selFrom: 'chest' | 'ship' | null = null;

function makeSlot(item: SlotView | null, from: 'chest' | 'ship'): HTMLElement {
  const cell = document.createElement('div');
  if (item) {
    const col = RARITY_CSS[item.rarity];
    cell.className =
      'slot relative aspect-square rounded-xl flex items-center justify-center text-2xl bg-[#0a1f30] border-2' +
      (selUid === item.uid && selFrom === from ? ' selected' : '');
    cell.style.borderColor = col;
    cell.innerHTML = `<span>${item.glyph}</span>`;
    cell.addEventListener('click', () => {
      AudioManager.uiTap();
      if (selUid === item.uid && selFrom === from) { selUid = -1; selFrom = null; }
      else { selUid = item.uid; selFrom = from; }
      EventBus.emit('request_chest_refresh');
    });
  } else {
    cell.className = 'slot aspect-square rounded-xl bg-[#0a1f3066] border border-dashed border-white/10';
  }
  return cell;
}

let lastChest: any = null;
function renderChest(d: any): void {
  lastChest = d;
  const exists =
    (selFrom === 'chest' && d.chest.some((s: SlotView) => s.uid === selUid)) ||
    (selFrom === 'ship'  && d.cargo.some((s: SlotView) => s.uid === selUid));
  if (!exists) { selUid = -1; selFrom = null; }

  const chestEl = $('chest-slots');
  chestEl.innerHTML = '';
  for (let i = 0; i < d.chestMax; i++) chestEl.appendChild(makeSlot(d.chest[i] ?? null, 'chest'));

  const cargoEl = $('cargo-slots-chest');
  cargoEl.innerHTML = '';
  for (let i = 0; i < d.cargoMax; i++) cargoEl.appendChild(makeSlot(d.cargo[i] ?? null, 'ship'));

  $('chest-cargo-count').textContent = `${d.cargo.length} / ${d.cargoMax}`;
  $('chest-spawn').textContent =
    d.spawnIn < 0 ? t('chest.full') : d.spawnIn === 0 ? t('chest.soon') : t('chest.timer', d.spawnIn);

  const bar = $('chest-action-bar');
  if (selUid >= 0 && selFrom) {
    bar.style.visibility = 'visible';
    $('chest-hint').style.display = 'none';
    $('btn-move').textContent = selFrom === 'chest' ? t('chest.moveDown') : t('chest.moveUp');
  } else {
    bar.style.visibility = 'hidden';
    $('chest-hint').style.display = 'block';
  }
}

EventBus.on('chest_data', renderChest);
EventBus.on('request_chest_refresh', () => { if (lastChest) renderChest(lastChest); });
EventBus.on('show_chest', () => {
  hide('btn-chest'); hide('btn-shop');
  selUid = -1; selFrom = null;
  show('chest-panel');
});

$('btn-close-chest').addEventListener('click', () => EventBus.emit('ui_close_panel'));
$('btn-move').addEventListener('click', () => {
  if (selUid < 0 || !selFrom) return;
  EventBus.emit('chest_transfer', { uid: selUid, to: selFrom === 'chest' ? 'ship' : 'chest' });
  selUid = -1; selFrom = null;
});
$('btn-discard').addEventListener('click', () => {
  if (selUid < 0 || !selFrom) return;
  EventBus.emit('chest_discard', { uid: selUid, from: selFrom });
  selUid = -1; selFrom = null;
});

// ---- Shop ----
function renderShop(d: any): void {
  $('shop-gold').textContent = d.gold;
  $('shop-hp').textContent = `${d.hp} / ${d.maxHp}`;

  // Repair button: show partial cost + teal tint when only partial is possible
  const repairBtn = $('btn-repair');
  if (d.canPartialRepair) {
    $('shop-repair-cost').textContent = d.partialCost;
    repairBtn.className = repairBtn.className
      .replace('from-seaGreen to-[#1f7a3f]', 'from-seaTeal to-[#0e6a5f]');
    repairBtn.title = 'Partial repair (spend all gold)';
  } else {
    $('shop-repair-cost').textContent = d.repairCost;
    repairBtn.className = repairBtn.className
      .replace('from-seaTeal to-[#0e6a5f]', 'from-seaGreen to-[#1f7a3f]');
    repairBtn.title = '';
  }
  const list = $('shop-cargo');
  list.innerHTML = '';
  if (d.cargo.length === 0) {
    show('shop-empty', 'block');
  } else {
    hide('shop-empty');
    d.cargo.forEach((it: SlotView) => {
      const row = document.createElement('div');
      row.className = 'flex items-center gap-2 bg-[#0a1f30] rounded-xl px-2.5 py-2 border border-white/5';
      row.innerHTML = `
        <span class="text-xl">${it.glyph}</span>
        <div class="flex-1 min-w-0">
          <div class="text-xs text-white truncate font-body">${it.name}</div>
          <div class="text-[9px] uppercase font-display" style="color:${RARITY_CSS[it.rarity]}">${it.rarity}</div>
        </div>
        <button class="neon-btn bg-gradient-to-b from-seaGold to-[#a87410] text-seaDeep font-display font-bold text-xs px-3 py-1.5 rounded-lg border border-white/20">🪙 ${it.value}</button>`;
      row.querySelector('button')!.addEventListener('click', () => EventBus.emit('shop_sell', { uid: it.uid }));
      list.appendChild(row);
    });
  }

  // Render ship stats
  const statsEl = $('shop-stats');
  if (statsEl && d.stats) {
    const s = d.stats;
    const lang = getLang();
    const firePerSec = (1000 / s.fireMs).toFixed(1);
    const armorPct   = Math.round((1 - s.armor) * 100);
    const statRows = [
      { icon: '❤️', label: lang === 'en' ? 'Max HP' : 'Máu tối đa',      val: `${d.hp} / ${s.maxHp}`, upg: s.upgHp },
      { icon: '⚡', label: lang === 'en' ? 'Speed'    : 'Tốc độ',         val: `${s.speed} px/s`,      upg: s.upgSpeed },
      { icon: '🎯', label: lang === 'en' ? 'Fire rate' : 'Tốc bắn',       val: `${firePerSec}/s`,       upg: s.upgFire },
      { icon: '💥', label: lang === 'en' ? 'Damage'   : 'Sát thương',     val: `${s.damage}`,           upg: -1 },
      { icon: '🛡️', label: lang === 'en' ? 'Armor'    : 'Giảm sát thương',val: armorPct > 0 ? `-${armorPct}%` : '—', upg: -1 },
      { icon: '📦', label: lang === 'en' ? 'Cargo'    : 'Khoang hàng',    val: `${s.cargo} ô`,          upg: -1 },
    ];
    statsEl.innerHTML = '';
    statRows.forEach(({ icon, label, val, upg }) => {
      const cell = document.createElement('div');
      cell.className = 'bg-[#060f1a] rounded-lg px-2 py-1.5 border border-white/5';
      const upgDots = upg >= 0
        ? `<div class="flex gap-0.5 mt-0.5">${[0,1,2,3,4].map(i => `<div class="w-1.5 h-1.5 rounded-full ${i < upg ? 'bg-seaCyan' : 'bg-white/15'}"></div>`).join('')}</div>`
        : '';
      cell.innerHTML = `
        <div class="flex items-center gap-1 mb-0.5">
          <span class="text-xs">${icon}</span>
          <span class="text-[9px] text-slate-400 font-display uppercase tracking-wider truncate">${label}</span>
        </div>
        <div class="text-xs text-white font-display font-bold">${val}</div>
        ${upgDots}`;
      statsEl.appendChild(cell);
    });
  }

  // Render support items
  const supportList = $('shop-support-list');
  supportList.innerHTML = '';
  SUPPORT_ITEMS.forEach((def) => {
    const isActive = d.activeBuff === def.id;
    const name = supportItemName(def.id, getLang());
    const row = document.createElement('div');
    row.className = 'flex items-center gap-2 bg-[#0a1f30] rounded-xl px-2.5 py-2 border border-white/5';
    row.innerHTML = `
      <span class="text-lg">${def.glyph}</span>
      <div class="flex-1 min-w-0">
        <div class="text-xs text-white font-body">${name}</div>
        ${isActive ? `<div class="text-[9px] text-seaGreen font-display">${t('shop.active')}</div>` : ''}
      </div>
      <button class="neon-btn bg-gradient-to-b from-seaCyan to-[#0c7c94] text-seaDeep font-display font-bold text-xs px-2.5 py-1.5 rounded-lg border border-white/20 ${isActive ? 'opacity-50' : ''}">🪙 ${def.cost}</button>`;
    if (!isActive) {
      row.querySelector('button')!.addEventListener('click', () =>
        EventBus.emit('shop_buy_support', { effectId: def.id }),
      );
    }
    supportList.appendChild(row);
  });
}

EventBus.on('shop_data', renderShop);
EventBus.on('show_shop', () => { hide('btn-chest'); hide('btn-shop'); show('shop-panel'); });
$('btn-close-shop').addEventListener('click', () => EventBus.emit('ui_close_panel'));
$('btn-repair').addEventListener('click', () => EventBus.emit('shop_repair'));
$('btn-sell-all').addEventListener('click', () => EventBus.emit('shop_sell_all'));

// ---- Pause ----
EventBus.on('show_pause', () => show('pause-panel'));
$('btn-resume').addEventListener('click', () => EventBus.emit('ui_resume'));
$('btn-restart').addEventListener('click', () => { hide('pause-panel'); EventBus.emit('ui_restart'); });
$('btn-quit').addEventListener('click', () => { hide('pause-panel'); EventBus.emit('ui_quit'); });

EventBus.on('hide_panels', () => {
  hide('chest-panel'); hide('shop-panel'); hide('pause-panel');
});

// ---- Results ----
EventBus.on('level_won', (d: { sunBonus: number; suns: number; hasNext: boolean }) => {
  hide('btn-chest'); hide('btn-shop');
  $('result-emoji').textContent = '🏆';
  $('result-title').textContent = t('result.won');
  ($('result-title') as HTMLElement).className = 'font-pirate text-4xl mb-2 text-seaGold text-glow-gold';
  $('result-desc').textContent = d.hasNext
    ? t('result.descWon', d.sunBonus, d.suns)
    : t('result.descWonLast', d.sunBonus);
  $('btn-result-next').style.display = d.hasNext ? 'flex' : 'none';
  show('result-panel');
});
// Update menu sun display whenever a sun is collected mid-game
EventBus.on('sun_collected', (d: { suns: number }) => {
  $('menu-gold').textContent = String(d.suns);
});
EventBus.on('level_lost', () => {
  hide('btn-chest'); hide('btn-shop');
  $('result-emoji').textContent = '💀';
  $('result-title').textContent = t('result.lost');
  ($('result-title') as HTMLElement).className = 'font-pirate text-4xl mb-2 text-seaCrimson text-glow-crimson';
  $('result-desc').textContent = t('result.descLost');
  $('btn-result-next').style.display = 'none';
  show('result-panel');
});
$('btn-result-next').addEventListener('click', () => { hide('result-panel'); EventBus.emit('ui_next_level'); });
$('btn-result-retry').addEventListener('click', () => { hide('result-panel'); EventBus.emit('ui_restart'); });
$('btn-result-menu').addEventListener('click', () => { hide('result-panel'); EventBus.emit('ui_quit'); });

// ---- Toasts ----
EventBus.on('toast', (d: { text: string; color: number }) => {
  const css = '#' + (d.color ?? 0x22d3ee).toString(16).padStart(6, '0');
  const t_el = document.createElement('div');
  t_el.className = 'bg-[#06182af0] border rounded-xl px-4 py-2 text-sm font-display font-bold backdrop-blur-md shadow-lg';
  t_el.style.borderColor = css;
  t_el.style.color = css;
  t_el.textContent = d.text;
  $('toast-container').appendChild(t_el);
  gsap.fromTo(t_el, { opacity: 0, y: -16, scale: 0.9 }, { opacity: 1, y: 0, scale: 1, duration: 0.3 });
  gsap.to(t_el, { opacity: 0, y: -12, duration: 0.4, delay: 1.9, onComplete: () => t_el.remove() });
});

// ---- Settings ----
$('btn-open-settings').addEventListener('click', () => {
  AudioManager.uiTap();
  // Sync sliders with current values
  const musicPct = Math.round(Storage.getMusicVol() * 100);
  const sfxPct   = Math.round(Storage.getSfxVol() * 100);
  const musicSlider = $('music-vol') as HTMLInputElement;
  const sfxSlider   = $('sfx-vol')   as HTMLInputElement;
  musicSlider.value = String(musicPct);
  sfxSlider.value   = String(sfxPct);
  musicSlider.style.setProperty('--pct', `${musicPct}%`);
  sfxSlider.style.setProperty('--pct',   `${sfxPct}%`);
  $('music-vol-val').textContent = `${musicPct}%`;
  $('sfx-vol-val').textContent   = `${sfxPct}%`;
  show('settings-panel');
});
$('btn-close-settings').addEventListener('click', () => hide('settings-panel'));

// Language toggles
$('btn-lang-vi').addEventListener('click', () => changeLang('vi'));
$('btn-lang-en').addEventListener('click', () => changeLang('en'));

function changeLang(lang: Lang): void {
  setLang(lang);
  Storage.setLang(lang);
  AudioManager.uiTap();
  applyLang();
  renderMenu();
}

// Volume sliders
function wireSlider(id: string, valId: string, onChange: (v: number) => void): void {
  const slider = $(id) as HTMLInputElement;
  slider.addEventListener('input', () => {
    const v = parseInt(slider.value) / 100;
    slider.style.setProperty('--pct', `${slider.value}%`);
    $(valId).textContent = `${slider.value}%`;
    onChange(v);
  });
}
wireSlider('music-vol', 'music-vol-val', (v) => {
  AudioManager.setMusicVolume(v);
  Storage.setMusicVol(v);
});
wireSlider('sfx-vol', 'sfx-vol-val', (v) => {
  AudioManager.setSfxVolume(v);
  Storage.setSfxVol(v);
});

// Reset data
let resetPending = false;
$('btn-reset-data').addEventListener('click', () => {
  AudioManager.uiTap();
  if (!resetPending) {
    resetPending = true;
    $('settings-reset-label').textContent = t('settings.resetConfirm');
    setTimeout(() => {
      resetPending = false;
      $('settings-reset-label').textContent = t('settings.reset');
    }, 3000);
  } else {
    Storage.reset();
    resetPending = false;
    hide('settings-panel');
    renderMenu();
  }
});

// ---- Upgrade shop ----
$('btn-open-upgrade-shop').addEventListener('click', () => {
  AudioManager.uiTap();
  renderUpgradeShop();
  show('upgrade-shop-panel');
});
$('btn-close-upgrade-shop').addEventListener('click', () => hide('upgrade-shop-panel'));

function renderUpgradeDots(containerId: string, level: number, maxLevel: number, dotClass: string): void {
  const el = $(containerId);
  el.innerHTML = '';
  for (let i = 0; i < maxLevel; i++) {
    const d = document.createElement('div');
    d.className = `lvl-dot ${i < level ? dotClass : ''}`;
    el.appendChild(d);
  }
}

function renderUpgradeShop(): void {
  $('upgrade-gold').textContent = String(Storage.getSuns());

  const speedLvl  = Storage.getUpgradeLevel('speed');
  const fireLvl   = Storage.getUpgradeLevel('fireRate');
  const hpLvl     = Storage.getUpgradeLevel('hp');
  const maxLvl    = UPGRADE_SHOP.speed.maxLevel; // all same

  renderUpgradeDots('upg-speed-dots', speedLvl, maxLvl, 'filled');
  renderUpgradeDots('upg-fire-dots',  fireLvl,  maxLvl, 'gold');
  renderUpgradeDots('upg-hp-dots',    hpLvl,    maxLvl, 'green');

  $('upg-speed-bonus').textContent = t('upgrades.bonusSpeed', speedLvl);
  $('upg-fire-bonus').textContent  = t('upgrades.bonusFire',  fireLvl);
  $('upg-hp-bonus').textContent    = t('upgrades.bonusHp',    hpLvl);

  function setUpgBtn(btnId: string, key: 'speed' | 'fireRate' | 'hp'): void {
    const lvl = Storage.getUpgradeLevel(key);
    const btn = $(btnId) as HTMLButtonElement;
    if (lvl >= UPGRADE_SHOP[key].maxLevel) {
      btn.textContent = t('upgrades.max');
      btn.disabled = true;
      btn.className = btn.className.replace('opacity-50', '') + ' opacity-50';
    } else {
      const cost = Storage.upgradeCost(key);
      btn.textContent = t('upgrades.buyLvl', cost);
      btn.disabled = false;
      btn.className = btn.className.replace(' opacity-50', '');
    }
  }
  setUpgBtn('btn-upg-speed', 'speed');
  setUpgBtn('btn-upg-fire',  'fireRate');
  setUpgBtn('btn-upg-hp',    'hp');
}

function wireUpgradeBtn(btnId: string, key: 'speed' | 'fireRate' | 'hp'): void {
  $(btnId).addEventListener('click', () => {
    AudioManager.uiTap();
    if (Storage.buyUpgrade(key)) {
      renderUpgradeShop();
      // Sync sun count on menu header too
      $('menu-gold').textContent = String(Storage.getSuns());
    } else {
      // not enough suns
      const el = $(btnId);
      gsap.fromTo(el, { x: -5 }, { x: 5, duration: 0.06, yoyo: true, repeat: 3 });
    }
  });
}
wireUpgradeBtn('btn-upg-speed', 'speed');
wireUpgradeBtn('btn-upg-fire',  'fireRate');
wireUpgradeBtn('btn-upg-hp',    'hp');
