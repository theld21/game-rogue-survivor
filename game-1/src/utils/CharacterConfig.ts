export type CharacterType = 'knight' | 'mage' | 'ranger';

export interface CharacterStats {
    id: CharacterType;
    name: string;
    weaponName: string;
    description: string;
    baseHp: number;
    baseSpeed: number;
    baseDamage: number;
    attackCooldown: number;
    bulletTexture: string;
    bulletPierce: number;
    uiBgColor: string;
}

export const CHARACTER_CONFIG: Record<CharacterType, CharacterStats> = {
    knight: {
        id: 'knight',
        name: 'Class: Knight',
        weaponName: 'Weapon: Arc Sword Aura ⚔️',
        description: 'High HP, AoE melee. Fires sword aura to sweep nearby enemies.',
        baseHp: 170,
        baseSpeed: 190,
        baseDamage: 17,
        attackCooldown: 1000,
        bulletTexture: 'bullet_knight',
        bulletPierce: 1,
        uiBgColor: 'energy-badge energy-badge-cyan text-glow-cyan'
    },
    mage: {
        id: 'mage',
        name: 'Class: Mage',
        weaponName: 'Weapon: AoE Fireball 🔮',
        description: 'High Damage. Launches exploding fireballs for massive AoE burn damage.',
        baseHp: 80,
        baseSpeed: 205,
        baseDamage: 13,
        attackCooldown: 900,
        bulletTexture: 'bullet_mage',
        bulletPierce: 999,
        uiBgColor: 'energy-badge energy-badge-purple text-glow-purple'
    },
    ranger: {
        id: 'ranger',
        name: 'Class: Archer',
        weaponName: 'Weapon: Piercing Arrow 🏹',
        description: 'High mobility. Fires sharp arrows that pierce through all enemies in a line.',
        baseHp: 80,
        baseSpeed: 240,
        baseDamage: 7,
        attackCooldown: 800,
        bulletTexture: 'bullet_ranger',
        bulletPierce: 1,
        uiBgColor: 'energy-badge energy-badge-green text-glow-green'
    }
};
