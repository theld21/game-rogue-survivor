import { EnemyBehavior } from '../EnemyBehavior';
import { Enemy } from '../Enemy';
import { Player } from '../Player';
import Phaser from 'phaser';

export class SlimeBehavior implements EnemyBehavior {
    public update(enemy: Enemy, time: number, delta: number, player: Player, distance: number): void {
        const playScene = enemy.scene as any;

        if (enemy.aiState === 'chase') {
            playScene.physics.moveToObject(enemy, player, enemy.speed);
            if (playScene.stage >= 2 && time - enemy.lastActionTime > 2800 && distance < 200) {
                enemy.aiState = 'leap_prep';
                enemy.lastActionTime = time;
                (enemy.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
                enemy.setTint(0xffaa55);
                
                enemy.telegraphCircle = enemy.scene.add.circle(enemy.x, enemy.y, 40, 0xff0000, 0.25);
                enemy.telegraphCircle.setStrokeStyle(1.5, 0xff0000, 0.7);
                enemy.telegraphCircle.setDepth(5);
            }
        } else if (enemy.aiState === 'leap_prep') {
            enemy.scaleY = 0.65;
            if (enemy.telegraphCircle) {
                enemy.telegraphCircle.setPosition(enemy.x, enemy.y);
            }

            if (time - enemy.lastActionTime > 400) {
                enemy.aiState = 'leaping';
                enemy.lastActionTime = time;
                enemy.clearTint();
                if (enemy.telegraphCircle) {
                    enemy.telegraphCircle.destroy();
                    enemy.telegraphCircle = undefined;
                }

                const angle = Phaser.Math.Angle.Between(enemy.x, enemy.y, player.x, player.y);
                if (enemy.body) {
                    enemy.scene.physics.velocityFromRotation(angle, enemy.speed * 3.0, (enemy.body as Phaser.Physics.Arcade.Body).velocity);
                }
            }
        } else if (enemy.aiState === 'leaping') {
            enemy.scaleY = 1.3;
            if (time - enemy.lastActionTime > 500) {
                enemy.aiState = 'chase';
                enemy.lastActionTime = time;
            }
        }
    }
}
