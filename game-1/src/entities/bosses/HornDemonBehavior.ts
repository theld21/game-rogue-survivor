import { EnemyBehavior } from '../EnemyBehavior';
import { Enemy } from '../Enemy';
import { Player } from '../Player';
import Phaser from 'phaser';

export class HornDemonBehavior implements EnemyBehavior {
    public update(enemy: Enemy, time: number, delta: number, player: Player, distance: number): void {
        const playScene = enemy.scene as any;

        if (enemy.aiState === 'chase') {
            playScene.physics.moveToObject(enemy, player, enemy.speed);
            // Thi thoảng lao thẳng vào Player
            if (time - enemy.lastActionTime > 3800 && distance < 260) {
                enemy.aiState = 'charge_prep';
                enemy.lastActionTime = time;
                (enemy.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
                enemy.setTint(0xff7700);
                enemy.wanderAngle = Phaser.Math.Angle.Between(enemy.x, enemy.y, player.x, player.y);
            }
        } else if (enemy.aiState === 'charge_prep') {
            if (time - enemy.lastActionTime > 650) {
                enemy.aiState = 'charging';
                enemy.lastActionTime = time;
                enemy.clearTint();
                enemy.setTint(0xffaa00);
            }
        } else if (enemy.aiState === 'charging') {
            if (enemy.body) {
                enemy.scene.physics.velocityFromRotation(enemy.wanderAngle, enemy.speed * 3.5, (enemy.body as Phaser.Physics.Arcade.Body).velocity);
            }
            if (time - enemy.lastActionTime > 700) {
                // Hết càn quét, ném thiên lôi giáng xuống người chơi
                enemy.aiState = 'chase';
                enemy.lastActionTime = time;
                
                // Giáng sấm sét xung quanh người chơi
                for (let i = 0; i < 3; i++) {
                    const sx = player.x + Phaser.Math.Between(-60, 60);
                    const sy = player.y + Phaser.Math.Between(-60, 60);
                    playScene.time.delayedCall(i * 200, () => {
                        if (playScene.player && playScene.player.active) {
                            // Sét đồ họa vẽ nhanh
                            const g = playScene.add.graphics();
                            g.lineStyle(2, 0xffd700, 1);
                            g.beginPath();
                            g.moveTo(sx, -20);
                            g.lineTo(sx + 15, player.y / 2);
                            g.lineTo(sx - 10, sy);
                            g.strokePath();
                            if (playScene.cameras && playScene.cameras.main) {
                                playScene.cameras.main.flash(30, 255, 220, 0);
                            }
                            playScene.tweens.add({
                                targets: g, alpha: 0, duration: 150, onComplete: () => {
                                    g.destroy();
                                    // Gây sát thương nếu Player đứng gần cột sét giáng
                                    const dist = Phaser.Math.Distance.Between(playScene.player.x, playScene.player.y, sx, sy);
                                    if (dist < 35) {
                                        playScene.hp = Math.max(0, playScene.hp - 12);
                                        playScene.updatePlayerHpBridge();
                                    }
                                }
                            });
                        }
                    });
                }
            }
        }
    }
}
