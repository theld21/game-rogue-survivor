import { EnemyBehavior } from '../EnemyBehavior';
import { Enemy } from '../Enemy';
import { Player } from '../Player';
import Phaser from 'phaser';

export class FireDemonBehavior implements EnemyBehavior {
    public update(enemy: Enemy, time: number, delta: number, player: Player, distance: number): void {
        const playScene = enemy.scene as any;

        playScene.physics.moveToObject(enemy, player, enemy.speed);

        if (time - enemy.lastActionTime > 4000) {
            enemy.lastActionTime = time;
            enemy.setTint(0xff5500);

            enemy.scene.time.delayedCall(500, () => {
                if (enemy.active) {
                    enemy.clearTint();
                    enemy.setTint(0xffaa00);

                    for (let i = 0; i < 8; i++) {
                        const angle = i * 45;
                        playScene.spawnEnemyBullet(enemy.x, enemy.y, angle, 160, 22, 'boss_fire', 1.3);
                    }
                    if (enemy.scene && enemy.scene.cameras && enemy.scene.cameras.main) {
                        enemy.scene.cameras.main.shake(200, 0.007);
                    }
                }
            });
        }
    }
}
