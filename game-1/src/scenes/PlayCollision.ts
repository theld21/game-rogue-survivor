import Phaser from 'phaser';
import { PlayScene } from './PlayScene';
import { Bullet } from '../entities/Bullet';
import { Enemy } from '../entities/Enemy';
import { Collectible } from '../entities/Collectible';
import { Player } from '../entities/Player';
import { GameState } from '../config';
import { SoundEffects } from '../utils/SoundEffects';

export function handleBulletHitEnemy(scene: PlayScene, bullet: Bullet, enemy: Enemy): void {
    if (!bullet.active || !enemy.active) return;
    if (bullet.hitEnemies.includes(enemy)) return;

    bullet.hitEnemies.push(enemy);

    const isCrit = Math.random() < 0.15;
    let isWeakPoint = false;
    let finalDmg = isCrit ? bullet.damage * 1.8 : bullet.damage;

    // Tính toán sát thương điểm yếu nếu bắn trúng vòng hồng tâm của Boss
    if (enemy.isBoss && enemy.isWeakPointActive) {
        const wpWorldX = enemy.x + enemy.weakPointX * enemy.scaleX;
        const wpWorldY = enemy.y + enemy.weakPointY * enemy.scaleY;
        const dist = Phaser.Math.Distance.Between(bullet.x, bullet.y, wpWorldX, wpWorldY);

        if (dist <= enemy.weakPointRadius + 12) {
            isWeakPoint = true;
            finalDmg = bullet.damage * 3.0; // Điểm yếu nhân 3 sát thương
        }
    }

    enemy.takeDamage(finalDmg, isCrit, isWeakPoint);

    if (scene.charType === 'mage') {
        triggerFireballExplosion(scene, bullet.x, bullet.y);
    }

    bullet.pierceCount--;
    if (bullet.pierceCount <= 0) {
        bullet.deactivate();
    }
}

export function triggerFireballExplosion(scene: PlayScene, x: number, y: number): void {
    const aoeRadius = 80;
    scene.spawnExplosionParticles(x, y, 0xff5500, 12);
    SoundEffects.playExplosion();
    if (scene.cameras && scene.cameras.main) {
        scene.cameras.main.shake(100, 0.005);
    }

    scene.enemiesGroup.getChildren().forEach(item => {
        const enemy = item as Enemy;
        if (enemy.active) {
            const dist = Phaser.Math.Distance.Between(x, y, enemy.x, enemy.y);
            if (dist <= aoeRadius) {
                enemy.takeDamage(scene.bulletDamage * 0.6);
            }
        }
    });
}

export function handleEnemyHitPlayer(scene: PlayScene, _player: Player, enemy: Enemy): void {
    if (!enemy.active || scene.isGameOver || scene.isLevelUpOpen) return;

    // Nếu đang vô địch thì không bị mất máu
    if (scene.isInvulnerable) return;

    // Nếu chạm vào bẫy pha lê, làm chậm Player
    if (enemy.enemyType === 'crystal_spike') {
        scene.player.moveSpeed = scene.speed * 0.45;
        scene.time.delayedCall(1500, () => {
            if (scene.player.active) scene.player.moveSpeed = scene.speed;
        });
        enemy.die(); // Bẫy vỡ sau khi dẫm
        return;
    }

    if (scene.cameras && scene.cameras.main) {
        scene.cameras.main.shake(120, 0.008);
        scene.cameras.main.flash(80, 255, 0, 0);
    }
    SoundEffects.playHitPlayer();

    const dmgTaken = enemy.isBoss ? 25 : 10;
    scene.hp -= dmgTaken;

    const thornsLvl = scene.upgradeLevels.thorns;
    if (thornsLvl > 0) {
        const refDmg = dmgTaken * (0.22 * thornsLvl);
        enemy.takeDamage(refDmg);
    }

    if (!enemy.isBoss) {
        enemy.die();
    } else {
        const angle = Phaser.Math.Angle.Between(enemy.x, enemy.y, scene.player.x, scene.player.y);
        scene.player.x += Math.cos(angle) * 45;
        scene.player.y += Math.sin(angle) * 45;
    }

    scene.updatePlayerHpBridge();

    if (scene.hp <= 0) {
        scene.triggerGameOver(false);
    }
}

export function handleEnemyBulletHitPlayer(scene: PlayScene, _player: Player, bullet: Phaser.Physics.Arcade.Sprite): void {
    if (!bullet.active || scene.isGameOver || scene.isLevelUpOpen) return;

    // Nếu vô địch thì né mọi đạn quái
    if (scene.isInvulnerable) {
        if ((bullet as any).lifespanTimer) {
            (bullet as any).lifespanTimer.destroy();
            (bullet as any).lifespanTimer = undefined;
        }
        bullet.disableBody(true, true);
        return;
    }

    const dmg = (bullet as any).damage || 10;
    scene.hp -= dmg;

    if (scene.cameras && scene.cameras.main) {
        scene.cameras.main.shake(100, 0.007);
        scene.cameras.main.flash(50, 255, 0, 0);
    }
    SoundEffects.playHitPlayer();
    scene.updatePlayerHpBridge();

    if ((bullet as any).lifespanTimer) {
        (bullet as any).lifespanTimer.destroy();
        (bullet as any).lifespanTimer = undefined;
    }
    bullet.disableBody(true, true);

    if (scene.hp <= 0) {
        scene.triggerGameOver(false);
    }
}

export function handlePlayerCollectItem(scene: PlayScene, _player: Player, item: Collectible): void {
    if (!item.active || scene.isGameOver) return;

    SoundEffects.playCollectItem();

    if (item.type === 'xp') {
        const amount = scene.isDoubleXpActive ? 30 : 15;
        scene.xp += amount;
        scene.showFloatingText(item.x, item.y - 12, `+${amount} XP`, "#00ff88");

        if (scene.xp >= scene.xpToNextLevel) {
            scene.levelUp();
        }
    } else if (item.type === 'gold') {
        const goldVal = Math.floor((scene.stage - 1) / 2) + 1;
        scene.goldCollected += goldVal;
        scene.showFloatingText(item.x, item.y - 12, `+${goldVal} Gold`, "#ffd700");
    } else if (item.type === 'heart') {
        const heal = Math.round(scene.maxHp * 0.20); // Hồi 20% HP
        scene.hp = Math.min(scene.maxHp, scene.hp + heal);
        scene.showFloatingText(item.x, item.y - 12, `+${heal} HP`, "#ff007f");
        scene.updatePlayerHpBridge();
    } else if (item.type === 'magnet') {
        scene.showFloatingText(item.x, item.y - 12, "SUPER MAGNET!", "#00ffff");
        scene.activateSuperMagnet();
    } else if (item.type === 'shield_item') {
        scene.showFloatingText(item.x, item.y - 12, "INVINCIBLE SHIELD (5s)!", "#00ffff");
        scene.isInvulnerable = true;

        const skin = GameState.selectedSkin;
        scene.player.setTint(0x00ffff);

        if (scene.shieldTimer) scene.shieldTimer.destroy();
        scene.shieldTimer = scene.time.delayedCall(5000, () => {
            scene.isInvulnerable = false;
            if (scene.player.active) {
                scene.player.clearTint();
                if (skin === 'knight_mecha') scene.player.setTint(0xffd700);
                else if (skin === 'mage_fire') scene.player.setTint(0xff3300);
                else if (skin === 'ranger_night') scene.player.setTint(0xbb33ff);
            }
            scene.shieldTimer = undefined;
        });
    } else if (item.type === 'freeze_item') {
        scene.showFloatingText(item.x, item.y - 12, "FREEZE MONSTERS (4s)!", "#88e5ff");
        scene.enemiesGroup.getChildren().forEach(e => {
            const enemy = e as Enemy;
            if (enemy.active && !enemy.isBoss) {
                enemy.isFrozen = true;
                enemy.setTint(0x00aaff);
                if (enemy.freezeTimer) {
                    enemy.freezeTimer.destroy();
                }
                enemy.freezeTimer = scene.time.delayedCall(4000, () => {
                    if (enemy.active) {
                        enemy.isFrozen = false;
                        enemy.clearTint();
                    }
                    enemy.freezeTimer = undefined;
                });
            }
        });
    } else if (item.type === 'bomb_item') {
        scene.showFloatingText(item.x, item.y - 12, "KILL ALL MONSTERS!", "#ff3b30");
        if (scene.cameras && scene.cameras.main) {
            scene.cameras.main.shake(250, 0.01);
            scene.cameras.main.flash(100, 255, 100, 0);
        }
        scene.enemiesGroup.getChildren().forEach(e => {
            const enemy = e as Enemy;
            if (enemy.active) {
                enemy.takeDamage(enemy.isBoss ? scene.bulletDamage * 2.0 : enemy.maxHp);
            }
        });
    } else if (item.type === 'double_xp') {
        scene.showFloatingText(item.x, item.y - 12, "X2 XP (8s)!", "#ffd700");
        scene.isDoubleXpActive = true;

        const xpBar = document.getElementById('xp-bar');
        if (xpBar) {
            xpBar.classList.remove('from-green-400', 'to-emerald-400');
            xpBar.classList.add('from-yellow-400', 'to-orange-500');
        }

        if (scene.doubleXpTimer) scene.doubleXpTimer.destroy();
        scene.doubleXpTimer = scene.time.delayedCall(8000, () => {
            scene.isDoubleXpActive = false;
            const xpBar = document.getElementById('xp-bar');
            if (xpBar) {
                xpBar.classList.remove('from-yellow-400', 'to-orange-500');
                xpBar.classList.add('from-green-400', 'to-emerald-400');
            }
            scene.doubleXpTimer = undefined;
        });
    }

    scene.updateUIBridgePlay();
    item.deactivate();
}

export function handleEnterPortal(scene: PlayScene): void {
    if (!scene.portalActive || scene.isGameOver) return;
    scene.portalActive = false;

    if (scene.cameras && scene.cameras.main) {
        scene.cameras.main.shake(200, 0.005);
        scene.cameras.main.flash(500, 0, 255, 255);
    }
    scene.physics.pause();

    scene.time.delayedCall(600, () => {
        if (scene.stage === 6) {
            scene.triggerGameOver(true);
        } else {
            scene.stage++;
            scene.gameTimeSeconds = (scene.stage - 1) * 60;
            scene.bossSpawned = false;

            if (scene.enemySpawnerEvent) scene.enemySpawnerEvent.paused = false;

            if (!scene.cameras || !scene.cameras.main) return;
            const virtualWidth = scene.cameras.main.width / scene.zoomVal;
            const virtualHeight = scene.cameras.main.height / scene.zoomVal;
            scene.drawGridBackground(virtualWidth, virtualHeight);

            scene.collectiblesGroup.clear(true, true);
            scene.bulletsGroup.clear(true, true);
            scene.enemyBulletsGroup.clear(true, true);
            if (scene.portalSprite) scene.portalSprite.destroy();

            scene.player.setPosition(virtualWidth / 2, virtualHeight / 2);
            scene.hp = scene.maxHp;

            scene.physics.resume();
            scene.updateUIBridgePlay();
        }
    });
}
