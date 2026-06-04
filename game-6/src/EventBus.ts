import Phaser from 'phaser';

// Shared emitter bridging Phaser scenes and the Tailwind DOM overlay.
export const EventBus = new Phaser.Events.EventEmitter();
export default EventBus;
