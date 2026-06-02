// ==========================================
// THỰC THỂ ĐẠN BẮN (BULLET ENTITY)
// ==========================================

import Phaser from 'phaser';

export class Bullet extends Phaser.Physics.Arcade.Sprite {
    public damage: number;
    public pierceCount: number;
    public hitEnemies: any[];
    private lifespanTimer?: Phaser.Time.TimerEvent;

    constructor(scene: Phaser.Scene, x: number, y: number) {
        super(scene, x, y, 'bullet_knight');
        
        scene.add.existing(this);
        scene.physics.add.existing(this);
        
        this.damage = 10;
        this.pierceCount = 1;
        this.hitEnemies = [];
    }

    public fire(
        x: number,
        y: number,
        angle: number,
        speed: number,
        dmg: number,
        textureKey: string,
        pierce: number = 1,
        lifespan: number = 3500
    ): void {
        if (this.lifespanTimer) {
            this.lifespanTimer.destroy();
            this.lifespanTimer = undefined;
        }

        this.enableBody(true, x, y, true, true);
        this.setTexture(textureKey);
        this.damage = dmg;
        this.pierceCount = pierce;
        this.hitEnemies = [];
        
        // Cài đặt vận tốc bay cho đạn
        if (this.body) {
            this.scene.physics.velocityFromAngle(angle, speed, this.body.velocity);
        }
        
        // Góc nghiêng xoay theo hướng bay
        this.setAngle(angle);

        // Tự động thu hồi sau thời gian lifespan
        this.lifespanTimer = this.scene.time.delayedCall(lifespan, () => {
            if (this.active) {
                this.deactivate();
            }
        });
    }

    public deactivate(): void {
        if (this.lifespanTimer) {
            this.lifespanTimer.destroy();
            this.lifespanTimer = undefined;
        }
        this.disableBody(true, true);
    }
}
