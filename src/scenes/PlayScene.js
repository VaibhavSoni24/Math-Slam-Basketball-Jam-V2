// ============================================================
// PlayScene.js — Core game loop (Phaser canvas layer)
// Handles: court, players, ball physics, shot mechanic, AI
// HUD (DOM) is managed by HudScene running in parallel
// ============================================================

import { MathEngine }   from '../game/MathEngine.js';
import { CPUPlayer }    from '../game/CPUPlayer.js';
import { ShotMechanic } from '../game/ShotMechanic.js';

const W = 1280;
const H = 720;

const STATE = {
  COUNTDOWN: 'countdown',
  PROBLEM:   'problem',
  SHOT:      'shot',
  RESULT:    'result',
  BUFFER:    'buffer',
  GAMEOVER:  'gameover'
};

// Layout constants
const P1_X      = 260;
const P2_X      = 1020;
const PLAYER_Y  = 630;   // feet on floor — shifted further down
const PLAYER_W  = 190;
const PLAYER_H  = 240;

// Hoop RING centers (calibrated to court_bg, 1280×720)
// Left hoop: the orange ring is at roughly x=270, y=255
// Right hoop: x=1010, y=255
const HOOP_LEFT_X  = 268;
const HOOP_RIGHT_X = 1012;
const HOOP_Y       = 250;   // ring top — aim ball INTO the ring

// Ball starting positions (off-screen, hidden until shot)
const BALL_P1  = { x: P1_X + 60,  y: PLAYER_Y - 200 };
const BALL_P2  = { x: P2_X - 60,  y: PLAYER_Y - 200 };
const BALL_SIZE = 68;

export class PlayScene extends Phaser.Scene {
  constructor() {
    super({ key: 'PlayScene' });
  }

  init(data) {
    this.gameMode  = data.mode     || 'solo';
    this.gameTier  = data.tier     || 'pro';
    this.showOptions = data.showOptions !== undefined ? data.showOptions : true;
    this.p1Name    = data.p1Name   || 'YOU';
    this.p2Name    = data.p2Name   || (this.gameMode === 'local2p' ? 'PLAYER 2' : 'CPU SHAQ');

    this.state            = STATE.COUNTDOWN;
    this.currentProblem   = null;
    this.problemIndex     = 0;
    this.totalProblems    = this.gameMode === 'flat' ? 10 : Phaser.Math.Between(9, 12);
    // Practice: 20s per round. Solo/2P: 10s.
    this.problemTimeLimit = this.gameMode === 'flat' ? 20 : 10;
    this.shotTimeLimit    = 10;

    // Player state — wrong-answer counter
    this.p1 = { score: 0, lives: 3, streak: 0, totalTime: 0, wrongCount: 0, name: this.p1Name };
    this.p2 = { score: 0, lives: 3, streak: 0, totalTime: 0, wrongCount: 0, name: this.p2Name };

    // Turn / possession state
    this.turnOwner        = 'p1';
    this.p1Answered       = false;
    this.p2Answered       = false;
    this.whoHasPossession = null;
    this.shotPhaseActive  = false;

    // Timers
    this._problemTimerEvent = null;
    this._shotTimerEvent    = null;
    this._timerCount        = 0;
    this._timerRunning      = false;
  }

  create() {
    this._createCourt();
    this._createPlayers();
    this._createBall();
    this._createShadow();
    this._createBallGlow();

    this.mathEngine = new MathEngine();
    this.mathEngine.setTier(this.gameTier);

    this.cpu = new CPUPlayer();
    this.cpu.setTier(this.gameTier);  // smarter CPU per grade

    this.shotMechanic = new ShotMechanic();

    this._setupInput();

    this.events.on('player-answered',    this._onPlayerAnswered,   this);
    this.events.on('p2-player-answered', this._onP2PlayerAnswered, this);

    if (window.gameAudio) window.gameAudio.init().catch(() => {});

    this._startCountdown();
  }

  // ── Court ─────────────────────────────────────────────── //

  _createCourt() {
    const { width, height } = this.scale;
    if (this.textures.exists('court_bg')) {
      this.add.image(width / 2, height / 2, 'court_bg')
        .setDisplaySize(width, height).setDepth(0);
    } else {
      const g = this.add.graphics();
      g.fillGradientStyle(0x0a0a1e, 0x0a0a1e, 0x1A1A2E, 0x0F2040, 1);
      g.fillRect(0, 0, width, height);
      g.fillStyle(0xC8864E, 0.8);
      g.fillRect(0, H - 200, width, 200);
    }
  }

  // ── Players ─────────────────────────────────────────────── //

  _createPlayers() {
    const p1Key = this.textures.exists('p1_idle') ? 'p1_idle' : null;
    const p2Key = this.textures.exists('p2_idle') ? 'p2_idle' : null;

    // P1 — original asset already faces right (toward right hoop)
    // Do NOT flipX — default orientation is correct
    if (p1Key) {
      this.playerP1 = this.add.image(P1_X, PLAYER_Y, p1Key)
        .setDisplaySize(PLAYER_W, PLAYER_H)
        .setDepth(8).setOrigin(0.5, 1);
    } else {
      this.playerP1 = this._drawFallback(P1_X, PLAYER_Y, 0xE85D04, 'P1');
    }

    // P2 — original asset already faces left (toward left hoop)
    // Do NOT flipX — default orientation is correct
    if (p2Key) {
      this.playerP2 = this.add.image(P2_X, PLAYER_Y, p2Key)
        .setDisplaySize(PLAYER_W, PLAYER_H)
        .setDepth(8).setOrigin(0.5, 1);
    } else {
      this.playerP2 = this._drawFallback(P2_X, PLAYER_Y, 0x1A6FBF, 'P2');
    }

    // Name tags
    this._p1NameTag = this.add.text(P1_X, PLAYER_Y + 14, this.p1.name, {
      fontFamily: "'Nunito', sans-serif",
      fontSize: 15, fontStyle: 'bold',
      color: '#FF8C3A', stroke: '#000', strokeThickness: 3
    }).setOrigin(0.5, 0).setDepth(9);

    this._p2NameTag = this.add.text(P2_X, PLAYER_Y + 14, this.p2.name, {
      fontFamily: "'Nunito', sans-serif",
      fontSize: 15, fontStyle: 'bold',
      color: '#4DA6FF', stroke: '#000', strokeThickness: 3
    }).setOrigin(0.5, 0).setDepth(9);
  }

  _drawFallback(x, y, color, label) {
    const g = this.add.graphics().setDepth(8);
    g.fillStyle(color, 1);
    g.fillCircle(x, y - 80, 24);
    g.fillRect(x - 18, y - 58, 36, 55);
    return g;
  }

  _setPlayerSprite(player, key) {
    if (!player || typeof player.setTexture !== 'function') return;
    if (this.textures.exists(key)) player.setTexture(key);
  }

  // ── Ball ─────────────────────────────────────────────────── //

  _createBall() {
    if (this.textures.exists('ball_spin')) {
      this.ball = this.add.sprite(BALL_P1.x, BALL_P1.y, 'ball_spin', 0)
        .setDisplaySize(BALL_SIZE, BALL_SIZE)
        .setDepth(12).setAlpha(0);
    } else if (this.textures.exists('ball_idle')) {
      this.ball = this.add.image(BALL_P1.x, BALL_P1.y, 'ball_idle')
        .setDisplaySize(BALL_SIZE, BALL_SIZE)
        .setDepth(12).setAlpha(0);
    } else {
      const g = this.add.graphics().setDepth(12).setAlpha(0);
      g.fillStyle(0xE8651A, 1);
      g.fillCircle(0, 0, BALL_SIZE / 2);
      g.x = BALL_P1.x; g.y = BALL_P1.y;
      this.ball = g;
    }
    this.ballOwner = null;
  }

  _createShadow() {
    if (this.textures.exists('ball_shadow')) {
      this.ballShadow = this.add.image(0, 0, 'ball_shadow')
        .setDisplaySize(60, 20).setDepth(7).setAlpha(0);
    }
  }

  _createBallGlow() {
    if (this.textures.exists('ball_glow')) {
      this.ballGlow = this.add.image(0, 0, 'ball_glow')
        .setDisplaySize(110, 110).setDepth(13).setAlpha(0);
    }
  }

  // ── Input ─────────────────────────────────────────────────── //

  _setupInput() {
    this.input.keyboard.on('keydown-SPACE', () => {
      if (this.state === STATE.SHOT) {
        // SPACE triggers shot for whoever has possession
        if (this.whoHasPossession === 'p1') this._releaseShotP1();
        else if (this.whoHasPossession === 'p2' && this.gameMode === 'local2p') this._releaseShotP2();
      }
    });
    this.input.keyboard.on('keydown-ENTER', () => {
      if (this.state === STATE.SHOT) {
        if (this.whoHasPossession === 'p1') this._releaseShotP1();
        else if (this.whoHasPossession === 'p2' && this.gameMode === 'local2p') this._releaseShotP2();
      }
    });
  }

  // ── Countdown ─────────────────────────────────────────────── //

  _startCountdown() {
    this.state = STATE.COUNTDOWN;
    let el = document.getElementById('countdown-overlay');
    if (!el) { el = document.createElement('div'); el.id = 'countdown-overlay'; document.body.appendChild(el); }
    el.className = 'show';

    let count = 3;
    const tick = () => {
      window.gameAudio?.playCountdown?.();
      el.innerHTML = `<div class="countdown-num">${count}</div>`;
      count--;
      if (count > 0) {
        this.time.delayedCall(900, tick);
      } else {
        this.time.delayedCall(900, () => {
          el.innerHTML = `<div class="countdown-num go">GO!</div>`;
          window.gameAudio?.playCountdownGo?.();
          this.time.delayedCall(650, () => {
            el.className = '';
            window.gameAudio?.startMusic?.();
            this._nextProblem();
          });
        });
      }
    };
    tick();
  }

  // ── Problem Cycle ──────────────────────────────────────────── //

  _nextProblem() {
    if (this.problemIndex >= this.totalProblems) { this._endMatch(); return; }

    this.state            = STATE.PROBLEM;
    this.p1Answered       = false;
    this.p2Answered       = false;
    this.whoHasPossession = null;
    this.shotPhaseActive  = false;
    this.problemIndex++;

    if (this.gameMode === 'local2p') {
      this.turnOwner = this.problemIndex % 2 === 1 ? 'p1' : 'p2';
    } else {
      this.turnOwner = 'p1';
    }

    this.currentProblem  = this.mathEngine.generateProblem();
    this._roundStartTime = Date.now();

    this.events.emit('new-problem', {
      problem:     this.currentProblem,
      index:       this.problemIndex,
      total:       this.totalProblems,
      timeLimit:   this.problemTimeLimit,
      turnOwner:   this.turnOwner,
      mode:        this.gameMode,
      showOptions: this.showOptions
    });

    this._setPlayerSprite(this.playerP1, 'p1_idle');
    this._setPlayerSprite(this.playerP2, 'p2_idle');

    // CPU schedules its answer (solo / flat)
    if (this.gameMode !== 'local2p') {
      this.cpu.scheduleProblem(this.currentProblem, this.problemTimeLimit, (isCorrect, timeTaken, timedOut) => {
        if (!this.p2Answered && this.state === STATE.PROBLEM) {
          this._onCPUAnswered(isCorrect, timedOut);
        }
      }, this.gameMode);   // pass mode so practice gets 5s flat delay
    }

    // PROBLEM TIMER — never stops due to wrong answers
    this._startProblemTimer(this.problemTimeLimit);
  }

  // ── Timer helpers ─────────────────────────────────────────── //

  _startProblemTimer(seconds) {
    // Remove any existing timer
    if (this._problemTimerEvent) { this._problemTimerEvent.remove(false); this._problemTimerEvent = null; }

    this._timerCount   = 0;
    this._timerRunning = true;
    const total        = seconds;

    this._problemTimerEvent = this.time.addEvent({
      delay: 1000,
      repeat: total,          // will fire total+1 times
      callback: () => {
        if (!this._timerRunning) return;
        this._timerCount++;
        const remaining = total - this._timerCount;
        this.events.emit('timer-tick', remaining);
        if (remaining <= 5 && remaining > 0) window.gameAudio?.playUrgentTick?.();
        if (remaining <= 0) this._onProblemTimeout();
      }
    });
  }

  _stopProblemTimer() {
    this._timerRunning = false;
    if (this._problemTimerEvent) { this._problemTimerEvent.remove(false); this._problemTimerEvent = null; }
  }

  _startShotTimer() {
    if (this._shotTimerEvent) { this._shotTimerEvent.remove(false); this._shotTimerEvent = null; }
    let shotCount = 0;
    const total   = this.shotTimeLimit;

    this._shotTimerEvent = this.time.addEvent({
      delay: 1000,
      repeat: total,
      callback: () => {
        shotCount++;
        const remaining = total - shotCount;
        this.events.emit('shot-timer-tick', remaining);
        if (remaining <= 0 && this.state === STATE.SHOT) {
          // Force shot
          if (this._shotTimerEvent) { this._shotTimerEvent.remove(false); this._shotTimerEvent = null; }
          const result = this.shotMechanic.timeout();
          this._executeShotResult(this.whoHasPossession, result);
        }
      }
    });
  }

  _stopShotTimer() {
    if (this._shotTimerEvent) { this._shotTimerEvent.remove(false); this._shotTimerEvent = null; }
  }

  // ── Answer Handling ──────────────────────────────────────── //

  _onPlayerAnswered(userAnswer) {
    if (this.state !== STATE.PROBLEM) return;
    if (this.p1Answered) return;
    if (this.gameMode === 'local2p' && this.turnOwner !== 'p1') return;

    const timeTaken = (Date.now() - this._roundStartTime) / 1000;
    const verdict = this.mathEngine.submitAttempt(userAnswer, this.currentProblem, this.p1.lives, this.p1.score);

    if (verdict.correct) {
      this.p1Answered    = true;
      this.p1.score     += verdict.score_delta;
      this.p1.streak     = verdict.streak;
      this.p1.totalTime += timeTaken;
      this.p1.wrongCount = 0; // reset wrong streak on correct
      this.whoHasPossession = 'p1';

      this._stopProblemTimer();
      this.cpu.cancelProblem();
      window.gameAudio?.playCorrect?.();

      this.events.emit('p1-verdict', { correct: true, score: this.p1.score, streak: this.p1.streak, delta: verdict.score_delta });
      if (this.gameMode === 'local2p') {
        this.events.emit('p2-status', 'P1 was faster!');
      } else {
        this.events.emit('p2-status', 'Too slow! 😅');
      }

      this._showPossession('p1', 'YOU GOT IT! 🏀');
      this._flashScreen('#22C55E');

      if (this.p1.streak >= 3 && this.p1.streak % 3 === 0) {
        this.events.emit('hot-streak', { player: 'p1', streak: this.p1.streak });
        window.gameAudio?.playHotStreak?.();
      }

      this._startShotPhase('p1');
    } else {
      // WRONG — count wrong answers, deduct life
      this.p1.wrongCount++;
      window.gameAudio?.playWrong?.();
      this._flashScreen('#EF4444', 0.15);

      if (this.gameMode !== 'flat') {
        this.p1.lives = Math.max(0, this.p1.lives - 1);
        this.events.emit('p1-lost-life', this.p1.lives);
      }

      this.events.emit('p1-verdict', { correct: false, score: this.p1.score, streak: 0 });

      // 3 wrong = instant loss
      if (this.p1.lives <= 0 && this.gameMode !== 'flat') {
        this._stopProblemTimer();
        this.cpu.cancelProblem();
        this.time.delayedCall(600, () => this._endMatch());
        return;
      }

      // Timer KEEPS RUNNING — just allow retry
      this.events.emit('allow-retry', {});
    }
  }

  _onP2PlayerAnswered(userAnswer) {
    if (this.state !== STATE.PROBLEM) return;
    if (this.p2Answered) return;
    if (this.gameMode !== 'local2p') return;
    if (this.turnOwner !== 'p2') return;

    const timeTaken = (Date.now() - this._roundStartTime) / 1000;
    const verdict = this.mathEngine.submitAttempt(userAnswer, this.currentProblem, this.p2.lives, this.p2.score);

    if (verdict.correct) {
      this.p2Answered    = true;
      this.p2.score     += verdict.score_delta;
      this.p2.streak     = verdict.streak;
      this.p2.totalTime += timeTaken;
      this.p2.wrongCount = 0;
      this.whoHasPossession = 'p2';

      this._stopProblemTimer();
      window.gameAudio?.playCorrect?.();

      this.events.emit('p2-verdict', { correct: true, score: this.p2.score, streak: this.p2.streak, delta: verdict.score_delta });
      this.events.emit('p1-status', 'P2 was faster!');
      this._showPossession('p2', 'P2 GOT IT! 🏀');
      this._flashScreen('#4DA6FF');

      // In 2P mode: P2 gets a REAL shot phase (press ENTER to throw)
      this._startShotPhase('p2');
    } else {
      this.p2.wrongCount++;
      window.gameAudio?.playWrong?.();

      if (this.gameMode !== 'flat') {
        this.p2.lives = Math.max(0, this.p2.lives - 1);
        this.events.emit('p2-lost-life', this.p2.lives);
      }

      this.events.emit('p2-verdict', { correct: false, score: this.p2.score, streak: 0 });

      if (this.p2.lives <= 0 && this.gameMode !== 'flat') {
        this._stopProblemTimer();
        this.time.delayedCall(600, () => this._endMatch());
        return;
      }

      this.events.emit('allow-p2-retry', {});
    }
  }

  _onCPUAnswered(isCorrect, timedOut) {
    if (this.state !== STATE.PROBLEM || this.p1Answered) return;
    if (timedOut) { this.events.emit('p2-status', 'Thinking...'); return; }

    this.p2Answered = true;
    this._stopProblemTimer();

    if (isCorrect) {
      this.p2.score  += 10;
      this.p2.streak += 1;
      this.whoHasPossession = 'p2';
      this.events.emit('p2-verdict', { correct: true, score: this.p2.score, streak: this.p2.streak });
      this.events.emit('p1-status', 'CPU was faster!');
      this._showPossession('p2', 'CPU SNATCHES IT!');
      this._playCPUShotSequence();
    } else {
      this.p2.streak = 0;
      this.events.emit('p2-verdict', { correct: false, score: this.p2.score, streak: 0 });
      this.events.emit('p2-status', 'CPU missed...');
      // Timer already stopped — go to next problem
      this.time.delayedCall(800, () => {
        if (this.state === STATE.PROBLEM) this._enterBuffer();
      });
    }
  }

  _onProblemTimeout() {
    if (this.state !== STATE.PROBLEM) return;
    this._timerRunning = false;
    this.cpu.cancelProblem();

    // CPU auto-answers correctly if P1 hasn't (solo mode)
    if (!this.p1Answered && !this.p2Answered && this.gameMode !== 'local2p') {
      // CPU steals possession on timeout
      this.p2Answered = true;
      this.p2.score += 10;
      this.p2.streak += 1;
      this.whoHasPossession = 'p2';
      this.events.emit('p2-verdict', { correct: true, score: this.p2.score, streak: this.p2.streak });
      this.events.emit('p1-status', 'Too slow! CPU steals!');
      this._showPossession('p2', 'CPU STEALS! ⚡');
      this.events.emit('timeout');
      this.events.emit('reveal-answer', { answer: this.currentProblem.answer });
      this.time.delayedCall(600, () => this._playCPUShotSequence());
      return;
    }

    // In 2P mode — both timed out
    if (this.gameMode !== 'flat') {
      if (!this.p1Answered) {
        this.p1.lives = Math.max(0, this.p1.lives - 1);
        this.events.emit('p1-lost-life', this.p1.lives);
      }
      if (!this.p2Answered) {
        this.p2.lives = Math.max(0, this.p2.lives - 1);
        this.events.emit('p2-lost-life', this.p2.lives);
      }
    }

    this.events.emit('timeout');
    this.events.emit('reveal-answer', { answer: this.currentProblem.answer });

    if (this.p1.lives <= 0 || (this.p2.lives <= 0 && this.gameMode !== 'flat')) {
      this.time.delayedCall(1200, () => this._endMatch());
      return;
    }
    this.time.delayedCall(1200, () => this._nextProblem());
  }

  // ── Shot Phase ──────────────────────────────────────────── //

  _startShotPhase(shooter) {
    this.state       = STATE.SHOT;
    this.shotPhaseActive = true;

    // Ball stays HIDDEN until player actually presses SPACE/ENTER
    // (ball.alpha stays 0 here — only shown in _releaseShotP1 / CPU shot)

    if (shooter === 'p1') {
      this._setPlayerSprite(this.playerP1, 'p1_throw');
    } else {
      this._setPlayerSprite(this.playerP2, 'p2_throw');
    }

    // Start power bar oscillating
    this.shotMechanic.start((power, zone) => {
      this.events.emit('power-update', { power, zone });
    });

    this.events.emit('shot-phase-start', { shooter });

    // Start shot timer (10s to throw)
    this._startShotTimer();
  }

  _releaseShotP1() {
    if (!this.shotMechanic.isActive) return;
    if (this.whoHasPossession !== 'p1') return;
    this._stopShotTimer();

    const result = this.shotMechanic.release();

    // NOW show ball at P1's throw position
    const pos = BALL_P1;
    this.ball.x = pos.x;
    this.ball.y = pos.y;
    this.ball.angle = 0;
    this.ball.setAlpha(1);

    if (this.ball.play && this.anims.exists('ball_spin_anim')) {
      this.ball.play('ball_spin_anim');
    }

    if (this.ballShadow) {
      this.ballShadow.setPosition(pos.x, PLAYER_Y - 20);
      this.ballShadow.setAlpha(0.5);
    }

    this._executeShotResult('p1', result);
  }

  _releaseShotP2() {
    if (!this.shotMechanic.isActive) return;
    if (this.whoHasPossession !== 'p2') return;
    this._stopShotTimer();

    const result = this.shotMechanic.release();

    // Show ball at P2's throw position
    const pos = BALL_P2;
    this.ball.x = pos.x;
    this.ball.y = pos.y;
    this.ball.angle = 0;
    this.ball.setAlpha(1);

    if (this.ball.play && this.anims.exists('ball_spin_anim')) {
      this.ball.play('ball_spin_anim');
    }

    if (this.ballShadow) {
      this.ballShadow.setPosition(pos.x, PLAYER_Y - 20);
      this.ballShadow.setAlpha(0.5);
    }

    this._executeShotResult('p2', result);
  }

  _executeShotResult(shooter, result) {
    this.state = STATE.RESULT;
    this.events.emit('power-update', { power: 0, zone: { name: 'hidden' } });
    this.events.emit('shot-phase-end');
    window.gameAudio?.playWhoosh?.();

    const isP1     = shooter === 'p1';
    // P1 shoots toward RIGHT hoop; P2 shoots toward LEFT hoop
    const targetX  = isP1 ? HOOP_RIGHT_X : HOOP_LEFT_X;
    const startPos = isP1 ? BALL_P1 : BALL_P2;

    // For a SCORED shot → ball goes into the ring hole exactly
    // For a MISS → ball veers past / short
    const duration = result.scored ? 950 : 720;
    const endX     = result.scored ? targetX : targetX + (isP1 ? 90 : -90);
    const endY     = result.scored ? HOOP_Y - 5 : HOOP_Y + 120;
    const arcPeak  = Math.min(startPos.y, HOOP_Y) - 160;

    const ball = this.ball;

    // Phase 1 — rise to peak
    this.tweens.add({
      targets:  ball,
      duration: Math.round(duration * 0.44),
      x:        (startPos.x + targetX) / 2,
      y:        arcPeak,
      ease:     'Quad.easeOut',
      onComplete: () => {
        // Phase 2 — fall to hoop
        this.tweens.add({
          targets:  ball,
          duration: Math.round(duration * 0.56),
          x:        endX,
          y:        endY,
          ease:     'Quad.easeIn',
          onComplete: () => this._onBallLanded(shooter, result)
        });
      }
    });

    // Shadow
    if (this.ballShadow) {
      this.tweens.add({
        targets: this.ballShadow,
        x: endX, y: PLAYER_Y - 20,
        scaleX: 0.35,
        duration, ease: 'Linear'
      });
    }
  }

  _onBallLanded(shooter, result) {
    if (this.ballShadow) this.ballShadow.setAlpha(0);
    if (this.ball.stop) this.ball.stop();

    if (result.scored) {
      const isP1 = shooter === 'p1';
      this._showBallGlow(isP1 ? HOOP_RIGHT_X : HOOP_LEFT_X);

      if (isP1) {
        this.p1.score += result.points;
        this.events.emit('p1-scored', { points: result.points, score: this.p1.score, zone: result.zone });
        this._setPlayerSprite(this.playerP1, 'p1_happy');
        this._setPlayerSprite(this.playerP2, 'p2_sad');
      } else {
        this.p2.score += result.points;
        this.events.emit('p2-scored', { points: result.points, score: this.p2.score, zone: result.zone });
        this._setPlayerSprite(this.playerP2, 'p2_happy');
        this._setPlayerSprite(this.playerP1, 'p1_sad');
      }

      window.gameAudio?.playBasket?.();
      this.events.emit('shot-result', { scorer: shooter, result });
    } else {
      window.gameAudio?.playMiss?.();
      this.events.emit('shot-miss', { shooter, result });
      this._setPlayerSprite(this.playerP1, 'p1_idle');
      this._setPlayerSprite(this.playerP2, 'p2_idle');
    }

    this.time.delayedCall(700, () => {
      this.ball.setAlpha(0);
      this._enterBuffer();
    });
  }

  _playCPUShotSequence() {
    // CPU throws — show ball immediately when CPU shoots
    const power  = Phaser.Math.Between(48, 98);
    const zone   = this.shotMechanic.getZone(power);
    const scored = Math.random() <= zone.probability;
    const points = scored ? zone.points : 0;

    this._setPlayerSprite(this.playerP2, 'p2_throw');

    // Show ball at CPU's position right before arc
    const pos = BALL_P2;
    this.ball.x = pos.x;
    this.ball.y = pos.y;
    this.ball.angle = 0;
    this.ball.setAlpha(1);

    if (this.ball.play && this.anims.exists('ball_spin_anim')) {
      this.ball.play('ball_spin_anim');
    }

    if (this.ballShadow) this.ballShadow.setPosition(pos.x, PLAYER_Y - 20).setAlpha(0.5);

    this.time.delayedCall(380, () => {
      window.gameAudio?.playWhoosh?.();
      this._executeShotResult('p2', { scored, points, zone: zone.name, label: zone.label, color: zone.color });
    });
  }

  _showBallGlow(x) {
    if (!this.ballGlow || !x) return;
    this.ballGlow.setPosition(x, HOOP_Y);
    this.ballGlow.setAlpha(0.9);
    this.tweens.add({ targets: this.ballGlow, alpha: 0, scale: 1.6, duration: 700, ease: 'Quad.easeOut' });
  }

  // ── Buffer ─────────────────────────────────────────────── //

  _enterBuffer() {
    this.state = STATE.BUFFER;
    this._setPlayerSprite(this.playerP1, 'p1_idle');
    this._setPlayerSprite(this.playerP2, 'p2_idle');

    if (this.gameMode !== 'flat') {
      if (this.p1.lives <= 0 || this.p2.lives <= 0) {
        this.time.delayedCall(900, () => this._endMatch());
        return;
      }
    }
    this.time.delayedCall(900, () => this._nextProblem());
  }

  // ── Helpers ───────────────────────────────────────────── //

  _showPossession(player, text) {
    this.events.emit('show-possession', {
      text, color: player === 'p1' ? '#FF8C3A' : '#4DA6FF'
    });
  }

  _flashScreen(hexColor) {
    const hex = parseInt(hexColor.replace('#', ''), 16);
    this.cameras.main.flash(180, (hex >> 16) & 0xFF, (hex >> 8) & 0xFF, hex & 0xFF, false);
  }

  // ── Match End ──────────────────────────────────────────── //

  _endMatch() {
    if (this.state === STATE.GAMEOVER) return;
    this.state = STATE.GAMEOVER;

    this._stopProblemTimer();
    this._stopShotTimer();
    this.shotMechanic.stop();
    this.cpu.cancelProblem();
    window.gameAudio?.stopMusic?.();

    let result;
    if (this.gameMode === 'flat') {
      result = 'complete';
    } else if (this.p1.lives <= 0) {
      result = 'lose';
    } else if (this.p2.lives <= 0) {
      result = 'win';
    } else if (this.p1.score > this.p2.score) {
      result = 'win';
    } else if (this.p1.score < this.p2.score) {
      result = 'lose';
    } else {
      const p1Avg = this.p1.totalTime / Math.max(1, this.problemIndex);
      const p2Avg = this.p2.totalTime / Math.max(1, this.problemIndex);
      result = p1Avg <= p2Avg ? 'win' : 'lose';
    }

    if (result === 'win') {
      this._setPlayerSprite(this.playerP1, 'p1_won');
      this._setPlayerSprite(this.playerP2, 'p2_cry');
      window.gameAudio?.playVictory?.();
    } else if (result === 'lose') {
      this._setPlayerSprite(this.playerP1, 'p1_cry');
      this._setPlayerSprite(this.playerP2, 'p2_won');
      window.gameAudio?.playDefeat?.();
    }

    this.events.emit('game-over', {
      result,
      p1Score:   this.p1.score,
      p2Score:   this.p2.score,
      p1Name:    this.p1.name,
      p2Name:    this.p2.name,
      accuracy:  this.mathEngine.getAccuracy(),
      problems:  this.problemIndex,
      streakMax: this.p1.streak,
      mode:      this.gameMode
    });
  }

  update() {}
}
