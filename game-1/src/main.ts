// ==========================================
// ĐIỂM KHỞI CHẠY GAME CHÍNH (ENTRY POINT)
// ==========================================

import './index.css';
import Phaser from 'phaser';
import { MenuScene } from './scenes/MenuScene';
import { PlayScene } from './scenes/PlayScene';
import { UIBridge } from './uiBridge';
import { createIcons, Play, Shield, Coins, Heart, Sword, Swords, Info, Pause, RefreshCw, LogOut, Sparkles, Target, Zap, Clock, Trophy, BookOpen, X } from 'lucide';

// Khởi tạo các icon Lucide và đưa vào đối tượng window toàn cục
(window as any).lucide = {
    createIcons: () => createIcons({
        icons: { Play, Shield, Coins, Heart, Sword, Swords, Info, Pause, RefreshCw, LogOut, Sparkles, Target, Zap, Clock, Trophy, BookOpen, X }
    })
};

// Quét icons lần đầu khi tải DOM
window.addEventListener('DOMContentLoaded', () => {
    (window as any).lucide.createIcons();
    // Gắn nút HOW TO PLAY (menu + pause) vào modal hướng dẫn dùng chung
    UIBridge.setupGuide();
});

// DPR-aware FIT setup: render the canvas at device-pixel resolution (crisp on
// retina) while FIT scales the canvas element down to the CSS-pixel container.
// We keep base size == innerWidth/Height * dpr so the FIT scale is exactly
// 1/dpr (no letterbox) — the world is derived from the viewport and several DOM
// overlays (player/boss HP bars) divide screen coords by dpr to line up with the
// canvas, which only holds when base aspect == viewport aspect.
const dpr = Math.min(window.devicePixelRatio || 1, 2);

const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.WEBGL,
    parent: 'game-container',
    backgroundColor: '#05030a',
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { x: 0, y: 0 },
            debug: false
        }
    },
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width: window.innerWidth * dpr,
        height: window.innerHeight * dpr
    },
    render: {
        antialias: true,
        roundPixels: true
    },
    scene: [MenuScene, PlayScene]
};

const game = new Phaser.Game(config);

// Resize the base game size to track the viewport (keeps base aspect == viewport
// aspect → FIT scale stays 1/dpr, no letterbox, DOM overlays stay aligned). This
// fires the Scale RESIZE event that PlayScene.handleResize already listens to.
const handleViewportChange = () => {
    const currentDpr = Math.min(window.devicePixelRatio || 1, 2);
    game.scale.resize(window.innerWidth * currentDpr, window.innerHeight * currentDpr);
};
window.addEventListener('resize', handleViewportChange);
window.addEventListener('orientationchange', handleViewportChange);
