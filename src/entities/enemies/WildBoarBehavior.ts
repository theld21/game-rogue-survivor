import { EnemyBehavior } from '../EnemyBehavior';
import { Enemy } from '../Enemy';
import { Player } from '../Player';
import Phaser from 'phaser';

export class WildBoarBehavior implements EnemyBehavior {
    public update(enemy: Enemy, time: number, delta: number, player: Player, distance: number): void {
        const playScene = enemy.scene as any;

        if (enemy.aiState === 'chase') {
            // Đi dạo tự do
            if (time > enemy.nextWanderChangeTime) {
                enemy.wanderAngle = Phaser.Math.FloatBetween(0, Math.PI * 2);
                enemy.nextWanderChangeTime = time + Phaser.Math.Between(1200, 2500);
            }
            if (enemy.body) {
                enemy.scene.physics.velocityFromRotation(enemy.wanderAngle, enemy.speed * 0.5, (enemy.body as Phaser.Physics.Arcade.Body).velocity);
            }

            // Cảnh báo húc thẳng
            if (time - enemy.lastActionTime > 3200 && distance < 240) {
                enemy.aiState = 'charge_prep';
                enemy.lastActionTime = time;
                (enemy.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
                enemy.setTint(0xff3300);
                enemy.wanderAngle = Phaser.Math.Angle.Between(enemy.x, enemy.y, player.x, player.y);
            }
        } else if (enemy.aiState === 'charge_prep') {
            if (time - enemy.lastActionTime > 600) {
                enemy.aiState = 'charging';
                enemy.lastActionTime = time;
                enemy.clearTint();
            }
        } else if (enemy.aiState === 'charging') {
            if (enemy.body) {
                enemy.scene.physics.velocityFromRotation(enemy.wanderAngle, enemy.speed * 3.2, (enemy.body as Phaser.Physics.Arcade.Body).velocity);
            }
            if (time - enemy.lastActionTime > 900) {
                enemy.aiState = 'chase';
                enemy.lastActionTime = time;
            }
        }
    }
}
