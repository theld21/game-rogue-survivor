// ==========================================
// SCENE MENU CHÍNH VÀ SHOP VĨNH VIỄN (MENU SCENE)
// ==========================================

import Phaser from 'phaser';
import { SAVE_KEYS, getSaveData, saveKeyData, getSaveString, saveString, GameState } from '../config';
import { UIBridge } from '../uiBridge';
import { SoundEffects } from '../utils/SoundEffects';

export class MenuScene extends Phaser.Scene {
    private totalGold!: number;
    private upgradeHpLvl!: number;
    private upgradeSpeedLvl!: number;
    private upgradeDamageLvl!: number;
    private starsList: Phaser.GameObjects.Arc[] = [];
    private currentView: 'intro' | 'menu' | 'shop' | 'settings' = 'intro';

    constructor() {
        super({ key: 'MenuScene' });
    }

    public preload(): void {
        this.load.audio('bgm_home', 'assets/home.mp3');
        this.load.audio('bgm_ingame', 'assets/ingame.mp3');
    }

    public create(): void {
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;

        // Dừng toàn bộ các instance nhạc cũ để tránh bị lặp đè lên nhau
        this.sound.stopByKey('bgm_ingame');
        this.sound.stopByKey('bgm_home');

        // Bắt đầu phát luồng nhạc mới
        const vol = getSaveData('survivor_bgm_volume', 80) / 100;
        this.sound.play('bgm_home', { loop: true, volume: vol });

        // Tải dữ liệu lưu trữ
        this.totalGold = getSaveData(SAVE_KEYS.GOLD, 0);
        this.upgradeHpLvl = getSaveData(SAVE_KEYS.UPGRADE_HP, 0);
        this.upgradeSpeedLvl = getSaveData(SAVE_KEYS.UPGRADE_SPEED, 0);
        this.upgradeDamageLvl = getSaveData(SAVE_KEYS.UPGRADE_DAMAGE, 0);

        // Đồng bộ GameState với localStorage
        GameState.selectedCharacter = getSaveString('survivor_selected_char', 'knight') as 'knight' | 'mage' | 'ranger';
        GameState.selectedSkin = getSaveString(SAVE_KEYS.SELECTED_SKIN, 'default');

        // Vẽ nền sao lấp lánh tĩnh trên canvas làm phông
        this.createCanvasStarsBackground(width, height);

        // Kiểm tra xem đã chọn hệ lần đầu chưa
        const hasChosen = getSaveData(SAVE_KEYS.FIRST_TIME_CHOSEN, 0);
        if (hasChosen === 1) {
            this.renderHTMLMenu();
        } else {
            this.showIntroModal();
        }

        // Lắng nghe sự thay đổi kích thước màn hình
        this.scale.on('resize', this.handleResize, this);

        // Dọn dẹp sự kiện resize toàn cục khi scene shutdown
        this.events.once('shutdown', () => {
            this.scale.off('resize', this.handleResize, this);
        });

        // Tắt màn hình Splash Screen Capacitor khi game đã khởi tạo xong và tạo hiệu ứng fade out cho Web Splash Screen
        const fadeOutFirstLoadScreen = () => {
            const firstLoad = document.getElementById('first-load-screen');
            if (firstLoad) {
                firstLoad.style.opacity = '0';
                setTimeout(() => {
                    firstLoad.remove();
                }, 500);
            }
        };

        try {
            import('@capacitor/splash-screen').then(({ SplashScreen }) => {
                SplashScreen.hide()
                    .then(() => {
                        fadeOutFirstLoadScreen();
                    })
                    .catch(err => {
                        console.log('SplashScreen.hide failed:', err);
                        fadeOutFirstLoadScreen();
                    });
            });
        } catch (e) {
            console.warn('Capacitor SplashScreen is not available in browser mode:', e);
            fadeOutFirstLoadScreen();
        }
    }

    private showIntroModal(): void {
        this.currentView = 'intro';
        UIBridge.showIntro((chosenChar) => {
            // Xác nhận chọn hệ
            GameState.selectedCharacter = chosenChar;
            saveString('survivor_selected_char', chosenChar);
            saveKeyData(SAVE_KEYS.FIRST_TIME_CHOSEN, 1);

            // Tự động mở khóa vĩnh viễn hệ đã chọn ban đầu
            if (chosenChar === 'mage') {
                saveKeyData(SAVE_KEYS.UNLOCKED_MAGE, 1);
            } else if (chosenChar === 'ranger') {
                saveKeyData(SAVE_KEYS.UNLOCKED_RANGER, 1);
            }

            if (this.cameras && this.cameras.main) {
                this.cameras.main.flash(400, 0, 255, 255);
            }

            // Chuyển sang render menu chính
            this.renderHTMLMenu();
        });
    }

    private renderHTMLMenu(): void {
        this.currentView = 'menu';
        // Cập nhật lại biến từ localStorage trước khi render
        this.totalGold = getSaveData(SAVE_KEYS.GOLD, 0);
        const selectedChar = getSaveString('survivor_selected_char', 'knight') as 'knight' | 'mage' | 'ranger';
        const heroName = getSaveString('survivor_hero_name', 'Hero');

        UIBridge.showMenu(
            this.totalGold,
            this.upgradeHpLvl,
            this.upgradeSpeedLvl,
            this.upgradeDamageLvl,
            selectedChar,
            heroName,
            // Callback khi nhấn nút Vào Trận
            () => {
                const homeBgm = this.sound.get('bgm_home');
                if (homeBgm && homeBgm.isPlaying) {
                    homeBgm.stop();
                }
                this.scene.start('PlayScene');
            },
            // Callback khi mở Cửa hàng
            () => {
                this.renderHTMLShop();
            },
            // Callback khi mở Cài đặt
            () => {
                this.renderHTMLSettings();
            }
        );
    }

    private renderHTMLShop(): void {
        this.currentView = 'shop';

        const selectedChar = getSaveString('survivor_selected_char', 'knight') as 'knight' | 'mage' | 'ranger';
        const classChangeCost = getSaveData('survivor_class_change_cost', 50);

        UIBridge.showShop(
            this.totalGold,
            this.upgradeHpLvl,
            this.upgradeSpeedLvl,
            this.upgradeDamageLvl,
            selectedChar,
            classChangeCost,
            // 1. Upgrade callback
            (type: 'hp' | 'speed' | 'damage') => {
                let cost = 0;
                let key = '';
                let currentLvl = 0;

                if (type === 'hp') {
                    currentLvl = this.upgradeHpLvl;
                    cost = 50 * (currentLvl + 1);
                    key = SAVE_KEYS.UPGRADE_HP;
                } else if (type === 'speed') {
                    currentLvl = this.upgradeSpeedLvl;
                    cost = 50 * (currentLvl + 1);
                    key = SAVE_KEYS.UPGRADE_SPEED;
                } else if (type === 'damage') {
                    currentLvl = this.upgradeDamageLvl;
                    cost = 50 * (currentLvl + 1);
                    key = SAVE_KEYS.UPGRADE_DAMAGE;
                }

                if (this.totalGold >= cost) {
                    this.totalGold -= cost;
                    currentLvl++;

                    saveKeyData(key, currentLvl);
                    saveKeyData(SAVE_KEYS.GOLD, this.totalGold);

                    if (type === 'hp') this.upgradeHpLvl = currentLvl;
                    else if (type === 'speed') this.upgradeSpeedLvl = currentLvl;
                    else if (type === 'damage') this.upgradeDamageLvl = currentLvl;

                    if (this.cameras && this.cameras.main) {
                        this.cameras.main.shake(100, 0.005);
                    }
                    this.renderHTMLShop();
                } else {
                    if (this.cameras && this.cameras.main) {
                        this.cameras.main.flash(100, 150, 0, 0);
                    }
                }
            },
            // 2. Class change callback
            (targetChar: 'knight' | 'mage' | 'ranger') => {
                const currentCost = getSaveData('survivor_class_change_cost', 50);
                if (this.totalGold >= currentCost) {
                    this.totalGold -= currentCost;
                    const nextCost = currentCost + 50;

                    // Update class, gold, and dynamic cost
                    GameState.selectedCharacter = targetChar;
                    saveString('survivor_selected_char', targetChar);
                    saveKeyData(SAVE_KEYS.GOLD, this.totalGold);
                    saveKeyData('survivor_class_change_cost', nextCost);

                    // Auto unlock just in case
                    if (targetChar === 'mage') {
                        saveKeyData(SAVE_KEYS.UNLOCKED_MAGE, 1);
                    } else if (targetChar === 'ranger') {
                        saveKeyData(SAVE_KEYS.UNLOCKED_RANGER, 1);
                    }

                    if (this.cameras && this.cameras.main) {
                        this.cameras.main.shake(100, 0.005);
                        this.cameras.main.flash(150, 0, 255, 255);
                    }
                    this.renderHTMLShop();
                } else {
                    if (this.cameras && this.cameras.main) {
                        this.cameras.main.flash(100, 150, 0, 0);
                    }
                    UIBridge.showNotification('Not enough gold!', 'error');
                }
            },
            // 3. Close Shop callback
            () => {
                this.renderHTMLMenu();
            }
        );
    }

    private renderHTMLSettings(): void {
        this.currentView = 'settings';
        const heroName = getSaveString('survivor_hero_name', 'Hero');
        const initialVol = getSaveData('survivor_bgm_volume', 80);
        const initialSfxVol = getSaveData('survivor_sfx_volume', 80);

        UIBridge.showSettings(
            heroName,
            initialVol,
            initialSfxVol,
            // onVolumeChange callback
            (vol: number) => {
                saveKeyData('survivor_bgm_volume', vol);
                const newVol = vol / 100;
                this.sound.volume = newVol;
                const homeBgm = this.sound.get('bgm_home');
                if (homeBgm) {
                    (homeBgm as any).volume = newVol;
                }
                // Nudge for iOS WKWebView immediate volume update
                const soundManager = this.sound as any;
                if (soundManager.context && typeof soundManager.context.suspend === 'function') {
                    const ctx = soundManager.context;
                    if (ctx.state === 'running') {
                        ctx.suspend().then(() => ctx.resume());
                    }
                }
            },
            // onSfxVolumeChange callback
            (vol: number) => {
                saveKeyData('survivor_sfx_volume', vol);
                SoundEffects.setVolume(vol);
            },
            // Save callback
            (newName: string) => {
                saveString('survivor_hero_name', newName);
                if (this.cameras && this.cameras.main) {
                    this.cameras.main.flash(150, 0, 255, 255);
                }
                this.renderHTMLMenu();
            },
            // Reset callback
            () => {
                localStorage.clear();
                UIBridge.showNotification('Deleted all game data!', 'success');
                window.location.reload();
            },
            // Close callback
            () => {
                this.renderHTMLMenu();
            }
        );
    }

    private handleResize(gameSize: Phaser.Structs.Size): void {
        if (!this.cameras || !this.cameras.main) return;
        // Vẽ lại phông nền sao khi xoay màn hình
        this.starsList.forEach(s => s.destroy());
        this.starsList = [];
        this.createCanvasStarsBackground(gameSize.width, gameSize.height);

        // Vẽ lại UI HTML theo màn hình hiện hành
        if (this.currentView === 'intro') {
            this.showIntroModal();
        } else if (this.currentView === 'shop') {
            this.renderHTMLShop();
        } else if (this.currentView === 'settings') {
            this.renderHTMLSettings();
        } else {
            this.renderHTMLMenu();
        }
    }

    private createCanvasStarsBackground(w: number, h: number): void {
        const bgGraphics = this.add.graphics();
        bgGraphics.fillGradientStyle(0x070414, 0x070414, 0x160f2b, 0x160f2b, 1);
        bgGraphics.fillRect(0, 0, w, h);

        // Vẽ 40 ngôi sao tĩnh nhấp nháy nhè nhẹ
        for (let i = 0; i < 40; i++) {
            const x = Phaser.Math.Between(0, w);
            const y = Phaser.Math.Between(0, h);
            const star = this.add.circle(
                x,
                y,
                Phaser.Math.FloatBetween(1, 2.5),
                0x00ffff,
                Phaser.Math.FloatBetween(0.2, 0.7)
            );
            this.starsList.push(star);

            this.tweens.add({
                targets: star,
                alpha: 0.1,
                duration: Phaser.Math.Between(1500, 3500),
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut'
            });
        }
    }
}
