// =========================================================
// TIỆN ÍCH TẠO GRAPHICS TEXTURE TRONG PHASER (TEXTURE GENERATOR)
// Phong cách SUNSET-NEON (đồng bộ với game-6): khối bo tròn thân thiện,
// đổ sáng nhẹ trên / tối nhẹ dưới, viền vừa phải, vòng neon glow mềm,
// ánh bóng glossy nhỏ, mặt biểu cảm. MỘT bảng màu thống nhất, không chỏi màu.
// ⚠️ Giữ NGUYÊN key và kích thước width×height của mọi texture — chỉ thay
// phần được VẼ bên trong khung. Player/Enemy hardcode scale + hitbox theo các
// kích thước này; đổi canvas sẽ ngầm phá vỡ tỉ lệ sprite & physics body.
// Vị trí điểm yếu boss cũng giữ nguyên (sừng trên / tim giữa ngực).
// =========================================================

import Phaser from 'phaser';
import { NORMAL_ENEMIES } from './EnemyConfig';

type G = Phaser.GameObjects.Graphics;

// ---- BẢNG MÀU SUNSET-NEON DUY NHẤT (đồng bộ game-6) ----
const NIGHT_INK = 0x140a2e;   // nền tối nhất
const PANEL_INK = 0x1d1442;   // tím-đen panel
const OUTLINE   = 0x140a2e;   // viền tối chung (tím-đen)
const WHITE     = 0xffffff;

// neon accents
const CYAN   = 0x22e3ff;
const PINK   = 0xff4fa3;
const LIME   = 0x9dff5c;
const YELLOW = 0xffd83d;
const ORANGE = 0xff8a3d;
const VIOLET = 0x9d6bff;
const DUSK   = 0xfeb47b;

export class TextureGenerator {
    public static generateAll(scene: Phaser.Scene): void {
        const makeTexture = (key: string, width: number, height: number, drawFn: (g: G) => void) => {
            if (scene.textures.exists(key)) return;
            const g = scene.make.graphics({ x: 0, y: 0 }, false);
            drawFn(g);
            g.generateTexture(key, width, height);
            g.destroy();
        };

        // ---- helper vẽ thân bo tròn dùng chung ----
        // Vòng glow neon mềm + thân bo tròn + đổ sáng trên / tối dưới + bóng glossy + viền.
        const softBody = (g: G, cx: number, cy: number, r: number, color: number, glow = color, ow = 4, outline = OUTLINE) => {
            // vòng glow neon mềm (2 lớp)
            g.fillStyle(glow, 0.10); g.fillCircle(cx, cy, r * 1.22);
            g.fillStyle(glow, 0.14); g.fillCircle(cx, cy, r * 1.08);
            // bóng nền dưới
            g.fillStyle(0x000000, 0.14);
            g.fillEllipse(cx, cy + r * 0.82, r * 1.5, r * 0.5);
            // thân chính
            g.fillStyle(color, 1);
            g.fillCircle(cx, cy, r);
            // đổ sáng nửa trên
            g.fillStyle(WHITE, 0.16);
            g.beginPath();
            g.arc(cx, cy, r * 0.95, Math.PI, 0, false);
            g.lineTo(cx + r * 0.95, cy);
            g.closePath();
            g.fill();
            // đổ tối nửa dưới
            g.fillStyle(NIGHT_INK, 0.18);
            g.beginPath();
            g.arc(cx, cy, r * 0.95, 0, Math.PI, false);
            g.lineTo(cx - r * 0.95, cy);
            g.closePath();
            g.fill();
            // ánh bóng glossy nhỏ góc trên-trái
            g.fillStyle(WHITE, 0.55);
            g.fillEllipse(cx - r * 0.38, cy - r * 0.44, r * 0.4, r * 0.26);
            // viền tối vừa phải
            g.lineStyle(ow, outline, 1);
            g.strokeCircle(cx, cy, r);
            // vành neon mảnh
            g.lineStyle(Math.max(1.5, ow * 0.45), glow, 0.55);
            g.strokeCircle(cx, cy, r - ow * 0.5);
        };

        // Cặp mắt to + highlight; mouth/angry tùy chọn
        const face = (g: G, cx: number, cy: number, eyeDx: number, eyeR: number, opts?: { angry?: boolean; mouth?: boolean }) => {
            g.fillStyle(WHITE, 1);
            g.fillCircle(cx - eyeDx, cy, eyeR);
            g.fillCircle(cx + eyeDx, cy, eyeR);
            g.lineStyle(2, OUTLINE, 1);
            g.strokeCircle(cx - eyeDx, cy, eyeR);
            g.strokeCircle(cx + eyeDx, cy, eyeR);
            g.fillStyle(OUTLINE, 1);
            g.fillCircle(cx - eyeDx + eyeR * 0.18, cy + eyeR * 0.12, eyeR * 0.55);
            g.fillCircle(cx + eyeDx + eyeR * 0.18, cy + eyeR * 0.12, eyeR * 0.55);
            g.fillStyle(WHITE, 1);
            g.fillCircle(cx - eyeDx + eyeR * 0.4, cy - eyeR * 0.3, eyeR * 0.22);
            g.fillCircle(cx + eyeDx + eyeR * 0.4, cy - eyeR * 0.3, eyeR * 0.22);
            if (opts?.angry) {
                g.lineStyle(3, OUTLINE, 1);
                g.beginPath();
                g.moveTo(cx - eyeDx - eyeR, cy - eyeR * 1.2);
                g.lineTo(cx - eyeDx + eyeR * 0.5, cy - eyeR * 0.5);
                g.moveTo(cx + eyeDx + eyeR, cy - eyeR * 1.2);
                g.lineTo(cx + eyeDx - eyeR * 0.5, cy - eyeR * 0.5);
                g.strokePath();
            }
            if (opts?.mouth) {
                g.lineStyle(2.5, OUTLINE, 1);
                g.beginPath();
                g.arc(cx, cy + eyeR * 1.6, eyeR * 0.9, 0.15 * Math.PI, 0.85 * Math.PI, false);
                g.strokePath();
            }
        };

        // =====================================================
        // 1. NHÂN VẬT CHÍNH (96x96, scale 0.5 + setCircle(36,12,12))
        //    Mỗi hero một accent: knight=cyan, mage=violet(trim hồng), ranger=lime.
        // =====================================================

        // Hiệp sĩ (Knight) — giáp CYAN, khiên trắng-cyan, mũ vàng, kiếm cyan sáng
        makeTexture('char_knight', 96, 96, (g) => {
            // áo choàng phía dưới (tím panel)
            g.fillStyle(PANEL_INK, 1);
            g.fillTriangle(48, 56, 26, 90, 70, 90);
            g.lineStyle(4, OUTLINE, 1);
            g.strokeTriangle(48, 56, 26, 90, 70, 90);
            // kiếm năng lượng cyan tay phải
            g.lineStyle(8, CYAN, 0.4);
            g.beginPath(); g.moveTo(70, 50); g.lineTo(90, 22); g.strokePath();
            g.lineStyle(5, WHITE, 0.95);
            g.beginPath(); g.moveTo(70, 50); g.lineTo(90, 22); g.strokePath();
            g.lineStyle(2.5, CYAN, 1);
            g.beginPath(); g.moveTo(70, 50); g.lineTo(90, 22); g.strokePath();
            // khiên tròn tay trái
            g.fillStyle(0xeaf6ff, 1); g.fillCircle(15, 52, 13);
            g.lineStyle(4, OUTLINE, 1); g.strokeCircle(15, 52, 13);
            g.fillStyle(CYAN, 1); g.fillCircle(15, 52, 5);
            // thân/đầu giáp cyan
            softBody(g, 48, 46, 34, 0x2bb0e0, CYAN, 5);
            // mũ giáp vàng (vành trên)
            g.fillStyle(YELLOW, 1);
            g.beginPath(); g.moveTo(20, 30); g.lineTo(76, 30); g.lineTo(70, 18); g.lineTo(26, 18); g.closePath(); g.fill();
            g.fillStyle(WHITE, 0.18);
            g.beginPath(); g.moveTo(26, 18); g.lineTo(70, 18); g.lineTo(66, 23); g.lineTo(30, 23); g.closePath(); g.fill();
            g.lineStyle(3, OUTLINE, 1);
            g.beginPath(); g.moveTo(20, 30); g.lineTo(76, 30); g.strokePath();
        });

        // Pháp sư (Mage) — áo VIOLET, mũ chóp, quyền trượng HỒNG (trim)
        makeTexture('char_mage', 96, 96, (g) => {
            // quyền trượng tay phải
            g.lineStyle(5, DUSK, 1);
            g.beginPath(); g.moveTo(66, 70); g.lineTo(82, 24); g.strokePath();
            g.fillStyle(PINK, 0.3); g.fillCircle(82, 20, 14);
            g.fillStyle(PINK, 1); g.fillCircle(82, 20, 11);
            g.lineStyle(3, OUTLINE, 1); g.strokeCircle(82, 20, 11);
            g.fillStyle(WHITE, 0.8); g.fillCircle(79, 17, 3.5);
            // thân/đầu violet
            softBody(g, 48, 50, 33, VIOLET, PINK, 5);
            // mũ chóp pháp sư
            g.fillStyle(0x6b3fc4, 1);
            g.beginPath(); g.moveTo(20, 32); g.lineTo(48, -6); g.lineTo(76, 32); g.closePath(); g.fill();
            g.fillStyle(WHITE, 0.14);
            g.beginPath(); g.moveTo(34, 32); g.lineTo(48, -6); g.lineTo(50, 32); g.closePath(); g.fill();
            g.lineStyle(4, OUTLINE, 1);
            g.beginPath(); g.moveTo(20, 32); g.lineTo(48, -6); g.lineTo(76, 32); g.closePath(); g.strokePath();
            // sao trên mũ
            g.fillStyle(YELLOW, 1); g.fillCircle(48, 12, 5);
            g.fillStyle(CYAN, 1); g.fillCircle(40, 30, 3);
            // vành mũ hồng
            g.fillStyle(PINK, 1); g.fillRect(18, 30, 60, 6);
            g.lineStyle(2.5, OUTLINE, 1); g.strokeRect(18, 30, 60, 6);
        });

        // Cung thủ (Ranger) — áo LIME, mũ trùm, cung gỗ
        makeTexture('char_ranger', 96, 96, (g) => {
            // cung gỗ tay trái
            g.lineStyle(5, DUSK, 1);
            g.beginPath(); g.arc(14, 48, 22, -Math.PI / 2.1, Math.PI / 2.1, false); g.strokePath();
            g.lineStyle(1.5, 0xeeeeee, 0.9);
            g.beginPath(); g.moveTo(14 + Math.cos(-Math.PI / 2.1) * 22, 48 + Math.sin(-Math.PI / 2.1) * 22);
            g.lineTo(14 + Math.cos(Math.PI / 2.1) * 22, 48 + Math.sin(Math.PI / 2.1) * 22); g.strokePath();
            // thân/đầu lime
            softBody(g, 50, 48, 33, 0x6fd83a, LIME, 5);
            // mũ trùm (hood) đậm hơn
            g.fillStyle(0x4aa829, 1);
            g.beginPath();
            g.arc(50, 48, 33, Math.PI, 0, false);
            g.lineTo(83, 44); g.lineTo(17, 44); g.closePath();
            g.fill();
            g.lineStyle(4, OUTLINE, 1);
            g.beginPath(); g.arc(50, 48, 33, Math.PI * 1.05, -0.05, false); g.strokePath();
            // chóp mũ trùm nhỏ
            g.fillStyle(0x4aa829, 1);
            g.fillTriangle(50, 16, 40, 30, 60, 30);
            g.lineStyle(3, OUTLINE, 1); g.strokeTriangle(50, 16, 40, 30, 60, 30);
            // mũi tên sẵn sàng tay phải
            g.lineStyle(3, YELLOW, 1);
            g.beginPath(); g.moveTo(70, 60); g.lineTo(92, 60); g.strokePath();
            g.fillStyle(0xeeeeee, 1); g.fillTriangle(88, 55, 96, 60, 88, 65);
        });

        // =====================================================
        // 2. ĐẠN ĐẶC TRƯNG (giữ nguyên kích thước)
        // =====================================================
        makeTexture('bullet_knight', 48, 48, (g) => {
            // lưỡi kiếm khí hình lưỡi liềm — cyan
            g.fillStyle(CYAN, 0.95);
            g.beginPath();
            g.arc(24, 24, 20, -Math.PI / 2, Math.PI / 2, false);
            g.arc(12, 24, 20, Math.PI / 2, -Math.PI / 2, true);
            g.closePath(); g.fill();
            g.lineStyle(3, WHITE, 0.9);
            g.beginPath();
            g.arc(24, 24, 20, -Math.PI / 2, Math.PI / 2, false);
            g.arc(12, 24, 20, Math.PI / 2, -Math.PI / 2, true);
            g.closePath(); g.strokePath();
            g.fillStyle(WHITE, 0.85); g.fillCircle(26, 14, 2.5);
        });

        makeTexture('bullet_mage', 32, 32, (g) => {
            g.fillStyle(VIOLET, 0.35); g.fillCircle(16, 16, 16);
            g.fillStyle(PINK, 1); g.fillCircle(16, 16, 14);
            g.lineStyle(3, OUTLINE, 1); g.strokeCircle(16, 16, 14);
            g.fillStyle(VIOLET, 1); g.fillCircle(16, 16, 8.5);
            g.fillStyle(WHITE, 0.9); g.fillCircle(16, 15, 4);
            g.fillStyle(WHITE, 0.8); g.fillCircle(11, 11, 2.5);
        });

        makeTexture('bullet_ranger', 40, 12, (g) => {
            g.lineStyle(6, LIME, 0.4);
            g.beginPath(); g.moveTo(2, 6); g.lineTo(30, 6); g.strokePath();
            g.lineStyle(4, LIME, 1);
            g.beginPath(); g.moveTo(2, 6); g.lineTo(30, 6); g.strokePath();
            g.fillStyle(0xeef9e0, 1); g.fillTriangle(28, 0, 40, 6, 28, 12);
            g.lineStyle(1.5, OUTLINE, 1); g.strokeTriangle(28, 0, 40, 6, 28, 12);
        });

        // =====================================================
        // 3. QUÁI THƯỜNG (64x64, dùng config.radius, body tâm 32,32)
        //    Tone neon-violet/pink/orange; lõi quanh radius giữ nguyên.
        // =====================================================
        Object.values(NORMAL_ENEMIES).forEach(config => {
            const key = 'enemy_' + config.id;
            const size = 64;
            makeTexture(key, size, size, (g) => {
                const r = config.radius;
                const cx = size / 2;
                const cy = size / 2;
                // remap màu quái sang bảng màu thống nhất theo id
                const enemyColor: Record<string, number> = {
                    slime: ORANGE,
                    bat: VIOLET,
                    golem: 0x6b5fa0,
                    ghost: CYAN,
                    thief_goblin: LIME,
                    wild_boar: 0x8a5fb0,
                    lich_orb: PINK,
                    crystal_spike: CYAN,
                };
                const color = enemyColor[config.id] ?? VIOLET;
                const glow: Record<string, number> = {
                    slime: YELLOW, bat: PINK, golem: VIOLET, ghost: CYAN,
                    thief_goblin: LIME, wild_boar: PINK, lich_orb: PINK, crystal_spike: CYAN,
                };
                const gl = glow[config.id] ?? VIOLET;

                if (config.shape === 'circle') {
                    if (config.id === 'lich_orb') {
                        // orb ma thuật phát sáng hồng
                        g.fillStyle(PINK, 0.18); g.fillCircle(cx, cy, r + 6);
                        g.fillStyle(VIOLET, 0.9); g.fillCircle(cx, cy, r + 3);
                        g.fillStyle(PINK, 1); g.fillCircle(cx, cy, r);
                        g.lineStyle(3, WHITE, 0.9); g.strokeCircle(cx, cy, r);
                        g.fillStyle(WHITE, 0.85); g.fillCircle(cx - r * 0.35, cy - r * 0.35, r * 0.3);
                        return;
                    }
                    softBody(g, cx, cy, r, color, gl, 4);
                    if (config.id === 'thief_goblin') {
                        // tai nhọn 2 bên
                        g.fillStyle(color, 1);
                        g.fillTriangle(cx - r, cy - 2, cx - r - 9, cy - 10, cx - r + 2, cy + 6);
                        g.fillTriangle(cx + r, cy - 2, cx + r + 9, cy - 10, cx + r - 2, cy + 6);
                        g.lineStyle(2.5, OUTLINE, 1);
                        g.strokeTriangle(cx - r, cy - 2, cx - r - 9, cy - 10, cx - r + 2, cy + 6);
                        g.strokeTriangle(cx + r, cy - 2, cx + r + 9, cy - 10, cx + r - 2, cy + 6);
                        face(g, cx, cy, r * 0.42, r * 0.3, { angry: true });
                        g.fillStyle(WHITE, 1);
                        g.fillTriangle(cx - 3, cy + r * 0.6, cx + 3, cy + r * 0.6, cx, cy + r * 0.85);
                    } else {
                        // slime: mặt vui
                        face(g, cx, cy, r * 0.42, r * 0.32, { mouth: true });
                    }
                }
                else if (config.shape === 'square') {
                    // Golem / Wild boar -> khối bo góc chắc nịch
                    const side = r * 2;
                    const x0 = cx - r, y0 = cy - r;
                    const rad = Math.min(10, r * 0.4);
                    g.fillStyle(gl, 0.12); g.fillRoundedRect(x0 - 4, y0 - 4, side + 8, side + 8, rad + 3);
                    g.fillStyle(0x000000, 0.14); g.fillEllipse(cx, cy + r * 0.85, side * 0.8, r * 0.4);
                    g.fillStyle(color, 1);
                    g.fillRoundedRect(x0, y0, side, side, rad);
                    g.fillStyle(WHITE, 0.14); g.fillRoundedRect(x0, y0, side, side * 0.45, rad);
                    g.fillStyle(NIGHT_INK, 0.2); g.fillRect(x0, cy + r * 0.2, side, r * 0.78);
                    g.lineStyle(4, OUTLINE, 1);
                    g.strokeRoundedRect(x0, y0, side, side, rad);
                    g.lineStyle(2, gl, 0.5);
                    g.strokeRoundedRect(x0 + 2, y0 + 2, side - 4, side - 4, rad - 1);
                    if (config.id === 'wild_boar') {
                        g.fillStyle(0xfff0d6, 1);
                        g.fillTriangle(cx - r * 0.55, cy + r * 0.55, cx - r * 0.55 - 6, cy + r * 0.2, cx - r * 0.3, cy + r * 0.55);
                        g.fillTriangle(cx + r * 0.55, cy + r * 0.55, cx + r * 0.55 + 6, cy + r * 0.2, cx + r * 0.3, cy + r * 0.55);
                        face(g, cx, cy - 1, r * 0.5, r * 0.3, { angry: true });
                        g.fillStyle(NIGHT_INK, 0.4); g.fillEllipse(cx, cy + r * 0.35, r * 0.5, r * 0.3);
                    } else {
                        face(g, cx, cy, r * 0.45, r * 0.28, { angry: true });
                        g.lineStyle(2, OUTLINE, 0.6);
                        g.beginPath(); g.moveTo(x0 + 4, y0 + side * 0.7); g.lineTo(x0 + side * 0.4, y0 + side * 0.55); g.strokePath();
                    }
                }
                else if (config.shape === 'triangle') {
                    if (config.id === 'bat') {
                        // cánh dơi
                        g.fillStyle(0x6b3fc4, 1);
                        g.fillTriangle(cx, cy, cx - r - 14, cy - 8, cx - r * 0.4, cy + r * 0.7);
                        g.fillTriangle(cx, cy, cx + r + 14, cy - 8, cx + r * 0.4, cy + r * 0.7);
                        g.lineStyle(2.5, OUTLINE, 1);
                        g.strokeTriangle(cx, cy, cx - r - 14, cy - 8, cx - r * 0.4, cy + r * 0.7);
                        g.strokeTriangle(cx, cy, cx + r + 14, cy - 8, cx + r * 0.4, cy + r * 0.7);
                        softBody(g, cx, cy, r, color, PINK, 3.5);
                        g.fillStyle(color, 1);
                        g.fillTriangle(cx - r * 0.5, cy - r * 0.7, cx - r * 0.75, cy - r * 1.5, cx - r * 0.1, cy - r * 0.8);
                        g.fillTriangle(cx + r * 0.5, cy - r * 0.7, cx + r * 0.75, cy - r * 1.5, cx + r * 0.1, cy - r * 0.8);
                        face(g, cx, cy + 1, r * 0.42, r * 0.32, { angry: true });
                    } else {
                        // crystal spike: tinh thể bẫy sắc nhọn (cyan)
                        g.fillStyle(CYAN, 0.14); g.fillCircle(cx, cy, r + 5);
                        g.fillStyle(0x000000, 0.12); g.fillEllipse(cx, cy + r * 0.85, r * 1.4, r * 0.4);
                        g.fillStyle(CYAN, 0.95);
                        g.fillTriangle(cx, cy - r, cx + r, cy + r, cx - r, cy + r);
                        g.fillStyle(WHITE, 0.3);
                        g.fillTriangle(cx, cy - r, cx, cy + r, cx - r, cy + r);
                        g.lineStyle(3.5, OUTLINE, 1);
                        g.strokeTriangle(cx, cy - r, cx + r, cy + r, cx - r, cy + r);
                        g.fillStyle(WHITE, 0.85); g.fillCircle(cx - r * 0.25, cy - r * 0.1, 3);
                    }
                }
                else if (config.shape === 'polygon') {
                    // Ghost -> bóng ma cyan với đuôi lượn sóng
                    g.fillStyle(CYAN, 0.12); g.fillCircle(cx, cy, r + 5);
                    g.fillStyle(color, 0.82);
                    g.beginPath();
                    g.arc(cx, cy - r * 0.2, r, Math.PI, 0, false);
                    g.lineTo(cx + r, cy + r * 0.5);
                    const waves = 3;
                    for (let i = 0; i < waves; i++) {
                        const wx = cx + r - (i + 1) * (r * 2 / waves);
                        g.lineTo(wx + r / waves / 2, cy + r * (i % 2 === 0 ? 0.1 : 0.5));
                        g.lineTo(wx, cy + r * 0.5);
                    }
                    g.closePath();
                    g.fill();
                    g.lineStyle(3, WHITE, 0.7);
                    g.strokePath();
                    face(g, cx, cy - r * 0.15, r * 0.4, r * 0.28, { mouth: true });
                }
            });
        });

        // =====================================================
        // 4. BOSS (giữ nguyên kích thước & vị trí điểm yếu)
        //    golem_king/horn_demon: sừng phía trên (weakPoint y≈-44 *scale)
        //    fire_demon/heart_lich: tim giữa ngực (weakPoint y≈8 *scale)
        // =====================================================

        // Vua Golem Sừng (112x112) — khối đá tím viền vàng, sừng cam phía trên
        makeTexture('boss_golem_king', 112, 112, (g) => {
            const cx = 56, cy = 60;
            // sừng cam phía trên (điểm yếu)
            g.fillStyle(ORANGE, 1);
            g.fillTriangle(30, 22, 14, -16, 48, 10);
            g.fillTriangle(82, 22, 98, -16, 64, 10);
            g.lineStyle(4, OUTLINE, 1);
            g.strokeTriangle(30, 22, 14, -16, 48, 10);
            g.strokeTriangle(82, 22, 98, -16, 64, 10);
            // thân đá bo góc tím
            g.fillStyle(VIOLET, 0.12); g.fillRoundedRect(6, 10, 100, 100, 20);
            g.fillStyle(0x4a3a72, 1); g.fillRoundedRect(10, 14, 92, 92, 16);
            g.fillStyle(WHITE, 0.12); g.fillRoundedRect(10, 14, 92, 42, 16);
            g.fillStyle(NIGHT_INK, 0.2); g.fillRect(10, 66, 92, 40);
            g.lineStyle(7, YELLOW, 1); g.strokeRoundedRect(10, 14, 92, 92, 16);
            g.lineStyle(3, OUTLINE, 1); g.strokeRoundedRect(10, 14, 92, 92, 16);
            // vương miện vàng
            g.fillStyle(YELLOW, 1);
            g.fillTriangle(28, 16, 38, -6, 50, 10);
            g.fillTriangle(50, 10, 62, -6, 72, 16);
            g.lineStyle(2.5, OUTLINE, 1);
            g.strokeTriangle(28, 16, 38, -6, 50, 10);
            g.strokeTriangle(50, 10, 62, -6, 72, 16);
            // mắt rực + cau
            face(g, cx, cy, 18, 11, { angry: true });
            g.fillStyle(ORANGE, 0.5); g.fillCircle(cx - 18, cy, 6);
            g.fillStyle(ORANGE, 0.5); g.fillCircle(cx + 18, cy, 6);
            // miệng đá nứt
            g.lineStyle(4, OUTLINE, 1);
            g.beginPath(); g.moveTo(cx - 16, cy + 26); g.lineTo(cx - 6, cy + 22); g.lineTo(cx + 4, cy + 26); g.lineTo(cx + 16, cy + 22); g.strokePath();
        });

        // Quỷ Sừng Sét (120x120) — hồng-tím, sừng cam phía trên
        makeTexture('boss_horn_demon', 120, 120, (g) => {
            const cx = 60, cy = 62;
            // sừng cam (điểm yếu phía trên)
            g.fillStyle(ORANGE, 1);
            g.fillTriangle(34, 26, 16, -18, 52, 12);
            g.fillTriangle(86, 26, 104, -18, 68, 12);
            g.lineStyle(4, OUTLINE, 1);
            g.strokeTriangle(34, 26, 16, -18, 52, 12);
            g.strokeTriangle(86, 26, 104, -18, 68, 12);
            // thân tròn quỷ hồng
            softBody(g, cx, cy, 38, 0xd13a7e, PINK, 5);
            // tai nhọn 2 bên
            g.fillStyle(0xd13a7e, 1);
            g.fillTriangle(cx - 36, cy, cx - 52, cy - 6, cx - 30, cy + 12);
            g.fillTriangle(cx + 36, cy, cx + 52, cy - 6, cx + 30, cy + 12);
            g.lineStyle(3, OUTLINE, 1);
            g.strokeTriangle(cx - 36, cy, cx - 52, cy - 6, cx - 30, cy + 12);
            g.strokeTriangle(cx + 36, cy, cx + 52, cy - 6, cx + 30, cy + 12);
            // mắt sét cyan
            face(g, cx, cy - 2, 15, 9, { angry: true });
            g.fillStyle(CYAN, 0.5); g.fillCircle(cx - 15, cy - 2, 5);
            g.fillStyle(CYAN, 0.5); g.fillCircle(cx + 15, cy - 2, 5);
            // miệng nanh
            g.fillStyle(OUTLINE, 1);
            g.fillEllipse(cx, cy + 22, 22, 12);
            g.fillStyle(WHITE, 1);
            g.fillTriangle(cx - 9, cy + 18, cx - 5, cy + 18, cx - 7, cy + 27);
            g.fillTriangle(cx + 9, cy + 18, cx + 5, cy + 18, cx + 7, cy + 27);
        });

        // Dơi Bóng Tối (128x128) — tím sâu, cánh rộng
        makeTexture('boss_shadow_bat', 128, 128, (g) => {
            const cx = 64, cy = 66;
            // cánh dơi lớn
            g.fillStyle(0x2a1656, 1);
            g.fillTriangle(cx, cy, 2, 24, 36, 96);
            g.fillTriangle(cx, cy, 126, 24, 92, 96);
            g.lineStyle(4, 0x3d2270, 1);
            g.strokeTriangle(cx, cy, 2, 24, 36, 96);
            g.strokeTriangle(cx, cy, 126, 24, 92, 96);
            // gân cánh
            g.lineStyle(2, VIOLET, 0.7);
            g.beginPath(); g.moveTo(cx, cy); g.lineTo(18, 56); g.moveTo(cx, cy); g.lineTo(110, 56); g.strokePath();
            // thân tròn
            softBody(g, cx, cy, 30, 0x4a2a8a, VIOLET, 4);
            // tai dơi to
            g.fillStyle(0x4a2a8a, 1);
            g.fillTriangle(cx - 16, cy - 22, cx - 24, cy - 48, cx - 4, cy - 26);
            g.fillTriangle(cx + 16, cy - 22, cx + 24, cy - 48, cx + 4, cy - 26);
            g.lineStyle(3, OUTLINE, 1);
            g.strokeTriangle(cx - 16, cy - 22, cx - 24, cy - 48, cx - 4, cy - 26);
            g.strokeTriangle(cx + 16, cy - 22, cx + 24, cy - 48, cx + 4, cy - 26);
            // mắt ma quái cyan
            face(g, cx, cy, 13, 8.5, { angry: true });
            g.fillStyle(CYAN, 0.5); g.fillCircle(cx - 13, cy, 5);
            g.fillStyle(CYAN, 0.5); g.fillCircle(cx + 13, cy, 5);
        });

        // Bá Chủ Tim Hắc Ám (128x128) — pháp sư tử thần, tim hồng giữa ngực
        makeTexture('boss_heart_lich', 128, 128, (g) => {
            // áo choàng tím tam giác
            g.fillStyle(0x3a1a72, 1);
            g.fillTriangle(64, 30, 18, 116, 110, 116);
            g.lineStyle(4, OUTLINE, 1);
            g.strokeTriangle(64, 30, 18, 116, 110, 116);
            // đầu lâu trắng
            softBody(g, 64, 46, 24, 0xeef0f8, VIOLET, 4);
            // hốc mắt rực hồng
            g.fillStyle(OUTLINE, 1); g.fillCircle(56, 44, 6); g.fillCircle(72, 44, 6);
            g.fillStyle(PINK, 1); g.fillCircle(56, 44, 3); g.fillCircle(72, 44, 3);
            // mũ pháp sư trên đầu lâu
            g.fillStyle(VIOLET, 1);
            g.fillTriangle(44, 28, 64, -2, 84, 28);
            g.lineStyle(3, OUTLINE, 1); g.strokeTriangle(44, 28, 64, -2, 84, 28);
            // TIM hồng giữa ngực (điểm yếu y≈8 *scale ≈ giữa)
            const hx = 64, hy = 84;
            g.fillStyle(PINK, 0.25); g.fillCircle(hx, hy + 2, 22);
            g.fillStyle(PINK, 1);
            g.fillCircle(hx - 8, hy - 3, 9); g.fillCircle(hx + 8, hy - 3, 9);
            g.fillTriangle(hx - 16, hy + 1, hx + 16, hy + 1, hx, hy + 17);
            g.lineStyle(2.5, OUTLINE, 1);
            g.strokeCircle(hx - 8, hy - 3, 9); g.strokeCircle(hx + 8, hy - 3, 9);
            g.fillStyle(WHITE, 0.6); g.fillCircle(hx - 10, hy - 6, 3);
        });

        // Quỷ Lửa (136x136) — cam-vàng rực, tim hồng giữa ngực
        makeTexture('boss_fire_demon', 136, 136, (g) => {
            const cx = 68, cy = 68;
            // hào quang lửa cam
            g.fillStyle(ORANGE, 0.8);
            g.fillTriangle(cx, cy, 10, 14, 44, 96);
            g.fillTriangle(cx, cy, 126, 14, 92, 96);
            g.fillTriangle(cx, cy, 30, 124, 70, 110);
            g.fillTriangle(cx, cy, 106, 124, 66, 110);
            // thân tròn lửa
            softBody(g, cx, cy, 38, 0xff6a3d, YELLOW, 5);
            // sừng lửa nhỏ
            g.fillStyle(YELLOW, 1);
            g.fillTriangle(cx - 22, cy - 30, cx - 30, cy - 52, cx - 12, cy - 32);
            g.fillTriangle(cx + 22, cy - 30, cx + 30, cy - 52, cx + 12, cy - 32);
            // mắt vàng giận dữ
            face(g, cx, cy - 6, 15, 9, { angry: true });
            g.fillStyle(YELLOW, 0.5); g.fillCircle(cx - 15, cy - 6, 5);
            g.fillStyle(YELLOW, 0.5); g.fillCircle(cx + 15, cy - 6, 5);
            // TIM hồng giữa ngực (điểm yếu y≈8 *scale)
            const hx = cx, hy = cy + 14;
            g.fillStyle(PINK, 0.25); g.fillCircle(hx, hy + 2, 20);
            g.fillStyle(PINK, 1);
            g.fillCircle(hx - 7, hy - 2, 8); g.fillCircle(hx + 7, hy - 2, 8);
            g.fillTriangle(hx - 14, hy + 1, hx + 14, hy + 1, hx, hy + 15);
            g.lineStyle(2.5, OUTLINE, 1);
            g.strokeCircle(hx - 7, hy - 2, 8); g.strokeCircle(hx + 7, hy - 2, 8);
        });

        // Rồng Tinh Thể (144x144) — lục-lam neon, cánh tinh thể cyan
        makeTexture('boss_crystal_dragon', 144, 144, (g) => {
            const cx = 72, cy = 76;
            // cánh tinh thể lam
            g.fillStyle(CYAN, 0.75);
            g.fillTriangle(cx, cy, 6, 20, 28, 102);
            g.fillTriangle(cx, cy, 138, 20, 116, 102);
            g.lineStyle(3.5, OUTLINE, 1);
            g.strokeTriangle(cx, cy, 6, 20, 28, 102);
            g.strokeTriangle(cx, cy, 138, 20, 116, 102);
            // thân tròn ngọc lục
            softBody(g, cx, cy, 38, 0x18b88a, CYAN, 5);
            g.lineStyle(4, LIME, 0.8); g.strokeCircle(cx, cy, 36);
            // sừng tinh thể
            g.fillStyle(CYAN, 1);
            g.fillTriangle(cx - 18, cy - 30, cx - 26, cy - 56, cx - 6, cy - 32);
            g.fillTriangle(cx + 18, cy - 30, cx + 26, cy - 56, cx + 6, cy - 32);
            g.lineStyle(3, OUTLINE, 1);
            g.strokeTriangle(cx - 18, cy - 30, cx - 26, cy - 56, cx - 6, cy - 32);
            g.strokeTriangle(cx + 18, cy - 30, cx + 26, cy - 56, cx + 6, cy - 32);
            // mắt vàng rồng
            face(g, cx, cy - 4, 16, 10, { angry: true });
            // mõm rồng + răng
            g.fillStyle(0x0f8a66, 1); g.fillEllipse(cx, cy + 22, 30, 16);
            g.lineStyle(2.5, OUTLINE, 1); g.strokeEllipse(cx, cy + 22, 30, 16);
            g.fillStyle(WHITE, 1);
            g.fillTriangle(cx - 10, cy + 16, cx - 6, cy + 16, cx - 8, cy + 26);
            g.fillTriangle(cx + 10, cy + 16, cx + 6, cy + 16, cx + 8, cy + 26);
        });

        // Lich Orb fallback (32x32) — giữ key/size
        makeTexture('enemy_lich_orb', 32, 32, (g) => {
            g.fillStyle(PINK, 0.2); g.fillCircle(16, 16, 15);
            g.fillStyle(PINK, 0.95); g.fillCircle(16, 16, 12);
            g.lineStyle(3, WHITE, 0.85); g.strokeCircle(16, 16, 14);
            g.fillStyle(WHITE, 0.85); g.fillCircle(11, 11, 3);
        });

        makeTexture('enemy_crystal_spike', 48, 48, (g) => {
            g.fillStyle(CYAN, 0.16); g.fillCircle(24, 24, 22);
            g.fillStyle(CYAN, 0.95);
            g.fillTriangle(24, 2, 46, 46, 2, 46);
            g.fillStyle(WHITE, 0.3);
            g.fillTriangle(24, 2, 24, 46, 2, 46);
            g.lineStyle(3.5, OUTLINE, 1);
            g.strokeTriangle(24, 2, 46, 46, 2, 46);
            g.fillStyle(WHITE, 0.85); g.fillCircle(18, 16, 3);
        });

        // =====================================================
        // 5. PORTAL + VẬT PHẨM
        // =====================================================
        makeTexture('portal_texture', 160, 160, (g) => {
            g.fillStyle(CYAN, 0.12); g.fillCircle(80, 80, 76);
            g.lineStyle(7, CYAN, 0.9); g.strokeCircle(80, 80, 72);
            g.lineStyle(5, VIOLET, 0.8); g.strokeCircle(80, 80, 52);
            g.lineStyle(3, PINK, 0.7); g.strokeCircle(80, 80, 30);
            g.fillStyle(WHITE, 0.85); g.fillCircle(80, 80, 10);
        });

        makeTexture('xp_texture', 32, 32, (g) => {
            g.fillStyle(CYAN, 0.2); g.fillCircle(16, 16, 16);
            g.fillStyle(CYAN, 1);
            g.fillTriangle(16, 1, 31, 16, 16, 31);
            g.fillTriangle(16, 1, 1, 16, 16, 31);
            g.lineStyle(3, OUTLINE, 1);
            g.beginPath(); g.moveTo(16, 1); g.lineTo(31, 16); g.lineTo(16, 31); g.lineTo(1, 16); g.closePath(); g.strokePath();
            g.fillStyle(WHITE, 0.75); g.fillCircle(12, 12, 3);
        });

        makeTexture('gold_texture', 32, 32, (g) => {
            g.fillStyle(YELLOW, 0.2); g.fillCircle(16, 16, 16);
            g.fillStyle(ORANGE, 1); g.fillCircle(16, 16, 15);
            g.fillStyle(YELLOW, 1); g.fillCircle(16, 16, 12);
            g.lineStyle(3, OUTLINE, 1); g.strokeCircle(16, 16, 15);
            g.fillStyle(0xfff0a8, 1); g.fillCircle(16, 16, 7);
            g.fillStyle(WHITE, 0.8); g.fillCircle(12, 12, 3);
        });

        // Vật phẩm đặc biệt (36x36)
        makeTexture('heart_texture', 36, 36, (g) => {
            g.fillStyle(PINK, 0.2); g.fillCircle(18, 18, 18);
            g.fillStyle(PINK, 1);
            g.fillCircle(11, 13, 10); g.fillCircle(25, 13, 10);
            g.fillTriangle(2, 18, 34, 18, 18, 34);
            g.lineStyle(3, OUTLINE, 1);
            g.beginPath();
            g.arc(11, 13, 10, Math.PI, 0, false);
            g.arc(25, 13, 10, Math.PI, 0, false);
            g.lineTo(18, 34); g.closePath(); g.strokePath();
            g.fillStyle(WHITE, 0.7); g.fillEllipse(12, 11, 5, 3);
        });

        makeTexture('magnet_texture', 36, 36, (g) => {
            g.lineStyle(10, PINK, 1);
            g.beginPath(); g.arc(18, 18, 11, Math.PI, 0, false); g.strokePath();
            g.lineStyle(10, CYAN, 1);
            g.beginPath(); g.arc(18, 18, 11, 0, Math.PI, false); g.strokePath();
            g.lineStyle(2.5, OUTLINE, 1);
            g.beginPath(); g.arc(18, 18, 11, 0, Math.PI * 2, false); g.strokePath();
            g.fillStyle(WHITE, 0.85); g.fillRect(5, 28, 6, 5); g.fillRect(25, 28, 6, 5);
        });

        makeTexture('shield_item_texture', 36, 36, (g) => {
            g.fillStyle(CYAN, 0.2); g.fillCircle(18, 18, 18);
            g.fillStyle(CYAN, 1);
            g.beginPath();
            g.moveTo(18, 2); g.lineTo(33, 8); g.lineTo(28, 26); g.lineTo(18, 34); g.lineTo(8, 26); g.lineTo(3, 8); g.closePath();
            g.fill();
            g.lineStyle(3, OUTLINE, 1); g.strokePath();
            g.fillStyle(WHITE, 0.85);
            g.fillTriangle(18, 9, 13, 18, 23, 18);
            g.fillRect(15, 18, 6, 8);
        });

        makeTexture('freeze_item_texture', 36, 36, (g) => {
            g.fillStyle(CYAN, 0.16); g.fillCircle(18, 18, 18);
            g.lineStyle(4, CYAN, 1);
            g.beginPath();
            g.moveTo(18, 2); g.lineTo(18, 34);
            g.moveTo(4, 18); g.lineTo(32, 18);
            g.moveTo(7, 7); g.lineTo(29, 29);
            g.moveTo(7, 29); g.lineTo(29, 7);
            g.strokePath();
            g.lineStyle(3, WHITE, 0.9);
            g.beginPath();
            g.moveTo(18, 7); g.lineTo(14, 11); g.moveTo(18, 7); g.lineTo(22, 11);
            g.moveTo(18, 29); g.lineTo(14, 25); g.moveTo(18, 29); g.lineTo(22, 25);
            g.strokePath();
            g.fillStyle(WHITE, 1); g.fillCircle(18, 18, 5);
            g.fillStyle(CYAN, 1); g.fillCircle(18, 18, 2.5);
        });

        makeTexture('bomb_item_texture', 36, 36, (g) => {
            g.fillStyle(PANEL_INK, 1); g.fillCircle(18, 21, 14);
            g.fillStyle(WHITE, 0.18); g.fillCircle(13, 16, 5);
            g.lineStyle(3, OUTLINE, 1); g.strokeCircle(18, 21, 14);
            g.fillStyle(VIOLET, 1); g.fillRect(15, 4, 6, 5);
            g.lineStyle(3, ORANGE, 1);
            g.beginPath(); g.moveTo(18, 4); g.lineTo(27, -2); g.strokePath();
            g.fillStyle(YELLOW, 1); g.fillCircle(27, -2, 4);
            g.fillStyle(ORANGE, 1); g.fillCircle(27, -2, 2);
        });

        makeTexture('double_xp_texture', 36, 36, (g) => {
            const cx = 18, cy = 18, spikes = 5, outerRadius = 16, innerRadius = 7;
            let rot = Math.PI / 2 * 3;
            const step = Math.PI / spikes;
            const pts: number[] = [];
            for (let i = 0; i < spikes; i++) {
                pts.push(cx + Math.cos(rot) * outerRadius, cy + Math.sin(rot) * outerRadius);
                rot += step;
                pts.push(cx + Math.cos(rot) * innerRadius, cy + Math.sin(rot) * innerRadius);
                rot += step;
            }
            g.fillStyle(YELLOW, 0.2); g.fillCircle(cx, cy, 18);
            g.fillStyle(YELLOW, 1);
            g.beginPath();
            g.moveTo(pts[0], pts[1]);
            for (let i = 2; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1]);
            g.closePath(); g.fill();
            g.lineStyle(2.5, OUTLINE, 1); g.strokePath();
            g.fillStyle(PINK, 1); g.fillCircle(cx, cy, 4);
        });

        // =====================================================
        // 6. ĐẠN QUÁI & BẢO HỘ
        // =====================================================
        makeTexture('golem_rock', 24, 24, (g) => {
            g.fillStyle(0x6b5fa0, 1); g.fillCircle(12, 12, 11);
            g.fillStyle(WHITE, 0.14); g.fillCircle(9, 9, 4);
            g.lineStyle(2.5, OUTLINE, 1); g.strokeCircle(12, 12, 11);
            g.fillStyle(ORANGE, 1); g.fillCircle(12, 12, 4);
        });

        makeTexture('boss_rock', 48, 48, (g) => {
            g.fillStyle(VIOLET, 0.18); g.fillCircle(24, 24, 23);
            g.fillStyle(0x4a3a72, 1); g.fillCircle(24, 24, 21);
            g.fillStyle(WHITE, 0.12); g.fillCircle(18, 18, 7);
            g.lineStyle(4, ORANGE, 1); g.strokeCircle(24, 24, 23);
            g.lineStyle(2.5, OUTLINE, 1); g.strokeCircle(24, 24, 21);
        });

        makeTexture('boss_fire', 36, 36, (g) => {
            g.fillStyle(ORANGE, 0.25); g.fillCircle(18, 18, 18);
            g.fillStyle(0xff6a3d, 1); g.fillCircle(18, 18, 17);
            g.lineStyle(3, OUTLINE, 1); g.strokeCircle(18, 18, 17);
            g.fillStyle(YELLOW, 1); g.fillCircle(18, 18, 10);
            g.fillStyle(0xfff0a8, 1); g.fillCircle(18, 17, 5);
        });

        makeTexture('shield_texture', 32, 32, (g) => {
            g.fillStyle(CYAN, 0.85); g.fillCircle(16, 16, 13);
            g.lineStyle(3, WHITE, 0.95); g.strokeCircle(16, 16, 15);
            g.fillStyle(WHITE, 0.5); g.fillCircle(11, 11, 4);
        });
    }
}
