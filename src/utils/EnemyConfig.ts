// =========================================================
// CẤU HÌNH QUÁI VẬT THƯỜNG VÀ KỸ NĂNG (ENEMY CONFIGURATION)
// =========================================================

export interface EnemyConfig {
    id: string;
    name: string;
    shape: 'circle' | 'square' | 'triangle' | 'polygon';
    color: number;       // Hex color for Phaser (e.g. 0xff3b30)
    colorStr: string;    // CSS color for HTML5 Canvas (e.g. '#ff3b30')
    baseHp: number;
    baseSpeed: number;
    baseGoldChance: number;
    radius: number;
    skill: 'leap' | 'chase' | 'wander' | 'charge' | 'shoot';
}

export const NORMAL_ENEMIES: Record<string, EnemyConfig> = {
    slime: {
        id: 'slime',
        name: 'Slime',
        shape: 'circle',
        color: 0xff3b30,
        colorStr: '#ff3b30',
        baseHp: 15,
        baseSpeed: 115,
        baseGoldChance: 0.3,
        radius: 22,
        skill: 'leap'
    },
    bat: {
        id: 'bat',
        name: 'Night Bat',
        shape: 'triangle',
        color: 0x8e44ad,
        colorStr: '#8e44ad',
        baseHp: 25,
        baseSpeed: 150,
        baseGoldChance: 0.3,
        radius: 16,
        skill: 'chase'
    },
    golem: {
        id: 'golem',
        name: 'Giant Golem',
        shape: 'square',
        color: 0x555555,
        colorStr: '#555555',
        baseHp: 55,
        baseSpeed: 65,
        baseGoldChance: 0.5,
        radius: 30,
        skill: 'wander'
    },
    ghost: {
        id: 'ghost',
        name: 'Ghost',
        shape: 'polygon',
        color: 0x00ffff,
        colorStr: '#00ffff',
        baseHp: 20,
        baseSpeed: 80,
        baseGoldChance: 0.3,
        radius: 20,
        skill: 'chase'
    },
    thief_goblin: {
        id: 'thief_goblin',
        name: 'Thief Goblin',
        shape: 'circle',
        color: 0x2ebd3e,
        colorStr: '#2ebd3e',
        baseHp: 30,
        baseSpeed: 190,
        baseGoldChance: 0.8,
        radius: 18,
        skill: 'wander'
    },
    wild_boar: {
        id: 'wild_boar',
        name: 'Wild Boar',
        shape: 'square',
        color: 0x5c4033,
        colorStr: '#5c4033',
        baseHp: 70,
        baseSpeed: 95,
        baseGoldChance: 0.3,
        radius: 26,
        skill: 'charge'
    },
    lich_orb: {
        id: 'lich_orb',
        name: 'Lich Orb',
        shape: 'circle',
        color: 0xff00ff,
        colorStr: '#ff00ff',
        baseHp: 80,
        baseSpeed: 0,
        baseGoldChance: 0.0,
        radius: 14,
        skill: 'wander'
    },
    crystal_spike: {
        id: 'crystal_spike',
        name: 'Crystal Spike',
        shape: 'triangle',
        color: 0x00aaff,
        colorStr: '#00aaff',
        baseHp: 99999,
        baseSpeed: 0,
        baseGoldChance: 0.0,
        radius: 24,
        skill: 'wander'
    }
};

export function getEnemyConfig(type: string): EnemyConfig | undefined {
    return NORMAL_ENEMIES[type];
}
