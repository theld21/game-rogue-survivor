import Phaser from 'phaser';
import { SplashScreen } from '@capacitor/splash-screen';
import EventBus from '../EventBus.ts';
import AudioManager from '../core/AudioManager.ts';
import Storage from '../core/Storage.ts';
import { setLang } from '../core/i18n.ts';

// =====================================================================
// BootScene.ts — Asset-free bootstrap.
//
// We ship zero images. Instead we paint a handful of small textures onto
// canvases at boot (cannonball glow, seamless ocean tiles) and inject them
// into Phaser's cache. We also hydrate the save profile and init audio.
// =====================================================================

export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  init(): void {
    try {
      SplashScreen.hide();
    } catch {
      // not in a Capacitor shell — fine on web
    }
    AudioManager.init();
  }

  preload(): void {
    this.buildTextures();

    EventBus.emit('load_progress', 0.4);

    // Hydrate persistent profile (async) before entering the menu.
    Storage.hydrate()
      .then((profile) => {
        // Apply persisted language + audio volumes
        setLang(profile.lang ?? 'vi');
        AudioManager.setMusicVolume(profile.musicVol ?? 0.55);
        AudioManager.setSfxVolume(profile.sfxVol ?? 0.85);
        EventBus.emit('load_progress', 1.0);
        EventBus.emit('lang_changed', profile.lang ?? 'vi');
        this.time.delayedCall(700, () => {
          EventBus.emit('load_complete');
          this.scene.start('MenuScene');
        });
      })
      .catch(() => {
        EventBus.emit('load_complete');
        this.scene.start('MenuScene');
      });
  }

  private buildTextures(): void {
    // --- Cannonball glow ('cball') ---
    const c = this.textures.createCanvas('cball', 16, 16);
    if (c) {
      const ctx = c.getContext();
      const grad = ctx.createRadialGradient(8, 8, 0, 8, 8, 8);
      grad.addColorStop(0, 'rgba(255,255,255,1)');
      grad.addColorStop(0.45, 'rgba(255,255,255,0.85)');
      grad.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 16, 16);
      c.refresh();
    }

    // --- Seamless foam tile ('ocean_tile', 256) ---
    const t = this.textures.createCanvas('ocean_tile', 256, 256);
    if (t) {
      const ctx = t.getContext();
      ctx.clearRect(0, 0, 256, 256);
      // faint foam ticks
      ctx.strokeStyle = 'rgba(127,240,255,0.10)';
      ctx.lineWidth = 2;
      for (let i = 0; i < 26; i++) {
        const x = Math.random() * 256;
        const y = Math.random() * 256;
        const len = 10 + Math.random() * 22;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.quadraticCurveTo(x + len / 2, y - 4, x + len, y);
        ctx.stroke();
      }
      // sparkles
      ctx.fillStyle = 'rgba(180,250,255,0.12)';
      for (let i = 0; i < 40; i++) {
        ctx.beginPath();
        ctx.arc(Math.random() * 256, Math.random() * 256, Math.random() * 1.4 + 0.4, 0, Math.PI * 2);
        ctx.fill();
      }
      t.refresh();
    }

    // --- Big swell tile ('ocean_swell', 512) ---
    const s = this.textures.createCanvas('ocean_swell', 512, 512);
    if (s) {
      const ctx = s.getContext();
      ctx.clearRect(0, 0, 512, 512);
      ctx.strokeStyle = 'rgba(10,58,92,0.55)';
      ctx.lineWidth = 26;
      for (let i = -1; i < 6; i++) {
        const y = i * 96 + 40;
        ctx.beginPath();
        ctx.moveTo(0, y);
        for (let x = 0; x <= 512; x += 64) {
          ctx.lineTo(x, y + Math.sin(x / 80) * 22);
        }
        ctx.stroke();
      }
      s.refresh();
    }
  }
}

export default BootScene;
