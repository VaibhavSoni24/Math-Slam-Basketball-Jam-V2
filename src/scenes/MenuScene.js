// ============================================================
// MenuScene.js — Title screen with mode + tier selection
// Full animated menu: background, animated ball, mode buttons
// ============================================================

import { AudioManager } from '../game/AudioManager.js';

export class MenuScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MenuScene' });
    this.selectedMode = 'solo';
    this.selectedTier = 'pro';
    this._audio = null;
    this._menuEl = null;
  }

  create() {
    const { width, height } = this.scale;

    // Initialize audio (safe to call here; triggers on first play gesture)
    if (!window.gameAudio) {
      window.gameAudio = new AudioManager();
    }
    this._audio = window.gameAudio;

    // ── Canvas Background ─────────────────────────────────── //
    // Draw gradient background on canvas
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x0a0a1e, 0x0a0a1e, 0x0F3460, 0x1A1A2E, 1);
    bg.fillRect(0, 0, width, height);

    // Court lines decorative
    this._drawDecorativeLines();

    // Floating particles
    this._createParticles();

    // ── Build DOM Menu Overlay ─────────────────────────────── //
    this._buildMenuDOM();

    // Hide game HUD if it was showing
    const hudOverlay = document.getElementById('hud-overlay');
    if (hudOverlay) {
      hudOverlay.className = 'hud-hidden';
      hudOverlay.innerHTML = '';
    }

    // Hide gameover + countdown
    const gameOver = document.getElementById('gameover-screen');
    if (gameOver) gameOver.classList.remove('show');
    const countdown = document.getElementById('countdown-overlay');
    if (countdown) countdown.classList.remove('show');

    // Resume audio context after user interaction
    document.addEventListener('click', () => {
      this._audio.init();
    }, { once: true });
  }

  _drawDecorativeLines() {
    const { width, height } = this.scale;
    const g = this.add.graphics();
    g.lineStyle(1, 0xffffff, 0.04);

    // Center circle
    g.strokeCircle(width / 2, height / 2, 120);
    g.strokeCircle(width / 2, height / 2, 80);

    // Three point arc (left)
    g.beginPath();
    g.arc(80, height / 2, 200, -Math.PI / 2, Math.PI / 2);
    g.strokePath();

    // Three point arc (right)
    g.beginPath();
    g.arc(width - 80, height / 2, 200, Math.PI / 2, -Math.PI / 2);
    g.strokePath();

    // Free throw lanes
    g.strokeRect(0, height / 2 - 100, 180, 200);
    g.strokeRect(width - 180, height / 2 - 100, 180, 200);

    // Center line
    g.moveTo(width / 2, 0);
    g.lineTo(width / 2, height);
    g.strokePath();
  }

  _createParticles() {
    const { width, height } = this.scale;
    // Orange glowing dots floating upward
    const dots = [];
    for (let i = 0; i < 8; i++) {
      const dot = this.add.circle(
        Phaser.Math.Between(100, width - 100),
        Phaser.Math.Between(100, height - 100),
        Phaser.Math.Between(2, 6),
        i % 2 === 0 ? 0xE85D04 : 0x1A6FBF,
        0.3
      );
      dots.push(dot);
      this.tweens.add({
        targets: dot,
        y: dot.y - Phaser.Math.Between(80, 160),
        alpha: 0,
        duration: Phaser.Math.Between(2000, 4000),
        delay: Phaser.Math.Between(0, 2000),
        repeat: -1,
        yoyo: false,
        onRepeat: () => {
          dot.y = Phaser.Math.Between(height - 100, height);
          dot.x = Phaser.Math.Between(100, width - 100);
          dot.alpha = 0.3;
        }
      });
    }
  }

  _buildMenuDOM() {
    const container = document.getElementById('menu-screen');
    if (!container) {
      // Create the menu div if it doesn't exist
      const div = document.createElement('div');
      div.id = 'menu-screen';
      document.body.appendChild(div);
    }

    const el = document.getElementById('menu-screen');
    el.innerHTML = `
      <div class="menu-logo">
        <div class="logo-top">Sports Academy Games</div>
        <div class="menu-ball">🏀</div>
        <div class="logo-main">MATH SLAM</div>
        <div class="logo-sub">BASKETBALL JAM</div>
        <div class="logo-tagline">"Solve it first. Shoot it fast. Win the court."</div>
      </div>

      <div class="menu-panel">
        <!-- Mode Selection -->
        <div class="menu-section-label">Select Mode</div>
        <div class="mode-selector" data-testid="mode-selector">
          <button class="mode-btn selected" data-mode="solo" id="mode-solo" data-testid="mode-btn-solo">
            <span class="mode-btn-icon">🏀</span>
            <span class="mode-btn-label">SOLO</span>
            <span class="mode-btn-sub">vs CPU</span>
          </button>
          <button class="mode-btn" data-mode="local2p" id="mode-2p" data-testid="mode-btn-2p">
            <span class="mode-btn-icon">👥</span>
            <span class="mode-btn-label">2 PLAYER</span>
            <span class="mode-btn-sub">Same device</span>
          </button>
          <button class="mode-btn" data-mode="flat" id="mode-flat" data-testid="mode-btn-flat">
            <span class="mode-btn-icon">📊</span>
            <span class="mode-btn-label">PRACTICE</span>
            <span class="mode-btn-sub">No pressure</span>
          </button>
        </div>

        <!-- Tier Selection -->
        <div class="menu-section-label" style="margin-top:4px">Select Level</div>
        <div class="tier-selector" data-testid="tier-selector">
          <button class="tier-btn" data-tier="varsity" id="tier-varsity" data-testid="tier-btn-varsity">
            <span class="tier-badge">VARSITY</span>
            <span class="tier-name">Add / Sub</span>
            <span class="tier-grade">Grades 2–3</span>
          </button>
          <button class="tier-btn selected" data-tier="pro" id="tier-pro" data-testid="tier-btn-pro">
            <span class="tier-badge">⭐ PRO</span>
            <span class="tier-name">× ÷ Facts</span>
            <span class="tier-grade">Grades 3–4</span>
          </button>
          <button class="tier-btn" data-tier="allstar" id="tier-allstar" data-testid="tier-btn-allstar">
            <span class="tier-badge">ALL-STAR</span>
            <span class="tier-name">Fractions</span>
            <span class="tier-grade">Grades 5–6</span>
          </button>
        </div>

        <!-- Play Button -->
        <button class="play-btn" id="play-btn" data-testid="play-btn">
          ▶ PLAY NOW
        </button>
      </div>
    `;

    el.classList.remove('hidden');
    el.style.display = 'flex';

    // Wire events
    el.querySelectorAll('.mode-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        el.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        this.selectedMode = btn.dataset.mode;
        this._audio.init();
        this._audio.playTick();
      });
    });

    el.querySelectorAll('.tier-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        el.querySelectorAll('.tier-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        this.selectedTier = btn.dataset.tier;
        this._audio.init();
        this._audio.playTick();
      });
    });

    document.getElementById('play-btn').addEventListener('click', () => {
      this._audio.init();
      this._audio.playCountdownGo();
      this._startGame();
    });
  }

  _startGame() {
    // Fade out menu
    const el = document.getElementById('menu-screen');
    el.style.transition = 'opacity 0.4s ease';
    el.style.opacity = '0';

    this.time.delayedCall(400, () => {
      el.style.display = 'none';

      // Start the game scenes
      this.scene.start('PlayScene', {
        mode: this.selectedMode,
        tier: this.selectedTier
      });
      this.scene.launch('HudScene', {
        mode: this.selectedMode,
        tier: this.selectedTier
      });
    });
  }

  update() {
    // No per-frame logic needed for menu
  }
}
