// ============================================================
// HudScene.js — DOM HUD overlay (additive scene)
// Manages: score, timer, lives, streak, problem stem, answer
// Communicates with PlayScene via scene events
// ============================================================

export class HudScene extends Phaser.Scene {
  constructor() {
    super({ key: 'HudScene' });
  }

  init(data) {
    this.gameMode = data.mode || 'solo';
    this.gameTier = data.tier || 'pro';
    this.p1Score = 0;
    this.p2Score = 0;
    this.p1Lives = 3;
    this.p2Lives = 3;
    this.p1Streak = 0;
    this.timerRemaining = 10;
    this.currentProblem = null;
    this.shotPhaseActive = false;
    this.powerValue = 0;
    this._powerBarInterval = null;
  }

  create() {
    // Build the DOM HUD
    this._buildHUD();

    // Subscribe to PlayScene events
    const play = this.scene.get('PlayScene');
    if (play) {
      play.events.on('new-problem',       this._onNewProblem, this);
      play.events.on('timer-tick',        this._onTimerTick, this);
      play.events.on('p1-verdict',        this._onP1Verdict, this);
      play.events.on('p2-verdict',        this._onP2Verdict, this);
      play.events.on('p1-scored',         this._onP1Scored, this);
      play.events.on('p2-scored',         this._onP2Scored, this);
      play.events.on('p1-lost-life',      this._onP1LostLife, this);
      play.events.on('p2-lost-life',      this._onP2LostLife, this);
      play.events.on('shot-phase-start',  this._onShotPhaseStart, this);
      play.events.on('shot-phase-end',    this._onShotPhaseEnd, this);
      play.events.on('power-update',      this._onPowerUpdate, this);
      play.events.on('wrong-answer',      this._onWrongAnswer, this);
      play.events.on('allow-retry',       this._onAllowRetry, this);
      play.events.on('hot-streak',        this._onHotStreak, this);
      play.events.on('timeout',           this._onTimeout, this);
      play.events.on('reveal-answer',     this._onRevealAnswer, this);
      play.events.on('show-possession',   this._onShowPossession, this);
      play.events.on('p1-status',         (d) => this._setP1Status(d), this);
      play.events.on('p2-status',         (d) => this._setP2Status(d), this);
      play.events.on('shot-result',       this._onShotResult, this);
      play.events.on('shot-miss',         this._onShotMiss, this);
      play.events.on('game-over',         this._onGameOver, this);
    }

    // Show HUD overlay
    const overlay = document.getElementById('hud-overlay');
    if (overlay) overlay.className = 'hud-visible';
  }

  // ── Build the full DOM HUD ─────────────────────────────── //

  _buildHUD() {
    const overlay = document.getElementById('hud-overlay');
    if (!overlay) return;

    overlay.innerHTML = `
      <!-- TOP STRIP -->
      <div class="hud-top">
        <!-- P1 Info -->
        <div class="hud-player-info p1">
          <div class="player-avatar" id="avatar-p1">🧑</div>
          <div class="player-score-block">
            <div class="player-name">YOU</div>
            <div class="player-score p1" id="p1-score" data-testid="p1-score">0</div>
            <div class="lives-row" id="p1-lives">
              <span class="life-icon">❤️</span>
              <span class="life-icon">❤️</span>
              <span class="life-icon">❤️</span>
            </div>
          </div>
        </div>

        <!-- Center: Timer + Round -->
        <div class="hud-center">
          <div class="timer-display" id="timer-display" data-testid="timer-display">10</div>
          <div class="round-indicator" id="round-indicator">ROUND 1 / 10</div>
          <div class="mode-badge" id="mode-badge">${this._getModeBadge()}</div>
        </div>

        <!-- P2 Info -->
        <div class="hud-player-info p2">
          <div class="player-score-block" style="text-align:right">
            <div class="player-name">${this.gameMode === 'local2p' ? 'P2' : 'CPU'}</div>
            <div class="player-score p2" id="p2-score" data-testid="p2-score">0</div>
            <div class="lives-row" style="justify-content:flex-end" id="p2-lives">
              <span class="life-icon">❤️</span>
              <span class="life-icon">❤️</span>
              <span class="life-icon">❤️</span>
            </div>
          </div>
          <div class="player-avatar p2" id="avatar-p2">${this.gameMode === 'local2p' ? '🧑' : '🤖'}</div>
        </div>
      </div>

      <!-- PROBLEM STEM -->
      <div class="hud-stem">
        <div class="stem-pill">
          <div class="stem-label">Solve the problem</div>
          <div class="stem-math" id="stem-math" data-testid="stem-math">
            Get ready...
          </div>
        </div>
      </div>

      <!-- LEFT PANEL: Opponent info (solo/vs mode) -->
      <div class="hud-left" id="hud-left" style="${this.gameMode === 'flat' ? 'display:none' : ''}">
        <div class="opponent-panel">
          <div class="opponent-label">Opponent</div>
          <div class="opponent-name" id="opp-name">${this.gameMode === 'local2p' ? 'P2' : 'CPU Shaq'}</div>
          <div class="opponent-score-val" id="opp-score">0</div>
          <div class="opponent-streak" id="opp-streak">🔥 0 streak</div>
          <div class="opponent-status thinking" id="opp-status">Waiting...</div>
        </div>
      </div>

      <!-- RIGHT PANEL: Power bar + streak -->
      <div class="hud-right">
        <!-- Streak -->
        <div class="streak-panel">
          <div class="streak-label">Streak</div>
          <div class="streak-count" id="streak-count">0</div>
          <div class="streak-fire" id="streak-fire">🔥</div>
        </div>

        <!-- Power bar -->
        <div class="power-bar-container hidden" id="power-bar" data-testid="power-bar">
          <div class="power-label">PWR</div>
          <div class="power-fill zone-red" id="power-fill"></div>
          <div class="power-pct" id="power-pct">0%</div>
          <!-- Zone markers -->
          <div class="power-zone-markers">
            <div class="zone-mark" style="bottom:82%"></div>
            <div class="zone-mark" style="bottom:60%"></div>
            <div class="zone-mark" style="bottom:35%"></div>
          </div>
        </div>
      </div>

      <!-- SHOOT INSTRUCTION (appears during shot phase) -->
      <div class="shoot-instruction" id="shoot-instruction">
        SPACE / ENTER<br>to shoot!
      </div>

      <!-- ANSWER ZONE -->
      <div class="hud-answer" id="hud-answer">
        <div class="answer-input-row">
          <input
            type="text"
            class="answer-input"
            id="answer-input"
            data-testid="answer-input"
            placeholder="Your answer..."
            autocomplete="off"
            autocorrect="off"
            spellcheck="false"
          />
          <button class="submit-btn" id="submit-btn" data-testid="submit-btn">GO ▶</button>
        </div>
        <div class="choice-grid" id="choice-grid"></div>
      </div>

      <!-- BOTTOM STRIP -->
      <div class="hud-bottom" id="hud-bottom">
        <div style="font-size:12px;color:#94A3B8;letter-spacing:1px" id="hud-hint">
          Type your answer and press Enter, or tap a choice
        </div>
      </div>

      <!-- POSSESSION NOTICE -->
      <div class="possession-notice" id="possession-notice">
        <div class="possession-text" id="possession-text"></div>
        <div class="possession-sub" id="possession-sub"></div>
      </div>

      <!-- FEEDBACK OVERLAY -->
      <div class="feedback-overlay" id="feedback-overlay">
        <div class="feedback-text" id="feedback-text"></div>
      </div>

      <!-- HOT STREAK BANNER -->
      <div class="streak-banner" id="streak-banner"></div>
    `;

    // Wire answer input events
    this._wireAnswerInput();
  }

  _getModeBadge() {
    const badges = { solo: '🏀 SOLO', local2p: '👥 2-PLAYER', flat: '📊 PRACTICE' };
    return badges[this.gameMode] || '🏀 SOLO';
  }

  _wireAnswerInput() {
    const input = document.getElementById('answer-input');
    const submitBtn = document.getElementById('submit-btn');

    if (!input) return;

    // Focus input
    setTimeout(() => input.focus(), 100);

    const submit = () => {
      const val = input.value.trim();
      if (!val) return;
      const play = this.scene.get('PlayScene');
      if (play) play.events.emit('player-answered', val);
      // Don't clear yet - wait for verdict
    };

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        submit();
      }
      // Prevent spacebar from triggering shot when typing
      if (e.key === ' ') e.stopPropagation();
    });

    submitBtn.addEventListener('click', submit);

    // Choice buttons (wired after DOM is built)
    document.getElementById('choice-grid').addEventListener('click', (e) => {
      const btn = e.target.closest('.choice-btn');
      if (!btn) return;
      const val = btn.dataset.value;
      if (input) { input.value = val; }
      const play = this.scene.get('PlayScene');
      if (play) play.events.emit('player-answered', val);
    });
  }

  // ── Problem Display ──────────────────────────────────────── //

  _onNewProblem(data) {
    const { problem, index, total, timeLimit } = data;
    this.currentProblem = problem;
    this.timerRemaining = timeLimit;

    // Update round indicator
    const roundEl = document.getElementById('round-indicator');
    if (roundEl) roundEl.textContent = `ROUND ${index} / ${total}`;

    // Render math stem
    this._renderStem(problem);

    // Build choice buttons
    this._buildChoices(problem);

    // Reset answer input
    const input = document.getElementById('answer-input');
    if (input) {
      input.value = '';
      input.className = 'answer-input';
      input.removeAttribute('disabled');
      setTimeout(() => input.focus(), 50);
    }

    // Reset timer
    const timerEl = document.getElementById('timer-display');
    if (timerEl) {
      timerEl.textContent = timeLimit;
      timerEl.className = 'timer-display';
    }

    // Reset possession notice
    this._hidePossession();
    this._hideFeedback();
    this._hideShotInstruction();

    // Update opponent status
    this._setP2Status('Thinking... 🤔');
  }

  _renderStem(problem) {
    const stemEl = document.getElementById('stem-math');
    if (!stemEl) return;

    if (problem.isKatex && window.katex) {
      // Render fraction with KaTeX
      try {
        stemEl.innerHTML = window.katex.renderToString(problem.stem, { throwOnError: false });
      } catch (e) {
        stemEl.textContent = problem.display || problem.stem;
      }
    } else {
      stemEl.textContent = problem.stem;
    }
  }

  _buildChoices(problem) {
    const grid = document.getElementById('choice-grid');
    if (!grid) return;

    const choices = this._shuffleChoices([
      String(problem.answer),
      ...(problem.distractors || [])
    ]);

    grid.innerHTML = choices.slice(0, 4).map((c, i) => `
      <button class="choice-btn"
              data-testid="choice-btn-${i+1}"
              data-value="${c}">
        ${c}
      </button>
    `).join('');
  }

  _shuffleChoices(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  // ── Timer ────────────────────────────────────────────────── //

  _onTimerTick(remaining) {
    const timerEl = document.getElementById('timer-display');
    if (!timerEl) return;
    timerEl.textContent = Math.max(0, remaining);
    timerEl.className = remaining <= 5 ? 'timer-display urgent' : 'timer-display';
  }

  // ── Verdicts ─────────────────────────────────────────────── //

  _onP1Verdict(data) {
    const scoreEl = document.getElementById('p1-score');
    if (scoreEl) {
      scoreEl.textContent = data.score;
      scoreEl.classList.add('score-pop');
      setTimeout(() => scoreEl.classList.remove('score-pop'), 400);
    }

    const input = document.getElementById('answer-input');
    if (data.correct) {
      this.p1Score = data.score;
      this.p1Streak = data.streak;
      if (input) {
        input.className = 'answer-input correct-flash';
        input.setAttribute('disabled', 'true');
      }
      this._updateStreak(data.streak);
    } else {
      if (input) {
        input.className = 'answer-input wrong-shake';
        setTimeout(() => { input.className = 'answer-input'; }, 500);
      }
    }
  }

  _onP2Verdict(data) {
    const oppScore = document.getElementById('opp-score');
    if (oppScore) {
      this.p2Score = data.score;
      oppScore.textContent = data.score;
    }
    const oppStreak = document.getElementById('opp-streak');
    if (oppStreak) oppStreak.textContent = `🔥 ${data.streak} streak`;
  }

  _onP1Scored(data) {
    const scoreEl = document.getElementById('p1-score');
    if (scoreEl) {
      scoreEl.textContent = data.score;
      scoreEl.classList.add('score-pop');
      setTimeout(() => scoreEl.classList.remove('score-pop'), 400);
    }
    this._showFeedback(`+${data.points} PTS!`, '#22C55E');
    this._setHint(`Zone: ${data.zone.toUpperCase()} — ${data.points} points!`);
  }

  _onP2Scored(data) {
    const oppScore = document.getElementById('opp-score');
    if (oppScore) oppScore.textContent = data.score;
    this._setHint(`CPU scored ${data.points} points!`);
  }

  _onP1LostLife(lives) {
    this.p1Lives = lives;
    this._updateLives('p1-lives', lives);
    this._setHint('Out of time! -1 life');
  }

  _onP2LostLife(lives) {
    this.p2Lives = lives;
    this._updateLives('p2-lives', lives);
  }

  _updateLives(elId, lives) {
    const el = document.getElementById(elId);
    if (!el) return;
    const icons = el.querySelectorAll('.life-icon');
    icons.forEach((icon, i) => {
      icon.className = i < lives ? 'life-icon' : 'life-icon lost';
    });
  }

  _updateStreak(streak) {
    const countEl = document.getElementById('streak-count');
    const fireEl  = document.getElementById('streak-fire');
    if (countEl) countEl.textContent = streak;
    if (fireEl) {
      fireEl.className = streak >= 3 ? 'streak-fire hot' : 'streak-fire';
    }
  }

  // ── Shot Phase ───────────────────────────────────────────── //

  _onShotPhaseStart(data) {
    this.shotPhaseActive = true;
    const powerBar = document.getElementById('power-bar');
    if (powerBar) powerBar.classList.remove('hidden');

    const shootInstr = document.getElementById('shoot-instruction');
    if (shootInstr) shootInstr.classList.add('visible');

    // Disable answer input during shot
    const input = document.getElementById('answer-input');
    if (input) input.setAttribute('disabled', 'true');

    this._setHint('⌨️ Press SPACE or ENTER to shoot!');
  }

  _onShotPhaseEnd() {
    this.shotPhaseActive = false;
    const powerBar = document.getElementById('power-bar');
    if (powerBar) powerBar.classList.add('hidden');
    this._hideShotInstruction();
  }

  _onPowerUpdate(data) {
    const { power, zone } = data;
    if (!zone || zone.name === 'hidden') return;

    const fill = document.getElementById('power-fill');
    const pct  = document.getElementById('power-pct');

    if (fill) {
      fill.style.height = `${power}%`;
      fill.className = `power-fill zone-${zone.name}`;
    }
    if (pct) pct.textContent = `${power}%`;
  }

  // ── Feedback ─────────────────────────────────────────────── //

  _onWrongAnswer(data) {
    const input = document.getElementById('answer-input');
    if (input) {
      input.className = 'answer-input wrong-shake';
      setTimeout(() => {
        input.className = 'answer-input';
        input.value = '';
        input.focus();
      }, 450);
    }
  }

  _onAllowRetry(data) {
    const input = document.getElementById('answer-input');
    if (input) {
      input.value = '';
      input.className = 'answer-input';
      input.removeAttribute('disabled');
      input.focus();
    }
    this._setHint(`Wrong answer — try again!`);
  }

  _onHotStreak(data) {
    const banner = document.getElementById('streak-banner');
    if (banner) {
      banner.textContent = `🔥 ${data.streak}x STREAK! 🔥`;
      banner.className = 'streak-banner show';
      setTimeout(() => { banner.className = 'streak-banner'; }, 2100);
    }

    const avatar = document.getElementById('avatar-p1');
    if (avatar) {
      avatar.classList.add('hot');
      setTimeout(() => avatar.classList.remove('hot'), 3000);
    }
  }

  _onTimeout() {
    this._setHint('⏰ Time\'s up! -1 life each');
    const input = document.getElementById('answer-input');
    if (input) input.setAttribute('disabled', 'true');
  }

  _onRevealAnswer(data) {
    const stemEl = document.getElementById('stem-math');
    if (stemEl) {
      const ansEl = document.createElement('span');
      ansEl.style.cssText = 'color:#22C55E;margin-left:12px;font-size:0.8em';
      ansEl.textContent = `✓ ${data.answer}`;
      stemEl.appendChild(ansEl);
    }
  }

  _onShowPossession(data) {
    const el = document.getElementById('possession-notice');
    const textEl = document.getElementById('possession-text');
    if (!el || !textEl) return;
    textEl.textContent = data.text;
    textEl.style.color = data.color;
    el.className = 'possession-notice show';
    setTimeout(() => { el.className = 'possession-notice'; }, 1600);
  }

  _onShotResult(data) {
    if (data.result.scored) {
      this._showFeedback(`🏀 ${data.result.label}`, data.result.color);
    }
  }

  _onShotMiss(data) {
    this._showFeedback(`MISS! ${data.result.label}`, '#EF4444');
  }

  _setP1Status(text) {
    const hint = document.getElementById('hud-hint');
    if (hint) hint.textContent = text;
  }

  _setP2Status(text) {
    const el = document.getElementById('opp-status');
    if (el) {
      el.textContent = text;
      el.className = text.includes('Think') ? 'opponent-status thinking' : 'opponent-status';
    }
  }

  _setHint(text) {
    const el = document.getElementById('hud-hint');
    if (el) el.textContent = text;
  }

  _showFeedback(text, color) {
    const overlay = document.getElementById('feedback-overlay');
    const textEl  = document.getElementById('feedback-text');
    if (!overlay || !textEl) return;
    textEl.textContent = text;
    textEl.style.color = color || '#ffffff';
    overlay.className = 'feedback-overlay ' + (color === '#22C55E' || color?.includes('22C') ? 'correct-state' : 'wrong-state');
    setTimeout(() => { overlay.className = 'feedback-overlay'; }, 600);
  }

  _hideFeedback() {
    const overlay = document.getElementById('feedback-overlay');
    if (overlay) overlay.className = 'feedback-overlay';
  }

  _hidePossession() {
    const el = document.getElementById('possession-notice');
    if (el) el.className = 'possession-notice';
  }

  _hideShotInstruction() {
    const el = document.getElementById('shoot-instruction');
    if (el) el.classList.remove('visible');
  }

  // ── Game Over ────────────────────────────────────────────── //

  _onGameOver(data) {
    // Hide HUD elements
    const overlay = document.getElementById('hud-overlay');
    if (overlay) {
      setTimeout(() => { overlay.className = 'hud-hidden'; }, 1200);
    }

    // Show game over screen
    setTimeout(() => this._showGameOver(data), 1200);
  }

  _showGameOver(data) {
    const el = document.getElementById('gameover-screen');
    if (!el) {
      const div = document.createElement('div');
      div.id = 'gameover-screen';
      document.body.appendChild(div);
    }

    const go = document.getElementById('gameover-screen');
    const resultText = data.result === 'win' ? 'YOU WIN!' :
                       data.result === 'lose' ? 'YOU LOSE' :
                       data.result === 'draw' ? 'DRAW!' : 'COMPLETE!';
    const subtitle = data.result === 'win' ? 'Great math skills! 🏆' :
                     data.result === 'lose' ? 'Keep practicing! 💪' :
                     data.result === 'draw' ? 'So close! 🤝' : 'Practice complete! 📊';

    go.innerHTML = `
      <div class="gameover-result ${data.result === 'win' ? 'win' : data.result === 'lose' ? 'lose' : ''}">${resultText}</div>
      <div class="gameover-subtitle">${subtitle}</div>

      <div class="gameover-stats">
        <div class="stat-card">
          <div class="stat-val">${data.p1Score}</div>
          <div class="stat-label">Your Score</div>
        </div>
        <div class="stat-card">
          <div class="stat-val">${data.accuracy}%</div>
          <div class="stat-label">Accuracy</div>
        </div>
        <div class="stat-card">
          <div class="stat-val">${data.problems}</div>
          <div class="stat-label">Problems</div>
        </div>
      </div>

      <div style="color:#94A3B8;font-size:13px;margin-bottom:24px">
        CPU Score: ${data.p2Score} pts
      </div>

      <div class="gameover-btns">
        <button class="rematch-btn" id="rematch-btn" data-testid="rematch-btn">▶ PLAY AGAIN</button>
        <button class="menu-btn" id="menu-go-btn" data-testid="menu-btn">🏠 MAIN MENU</button>
      </div>
    `;

    go.classList.add('show');

    // Wire buttons
    document.getElementById('rematch-btn').addEventListener('click', () => {
      go.classList.remove('show');
      this._restartGame();
    });

    document.getElementById('menu-go-btn').addEventListener('click', () => {
      go.classList.remove('show');
      this._goToMenu();
    });
  }

  _restartGame() {
    this.scene.stop('HudScene');
    this.scene.stop('PlayScene');
    this.scene.start('PlayScene', { mode: this.gameMode, tier: this.gameTier });
    this.scene.launch('HudScene', { mode: this.gameMode, tier: this.gameTier });
  }

  _goToMenu() {
    this.scene.stop('HudScene');
    this.scene.stop('PlayScene');

    const overlay = document.getElementById('hud-overlay');
    if (overlay) overlay.className = 'hud-hidden';

    const menuEl = document.getElementById('menu-screen');
    if (menuEl) {
      menuEl.style.display = 'flex';
      menuEl.style.opacity = '1';
    } else {
      this.scene.start('MenuScene');
    }

    this.scene.start('MenuScene');
  }
}
