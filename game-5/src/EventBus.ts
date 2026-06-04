import Phaser from 'phaser';

// =====================================================================
// EventBus — single shared emitter bridging Phaser scenes and the
// HTML/Tailwind DOM overlay (main.ts). Scenes emit gameplay state;
// the DOM renders it and emits user intents back.
// =====================================================================

export const EventBus = new Phaser.Events.EventEmitter();
export default EventBus;
