// ==========================================
// THỰC THỂ NHÂN VẬT CHÍNH (PLAYER ENTITY)
// ==========================================

import Phaser from 'phaser';

export class Player extends Phaser.Physics.Arcade.Sprite {
    public hp: number;
    public maxHp: number;
    public moveSpeed: number;
    public level: number;
    public xp: number;
    public xpToNextLevel: number;
    public charType: 'knight' | 'mage' | 'ranger';

    constructor(
        scene: Phaser.Scene,
        x: number,
        y: number,
        charType: 'knight' | 'mage' | 'ranger',
        maxHp: number,
        speed: number
    ) {
        const textureKey = `char_${charType}`;
        super(scene, x, y, textureKey);
        
        scene.add.existing(this);
        scene.physics.add.existing(this);
        
        this.charType = charType;
        this.maxHp = maxHp;
        this.hp = maxHp;
        this.moveSpeed = speed;
        
        this.level = 1;
        this.xp = 0;
        this.xpToNextLevel = 100;

        // Đặt tỉ lệ 0.5x cho texture độ phân giải cao vẽ nét mịn không bị vỡ hình
        this.setScale(0.5);

        if (this.body) {
            // Thiết lập vòng tròn vật lý tương ứng (được phóng to gấp đôi trên hình gốc)
            (this.body as Phaser.Physics.Arcade.Body).setCircle(36, 12, 12);
        }
        
        this.setCollideWorldBounds(true);
    }

    public updateMovement(joystickActive: boolean, vector: { x: number; y: number }): void {
        if (joystickActive && this.body) {
            const vx = vector.x * this.moveSpeed;
            const vy = vector.y * this.moveSpeed;
            (this.body as Phaser.Physics.Arcade.Body).setVelocity(vx, vy);
            
            const angle = Math.atan2(vector.y, vector.x);
            this.setRotation(angle);
        } else if (this.body) {
            (this.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
        }
    }
}
