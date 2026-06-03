import Phaser from 'phaser';

// Simple event bus extending Phaser's EventEmitter to facilitate communication
// between Phaser scenes (PlayScene, MenuScene) and the DOM UI Overlay (main.ts)
export const EventBus = new Phaser.Events.EventEmitter();

export default EventBus;
