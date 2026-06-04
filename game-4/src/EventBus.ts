import Phaser from 'phaser';

// Single global event bus (Phaser EventEmitter) bridging the Phaser scenes
// and the DOM/Tailwind overlay driven from main.ts. Scenes emit gameplay
// events; the overlay listens and re-renders HTML; the overlay emits user
// intents (buy, sell, transfer, repair) which scenes act on.
export const EventBus = new Phaser.Events.EventEmitter();

export default EventBus;
