// ==========================================
// THỰC THỂ QUÁI VẬT VÀ BOSS (ENEMY ENTITY)
// ==========================================

import Phaser from 'phaser';
import { UIBridge } from '../uiBridge';
import { SoundEffects } from '../utils/SoundEffects';
import { Player } from './Player';
import { EnemyBehavior } from './EnemyBehavior';
import { getEnemyConfig } from '../utils/EnemyConfig';
import { SlimeBehavior } from './enemies/SlimeBehavior';
import { BatBehavior } from './enemies/BatBehavior';
import { GolemBehavior } from './enemies/GolemBehavior';
import { GhostBehavior } from './enemies/GhostBehavior';
import { ThiefGoblinBehavior } from './enemies/ThiefGoblinBehavior';
import { WildBoarBehavior } from './enemies/WildBoarBehavior';
import { CrystalSpikeBehavior } from './enemies/CrystalSpikeBehavior';
import { LichOrbBehavior } from './enemies/LichOrbBehavior';
import { GolemKingBehavior } from './bosses/GolemKingBehavior';
import { HornDemonBehavior } from './bosses/HornDemonBehavior';
import { ShadowBatBehavior } from './bosses/ShadowBatBehavior';
import { HeartLichBehavior } from './bosses/HeartLichBehavior';
import { FireDemonBehavior } from './bosses/FireDemonBehavior';
import { CrystalDragonBehavior } from './bosses/CrystalDragonBehavior';

export class Enemy extends Phaser.Physics.Arcade.Sprite {
    public hp: number = 20;
    public maxHp: number = 20;
    public speed: number = 100;
    public enemyType: string = 'slime';
    public isBoss: boolean = false;
    public baseGoldChance: number = 0.3;

    // Strategy Pattern reference
    public behavior?: EnemyBehavior;

    // Các biến phục vụ AI và kỹ năng
    public aiState: 'chase' | 'leap_prep' | 'leaping' | 'shoot_prep' | 'wander' | 'charge_prep' | 'charging' = 'chase';
    public wanderAngle: number = 0;
    public nextWanderChangeTime: number = 0;
    public lastActionTime: number = 0;
    
    // Hitbox cảnh báo nhảy (Telegraph indicator)
    public telegraphCircle?: Phaser.GameObjects.Arc;

    // Đường bay và chỉ báo mờ của Boss nhảy
    public startX: number = 0;
    public startY: number = 0;
    public ghostLandIndicator?: Phaser.GameObjects.Sprite;

    // Trạng thái Bị Đóng Băng (Freeze Item)
    public isFrozen: boolean = false;

    // Hệ thống điểm yếu (Weak Point)
    public isWeakPointActive: boolean = false;
    public weakPointX: number = 0;
    public weakPointY: number = 0;
    public weakPointRadius: number = 14;
    private weakPointTimer: number = 0;
    private weakPointIndicator?: Phaser.GameObjects.Graphics;

    // Thông tin ăn cắp của Thief Goblin
    public goldStolen: number = 0;
    public xpStolen: number = 0;

    // Tham chiếu cha cho Orb xoay
    public bossParent?: Enemy;
    public orbitAngle: number = 0;

    // Sát thương phản hồi giảm giảm thiểu
    public isShieldActive: boolean = false;
    public lastLichFireTime: number = 0;

    // Timers để dọn dẹp khi tái sử dụng
    public lifespanTimer?: Phaser.Time.TimerEvent;
    public slowTimer?: Phaser.Time.TimerEvent;
    public freezeTimer?: Phaser.Time.TimerEvent;

    // Hiệu ứng sống động (chibi)
    public baseScale: number = 1.0;       // Tỉ lệ gốc (0.5 quái thường, 0.8/0.925 boss)
    public bobOffset: number = 0;         // Lệch pha bob để đám đông không đồng bộ
    public shadow?: Phaser.GameObjects.Ellipse; // Bóng đổ mềm dưới chân
    public spawnAnimDone: boolean = true; // Chặn ghi scale-bob khi pop-in chưa xong

    constructor(scene: Phaser.Scene, x: number, y: number) {
        super(scene, x, y, 'enemy_slime');
        
        scene.add.existing(this);
        scene.physics.add.existing(this);

        if (this.body) {
            (this.body as Phaser.Physics.Arcade.Body).setBounce(0.3);
        }
    }

    public spawn(x: number, y: number, type: string, multiplier: number, isBoss: boolean = false): void {
        if (this.lifespanTimer) {
            this.lifespanTimer.destroy();
            this.lifespanTimer = undefined;
        }
        if (this.slowTimer) {
            this.slowTimer.destroy();
            this.slowTimer = undefined;
        }
        if (this.freezeTimer) {
            this.freezeTimer.destroy();
            this.freezeTimer = undefined;
        }
        this.scene.tweens.killTweensOf(this);

        this.enemyType = type;
        this.isBoss = isBoss;
        this.enableBody(true, x, y, true, true);
        this.setTexture(isBoss ? 'boss_' + type : 'enemy_' + type);
        this.clearTint();
        this.setScale(1.0);
        this.setRotation(0);
        this.setFlipX(false);
        this.bobOffset = Phaser.Math.FloatBetween(0, Math.PI * 2);
        
        this.aiState = 'chase';
        this.lastActionTime = 0;
        this.wanderAngle = Phaser.Math.FloatBetween(0, Math.PI * 2);
        this.nextWanderChangeTime = 0;
        
        if (this.telegraphCircle) {
            this.telegraphCircle.destroy();
            this.telegraphCircle = undefined;
        }

        if (this.ghostLandIndicator) {
            this.ghostLandIndicator.destroy();
            this.ghostLandIndicator = undefined;
        }

        // Reset các biến hiệu ứng và điểm yếu
        this.isFrozen = false;
        this.isWeakPointActive = false;
        this.weakPointTimer = 0;
        this.goldStolen = 0;
        this.xpStolen = 0;
        this.bossParent = undefined;
        this.isShieldActive = false;
        this.lastLichFireTime = 0;

        if (this.weakPointIndicator) {
            this.weakPointIndicator.destroy();
            this.weakPointIndicator = undefined;
        }

        let baseHp = 20;
        let baseSpeed = 100;
        this.baseGoldChance = 0.3;

        // Cấu hình từ database quái thường nếu không phải Boss
        const config = getEnemyConfig(type);
        if (!isBoss && config) {
            baseHp = config.baseHp;
            baseSpeed = config.baseSpeed;
            this.baseGoldChance = config.baseGoldChance;
            this.setScale(0.5);
            this.setAlpha(type === 'ghost' ? 0.75 : 1.0);
            
            if (this.body) {
                const radius = config.radius;
                const offsetX = (this.width - (radius * 2)) / 2;
                const offsetY = (this.height - (radius * 2)) / 2;
                (this.body as Phaser.Physics.Arcade.Body).setCircle(radius, offsetX, offsetY);
            }
            
            // Map kỹ năng từ cấu hình sang hành vi AI tương ứng
            if (config.skill === 'leap') this.behavior = new SlimeBehavior();
            else if (config.skill === 'chase') {
                if (type === 'ghost') this.behavior = new GhostBehavior();
                else this.behavior = new BatBehavior();
            }
            else if (config.skill === 'wander') {
                if (type === 'thief_goblin') this.behavior = new ThiefGoblinBehavior();
                else if (type === 'lich_orb') this.behavior = new LichOrbBehavior();
                else if (type === 'crystal_spike') this.behavior = new CrystalSpikeBehavior();
                else this.behavior = new GolemBehavior();
            }
            else if (config.skill === 'charge') this.behavior = new WildBoarBehavior();
            else this.behavior = new SlimeBehavior();
        } else if (isBoss) {
            // Chỉ số và tỷ lệ kích thước Boss
            if (type === 'golem_king') {
                baseHp = 160;
                baseSpeed = 80;
            } else if (type === 'horn_demon') {
                baseHp = 190;
                baseSpeed = 95;
            } else if (type === 'shadow_bat') {
                baseHp = 420;
                baseSpeed = 140;
            } else if (type === 'heart_lich') {
                baseHp = 480;
                baseSpeed = 70;
            } else if (type === 'fire_demon') {
                baseHp = 950;
                baseSpeed = 80;
            } else if (type === 'crystal_dragon') {
                baseHp = 1150;
                baseSpeed = 110;
                this.setScale(0.925);
            }

            if (type !== 'crystal_dragon') {
                this.setScale(0.8);
            }
            // Warm "boss aura" tint nhẹ để art chibi vẫn lên màu (white=trúng đòn, magenta=khiên)
            this.setTint(0xffd9a0);

            if (this.body) {
                let radius = 48;
                if (type === 'shadow_bat') radius = 36;
                else if (type === 'heart_lich') radius = 44;
                else if (type === 'fire_demon') radius = 44;
                else if (type === 'crystal_dragon') radius = 52;
                const offsetX = (this.width - (radius * 2)) / 2;
                const offsetY = (this.height - (radius * 2)) / 2;
                (this.body as Phaser.Physics.Arcade.Body).setCircle(radius, offsetX, offsetY);
            }

            // Khởi tạo Behavior cho Boss
            if (type === 'golem_king') this.behavior = new GolemKingBehavior();
            else if (type === 'horn_demon') this.behavior = new HornDemonBehavior();
            else if (type === 'shadow_bat') this.behavior = new ShadowBatBehavior();
            else if (type === 'heart_lich') this.behavior = new HeartLichBehavior();
            else if (type === 'fire_demon') this.behavior = new FireDemonBehavior();
            else if (type === 'crystal_dragon') this.behavior = new CrystalDragonBehavior();
        }

        this.maxHp = Math.round(baseHp * multiplier);
        this.hp = this.maxHp;
        this.speed = Math.round(baseSpeed * (1 + (multiplier - 1) * 0.28));

        // Ghi nhớ tỉ lệ gốc (đã được set ở trên: 0.5 thường, 0.8 boss, 0.925 rồng)
        this.baseScale = this.scaleX;

        // Bóng đổ mềm dưới chân (rẻ — bám theo trong update). Crystal_spike/lich_orb
        // là bẫy/orb tĩnh nên bỏ qua cho gọn.
        // Sprite quái ở depth 3, bóng ở depth 2 (trên lưới nền, dưới quái).
        this.setDepth(3);
        const wantShadow = type !== 'crystal_spike' && type !== 'lich_orb';
        if (wantShadow) {
            const sw = this.displayWidth * 0.62;
            if (!this.shadow) {
                this.shadow = this.scene.add.ellipse(x, y, sw, sw * 0.36, 0x000000, 0.22);
            } else {
                this.shadow.setSize(sw, sw * 0.36);
                this.shadow.setActive(true).setVisible(true);
            }
            this.shadow.setDepth(2);
        } else if (this.shadow) {
            this.shadow.setVisible(false);
        }

        // Pop-in xuất hiện (scale tween nhanh, tween cho riêng từng con vẫn rẻ vì
        // chỉ chạy 1 lần lúc spawn rồi dừng)
        this.scene.tweens.killTweensOf(this);
        this.spawnAnimDone = false;
        this.setScale(this.baseScale * 0.2);
        this.scene.tweens.add({
            targets: this,
            scaleX: this.baseScale,
            scaleY: this.baseScale,
            duration: 240,
            ease: 'Back.easeOut',
            onComplete: () => { this.spawnAnimDone = true; }
        });
    }

    public update(time: number, delta: number): void {
        if (!this.active || !this.body) return;

        // Nếu quái bị đóng băng, đứng yên
        if (this.isFrozen) {
            (this.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
            return;
        }

        const playScene = this.scene as any;
        if (playScene.isGameOver || playScene.isLevelUpOpen) {
            (this.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
            return;
        }

        const player = playScene.player as Player;
        if (!player || !player.active) return;

        const distanceToPlayer = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);

        // Hiệu ứng sống động chibi — squash/stretch theo baseScale (rẻ, tính trong update).
        // Chỉ ghi scale sau khi pop-in xong để không đè hiệu ứng xuất hiện.
        const bs = this.baseScale;
        const wob = Math.sin(time / 110 + this.bobOffset);
        if (this.enemyType === 'ghost') {
            this.y += 0.25 * Math.sin(time / 150 + this.bobOffset); // Bay bổng (không đụng scale)
        } else if (this.spawnAnimDone) {
            if (this.enemyType === 'slime' && this.aiState !== 'leap_prep') {
                // Slime nhún nảy: cao thì hẹp, thấp thì bè
                this.scaleY = bs * (1 + 0.14 * wob);
                this.scaleX = bs * (1 - 0.10 * wob);
            } else if (this.enemyType === 'bat') {
                // Dơi vỗ cánh nhanh
                this.scaleX = bs * (1 + 0.16 * Math.sin(time / 80 + this.bobOffset));
            } else if (this.isBoss) {
                // Boss: nhịp thở phình nhẹ (không đụng tâm điểm yếu vì offset cố định)
                const breathe = bs * (1 + 0.035 * Math.sin(time / 260 + this.bobOffset));
                this.scaleX = breathe;
                this.scaleY = breathe;
            } else if (this.enemyType !== 'crystal_spike' && this.enemyType !== 'lich_orb') {
                // Bob thở nhẹ chung cho các quái còn lại (lệch pha để đám đông không đồng bộ)
                const breathe = bs * (1 + 0.05 * wob);
                this.scaleX = breathe;
                this.scaleY = breathe;
            }
        }

        // Quay mặt trái/phải theo người chơi (giữ thẳng đứng, mặt chibi luôn đọc đúng)
        this.setFlipX(player.x < this.x);

        // Bóng đổ bám theo chân quái
        if (this.shadow && this.shadow.visible) {
            this.shadow.setPosition(this.x, this.y + this.displayHeight * 0.42);
        }

        if (this.isBoss) {
            this.updateWeakPoint(time);
        }

        if (this.behavior) {
            this.behavior.update(this, time, delta, player, distanceToPlayer);
        }
    }

    private updateWeakPoint(time: number): void {
        if (time > this.weakPointTimer) {
            this.isWeakPointActive = !this.isWeakPointActive;
            if (this.isWeakPointActive) {
                // Đặt vị trí sừng hoặc tim (tăng gấp đôi để khớp với texture nhân đôi)
                if (this.enemyType === 'golem_king' || this.enemyType === 'horn_demon') {
                    // Boss có sừng: điểm yếu ở sừng phía trên
                    this.weakPointX = 0;
                    this.weakPointY = -44;
                } else if (this.enemyType === 'fire_demon' || this.enemyType === 'heart_lich') {
                    // Boss có tim: điểm yếu ở tim chính giữa ngực
                    this.weakPointX = 0;
                    this.weakPointY = 8;
                } else {
                    // Boss khác: vị trí ngẫu nhiên
                    this.weakPointX = Phaser.Math.Between(-30, 30);
                    this.weakPointY = Phaser.Math.Between(-30, 30);
                }
                this.weakPointTimer = time + 4000; // Hoạt động 4 giây
            } else {
                this.weakPointTimer = time + 3500; // Nghỉ 3.5 giây
                if (this.weakPointIndicator) {
                    this.weakPointIndicator.destroy();
                    this.weakPointIndicator = undefined;
                }
            }
        }

        if (this.isWeakPointActive) {
            if (!this.weakPointIndicator) {
                this.weakPointIndicator = this.scene.add.graphics();
                this.weakPointIndicator.setDepth(120);
            }
            this.weakPointIndicator.clear();
            
            // Vẽ hồng tâm mục tiêu quay tròn
            this.weakPointIndicator.lineStyle(2, 0x22e3ff, 0.85);
            this.weakPointIndicator.strokeCircle(0, 0, this.weakPointRadius);
            
            this.weakPointIndicator.lineStyle(1.5, 0xff4fa3, 0.95);
            this.weakPointIndicator.beginPath();
            this.weakPointIndicator.moveTo(-this.weakPointRadius - 4, 0);
            this.weakPointIndicator.lineTo(-this.weakPointRadius + 4, 0);
            this.weakPointIndicator.moveTo(this.weakPointRadius - 4, 0);
            this.weakPointIndicator.lineTo(this.weakPointRadius + 4, 0);
            this.weakPointIndicator.moveTo(0, -this.weakPointRadius - 4);
            this.weakPointIndicator.lineTo(0, -this.weakPointRadius + 4);
            this.weakPointIndicator.moveTo(0, this.weakPointRadius - 4);
            this.weakPointIndicator.lineTo(0, this.weakPointRadius + 4);
            this.weakPointIndicator.strokePath();

            // Cập nhật vị trí bám theo Boss
            this.weakPointIndicator.setPosition(this.x + this.weakPointX * this.scaleX, this.y + this.weakPointY * this.scaleY);
            this.weakPointIndicator.setRotation(time / 200);
        }
    }

    public takeDamage(amount: number, isCrit: boolean = false, isWeakPoint: boolean = false): void {
        // Nếu Boss hắc ám bật khiên, giảm sát thương đi 80%
        if (this.isShieldActive) {
            amount = amount * 0.2;
        }

        this.hp -= amount;

        // Máu Boss tự động đồng bộ trên đầu Boss qua updateBossHPBridge

        (this.scene as any).spawnDamagePopup(this.x, this.y - 12, Math.round(amount), isCrit, isWeakPoint);
        SoundEffects.playHitEnemy();

        this.setTint(0xffffff);
        this.scene.time.delayedCall(70, () => {
            if (this.active) {
                this.clearTint();
                if (this.isBoss) {
                    if (this.isShieldActive) this.setTint(0xff00ff);
                    else this.setTint(0xffd9a0);
                }
            }
        });

        if (this.hp <= 0) {
            this.die();
        }
    }

    public die(): void {
        // Đã chết

        if (this.lifespanTimer) {
            this.lifespanTimer.destroy();
            this.lifespanTimer = undefined;
        }
        if (this.slowTimer) {
            this.slowTimer.destroy();
            this.slowTimer = undefined;
        }
        if (this.freezeTimer) {
            this.freezeTimer.destroy();
            this.freezeTimer = undefined;
        }
        this.scene.tweens.killTweensOf(this);

        if (this.telegraphCircle) {
            this.telegraphCircle.destroy();
            this.telegraphCircle = undefined;
        }

        if (this.weakPointIndicator) {
            this.weakPointIndicator.destroy();
            this.weakPointIndicator = undefined;
        }

        if (this.ghostLandIndicator) {
            this.ghostLandIndicator.destroy();
            this.ghostLandIndicator = undefined;
        }

        const color = this.isBoss ? 0xffea00 : (this.enemyType === 'slime' ? 0xff3333 : (this.enemyType === 'bat' ? 0x9933ff : 0x777777));
        (this.scene as any).spawnExplosionParticles(this.x, this.y, color, this.isBoss ? 24 : 8);

        // Ẩn bóng đổ ngay khi chết
        if (this.shadow) this.shadow.setVisible(false);

        // "Poof" co nhỏ: vẽ trên một sprite tách rời để không trì hoãn disableBody
        // (va chạm phải dừng tức thì). Bỏ qua với bẫy/orb để gọn.
        if (this.enemyType !== 'crystal_spike' && this.enemyType !== 'lich_orb' && this.scene.textures.exists(this.texture.key)) {
            const poof = this.scene.add.sprite(this.x, this.y, this.texture.key);
            poof.setScale(this.scaleX, this.scaleY);
            poof.setFlipX(this.flipX);
            poof.setDepth(this.depth);
            poof.setTint(0xffffff);
            this.scene.tweens.add({
                targets: poof,
                scaleX: this.baseScale * 1.35,
                scaleY: this.baseScale * 0.2,
                alpha: 0,
                duration: 180,
                ease: 'Quad.easeOut',
                onComplete: () => poof.destroy()
            });
        }

        const playScene = this.scene as any;

        if (this.isBoss) {
            // Rơi cực nhiều tài nguyên khi diệt Boss
            for (let i = 0; i < 8; i++) {
                playScene.spawnCollectible(this.x + Phaser.Math.Between(-30, 30), this.y + Phaser.Math.Between(-30, 30), 'gold');
            }
            playScene.spawnCollectible(this.x, this.y, 'heart');
            
            for (let i = 0; i < 5; i++) {
                playScene.spawnCollectible(this.x + Phaser.Math.Between(-30, 30), this.y + Phaser.Math.Between(-30, 30), 'xp');
            }
            
            // Cơ hội rơi vật phẩm đặc biệt siêu hiếm
            const randItem = Math.random();
            if (randItem < 0.3) {
                playScene.spawnCollectible(this.x + 20, this.y, 'shield_item');
            } else if (randItem < 0.6) {
                playScene.spawnCollectible(this.x - 20, this.y, 'double_xp');
            }

            playScene.spawnPortal(this.x, this.y);
            playScene.showToastMessage("BOSS DEFEATED! Portal is open!");
        } else {
            // Logic rơi tài nguyên quái thường
            if (this.enemyType === 'thief_goblin') {
                // Yêu tinh trộm trả x2 tài nguyên đã ăn cắp
                const extraGold = (this.goldStolen || 0) * 2 + 3;
                const extraXp = (this.xpStolen || 0) * 2 + 15;
                for (let i = 0; i < extraGold; i++) {
                    playScene.spawnCollectible(this.x + Phaser.Math.Between(-15, 15), this.y + Phaser.Math.Between(-15, 15), 'gold');
                }
                const xpCount = Math.ceil(extraXp / 15);
                for (let i = 0; i < xpCount; i++) {
                    playScene.spawnCollectible(this.x + Phaser.Math.Between(-15, 15), this.y + Phaser.Math.Between(-15, 15), 'xp');
                }
                playScene.showToastMessage("⚡ THIEF GOBLIN DEFEATED! Received x2 resources!");
            } 
            else if (this.enemyType === 'crystal_spike' || this.enemyType === 'lich_orb') {
                // Cạm bẫy hoặc orb xoay quanh không rơi vật phẩm
            }
            else {
                // Tỷ lệ rớt đồ bình thường, khóa các vật phẩm nâng cao theo Stage để đa dạng dần
                const rand = Math.random();
                const stagePenalty = Math.max(0.3, 1 - (playScene.stage - 1) * 0.18); // Khó rớt hơn ở màn sau
                
                if (rand < 0.25 * stagePenalty) {
                    playScene.spawnCollectible(this.x, this.y, 'gold');
                } else if (rand < 0.75) {
                    playScene.spawnCollectible(this.x, this.y, 'xp');
                } else if (rand < 0.85 * stagePenalty) {
                    playScene.spawnCollectible(this.x, this.y, 'heart');
                } else {
                    // Các vật phẩm nâng cao mở khóa theo vòng đấu
                    const advancedItems: ('magnet' | 'shield_item' | 'freeze_item' | 'bomb_item' | 'double_xp')[] = [];
                    if (playScene.stage >= 2) {
                        advancedItems.push('magnet', 'double_xp');
                    }
                    if (playScene.stage >= 3) {
                        advancedItems.push('shield_item', 'freeze_item', 'bomb_item');
                    }
                    
                    if (advancedItems.length > 0) {
                        const randomItem = Phaser.Utils.Array.GetRandom(advancedItems);
                        playScene.spawnCollectible(this.x, this.y, randomItem);
                    } else {
                        // Nếu chưa mở khóa món nào (ở Stage 1), rơi thêm xp
                        playScene.spawnCollectible(this.x, this.y, 'xp');
                    }
                }
            }
        }

        if (this.enemyType !== 'crystal_spike' && this.enemyType !== 'lich_orb') {
            playScene.killsCount++;
            playScene.updateUIBridgePlay();
        }

        this.disableBody(true, true);
    }
}
