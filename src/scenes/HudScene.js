// ============================================================
// HudScene.js — DOM HUD overlay (runs in parallel with PlayScene)
// Manages: scores, timer, lives, input, power bar, game-over
// ============================================================

export class HudScene extends Phaser.Scene {
  constructor() {
    super({ key: 'HudScene' });
  }

  init(data) {
    this.gameMode       = data.mode || 'solo';
    this.gameTier       = data.tier || 'pro';
    this.p1Score        = 0;
    this.p2Score        = 0;
    this.p1Lives        = 3;
    this.p2Lives        = 3;
    this.p1Streak       = 0;
    this.p2Streak       = 0;
    this.shotPhaseActive = false;
    this.currentProblem  = null;
    this.turnOwner       = 'p1';
    this._inputLocked    = false;
    this._p2InputLocked  = false;
  }

  create() {
    this._buildHUD();
    this._subscribeToPlay();

    const overlay = document.getElementById('hud-overlay');
    if (overlay) overlay.className = 'hud-visible';
  }

  // ── Subscribe to PlayScene events ─────────────────────── //

  _subscribeToPlay() {
    const play = this.scene.get('PlayScene');
    if (!play) return;

    play.events.on('new-problem',       this._onNewProblem,      this);
    play.events.on('timer-tick',        this._onTimerTick,       this);
    play.events.on('p1-verdict',        this._onP1Verdict,       this);
    play.events.on('p2-verdict',        this._onP2Verdict,       this);
    play.events.on('p1-scored',         this._onP1Scored,        this);
    play.events.on('p2-scored',         this._onP2Scored,        this);
    play.events.on('p1-lost-life',      this._onP1LostLife,      this);
    play.events.on('p2-lost-life',      this._onP2LostLife,      this);
    play.events.on('shot-phase-start',  this._onShotPhaseStart,  this);
    play.events.on('shot-phase-end',    this._onShotPhaseEnd,    this);
    play.events.on('power-update',      this._onPowerUpdate,     this);
    play.events.on('wrong-answer',      () => {},                this);
    play.events.on('allow-retry',       this._onAllowRetry,      this);
    play.events.on('allow-p2-retry',    this._onAllowP2Retry,    this);
    play.events.on('hot-streak',        this._onHotStreak,       this);
    play.events.on('timeout',           this._onTimeout,         this);
    play.events.on('reveal-answer',     this._onRevealAnswer,    this);
    play.events.on('show-possession',   this._onShowPossession,  this);
    play.events.on('shot-result',       this._onShotResult,      this);
    play.events.on('shot-miss',         this._onShotMiss,        this);
    play.events.on('game-over',         this._onGameOver,        this);
    play.events.on('p1-status',         d => this._setHint(d),   this);
    play.events.on('p2-status',         d => this._setOppStatus(d), this);
  }

  // ── Build HUD DOM ─────────────────────────────────────── //

  _buildHUD() {
    const overlay = document.getElementById('hud-overlay');
    if (!overlay) return;

    const is2P   = this.gameMode === 'local2p';
    const p2Name = is2P ? 'P2' : 'CPU';

    overlay.innerHTML = `
      <!-- TOP BAR -->
      <div class="hud-top">
        <!-- P1 -->
        <div class="hud-player-block p1-block">
          <div class="hud-avatar p1-color" id="avatar-p1">🟠</div>
          <div class="hud-score-col">
            <div class="hud-player-name p1-name">YOU</div>
            <div class="hud-score p1-score" id="p1-score">0</div>
            <div class="hud-lives" id="p1-lives">
              <span class="life-icon">❤️</span>
              <span class="life-icon">❤️</span>
              <span class="life-icon">❤️</span>
            </div>
          </div>
        </div>

        <!-- Center -->
        <div class="hud-center-block">
          <div class="hud-timer" id="timer-display">12</div>
          <div class="hud-round" id="round-indicator">ROUND 1 / 10</div>
          <div class="hud-mode-badge">${this._modeBadge()}</div>
        </div>

        <!-- P2 / CPU -->
        <div class="hud-player-block p2-block">
          <div class="hud-score-col" style="text-align:right">
            <div class="hud-player-name p2-name">${p2Name}</div>
            <div class="hud-score p2-score" id="p2-score">0</div>
            <div class="hud-lives" style="justify-content:flex-end" id="p2-lives">
              <span class="life-icon">❤️</span>
              <span class="life-icon">❤️</span>
              <span class="life-icon">❤️</span>
            </div>
          </div>
          <div class="hud-avatar p2-color" id="avatar-p2">${is2P ? '🔵' : '🤖'}</div>
        </div>
      </div>

      <!-- PROBLEM STEM -->
      <div class="hud-stem-wrap">
        <div class="stem-card">
          <div class="stem-eyebrow">SOLVE THE PROBLEM</div>
          <div class="stem-math" id="stem-math">Get ready...</div>
        </div>
      </div>

      <!-- RIGHT: Power bar + Streak -->
      <div class="hud-right-panel">
        <div class="streak-card">
          <div class="streak-label">STREAK</div>
          <div class="streak-val" id="streak-count">0</div>
          <div class="streak-fire" id="streak-fire">🔥</div>
        </div>
        <div class="power-wrap hidden" id="power-bar">
          <div class="power-label-top">POWER</div>
          <div class="power-track">
            <div class="power-fill" id="power-fill" style="height:0%"></div>
            <div class="zone-line" style="bottom:82%"></div>
            <div class="zone-line" style="bottom:60%"></div>
            <div class="zone-line" style="bottom:35%"></div>
          </div>
          <div class="power-pct" id="power-pct">0%</div>
        </div>
      </div>

      <!-- LEFT: Opponent panel (in solo mode) -->
      <div class="hud-left-panel" id="hud-left-panel" style="${this.gameMode === 'flat' ? 'display:none' : ''}">
        <div class="opp-card">
          <div class="opp-label">OPPONENT</div>
          <div class="opp-name" id="opp-name">${is2P ? 'PLAYER 2' : 'CPU SHAQ'}</div>
          <div class="opp-score-big" id="opp-score">0</div>
          <div class="opp-streak" id="opp-streak">🔥 0 streak</div>
          <div class="opp-status" id="opp-status">Waiting...</div>
        </div>
      </div>

      <!-- ANSWER AREA -->
      <div class="hud-answer-area" id="hud-answer">
        ${is2P ? this._build2PInput() : this._buildSoloInput()}
        <div class="hint-bar" id="hud-hint">Type your answer and press Enter, or tap a choice</div>
      </div>

      <!-- SHOOT INSTRUCTION -->
      <div class="shoot-tip hidden" id="shoot-instruction">
        ⌨️ Press <strong>SPACE</strong> or <strong>ENTER</strong> to shoot!
      </div>

      <!-- POSSESSION TOAST -->
      <div class="possession-toast" id="possession-notice">
        <div class="possession-text" id="possession-text"></div>
      </div>

      <!-- HOT STREAK BANNER -->
      <div class="streak-banner" id="streak-banner"></div>

      <!-- FEEDBACK FLASH -->
      <div class="feedback-flash" id="feedback-overlay"></div>
    `;

    // Wire answer inputs
    this._wireInputs();
  }

  _modeBadge() {
    return { solo: '🏀 SOLO', local2p: '👥 2-PLAYER', flat: '📊 PRACTICE' }[this.gameMode] || '🏀 SOLO';
  }

  _buildSoloInput() {
    return `
      <div class="solo-input-wrap">
        <div class="answer-row">
          <input type="text" class="answer-input" id="answer-p1" placeholder="Your answer..."
            autocomplete="off" autocorrect="off" spellcheck="false" inputmode="decimal" />
          <button class="go-btn" id="submit-p1">GO ▶</button>
        </div>
        <div class="choice-grid" id="choice-grid"></div>
      </div>`;
  }

  _build2PInput() {
    return `
      <div class="two-p-input-wrap">
        <div class="two-p-col p1-col" id="p1-col">
          <div class="two-p-label p1-name">PLAYER 1 ▼</div>
          <div class="answer-row">
            <input type="text" class="answer-input p1-inp" id="answer-p1"
              placeholder="P1 answer..." autocomplete="off" inputmode="decimal" />
            <button class="go-btn p1-go" id="submit-p1">GO</button>
          </div>
        </div>
        <div class="two-p-divider">VS</div>
        <div class="two-p-col p2-col" id="p2-col">
          <div class="two-p-label p2-name">PLAYER 2 ▼</div>
          <div class="answer-row">
            <input type="text" class="answer-input p2-inp" id="answer-p2"
              placeholder="P2 answer..." autocomplete="off" inputmode="decimal" />
            <button class="go-btn p2-go" id="submit-p2">GO</button>
          </div>
        </div>
      </div>
      <div class="choice-grid" id="choice-grid"></div>`;
  }

  _wireInputs() {
    const is2P = this.gameMode === 'local2p';
    const play = this.scene.get('PlayScene');

    // P1 input
    const p1Input  = document.getElementById('answer-p1');
    const p1Submit = document.getElementById('submit-p1');
    if (p1Input) {
      setTimeout(() => p1Input.focus(), 200);
      p1Input.addEventListener('keydown', e => {
        if (e.key === 'Enter') { e.preventDefault(); this._submitP1(); }
        if (e.key === ' ') e.stopPropagation(); // don't trigger shot
      });
    }
    if (p1Submit) p1Submit.addEventListener('click', () => this._submitP1());

    // P2 input (2P mode only)
    if (is2P) {
      const p2Input  = document.getElementById('answer-p2');
      const p2Submit = document.getElementById('submit-p2');
      if (p2Input) {
        p2Input.addEventListener('keydown', e => {
          if (e.key === 'Enter') { e.preventDefault(); this._submitP2(); }
          if (e.key === ' ') e.stopPropagation();
        });
      }
      if (p2Submit) p2Submit.addEventListener('click', () => this._submitP2());
    }

    // Choice grid clicks
    const grid = document.getElementById('choice-grid');
    if (grid) {
      grid.addEventListener('click', e => {
        const btn = e.target.closest('.choice-btn');
        if (!btn) return;
        const val = btn.dataset.value;
        // Determine active player
        if (is2P && this.turnOwner === 'p2') {
          const inp = document.getElementById('answer-p2');
          if (inp) inp.value = val;
          this._submitP2();
        } else {
          const inp = document.getElementById('answer-p1');
          if (inp) inp.value = val;
          this._submitP1();
        }
      });
    }
  }

  _submitP1() {
    if (this._inputLocked) return;
    const inp = document.getElementById('answer-p1');
    if (!inp) return;
    const val = inp.value.trim();
    if (!val) return;
    const play = this.scene.get('PlayScene');
    if (play) play.events.emit('player-answered', val);
  }

  _submitP2() {
    if (this._p2InputLocked) return;
    const inp = document.getElementById('answer-p2');
    if (!inp) return;
    const val = inp.value.trim();
    if (!val) return;
    const play = this.scene.get('PlayScene');
    if (play) play.events.emit('p2-player-answered', val);
  }

  // ── Problem Display ───────────────────────────────────── //

  _onNewProblem(data) {
    const { problem, index, total, timeLimit, turnOwner } = data;
    this.currentProblem = problem;
    this.turnOwner = turnOwner || 'p1';
    this._inputLocked   = false;
    this._p2InputLocked = false;

    // Round indicator
    const roundEl = document.getElementById('round-indicator');
    if (roundEl) roundEl.textContent = `ROUND ${index} / ${total}`;

    // Timer
    const timerEl = document.getElementById('timer-display');
    if (timerEl) { timerEl.textContent = timeLimit; timerEl.className = 'hud-timer'; }

    // Render stem
    this._renderStem(problem);

    // Build choices
    this._buildChoices(problem);

    // Reset P1 input
    const p1Inp = document.getElementById('answer-p1');
    if (p1Inp) {
      p1Inp.value = '';
      p1Inp.className = 'answer-input' + (this.gameMode === 'local2p' ? ' p1-inp' : '');
      p1Inp.removeAttribute('disabled');
    }

    // Reset P2 input in 2P mode
    if (this.gameMode === 'local2p') {
      const p2Inp = document.getElementById('answer-p2');
      if (p2Inp) { p2Inp.value = ''; p2Inp.removeAttribute('disabled'); }

      // Highlight whose turn it is
      this._highlight2PTurn(turnOwner);
    }

    // Reset UI
    this._hidePossession();
    this._hideFeedback();
    this._hideShotInstruction();
    this._setOppStatus('Thinking... 🤔');

    // Focus correct input
    setTimeout(() => {
      if (this.gameMode === 'local2p') {
        const toFocus = document.getElementById(turnOwner === 'p1' ? 'answer-p1' : 'answer-p2');
        toFocus?.focus();
      } else {
        document.getElementById('answer-p1')?.focus();
      }
    }, 80);
  }

  _highlight2PTurn(turnOwner) {
    const p1col = document.getElementById('p1-col');
    const p2col = document.getElementById('p2-col');
    if (p1col) p1col.classList.toggle('active-turn', turnOwner === 'p1');
    if (p2col) p2col.classList.toggle('active-turn', turnOwner === 'p2');
  }

  _renderStem(problem) {
    const stemEl = document.getElementById('stem-math');
    if (!stemEl) return;

    if (problem.isKatex && window.katex) {
      try {
        stemEl.innerHTML = window.katex.renderToString(problem.stem, {
          throwOnError: false,
          displayMode: false
        });
        stemEl.classList.add('has-katex');
      } catch (e) {
        stemEl.textContent = problem.display || problem.stem;
        stemEl.classList.remove('has-katex');
      }
    } else {
      stemEl.textContent = problem.stem;
      stemEl.classList.remove('has-katex');
    }
  }

  _buildChoices(problem) {
    const grid = document.getElementById('choice-grid');
    if (!grid) return;

    const choices = this._shuffle([
      String(problem.answer),
      ...(problem.distractors || [])
    ]).slice(0, 4);

    grid.innerHTML = choices.map((c, i) => `
      <button class="choice-btn" data-value="${c}" data-index="${i}">
        ${problem.isKatex ? this._renderChoiceKatex(c) : c}
      </button>`).join('');
  }

  _renderChoiceKatex(val) {
    if (!window.katex || !val.includes('/')) return val;
    try {
      const parts = val.split('/');
      if (parts.length === 2) {
        return window.katex.renderToString(`\\frac{${parts[0]}}{${parts[1]}}`, { throwOnError: false });
      }
    } catch (e) {}
    return val;
  }

  _shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  // ── Timer ─────────────────────────────────────────────── //

  _onTimerTick(remaining) {
    const el = document.getElementById('timer-display');
    if (el) {
      el.textContent = Math.max(0, remaining);
      el.className = remaining <= 5 ? 'hud-timer urgent' : 'hud-timer';
    }
  }

  // ── Verdicts ──────────────────────────────────────────── //

  _onP1Verdict(data) {
    this._updateScore('p1-score', data.score);
    const inp = document.getElementById('answer-p1');
    if (data.correct) {
      this.p1Score = data.score;
      this._inputLocked = true;
      if (inp) { inp.className = 'answer-input correct-flash' + (this.gameMode === 'local2p' ? ' p1-inp' : ''); inp.setAttribute('disabled', 'true'); }
      this._updateStreak(data.streak);
    } else {
      if (inp) {
        inp.className = 'answer-input wrong-shake' + (this.gameMode === 'local2p' ? ' p1-inp' : '');
        setTimeout(() => {
          inp.className = 'answer-input' + (this.gameMode === 'local2p' ? ' p1-inp' : '');
          inp.value = '';
          inp.focus();
        }, 460);
      }
    }
  }

  _onP2Verdict(data) {
    this.p2Score   = data.score;
    this.p2Streak  = data.streak;
    // Update BOTH displays: top bar p2-score AND side panel opp-score
    this._updateScore('p2-score', data.score);
    this._updateScore('opp-score', data.score);
    const oppStreak = document.getElementById('opp-streak');
    if (oppStreak) oppStreak.textContent = `🔥 ${data.streak} streak`;

    if (this.gameMode === 'local2p') {
      const inp = document.getElementById('answer-p2');
      if (data.correct) {
        this._p2InputLocked = true;
        if (inp) { inp.className = 'answer-input p2-inp correct-flash'; inp.setAttribute('disabled', 'true'); }
      } else {
        if (inp) {
          inp.className = 'answer-input p2-inp wrong-shake';
          setTimeout(() => {
            inp.className = 'answer-input p2-inp';
            inp.value = '';
            inp.focus();
          }, 460);
        }
      }
    }
  }

  _onP1Scored(data) {
    this._updateScore('p1-score', data.score);
    this._showFeedback(`🏀 +${data.points} pts`, '#22C55E');
    this._setHint(`${data.zone?.toUpperCase() || 'ZONE'} — ${data.points} points!`);
  }

  _onP2Scored(data) {
    this.p2Score = data.score;
    this._updateScore('p2-score', data.score);
    this._updateScore('opp-score', data.score);
    this._showFeedback(this.gameMode === 'local2p' ? `P2 +${data.points}` : `CPU +${data.points}`, '#4DA6FF');
    this._setHint(`${this.gameMode === 'local2p' ? 'P2' : 'CPU'} scored ${data.points}!`);
  }

  _updateScore(id, val) {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = val;
    el.classList.add('score-pop');
    setTimeout(() => el.classList.remove('score-pop'), 420);
  }

  _onP1LostLife(lives) {
    this.p1Lives = lives;
    this._updateLives('p1-lives', lives);
    this._setHint('⏰ Too slow! -1 life');
    this.cameras?.main?.shake?.(160, 0.005);
  }

  _onP2LostLife(lives) {
    this.p2Lives = lives;
    this._updateLives('p2-lives', lives);
  }

  _updateLives(elId, lives) {
    const el = document.getElementById(elId);
    if (!el) return;
    el.querySelectorAll('.life-icon').forEach((icon, i) => {
      icon.className = i < lives ? 'life-icon' : 'life-icon lost';
    });
  }

  _updateStreak(streak) {
    const cnt  = document.getElementById('streak-count');
    const fire = document.getElementById('streak-fire');
    if (cnt)  cnt.textContent = streak;
    if (fire) fire.className  = streak >= 3 ? 'streak-fire hot' : 'streak-fire';
  }

  // ── Shot Phase ────────────────────────────────────────── //

  _onShotPhaseStart(data) {
    this.shotPhaseActive = true;
    document.getElementById('power-bar')?.classList.remove('hidden');
    document.getElementById('shoot-instruction')?.classList.remove('hidden');
    const p1Inp = document.getElementById('answer-p1');
    if (p1Inp) p1Inp.setAttribute('disabled', 'true');
    this._setHint('⌨️ Press SPACE or ENTER to shoot!');
  }

  _onShotPhaseEnd() {
    this.shotPhaseActive = false;
    document.getElementById('power-bar')?.classList.add('hidden');
    this._hideShotInstruction();
  }

  _onPowerUpdate(data) {
    const { power, zone } = data;
    if (!zone || zone.name === 'hidden') return;
    const fill = document.getElementById('power-fill');
    const pct  = document.getElementById('power-pct');
    if (fill) {
      fill.style.height = `${power}%`;
      const zoneColors = {
        green:  'linear-gradient(to top, #14532D, #22C55E)',
        yellow: 'linear-gradient(to top, #713F12, #EAB308)',
        orange: 'linear-gradient(to top, #92400E, #F97316)',
        red:    'linear-gradient(to top, #7F1D1D, #EF4444)'
      };
      fill.style.background = zoneColors[zone.name] || zoneColors.red;
      if (zone.name === 'green') fill.style.boxShadow = '0 0 12px rgba(34,197,94,0.6)';
      else fill.style.boxShadow = 'none';
    }
    if (pct) pct.textContent = `${power}%`;
  }

  // ── Feedback ──────────────────────────────────────────── //

  _onAllowRetry() {
    const inp = document.getElementById('answer-p1');
    if (inp) { inp.value = ''; inp.className = 'answer-input'; inp.removeAttribute('disabled'); inp.focus(); }
    this._setHint('Wrong — try again!');
  }

  _onAllowP2Retry() {
    const inp = document.getElementById('answer-p2');
    if (inp) { inp.value = ''; inp.className = 'answer-input p2-inp'; inp.removeAttribute('disabled'); inp.focus(); }
  }

  _onHotStreak(data) {
    const banner = document.getElementById('streak-banner');
    if (banner) {
      banner.textContent = `🔥 ${data.streak}x STREAK! 🔥`;
      banner.className = 'streak-banner show';
      setTimeout(() => { banner.className = 'streak-banner'; }, 2200);
    }
  }

  _onTimeout() {
    this._setHint('⏰ Time\'s up!');
    document.getElementById('answer-p1')?.setAttribute('disabled', 'true');
    document.getElementById('answer-p2')?.setAttribute('disabled', 'true');
  }

  _onRevealAnswer(data) {
    const stemEl = document.getElementById('stem-math');
    if (stemEl) {
      const ans = document.createElement('span');
      ans.style.cssText = 'color:#22C55E;margin-left:14px;font-size:0.75em;font-family:Inter,sans-serif';
      ans.textContent = `✓ ${data.answer}`;
      stemEl.appendChild(ans);
    }
  }

  _onShowPossession(data) {
    const el   = document.getElementById('possession-notice');
    const text = document.getElementById('possession-text');
    if (!el || !text) return;
    text.textContent = data.text;
    text.style.color = data.color;
    el.className = 'possession-toast show';
    setTimeout(() => { el.className = 'possession-toast'; }, 1700);
  }

  _onShotResult(data) {
    if (data.result.scored) {
      this._showFeedback(`🏀 ${data.result.label}`, data.result.color);
    }
  }

  _onShotMiss(data) {
    this._showFeedback(`MISS! ${data.result.label}`, '#EF4444');
  }

  _setOppStatus(text) {
    const el = document.getElementById('opp-status');
    if (el) {
      el.textContent = text;
      el.className = text.toLowerCase().includes('think') ? 'opp-status thinking' : 'opp-status';
    }
  }

  _setHint(text) {
    const el = document.getElementById('hud-hint');
    if (el) el.textContent = text;
  }

  _showFeedback(text, color = '#fff') {
    const el = document.getElementById('feedback-overlay');
    if (!el) return;
    el.textContent = text;
    el.style.color = color;
    el.style.textShadow = `0 0 30px ${color}`;
    el.className = 'feedback-flash show';
    setTimeout(() => { el.className = 'feedback-flash'; }, 700);
  }

  _hideFeedback()       { const e = document.getElementById('feedback-overlay'); if (e) e.className = 'feedback-flash'; }
  _hidePossession()     { const e = document.getElementById('possession-notice'); if (e) e.className = 'possession-toast'; }
  _hideShotInstruction(){ const e = document.getElementById('shoot-instruction'); if (e) e.classList.add('hidden'); }

  // ── Game Over ─────────────────────────────────────────── //

  _onGameOver(data) {
    const overlay = document.getElementById('hud-overlay');
    if (overlay) setTimeout(() => { overlay.className = 'hud-hidden'; }, 1000);
    setTimeout(() => this._showGameOver(data), 1100);
  }

  _showGameOver(data) {
    let el = document.getElementById('gameover-screen');
    if (!el) { el = document.createElement('div'); el.id = 'gameover-screen'; document.body.appendChild(el); }

    const isWin    = data.result === 'win';
    const isLose   = data.result === 'lose';
    const isDraw   = data.result === 'draw';
    const isFlat   = data.result === 'complete';
    const is2P     = data.mode === 'local2p';

    const heading  = isWin ? '🏆 YOU WIN!' : isLose ? '😤 YOU LOSE' : isDraw ? '🤝 DRAW!' : '✅ COMPLETE!';
    const subtext  = isWin ? 'Outstanding math skills!' : isLose ? 'Keep practising!' : isDraw ? 'So close!' : 'Practice done!';
    const resultCls = isWin ? 'win' : isLose ? 'lose' : '';

    el.innerHTML = `
      <div class="go-content">
        <div class="go-stars-wrap" id="go-stars"></div>
        <div class="go-heading ${resultCls}">${heading}</div>
        <div class="go-sub">${subtext}</div>

        <div class="go-scores">
          <div class="go-score-card p1-card">
            <div class="go-score-name">YOU</div>
            <div class="go-score-val">${data.p1Score}</div>
            <div class="go-score-lbl">pts</div>
          </div>
          <div class="go-vs">VS</div>
          <div class="go-score-card p2-card">
            <div class="go-score-name">${is2P ? 'PLAYER 2' : 'CPU'}</div>
            <div class="go-score-val">${data.p2Score}</div>
            <div class="go-score-lbl">pts</div>
          </div>
        </div>

        <div class="go-stats">
          <div class="go-stat"><span>${data.accuracy}%</span><label>Accuracy</label></div>
          <div class="go-stat"><span>${data.problems}</span><label>Problems</label></div>
          <div class="go-stat"><span>${data.streakMax}</span><label>Best Streak</label></div>
        </div>

        <div class="go-btns">
          <button class="go-btn-play" id="go-rematch">▶ PLAY AGAIN</button>
          <button class="go-btn-menu" id="go-menu">🏠 MAIN MENU</button>
        </div>
      </div>
    `;

    el.className = 'show';

    // Animate stars / balls falling
    this._animateGoStars(el, isWin);

    document.getElementById('go-rematch').addEventListener('click', () => {
      el.className = '';
      this._restartGame();
    });
    document.getElementById('go-menu').addEventListener('click', () => {
      el.className = '';
      this._goToMenu();
    });
  }

  _animateGoStars(el, isWin) {
    const wrap = document.getElementById('go-stars');
    if (!wrap) return;
    const count = isWin ? 12 : 4;
    for (let i = 0; i < count; i++) {
      const star = document.createElement('div');
      star.className = 'go-star';
      star.textContent = isWin ? '⭐' : '🏀';
      star.style.cssText = `
        left: ${Math.random() * 90 + 5}%;
        animation-delay: ${Math.random() * 1.5}s;
        font-size: ${Math.random() * 16 + 18}px;
      `;
      wrap.appendChild(star);
    }
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

    const hud = document.getElementById('hud-overlay');
    if (hud) { hud.className = 'hud-hidden'; hud.innerHTML = ''; }

    this.scene.start('MenuScene');
  }
}
