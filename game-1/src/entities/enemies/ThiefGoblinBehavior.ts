import { EnemyBehavior } from '../EnemyBehavior';
import { Enemy } from '../Enemy';
import { Player } from '../Player';
import Phaser from 'phaser';

export class ThiefGoblinBehavior implements EnemyBehavior {
    public update(enemy: Enemy, time: number, delta: number, player: Player, distance: number): void {
        const playScene = enemy.scene as any;

        // Đi tìm đồ trên đất gần nhất để lấy cắp
        let closestItem: any = null;
        let minDist = 280;

        playScene.collectiblesGroup.getChildren().forEach((item: any) => {
            if (item.active) {
                const d = Phaser.Math.Distance.Between(enemy.x, enemy.y, item.x, item.y);
                if (d < minDist) {
                    minDist = d;
                    closestItem = item;
                }
            }
        });

        if (closestItem) {
            playScene.physics.moveToObject(enemy, closestItem, enemy.speed);
            const dToItem = Phaser.Math.Distance.Between(enemy.x, enemy.y, closestItem.x, closestItem.y);
            if (dToItem < 18) {
                // Ăn mất tài nguyên
                if (closestItem.type === 'gold') enemy.goldStolen++;
                else if (closestItem.type === 'xp') enemy.xpStolen += 15;
                
                closestItem.deactivate();
                enemy.setScale(enemy.scaleX + 0.08); // To ra
                enemy.speed = Math.round(enemy.speed * 1.05); // Chạy nhanh hơn
                playScene.showFloatingText(enemy.x, enemy.y - 12, "💰 Loot!", "#ffaa00");
            }
        } else {
            // Nếu không có đồ thì chạy tránh xa người chơi
            const escapeAngle = Phaser.Math.Angle.Between(player.x, player.y, enemy.x, enemy.y);
            if (enemy.body) {
                enemy.scene.physics.velocityFromRotation(escapeAngle, enemy.speed * 0.85, (enemy.body as Phaser.Physics.Arcade.Body).velocity);
            }
        }
    }
}
