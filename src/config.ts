// ==========================================
// CẤU HÌNH DỮ LIỆU LƯU TRỮ VÀ BIẾN TOÀN CỤC
// ==========================================

// Memory fallback storage for cases where localStorage is disabled or restricted
const memoryStorage: Record<string, string> = {};

function safeGetItem(key: string): string | null {
    try {
        return localStorage.getItem(key);
    } catch (e) {
        console.warn(`localStorage read failed for key "${key}", using memory fallback:`, e);
        return memoryStorage[key] || null;
    }
}

function safeSetItem(key: string, value: string): void {
    try {
        localStorage.setItem(key, value);
    } catch (e) {
        console.warn(`localStorage write failed for key "${key}", using memory fallback:`, e);
        memoryStorage[key] = value;
    }
}

export const SAVE_KEYS = {
    GOLD: 'survivor_total_gold',
    UPGRADE_HP: 'survivor_upgrade_hp',
    UPGRADE_SPEED: 'survivor_upgrade_speed',
    UPGRADE_DAMAGE: 'survivor_upgrade_damage',
    CLASS_CHANGE_COUNT: 'survivor_class_change_count',
    SELECTED_SKIN: 'survivor_selected_skin',
    FIRST_TIME_CHOSEN: 'survivor_has_chosen_class',
    UNLOCKED_MAGE: 'survivor_unlocked_mage',
    UNLOCKED_RANGER: 'survivor_unlocked_ranger'
};

export function getSaveData(key: string, defaultValue: number = 0): number {
    const val = safeGetItem(key);
    return val !== null ? parseInt(val, 10) : defaultValue;
}

export function saveKeyData(key: string, value: number): void {
    safeSetItem(key, value.toString());
}

export function getSaveString(key: string, defaultValue: string = ''): string {
    const val = safeGetItem(key);
    return val !== null ? val : defaultValue;
}

export function saveString(key: string, value: string): void {
    safeSetItem(key, value);
}

export const GameState = {
    selectedCharacter: 'knight' as 'knight' | 'mage' | 'ranger',
    selectedSkin: 'default' as string
};
