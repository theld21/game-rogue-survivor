// =========================================================
// TIỆN ÍCH QUẢN LÝ NÂNG CẤP KỸ NĂNG TRONG GAME (SKILL MANAGER)
// =========================================================
import { CHARACTER_CONFIG, CharacterType } from './CharacterConfig';

export interface SkillItem {
    id: string;
    name: string;
    desc: string;
    currentLvl: number;
}

export class SkillManager {
    public static getAvailableSkills(levels: {
        attackSpeed: number;
        moveSpeed: number;
        thorns: number;
        multiShot: number;
        shield: number;
        lightning: number;
        attackRange: number;
    }): SkillItem[] {
        return [
            {
                id: 'attackSpeed',
                name: '⚡ ATTACK SPEED',
                desc: 'Reduces attack cooldown by 15%.',
                currentLvl: levels.attackSpeed
            },
            {
                id: 'moveSpeed',
                name: '👟 SUPER BOOTS',
                desc: 'Increases movement speed by +20% & expands pickup range.',
                currentLvl: levels.moveSpeed
            },
            {
                id: 'thorns',
                name: '🛡️ THORMAIL',
                desc: 'Reflects 22% of received damage back to attackers.',
                currentLvl: levels.thorns
            },
            {
                id: 'multiShot',
                name: '🌀 CLUSTER SHOT (EVOLUTION)',
                desc: 'Fires additional spread projectiles backwards.',
                currentLvl: levels.multiShot
            },
            {
                id: 'shield',
                name: '💎 ORBITING SHIELD',
                desc: 'Summons magic orbs revolving to damage enemies.',
                currentLvl: levels.shield
            },
            {
                id: 'lightning',
                name: '🌩️ LIGHTNING STRIKE',
                desc: 'Every 3s calls down lightning damaging & slowing enemies.',
                currentLvl: levels.lightning
            },
            {
                id: 'attackRange',
                name: '🎯 MAX RANGE',
                desc: 'Increases range/flight time of main weapon by 30%.',
                currentLvl: levels.attackRange
            }
        ];
    }

    public static applySkill(scene: any, id: string): void {
        switch (id) {
            case 'attackSpeed': {
                scene.upgradeLevels.attackSpeed++;
                const charConfig = CHARACTER_CONFIG[scene.charType as CharacterType];
                const baseCd = charConfig.attackCooldown;
                scene.attackCooldown = baseCd * Math.pow(0.85, scene.upgradeLevels.attackSpeed);
                break;
            }
            case 'moveSpeed': {
                scene.upgradeLevels.moveSpeed++;
                const charConfig = CHARACTER_CONFIG[scene.charType as CharacterType];
                const baseS = charConfig.baseSpeed;
                scene.player.moveSpeed = (baseS * (1 + 0.03 * scene.speedLvl)) * (1 + 0.20 * scene.upgradeLevels.moveSpeed);
                scene.speed = scene.player.moveSpeed;
                break;
            }
            case 'thorns':
                scene.upgradeLevels.thorns++;
                break;
            case 'multiShot':
                scene.upgradeLevels.multiShot++;
                break;
            case 'shield':
                scene.upgradeLevels.shield++;
                break;
            case 'lightning':
                scene.upgradeLevels.lightning++;
                break;
            case 'attackRange':
                scene.upgradeLevels.attackRange++;
                break;
        }
    }
}
