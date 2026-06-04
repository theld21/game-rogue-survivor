import Phaser from 'phaser';
import { SplashScreen } from '@capacitor/splash-screen';
import EventBus from '../EventBus.ts';
import GameState from '../core/GameState.ts';
import AudioManager from '../core/AudioManager.ts';

export class Preloader extends Phaser.Scene {
  constructor() { super('Preloader'); }
  init(): void { try { SplashScreen.hide(); } catch { /* web */ } AudioManager.init(); }
  preload(): void {
    const c = this.textures.createCanvas('spark', 16, 16);
    if (c) {
      const ctx = c.getContext();
      const grad = ctx.createRadialGradient(8, 8, 0, 8, 8, 8);
      grad.addColorStop(0, 'rgba(255,255,255,1)'); grad.addColorStop(0.4, 'rgba(255,255,255,0.85)'); grad.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = grad; ctx.fillRect(0, 0, 16, 16); c.refresh();
    }
    EventBus.emit('load_progress', 0.5);
    GameState.hydrate()
      .then((p) => {
        AudioManager.setMusicVolume(p.musicVol ?? 0.5); AudioManager.setSfxVolume(p.sfxVol ?? 0.8);
        EventBus.emit('load_progress', 1.0);
        this.time.delayedCall(450, () => { EventBus.emit('load_complete'); this.scene.start('Menu'); });
      })
      .catch(() => { EventBus.emit('load_complete'); this.scene.start('Menu'); });
  }
}
export default Preloader;
