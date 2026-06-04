// =========================================================
// TIỆN ÍCH TẠO GRAPHICS TEXTURE TRONG PHASER (TEXTURE GENERATOR)
// =========================================================

import Phaser from 'phaser';
import { NORMAL_ENEMIES } from './EnemyConfig';

export class TextureGenerator {
    public static generateAll(scene: Phaser.Scene): void {
        const makeTexture = (key: string, width: number, height: number, drawFn: (g: Phaser.GameObjects.Graphics) => void) => {
            // Tránh tạo trùng lặp texture nếu đã tồn tại
            if (scene.textures.exists(key)) return;
            const g = scene.make.graphics({ x: 0, y: 0 }, false);
            drawFn(g);
            g.generateTexture(key, width, height);
            g.destroy();
        };

        // 1. TEXTURE NHÂN VẬT CHÍNH (Độ phân giải nhân đôi 96x96 tránh vỡ màn hình nhỏ)
        // Hiệp sĩ (Knight)
        makeTexture('char_knight', 96, 96, (g) => {
            g.fillStyle(0xcc2222, 1);
            g.beginPath();
            g.moveTo(48, 48); g.lineTo(20, 92); g.lineTo(76, 92); g.closePath(); g.fill();
            g.fillStyle(0x44aaff, 1);
            g.fillCircle(48, 48, 36);
            g.lineStyle(4, 0xffffff, 1); g.strokeCircle(48, 48, 38);
            g.fillStyle(0xdddddd, 1);
            g.fillCircle(16, 48, 12);
            g.lineStyle(3, 0x888888, 1); g.strokeCircle(16, 48, 12);
            
            g.lineStyle(6, 0xffd700, 1);
            g.beginPath(); g.moveTo(72, 48); g.lineTo(92, 24); g.strokePath();
        });

        // Pháp sư (Mage)
        makeTexture('char_mage', 96, 96, (g) => {
            g.fillStyle(0x8833ff, 1);
            g.fillCircle(48, 48, 36);
            g.lineStyle(4, 0x00ffff, 1); g.strokeCircle(48, 48, 38);
            g.fillStyle(0x1a1a1a, 1);
            g.beginPath(); g.moveTo(24, 28); g.lineTo(48, 0); g.lineTo(72, 28); g.closePath(); g.fill();
            g.lineStyle(3, 0xffd700, 1);
            g.beginPath(); g.moveTo(20, 28); g.lineTo(76, 28); g.strokePath();
            g.lineStyle(4, 0x999999, 1);
            g.beginPath(); g.moveTo(68, 64); g.lineTo(80, 20); g.strokePath();
            g.fillStyle(0xff33cc, 1); g.fillCircle(80, 20, 10);
        });

        // Cung thủ (Ranger)
        makeTexture('char_ranger', 96, 96, (g) => {
            g.fillStyle(0x33cc66, 1);
            g.fillCircle(48, 48, 36);
            g.lineStyle(4, 0xffffff, 1); g.strokeCircle(48, 48, 38);
            g.fillStyle(0x1a6633, 0.85);
            g.beginPath(); g.arc(48, 48, 36, Math.PI, 0, false); g.lineTo(48, 24); g.closePath(); g.fill();
            g.lineStyle(5, 0x8b5a2b, 1);
            g.beginPath(); g.arc(16, 48, 20, -Math.PI/2, Math.PI/2, true); g.strokePath();
        });

        // 2. TEXTURE ĐẠN ĐẶC TRƯNG (Độ phân giải cao tránh vỡ hình)
        makeTexture('bullet_knight', 48, 48, (g) => {
            g.fillStyle(0x88e5ff, 0.85);
            g.beginPath();
            // Crescent shape
            g.arc(24, 24, 20, -Math.PI / 2, Math.PI / 2, false);
            g.arc(12, 24, 20, Math.PI / 2, -Math.PI / 2, true);
            g.closePath(); g.fill();
            g.lineStyle(2, 0xffffff, 1); g.strokePath();
        });

        makeTexture('bullet_mage', 32, 32, (g) => {
            g.fillStyle(0xff3300, 1); g.fillCircle(16, 16, 16);
            g.fillStyle(0xffaa00, 1); g.fillCircle(16, 16, 10);
            g.fillStyle(0xffea00, 1); g.fillCircle(16, 16, 5);
        });

        makeTexture('bullet_ranger', 40, 12, (g) => {
            g.lineStyle(4, 0xffd700, 1);
            g.beginPath(); g.moveTo(0, 6); g.lineTo(32, 6); g.strokePath();
            g.fillStyle(0xffffff, 1);
            g.beginPath(); g.moveTo(28, 0); g.lineTo(40, 6); g.lineTo(28, 12); g.closePath(); g.fill();
        });

        // 3. TEXTURE QUÁI VẬT THƯỜNG DÂN (Tạo tự động từ database NORMAL_ENEMIES)
        Object.values(NORMAL_ENEMIES).forEach(config => {
            const key = 'enemy_' + config.id;
            const size = 64; // Kích thước cố định cho quái nhỏ
            makeTexture(key, size, size, (g) => {
                const color = config.color;
                const r = config.radius; // Bán kính thực tế từ cấu hình
                
                if (config.shape === 'circle') {
                    g.fillStyle(color, 1);
                    g.fillCircle(size / 2, size / 2, r);
                    // Vẽ mắt đen
                    g.fillStyle(0x000000, 1);
                    g.fillCircle(size / 2 - 8, size / 2 - 4, 4);
                    g.fillCircle(size / 2 + 8, size / 2 - 4, 4);
                } 
                else if (config.shape === 'square') {
                    g.fillStyle(color, 1);
                    const side = r * 2;
                    g.fillRect(size / 2 - r, size / 2 - r, side, side);
                    // Đường viền sáng tinh tế
                    g.lineStyle(3, 0xffffff, 0.45);
                    g.strokeRect(size / 2 - r, size / 2 - r, side, side);
                    // Vẽ mắt
                    g.fillStyle(0xff3333, 1);
                    g.fillCircle(size / 2 - 6, size / 2, 4);
                    g.fillCircle(size / 2 + 6, size / 2, 4);
                } 
                else if (config.shape === 'triangle') {
                    g.fillStyle(color, 1);
                    g.beginPath();
                    g.moveTo(size / 2, size / 2 - r);
                    g.lineTo(size / 2 - r, size / 2 + r);
                    g.lineTo(size / 2 + r, size / 2 + r);
                    g.closePath();
                    g.fill();
                    // Tạo thêm cánh nếu là Dơi
                    if (config.id === 'bat') {
                        g.fillStyle(0x3a0a66, 1);
                        g.beginPath();
                        g.moveTo(size / 2 - r, size / 2 + r);
                        g.lineTo(size / 2 - r - 8, size / 2 - 4);
                        g.lineTo(size / 2, size / 2);
                        g.closePath();
                        g.fill();
                        
                        g.beginPath();
                        g.moveTo(size / 2 + r, size / 2 + r);
                        g.lineTo(size / 2 + r + 8, size / 2 - 4);
                        g.lineTo(size / 2, size / 2);
                        g.closePath();
                        g.fill();
                    }
                } 
                else if (config.shape === 'polygon') {
                    // Vẽ hình ngũ giác đều
                    g.fillStyle(color, 0.75);
                    g.beginPath();
                    const sides = 5;
                    const cx = size / 2;
                    const cy = size / 2;
                    for (let i = 0; i < sides; i++) {
                        const angle = (i * 2 * Math.PI) / sides - Math.PI / 2;
                        const px = cx + Math.cos(angle) * r;
                        const py = cy + Math.sin(angle) * r;
                        if (i === 0) g.moveTo(px, py);
                        else g.lineTo(px, py);
                    }
                    g.closePath();
                    g.fill();
                    // Vẽ khuôn mặt u hồn mờ ảo
                    g.fillStyle(0xffffff, 1);
                    g.fillCircle(size / 2 - 5, size / 2 - 2, 3);
                    g.fillCircle(size / 2 + 5, size / 2 - 2, 3);
                }
            });
        });

        // Lich Orb
        makeTexture('enemy_lich_orb', 32, 32, (g) => {
            g.fillStyle(0xff00ff, 0.95); g.fillCircle(16, 16, 12);
            g.lineStyle(3, 0xffffff, 0.85); g.strokeCircle(16, 16, 14);
        });

        // Crystal Spike
        makeTexture('enemy_crystal_spike', 48, 48, (g) => {
            g.fillStyle(0x00ffff, 0.9);
            g.beginPath(); g.moveTo(24, 0); g.lineTo(48, 48); g.lineTo(0, 48); g.closePath(); g.fill();
            g.lineStyle(3, 0xffffff, 0.8); g.strokePath();
        });

        // Vua Golem Sừng Đỏ
        makeTexture('boss_golem_king', 112, 112, (g) => {
            // Sừng trái
            g.fillStyle(0xff3b30, 1);
            g.beginPath(); g.moveTo(16, 28); g.lineTo(0, -12); g.lineTo(32, 12); g.closePath(); g.fill();
            // Sừng phải
            g.beginPath(); g.moveTo(96, 28); g.lineTo(112, -12); g.lineTo(80, 12); g.closePath(); g.fill();

            g.fillStyle(0x3a3a3a, 1); g.fillRect(6, 6, 100, 100);
            g.lineStyle(6, 0xffd700, 1); g.strokeRect(6, 6, 100, 100);
            g.fillStyle(0xff0000, 1); g.fillCircle(36, 40, 10); g.fillCircle(76, 40, 10);
            g.fillStyle(0xffd700, 1);
            g.beginPath(); g.moveTo(26, 6); g.lineTo(36, -20); g.lineTo(56, -4); g.lineTo(76, -20); g.lineTo(86, 6); g.closePath(); g.fill();
        });

        // Quỷ Sừng Sét Thượng Cổ
        makeTexture('boss_horn_demon', 120, 120, (g) => {
            // Sừng trái
            g.fillStyle(0xffaa00, 1);
            g.beginPath(); g.moveTo(20, 32); g.lineTo(4, -20); g.lineTo(36, 12); g.closePath(); g.fill();
            // Sừng phải
            g.beginPath(); g.moveTo(100, 32); g.lineTo(116, -20); g.lineTo(84, 12); g.closePath(); g.fill();
            
            g.fillStyle(0x990000, 1); g.fillCircle(60, 60, 32);
            g.lineStyle(4, 0xff0055, 1); g.strokeCircle(60, 60, 34);
            g.fillStyle(0x00ffff, 1); g.fillCircle(48, 52, 6); g.fillCircle(72, 52, 6);
        });

        // Dơi Bóng Tối Ác Quỷ
        makeTexture('boss_shadow_bat', 128, 128, (g) => {
            g.fillStyle(0x1e113a, 1); g.fillCircle(64, 64, 28);
            g.fillStyle(0x0f0521, 1);
            g.beginPath(); g.moveTo(64, 64); g.lineTo(4, 28); g.lineTo(32, 88); g.closePath(); g.fill();
            g.beginPath(); g.moveTo(64, 64); g.lineTo(124, 28); g.lineTo(96, 88); g.closePath(); g.fill();
            g.fillStyle(0x00ffff, 1); g.fillCircle(52, 56, 7); g.fillCircle(76, 56, 7);
        });

        // Bá Chủ Tim Hắc Ám
        makeTexture('boss_heart_lich', 128, 128, (g) => {
            g.fillStyle(0x3a0066, 1);
            g.beginPath(); g.moveTo(64, 20); g.lineTo(20, 108); g.lineTo(108, 108); g.closePath(); g.fill();
            
            g.fillStyle(0xeeeeee, 1); g.fillCircle(64, 44, 20);
            g.fillStyle(0x000000, 1); g.fillCircle(58, 40, 4); g.fillCircle(70, 40, 4);
            
            // Tim ngực đỏ rực
            g.fillStyle(0xff007f, 1);
            g.fillCircle(56, 80, 9); g.fillCircle(72, 80, 9);
            g.beginPath(); g.moveTo(47, 84); g.lineTo(81, 84); g.lineTo(64, 100); g.closePath(); g.fill();
        });

        // Quỷ Lửa Ma Thuật
        makeTexture('boss_fire_demon', 136, 136, (g) => {
            g.fillStyle(0xff3300, 1); g.fillCircle(68, 68, 36);
            g.fillStyle(0xffaa00, 1);
            g.beginPath(); g.moveTo(68, 68); g.lineTo(8, 8); g.lineTo(40, 96); g.closePath(); g.fill();
            g.beginPath(); g.moveTo(68, 68); g.lineTo(128, 8); g.lineTo(96, 96); g.closePath(); g.fill();
            g.fillStyle(0xffffff, 1); g.fillCircle(52, 60, 8); g.fillCircle(84, 60, 8);

            // Tim
            g.fillStyle(0xff0055, 1);
            g.fillCircle(60, 64, 8); g.fillCircle(76, 64, 8);
            g.beginPath(); g.moveTo(52, 68); g.lineTo(84, 68); g.lineTo(68, 84); g.closePath(); g.fill();
        });

        // Rồng Tinh Thể Khổng Lồ
        makeTexture('boss_crystal_dragon', 144, 144, (g) => {
            // Cánh lam
            g.fillStyle(0x00ccff, 0.7);
            g.beginPath(); g.moveTo(72, 72); g.lineTo(8, 24); g.lineTo(24, 96); g.closePath(); g.fill();
            g.beginPath(); g.moveTo(72, 72); g.lineTo(136, 24); g.lineTo(120, 96); g.closePath(); g.fill();
            
            // Thân
            g.fillStyle(0x006655, 1); g.fillCircle(72, 72, 36);
            g.lineStyle(5, 0x00ffcc, 1); g.strokeCircle(72, 72, 38);
            
            // Đầu rồng
            g.fillStyle(0x008877, 1);
            g.beginPath(); g.moveTo(60, 40); g.lineTo(72, 4); g.lineTo(84, 40); g.closePath(); g.fill();
            g.fillStyle(0xffea00, 1); g.fillCircle(64, 32, 5); g.fillCircle(80, 32, 5);
        });

        makeTexture('portal_texture', 160, 160, (g) => {
            g.lineStyle(6, 0x00ffff, 0.85); g.strokeCircle(80, 80, 72);
            g.lineStyle(4, 0x0088ff, 0.65); g.strokeCircle(80, 80, 48);
            g.lineStyle(2, 0xff00ff, 0.45); g.strokeCircle(80, 80, 24);
        });

        makeTexture('xp_texture', 32, 32, (g) => {
            g.fillStyle(0x00ff88, 1);
            g.beginPath(); g.moveTo(16, 0); g.lineTo(32, 16); g.lineTo(16, 32); g.lineTo(0, 16); g.closePath(); g.fill();
            g.lineStyle(3, 0xffffff, 0.85); g.strokePath();
        });

        makeTexture('gold_texture', 32, 32, (g) => {
            g.fillStyle(0xffaa00, 1); g.fillCircle(16, 16, 15);
            g.fillStyle(0xffd700, 1); g.fillCircle(16, 16, 9);
        });

        // 4. TEXTURE VẬT PHẨM ĐẶC BIỆT (Độ phân giải nhân đôi)
        makeTexture('heart_texture', 36, 36, (g) => {
            g.fillStyle(0xff2d55, 1);
            g.fillCircle(10, 12, 11);
            g.fillCircle(26, 12, 11);
            g.beginPath(); g.moveTo(1, 18); g.lineTo(35, 18); g.lineTo(18, 35); g.closePath(); g.fill();
        });

        makeTexture('magnet_texture', 36, 36, (g) => {
            g.lineStyle(9, 0xff3b30, 1);
            g.beginPath(); g.arc(18, 18, 12, Math.PI, 0, false); g.strokePath();
            g.lineStyle(9, 0x00c7ff, 1);
            g.beginPath(); g.arc(18, 18, 12, 0, Math.PI, false); g.strokePath();
        });

        makeTexture('shield_item_texture', 36, 36, (g) => {
            g.fillStyle(0x00ffff, 1);
            g.beginPath(); g.moveTo(18, 2); g.lineTo(34, 8); g.lineTo(28, 26); g.lineTo(18, 34); g.lineTo(8, 26); g.lineTo(2, 8); g.closePath(); g.fill();
            g.fillStyle(0x05030a, 1);
            g.beginPath(); g.moveTo(18, 6); g.lineTo(30, 11); g.lineTo(25, 24); g.lineTo(18, 30); g.lineTo(11, 24); g.lineTo(6, 11); g.closePath(); g.fill();
        });

        makeTexture('freeze_item_texture', 36, 36, (g) => {
            g.lineStyle(4, 0x00aaff, 1);
            g.beginPath();
            g.moveTo(18, 0); g.lineTo(18, 36);
            g.moveTo(0, 18); g.lineTo(36, 18);
            g.moveTo(6, 6); g.lineTo(30, 30);
            g.moveTo(6, 30); g.lineTo(30, 6);
            g.strokePath();
            g.fillStyle(0xffffff, 1);
            g.fillCircle(18, 18, 6);
        });

        makeTexture('bomb_item_texture', 36, 36, (g) => {
            g.fillStyle(0x333333, 1); g.fillCircle(18, 20, 15);
            g.lineStyle(4, 0xff0000, 1);
            g.beginPath(); g.moveTo(18, 7); g.lineTo(26, 0); g.strokePath();
            g.fillStyle(0xffea00, 1); g.fillCircle(26, 0, 4);
        });

        makeTexture('double_xp_texture', 36, 36, (g) => {
            g.fillStyle(0xffd700, 1);
            g.beginPath();
            const cx = 18, cy = 18, spikes = 5, outerRadius = 17, innerRadius = 7;
            let rot = Math.PI / 2 * 3;
            let x = cx, y = cy;
            const step = Math.PI / spikes;
            g.moveTo(cx, cy - outerRadius);
            for (let i = 0; i < spikes; i++) {
                x = cx + Math.cos(rot) * outerRadius;
                y = cy + Math.sin(rot) * outerRadius;
                g.lineTo(x, y);
                rot += step;
                x = cx + Math.cos(rot) * innerRadius;
                y = cy + Math.sin(rot) * innerRadius;
                g.lineTo(x, y);
                rot += step;
            }
            g.closePath();
            g.fill();
        });

        // 5. ĐẠN QUÁI VÀ BẢO HỘ
        makeTexture('golem_rock', 24, 24, (g) => {
            g.fillStyle(0x777777, 1); g.fillCircle(12, 12, 12);
            g.fillStyle(0xff3b30, 1); g.fillCircle(12, 12, 4);
        });

        makeTexture('boss_rock', 48, 48, (g) => {
            g.fillStyle(0x444444, 1); g.fillCircle(24, 24, 22);
            g.lineStyle(4, 0xffaa00, 1); g.strokeCircle(24, 24, 24);
        });

        makeTexture('boss_fire', 36, 36, (g) => {
            g.fillStyle(0xff5500, 1); g.fillCircle(18, 18, 18);
            g.fillStyle(0xffea00, 1); g.fillCircle(18, 18, 10);
        });

        makeTexture('shield_texture', 32, 32, (g) => {
            g.fillStyle(0x00e1ff, 0.85); g.fillCircle(16, 16, 14);
            g.lineStyle(3, 0xffffff, 0.9); g.strokeCircle(16, 16, 16);
        });
    }
}
