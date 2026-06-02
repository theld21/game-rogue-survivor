# Project Summary: Phaser 3 Roguelike Survivor Game

This document provides a comprehensive technical overview of the **Phaser 3 Roguelike Survivor** web game project. It serves as a context memory bank for external AI models to quickly understand the structure, core components, design decisions, and mechanics of the project.

---

## 🛠️ Technology Stack

- **Game Engine**: [Phaser 3](https://phaser.io/) (v3.80.1) using Canvas-based procedural textures with Arcade Physics.
- **Languages**: TypeScript (v5.3.3) for type-safety and standard HTML5/ES6 for structure/logic.
- **Build Tool**: Vite (v5.0.12) for development server, HMR, and production bundling.
- **Styling**: Tailwind CSS (v4.3.0) + PostCSS (v8.5.15) for high-performance fluid layouts.
- **Icons**: Lucide Icons (v1.17.0) for visual cues.

---

## 📂 Directory Structure & Core Files

- [`index.html`](file:///Users/ldt/Projects/game-1/index.html): HTML entry point containing Tailwind-styled screens overlaying Phaser. Handles Intro, Main Menu, Shop, Pause, HUD, Level Up, and Game Over.
- [`src/main.ts`](file:///Users/ldt/Projects/game-1/src/main.ts): Application bootstrap file. Configures Phaser (WebGL, Arcade physics gravity x: 0 y: 0, resize scale mode, and registers scenes) and registers Lucide icons on `window.lucide`.
- [`src/config.ts`](file:///Users/ldt/Projects/game-1/src/config.ts): Game configuration. Contains `SAVE_KEYS` (local storage keys), the global `GameState` tracking selected character and skin, and a **Robust try-catch LocalStorage Helper** featuring a RAM-fallback storage dictionary (`memoryStorage`) to avoid iframe or sandbox crashes.
- [`src/uiBridge.ts`](file:///Users/ldt/Projects/game-1/src/uiBridge.ts): Bidirectional bridge between Phaser scenes and HTML DOM overlays. Handles DOM selectors to toggle visibility (removing/adding `hidden`), binds click callbacks, and updates UI parameters (gold, stats, levels, boss HP, timer, and XP bars).
- [`src/scenes/MenuScene.ts`](file:///Users/ldt/Projects/game-1/src/scenes/MenuScene.ts): Main menu and permanent upgrades shop controller. Draws canvas background stars, displays character selection introduction, manages stats purchases, character switching logic (price increments by 50 gold per swap), and skin equipping.
- [`src/scenes/PlayScene.ts`](file:///Users/ldt/Projects/game-1/src/scenes/PlayScene.ts): Main game scene managing core loops. Tracks levels, player stats, active groups, virtual joystick updates, spawner events, collision logic, level-ups, timer ticks, stage advancement, and boss phases.
- [`src/entities/Player.ts`](file:///Users/ldt/Projects/game-1/src/entities/Player.ts): The player sprite class. Manages physics body boundaries, scales high-res vector graphics textures to `0.5`, and handles movement velocity based on virtual joystick angles.
- [`src/entities/Enemy.ts`](file:///Users/ldt/Projects/game-1/src/entities/Enemy.ts): The enemy sprite class. Houses AI states (`chase`, `leap_prep`, `leaping`, `shoot_prep`, `shooting`) for normal creeps and bosses. Employs parabolic leap physics, warning telegraph circles, projection guides, and custom boss characteristics.
- [`src/entities/Bullet.ts`](file:///Users/ldt/Projects/game-1/src/entities/Bullet.ts): Sprite wrapper for projectiles. Customizes properties such as projectile texture, damage calculations, and pierce counts.
- [`src/entities/Collectible.ts`](file:///Users/ldt/Projects/game-1/src/entities/Collectible.ts): In-game drops (XP gems, Gold coins, Hearts, Magnets, Shield Orbs, Time Freeze, Bombs, and Double XP stars) with custom visual tints and pickup collision behaviors.
- [`src/utils/TextureGenerator.ts`](file:///Users/ldt/Projects/game-1/src/utils/TextureGenerator.ts): Custom utility that programmatically generates high-definition raster textures using vector Phaser Graphics directly on canvas (e.g., characters, items, portals, and bosses). This eliminates the need for separate image assets and prevents pixel blurriness on mobile devices.
- [`src/utils/Joystick.ts`](file:///Users/ldt/Projects/game-1/src/utils/Joystick.ts): Virtual touch/drag joystick implementation for mobile screens. Translates screen coordinates to viewport scale vectors.
- [`src/utils/SkillManager.ts`](file:///Users/ldt/Projects/game-1/src/utils/SkillManager.ts): Handles level-up skill selections (Attack Speed, Move Speed/Magnet radius, Damage Thorns, MultiShot, Orbiting Shields, and Lightning Strikes) and applies their stats calculations back to the scene.

---

## ⚙️ Core Systems & Mechanics

### 1. Permanent Upgrades & Save System
Stats upgrades bought in the Shop (Max HP, Move Speed, and Bullet Damage) are persistent across sessions. The system reads and writes to `localStorage` safely via:
- `getSaveData(key, defaultValue)`
- `saveKeyData(key, value)`
- `getSaveString(key, defaultValue)`
- `saveString(key, value)`
If a sandboxed environment throws a `SecurityError`, the game gracefully switches to `memoryStorage` to prevent crash loops.

### 2. Character Classes & Base Values
| Class (Hệ) | Weapon | Key Characteristic | Base HP | Base Speed | Base DMG | Pierce |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Hiệp Sĩ (Knight)** 🛡️ | Arc Swords | Tanky, wide-reach melee | 130 | 190 | 14 | 2 |
| **Pháp Sư (Mage)** 🔮 | Fireball AoE | High damage splash explosive | 80 | 205 | 25 | 1 |
| **Cung Thủ (Ranger)** 🎯 | Penetration | Highly mobile piercing projectile | 100 | 240 | 10 | 1 |

### 3. In-Game Skill Upgrades
During a run, collecting green XP gems triggers a Level Up. Time is frozen, and `SkillManager` presents three randomly selected skills:
- **⚡ Tốc độ đánh**: Reduces attack cooldown by 15% (multiplicative).
- **👟 Giày siêu tốc**: Increases movement speed by 20% and expands item attraction radius.
- **🛡️ Giáp phản đòn**: Reflects 22% of received damage to attacking enemies.
- **🌀 Đạn chùm**: Fires additional projectiles in a spread format.
- **💎 Vòng xoáy bảo vệ**: Spawns orbiting shields that damage intersecting targets.
- **🌩️ Thiên phạt sấm sét**: Strikes random enemies with lightning every 3 seconds, slowing them down.

### 4. Boss AI, Scaling, and Stages
- The run scales in difficulty over time. Every 30 seconds, a message pops up saying "Quái vật bắt đầu phẫn nộ!" and difficulty increases.
- At **50 seconds** of each stage, all normal mobs are cleared, and a **Stage Boss** spawns:
  - **Stage 1 Boss**: *Vua Golem Sừng Đỏ* or *Quỷ Sừng Sét Thượng Cổ*.
  - **Stage 2 Boss**: *Dơi Bóng Tối Ác Quỷ* or *Bá Chủ Tim Hắc Ám*.
  - **Stage 3 Boss**: *Quỷ Lửa Ma Thuật* or *Rồng Tinh Thể Khổng Lồ*.
- Bosses utilize warning telegraph indicators (such as red circles) to signal leap attacks, projectile rings, or lightning storms.
- Defeating a Boss spawns a **Portal** (`portal_texture`). Stepping into it advances the player to the next Stage (changing grid background style) or triggers a Victory screen (Stage 3).

### 5. Collectible Special Items
Occasionally, defeating enemies drops special items:
- **XP Gem / Gold Coin**: Experience and gold.
- **Heart**: Restores a portion of HP.
- **Magnet**: Pulls all drops on the map towards the player.
- **Shield Item**: Spawns a temporary invulnerable forcefield.
- **Freeze Clock**: Freezes all enemies for a few seconds.
- **Bomb**: Instantly destroys all active enemies on screen.
- **Double XP Star**: Grants double XP for 10 seconds.

---

## 🛠️ Build and Development Scripts

To compile and launch the project:
- **Start Development Server**: `npm run dev` (Runs Vite with `--host` to allow local network access, usually on port `http://localhost:8000` or `8001`).
- **Production Build**: `npm run build` (Runs `tsc` compiler check and packages chunks into the `dist/` directory).
- **Preview Production Build**: `npm run preview` (Launches local server to test files in the `dist` folder).

---

## 💡 Key Design Patterns
1. **HTML overlay HUD**: Rather than generating complex UI elements inside Phaser canvas (which is difficult to format on mobile), the UI leverages standard responsive HTML elements positioned over the canvas via absolute layouts.
2. **High-DPI procedurally generated sprites**: Sprites are rendered dynamically on runtime load at `2x` resolution using canvas vector shapes and scaled down to `0.5` scale. This keeps visuals extremely sharp on mobile Retina displays without wasting download bandwidth on image sheets.
3. **Global Error Listener**: A crash barrier script runs inside the head of `index.html`. Uncaught errors are immediately caught and printed in a red banner at the top of the viewport, enabling instant diagnostics.
