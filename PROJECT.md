# Math Slam: Basketball Jam - Project Overview

## Tech Stack
- **Engine**: Phaser 4.1.0 (Loaded via CDN)
- **Styling**: Vanilla CSS (CSS Variables, Flexbox layouts)
- **DOM Overlay**: Phaser DOM Element support enabled (`parent`, `dom.createContainer: true`)
- **Assets**: Pixel-art 2D sprites, SVG fallbacks

## Architecture & Code Structure

The game architecture separates Phaser logic into standalone Scenes, using a robust event-driven system to communicate between the math engine, visual scenes, and HTML-based HUD.

### Root Files
- `index.html`: The entry point. Loads the Phaser CDN, KaTeX math library, and CSS. Contains the `#game-container` for the Canvas and `#hud-overlay` for the DOM HUD.
- `main.js`: Phaser configuration file. Initializes the game, registers scenes, and configures the responsive scale manager (`Phaser.Scale.FIT` with `CENTER_BOTH`).
- `style.css`: Contains all UI styling for DOM overlays (Menu, HUD, Game Over, Loading screen). Uses CSS variables for theming.

### Source Code (`/src`)

#### `/game` (Core Logic)
- **`AudioManager.js`**: Singleton service handling all sound effects and background music using HTML5 Audio.
- **`CPUPlayer.js`**: Handles CPU opponent behavior. Features a dynamic delay and accuracy scaling system based on the selected difficulty tier.
- **`MathEngine.js`**: Generates math problems (Addition, Subtraction, Multiplication, Division, Fractions) according to difficulty grade bands.
- **`ShotMechanic.js`**: The power bar oscillation system. Calculates shot power, identifies the target "zone" (Green, Yellow, Orange, Red), and determines the shot result probability.

#### `/scenes` (Phaser Scenes)
- **`BootScene.js`**: Handles asset preloading. Displays a premium loading screen with a bouncing basketball animation while fetching audio and images. Transitions to `MenuScene`.
- **`MenuScene.js`**: The main menu. Entirely DOM-based UI for selecting Game Mode (Solo, 2P, Practice) and Difficulty. Saves preferences and launches `PlayScene`.
- **`PlayScene.js`**: The core gameplay loop. Renders the court, players, and ball physics (using tweens). Emits events to `HudScene` when state changes (score, shot released, timer tick).
- **`HudScene.js`**: Pure DOM-based overlay scene running in parallel with `PlayScene`. Displays scores, streaks, power bar, and the math problem input fields. Listens to `PlayScene` events.
- **`GameOverScene.js`**: Semi-transparent overlay scene handling match-end statistics and replay functionality.

## State Management
- **Inter-Scene Communication**: The game relies heavily on Phaser's Event Emitter (`this.events.emit` / `this.events.on`) to pass data between the Canvas logic (`PlayScene`) and the DOM UI (`HudScene`).
- **Global State**: `window.gameAudio` retains the initialized audio context across scene restarts. `window.__menuState` caches the user's menu selections so they persist between matches.

## Deployment Notes
- Ready for static hosting (e.g., GitHub Pages).
- Uses relative paths for assets and CDN for library dependencies, avoiding the need for a build step or bundler. No local node server required.
