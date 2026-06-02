import { EnemyBehavior } from '../EnemyBehavior';
import { Enemy } from '../Enemy';
import { Player } from '../Player';
import Phaser from 'phaser';

export class GhostBehavior implements EnemyBehavior {
    public update(enemy: Enemy, time: number, delta: number, player: Player, distance: number): void {
        if (time > enemy.nextWanderChangeTime) {
            enemy.wanderAngle = Phaser.Math.FloatBetween(0, Math.PI * 2);
            enemy.nextWanderChangeTime = time + Phaser.Math.Between(2000, 4500);
        }
        const perp = enemy.wanderAngle + Math.PI / 2;
        const sineWave = Math.sin(time / 180) * 1.5;
        
        if (enemy.body) {
            const body = enemy.body as Phaser.Physics.Arcade.Body;
            enemy.scene.physics.velocityFromRotation(enemy.wanderAngle, enemy.speed * 0.8, body.velocity);
            body.velocity.x += Math.cos(perp) * sineWave * 50;
            body.velocity.y += Math.sin(perp) * sineWave * 50;
        }
    }
}
