import Phaser from 'phaser';

export class Joystick {
    private scene: Phaser.Scene;
    private base!: Phaser.GameObjects.Arc;
    private handle!: Phaser.GameObjects.Arc;
    private active: boolean = false;
    private startPos = { x: 0, y: 0 };
    private vector = { x: 0, y: 0 };
    private zoomVal: number = 1.0;

    constructor(scene: Phaser.Scene, zoomVal: number) {
        this.scene = scene;
        this.zoomVal = zoomVal;
        this.create();
    }

    private create(): void {
        this.base = this.scene.add.circle(0, 0, 60, 0xffffff, 0.14).setVisible(false);
        this.handle = this.scene.add.circle(0, 0, 30, 0xffffff, 0.35).setVisible(false);
        this.base.setStrokeStyle(3, 0xffffff, 0.2);
        this.base.setDepth(200);
        this.handle.setDepth(201);

        this.base.setScrollFactor(0);
        this.handle.setScrollFactor(0);
        this.base.setScale(1 / this.zoomVal);
        this.handle.setScale(1 / this.zoomVal);

        this.scene.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
            const sceneAsAny = this.scene as any;
            if (sceneAsAny.isLevelUpOpen || sceneAsAny.isPaused || sceneAsAny.isGameOver) return;
            
            if (pointer.y > this.scene.cameras.main.height * 0.45) {
                this.active = true;
                const pos = this.screenToViewport(pointer.x, pointer.y);
                this.startPos.x = pos.x;
                this.startPos.y = pos.y;
                this.base.setPosition(pos.x, pos.y).setVisible(true);
                this.handle.setPosition(pos.x, pos.y).setVisible(true);
            }
        });

        this.scene.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
            if (!this.active) return;

            const pos = this.screenToViewport(pointer.x, pointer.y);
            const dx = pos.x - this.startPos.x;
            const dy = pos.y - this.startPos.y;
            const d = Math.sqrt(dx * dx + dy * dy);
            const limit = 60 / this.zoomVal;

            if (d > limit) {
                const angle = Math.atan2(dy, dx);
                this.handle.setPosition(
                    this.startPos.x + Math.cos(angle) * limit,
                    this.startPos.y + Math.sin(angle) * limit
                );
                this.vector.x = Math.cos(angle);
                this.vector.y = Math.sin(angle);
            } else {
                this.handle.setPosition(pos.x, pos.y);
                this.vector.x = dx / limit;
                this.vector.y = dy / limit;
            }
        });

        this.scene.input.on('pointerup', () => {
            this.active = false;
            this.base.setVisible(false);
            this.handle.setVisible(false);
        });
    }

    private screenToViewport(x: number, y: number): { x: number; y: number } {
        const camera = this.scene.cameras.main;
        const screenWidth = camera.width;
        const screenHeight = camera.height;
        const vx = (x - screenWidth / 2) / this.zoomVal + screenWidth / 2;
        const vy = (y - screenHeight / 2) / this.zoomVal + screenHeight / 2;
        return { x: vx, y: vy };
    }

    public updateZoom(zoomVal: number): void {
        this.zoomVal = zoomVal;
        if (this.base && this.handle) {
            this.base.setScale(1 / zoomVal);
            this.handle.setScale(1 / zoomVal);
        }
    }

    public isActive(): boolean {
        return this.active;
    }

    public getVector(): { x: number; y: number } {
        return this.vector;
    }

    public disable(): void {
        this.active = false;
        if (this.base) this.base.setVisible(false);
        if (this.handle) this.handle.setVisible(false);
    }

    public destroy(): void {
        if (this.base) this.base.destroy();
        if (this.handle) this.handle.destroy();
    }
}
