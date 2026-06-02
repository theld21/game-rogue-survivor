// =========================================================
// TIỆN ÍCH TỔNG HỢP ÂM THANH GAMEPLAY (SOUND EFFECTS SYNTH)
// =========================================================

import { getSaveData, saveKeyData } from '../config';

export class SoundEffects {
    private static ctx: AudioContext | null = null;
    private static sfxVolume: number = -1;

    private static getContext(): AudioContext {
        if (!this.ctx) {
            this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        }
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
        return this.ctx;
    }

    public static getVolumeMultiplier(): number {
        if (this.sfxVolume < 0) {
            this.sfxVolume = getSaveData('survivor_sfx_volume', 80);
        }
        return this.sfxVolume / 100;
    }

    public static setVolume(vol: number): void {
        this.sfxVolume = vol;
        saveKeyData('survivor_sfx_volume', vol);
    }

    /**
     * Âm thanh bắn đạn (Pew pew)
     */
    public static playShoot(): void {
        try {
            const ctx = this.getContext();
            const now = ctx.currentTime;

            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = 'triangle';
            osc.frequency.setValueAtTime(450, now);
            osc.frequency.exponentialRampToValueAtTime(80, now + 0.12);

            const vol = 0.22 * this.getVolumeMultiplier();
            gain.gain.setValueAtTime(vol, now);
            gain.gain.exponentialRampToValueAtTime(Math.max(0.001, vol * 0.05), now + 0.12);

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.start(now);
            osc.stop(now + 0.12);
        } catch (e) {
            console.error('Audio error:', e);
        }
    }

    /**
     * Vụ nổ cầu lửa của Mage (Explosion)
     */
    public static playExplosion(): void {
        try {
            const ctx = this.getContext();
            const now = ctx.currentTime;

            // Tạo buffer tiếng ồn trắng (white noise)
            const bufferSize = ctx.sampleRate * 0.35; // 0.35 giây
            const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
                data[i] = Math.random() * 2 - 1;
            }

            const noise = ctx.createBufferSource();
            noise.buffer = buffer;

            // Lọc tần số thấp để có tiếng nổ trầm ấm
            const filter = ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(320, now);
            filter.frequency.exponentialRampToValueAtTime(12, now + 0.35);

            const gain = ctx.createGain();
            const vol = 0.45 * this.getVolumeMultiplier();
            gain.gain.setValueAtTime(vol, now);
            gain.gain.exponentialRampToValueAtTime(Math.max(0.001, vol * 0.05), now + 0.35);

            noise.connect(filter);
            filter.connect(gain);
            gain.connect(ctx.destination);

            noise.start(now);
            noise.stop(now + 0.35);
        } catch (e) {
            console.error('Audio error:', e);
        }
    }

    /**
     * Đạn trúng quái vật (Enemy Hit impact)
     */
    public static playHitEnemy(): void {
        try {
            const ctx = this.getContext();
            const now = ctx.currentTime;

            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(150, now);
            osc.frequency.linearRampToValueAtTime(50, now + 0.06);

            const filter = ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(250, now);

            const vol = 0.20 * this.getVolumeMultiplier();
            gain.gain.setValueAtTime(vol, now);
            gain.gain.exponentialRampToValueAtTime(Math.max(0.001, vol * 0.05), now + 0.06);

            osc.connect(filter);
            filter.connect(gain);
            gain.connect(ctx.destination);

            osc.start(now);
            osc.stop(now + 0.06);
        } catch (e) {
            console.error('Audio error:', e);
        }
    }

    /**
     * Người chơi bị dính đòn (Player damaged)
     */
    public static playHitPlayer(): void {
        try {
            const ctx = this.getContext();
            const now = ctx.currentTime;

            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(110, now);
            osc.frequency.linearRampToValueAtTime(20, now + 0.22);

            const vol = 0.45 * this.getVolumeMultiplier();
            gain.gain.setValueAtTime(vol, now);
            gain.gain.exponentialRampToValueAtTime(Math.max(0.001, vol * 0.05), now + 0.22);

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.start(now);
            osc.stop(now + 0.22);
        } catch (e) {
            console.error('Audio error:', e);
        }
    }

    /**
     * Thu thập vật phẩm (Collect Gem, Coin, Item)
     */
    public static playCollectItem(): void {
        try {
            const ctx = this.getContext();
            const now = ctx.currentTime;

            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(523.25, now); // nốt C5
            osc.frequency.setValueAtTime(783.99, now + 0.07); // nốt G5

            const vol = 0.22 * this.getVolumeMultiplier();
            gain.gain.setValueAtTime(vol, now);
            gain.gain.exponentialRampToValueAtTime(Math.max(0.001, vol * 0.05), now + 0.2);

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.start(now);
            osc.stop(now + 0.2);
        } catch (e) {
            console.error('Audio error:', e);
        }
    }

    /**
     * Lên cấp Hero (Level Up victory chime)
     */
    public static playLevelUp(): void {
        try {
            const ctx = this.getContext();
            const now = ctx.currentTime;

            const notes = [261.63, 329.63, 392.00, 523.25]; // Đô - Mi - Sol - Đố (C4, E4, G4, C5)
            notes.forEach((freq, idx) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();

                osc.type = 'triangle';
                osc.frequency.setValueAtTime(freq, now + idx * 0.1);

                const vol = 0.30 * this.getVolumeMultiplier();
                gain.gain.setValueAtTime(vol, now + idx * 0.1);
                gain.gain.exponentialRampToValueAtTime(Math.max(0.001, vol * 0.05), now + idx * 0.1 + 0.25);

                osc.connect(gain);
                gain.connect(ctx.destination);

                osc.start(now + idx * 0.1);
                osc.stop(now + idx * 0.1 + 0.25);
            });
        } catch (e) {
            console.error('Audio error:', e);
        }
    }
}
