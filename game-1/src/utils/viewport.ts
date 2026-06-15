// =========================================================
// viewport.ts — single source of truth for the device-pixel-ratio.
//
// The Phaser canvas is sized at innerWidth*dpr with dpr CAPPED at 2 (see
// main.ts). EVERY screen<->world / zoom / DOM-overlay calculation must use
// the SAME capped value, otherwise the camera zoom and the HP-bar overlays
// drift on dpr>2 phones (e.g. dpr=3). Import getDpr() everywhere instead of
// reading window.devicePixelRatio directly.
// =========================================================

export const getDpr = (): number => Math.min(window.devicePixelRatio || 1, 2);
