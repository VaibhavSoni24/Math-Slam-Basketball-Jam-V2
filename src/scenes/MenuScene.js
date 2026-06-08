// ============================================================
// MenuScene.js — Rich title screen with player showcase,
// name input, options toggle, settings modal
// ============================================================

import { AudioManager } from '../game/AudioManager.js';

export class MenuScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MenuScene' });
    this.selectedMode    = 'solo';
    this.selectedTier    = 'pro';
    this.showOptions     = true;
    this.p1Name          = '';
    this.p2Name          = '';
  }

  create() {
    const { width, height } = this.scale;

    if (!window.gameAudio) window.gameAudio = new AudioManager();
    document.addEventListener('click', async () => { await window.gameAudio.init(); }, { once: true });

    this._drawBackground(width, height);
    this._cleanupGameDOM();
    this._buildMenuDOM();
  }

  _cleanupGameDOM() {
    const hud = document.getElementById('hud-overlay');
    if (hud) { hud.className = 'hud-hidden'; hud.innerHTML = ''; }
    const cd = document.getElementById('countdown-overlay');
    if (cd)  cd.className = '';
    const go = document.getElementById('gameover-screen');
    if (go)  go.className = '';
  }

  _drawBackground(width, height) {
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x060614, 0x060614, 0x0F3460, 0x1A1A2E, 1);
    bg.fillRect(0, 0, width, height);

    // Faint court background
    if (this.textures.exists('court_bg')) {
      this.add.image(width / 2, height / 2, 'court_bg')
        .setDisplaySize(width, height).setAlpha(0.10);
    }

    // Floating orbs
    for (let i = 0; i < 14; i++) {
      const r   = Phaser.Math.Between(2, 6);
      const dot = this.add.circle(
        Phaser.Math.Between(40, width - 40),
        Phaser.Math.Between(40, height - 40),
        r,
        i % 3 === 0 ? 0xE85D04 : i % 3 === 1 ? 0x1A6FBF : 0xFFD700,
        Phaser.Math.FloatBetween(0.08, 0.28)
      );
      this.tweens.add({
        targets: dot, y: dot.y - Phaser.Math.Between(60, 200),
        alpha: 0, duration: Phaser.Math.Between(2000, 5500),
        delay: Phaser.Math.Between(0, 3500), repeat: -1,
        onRepeat: () => {
          dot.y     = Phaser.Math.Between(height - 60, height + 20);
          dot.x     = Phaser.Math.Between(40, width - 40);
          dot.alpha = Phaser.Math.FloatBetween(0.08, 0.28);
        }
      });
    }

    // Stars sprinkled around
    if (this.textures.exists('star')) {
      for (let i = 0; i < 8; i++) {
        const s = this.add.image(
          Phaser.Math.Between(40, width - 40),
          Phaser.Math.Between(40, height - 40),
          'star'
        ).setDisplaySize(
          Phaser.Math.Between(18, 40),
          Phaser.Math.Between(18, 40)
        ).setAlpha(Phaser.Math.FloatBetween(0.08, 0.22));
        this.tweens.add({
          targets: s, alpha: 0, angle: 180,
          duration: Phaser.Math.Between(2500, 6000),
          delay:    Phaser.Math.Between(0, 4000), repeat: -1,
          onRepeat: () => { s.alpha = Phaser.Math.FloatBetween(0.08, 0.22); }
        });
      }
    }

    // Player 1 showcase (left)
    if (this.textures.exists('p1_idle')) {
      const p1 = this.add.image(130, height / 2 + 30, 'p1_idle')
        .setDisplaySize(180, 220)
        .setAlpha(0.55)
        .setFlipX(true); // face center
      this.tweens.add({
        targets: p1, y: p1.y - 10, duration: 2200, yoyo: true, repeat: -1, ease: 'Sine.easeInOut'
      });
    }

    // Player 2 showcase (right)
    if (this.textures.exists('p2_idle')) {
      const p2 = this.add.image(width - 130, height / 2 + 30, 'p2_idle')
        .setDisplaySize(180, 220)
        .setAlpha(0.55);
      this.tweens.add({
        targets: p2, y: p2.y - 10, duration: 2400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
        delay: 200
      });
    }

    // Bouncing ball preview (center-top)
    if (this.textures.exists('ball_idle')) {
      const b = this.add.image(width / 2, 68, 'ball_idle')
        .setDisplaySize(72, 72).setAlpha(0.75);
      this.tweens.add({
        targets: b, y: 58, angle: 12, duration: 1500, yoyo: true, repeat: -1, ease: 'Sine.easeInOut'
      });
    }
  }

  _buildMenuDOM() {
    let el = document.getElementById('menu-screen');
    if (!el) { el = document.createElement('div'); el.id = 'menu-screen'; document.body.appendChild(el); }

    el.innerHTML = `
      <!-- LOGO -->
      <div class="menu-logo">
        <div class="logo-top">⭐ Sports Academy Games ⭐</div>
        <div class="logo-main">MATH SLAM</div>
        <div class="logo-sub">BASKETBALL JAM</div>
        <div class="logo-tagline">"Solve it first. Shoot it fast. Win the court."</div>
      </div>

      <!-- MAIN PANEL -->
      <div class="menu-panel" id="menu-panel">

        <!-- MODE -->
        <div class="menu-row-label">🏆 Game Mode</div>
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

        <!-- TIER -->
        <div class="menu-row-label">🎓 Difficulty</div>
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

        <!-- PLAYER NAMES -->
        <div class="menu-row-label">📝 Player Names</div>
        <div class="name-row" id="name-row">
          <div class="name-col">
            <label class="name-label p1-name">🟠 Player 1</label>
            <input type="text" class="name-input" id="p1-name-input" placeholder="Your name..." maxlength="12" autocomplete="off" />
          </div>
          <div class="name-col p2-name-col hidden" id="p2-name-col">
            <label class="name-label p2-name">🔵 Player 2</label>
            <input type="text" class="name-input" id="p2-name-input" placeholder="Player 2 name..." maxlength="12" autocomplete="off" />
          </div>
        </div>

        <!-- OPTIONS TOGGLE -->
        <div class="options-toggle-row">
          <span class="toggle-label">🔢 Show Answer Options</span>
          <label class="toggle-switch">
            <input type="checkbox" id="options-toggle" checked />
            <span class="toggle-slider"></span>
          </label>
          <span class="toggle-hint" id="toggle-hint">ON — choices shown</span>
        </div>

        <!-- PLAY -->
        <button class="play-btn" id="play-btn">▶ PLAY NOW</button>

        <!-- SETTINGS -->
        <div class="menu-settings-link">
          <button class="settings-link-btn" id="open-settings-btn">⚙️ Settings</button>
        </div>
      </div>

      <!-- SETTINGS MODAL -->
      <div class="settings-modal" id="settings-modal">
        <div class="settings-panel">
          <div class="settings-title">⚙️ Settings</div>
          <div class="settings-row">
            <label class="settings-label">🎵 Music</label>
            <input type="range" class="vol-slider" id="music-vol" min="0" max="1" step="0.05" value="0.45" />
            <span class="vol-val" id="music-vol-val">45%</span>
          </div>
          <div class="settings-row">
            <label class="settings-label">🔊 SFX</label>
            <input type="range" class="vol-slider" id="sfx-vol" min="0" max="1" step="0.05" value="0.80" />
            <span class="vol-val" id="sfx-vol-val">80%</span>
          </div>
          <button class="settings-close-btn" id="close-settings-btn">✓ Done</button>
        </div>
      </div>
    `;

    el.style.display      = 'flex';
    el.style.opacity      = '1';
    el.style.pointerEvents = 'auto';

    // ── Mode buttons ─────────────────────────────────────── //
    el.querySelectorAll('.mode-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        el.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        this.selectedMode = btn.dataset.mode;

        // Show P2 name field only in 2P mode
        const p2col = document.getElementById('p2-name-col');
        if (p2col) {
          if (this.selectedMode === 'local2p') p2col.classList.remove('hidden');
          else p2col.classList.add('hidden');
        }
      });
    });

    // ── Tier buttons ─────────────────────────────────────── //
    el.querySelectorAll('.tier-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        el.querySelectorAll('.tier-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        this.selectedTier = btn.dataset.tier;
      });
    });

    // ── Options toggle ────────────────────────────────────── //
    const optToggle = document.getElementById('options-toggle');
    const toggleHint = document.getElementById('toggle-hint');
    optToggle.addEventListener('change', () => {
      this.showOptions = optToggle.checked;
      toggleHint.textContent = this.showOptions ? 'ON — choices shown' : 'OFF — type your answer';
    });

    // ── Play button ───────────────────────────────────────── //
    document.getElementById('play-btn').addEventListener('click', async () => {
      await window.gameAudio.init();
      window.gameAudio.playCountdownGo?.();
      this._startGame();
    });

    // ── Settings ──────────────────────────────────────────── //
    document.getElementById('open-settings-btn').addEventListener('click', () => {
      document.getElementById('settings-modal').classList.add('show');
    });
    document.getElementById('close-settings-btn').addEventListener('click', () => {
      document.getElementById('settings-modal').classList.remove('show');
    });

    document.getElementById('music-vol').addEventListener('input', e => {
      const v = parseFloat(e.target.value);
      document.getElementById('music-vol-val').textContent = Math.round(v * 100) + '%';
      window.gameAudio?.setMusicVolume?.(v);
    });
    document.getElementById('sfx-vol').addEventListener('input', e => {
      const v = parseFloat(e.target.value);
      document.getElementById('sfx-vol-val').textContent = Math.round(v * 100) + '%';
      window.gameAudio?.setSfxVolume?.(v);
    });
  }

  _startGame() {
    // Read name inputs
    const p1Input = document.getElementById('p1-name-input');
    const p2Input = document.getElementById('p2-name-input');
    this.p1Name = (p1Input?.value.trim() || 'PLAYER 1').toUpperCase();
    this.p2Name = this.selectedMode === 'local2p'
      ? (p2Input?.value.trim() || 'PLAYER 2').toUpperCase()
      : 'CPU SHAQ';

    const el = document.getElementById('menu-screen');
    if (el) {
      el.style.transition = 'opacity 0.4s ease';
      el.style.opacity = '0';
      el.style.pointerEvents = 'none';
    }

    this.time.delayedCall(420, () => {
      if (el) el.style.display = 'none';

      const data = {
        mode:        this.selectedMode,
        tier:        this.selectedTier,
        showOptions: this.showOptions,
        p1Name:      this.p1Name,
        p2Name:      this.p2Name
      };

      this.scene.start('PlayScene', data);
      this.scene.launch('HudScene', data);
    });
  }

  update() {}
}
