import { EnemyBehavior } from '../EnemyBehavior';
import { Enemy } from '../Enemy';
import { Player } from '../Player';
import Phaser from 'phaser';

export class GolemBehavior implements EnemyBehavior {
    public update(enemy: Enemy, time: number, delta: number, player: Player, distance: number): void {
        const playScene = enemy.scene as any;

        if (distance > 220) {
            playScene.physics.moveToObject(enemy, player, enemy.speed);
        } else {
            if (enemy.body) (enemy.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
            if (time - enemy.lastActionTime > 2500) {
                enemy.lastActionTime = time;
                
                const angle = Phaser.Math.Angle.Between(enemy.x, enemy.y, player.x, player.y);
                const angleDeg = Phaser.Math.RadToDeg(angle);
                
                playScene.spawnEnemyBullet(enemy.x, enemy.y, angleDeg, 200, 10, 'golem_rock');
                
                enemy.scene.tweens.add({
                    targets: enemy,
                    scaleX: enemy.scaleX * 2.5, // 1.25 when scale is 0.5
                    scaleY: enemy.scaleY * 2.5,
                    duration: 100,
                    yoyo: true
                });
            }
        }
    }
}
