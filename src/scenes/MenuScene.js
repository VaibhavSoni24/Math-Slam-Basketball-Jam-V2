// ============================================================
// MenuScene.js — Full-page 3-column menu layout
// Left: Game Mode | Center: Difficulty | Right: Player + Start
// Settings at bottom-left with options toggle inside it
// ============================================================

import { AudioManager } from '../game/AudioManager.js';

export class MenuScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MenuScene' });
    this.selectedMode    = 'solo';
    this.selectedTier    = 'pro';
    this.showOptions     = true;   // persists via window global
    this.p1Name          = '';
    this.p2Name          = '';
  }

  create() {
    const { width, height } = this.scale;

    if (!window.gameAudio) window.gameAudio = new AudioManager();
    document.addEventListener('click', async () => { await window.gameAudio.init(); }, { once: true });

    // Restore persisted showOptions state
    if (window.__menuState) {
      this.selectedMode = window.__menuState.mode || 'solo';
      this.selectedTier = window.__menuState.tier || 'pro';
      this.showOptions  = window.__menuState.showOptions !== undefined
        ? window.__menuState.showOptions : true;
      this.p1Name       = window.__menuState.p1Name || '';
      this.p2Name       = window.__menuState.p2Name || '';
    }

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

    if (this.textures.exists('court_bg')) {
      this.add.image(width / 2, height / 2, 'court_bg')
        .setDisplaySize(width, height).setAlpha(0.08);
    }

    // Floating orbs
    for (let i = 0; i < 16; i++) {
      const r = Phaser.Math.Between(2, 6);
      const dot = this.add.circle(
        Phaser.Math.Between(20, width - 20),
        Phaser.Math.Between(20, height - 20),
        r,
        i % 3 === 0 ? 0xE85D04 : i % 3 === 1 ? 0x1A6FBF : 0xFFD700,
        Phaser.Math.FloatBetween(0.06, 0.22)
      );
      this.tweens.add({
        targets: dot, y: dot.y - Phaser.Math.Between(80, 200),
        alpha: 0, duration: Phaser.Math.Between(2500, 6000),
        delay: Phaser.Math.Between(0, 4000), repeat: -1,
        onRepeat: () => {
          dot.y = Phaser.Math.Between(height - 80, height + 20);
          dot.x = Phaser.Math.Between(20, width - 20);
          dot.alpha = Phaser.Math.FloatBetween(0.06, 0.22);
        }
      });
    }

    // P1 showcase — left side, faces right (default)
    if (this.textures.exists('p1_idle')) {
      const p1 = this.add.image(width * 0.08, height * 0.52, 'p1_idle')
        .setDisplaySize(200, 250).setAlpha(0.7);
      this.tweens.add({ targets: p1, y: p1.y - 12, duration: 2200, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }

    // P2 showcase — right side, faces left (default)
    if (this.textures.exists('p2_idle')) {
      const p2 = this.add.image(width * 0.92, height * 0.52, 'p2_idle')
        .setDisplaySize(200, 250).setAlpha(0.7);
      this.tweens.add({ targets: p2, y: p2.y - 12, duration: 2400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut', delay: 300 });
    }

    // Floating stars
    const starCount = 12;
    for (let i = 0; i < starCount; i++) {
      const x = Phaser.Math.Between(30, width - 30);
      const y = Phaser.Math.Between(30, height - 30);
      const star = this.add.text(x, y, '⭐', {
        fontSize: `${Phaser.Math.Between(10, 22)}px`
      }).setAlpha(Phaser.Math.FloatBetween(0.04, 0.14)).setOrigin(0.5);
      this.tweens.add({
        targets: star, alpha: 0, y: star.y - 60, angle: 180,
        duration: Phaser.Math.Between(3000, 7000),
        delay: Phaser.Math.Between(0, 5000), repeat: -1,
        onRepeat: () => {
          star.x = Phaser.Math.Between(30, width - 30);
          star.y = Phaser.Math.Between(height * 0.7, height);
          star.alpha = Phaser.Math.FloatBetween(0.04, 0.14);
        }
      });
    }

    // Bouncing ball between columns
    if (this.textures.exists('ball_idle')) {
      const b = this.add.image(width / 2, 48, 'ball_idle')
        .setDisplaySize(60, 60).setAlpha(0.65);
      this.tweens.add({ targets: b, y: 38, angle: 10, duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }
  }

  _buildMenuDOM() {
    let el = document.getElementById('menu-screen');
    if (!el) { el = document.createElement('div'); el.id = 'menu-screen'; document.body.appendChild(el); }

    el.innerHTML = `
      <!-- 3-COLUMN FULL-PAGE LAYOUT -->
      <div class="menu-fullpage">

        <!-- LOGO BAR (top, full width) -->
        <div class="menu-header">
          <div class="logo-eyebrow">⭐ Sports Academy Games ⭐</div>
          <div class="logo-title">MATH SLAM <span class="logo-sub">BASKETBALL JAM</span></div>
          <div class="logo-tagline">"Solve it first. Shoot it fast. Win the court."</div>
        </div>

        <!-- 3 COLUMNS -->
        <div class="menu-cols">

          <!-- LEFT: Game Mode -->
          <div class="menu-col menu-col-left">
            <div class="col-heading">
              <span class="col-icon">🏆</span>
              <span>Game Mode</span>
            </div>
            <div class="col-divider"></div>
            <div class="mode-list">
              <button class="mode-card ${this.selectedMode === 'solo' ? 'selected' : ''}" data-mode="solo">
                <span class="mc-icon">🏀</span>
                <span class="mc-title">SOLO</span>
                <span class="mc-desc">Play vs CPU opponent</span>
              </button>
              <button class="mode-card ${this.selectedMode === 'local2p' ? 'selected' : ''}" data-mode="local2p">
                <span class="mc-icon">👥</span>
                <span class="mc-title">2 PLAYER</span>
                <span class="mc-desc">Same device, take turns</span>
              </button>
              <button class="mode-card ${this.selectedMode === 'flat' ? 'selected' : ''}" data-mode="flat">
                <span class="mc-icon">📊</span>
                <span class="mc-title">PRACTICE</span>
                <span class="mc-desc">No pressure, 20s rounds</span>
              </button>
            </div>
          </div>

          <!-- CENTER: Difficulty -->
          <div class="menu-col menu-col-center">
            <div class="col-heading">
              <span class="col-icon">🎓</span>
              <span>Difficulty</span>
            </div>
            <div class="col-divider"></div>
            <div class="tier-list">
              <button class="tier-card ${this.selectedTier === 'varsity' ? 'selected' : ''}" data-tier="varsity">
                <div class="tc-badge varsity-badge">VARSITY</div>
                <div class="tc-title">Add &amp; Subtract</div>
                <div class="tc-grade">Grades 2–3</div>
                <div class="tc-desc">2-digit numbers, simple ops</div>
              </button>
              <button class="tier-card ${this.selectedTier === 'pro' ? 'selected' : ''}" data-tier="pro">
                <div class="tc-badge pro-badge">⭐ PRO</div>
                <div class="tc-title">Multiply &amp; Divide</div>
                <div class="tc-grade">Grades 3–4</div>
                <div class="tc-desc">Times tables, basic division</div>
              </button>
              <button class="tier-card ${this.selectedTier === 'allstar' ? 'selected' : ''}" data-tier="allstar">
                <div class="tc-badge allstar-badge">ALL-STAR</div>
                <div class="tc-title">Fractions</div>
                <div class="tc-grade">Grades 5–6</div>
                <div class="tc-desc">Fractions, decimals, mixed ops</div>
              </button>
            </div>
          </div>

          <!-- RIGHT: Player + Start -->
          <div class="menu-col menu-col-right">
            <div class="col-heading">
              <span class="col-icon">📝</span>
              <span>Player Setup</span>
            </div>
            <div class="col-divider"></div>

            <!-- P1 -->
            <div class="player-setup-card p1-setup">
              <div class="ps-avatar">🟠</div>
              <div class="ps-fields">
                <label class="ps-label p1-label">Player 1</label>
                <input type="text" class="ps-input" id="p1-name-input"
                  placeholder="Your name..." maxlength="12"
                  value="${this.p1Name}" autocomplete="off" />
              </div>
            </div>

            <!-- P2 (only visible in 2P) -->
            <div class="player-setup-card p2-setup hidden" id="p2-setup-card">
              <div class="ps-avatar">🔵</div>
              <div class="ps-fields">
                <label class="ps-label p2-label">Player 2</label>
                <input type="text" class="ps-input" id="p2-name-input"
                  placeholder="Player 2 name..." maxlength="12"
                  value="${this.p2Name}" autocomplete="off" />
              </div>
            </div>

            <!-- PLAY BUTTON -->
            <button class="play-btn-full" id="play-btn">▶ PLAY NOW</button>

            <!-- SELECTED INFO SUMMARY -->
            <div class="selection-summary" id="selection-summary">
              <span id="sum-mode">Solo vs CPU</span> · <span id="sum-tier">PRO</span>
            </div>
          </div>
        </div>

        <!-- SETTINGS BUTTON — bottom-left -->
        <button class="settings-fab" id="open-settings-btn">⚙️ Settings</button>
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

          <!-- OPTIONS TOGGLE inside settings -->
          <div class="settings-row settings-toggle-row">
            <label class="settings-label">🔢 Show Answer Options</label>
            <label class="toggle-switch">
              <input type="checkbox" id="options-toggle" ${this.showOptions ? 'checked' : ''} />
              <span class="toggle-slider"></span>
            </label>
            <span class="vol-val" id="toggle-hint-val">${this.showOptions ? 'ON' : 'OFF'}</span>
          </div>

          <button class="settings-close-btn" id="close-settings-btn">✓ Done</button>
        </div>
      </div>
    `;

    el.style.display       = 'block';
    el.style.opacity       = '1';
    el.style.pointerEvents = 'auto';

    // Restore 2P card visibility
    if (this.selectedMode === 'local2p') {
      document.getElementById('p2-setup-card')?.classList.remove('hidden');
    }

    this._updateSummary();
    this._wireEvents(el);
  }

  _wireEvents(el) {
    // Mode cards
    el.querySelectorAll('.mode-card').forEach(btn => {
      btn.addEventListener('click', () => {
        el.querySelectorAll('.mode-card').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        this.selectedMode = btn.dataset.mode;

        const p2card = document.getElementById('p2-setup-card');
        if (p2card) {
          p2card.classList.toggle('hidden', this.selectedMode !== 'local2p');
        }
        this._updateSummary();
      });
    });

    // Tier cards
    el.querySelectorAll('.tier-card').forEach(btn => {
      btn.addEventListener('click', () => {
        el.querySelectorAll('.tier-card').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        this.selectedTier = btn.dataset.tier;
        this._updateSummary();
      });
    });

    // Play button
    document.getElementById('play-btn').addEventListener('click', async () => {
      await window.gameAudio.init();
      window.gameAudio.playCountdownGo?.();
      this._startGame();
    });

    // Settings FAB
    document.getElementById('open-settings-btn').addEventListener('click', () => {
      document.getElementById('settings-modal').classList.add('show');
    });
    document.getElementById('close-settings-btn').addEventListener('click', () => {
      document.getElementById('settings-modal').classList.remove('show');
    });

    // Options toggle
    const optToggle = document.getElementById('options-toggle');
    const toggleVal = document.getElementById('toggle-hint-val');
    optToggle.addEventListener('change', () => {
      this.showOptions = optToggle.checked;
      if (toggleVal) toggleVal.textContent = this.showOptions ? 'ON' : 'OFF';
    });

    // Volume sliders
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

  _updateSummary() {
    const modeNames = { solo: 'Solo vs CPU', local2p: '2 Player', flat: 'Practice' };
    const tierNames = { varsity: 'VARSITY', pro: 'PRO', allstar: 'ALL-STAR' };
    const modeEl = document.getElementById('sum-mode');
    const tierEl = document.getElementById('sum-tier');
    if (modeEl) modeEl.textContent = modeNames[this.selectedMode] || 'Solo';
    if (tierEl) tierEl.textContent = tierNames[this.selectedTier] || 'PRO';
  }

  _startGame() {
    const p1Input = document.getElementById('p1-name-input');
    const p2Input = document.getElementById('p2-name-input');
    this.p1Name = (p1Input?.value.trim() || 'PLAYER 1').toUpperCase();
    this.p2Name = this.selectedMode === 'local2p'
      ? (p2Input?.value.trim() || 'PLAYER 2').toUpperCase()
      : 'CPU SHAQ';

    // Persist state so it survives returning from game
    window.__menuState = {
      mode:        this.selectedMode,
      tier:        this.selectedTier,
      showOptions: this.showOptions,
      p1Name:      this.p1Name,
      p2Name:      this.p2Name
    };

    const el = document.getElementById('menu-screen');
    if (el) {
      el.style.transition  = 'opacity 0.4s ease';
      el.style.opacity     = '0';
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
