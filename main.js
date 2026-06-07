// ============================================================
// main.js — Phaser 4 Game Configuration & Boot
// Math Slam: Basketball Jam
// Phaser 4.1.0 is loaded globally via <script> in index.html
// ============================================================

// Import all scenes (ES modules — Phaser is already on window)
import { BootScene }     from './src/scenes/BootScene.js';
import { MenuScene }     from './src/scenes/MenuScene.js';
import { PlayScene }     from './src/scenes/PlayScene.js';
import { HudScene }      from './src/scenes/HudScene.js';
import { GameOverScene } from './src/scenes/GameOverScene.js';

// ── Game Configuration ─────────────────────────────────── //

const config = {
  type: Phaser.AUTO,
  width: 1280,
  height: 720,
  backgroundColor: '#1A1A2E',

  // DOM overlay support
  dom: {
    createContainer: true
  },

  // Responsive scaling — letterbox 16:9
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    parent: 'game-container',
    width: 1280,
    height: 720
  },

  // Physics
  physics: {
    default: 'arcade',
    arcade: {
      debug: false,
      gravity: { y: 0 }
    }
  },

  // Rendering
  render: {
    antialias: true,
    pixelArt: false,
    roundPixels: false
  },

  // All scenes
  scene: [
    BootScene,
    MenuScene,
    PlayScene,
    HudScene,
    GameOverScene
  ]
};

// ── Boot the Game ──────────────────────────────────────── //

function startGame() {
  // Create required DOM elements if missing
  _ensureMenuScreen();
  _ensureGameOverScreen();
  _ensureCountdownOverlay();

  const game = new Phaser.Game(config);
  window.__game = game;

  // Global error handler
  window.addEventListener('error', (e) => {
    console.error('[Math Slam] Error:', e.message, 'at', e.filename, ':', e.lineno);
  });

  // Visibility change — pause audio on tab hide
  document.addEventListener('visibilitychange', () => {
    if (!window.gameAudio || !window.gameAudio._ctx) return;
    window.gameAudio._musicGain.gain.value = document.hidden ? 0 : window.gameAudio.musicVolume;
  });
}

// ── DOM Element Helpers ────────────────────────────────── //

function _ensureMenuScreen() {
  if (!document.getElementById('menu-screen')) {
    const div = document.createElement('div');
    div.id = 'menu-screen';
    div.style.display = 'none';
    document.body.appendChild(div);
  }
}

function _ensureGameOverScreen() {
  if (!document.getElementById('gameover-screen')) {
    const div = document.createElement('div');
    div.id = 'gameover-screen';
    document.body.appendChild(div);
  }
}

function _ensureCountdownOverlay() {
  if (!document.getElementById('countdown-overlay')) {
    const div = document.createElement('div');
    div.id = 'countdown-overlay';
    document.body.appendChild(div);
  }
}

// Start game when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', startGame);
} else {
  startGame();
}
