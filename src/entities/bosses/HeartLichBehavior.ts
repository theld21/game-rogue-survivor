import { EnemyBehavior } from '../EnemyBehavior';
import { Enemy } from '../Enemy';
import { Player } from '../Player';
import Phaser from 'phaser';

export class HeartLichBehavior implements EnemyBehavior {
    public update(enemy: Enemy, time: number, delta: number, player: Player, distance: number): void {
        const playScene = enemy.scene as any;

        playScene.physics.moveToObject(enemy, player, enemy.speed * 0.85);

        // Triệu hồi giáp ngọc bảo vệ nếu chưa có
        const shieldOrbs = playScene.enemiesGroup.getChildren().filter((e: any) => e.active && e.enemyType === 'lich_orb' && e.bossParent === enemy);
        if (shieldOrbs.length === 0 && time - enemy.lastActionTime > 8000) {
            enemy.lastActionTime = time;
            enemy.isShieldActive = true;
            enemy.setTint(0xff00ff); // Màu giáp bảo hộ tím violet
            playScene.showToastMessage("BOSS ACTIVATED DARK SHIELD! DESTROY 3 ORBS FIRST!");

            for (let i = 0; i < 3; i++) {
                const orb = playScene.enemiesGroup.get() as Enemy;
                if (orb) {
                    orb.spawn(enemy.x, enemy.y, 'lich_orb', enemy.maxHp * 0.08 / 80, false);
                    orb.bossParent = enemy;
                    orb.orbitAngle = (Math.PI * 2 / 3) * i;
                }
            }
        }

        // Kiểm tra số lượng orb bảo vệ còn lại
        const currentShieldOrbs = playScene.enemiesGroup.getChildren().filter((e: any) => e.active && e.enemyType === 'lich_orb' && e.bossParent === enemy);
        if (currentShieldOrbs.length === 0 && enemy.isShieldActive) {
            enemy.isShieldActive = false;
            enemy.clearTint();
            enemy.setTint(0xffea00);
            playScene.showToastMessage("BOSS SHIELD BROKEN! STUNNED!");
            
            // Choáng đứng yên 4 giây
            const prevSpeed = enemy.speed;
            enemy.speed = 0;
            if (enemy.body) (enemy.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
            
            enemy.scene.time.delayedCall(4000, () => {
                if (enemy.active) {
                    enemy.speed = prevSpeed;
                }
            });
        }

        // Tấn công phụ bắn vòng tròn đạn tối
        if (time - enemy.lastLichFireTime > 2200) {
            enemy.lastLichFireTime = time;
            const angle = Phaser.Math.Angle.Between(enemy.x, enemy.y, player.x, player.y);
            const angleDeg = Phaser.Math.RadToDeg(angle);
            playScene.spawnEnemyBullet(enemy.x, enemy.y, angleDeg, 160, 10, 'boss_fire', 1.0);
        }
    }
}
