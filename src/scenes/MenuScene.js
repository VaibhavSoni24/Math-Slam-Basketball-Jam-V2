// ============================================================
// MenuScene.js — Title screen with animated background,
// mode/tier selection, and settings modal
// ============================================================

import { AudioManager } from '../game/AudioManager.js';

export class MenuScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MenuScene' });
    this.selectedMode = 'solo';
    this.selectedTier = 'pro';
    this._menuBuilt    = false;
  }

  create() {
    const { width, height } = this.scale;

    // Init audio (persists as global singleton)
    if (!window.gameAudio) {
      window.gameAudio = new AudioManager();
    }
    // Safe async init — won't auto-play until user gesture
    document.addEventListener('click', async () => {
      await window.gameAudio.init();
    }, { once: true });

    // ── Canvas Background ─────────────────────────────────── //
    this._drawBackground(width, height);

    // ── Clean up any leftover game DOM ────────────────────── //
    this._cleanupGameDOM();

    // ── Build Menu DOM ────────────────────────────────────── //
    this._buildMenuDOM();
  }

  _cleanupGameDOM() {
    // Hide HUD
    const hud = document.getElementById('hud-overlay');
    if (hud) { hud.className = 'hud-hidden'; hud.innerHTML = ''; }

    // Hide countdown
    const cd = document.getElementById('countdown-overlay');
    if (cd)  cd.className = '';

    // Hide gameover
    const go = document.getElementById('gameover-screen');
    if (go)  go.className = '';
  }

  _drawBackground(width, height) {
    // Dark gradient background
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x0a0a1e, 0x0a0a1e, 0x0F3460, 0x1A1A2E, 1);
    bg.fillRect(0, 0, width, height);

    // Use court_bg if loaded
    if (this.textures.exists('court_bg')) {
      const court = this.add.image(width / 2, height / 2, 'court_bg')
        .setDisplaySize(width, height)
        .setAlpha(0.18);
    }

    // Floating particles
    for (let i = 0; i < 10; i++) {
      const dot = this.add.circle(
        Phaser.Math.Between(60, width - 60),
        Phaser.Math.Between(60, height - 60),
        Phaser.Math.Between(2, 5),
        i % 2 === 0 ? 0xE85D04 : 0x1A6FBF,
        Phaser.Math.FloatBetween(0.15, 0.35)
      );
      this.tweens.add({
        targets: dot,
        y: dot.y - Phaser.Math.Between(80, 180),
        alpha: 0,
        duration: Phaser.Math.Between(2500, 5000),
        delay: Phaser.Math.Between(0, 3000),
        repeat: -1,
        onRepeat: () => {
          dot.y = Phaser.Math.Between(height - 80, height);
          dot.x = Phaser.Math.Between(60, width - 60);
          dot.alpha = Phaser.Math.FloatBetween(0.15, 0.35);
        }
      });
    }

    // Animated ball_idle on canvas
    if (this.textures.exists('ball_idle')) {
      const ballImg = this.add.image(width / 2, 160, 'ball_idle')
        .setDisplaySize(90, 90)
        .setAlpha(0.6);
      this.tweens.add({
        targets: ballImg,
        y: 148,
        angle: 10,
        duration: 1600,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });
    }
  }

  _buildMenuDOM() {
    let el = document.getElementById('menu-screen');
    if (!el) {
      el = document.createElement('div');
      el.id = 'menu-screen';
      document.body.appendChild(el);
    }

    el.innerHTML = `
      <div class="menu-logo" id="menu-logo">
        <div class="logo-top">Sports Academy Games</div>
        <div class="logo-main">MATH SLAM</div>
        <div class="logo-sub">BASKETBALL JAM</div>
        <div class="logo-tagline">"Solve it first. Shoot it fast. Win the court."</div>
      </div>

      <div class="menu-panel" id="menu-panel">
        <!-- Mode Selection -->
        <div class="menu-section-label">Select Mode</div>
        <div class="mode-selector">
          <button class="mode-btn selected" data-mode="solo">
            <span class="mode-btn-icon">🏀</span>
            <span class="mode-btn-label">SOLO</span>
            <span class="mode-btn-sub">vs CPU</span>
          </button>
          <button class="mode-btn" data-mode="local2p">
            <span class="mode-btn-icon">👥</span>
            <span class="mode-btn-label">2 PLAYER</span>
            <span class="mode-btn-sub">Same device</span>
          </button>
          <button class="mode-btn" data-mode="flat">
            <span class="mode-btn-icon">📊</span>
            <span class="mode-btn-label">PRACTICE</span>
            <span class="mode-btn-sub">No pressure</span>
          </button>
        </div>

        <!-- Tier Selection -->
        <div class="menu-section-label">Select Level</div>
        <div class="tier-selector">
          <button class="tier-btn" data-tier="varsity">
            <span class="tier-badge">VARSITY</span>
            <span class="tier-name">Add / Sub</span>
            <span class="tier-grade">Grades 2–3</span>
          </button>
          <button class="tier-btn selected" data-tier="pro">
            <span class="tier-badge">⭐ PRO</span>
            <span class="tier-name">× ÷ Facts</span>
            <span class="tier-grade">Grades 3–4</span>
          </button>
          <button class="tier-btn" data-tier="allstar">
            <span class="tier-badge">ALL-STAR</span>
            <span class="tier-name">Fractions</span>
            <span class="tier-grade">Grades 5–6</span>
          </button>
        </div>

        <!-- Play Button -->
        <button class="play-btn" id="play-btn">▶ PLAY NOW</button>

        <!-- Settings Link -->
        <div class="menu-settings-link">
          <button class="settings-link-btn" id="open-settings-btn">⚙️ Settings</button>
        </div>
      </div>

      <!-- Settings Modal -->
      <div class="settings-modal" id="settings-modal">
        <div class="settings-panel">
          <div class="settings-title">⚙️ Settings</div>

          <div class="settings-row">
            <label class="settings-label">🎵 Music Volume</label>
            <input type="range" class="vol-slider" id="music-vol" min="0" max="1" step="0.05" value="0.45" />
            <span class="vol-val" id="music-vol-val">45%</span>
          </div>

          <div class="settings-row">
            <label class="settings-label">🔊 SFX Volume</label>
            <input type="range" class="vol-slider" id="sfx-vol" min="0" max="1" step="0.05" value="0.80" />
            <span class="vol-val" id="sfx-vol-val">80%</span>
          </div>

          <button class="settings-close-btn" id="close-settings-btn">✓ Done</button>
        </div>
      </div>
    `;

    el.style.display = 'flex';
    el.style.opacity = '1';
    el.style.pointerEvents = 'auto';

    // ── Wire mode buttons ─────────────────────────────────── //
    el.querySelectorAll('.mode-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        el.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        this.selectedMode = btn.dataset.mode;
        window.gameAudio?.playTick?.();
      });
    });

    // ── Wire tier buttons ─────────────────────────────────── //
    el.querySelectorAll('.tier-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        el.querySelectorAll('.tier-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        this.selectedTier = btn.dataset.tier;
        window.gameAudio?.playTick?.();
      });
    });

    // ── Play button ───────────────────────────────────────── //
    document.getElementById('play-btn').addEventListener('click', async () => {
      await window.gameAudio.init();
      window.gameAudio.playCountdownGo();
      this._startGame();
    });

    // ── Settings ──────────────────────────────────────────── //
    document.getElementById('open-settings-btn').addEventListener('click', () => {
      document.getElementById('settings-modal').classList.add('show');
    });
    document.getElementById('close-settings-btn').addEventListener('click', () => {
      document.getElementById('settings-modal').classList.remove('show');
    });

    const musicSlider = document.getElementById('music-vol');
    const sfxSlider   = document.getElementById('sfx-vol');

    musicSlider.addEventListener('input', () => {
      const v = parseFloat(musicSlider.value);
      document.getElementById('music-vol-val').textContent = Math.round(v * 100) + '%';
      window.gameAudio?.setMusicVolume?.(v);
    });

    sfxSlider.addEventListener('input', () => {
      const v = parseFloat(sfxSlider.value);
      document.getElementById('sfx-vol-val').textContent = Math.round(v * 100) + '%';
      window.gameAudio?.setSfxVolume?.(v);
    });
  }

  _startGame() {
    const el = document.getElementById('menu-screen');
    if (el) {
      el.style.transition = 'opacity 0.4s ease';
      el.style.opacity = '0';
      el.style.pointerEvents = 'none';
    }

    this.time.delayedCall(420, () => {
      if (el) el.style.display = 'none';

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

  update() {}
}
