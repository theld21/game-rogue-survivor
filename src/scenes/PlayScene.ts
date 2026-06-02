// ==========================================
// SCENE TRẬN ĐẤU CHÍNH (PLAY SCENE) - NÂNG CẤP
// ==========================================

import Phaser from 'phaser';
import { SAVE_KEYS, getSaveData, saveKeyData, getSaveString, GameState } from '../config';
import { UIBridge } from '../uiBridge';
import { Player } from '../entities/Player';
import { Enemy } from '../entities/Enemy';
import { Bullet } from '../entities/Bullet';
import { Collectible } from '../entities/Collectible';
import { TextureGenerator } from '../utils/TextureGenerator';
import { CharacterType, CHARACTER_CONFIG } from '../utils/CharacterConfig';
import { SkillManager } from '../utils/SkillManager';
import { Joystick } from '../utils/Joystick';
import { SoundEffects } from '../utils/SoundEffects';

import {
    handleBulletHitEnemy,
    handleEnemyHitPlayer,
    handlePlayerCollectItem,
    handleEnemyBulletHitPlayer,
    handleEnterPortal
} from './PlayCollision';

import {
    spawnCollectible,
    spawnPortal,
    spawnEnemyBullet,
    spawnDamagePopup,
    spawnExplosionParticles,
    spawnNormalEnemyWave,
    spawnStageBoss
} from '../utils/Spawner';

export class PlayScene extends Phaser.Scene {
    // Chỉ số vĩnh viễn
    public hpLvl!: number;
    public speedLvl!: number;
    public damageLvl!: number;

    // Thực thể nhân vật chính
    public player!: Player;
    public charType!: 'knight' | 'mage' | 'ranger';
    public maxHp!: number;
    public hp!: number;
    public speed!: number;
    public bulletDamage!: number;
    public bulletTexture!: string;
    public bulletPierce!: number;

    // Kỹ năng phụ trợ trong trận
    public upgradeLevels!: {
        attackSpeed: number;
        moveSpeed: number;
        thorns: number;
        multiShot: number;
        shield: number;
        lightning: number;
        attackRange: number;
    };

    // Điểm số và kinh nghiệm
    public level!: number;
    public xp!: number;
    public xpToNextLevel!: number;
    public stage!: number;
    public gameTimeSeconds!: number;
    public killsCount!: number;
    public goldCollected!: number;
    public attackCooldown!: number;
    public lastFiredTime!: number;
    public difficultyMultiplier!: number;

    // Trạng thái điều khiển
    public isGameOver!: boolean;
    public isLevelUpOpen!: boolean;
    public isPaused: boolean = false;
    public bossSpawned!: boolean;
    public portalActive!: boolean;
    public superMagnetActive: boolean = false; // Nam châm hút toàn bản đồ

    // Trạng thái vật phẩm đặc biệt
    public isInvulnerable: boolean = false;
    public isDoubleXpActive: boolean = false;
    public zoomVal: number = 1.0;

    // Groups vật lý
    public bulletsGroup!: Phaser.Physics.Arcade.Group;
    public enemiesGroup!: Phaser.Physics.Arcade.Group;
    public collectiblesGroup!: Phaser.Physics.Arcade.Group;
    public shieldsGroup!: Phaser.Physics.Arcade.Group;
    public enemyBulletsGroup!: Phaser.Physics.Arcade.Group; // Đạn của quái bắn xa và Boss

    // Joystick ảo
    public joystick!: Joystick;

    // Timers
    public timeEvent!: Phaser.Time.TimerEvent;
    public enemySpawnerEvent!: Phaser.Time.TimerEvent;
    public doubleXpTimer?: Phaser.Time.TimerEvent;
    public magnetTimer?: Phaser.Time.TimerEvent;
    public shieldTimer?: Phaser.Time.TimerEvent;

    // Ngọc ma thuật xoay quanh (Shield)
    public shieldAngle: number = 0;
    public shieldsList: Phaser.Physics.Arcade.Sprite[] = [];

    // Sấm sét
    public lastLightningTime: number = 0;

    // Đồ họa nền vẽ lưới
    public gridGraphics!: Phaser.GameObjects.Graphics;
    // Bụi sáng nền
    public ambientParticles: Phaser.GameObjects.Arc[] = [];
    public portalSprite?: Phaser.Physics.Arcade.Sprite;

    constructor() {
        super({ key: 'PlayScene' });
    }

    public init(): void {
        GameState.selectedCharacter = getSaveString('survivor_selected_char', 'knight') as 'knight' | 'mage' | 'ranger';
        GameState.selectedSkin = getSaveString(SAVE_KEYS.SELECTED_SKIN, 'default');

        this.charType = GameState.selectedCharacter;

        this.hpLvl = getSaveData(SAVE_KEYS.UPGRADE_HP, 0);
        this.speedLvl = getSaveData(SAVE_KEYS.UPGRADE_SPEED, 0);
        this.damageLvl = getSaveData(SAVE_KEYS.UPGRADE_DAMAGE, 0);

        const charConfig = CHARACTER_CONFIG[this.charType];
        let charBaseHp = charConfig.baseHp;
        let charBaseSpeed = charConfig.baseSpeed;
        let charBaseDmg = charConfig.baseDamage;
        this.bulletTexture = charConfig.bulletTexture;
        this.bulletPierce = charConfig.bulletPierce;

        this.maxHp = charBaseHp * (1 + 0.05 * this.hpLvl);
        this.hp = this.maxHp;
        this.speed = charBaseSpeed * (1 + 0.03 * this.speedLvl);
        this.bulletDamage = charBaseDmg * (1 + 0.10 * this.damageLvl);

        this.upgradeLevels = {
            attackSpeed: 0,
            moveSpeed: 0,
            thorns: 0,
            multiShot: 0,
            shield: 0,
            lightning: 0,
            attackRange: 0
        };

        this.level = 1;
        this.xp = 0;
        this.xpToNextLevel = 100;

        this.stage = 1;
        this.gameTimeSeconds = 0;
        this.killsCount = 0;
        this.goldCollected = 0;
        this.attackCooldown = CHARACTER_CONFIG[this.charType].attackCooldown;
        this.lastFiredTime = 0;
        this.difficultyMultiplier = 1.0;

        this.isGameOver = false;
        this.isLevelUpOpen = false;
        this.bossSpawned = false;
        this.portalActive = false;
        this.superMagnetActive = false;

        this.shieldAngle = 0;
        this.shieldsList = [];
        this.lastLightningTime = 0;
        this.ambientParticles = [];

        // Reset trạng thái vật phẩm đặc biệt
        this.isInvulnerable = false;
        this.isDoubleXpActive = false;
        this.doubleXpTimer = undefined;
        this.magnetTimer = undefined;
        this.shieldTimer = undefined;

        // Tính toán Zoom tỉ lệ cho màn hình nhỏ và nhân với dpr để đồng bộ toạ độ
        const minSide = Math.min(window.innerWidth, window.innerHeight);
        const dpr = window.devicePixelRatio || 1;
        let baseZoom = 1.0;
        if (minSide < 600) {
            baseZoom = Math.max(0.6, minSide / 720);
        }
        this.zoomVal = baseZoom * dpr;
    }

    public preload(): void {
        TextureGenerator.generateAll(this);
    }

    public create(): void {
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;
        const virtualWidth = width / this.zoomVal;
        const virtualHeight = height / this.zoomVal;

        // Dừng toàn bộ các instance nhạc cũ để tránh bị lặp đè lên nhau
        this.sound.stopByKey('bgm_home');
        this.sound.stopByKey('bgm_ingame');

        // Bắt đầu phát luồng nhạc chơi game mới
        const vol = getSaveData('survivor_bgm_volume', 80) / 100;
        this.sound.play('bgm_ingame', { loop: true, volume: vol });

        // Cài đặt Camera Zoom và giới hạn vật lý ảo
        this.cameras.main.setZoom(this.zoomVal);
        this.physics.world.setBounds(0, 0, virtualWidth, virtualHeight);
        this.cameras.main.centerOn(virtualWidth / 2, virtualHeight / 2);

        this.gridGraphics = this.add.graphics();
        this.drawGridBackground(virtualWidth, virtualHeight);

        for (let i = 0; i < 30; i++) {
            const p = this.add.circle(
                Phaser.Math.Between(0, virtualWidth),
                Phaser.Math.Between(0, virtualHeight),
                Phaser.Math.FloatBetween(1, 2.2),
                0x00ffff,
                Phaser.Math.FloatBetween(0.1, 0.35)
            );
            this.ambientParticles.push(p);
        }

        this.player = new Player(this, virtualWidth / 2, virtualHeight / 2, this.charType, this.maxHp, this.speed);

        // Áp dụng skin tint cho nhân vật
        const skin = GameState.selectedSkin;
        if (skin === 'knight_mecha') {
            this.player.setTint(0xffd700);
        } else if (skin === 'mage_fire') {
            this.player.setTint(0xff3300);
        } else if (skin === 'ranger_night') {
            this.player.setTint(0xbb33ff);
        }

        // Khởi tạo Groups
        this.bulletsGroup = this.physics.add.group({ classType: Bullet, maxSize: 80, runChildUpdate: true });
        this.enemiesGroup = this.physics.add.group({ classType: Enemy, maxSize: 120, runChildUpdate: true });
        this.collectiblesGroup = this.physics.add.group({ classType: Collectible, maxSize: 100 });
        this.shieldsGroup = this.physics.add.group();
        this.enemyBulletsGroup = this.physics.add.group({ maxSize: 100 });

        // Thiết lập va chạm thông qua module PlayCollision
        this.physics.add.overlap(this.bulletsGroup, this.enemiesGroup, (b, e) => handleBulletHitEnemy(this, b as Bullet, e as Enemy), undefined, this);
        this.physics.add.overlap(this.player, this.enemiesGroup, (p, e) => handleEnemyHitPlayer(this, p as Player, e as Enemy), undefined, this);
        this.physics.add.overlap(this.player, this.collectiblesGroup, (p, c) => handlePlayerCollectItem(this, p as Player, c as Collectible), undefined, this);
        this.physics.add.overlap(this.player, this.enemyBulletsGroup, (p, eb) => handleEnemyBulletHitPlayer(this, p as Player, eb as Phaser.Physics.Arcade.Sprite), undefined, this);

        this.joystick = new Joystick(this, this.zoomVal);

        const pauseBtn = document.getElementById('pause-btn');
        if (pauseBtn) {
            pauseBtn.onclick = (e) => {
                e.stopPropagation();
                this.handlePauseGame();
            };
        }

        UIBridge.showPlay();
        this.updateUIBridgePlay();
        this.updatePlayerHpBridge();

        this.timeEvent = this.time.addEvent({
            delay: 1000,
            callback: this.onSecondTick,
            callbackScope: this,
            loop: true
        });

        this.enemySpawnerEvent = this.time.addEvent({
            delay: 1500,
            callback: this.spawnNormalEnemyWave,
            callbackScope: this,
            loop: true
        });

        this.scale.on('resize', this.handleResize, this);

        // Dọn dẹp sự kiện resize toàn cục khi scene shutdown
        this.events.once('shutdown', () => {
            this.scale.off('resize', this.handleResize, this);
        });
    }

    public update(time: number): void {
        if (!this.cameras || !this.cameras.main) return;
        if (this.isGameOver || this.isLevelUpOpen || this.isPaused) return;

        this.player.updateMovement(this.joystick.isActive(), this.joystick.getVector());
        this.updatePlayerHpBridge();

        // Đồng bộ hiển thị máu Boss nếu có Boss hoạt động
        this.updateBossHPBridge();

        this.ambientParticles.forEach(p => {
            p.y -= 0.6;
            if (p.y < -10) {
                const virtualHeight = this.cameras.main.height / this.zoomVal;
                const virtualWidth = this.cameras.main.width / this.zoomVal;
                p.y = virtualHeight + 10;
                p.x = Phaser.Math.Between(0, virtualWidth);
            }
        });

        if (time - this.lastFiredTime >= this.attackCooldown) {
            const target = this.findClosestEnemy();
            if (target) {
                this.fireMainWeapon(target);
                this.lastFiredTime = time;
            }
        }

        this.updateOrbitingShields();
        this.updateLightningStrike(time);
        this.handleMagnetEffect();
    }

    // ==========================================
    // CẦU NỐI ĐỒNG BỘ DỮ LIỆU SANG HTML UI
    // ==========================================

    public updateUIBridgePlay(): void {
        const mins = Math.floor(this.gameTimeSeconds / 60);
        const secs = this.gameTimeSeconds % 60;
        const timeStr = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;

        UIBridge.updatePlayUI(
            this.level,
            this.stage,
            this.killsCount,
            timeStr,
            this.goldCollected,
            this.xp / this.xpToNextLevel
        );
    }

    public updatePlayerHpBridge(): void {
        if (!this.player || !this.player.active) {
            UIBridge.updatePlayerHP(0, 0, 0, 1, false);
            return;
        }
        if (!this.cameras || !this.cameras.main) return;
        const camera = this.cameras.main;
        const centerX = camera.width / 2;
        const centerY = camera.height / 2;

        // Căn toạ độ X chính xác theo camera zoom tâm
        const screenX = centerX + (this.player.x - camera.scrollX - centerX) * camera.zoom;

        // Căn toạ độ Y đầu nhân vật theo camera zoom tâm
        const worldYHead = this.player.y - 36;
        const screenY = centerY + (worldYHead - camera.scrollY - centerY) * camera.zoom - 15;

        const dpr = window.devicePixelRatio || 1;
        UIBridge.updatePlayerHP(
            screenX / dpr,
            screenY / dpr,
            this.hp,
            this.maxHp,
            true
        );
    }

    public updateBossHPBridge(): void {
        if (!this.bossSpawned) {
            UIBridge.updateBossHP(0, 0, 0, 1, false);
            return;
        }

        // Tìm con quái là Boss đang hoạt động
        const boss = this.enemiesGroup.getChildren().find(item => (item as Enemy).active && (item as Enemy).isBoss) as Enemy;
        if (boss && this.cameras && this.cameras.main) {
            const camera = this.cameras.main;
            const centerX = camera.width / 2;
            const centerY = camera.height / 2;

            const screenX = centerX + (boss.x - camera.scrollX - centerX) * camera.zoom;
            const worldYHead = boss.y - 45;
            const screenY = centerY + (worldYHead - camera.scrollY - centerY) * camera.zoom;

            const dpr = window.devicePixelRatio || 1;
            UIBridge.updateBossHP(screenX / dpr, screenY / dpr, boss.hp, boss.maxHp, true);
        } else {
            // Boss đã bị tiêu diệt
            UIBridge.updateBossHP(0, 0, 0, 1, false);
        }
    }

    // ==========================================
    // LOGIC HÀNH VI TRẬN ĐẤU
    // ==========================================

    public drawGridBackground(w: number, h: number): void {
        this.gridGraphics.clear();
        let color = 0x221d45;
        if (this.stage === 2) color = 0x1d4524;
        else if (this.stage === 3) color = 0x4d1c1c;
        else if (this.stage === 4) color = 0x4d1c44;
        else if (this.stage === 5) color = 0x4d391c;
        else if (this.stage === 6) color = 0x1c444d;

        this.gridGraphics.lineStyle(1.5, color, 0.45);
        const size = 64;
        this.gridGraphics.beginPath();
        for (let x = -size; x < w + size * 2; x += size) {
            this.gridGraphics.moveTo(x, -size);
            this.gridGraphics.lineTo(x, h + size * 2);
        }
        for (let y = -size; y < h + size * 2; y += size) {
            this.gridGraphics.moveTo(-size, y);
            this.gridGraphics.lineTo(w + size * 2, y);
        }
        this.gridGraphics.strokePath();
    }

    public onSecondTick(): void {
        this.gameTimeSeconds++;
        this.updateUIBridgePlay();

        if (this.gameTimeSeconds % 30 === 0 && !this.bossSpawned) {
            this.difficultyMultiplier += 0.12;
            this.showToastMessage("Monsters are getting enraged!");
        }

        const currentStageSec = this.gameTimeSeconds - (this.stage - 1) * 60;

        if (currentStageSec === 50 && !this.bossSpawned) {
            this.spawnStageBoss();
        }

        if (currentStageSec > 50 && currentStageSec % 10 === 0 && this.bossSpawned) {
            this.showToastMessage("Defeat the Boss to open the portal!");
        }
    }

    public findClosestEnemy(): Enemy | null {
        let closest: Enemy | null = null;
        let minDist = Infinity;

        this.enemiesGroup.getChildren().forEach(item => {
            const e = item as Enemy;
            if (e.active && e.enemyType !== 'crystal_spike') {
                const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, e.x, e.y);
                if (d < minDist) {
                    minDist = d;
                    closest = e;
                }
            }
        });
        return closest;
    }

    public fireMainWeapon(target: Enemy): void {
        const angle = Phaser.Math.Angle.Between(this.player.x, this.player.y, target.x, target.y);
        const deg = Phaser.Math.RadToDeg(angle);

        let lifespan = 3500;
        if (this.charType === 'knight') {
            lifespan = 400;
        } else if (this.charType === 'mage') {
            lifespan = 4500;
        } else if (this.charType === 'ranger') {
            lifespan = 3500;
        }

        // Áp dụng nâng cấp tầm đánh (+30% lifespan mỗi cấp)
        lifespan = Math.round(lifespan * (1 + 0.3 * this.upgradeLevels.attackRange));

        const b = this.bulletsGroup.get() as Bullet;
        if (b) {
            b.fire(this.player.x, this.player.y, deg, 450, this.bulletDamage, this.bulletTexture, this.bulletPierce, lifespan);
            SoundEffects.playShoot();
            if (this.charType === 'mage') {
                this.spawnExplosionParticles(this.player.x + Math.cos(angle) * 15, this.player.y + Math.sin(angle) * 15, 0xffaa00, 3);
            }
        }

        const multiLvl = this.upgradeLevels.multiShot;
        if (multiLvl > 0) {
            const backAngle = deg + 180;
            if (multiLvl === 1) {
                const bBack = this.bulletsGroup.get() as Bullet;
                if (bBack) bBack.fire(this.player.x, this.player.y, backAngle, 450, this.bulletDamage * 0.7, this.bulletTexture, this.bulletPierce, lifespan);
            } else {
                const count = multiLvl === 2 ? 2 : 3;
                const spread = 28;
                const startAng = backAngle - ((count - 1) * spread) / 2;

                for (let i = 0; i < count; i++) {
                    const bBack = this.bulletsGroup.get() as Bullet;
                    if (bBack) {
                        bBack.fire(this.player.x, this.player.y, startAng + i * spread, 450, this.bulletDamage * 0.7, this.bulletTexture, this.bulletPierce, lifespan);
                    }
                }
            }
        }
    }

    // Delegates to Spawner module
    public spawnCollectible(x: number, y: number, type: 'xp' | 'gold' | 'heart' | 'magnet' | 'shield_item' | 'freeze_item' | 'bomb_item' | 'double_xp'): void {
        spawnCollectible(this, x, y, type);
    }

    public spawnPortal(x: number, y: number): void {
        spawnPortal(this, x, y);
    }

    public spawnEnemyBullet(x: number, y: number, angle: number, speed: number, damage: number, textureKey: string, scale: number = 1.0): void {
        spawnEnemyBullet(this, x, y, angle, speed, damage, textureKey, scale);
    }

    public spawnDamagePopup(x: number, y: number, text: number, isCrit: boolean, isWeakPoint: boolean = false): void {
        spawnDamagePopup(this, x, y, text, isCrit, isWeakPoint);
    }

    public spawnExplosionParticles(x: number, y: number, color: number, count: number = 8): void {
        spawnExplosionParticles(this, x, y, color, count);
    }

    public spawnNormalEnemyWave(): void {
        spawnNormalEnemyWave(this);
    }

    public spawnStageBoss(): void {
        spawnStageBoss(this);
    }

    public updateOrbitingShields(): void {
        const lvl = this.upgradeLevels.shield;
        if (lvl === 0) return;

        if (this.shieldsList.length !== lvl) {
            this.shieldsList.forEach(s => s.destroy());
            this.shieldsList = [];

            for (let i = 0; i < lvl; i++) {
                const s = this.physics.add.sprite(this.player.x, this.player.y, 'shield_texture');
                if (s.body) {
                    (s.body as Phaser.Physics.Arcade.Body).setCircle(8);
                }
                this.shieldsGroup.add(s);
                this.shieldsList.push(s);
            }

            this.physics.add.overlap(this.shieldsGroup, this.enemiesGroup, (shield: any, enemy: any) => {
                if (enemy.active) {
                    enemy.takeDamage(this.bulletDamage * 0.35);
                    this.spawnExplosionParticles(enemy.x, enemy.y, 0x00ffff, 2);
                }
            }, undefined, this);
        }

        this.shieldAngle += 0.045;
        const radius = 82;
        const angleStep = (Math.PI * 2) / lvl;

        this.shieldsList.forEach((shield, i) => {
            const finalAngle = this.shieldAngle + i * angleStep;
            const tx = this.player.x + Math.cos(finalAngle) * radius;
            const ty = this.player.y + Math.sin(finalAngle) * radius;

            shield.setPosition(tx, ty);
            shield.setAngle(Phaser.Math.RadToDeg(finalAngle));
        });
    }

    public updateLightningStrike(time: number): void {
        const lvl = this.upgradeLevels.lightning;
        if (lvl === 0) return;

        const cooldown = 4000 - Math.min(2000, lvl * 500);

        if (time - this.lastLightningTime >= cooldown) {
            const activeEnemies = this.enemiesGroup.getChildren().filter(e => e.active) as Enemy[];
            if (activeEnemies.length > 0) {
                const count = Math.min(activeEnemies.length, lvl);
                const targets = Phaser.Utils.Array.Shuffle(activeEnemies).slice(0, count);

                targets.forEach(enemy => {
                    this.triggerLightningEffect(enemy);
                });

                this.lastLightningTime = time;
            }
        }
    }

    public triggerLightningEffect(enemy: Enemy): void {
        const dmg = this.bulletDamage * 1.5;
        enemy.takeDamage(dmg, true);

        const originalSpeed = enemy.speed;
        enemy.speed = Math.round(enemy.speed * 0.6);
        if (enemy.slowTimer) {
            enemy.slowTimer.destroy();
        }
        enemy.slowTimer = this.time.delayedCall(2500, () => {
            if (enemy.active) enemy.speed = originalSpeed;
            enemy.slowTimer = undefined;
        });

        const lightningG = this.add.graphics();
        lightningG.lineStyle(3, 0xffffff, 1);

        const startX = enemy.x + Phaser.Math.Between(-40, 40);
        const startY = -20;

        const midX1 = (startX + enemy.x) / 2 + Phaser.Math.Between(-30, 30);
        const midY1 = (startY + enemy.y) * 0.33;
        const midX2 = (startX + enemy.x) / 2 + Phaser.Math.Between(-30, 30);
        const midY2 = (startY + enemy.y) * 0.66;

        lightningG.beginPath();
        lightningG.moveTo(startX, startY);
        lightningG.lineTo(midX1, midY1);
        lightningG.lineTo(midX2, midY2);
        lightningG.lineTo(enemy.x, enemy.y);
        lightningG.strokePath();

        lightningG.lineStyle(1.5, 0x00ffff, 0.8);
        lightningG.strokePath();

        if (this.cameras && this.cameras.main) {
            this.cameras.main.flash(40, 0, 200, 255);
        }

        this.tweens.add({
            targets: lightningG,
            alpha: 0,
            duration: 120,
            onComplete: () => lightningG.destroy()
        });
    }

    public handleMagnetEffect(): void {
        this.collectiblesGroup.getChildren().forEach(item => {
            const collectible = item as Collectible;
            if (collectible.active) {
                // Nam châm siêu cấp hút toàn bản đồ
                if (this.superMagnetActive) {
                    this.physics.moveToObject(collectible, this.player, 420);
                } else {
                    const baseRange = 135;
                    const finalRange = baseRange + (this.upgradeLevels.moveSpeed * 30);
                    const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, collectible.x, collectible.y);
                    if (d < finalRange) {
                        this.physics.moveToObject(collectible, this.player, 280);
                    } else {
                        if (collectible.body) (collectible.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
                    }
                }
            }
        });
    }

    public activateSuperMagnet(): void {
        this.superMagnetActive = true;
        if (this.magnetTimer) this.magnetTimer.destroy();
        this.magnetTimer = this.time.delayedCall(3000, () => {
            this.superMagnetActive = false;
            this.magnetTimer = undefined;
        });
    }

    public levelUp(): void {
        this.xp -= this.xpToNextLevel;
        this.level++;
        this.xpToNextLevel = Math.floor(this.xpToNextLevel * 1.28) + 60;
        SoundEffects.playLevelUp();
        this.showLevelUpOverlay();
    }

    public triggerGameOver(isVictory: boolean, isQuit: boolean = false): void {
        this.isGameOver = true;
        this.physics.pause();
        if (this.enemySpawnerEvent) this.enemySpawnerEvent.destroy();
        if (this.timeEvent) this.timeEvent.destroy();
        // Xóa dòng pause time để các tweens / popup hoạt động bình thường,
        // hoặc dùng setTimeout để popup kết quả hiện lên chắc chắn
        this.tweens.pauseAll();

        this.joystick.disable();
        if (this.player.body) {
            (this.player.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
        }

        this.shieldsList.forEach(s => s.destroy());
        this.enemyBulletsGroup.clear(true, true);

        // Hồi ẩn HP Boss
        UIBridge.updateBossHP(0, 0, 0, 1, false);

        const curGold = getSaveData(SAVE_KEYS.GOLD, 0);
        const bonusGold = isVictory ? 200 : 0;
        const total = curGold + this.goldCollected + bonusGold;
        saveKeyData(SAVE_KEYS.GOLD, total);

        setTimeout(() => {
            if (this.scene && this.scene.isActive()) {
                UIBridge.showGameOver(
                    isVictory,
                    this.gameTimeSeconds,
                    this.killsCount,
                    this.goldCollected,
                    total,
                    () => {
                        this.scene.start('PlayScene');
                    },
                    () => {
                        this.scene.start('MenuScene');
                    },
                    isQuit
                );
            }
        }, 1000);
    }

    // ==========================================
    // HIỆU ỨNG TÁC ĐỘNG VÀ ĐỒ HỌA
    // ==========================================

    public showToastMessage(msg: string): void {
        if (!this.cameras || !this.cameras.main) return;
        const screenWidth = this.cameras.main.width;
        const screenHeight = this.cameras.main.height;
        const z = this.zoomVal;

        const dpr = window.devicePixelRatio || 1;
        const baseZoom = z / dpr;

        // Tính vị trí Y tương ứng với -60px và 170px của CSS pixels, nhân hệ số dpr và chia cho zoom thực tế z
        const yStart = (-60 * dpr - screenHeight / 2) / z + screenHeight / 2;
        const yTarget = (170 * dpr - screenHeight / 2) / z + screenHeight / 2;

        const toast = this.add.text(screenWidth / 2, yStart, msg, {
            fontFamily: 'Arial, sans-serif',
            fontSize: (screenWidth / dpr) < 400 ? '13px' : '15px',
            fontStyle: 'bold',
            color: '#ffea00',
            backgroundColor: '#1b0c2a',
            padding: { x: 18, y: 10 },
            align: 'center'
        }).setOrigin(0.5);

        toast.setStroke('#ff0066', 3);
        toast.setDepth(150);
        toast.setScrollFactor(0);
        toast.setScale(1 / baseZoom);

        this.tweens.add({
            targets: toast,
            y: yTarget,
            duration: 380,
            ease: 'Back.easeOut',
            onComplete: () => {
                this.time.delayedCall(3000, () => {
                    if (toast.active) {
                        this.tweens.add({
                            targets: toast,
                            y: yStart,
                            duration: 380,
                            ease: 'Back.easeIn',
                            onComplete: () => {
                                toast.destroy();
                            }
                        });
                    }
                });
            }
        });
    }

    public showFloatingText(x: number, y: number, text: string, color: string): void {
        const ft = this.add.text(x, y, text, {
            fontFamily: 'Arial, sans-serif',
            fontSize: '14px',
            fontStyle: 'bold',
            color: color
        }).setOrigin(0.5);

        ft.setStroke('#000000', 3);
        ft.setDepth(150);

        this.tweens.add({
            targets: ft,
            y: y - 60,
            alpha: 0,
            duration: 1800,
            ease: 'Quad.easeOut',
            onComplete: () => ft.destroy()
        });
    }

    public screenToViewport(x: number, y: number): { x: number; y: number } {
        if (!this.cameras || !this.cameras.main) return { x, y };
        const screenWidth = this.cameras.main.width;
        const screenHeight = this.cameras.main.height;
        const z = this.zoomVal;
        return {
            x: (x - screenWidth / 2) / z + screenWidth / 2,
            y: (y - screenHeight / 2) / z + screenHeight / 2
        };
    }

    public handleResize(gameSize: Phaser.Structs.Size): void {
        if (!this.cameras || !this.cameras.main) return;
        const width = gameSize.width;
        const height = gameSize.height;

        this.cameras.main.setSize(width, height);

        // Cập nhật lại Zoom trên di động khi xoay màn hình (sử dụng kích thước CSS để tính zoom)
        const dpr = window.devicePixelRatio || 1;
        const cssWidth = width / dpr;
        const cssHeight = height / dpr;
        const minSideCss = Math.min(cssWidth, cssHeight);

        let baseZoom = 1.0;
        if (minSideCss < 600) {
            baseZoom = Math.max(0.6, minSideCss / 720);
        }
        this.zoomVal = baseZoom * dpr;

        this.cameras.main.setZoom(this.zoomVal);

        const virtualWidth = width / this.zoomVal;
        const virtualHeight = height / this.zoomVal;
        this.physics.world.setBounds(0, 0, virtualWidth, virtualHeight);
        this.cameras.main.centerOn(virtualWidth / 2, virtualHeight / 2);

        this.drawGridBackground(virtualWidth, virtualHeight);

        if (this.joystick) {
            this.joystick.updateZoom(this.zoomVal);
        }

        this.updateUIBridgePlay();
    }

    public handlePauseGame(): void {
        if (this.isGameOver || this.isLevelUpOpen || this.isPaused) return;

        this.isPaused = true;
        this.physics.pause();
        if (this.enemySpawnerEvent) this.enemySpawnerEvent.paused = true;
        this.time.paused = true;
        this.tweens.pauseAll();

        this.joystick.disable();
        if (this.player && this.player.body) {
            (this.player.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
        }

        const initialVol = getSaveData('survivor_bgm_volume', 80);
        const initialSfxVol = getSaveData('survivor_sfx_volume', 80);

        UIBridge.showPause(
            initialVol,
            initialSfxVol,
            // onVolumeChange callback
            (vol: number) => {
                saveKeyData('survivor_bgm_volume', vol);
                const newVol = vol / 100;
                this.sound.volume = newVol;
                const ingameBgm = this.sound.get('bgm_ingame');
                if (ingameBgm) {
                    (ingameBgm as any).volume = newVol;
                }
                // Nudge for iOS WKWebView immediate volume update
                const soundManager = this.sound as any;
                if (soundManager.context && typeof soundManager.context.suspend === 'function') {
                    const ctx = soundManager.context;
                    if (ctx.state === 'running') {
                        ctx.suspend().then(() => ctx.resume());
                    }
                }
            },
            // onSfxVolumeChange callback
            (vol: number) => {
                saveKeyData('survivor_sfx_volume', vol);
                SoundEffects.setVolume(vol);
            },
            // onResume
            () => {
                // Resume
                this.isPaused = false;
                this.physics.resume();
                if (this.enemySpawnerEvent) this.enemySpawnerEvent.paused = false;
                this.time.paused = false;
                this.tweens.resumeAll();
                UIBridge.hidePause();
            },
            // onExit
            () => {
                // Exit
                this.isPaused = false;
                this.time.paused = false;
                this.tweens.resumeAll();
                UIBridge.hidePause();

                this.triggerGameOver(false, true);
            }
        );
    }

    // ==========================================
    // POPUP LÊN CẤP KỸ NĂNG
    // ==========================================

    public showLevelUpOverlay(): void {
        this.isLevelUpOpen = true;
        this.physics.pause();
        if (this.enemySpawnerEvent) this.enemySpawnerEvent.paused = true;
        this.time.paused = true;
        this.tweens.pauseAll();

        this.joystick.disable();
        if (this.player.body) {
            (this.player.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
        }

        const skills = SkillManager.getAvailableSkills(this.upgradeLevels);
        const selected = Phaser.Utils.Array.Shuffle(skills).slice(0, 3);

        UIBridge.showLevelUp(selected, (selectedId) => {
            SkillManager.applySkill(this, selectedId);

            this.physics.resume();
            if (this.enemySpawnerEvent) this.enemySpawnerEvent.paused = false;
            this.time.paused = false;
            this.tweens.resumeAll();
            this.isLevelUpOpen = false;
            this.updateUIBridgePlay();
            this.updatePlayerHpBridge();
        });
    }
}
