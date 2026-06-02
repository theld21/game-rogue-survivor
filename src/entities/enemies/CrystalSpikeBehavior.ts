import { EnemyBehavior } from '../EnemyBehavior';
import { Enemy } from '../Enemy';
import { Player } from '../Player';
import Phaser from 'phaser';

export class CrystalSpikeBehavior implements EnemyBehavior {
    public update(enemy: Enemy, time: number, delta: number, player: Player, distance: number): void {
        if (enemy.body) {
            (enemy.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
        }
    }
}
