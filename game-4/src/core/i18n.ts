// =====================================================================
// i18n.ts — Bilingual (Vietnamese / English) string dictionary.
// Call t(key) anywhere. setLang() persists via Storage.
// =====================================================================

export type Lang = 'vi' | 'en';

type StrOrFn = string | ((...a: any[]) => string);
type Dict = Record<string, StrOrFn>;

const VI: Dict = {
  'loading.status': 'Đang căng buồm...',

  'menu.title': 'Sea of Neon',
  'menu.subtitle': 'Pirate Raid',
  'menu.raids': 'Trận',
  'menu.selectLevel': 'Chọn Hải Trình',
  'menu.howToPlay': 'Cách Chơi',
  'menu.upgradeShop': 'Xưởng Nâng Cấp',
  'menu.settings': 'Cài Đặt',
  'menu.gold': 'Vàng',

  'how.steer': '<b class="text-seaGold">KÉO</b> ngón tay để lái thuyền (camera ghim giữa).',
  'how.cannon': 'Đại bác <b class="text-seaGold">tự bắn</b> kẻ địch trong tầm.',
  'how.chest': 'Cập <b class="text-seaCyan">Đảo Hoang</b> để mở rương gom báu vật.',
  'how.shop': 'Về <b class="text-seaGold">Đảo Shop</b> bán đồ, sửa thuyền & mua trang bị.',
  'how.skull': 'Hạ <b class="text-seaCrimson">Phòng Vệ</b> rồi phá Đảo Đầu Lâu để thắng.',
  'how.sea': 'Trên biển thỉnh thoảng xuất hiện báu vật — <b class="text-seaGold">đậu gần</b> để thu nhặt.',

  'hud.level': 'Màn',

  'obj.approach': 'Tiến đến Đảo Đầu Lâu ☠',
  'obj.guardian': (n: number) => `Hạ thuyền phòng vệ: còn ${n}`,
  'obj.shielded': 'Đang phá khiên...',
  'obj.attack': 'Phá hủy Đảo Đầu Lâu! 🔥',
  'obj.won': 'Chiến Thắng!',

  'btn.openChest': 'Mở Rương',
  'btn.openShop': 'Vào Bến Cảng',

  'chest.title': 'Rương Báu',
  'chest.islandPane': 'Rương Đảo',
  'chest.shipPane': 'Khoang Thuyền',
  'chest.full': '🔒 Rương đầy',
  'chest.soon': '✨ Sắp có đồ...',
  'chest.timer': (s: number) => `⏱ ${s}s`,
  'chest.hint': 'Chạm vào vật phẩm để chọn',
  'chest.moveDown': 'Xuống Thuyền',
  'chest.moveUp': 'Lên Rương',
  'chest.discard': 'Vứt',

  'shop.title': 'Bến Cảng',
  'shop.yourGold': 'Vàng của bạn',
  'shop.repair': 'Sửa Thuyền',
  'shop.hp': 'Máu',
  'shop.sellPlunder': 'Bán Chiến Lợi Phẩm',
  'shop.sellAll': 'Bán Hết',
  'shop.empty': 'Khoang thuyền trống.',
  'shop.buyGear': 'Mua Trang Bị (theo màn)',
  'shop.active': '✅ Đang kích hoạt',

  'pause.title': 'Tạm Dừng',
  'pause.resume': 'Tiếp Tục',
  'pause.restart': 'Chơi Lại Màn',
  'pause.quit': 'Về Menu',

  'result.won': 'Chiến Thắng!',
  'result.lost': 'Thuyền Chìm!',
  'result.next': 'Màn Tiếp Theo',
  'result.retry': 'Chơi Lại',
  'result.menu': 'Về Menu',
  'result.descWon': (r: number, g: number) => `Đảo đã bị chiếm! +${r} ☀️ (Tổng: ${g} ☀️). Hải trình mới đang chờ!`,
  'result.descWonLast': (r: number) => `Bạn đã chinh phục toàn bộ Sea of Neon! +${r} ☀️. Huyền thoại hải tặc!`,
  'result.descLost': 'Thuyền của bạn đã bị đánh chìm. Thử lại nhé thuyền trưởng!',

  'toast.guardians': '☠ Quân Phòng Vệ Xuất Hiện!',
  'toast.shieldBroke': '🔥 Khiên Vỡ! Khai Hỏa Vào Đảo!',
  'toast.shieldBlock': '🛡 Đảo Còn Khiên — Diệt Hết Phòng Vệ!',
  'toast.chestFull': 'Ngăn kia đã đầy!',
  'toast.repairDone': 'Đã sửa thuyền!',
  'toast.repairPartial': (hp: number) => `Sửa một phần: +${hp} HP`,
  'toast.repairFull': 'Thuyền đã đầy máu!',
  'toast.noGold': 'Không đủ Vàng!',
  'toast.soldAll': (g: number) => `Bán tất cả: +${g} 🪙`,
  'toast.respawn': '⚓ Tàu địch tăng viện!',
  'toast.seaItemSpawn': '✨ Báu Vật Biển Xuất Hiện!',
  'toast.seaCollected': (name: string) => `✨ Thu thập: ${name}!`,
  'toast.buffActive': (name: string) => `⚡ ${name} đã kích hoạt!`,

  'settings.title': 'Cài Đặt',
  'settings.lang': 'Ngôn Ngữ',
  'settings.music': 'Âm Nhạc',
  'settings.sfx': 'Hiệu Ứng',
  'settings.reset': 'Xóa Toàn Bộ Dữ Liệu',
  'settings.resetConfirm': 'Xác nhận xóa?',

  'upgrades.title': 'Xưởng Nâng Cấp',
  'upgrades.desc': 'Nâng cấp vĩnh viễn trước khi xuất chinh.',
  'upgrades.speed': 'Tốc Độ Thuyền',
  'upgrades.fireRate': 'Tốc Độ Bắn',
  'upgrades.hp': 'Thanh Máu',
  'upgrades.max': 'TỐI ĐA',
  'upgrades.buyLvl': (cost: number) => `Nâng ${cost}🪙`,
  'upgrades.bonusSpeed': (n: number) => `+${n * 12}% tốc độ`,
  'upgrades.bonusFire': (n: number) => `+${n * 12}% tốc bắn`,
  'upgrades.bonusHp': (n: number) => `+${n * 25} HP tối đa`,

  'banner.voyage': 'Hải Trình',

  'level.1.name': 'Vịnh Sương Mù',
  'level.1.sub': 'Misty Shallows',
  'level.2.name': 'Eo Biển Hổ Phách',
  'level.2.sub': 'Amber Strait',
  'level.3.name': 'Rạn San Hô Lân Tinh',
  'level.3.sub': 'Phosphor Reef',
  'level.4.name': 'Vực Xoáy Tử Thần',
  'level.4.sub': 'Maelstrom Deep',
  'level.5.name': 'Nghĩa Địa Tàu Đắm',
  'level.5.sub': 'Wreck Graveyard',
  'level.6.name': 'Pháo Đài Đầu Lâu',
  'level.6.sub': "Skull King's Citadel",
};

const EN: Dict = {
  'loading.status': 'Setting sails...',

  'menu.title': 'Sea of Neon',
  'menu.subtitle': 'Pirate Raid',
  'menu.raids': 'Raids',
  'menu.selectLevel': 'Choose a Voyage',
  'menu.howToPlay': 'How to Play',
  'menu.upgradeShop': 'Upgrade Yard',
  'menu.settings': 'Settings',
  'menu.gold': 'Gold',

  'how.steer': '<b class="text-seaGold">DRAG</b> to steer your ship (camera locks to ship).',
  'how.cannon': 'Cannons <b class="text-seaGold">auto-fire</b> at the nearest enemy.',
  'how.chest': 'Dock at a <b class="text-seaCyan">Wild Isle</b> to open chests.',
  'how.shop': 'Return to <b class="text-seaGold">Harbour Isle</b> to sell, repair & buy gear.',
  'how.skull': 'Sink all <b class="text-seaCrimson">Guardians</b>, then destroy Skull Isle to win.',
  'how.sea': 'Rare sea treasures appear on the water — <b class="text-seaGold">hover near</b> to collect.',

  'hud.level': 'Level',

  'obj.approach': 'Head toward Skull Isle ☠',
  'obj.guardian': (n: number) => `Sink guardians: ${n} remaining`,
  'obj.shielded': 'Shield breaking...',
  'obj.attack': 'Destroy the Skull Isle! 🔥',
  'obj.won': 'Victory!',

  'btn.openChest': 'Open Chest',
  'btn.openShop': 'Enter Harbour',

  'chest.title': 'Treasure Chest',
  'chest.islandPane': 'Island Chest',
  'chest.shipPane': 'Ship Cargo',
  'chest.full': '🔒 Chest Full',
  'chest.soon': '✨ Respawning...',
  'chest.timer': (s: number) => `⏱ ${s}s`,
  'chest.hint': 'Tap an item to select it',
  'chest.moveDown': 'To Ship',
  'chest.moveUp': 'To Chest',
  'chest.discard': 'Drop',

  'shop.title': 'Harbour',
  'shop.yourGold': 'Your Gold',
  'shop.repair': 'Repair Ship',
  'shop.hp': 'HP',
  'shop.sellPlunder': 'Sell Plunder',
  'shop.sellAll': 'Sell All',
  'shop.empty': 'Ship hold is empty.',
  'shop.buyGear': 'Buy Gear (this voyage)',
  'shop.active': '✅ Active',

  'pause.title': 'Paused',
  'pause.resume': 'Resume',
  'pause.restart': 'Retry Level',
  'pause.quit': 'Main Menu',

  'result.won': 'Victory!',
  'result.lost': 'Ship Sunk!',
  'result.next': 'Next Voyage',
  'result.retry': 'Retry',
  'result.menu': 'Main Menu',
  'result.descWon': (r: number, g: number) => `Isle captured! +${r} ☀️ (Total: ${g} ☀️). Next voyage awaits!`,
  'result.descWonLast': (r: number) => `Sea of Neon conquered! +${r} ☀️. Legendary captain!`,
  'result.descLost': 'Your ship sank to the bottom of the Neon Sea. Try again, captain!',

  'toast.guardians': '☠ Guardians Awakened!',
  'toast.shieldBroke': '🔥 Shield Down! Open Fire on the Isle!',
  'toast.shieldBlock': '🛡 Isle is Shielded — Sink All Guardians!',
  'toast.chestFull': 'No room there!',
  'toast.repairDone': 'Ship repaired!',
  'toast.repairPartial': (hp: number) => `Partial repair: +${hp} HP`,
  'toast.repairFull': 'Ship is already at full HP!',
  'toast.noGold': 'Not enough gold!',
  'toast.soldAll': (g: number) => `Sold all: +${g} 🪙`,
  'toast.respawn': '⚓ Enemy reinforcements!',
  'toast.seaItemSpawn': '✨ Sea Treasure Spotted!',
  'toast.seaCollected': (name: string) => `✨ Collected: ${name}!`,
  'toast.buffActive': (name: string) => `⚡ ${name} activated!`,

  'settings.title': 'Settings',
  'settings.lang': 'Language',
  'settings.music': 'Music',
  'settings.sfx': 'Sound FX',
  'settings.reset': 'Reset All Data',
  'settings.resetConfirm': 'Confirm reset?',

  'upgrades.title': 'Upgrade Yard',
  'upgrades.desc': 'Permanently upgrade your ship before each raid.',
  'upgrades.speed': 'Ship Speed',
  'upgrades.fireRate': 'Fire Rate',
  'upgrades.hp': 'Hull HP',
  'upgrades.max': 'MAX',
  'upgrades.buyLvl': (cost: number) => `Upgrade ${cost}🪙`,
  'upgrades.bonusSpeed': (n: number) => `+${n * 12}% speed`,
  'upgrades.bonusFire': (n: number) => `+${n * 12}% fire rate`,
  'upgrades.bonusHp': (n: number) => `+${n * 25} max HP`,

  'banner.voyage': 'Voyage',

  'level.1.name': 'Misty Shallows',
  'level.1.sub': 'A calm but treacherous bay',
  'level.2.name': 'Amber Strait',
  'level.2.sub': 'Narrow waters, watchful patrols',
  'level.3.name': 'Phosphor Reef',
  'level.3.sub': 'Ancient coral glowing with danger',
  'level.4.name': 'Maelstrom Deep',
  'level.4.sub': 'The sea itself fights you',
  'level.5.name': 'Wreck Graveyard',
  'level.5.sub': 'Bones of a hundred ships',
  'level.6.name': "Skull King's Citadel",
  'level.6.sub': 'The final fortress',
};

const DICTS: Record<Lang, Dict> = { vi: VI, en: EN };

let _lang: Lang = 'en';

export function getLang(): Lang {
  return _lang;
}

export function setLang(lang: Lang): void {
  _lang = lang;
  document.body.classList.toggle('lang-vi', lang === 'vi');
}

/** Translate a key, with optional interpolation args. */
export function t(key: string, ...args: any[]): string {
  const entry = DICTS[_lang]?.[key] ?? DICTS['vi']?.[key] ?? key;
  if (typeof entry === 'function') return entry(...args);
  return entry as string;
}

export default { t, setLang, getLang };
