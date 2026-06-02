import { Enemy } from './Enemy';
import { Player } from './Player';

export interface EnemyBehavior {
    update(enemy: Enemy, time: number, delta: number, player: Player, distanceToPlayer: number): void;
}
