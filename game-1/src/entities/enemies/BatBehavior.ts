import { EnemyBehavior } from '../EnemyBehavior';
import { Enemy } from '../Enemy';
import { Player } from '../Player';
import Phaser from 'phaser';

export class BatBehavior implements EnemyBehavior {
    public update(enemy: Enemy, time: number, delta: number, player: Player, distance: number): void {
        const playScene = enemy.scene as any;

        if (enemy.aiState === 'chase') {
            playScene.physics.moveToObject(enemy, player, enemy.speed);
            if (distance > 180) {
                enemy.aiState = 'wander';
            }
        } else if (enemy.aiState === 'wander') {
            if (time > enemy.nextWanderChangeTime) {
                enemy.wanderAngle = Phaser.Math.FloatBetween(0, Math.PI * 2);
                enemy.nextWanderChangeTime = time + Phaser.Math.Between(1500, 3000);
            }
            if (enemy.body) {
                enemy.scene.physics.velocityFromRotation(enemy.wanderAngle, enemy.speed * 0.75, (enemy.body as Phaser.Physics.Arcade.Body).velocity);
            }
            if (distance < 140) {
                enemy.aiState = 'chase';
            }
        }
    }
}
