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

const dpr = window.devicePixelRatio || 1;

const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.WEBGL,
    width: window.innerWidth * dpr,
    height: window.innerHeight * dpr,
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
        mode: Phaser.Scale.NONE,
        autoCenter: Phaser.Scale.CENTER_BOTH
    },
    render: {
        antialias: true,
        roundPixels: true,
        resolution: dpr
    } as any,
    scene: [MenuScene, PlayScene]
};

const game = new Phaser.Game(config);

window.addEventListener('resize', () => {
    const currentDpr = window.devicePixelRatio || 1;
    game.scale.resize(window.innerWidth * currentDpr, window.innerHeight * currentDpr);
});
