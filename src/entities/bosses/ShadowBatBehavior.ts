import { EnemyBehavior } from '../EnemyBehavior';
import { Enemy } from '../Enemy';
import { Player } from '../Player';
import Phaser from 'phaser';

export class ShadowBatBehavior implements EnemyBehavior {
    public update(enemy: Enemy, time: number, delta: number, player: Player, distance: number): void {
        const playScene = enemy.scene as any;

        playScene.physics.moveToObject(enemy, player, enemy.speed);

        if (time - enemy.lastActionTime > 7000) {
            enemy.lastActionTime = time;
            playScene.showToastMessage("BOSS SUMMONED BAT MINIONS!");

            for (let i = 0; i < 2; i++) {
                const bx = enemy.x + (i === 0 ? -40 : 40);
                const by = enemy.y + 40;
                
                const minion = playScene.enemiesGroup.get() as Enemy;
                if (minion) {
                    minion.spawn(bx, by, 'bat', enemy.maxHp * 0.05 / 25, false); 
                    minion.speed = 185;
                }
            }
            if (enemy.scene && enemy.scene.cameras && enemy.scene.cameras.main) {
                enemy.scene.cameras.main.flash(100, 150, 0, 255);
            }
        }
    }
}
