// ==========================================
// THỰC THỂ VẬT PHẨM RƠI (COLLECTIBLE ENTITY)
// ==========================================

import Phaser from 'phaser';

export class Collectible extends Phaser.Physics.Arcade.Sprite {
    public type: 'xp' | 'gold' | 'heart' | 'magnet' | 'shield_item' | 'freeze_item' | 'bomb_item' | 'double_xp' = 'xp';

    constructor(scene: Phaser.Scene, x: number, y: number) {
        super(scene, x, y, 'xp_texture');
        
        scene.add.existing(this);
        scene.physics.add.existing(this);
    }

    public spawn(x: number, y: number, type: 'xp' | 'gold' | 'heart' | 'magnet' | 'shield_item' | 'freeze_item' | 'bomb_item' | 'double_xp'): void {
        this.type = type;
        this.enableBody(true, x, y, true, true);
        this.setScale(1.0);

        // Đặt texture tương ứng
        if (type === 'gold') {
            this.setTexture('gold_texture');
        } else if (type === 'xp') {
            this.setTexture('xp_texture');
        } else if (type === 'heart') {
            this.setTexture('heart_texture');
        } else if (type === 'magnet') {
            this.setTexture('magnet_texture');
        } else if (type === 'shield_item') {
            this.setTexture('shield_item_texture');
        } else if (type === 'freeze_item') {
            this.setTexture('freeze_item_texture');
        } else if (type === 'bomb_item') {
            this.setTexture('bomb_item_texture');
        } else if (type === 'double_xp') {
            this.setTexture('double_xp_texture');
        }
        
        if (this.body) {
            (this.body as Phaser.Physics.Arcade.Body).setAngularVelocity(Phaser.Math.Between(20, 60)); // Tự quay lấp lánh
        }
    }

    public deactivate(): void {
        this.disableBody(true, true);
    }
}
