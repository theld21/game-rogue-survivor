import { EnemyBehavior } from '../EnemyBehavior';
import { Enemy } from '../Enemy';
import { Player } from '../Player';
import Phaser from 'phaser';

export class CrystalDragonBehavior implements EnemyBehavior {
    public update(enemy: Enemy, time: number, delta: number, player: Player, distance: number): void {
        const playScene = enemy.scene as any;
        const baseScale = 0.925; // Rồng to hơn

        if (enemy.aiState === 'chase') {
            playScene.physics.moveToObject(enemy, player, enemy.speed);
            // Nhảy đập tàn bạo
            if (time - enemy.lastActionTime > 5000 && distance < 320) {
                enemy.aiState = 'leap_prep';
                enemy.lastActionTime = time;
                (enemy.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
                enemy.setTint(0x22e3ff); // Phát quang lam
                
                // Telegraph vòng đỏ lớn
                enemy.telegraphCircle = enemy.scene.add.circle(player.x, player.y, 80, 0x22e3ff, 0.2);
                enemy.telegraphCircle.setStrokeStyle(2, 0x22e3ff, 0.8);
                enemy.telegraphCircle.setDepth(5);
                enemy.wanderAngle = player.x; // Lưu tọa độ đích nhảy
                enemy.nextWanderChangeTime = player.y;
            }
        } else if (enemy.aiState === 'leap_prep') {
            // Hiệu ứng "prepare bounce" (squash: co bóp dẹt người lại chuẩn bị nhảy)
            const elapsed = time - enemy.lastActionTime;
            const ratio = Math.min(1.0, elapsed / 700);
            enemy.scaleX = (1.25 - ratio * 0.25) * baseScale;
            enemy.scaleY = (0.5 + ratio * 0.5) * baseScale;

            if (elapsed > 700) {
                enemy.aiState = 'leaping';
                enemy.lastActionTime = time;
                
                enemy.startX = enemy.x;
                enemy.startY = enemy.y;
                
                enemy.clearTint();
                enemy.setTint(0xffaa00);
                
                if (enemy.telegraphCircle) {
                    enemy.telegraphCircle.destroy();
                    enemy.telegraphCircle = undefined;
                }

                // Hiện mờ mờ trước bóng ma boss sẽ tiếp đất ở đâu
                enemy.ghostLandIndicator = enemy.scene.add.sprite(enemy.wanderAngle, enemy.nextWanderChangeTime, enemy.texture.key);
                enemy.ghostLandIndicator.setScale(baseScale);
                enemy.ghostLandIndicator.setAlpha(0.35);
                enemy.ghostLandIndicator.setTint(0xff3b30);
                enemy.ghostLandIndicator.setDepth(4);
            }
        } else if (enemy.aiState === 'leaping') {
            const elapsed = time - enemy.lastActionTime;
            const duration = 600; // Leap duration
            const ratio = Math.min(1.0, elapsed / duration);
            
            // Di chuyển parabol
            const currentX = enemy.startX + (enemy.wanderAngle - enemy.startX) * ratio;
            const jumpHeight = Math.sin(ratio * Math.PI) * 160;
            const currentY = enemy.startY + (enemy.nextWanderChangeTime - enemy.startY) * ratio - jumpHeight;
            
            enemy.setPosition(currentX, currentY);
            
            // Hiệu ứng kéo giãn người khi nhảy lên (stretch)
            enemy.scaleX = (0.85 - Math.sin(ratio * Math.PI) * 0.25) * baseScale;
            enemy.scaleY = (1.2 + Math.sin(ratio * Math.PI) * 0.4) * baseScale;

            if (elapsed >= duration) {
                // Tiếp đất! Thực hiện hiệu ứng bounce tiếp đất
                enemy.aiState = 'chase';
                enemy.lastActionTime = time;
                
                enemy.x = enemy.wanderAngle;
                enemy.y = enemy.nextWanderChangeTime;
                
                if (enemy.ghostLandIndicator) {
                    enemy.ghostLandIndicator.destroy();
                    enemy.ghostLandIndicator = undefined;
                }
                
                // Rung màn hình cực mạnh
                if (enemy.scene && enemy.scene.cameras && enemy.scene.cameras.main) {
                    enemy.scene.cameras.main.shake(250, 0.012);
                }
                
                // Tạo 6 tinh thể cạm bẫy trên đất xung quanh vị trí rơi
                for (let i = 0; i < 6; i++) {
                    const ang = (Math.PI * 2 / 6) * i;
                    const rx = enemy.x + Math.cos(ang) * 65;
                    const ry = enemy.y + Math.sin(ang) * 65;
                    
                    const spike = playScene.enemiesGroup.get() as Enemy;
                    if (spike) {
                        spike.spawn(rx, ry, 'crystal_spike', 1.0, false);
                        spike.lifespanTimer = enemy.scene.time.delayedCall(5000, () => {
                            if (spike.active) spike.die();
                            spike.lifespanTimer = undefined;
                        });
                    }
                }
                
                // Tỏa đạn lửa tinh thể 8 hướng
                for (let i = 0; i < 8; i++) {
                    playScene.spawnEnemyBullet(enemy.x, enemy.y, i * 45, 180, 15, 'golem_rock', 1.25);
                }

                // Co dẹt tiếp đất (elastic bounce impact)
                enemy.scaleX = 1.4 * baseScale;
                enemy.scaleY = 0.5 * baseScale;
                
                enemy.scene.tweens.add({
                    targets: enemy,
                    scaleX: baseScale,
                    scaleY: baseScale,
                    duration: 300,
                    ease: 'Bounce.easeOut'
                });
            }
        }
    }
}
