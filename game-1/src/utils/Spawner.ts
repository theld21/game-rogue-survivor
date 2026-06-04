import Phaser from 'phaser';
import { PlayScene } from '../scenes/PlayScene';
import { Enemy } from '../entities/Enemy';
import { Collectible } from '../entities/Collectible';
import { handleEnterPortal } from '../scenes/PlayCollision';

export function spawnCollectible(scene: PlayScene, x: number, y: number, type: 'xp' | 'gold' | 'heart' | 'magnet' | 'shield_item' | 'freeze_item' | 'bomb_item' | 'double_xp'): void {
    const collectible = scene.collectiblesGroup.get() as Collectible;
    if (collectible) {
        collectible.spawn(x, y, type);
    }
}

export function spawnPortal(scene: PlayScene, x: number, y: number): void {
    scene.portalActive = true;
    scene.portalSprite = scene.physics.add.sprite(x, y, 'portal_texture');
    if (scene.portalSprite.body) {
        (scene.portalSprite.body as Phaser.Physics.Arcade.Body).setCircle(36, 4, 4);
        (scene.portalSprite.body as Phaser.Physics.Arcade.Body).setAngularVelocity(40);
    }

    scene.portalSprite.setScale(0);
    scene.tweens.add({ targets: scene.portalSprite, scale: 1.0, duration: 1000, ease: 'Bounce.easeOut' });

    scene.physics.add.overlap(scene.player, scene.portalSprite, () => handleEnterPortal(scene), undefined, scene);
}

export function spawnEnemyBullet(scene: PlayScene, x: number, y: number, angle: number, speed: number, damage: number, textureKey: string, scale: number = 1.0): void {
    const bullet = scene.enemyBulletsGroup.get() as Phaser.Physics.Arcade.Sprite;
    if (bullet) {
        if ((bullet as any).lifespanTimer) {
            (bullet as any).lifespanTimer.destroy();
            (bullet as any).lifespanTimer = undefined;
        }

        bullet.enableBody(true, x, y, true, true);
        bullet.setTexture(textureKey);
        bullet.setScale(scale);
        
        // Gán thuộc tính sát thương
        (bullet as any).damage = damage;
        
        if (bullet.body) {
            scene.physics.velocityFromAngle(angle, speed, bullet.body.velocity);
            (bullet.body as Phaser.Physics.Arcade.Body).setCircle(bullet.width / 2);
        }
        
        bullet.setAngle(angle);

        (bullet as any).lifespanTimer = scene.time.delayedCall(3500, () => {
            if (bullet.active) {
                bullet.disableBody(true, true);
            }
            (bullet as any).lifespanTimer = undefined;
        });
    }
}

export function spawnDamagePopup(scene: PlayScene, x: number, y: number, text: number, isCrit: boolean, isWeakPoint: boolean = false): void {
    let displayStr = isCrit ? `🔥 ${text}!` : `${text}`;
    let color = isCrit ? '#ffcc00' : '#ffffff';
    let strokeColor = isCrit ? '#ff3300' : '#333333';
    let fontSize = isCrit ? '18px' : '13px';

    if (isWeakPoint) {
        displayStr = `🎯 ĐIỂM YẾU: ${text}!!`;
        color = '#00ffff';
        strokeColor = '#0066aa';
        fontSize = '20px';
    }

    const popup = scene.add.text(x, y, displayStr, {
        fontFamily: 'Arial, sans-serif',
        fontSize: fontSize,
        fontStyle: 'bold',
        color: color
    }).setOrigin(0.5);

    popup.setStroke(strokeColor, 3);
    popup.setDepth(150);

    scene.tweens.add({
        targets: popup,
        y: y - 35,
        alpha: 0,
        scale: isWeakPoint ? 1.4 : (isCrit ? 1.3 : 1.0),
        duration: 750,
        ease: 'Quad.easeOut',
        onComplete: () => popup.destroy()
    });
}

export function spawnExplosionParticles(scene: PlayScene, x: number, y: number, color: number, count: number = 8): void {
    for (let i = 0; i < count; i++) {
        const p = scene.add.circle(x, y, Phaser.Math.FloatBetween(2, 4.5), color, 0.85);
        scene.physics.add.existing(p);
        const ang = Phaser.Math.FloatBetween(0, Math.PI * 2);
        const spd = Phaser.Math.FloatBetween(40, 140);
        if (p.body) {
            (p.body as Phaser.Physics.Arcade.Body).setVelocity(Math.cos(ang) * spd, Math.sin(ang) * spd);
        }

        scene.tweens.add({
            targets: p,
            alpha: 0,
            scale: 0.1,
            duration: 500,
            onComplete: () => p.destroy()
        });
    }
}

export function spawnNormalEnemyWave(scene: PlayScene): void {
    if (scene.bossSpawned) return;

    const virtualWidth = scene.cameras.main.width / scene.zoomVal;
    const virtualHeight = scene.cameras.main.height / scene.zoomVal;
    const edge = Phaser.Math.Between(0, 3);
    const margin = 50;
    let x = 0;
    let y = 0;

    switch (edge) {
        case 0: x = Phaser.Math.Between(-margin, virtualWidth + margin); y = -margin; break;
        case 1: x = virtualWidth + margin; y = Phaser.Math.Between(-margin, virtualHeight + margin); break;
        case 2: x = Phaser.Math.Between(-margin, virtualWidth + margin); y = virtualHeight + margin; break;
        case 3: x = -margin; y = Phaser.Math.Between(-margin, virtualHeight + margin); break;
    }

    // Đa dạng hóa các loại quái nhỏ theo màn chơi
    let types = ['slime'];
    if (scene.stage === 1) {
        types = ['slime', 'ghost'];
    } else if (scene.stage === 2) {
        types = ['slime', 'bat', 'ghost'];
    } else if (scene.stage === 3) {
        types = ['slime', 'bat', 'ghost', 'thief_goblin'];
    } else if (scene.stage === 4) {
        types = ['slime', 'bat', 'ghost', 'thief_goblin', 'golem'];
    } else if (scene.stage === 5) {
        types = ['slime', 'bat', 'ghost', 'thief_goblin', 'golem', 'wild_boar'];
    } else {
        types = ['slime', 'bat', 'ghost', 'thief_goblin', 'golem', 'wild_boar', 'lich_orb'];
    }

    const type = Phaser.Utils.Array.GetRandom(types);
    
    const enemy = scene.enemiesGroup.get() as Enemy;
    if (enemy) {
        enemy.spawn(x, y, type, scene.difficultyMultiplier);
    }
}

export function spawnStageBoss(scene: PlayScene): void {
    scene.bossSpawned = true;
    scene.enemySpawnerEvent.paused = true;
    
    scene.enemiesGroup.getChildren().forEach(item => {
        const e = item as Enemy;
        if (e.active && !e.isBoss) {
            e.disableBody(true, true);
        }
    });

    scene.showToastMessage("❗ BOSS APPEARED! ❗");
    if (scene.cameras && scene.cameras.main) {
        scene.cameras.main.shake(600, 0.015);
    }

    if (!scene.cameras || !scene.cameras.main) return;
    const virtualWidth = scene.cameras.main.width / scene.zoomVal;
    
    // Chọn ngẫu nhiên loại Boss cho mỗi màn đấu
    let bossType = 'golem_king';
    if (scene.stage === 1) {
        bossType = 'golem_king';
    } else if (scene.stage === 2) {
        bossType = 'horn_demon';
    } else if (scene.stage === 3) {
        bossType = 'shadow_bat';
    } else if (scene.stage === 4) {
        bossType = 'heart_lich';
    } else if (scene.stage === 5) {
        bossType = 'fire_demon';
    } else if (scene.stage === 6) {
        bossType = 'crystal_dragon';
    }

    const boss = scene.enemiesGroup.get() as Enemy;
    if (boss) {
        // Căn vị trí xuất hiện ở phía trên màn hình ảo
        boss.spawn(virtualWidth / 2, 100, bossType, scene.difficultyMultiplier * 1.5, true);
    }
}
