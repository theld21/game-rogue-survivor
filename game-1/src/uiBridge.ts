// ==========================================
// GIAO TIẾP VỚI UI BẰNG HTML DOM (UI BRIDGE)
// ==========================================
import { CHARACTER_CONFIG, CharacterType } from './utils/CharacterConfig';
import { NORMAL_ENEMIES } from './utils/EnemyConfig';
import { SkillManager } from './utils/SkillManager';

// Helper functions to draw classes and entities on Canvas 2D Context

function updateSliderTrack(slider: HTMLInputElement, color: string): void {
    const min = parseFloat(slider.min) || 0;
    const max = parseFloat(slider.max) || 100;
    const val = parseFloat(slider.value) || 0;
    const percent = ((val - min) / (max - min)) * 100;
    slider.style.background = `linear-gradient(to right, ${color} 0%, ${color} ${percent}%, #020617 ${percent}%, #020617 100%)`;
}

function drawKnight(ctx: CanvasRenderingContext2D): void {
    ctx.clearRect(0, 0, 96, 96);
    // Body (Red triangle)
    ctx.fillStyle = '#cc2222';
    ctx.beginPath();
    ctx.moveTo(48, 48);
    ctx.lineTo(20, 92);
    ctx.lineTo(76, 92);
    ctx.closePath();
    ctx.fill();

    // Head (Blue circle)
    ctx.fillStyle = '#44aaff';
    ctx.beginPath();
    ctx.arc(48, 48, 36, 0, Math.PI * 2);
    ctx.fill();

    // Head outline (White)
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(48, 48, 38, 0, Math.PI * 2);
    ctx.stroke();

    // Shield (Left circle)
    ctx.fillStyle = '#dddddd';
    ctx.beginPath();
    ctx.arc(16, 48, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#888888';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(16, 48, 12, 0, Math.PI * 2);
    ctx.stroke();

    // Sword (Right line)
    ctx.strokeStyle = '#ffd700';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(72, 48);
    ctx.lineTo(92, 24);
    ctx.stroke();
}

function drawMage(ctx: CanvasRenderingContext2D): void {
    ctx.clearRect(0, 0, 96, 96);
    // Body (Purple circle)
    ctx.fillStyle = '#8833ff';
    ctx.beginPath();
    ctx.arc(48, 48, 36, 0, Math.PI * 2);
    ctx.fill();

    // Head outline (Cyan)
    ctx.strokeStyle = '#00ffff';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(48, 48, 38, 0, Math.PI * 2);
    ctx.stroke();

    // Hat (Dark triangle)
    ctx.fillStyle = '#1a1a1a';
    ctx.beginPath();
    ctx.moveTo(24, 28);
    ctx.lineTo(48, 0);
    ctx.lineTo(72, 28);
    ctx.closePath();
    ctx.fill();

    // Hat gold band
    ctx.strokeStyle = '#ffd700';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(20, 28);
    ctx.lineTo(76, 28);
    ctx.stroke();

    // Staff
    ctx.strokeStyle = '#999999';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(68, 64);
    ctx.lineTo(80, 20);
    ctx.stroke();

    // Staff gem
    ctx.fillStyle = '#ff33cc';
    ctx.beginPath();
    ctx.arc(80, 20, 10, 0, Math.PI * 2);
    ctx.fill();
}

function drawRanger(ctx: CanvasRenderingContext2D): void {
    ctx.clearRect(0, 0, 96, 96);
    // Head (Green circle)
    ctx.fillStyle = '#33cc66';
    ctx.beginPath();
    ctx.arc(48, 48, 36, 0, Math.PI * 2);
    ctx.fill();

    // Border (White)
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(48, 48, 38, 0, Math.PI * 2);
    ctx.stroke();

    // Cloak/hood (Dark green arc)
    ctx.fillStyle = 'rgba(26, 102, 51, 0.85)';
    ctx.beginPath();
    ctx.arc(48, 48, 36, Math.PI, 0, false);
    ctx.lineTo(48, 24);
    ctx.closePath();
    ctx.fill();

    // Bow (Brown arc on left)
    ctx.strokeStyle = '#8b5a2b';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(16, 48, 20, -Math.PI / 2, Math.PI / 2, true);
    ctx.stroke();
}

function drawSlime(ctx: CanvasRenderingContext2D, x: number, y: number, scale: number = 1.0): void {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    ctx.translate(-24, -24);

    // Body (Red circle)
    ctx.fillStyle = '#ff3b30';
    ctx.beginPath();
    ctx.arc(24, 24, 22, 0, Math.PI * 2);
    ctx.fill();

    // Eyes (Black circles)
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.arc(16, 20, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.arc(32, 20, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
}

function drawBulletKnight(ctx: CanvasRenderingContext2D, x: number, y: number, scale: number = 1.0): void {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    ctx.translate(-24, -24);

    ctx.fillStyle = 'rgba(136, 229, 255, 0.85)';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(24, 24, 20, -Math.PI / 2, Math.PI / 2, false);
    ctx.arc(12, 24, 20, Math.PI / 2, -Math.PI / 2, true);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.restore();
}

function drawBulletMage(ctx: CanvasRenderingContext2D, x: number, y: number, scale: number = 1.0): void {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    ctx.translate(-16, -16);

    ctx.fillStyle = '#ff3300';
    ctx.beginPath();
    ctx.arc(16, 16, 16, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffaa00';
    ctx.beginPath();
    ctx.arc(16, 16, 10, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffea00';
    ctx.beginPath();
    ctx.arc(16, 16, 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
}

function drawBulletRanger(ctx: CanvasRenderingContext2D, x: number, y: number, scale: number = 1.0): void {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    ctx.translate(-20, -6);

    ctx.strokeStyle = '#ffd700';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(0, 6);
    ctx.lineTo(32, 6);
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(28, 0);
    ctx.lineTo(40, 6);
    ctx.lineTo(28, 12);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
}

function drawCharacterAt(ctx: CanvasRenderingContext2D, char: 'knight' | 'mage' | 'ranger', x: number, y: number, scale: number = 1.0): void {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    ctx.translate(-48, -48);
    if (char === 'knight') drawKnight(ctx);
    else if (char === 'mage') drawMage(ctx);
    else if (char === 'ranger') drawRanger(ctx);
    ctx.restore();
}

export const UIBridge = {
    simAnimFrame: null as number | null,

    clearSimulation(): void {
        if (this.simAnimFrame !== null) {
            cancelAnimationFrame(this.simAnimFrame);
            this.simAnimFrame = null;
        }
    },

    startSimulation(char: 'knight' | 'mage' | 'ranger'): void {
        this.clearSimulation();

        const canvas = document.getElementById('sim-canvas') as HTMLCanvasElement;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const width = 400;
        const height = 96;
        canvas.width = width;
        canvas.height = height;

        interface Projectile {
            x: number;
            y: number;
            speed: number;
        }

        interface Particle {
            x: number;
            y: number;
            vx: number;
            vy: number;
            size: number;
            color: string;
            life: number;
            maxLife: number;
        }

        let projectiles: Projectile[] = [];
        let particles: Particle[] = [];
        let slimeShake = 0;
        let shootTimer = 0;

        const bulletCooldowns = {
            knight: 50,
            mage: 65,
            ranger: 25
        };

        const particleColors = {
            knight: '#00f0ff',
            mage: '#ff5500',
            ranger: '#eab308'
        };

        const loop = () => {
            shootTimer++;
            if (shootTimer >= bulletCooldowns[char]) {
                shootTimer = 0;
                projectiles.push({
                    x: 70,
                    y: 48,
                    speed: char === 'ranger' ? 8 : char === 'mage' ? 5 : 6
                });
            }

            for (let idx = projectiles.length - 1; idx >= 0; idx--) {
                const p = projectiles[idx];
                p.x += p.speed;
                if (p.x >= 340) {
                    projectiles.splice(idx, 1);
                    slimeShake = 10;
                    const color = particleColors[char];
                    for (let i = 0; i < 8; i++) {
                        const angle = Math.random() * Math.PI * 2;
                        const speed = Math.random() * 3 + 2;
                        particles.push({
                            x: 340,
                            y: 48,
                            vx: Math.cos(angle) * speed,
                            vy: Math.sin(angle) * speed,
                            size: Math.random() * 3 + 2,
                            color: color,
                            life: 0,
                            maxLife: Math.random() * 15 + 10
                        });
                    }
                }
            }

            for (let idx = particles.length - 1; idx >= 0; idx--) {
                const p = particles[idx];
                p.x += p.vx;
                p.y += p.vy;
                p.life++;
                if (p.life >= p.maxLife) {
                    particles.splice(idx, 1);
                }
            }

            if (slimeShake > 0) {
                slimeShake--;
            }

            ctx.clearRect(0, 0, width, height);

            // Draw character
            drawCharacterAt(ctx, char, 48, 48, 0.45);

            // Draw slime
            let slimeX = 340;
            let slimeY = 48;
            if (slimeShake > 0) {
                slimeX += (Math.random() - 0.5) * 6;
                slimeY += (Math.random() - 0.5) * 6;
            }
            drawSlime(ctx, slimeX, slimeY, slimeShake > 0 ? 0.8 : 0.9);

            // Draw bullets
            projectiles.forEach(p => {
                if (char === 'knight') {
                    drawBulletKnight(ctx, p.x, p.y, 0.7);
                } else if (char === 'mage') {
                    drawBulletMage(ctx, p.x, p.y, 0.7);
                } else if (char === 'ranger') {
                    drawBulletRanger(ctx, p.x, p.y, 0.7);
                }
            });

            // Draw particles
            particles.forEach(p => {
                ctx.fillStyle = p.color;
                ctx.globalAlpha = 1 - (p.life / p.maxLife);
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fill();
            });
            ctx.globalAlpha = 1.0;

            this.simAnimFrame = requestAnimationFrame(loop);
        };

        this.simAnimFrame = requestAnimationFrame(loop);
    },

    // Ẩn tất cả các màn hình UI
    hideAll(): void {
        this.clearSimulation();
        document.getElementById('menu-ui')?.classList.add('hidden');
        document.getElementById('play-ui')?.classList.add('hidden');
        document.getElementById('levelup-ui')?.classList.add('hidden');
        document.getElementById('gameover-ui')?.classList.add('hidden');
        document.getElementById('boss-hp-container')?.classList.add('hidden');
        document.getElementById('pause-ui')?.classList.add('hidden');
        document.getElementById('intro-modal')?.classList.add('hidden');
        document.getElementById('shop-modal')?.classList.add('hidden');
        document.getElementById('settings-modal')?.classList.add('hidden');
        document.getElementById('guide-modal')?.classList.add('hidden');
    },

    // Hiển thị và cài đặt màn hình Menu chính
    showMenu(
        gold: number,
        hpLvl: number,
        speedLvl: number,
        damageLvl: number,
        selectedChar: 'knight' | 'mage' | 'ranger',
        heroName: string,
        onStart: () => void,
        onOpenShop: () => void,
        onOpenSettings: () => void
    ): void {
        this.hideAll();
        document.getElementById('menu-ui')?.classList.remove('hidden');

        // Cập nhật text vàng
        const goldEl = document.getElementById('menu-gold-val');
        if (goldEl) goldEl.innerText = `${gold}`;

        // Cập nhật chỉ số
        const hpEl = document.getElementById('menu-stat-hp');
        if (hpEl) hpEl.innerText = `Lv.${hpLvl}`;

        const spEl = document.getElementById('menu-stat-speed');
        if (spEl) spEl.innerText = `Lv.${speedLvl}`;

        const dmgEl = document.getElementById('menu-stat-damage');
        if (dmgEl) dmgEl.innerText = `Lv.${damageLvl}`;

        // Cập nhật tên Hero và hệ
        const heroNameEl = document.getElementById('menu-hero-name');
        if (heroNameEl) heroNameEl.innerText = heroName || 'Hero';

        const charNameMap = { knight: 'Knight 🛡️', mage: 'Mage 🔮', ranger: 'Ranger 🏹' };
        const charEl = document.getElementById('menu-char-type-name');
        if (charEl) charEl.innerText = charNameMap[selectedChar] || selectedChar;

        // Vẽ canvas nhân vật Hero
        const previewCanvas = document.getElementById('menu-player-preview-canvas') as HTMLCanvasElement;
        if (previewCanvas) {
            const ctx = previewCanvas.getContext('2d');
            if (ctx) {
                ctx.clearRect(0, 0, 96, 96);
                if (selectedChar === 'knight') drawKnight(ctx);
                else if (selectedChar === 'mage') drawMage(ctx);
                else if (selectedChar === 'ranger') drawRanger(ctx);
            }
        }

        // Đăng ký nút vào trận, shop, cài đặt
        const startBtn = document.getElementById('start-game-btn');
        if (startBtn) startBtn.onclick = onStart;

        const shopBtn = document.getElementById('open-shop-btn');
        if (shopBtn) shopBtn.onclick = onOpenShop;

        const settingsBtn = document.getElementById('open-settings-btn');
        if (settingsBtn) settingsBtn.onclick = onOpenSettings;

        this.refreshIcons();
    },

    // Hiển thị chọn hệ lần đầu tiên
    showIntro(onSelectAndConfirm: (char: 'knight' | 'mage' | 'ranger') => void): void {
        this.hideAll();
        const introModal = document.getElementById('intro-modal');
        if (introModal) introModal.classList.remove('hidden');

        let selected: 'knight' | 'mage' | 'ranger' = 'knight';



        const updatePreviewUI = (char: CharacterType) => {
            selected = char;
            const data = CHARACTER_CONFIG[char];

            // Vẽ avatar canvas
            const avatarCanvas = document.getElementById('intro-preview-avatar-canvas') as HTMLCanvasElement;
            if (avatarCanvas) {
                const ctx = avatarCanvas.getContext('2d');
                if (ctx) {
                    ctx.clearRect(0, 0, 96, 96);
                    if (char === 'knight') drawKnight(ctx);
                    else if (char === 'mage') drawMage(ctx);
                    else if (char === 'ranger') drawRanger(ctx);
                }
            }

            const classText = document.getElementById('intro-preview-class');
            if (classText) classText.innerText = data.name;

            const weaponText = document.getElementById('intro-preview-weapon');
            if (weaponText) weaponText.innerText = data.weaponName;

            const descText = document.getElementById('intro-preview-desc');
            if (descText) descText.innerText = data.description;

            const hpText = document.getElementById('intro-preview-hp');
            if (hpText) hpText.innerText = data.baseHp.toString();

            const spText = document.getElementById('intro-preview-speed');
            if (spText) spText.innerText = data.baseSpeed.toString();

            const dmgText = document.getElementById('intro-preview-dmg');
            if (dmgText) dmgText.innerText = data.baseDamage.toString();

            // Highlight selected button
            ['knight', 'mage', 'ranger'].forEach(c => {
                const btn = document.getElementById(`intro-${c}-btn`);
                if (btn) {
                    if (c === char) {
                        let borderCol = 'border-[#00f0ff]';
                        let textCol = 'text-[#00f0ff]';
                        let shadowClass = 'shadow-neon';
                        if (c === 'mage') {
                            borderCol = 'border-[#d946ef]';
                            textCol = 'text-[#d946ef]';
                            shadowClass = 'shadow-neonpink';
                        } else if (c === 'ranger') {
                            borderCol = 'border-[#22c55e]';
                            textCol = 'text-[#22c55e]';
                            shadowClass = 'shadow-neon';
                        }
                        btn.className = `flex flex-col items-center p-3 rounded-2xl border bg-slate-900 ${borderCol} ${textCol} text-center scale-105 ${shadowClass} transition-all duration-200 select-none cursor-pointer outline-none`;
                        btn.style.opacity = '1';
                    } else {
                        btn.className = 'flex flex-col items-center p-3 rounded-2xl border bg-slate-950/20 border-slate-800 text-center transition-all duration-200 select-none opacity-60 cursor-pointer text-slate-400';
                        btn.style.opacity = '0.6';
                    }
                }
            });

            this.startSimulation(char);
        };

        ['knight', 'mage', 'ranger'].forEach(c => {
            const btn = document.getElementById(`intro-${c}-btn`);
            if (btn) {
                btn.onclick = () => updatePreviewUI(c as 'knight' | 'mage' | 'ranger');
            }
        });

        updatePreviewUI('knight');

        const confirmBtn = document.getElementById('intro-confirm-btn');
        if (confirmBtn) {
            confirmBtn.onclick = () => {
                this.clearSimulation();
                onSelectAndConfirm(selected);
            };
        }

        this.refreshIcons();
    },

    // Hiển thị giao diện Cửa Hàng (Shop)
    showShop(
        gold: number,
        hpLvl: number,
        speedLvl: number,
        damageLvl: number,
        selectedChar: 'knight' | 'mage' | 'ranger',
        classChangeCost: number,
        onUpgrade: (type: 'hp' | 'speed' | 'damage') => void,
        onClassChange: (char: 'knight' | 'mage' | 'ranger') => void,
        onCloseShop: () => void
    ): void {
        this.hideAll();
        const shopModal = document.getElementById('shop-modal');
        if (shopModal) shopModal.classList.remove('hidden');

        // Update gold text
        const goldEl = document.getElementById('shop-gold');
        if (goldEl) goldEl.innerText = `${gold}`;

        // Cập nhật tab 1 Upgrades
        const hpTitle = document.getElementById('shop-upgrade-hp-title');
        const hpDesc = document.getElementById('shop-upgrade-hp-desc');
        const buyHpBtn = document.getElementById('buy-upgrade-hp-btn') as HTMLButtonElement;
        if (hpTitle) hpTitle.innerText = `MAX HP (Lv.${hpLvl})`;
        if (hpDesc) hpDesc.innerText = `Permanently increased: +${hpLvl * 5}% HP`;
        if (buyHpBtn) {
            buyHpBtn.innerHTML = `🪙 ${50 * (hpLvl + 1)}`;
            buyHpBtn.onclick = () => onUpgrade('hp');
        }

        const spTitle = document.getElementById('shop-upgrade-speed-title');
        const spDesc = document.getElementById('shop-upgrade-speed-desc');
        const buySpBtn = document.getElementById('buy-upgrade-speed-btn') as HTMLButtonElement;
        if (spTitle) spTitle.innerText = `MOVEMENT SPEED (Lv.${speedLvl})`;
        if (spDesc) spDesc.innerText = `Permanently increased: +${speedLvl * 3}% Speed`;
        if (buySpBtn) {
            buySpBtn.innerHTML = `🪙 ${50 * (speedLvl + 1)}`;
            buySpBtn.onclick = () => onUpgrade('speed');
        }

        const dmgTitle = document.getElementById('shop-upgrade-damage-title');
        const dmgDesc = document.getElementById('shop-upgrade-damage-desc');
        const buyDmgBtn = document.getElementById('buy-upgrade-damage-btn') as HTMLButtonElement;
        if (dmgTitle) dmgTitle.innerText = `BULLET DAMAGE (Lv.${damageLvl})`;
        if (dmgDesc) dmgDesc.innerText = `Permanently increased: +${damageLvl * 10}% Dmg`;
        if (buyDmgBtn) {
            buyDmgBtn.innerHTML = `🪙 ${50 * (damageLvl + 1)}`;
            buyDmgBtn.onclick = () => onUpgrade('damage');
        }

        // Cấu hình tab Đổi Hệ
        const classes: ('knight' | 'mage' | 'ranger')[] = ['knight', 'mage', 'ranger'];
        classes.forEach(c => {
            const btn = document.getElementById(`buy-class-${c}-btn`) as HTMLButtonElement;
            if (btn) {
                if (selectedChar === c) {
                    btn.innerText = 'IN USE';
                    btn.className = 'px-2.5 py-1.5 bg-green-500/20 text-green-400 border border-green-500/30 text-[9px] font-bold rounded-lg cursor-default shadow-[0_0_8px_rgba(34,197,94,0.2)]';
                    btn.onclick = null;
                } else {
                    btn.innerText = `🪙 ${classChangeCost}`;
                    btn.className = 'px-2.5 py-1.5 cyber-btn cyber-btn-gold text-[9px] rounded-lg cursor-pointer';
                    btn.onclick = () => onClassChange(c);
                }
            }

            // Vẽ nhân vật lên các canvas nhỏ của Shop
            const canvas = document.getElementById(`shop-class-${c}-canvas`) as HTMLCanvasElement;
            if (canvas) {
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    ctx.clearRect(0, 0, 96, 96);
                    if (c === 'knight') drawKnight(ctx);
                    else if (c === 'mage') drawMage(ctx);
                    else if (c === 'ranger') drawRanger(ctx);
                }
            }
        });

        // Tabs Toggle Logic (Giữa Chỉ Số và Đổi Hệ)
        const tabBtns = {
            upgrade: document.getElementById('tab-upgrade-btn'),
            class: document.getElementById('tab-class-btn')
        };

        const tabContents = {
            upgrade: document.getElementById('shop-content-upgrades'),
            class: document.getElementById('shop-content-class')
        };

        const selectTab = (activeTab: 'upgrade' | 'class') => {
            Object.keys(tabContents).forEach(k => {
                const content = tabContents[k as 'upgrade' | 'class'];
                if (content) {
                    if (k === activeTab) {
                        content.classList.remove('hidden');
                    } else {
                        content.classList.add('hidden');
                    }
                }
            });

            Object.keys(tabBtns).forEach(k => {
                const btn = tabBtns[k as 'upgrade' | 'class'];
                if (btn) {
                    if (k === activeTab) {
                        btn.className = 'py-2 rounded-xl text-[10px] font-bold text-[#00f0ff] bg-cyan-950/20 border border-[#00f0ff]/30 transition-all cursor-pointer shadow-[inset_0_0_10px_rgba(0,240,255,0.1)]';
                    } else {
                        btn.className = 'py-2 rounded-xl text-[10px] font-bold text-slate-400 hover:text-white transition-all cursor-pointer';
                    }
                }
            });
        };

        if (tabBtns.upgrade) tabBtns.upgrade.onclick = () => selectTab('upgrade');
        if (tabBtns.class) tabBtns.class.onclick = () => selectTab('class');

        // Chọn tab chỉ số ban đầu
        selectTab('upgrade');

        // Close Shop button
        const closeBtn = document.getElementById('close-shop-btn');
        if (closeBtn) closeBtn.onclick = onCloseShop;

        this.refreshIcons();
    },

    // Hiển thị giao diện Cài đặt
    showSettings(
        heroName: string,
        initialVolume: number,
        initialSfxVolume: number,
        onVolumeChange: (vol: number) => void,
        onSfxVolumeChange: (vol: number) => void,
        onSave: (newName: string) => void,
        onReset: () => void,
        onClose: () => void
    ): void {
        this.hideAll();
        const settingsModal = document.getElementById('settings-modal');
        if (settingsModal) settingsModal.classList.remove('hidden');

        const volumeSlider = document.getElementById('settings-volume-slider') as HTMLInputElement;
        const volumePercent = document.getElementById('settings-volume-percent');
        if (volumeSlider && volumePercent) {
            volumeSlider.value = initialVolume.toString();
            volumePercent.innerText = `${initialVolume}%`;
            updateSliderTrack(volumeSlider, '#00f0ff');

            volumeSlider.oninput = () => {
                const vol = parseInt(volumeSlider.value, 10);
                volumePercent.innerText = `${vol}%`;
                updateSliderTrack(volumeSlider, '#00f0ff');
                onVolumeChange(vol);
            };
        }

        const sfxSlider = document.getElementById('settings-sfx-slider') as HTMLInputElement;
        const sfxPercent = document.getElementById('settings-sfx-percent');
        if (sfxSlider && sfxPercent) {
            sfxSlider.value = initialSfxVolume.toString();
            sfxPercent.innerText = `${initialSfxVolume}%`;
            updateSliderTrack(sfxSlider, '#00f0ff');

            sfxSlider.oninput = () => {
                const vol = parseInt(sfxSlider.value, 10);
                sfxPercent.innerText = `${vol}%`;
                updateSliderTrack(sfxSlider, '#00f0ff');
                onSfxVolumeChange(vol);
            };
        }

        const nameInput = document.getElementById('settings-hero-name-input') as HTMLInputElement;
        if (nameInput) nameInput.value = heroName || '';

        const closeBtn = document.getElementById('close-settings-btn');
        if (closeBtn) closeBtn.onclick = onClose;

        const saveBtn = document.getElementById('save-settings-btn');
        if (saveBtn) {
            saveBtn.onclick = () => {
                const newName = nameInput ? nameInput.value.trim() : '';
                if (!newName) {
                    this.showNotification('Hero name is empty!', 'error');
                    return;
                }
                onSave(newName);
                this.showNotification('Saved settings', 'success');
            };
        }

        const resetBtn = document.getElementById('reset-data-btn');
        if (resetBtn) {
            resetBtn.onclick = () => {
                this.showConfirm('ARE YOU SURE YOU WANT TO DELETE ALL DATA?\nThis action will restore the game to its original state.', () => {
                    onReset();
                });
            };
        }

        this.refreshIcons();
    },

    // Hiển thị UI trong trận
    showPlay(): void {
        this.hideAll();
        document.getElementById('play-ui')?.classList.remove('hidden');
        this.refreshIcons();
    },

    // Cập nhật số liệu UI trong trận
    updatePlayUI(level: number, stage: number, kills: number, timer: string, gold: number, xpRatio: number): void {
        const lvlEl = document.getElementById('play-level');
        const stgEl = document.getElementById('play-stage');
        const klsEl = document.getElementById('play-kills');
        const tmrEl = document.getElementById('play-timer');
        const gldEl = document.getElementById('play-gold');
        const xpEl = document.getElementById('xp-bar');

        if (lvlEl) lvlEl.innerText = `LEVEL: ${level}`;
        if (stgEl) stgEl.innerText = `Stage ${stage}`;
        if (klsEl) klsEl.innerText = `Kills: ${kills}`;
        if (tmrEl) tmrEl.innerText = timer;
        const gldTextEl = document.getElementById('play-gold-text');
        if (gldTextEl) gldTextEl.innerText = `${gold}`;
        if (xpEl) xpEl.style.width = `${Math.min(100, xpRatio * 100)}%`;
    },

    // Cập nhật thanh HP lơ lửng trên đầu Player
    updatePlayerHP(x: number, y: number, currentHP: number, maxHP: number, active: boolean): void {
        const hpContainer = document.getElementById('player-hp-container');
        const hpBar = document.getElementById('player-hp-bar');

        if (!hpContainer || !hpBar) return;

        if (!active || currentHP <= 0) {
            hpContainer.classList.add('hidden');
            return;
        }

        hpContainer.classList.remove('hidden');

        // Định vị toạ độ HTML đè lên đúng trên đầu nhân vật
        hpContainer.style.left = `${x - 24}px`;
        hpContainer.style.top = `${y}px`;

        const ratio = Math.max(0, currentHP / maxHP);
        hpBar.style.width = `${ratio * 100}%`;

        if (ratio < 0.28) {
            hpBar.className = 'h-full bg-rose-500 transition-all duration-100';
        } else if (ratio < 0.58) {
            hpBar.className = 'h-full bg-yellow-500 transition-all duration-100';
        } else {
            hpBar.className = 'h-full bg-green-500 transition-all duration-100';
        }
    },

    // Cập nhật hiển thị thanh HP của Boss lớn ở trên cùng màn hình
    updateBossHP(x: number, y: number, currentHP: number, maxHP: number, active: boolean): void {
        const container = document.getElementById('boss-hp-container');
        const bar = document.getElementById('boss-hp-bar');

        if (!container || !bar) return;

        if (!active || currentHP <= 0) {
            container.classList.add('hidden');
            return;
        }

        container.classList.remove('hidden');

        container.style.left = `${x - 32}px`; // Căn giữa thanh (width 16 = 4rem = 64px, offset -32px)
        container.style.top = `${y}px`;

        const ratio = Math.max(0, currentHP / maxHP);
        bar.style.width = `${ratio * 100}%`;
    },

    // Hiển thị giao diện lên cấp
    showLevelUp(skills: any[], onSelect: (id: string) => void): void {
        const container = document.getElementById('skills-container');
        const levelUpUi = document.getElementById('levelup-ui');

        if (!container || !levelUpUi) return;

        container.innerHTML = '';
        levelUpUi.classList.remove('hidden');

        skills.forEach(sk => {
            const btn = document.createElement('button');
            btn.className = 'w-full flex items-center justify-between p-3.5 bg-slate-950/60 border border-slate-800 hover:border-cyber hover:shadow-[0_0_15px_rgba(0,240,255,0.15)] rounded-2xl text-left transition-all hover:scale-[1.02] active:scale-[0.98] text-xs ui-element cursor-pointer';

            btn.innerHTML = `
                <div class="flex-1 pr-2 space-y-0.5">
                    <p class="text-white font-bold text-xs">${sk.name}</p>
                    <p class="text-slate-400 text-[10px] leading-relaxed">${sk.desc}</p>
                </div>
                <div class="text-right flex flex-col items-end shrink-0 gap-1">
                    <span class="px-2 py-0.5 bg-cyan-950/40 text-cyan-300 border border-cyan-900/10 text-[8px] font-semibold rounded-full uppercase tracking-wider">Skill</span>
                    <span class="text-[9px] text-slate-500 font-medium">Lv: ${sk.currentLvl}</span>
                </div>
            `;

            btn.onclick = () => {
                levelUpUi.classList.add('hidden');
                onSelect(sk.id);
            };

            container.appendChild(btn);
        });
        this.refreshIcons();
    },

    // Hiển thị màn hình kết thúc Game
    showGameOver(
        victory: boolean,
        survivalTime: number,
        kills: number,
        goldCollected: number,
        totalGold: number,
        onRetry: () => void,
        onBackMenu: () => void,
        isQuit: boolean = false
    ): void {
        this.hideAll();

        const ui = document.getElementById('gameover-ui');
        const panel = document.getElementById('gameover-panel');
        const title = document.getElementById('gameover-title');
        const timeEl = document.getElementById('gameover-time');
        const killsEl = document.getElementById('gameover-kills');
        const goldCollectedEl = document.getElementById('gameover-gold-collected');
        const goldTotalEl = document.getElementById('gameover-gold-total');
        const bonusEl = document.getElementById('gameover-victory-bonus');
        const retryBtn = document.getElementById('retry-btn');
        const backBtn = document.getElementById('back-menu-btn');

        if (!ui || !panel || !title || !timeEl || !killsEl || !goldCollectedEl || !goldTotalEl || !bonusEl || !retryBtn || !backBtn) return;

        ui.classList.remove('hidden');

        if (victory) {
            title.innerText = 'VICTORY!';
            title.className = 'text-3xl font-black tracking-wider mb-1 text-cyan-400 text-glow-cyan animate-pulse';
            panel.className = 'cyber-panel cyber-panel-cyan w-full max-w-xs p-5 rounded-3xl mx-4 text-center ui-element';
            bonusEl.classList.remove('hidden');
        } else if (isQuit) {
            title.innerText = 'GAME OVER';
            title.className = 'text-3xl font-black tracking-wider mb-1 text-yellow-400 text-shadow-[0_0_12px_rgba(234,179,8,0.7)]';
            panel.className = 'cyber-panel border-yellow-500/40 shadow-neon w-full max-w-xs p-5 rounded-3xl mx-4 text-center ui-element';
            bonusEl.classList.add('hidden');
        } else {
            title.innerText = 'YOU DIED';
            title.className = 'text-3xl font-black tracking-wider mb-1 text-rose-500 text-shadow-[0_0_12px_rgba(239,68,68,0.7)]';
            panel.className = 'cyber-panel border-rose-500/40 shadow-neonpink w-full max-w-xs p-5 rounded-3xl mx-4 text-center ui-element';
            bonusEl.classList.add('hidden');
        }

        const mins = Math.floor(survivalTime / 60);
        const secs = survivalTime % 60;
        timeEl.innerText = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;

        killsEl.innerText = `${kills} kills`;
        goldCollectedEl.innerText = `+${goldCollected}`;
        goldTotalEl.innerHTML = `<i data-lucide="coins" class="w-3.5 h-3.5"></i> ${totalGold}`;

        retryBtn.onclick = onRetry;
        backBtn.onclick = onBackMenu;
        this.refreshIcons();
    },

    // Hiển thị UI Tạm Dừng
    showPause(
        initialVolume: number,
        initialSfxVolume: number,
        onVolumeChange: (vol: number) => void,
        onSfxVolumeChange: (vol: number) => void,
        onResume: () => void,
        onExit: () => void
    ): void {
        const pauseUi = document.getElementById('pause-ui');
        if (pauseUi) {
            pauseUi.classList.remove('hidden');
        }

        const volumeSlider = document.getElementById('pause-volume-slider') as HTMLInputElement;
        const volumePercent = document.getElementById('pause-volume-percent');
        if (volumeSlider && volumePercent) {
            volumeSlider.value = initialVolume.toString();
            volumePercent.innerText = `${initialVolume}%`;
            updateSliderTrack(volumeSlider, '#fbbf24');

            volumeSlider.oninput = () => {
                const vol = parseInt(volumeSlider.value, 10);
                volumePercent.innerText = `${vol}%`;
                updateSliderTrack(volumeSlider, '#fbbf24');
                onVolumeChange(vol);
            };
        }

        const sfxSlider = document.getElementById('pause-sfx-slider') as HTMLInputElement;
        const sfxPercent = document.getElementById('pause-sfx-percent');
        if (sfxSlider && sfxPercent) {
            sfxSlider.value = initialSfxVolume.toString();
            sfxPercent.innerText = `${initialSfxVolume}%`;
            updateSliderTrack(sfxSlider, '#fbbf24');

            sfxSlider.oninput = () => {
                const vol = parseInt(sfxSlider.value, 10);
                sfxPercent.innerText = `${vol}%`;
                updateSliderTrack(sfxSlider, '#fbbf24');
                onSfxVolumeChange(vol);
            };
        }

        const resumeBtn = document.getElementById('pause-resume-btn');
        if (resumeBtn) {
            resumeBtn.onclick = onResume;
        }

        const exitBtn = document.getElementById('pause-exit-btn');
        if (exitBtn) {
            exitBtn.onclick = onExit;
        }
        this.refreshIcons();
    },

    // Ẩn UI Tạm Dừng
    hidePause(): void {
        document.getElementById('pause-ui')?.classList.add('hidden');
    },

    // ============================================================
    // HƯỚNG DẪN CHƠI (HOW TO PLAY) — dựng nội dung từ config game
    // ============================================================
    renderGuide(): void {
        const body = document.getElementById('guide-body');
        if (!body) return;

        // Một thẻ mục với header rõ ràng, có khoảng cách
        const sec = (color: string, title: string, inner: string) => `<div class="cyber-panel rounded-2xl p-4 flex flex-col gap-3">
            <div class="flex items-center gap-2"><span class="w-1.5 h-4 rounded-full shrink-0" style="background:${color}"></span><span class="font-bold text-[11px] tracking-[0.18em] uppercase text-white/90">${title}</span></div>${inner}</div>`;
        // Hàng hai dòng: tên đậm ở trên, mô tả thoáng ở dưới
        const row = (color: string, name: string, desc: string) => `<div class="flex gap-2.5 items-start">
            <span class="w-1.5 h-1.5 rounded-full shrink-0 mt-1.5" style="background:${color}"></span>
            <div><div class="font-bold text-[12.5px]" style="color:${color}">${name}</div><div class="text-[11.5px] text-slate-400 leading-relaxed">${desc}</div></div></div>`;
        const chip = (color: string, label: string) => `<span class="rounded-full px-2.5 py-1 text-[11px] bg-slate-900/60 border border-white/10 flex items-center gap-1.5"><span class="w-2 h-2 rounded-full shrink-0" style="background:${color}"></span>${label}</span>`;

        const objective = sec('#ffd700', 'Objective',
            `<div class="text-[12px] text-slate-300 leading-relaxed">Survive the endless swarm. Move to dodge — your hero <b class="text-cyan-400">auto-attacks</b> the nearest foes. Collect green <b class="text-emerald-400">XP gems</b> to level up and pick new powers. Survive each stage, defeat its <b class="text-rose-400">Boss</b>, then step into the <b class="text-fuchsia-400">portal</b> to advance. Clear <b class="text-amber-400">Stage 3</b> → <b class="text-emerald-400">YOU WIN</b>.</div>`);

        const controls = sec('#00f0ff', 'Controls', [
            row('#00f0ff', 'Move', 'Touch &amp; drag anywhere to steer with the virtual joystick. Release to stop.'),
            row('#ffd700', 'Auto-Attack', 'Your weapon fires on its own at the closest enemy — just focus on dodging &amp; positioning.'),
            row('#94a3b8', 'Pause', 'Tap the pause button (top-right) to freeze the battle and adjust audio.'),
        ].join(''));

        // Hero classes — dựng từ CHARACTER_CONFIG
        const heroRows = (Object.keys(CHARACTER_CONFIG) as CharacterType[]).map((k) => {
            const c = CHARACTER_CONFIG[k];
            const label = c.name.replace('Class: ', '');
            return `<div class="flex items-center justify-between gap-3 text-[12px]"><span class="font-bold shrink-0 text-white">${label}</span><span class="text-slate-400 text-[10.5px] text-right leading-tight">${c.weaponName.replace('Weapon: ', '')}<br>HP ${c.baseHp} · SPD ${c.baseSpeed} · DMG ${c.baseDamage}</span></div>`;
        }).join('');
        const heroes = sec('#00f0ff', 'Heroes', `<div class="flex flex-col gap-2.5">${heroRows}</div><div class="text-[11px] text-slate-400 leading-relaxed">Unlock &amp; switch classes in the SHOP. Knight starts unlocked.</div>`);

        // Skill upgrades — dựng từ SkillManager
        const zeroLv = { attackSpeed: 0, moveSpeed: 0, thorns: 0, multiShot: 0, shield: 0, lightning: 0, attackRange: 0 };
        const skillRows = SkillManager.getAvailableSkills(zeroLv).map((s) =>
            `<div class="text-[12px] leading-relaxed"><span class="font-bold text-cyan-400">${s.name}</span> <span class="text-slate-400">— ${s.desc}</span></div>`
        ).join('');
        const skills = sec('#a855f7', 'Level-Up Skills', `<div class="flex flex-col gap-2">${skillRows}</div><div class="text-[11px] text-slate-400 leading-relaxed">On level-up, time freezes and you pick 1 of 3 random upgrades. Stack them to grow stronger.</div>`);

        // Enemies — dựng từ NORMAL_ENEMIES (bỏ thực thể không phải quái: lich_orb, crystal_spike)
        const skillVerb: Record<string, string> = { leap: 'leaps at you', chase: 'chases you down', wander: 'roams the field', charge: 'charges in a straight line', shoot: 'fires projectiles' };
        const enemyChips = Object.values(NORMAL_ENEMIES)
            .filter((e) => e.id !== 'lich_orb' && e.id !== 'crystal_spike')
            .map((e) => chip(e.colorStr, `${e.name} <span class="text-slate-500">· ${skillVerb[e.skill] ?? e.skill}</span>`))
            .join('');
        const enemies = sec('#ff3b30', 'Enemies & Bosses', `<div class="flex flex-wrap gap-2">${enemyChips}</div><div class="text-[11px] text-slate-400 leading-relaxed mt-1">Every 30s the swarm enrages and grows tougher. At ~50s a <b class="text-rose-400">Stage Boss</b> appears — telegraphed leaps, projectile rings &amp; lightning. Beat it to open the portal.</div>`);

        // Items / collectibles
        const items = sec('#34d399', 'Drops & Power-Ups', `<div class="flex flex-col gap-1.5 text-[11.5px] text-slate-400 leading-relaxed">
            <div><b class="text-emerald-400">XP Gem</b> — fills the XP bar to level up.</div>
            <div><b class="text-yellow-400">Gold Coin</b> — spend in the SHOP between runs.</div>
            <div><b class="text-rose-400">Heart</b> — restores HP. <b class="text-cyan-400">Magnet</b> — pulls in every drop.</div>
            <div><b class="text-sky-400">Shield</b> — brief invulnerability. <b class="text-indigo-300">Freeze Clock</b> — stops enemies.</div>
            <div><b class="text-orange-400">Bomb</b> — clears the screen. <b class="text-amber-300">Double XP</b> — 2× XP for 10s.</div>
        </div>`);

        // Progression
        const progress = sec('#fbbf24', 'Progression', `<div class="text-[11.5px] text-slate-400 leading-relaxed">Gold persists between runs. In the <b class="text-amber-400">SHOP</b> buy permanent boosts to <b class="text-cyan-400">Max HP</b>, <b class="text-cyan-400">Speed</b> &amp; <b class="text-cyan-400">Damage</b>, or unlock new heroes. Die or win → gold banked → upgrade → dive back in.</div>`);

        const tips = sec('#34d399', 'Survival Tips', `<div class="flex flex-col gap-2">` + [
            'Keep moving — standing still gets you swarmed.',
            'Grab XP gems fast to out-level the rising difficulty.',
            'Save Bombs &amp; Freeze for the boss or a tight crowd.',
            'Bank gold and upgrade HP early so you live long enough to scale damage.',
        ].map((t) => `<div class="flex gap-2 text-[11.5px] text-slate-300 leading-relaxed"><span class="shrink-0 text-emerald-400">▸</span>${t}</div>`).join('') + `</div>`);

        body.innerHTML = objective + controls + heroes + skills + enemies + items + progress + tips;
    },

    // Một opener duy nhất, hai trigger (menu + pause) — cùng modal, đè lên trên (z-60)
    openGuide(): void {
        this.renderGuide();
        const modal = document.getElementById('guide-modal');
        if (modal) modal.classList.remove('hidden');
        const body = document.getElementById('guide-body');
        if (body) body.scrollTop = 0;
        this.refreshIcons();
    },

    hideGuide(): void {
        document.getElementById('guide-modal')?.classList.add('hidden');
    },

    // Gắn 3 nút hướng dẫn (chạy một lần, các phần tử luôn có trong DOM)
    setupGuide(): void {
        const open = document.getElementById('open-guide-btn');
        if (open) open.onclick = () => this.openGuide();
        const pauseOpen = document.getElementById('pause-guide-btn');
        if (pauseOpen) pauseOpen.onclick = () => this.openGuide();
        const close = document.getElementById('close-guide-btn');
        if (close) close.onclick = () => this.hideGuide();
    },

    // Tự động quét lại các thẻ data-lucide để chèn SVG
    refreshIcons(): void {
        const anyWindow = window as any;
        if (anyWindow.lucide && anyWindow.lucide.createIcons) {
            anyWindow.lucide.createIcons();
        }
    },

    showNotification(message: string, type: 'info' | 'success' | 'error' | 'warning' = 'info'): void {
        const container = document.getElementById('toast-container');
        if (!container) return;

        const toast = document.createElement('div');
        let bgClass = 'bg-slate-900/90 border border-cyan-500/50 text-cyan-400';
        if (type === 'success') bgClass = 'bg-emerald-950/90 border border-emerald-500/50 text-emerald-400';
        else if (type === 'error') bgClass = 'bg-rose-950/90 border border-rose-500/50 text-rose-400';
        else if (type === 'warning') bgClass = 'bg-amber-950/90 border border-amber-500/50 text-amber-400';

        toast.className = `px-4 py-3 rounded-xl shadow-[0_0_15px_rgba(0,0,0,0.5)] backdrop-blur-md text-[11px] font-bold uppercase tracking-wider transform transition-all duration-300 -translate-y-4 opacity-0 flex items-center justify-center text-center ${bgClass}`;
        toast.innerText = message;

        container.appendChild(toast);

        // Animate in
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                toast.classList.remove('-translate-y-4', 'opacity-0');
                toast.classList.add('translate-y-0', 'opacity-100');
            });
        });

        if (type === 'error') this.vibrate([50, 50, 50]);
        else if (type === 'success') this.vibrate(50);

        // Remove after 2.5s
        setTimeout(() => {
            toast.classList.remove('translate-y-0', 'opacity-100');
            toast.classList.add('-translate-y-4', 'opacity-0');
            setTimeout(() => {
                if (container.contains(toast)) container.removeChild(toast);
            }, 300);
        }, 2500);
    },

    showConfirm(message: string, onConfirm: () => void, onCancel?: () => void): void {
        const modal = document.getElementById('confirm-modal');
        const msgEl = document.getElementById('confirm-message');
        const okBtn = document.getElementById('confirm-ok-btn');
        const cancelBtn = document.getElementById('confirm-cancel-btn');

        if (!modal || !msgEl || !okBtn || !cancelBtn) return;

        msgEl.innerText = message;
        modal.classList.remove('hidden');

        this.vibrate(40);

        const close = () => modal.classList.add('hidden');

        okBtn.onclick = () => {
            close();
            onConfirm();
        };

        cancelBtn.onclick = () => {
            close();
            if (onCancel) onCancel();
        };
    },

    showLoading(text: string = "LOADING..."): void {
        const loadingUi = document.getElementById('loading-ui');
        if (loadingUi) {
            loadingUi.classList.remove('hidden');
            const header = loadingUi.querySelector('h2');
            if (header) header.innerText = text;
        }
    },

    hideLoading(): void {
        document.getElementById('loading-ui')?.classList.add('hidden');
    },

    vibrate(pattern: number | number[]): void {
        if (navigator && navigator.vibrate) {
            navigator.vibrate(pattern);
        }
    }
};
