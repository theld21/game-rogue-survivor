import { EnemyBehavior } from '../EnemyBehavior';
import { Enemy } from '../Enemy';
import { Player } from '../Player';
import Phaser from 'phaser';

export class LichOrbBehavior implements EnemyBehavior {
    public update(enemy: Enemy, time: number, delta: number, player: Player, distance: number): void {
        if (enemy.bossParent && enemy.bossParent.active) {
            enemy.orbitAngle += 0.045;
            const radius = 55;
            enemy.x = enemy.bossParent.x + Math.cos(enemy.orbitAngle) * radius;
            enemy.y = enemy.bossParent.y + Math.sin(enemy.orbitAngle) * radius;
        } else {
            enemy.die();
        }
    }
}
