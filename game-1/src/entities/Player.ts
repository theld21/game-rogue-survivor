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
        this.baseScale = 0.5;
        this.setScale(this.baseScale);

        if (this.body) {
            // Thiết lập vòng tròn vật lý tương ứng (được phóng to gấp đôi trên hình gốc)
            (this.body as Phaser.Physics.Arcade.Body).setCircle(36, 12, 12);
        }

        this.setCollideWorldBounds(true);

        // Bóng đổ mềm dưới chân để tăng chiều sâu (rẻ, theo nhân vật trong update)
        // Sprite ở depth 3, bóng ở depth 2 (trên lưới nền depth 0, dưới nhân vật).
        this.setDepth(3);
        this.shadow = scene.add.ellipse(x, y + 22, 44, 16, 0x000000, 0.25);
        this.shadow.setDepth(2);

        // Pop-in xuất hiện, sau đó bắt đầu nhịp thở nhẹ (chibi sống động)
        this.setScale(0);
        scene.tweens.add({
            targets: this,
            scale: this.baseScale,
            duration: 280,
            ease: 'Back.easeOut',
            onComplete: () => {
                if (!this.active) return;
                scene.tweens.add({
                    targets: this,
                    scaleY: this.baseScale * 1.06,
                    scaleX: this.baseScale * 0.97,
                    duration: 620,
                    yoyo: true,
                    repeat: -1,
                    ease: 'Sine.easeInOut'
                });
            }
        });
    }

    public baseScale: number = 0.5;
    public shadow!: Phaser.GameObjects.Ellipse;

    public updateMovement(joystickActive: boolean, vector: { x: number; y: number }): void {
        if (joystickActive && this.body) {
            const vx = vector.x * this.moveSpeed;
            const vy = vector.y * this.moveSpeed;
            (this.body as Phaser.Physics.Arcade.Body).setVelocity(vx, vy);

            // Chibi: giữ thẳng đứng, chỉ lật trái/phải để mặt luôn đọc đúng
            // (ngắm bắn dùng vector hướng riêng trong PlayScene, không phụ thuộc rotation)
            if (Math.abs(vector.x) > 0.05) {
                this.setFlipX(vector.x < 0);
            }
        } else if (this.body) {
            (this.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
        }

        // Bóng đổ bám theo chân nhân vật
        if (this.shadow) {
            this.shadow.setPosition(this.x, this.y + 22);
        }
    }

    public destroy(fromScene?: boolean): void {
        if (this.shadow) this.shadow.destroy();
        super.destroy(fromScene);
    }
}
