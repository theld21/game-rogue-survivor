import { EnemyBehavior } from '../EnemyBehavior';
import { Enemy } from '../Enemy';
import { Player } from '../Player';
import Phaser from 'phaser';

export class GolemKingBehavior implements EnemyBehavior {
    public update(enemy: Enemy, time: number, delta: number, player: Player, distance: number): void {
        const playScene = enemy.scene as any;

        if (time - enemy.lastActionTime > 4000) {
            enemy.lastActionTime = time;
            (enemy.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
            enemy.setTint(0xff3b30);

            enemy.scene.time.delayedCall(500, () => {
                if (enemy.active && player.active) {
                    enemy.clearTint();
                    enemy.setTint(0xffaa00);

                    const mainAngle = Phaser.Math.Angle.Between(enemy.x, enemy.y, player.x, player.y);
                    const mainAngleDeg = Phaser.Math.RadToDeg(mainAngle);
                    
                    const spread = 20;
                    [mainAngleDeg - spread, mainAngleDeg, mainAngleDeg + spread].forEach(ang => {
                        playScene.spawnEnemyBullet(enemy.x, enemy.y, ang, 220, 18, 'boss_rock', 1.4);
                    });
                    if (enemy.scene && enemy.scene.cameras && enemy.scene.cameras.main) {
                        enemy.scene.cameras.main.shake(150, 0.006);
                    }
                }
            });
        } else {
            playScene.physics.moveToObject(enemy, player, enemy.speed);
        }
    }
}
