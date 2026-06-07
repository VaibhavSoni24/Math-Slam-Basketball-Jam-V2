// ============================================================
// PlayScene.js — Core game loop
// Manages: court, players, ball, problem cycle, shot mechanic
// ============================================================

import { MathEngine }   from '../game/MathEngine.js';
import { CPUPlayer }    from '../game/CPUPlayer.js';
import { ShotMechanic } from '../game/ShotMechanic.js';

const W = 1280;
const H = 720;

// Game states
const STATE = {
  COUNTDOWN:  'countdown',
  PROBLEM:    'problem',
  SHOT:       'shot',
  RESULT:     'result',
  BUFFER:     'buffer',
  GAMEOVER:   'gameover'
};

// Positions
const P1_X = 220;
const P2_X = 1060;
const PLAYER_Y = 500;
const HOOP_LEFT_X  = 120;
const HOOP_RIGHT_X = 1160;
const HOOP_Y = 360;
const BALL_START_P1 = { x: P1_X, y: PLAYER_Y - 60 };
const BALL_START_P2 = { x: P2_X, y: PLAYER_Y - 60 };

export class PlayScene extends Phaser.Scene {
  constructor() {
    super({ key: 'PlayScene' });
  }

  init(data) {
    this.gameMode = data.mode || 'solo';
    this.gameTier = data.tier || 'pro';

    // Game state
    this.state = STATE.COUNTDOWN;
    this.currentProblem = null;
    this.problemIndex = 0;
    this.totalProblems = this.gameMode === 'flat' ? 10 : Phaser.Math.Between(8, 12);
    this.problemTimer = 0;
    this.problemTimeLimit = this.gameMode === 'flat' ? 999 : 10; // seconds

    // Player 1 state
    this.p1 = { score: 0, lives: 3, streak: 0, hasPossession: false, name: 'YOU' };
    // Player 2 / CPU state
    this.p2 = { score: 0, lives: 3, streak: 0, hasPossession: false, name: this.gameMode === 'local2p' ? 'P2' : 'CPU Shaq' };

    this.whoHasPossession = null; // 'p1' | 'p2' | null
    this.shotPhaseActive = false;
    this.p1Answered = false;
    this.p2Answered = false;
    this.cpuAnswerScheduled = false;
  }

  create() {
    const audio = window.gameAudio;
    if (audio) audio.init();

    // ── Canvas Elements ──────────────────────────────────── //
    this._createCourt();
    this._createHoops();
    this._createPlayers();
    this._createBall();
    this._createFlashGraphics();

    // ── Input ─────────────────────────────────────────────── //
    this._setupInput();

    // ── Engine + CPU ──────────────────────────────────────── //
    this.mathEngine = new MathEngine();
    this.mathEngine.setTier(this.gameTier);

    this.cpu = new CPUPlayer();
    this.cpu.setSpeedTier(this.gameTier === 'varsity' ? 'easy' :
                          this.gameTier === 'pro'     ? 'medium' : 'hard');

    this.shotMechanic = new ShotMechanic();

    // ── Events with HudScene ──────────────────────────────── //
    this.events.on('player-answered', this._onPlayerAnswered, this);

    // ── Start countdown ───────────────────────────────────── //
    this._startCountdown();
  }

  // ── Court & Visuals ──────────────────────────────────────── //

  _createCourt() {
    const { width, height } = this.scale;

    // Background
    const bg = this.textures.exists('court_bg')
      ? this.add.image(width / 2, height / 2, 'court_bg').setDisplaySize(width, height)
      : (() => {
          const g = this.add.graphics();
          g.fillGradientStyle(0x0a0a1e, 0x0a0a1e, 0x1A1A2E, 0x0F2040, 1);
          g.fillRect(0, 0, width, height);
          return g;
        })();

    // Overlay court floor
    const floor = this.add.graphics();
    floor.fillGradientStyle(0xC8864E, 0xC8864E, 0xA86C3A, 0xA86C3A, 0.85);
    floor.fillRect(0, H - 220, width, 220);

    // Court lines
    floor.lineStyle(3, 0xffffff, 0.5);
    floor.strokeRect(50, H - 210, width - 100, 200);
    floor.strokeCircle(width / 2, H - 110, 60);
    floor.moveTo(width / 2, H - 220);
    floor.lineTo(width / 2, H - 20);
    floor.strokePath();

    // Paint areas (free throw lanes)
    floor.lineStyle(3, 0xffffff, 0.4);
    floor.strokeRect(50, H - 210, 220, 160);
    floor.strokeRect(width - 270, H - 210, 220, 160);
  }

  _createHoops() {
    const hoopExists = this.textures.exists('hoop');

    // Left hoop (P2 shoots here from right, P1 defends)
    if (hoopExists) {
      this.hoopLeft = this.add.image(HOOP_LEFT_X, HOOP_Y, 'hoop')
        .setDisplaySize(120, 100)
        .setDepth(5);
    } else {
      this._drawHoop(HOOP_LEFT_X, HOOP_Y, 'left');
    }

    // Right hoop (P1 shoots here from left, P2 defends)
    if (hoopExists) {
      this.hoopRight = this.add.image(HOOP_RIGHT_X, HOOP_Y, 'hoop')
        .setDisplaySize(120, 100)
        .setDepth(5)
        .setFlipX(true);
    } else {
      this._drawHoop(HOOP_RIGHT_X, HOOP_Y, 'right');
    }

    // Basket net flash (hidden initially)
    this.netFlashLeft  = this.add.graphics().setDepth(10).setAlpha(0);
    this.netFlashRight = this.add.graphics().setDepth(10).setAlpha(0);
  }

  _drawHoop(x, y, side) {
    const g = this.add.graphics().setDepth(5);
    const flip = side === 'right' ? -1 : 1;

    // Backboard
    g.lineStyle(4, 0xaaaaaa, 1);
    g.fillStyle(0x444466, 0.8);
    g.fillRect(x + flip * 30, y - 40, 8, 70);
    g.strokeRect(x + flip * 30, y - 40, 8, 70);

    // Rim
    g.lineStyle(5, 0xE85D04, 1);
    g.strokeRect(x - 35, y, 70, 8);

    // Net lines
    g.lineStyle(2, 0xffffff, 0.7);
    for (let i = 0; i <= 5; i++) {
      const nx = x - 30 + i * 12;
      g.moveTo(nx, y + 8);
      g.lineTo(nx + (i < 3 ? -4 : 4), y + 40);
      g.strokePath();
    }
    g.moveTo(x - 30, y + 8);
    g.lineTo(x + 30, y + 8);
    g.strokePath();
    g.moveTo(x - 26, y + 24);
    g.lineTo(x + 26, y + 24);
    g.strokePath();
    g.moveTo(x - 20, y + 40);
    g.lineTo(x + 20, y + 40);
    g.strokePath();
  }

  _createPlayers() {
    const p1Exists = this.textures.exists('player_p1');
    const p2Exists = this.textures.exists('player_p2');

    if (p1Exists) {
      this.playerP1 = this.add.sprite(P1_X, PLAYER_Y, 'player_p1', 0)
        .setDisplaySize(120, 120)
        .setDepth(8);
      this.playerP1.play('p1_idle');
    } else {
      this.playerP1 = this._drawPlayerFallback(P1_X, PLAYER_Y, 0xE85D04, 'P1');
    }

    if (p2Exists) {
      this.playerP2 = this.add.sprite(P2_X, PLAYER_Y, 'player_p2', 0)
        .setDisplaySize(120, 120)
        .setDepth(8)
        .setFlipX(true);
      this.playerP2.play('p2_idle');
    } else {
      this.playerP2 = this._drawPlayerFallback(P2_X, PLAYER_Y, 0x1A6FBF, 'P2');
    }

    // Player name labels
    this._p1Label = this.add.text(P1_X, PLAYER_Y + 70, this.p1.name, {
      fontFamily: "'Bebas Neue', sans-serif",
      fontSize: 18,
      color: '#E85D04',
      letterSpacing: 2
    }).setOrigin(0.5).setDepth(9);

    this._p2Label = this.add.text(P2_X, PLAYER_Y + 70, this.p2.name, {
      fontFamily: "'Bebas Neue', sans-serif",
      fontSize: 18,
      color: '#1A6FBF',
      letterSpacing: 2
    }).setOrigin(0.5).setDepth(9);
  }

  _drawPlayerFallback(x, y, color, label) {
    const g = this.add.graphics().setDepth(8);
    // Body
    g.fillStyle(color, 1);
    g.fillCircle(x, y - 50, 28); // Head
    g.fillRect(x - 22, y - 25, 44, 60); // Body
    g.fillRect(x - 28, y - 20, 18, 50); // Left arm
    g.fillRect(x + 10, y - 20, 18, 50); // Right arm
    g.fillRect(x - 20, y + 34, 18, 50); // Left leg
    g.fillRect(x + 2, y + 34, 18, 50); // Right leg

    // Jersey number
    g.fillStyle(0xffffff, 1);
    const txt = this.add.text(x, y + 5, label, {
      fontFamily: "'Bebas Neue', sans-serif",
      fontSize: 16, color: '#ffffff'
    }).setOrigin(0.5).setDepth(9);

    return g;
  }

  _createBall() {
    const ballExists = this.textures.exists('basketball');

    if (ballExists) {
      this.ball = this.add.sprite(P1_X, BALL_START_P1.y - 20, 'basketball', 0)
        .setDisplaySize(48, 48)
        .setDepth(10)
        .setAlpha(0);
    } else {
      // Fallback drawn ball
      const ballG = this.add.graphics().setDepth(10).setAlpha(0);
      ballG.fillStyle(0xE8651A, 1);
      ballG.fillCircle(0, 0, 24);
      ballG.lineStyle(2, 0x333333, 1);
      ballG.strokeCircle(0, 0, 24);
      ballG.x = P1_X; ballG.y = BALL_START_P1.y - 20;
      this.ball = ballG;
    }

    this.ballOwner = null; // 'p1' | 'p2' | null
  }

  _createFlashGraphics() {
    // Full-screen flash for correct/wrong feedback
    this.flashGraphics = this.add.graphics().setDepth(50);
    this.flashGraphics.setAlpha(0);
  }

  // ── Input Setup ──────────────────────────────────────────── //

  _setupInput() {
    this.input.keyboard.on('keydown-ENTER', this._onEnterPressed, this);
    this.input.keyboard.on('keydown-SPACE', this._onSpacePressed, this);

    // P2 local input (right Enter = numpad Enter)
    this.input.keyboard.on('keydown-NUMPAD_ENTER', () => {
      if (this.gameMode === 'local2p') this._onP2Answered();
    });
  }

  // ── Countdown ────────────────────────────────────────────── //

  _startCountdown() {
    this.state = STATE.COUNTDOWN;
    const overlay = document.getElementById('countdown-overlay');
    if (!overlay) return;
    overlay.classList.add('show');

    let count = 3;
    const tick = () => {
      if (window.gameAudio) window.gameAudio.playCountdown();
      overlay.innerHTML = `<div class="countdown-num">${count}</div>`;
      count--;
      if (count > 0) {
        this.time.delayedCall(1000, tick);
      } else {
        this.time.delayedCall(1000, () => {
          overlay.innerHTML = `<div class="countdown-num" style="color:#E85D04">GO!</div>`;
          if (window.gameAudio) window.gameAudio.playCountdownGo();
          this.time.delayedCall(700, () => {
            overlay.classList.remove('show');
            if (window.gameAudio) window.gameAudio.startMusic();
            this._nextProblem();
          });
        });
      }
    };
    tick();
  }

  // ── Problem Cycle ────────────────────────────────────────── //

  _nextProblem() {
    if (this.problemIndex >= this.totalProblems) {
      this._endMatch();
      return;
    }

    // Check flat mode batch done
    if (this.gameMode === 'flat' && this.problemIndex >= 10) {
      this._endMatch();
      return;
    }

    this.state = STATE.PROBLEM;
    this.p1Answered = false;
    this.p2Answered = false;
    this.whoHasPossession = null;
    this.shotPhaseActive = false;
    this.problemTimer = 0;
    this.problemIndex++;

    // Generate problem
    this.currentProblem = this.mathEngine.generateProblem();

    // Tell HUD to display new problem
    this.events.emit('new-problem', {
      problem: this.currentProblem,
      index: this.problemIndex,
      total: this.totalProblems,
      timeLimit: this.problemTimeLimit
    });

    // Player animations: focus
    this._playAnim(this.playerP1, 'p1_focus');
    this._playAnim(this.playerP2, 'p2_focus');

    // CPU: schedule answer (solo + flat mode)
    if (this.gameMode !== 'local2p') {
      this.cpuAnswerScheduled = true;
      const timeLimit = this.gameMode === 'flat' ? 8 : this.problemTimeLimit;
      this.cpu.scheduleProblem(this.currentProblem, timeLimit, (isCorrect, timeTaken, timedOut) => {
        this.cpuAnswerScheduled = false;
        if (!this.p2Answered && this.state === STATE.PROBLEM) {
          this._onCPUAnswered(isCorrect, timedOut);
        }
      });
    }

    // Problem timer countdown (shown in HUD)
    this._problemTimerEvent = this.time.addEvent({
      delay: 1000,
      repeat: this.problemTimeLimit - 1,
      callback: () => {
        this.problemTimer++;
        const remaining = this.problemTimeLimit - this.problemTimer;
        this.events.emit('timer-tick', remaining);
        if (remaining <= 5 && remaining > 0 && window.gameAudio) {
          window.gameAudio.playUrgentTick();
        }
        if (remaining <= 0) {
          this._onProblemTimeout();
        }
      }
    });
  }

  _onEnterPressed() {
    if (this.state === STATE.SHOT && this.whoHasPossession === 'p1') {
      this._releaseShotP1();
    }
  }

  _onSpacePressed() {
    if (this.state === STATE.SHOT && this.whoHasPossession === 'p1') {
      this._releaseShotP1();
    }
  }

  // Called from HUD when player types an answer and submits
  _onPlayerAnswered(userAnswer) {
    if (this.state !== STATE.PROBLEM || this.p1Answered) return;
    this.p1Answered = true;

    if (this._problemTimerEvent) this._problemTimerEvent.remove();
    this.cpu.cancelProblem();

    const verdict = this.mathEngine.submitAttempt(userAnswer, this.currentProblem, this.p1.lives, this.p1.score);

    if (verdict.correct) {
      this.p1.score += verdict.score_delta;
      this.p1.streak = verdict.streak;
      this.whoHasPossession = 'p1';
      this._showPossession('p1', 'YOU GOT IT!');
      this._flashCorrect();
      this.events.emit('p1-verdict', { correct: true, score: this.p1.score, streak: this.p1.streak });
      this.events.emit('p2-status', 'Too Slow! 😅');
      if (window.gameAudio) window.gameAudio.playCorrect();
      if (this.p1.streak >= 3 && this.p1.streak % 3 === 0) {
        this.events.emit('hot-streak', { player: 'p1', streak: this.p1.streak });
        if (window.gameAudio) window.gameAudio.playHotStreak();
      }
      this._startShotPhase('p1');
    } else {
      this.p1.streak = 0;
      this._flashWrong();
      this.events.emit('p1-verdict', { correct: false, score: this.p1.score, streak: 0 });
      this.events.emit('wrong-answer', { correctAnswer: this.currentProblem.answer });
      if (window.gameAudio) window.gameAudio.playWrong();
      // Wrong answer doesn't cost a life — allow retry
      this.p1Answered = false;
      // Re-enable input
      this.events.emit('allow-retry', { correctAnswer: this.currentProblem.answer });
    }
  }

  _onCPUAnswered(isCorrect, timedOut) {
    if (this.p1Answered || this.state !== STATE.PROBLEM) return;

    if (timedOut) {
      // CPU timed out — P1 still has time
      this.events.emit('p2-status', 'Thinking...');
      return;
    }

    this.p2Answered = true;
    if (this._problemTimerEvent) this._problemTimerEvent.remove();

    if (isCorrect) {
      this.p2.score += 10;
      this.p2.streak++;
      this.whoHasPossession = 'p2';
      this._showPossession('p2', 'CPU SCORES!');
      this.events.emit('p2-verdict', { correct: true, score: this.p2.score, streak: this.p2.streak });
      this.events.emit('p1-status', 'Too Slow!');
      if (window.gameAudio) window.gameAudio.playWrong();
      this._playCPUShotSequence();
    } else {
      this.p2.streak = 0;
      // CPU was wrong — P1 can still answer
      this.events.emit('p2-status', 'CPU missed...');
    }
  }

  _onProblemTimeout() {
    if (this.state !== STATE.PROBLEM) return;

    this.cpu.cancelProblem();

    // Neither answered in time
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

    // Check elimination
    if (this.p1.lives <= 0 || (this.p2.lives <= 0 && this.gameMode !== 'flat')) {
      this.time.delayedCall(1200, () => this._endMatch());
      return;
    }

    this.time.delayedCall(1200, () => this._nextProblem());
  }

  _onP2Answered() {
    // Local 2P mode: P2 presses Enter when they've typed their answer
    // HUD handles collecting P2's typed answer and fires this
  }

  // ── Shot Phase ─────────────────────────────────────────────── //

  _startShotPhase(shooter) {
    this.state = STATE.SHOT;
    this.shotPhaseActive = true;

    // Animate to shooting pose
    if (shooter === 'p1') {
      this._playAnim(this.playerP1, 'p1_shoot');
    } else {
      this._playAnim(this.playerP2, 'p2_shoot');
    }

    // Show ball
    const startPos = shooter === 'p1' ? BALL_START_P1 : BALL_START_P2;
    this.ball.setAlpha(1);
    this.ball.x = startPos.x;
    this.ball.y = startPos.y;

    // Start power bar
    this.shotMechanic.start((power, zone) => {
      this.events.emit('power-update', { power, zone });
    });

    // Show shoot instruction in HUD
    this.events.emit('shot-phase-start', { shooter });

    // Auto-timeout if player doesn't shoot in 4 seconds
    this._shotTimeout = this.time.delayedCall(4000, () => {
      if (this.state === STATE.SHOT) {
        const result = this.shotMechanic.timeout();
        this._executeShotResult(shooter, result);
      }
    });
  }

  _releaseShotP1() {
    if (!this.shotMechanic.isActive) return;
    if (this._shotTimeout) this._shotTimeout.remove();

    const result = this.shotMechanic.release();
    this._executeShotResult('p1', result);
  }

  _executeShotResult(shooter, result) {
    this.state = STATE.RESULT;
    this.events.emit('power-update', { power: 0, zone: { name: 'hidden' } });
    this.events.emit('shot-phase-end');

    if (window.gameAudio) window.gameAudio.playWhoosh();

    // Determine target hoop (P1 shoots at right hoop, P2 at left)
    const targetX = shooter === 'p1' ? HOOP_RIGHT_X : HOOP_LEFT_X;
    const targetY = HOOP_Y;
    const startPos = shooter === 'p1' ? BALL_START_P1 : BALL_START_P2;

    // Animate ball arc
    const duration = result.scored ? 800 : 600;
    const endX = result.scored ? targetX : targetX + (shooter === 'p1' ? 60 : -60);
    const endY = result.scored ? targetY + 20 : targetY + 80;

    // Bezier arc using Phaser tweens with a timeline
    const ballObj = this.ball;
    const arcPeak = Math.min(startPos.y, targetY) - 120;

    // Timeline of tweens for arc
    this.tweens.add({
      targets: ballObj,
      duration: Math.round(duration * 0.5),
      x: (startPos.x + targetX) / 2,
      y: arcPeak,
      ease: 'Quad.easeOut',
      onComplete: () => {
        this.tweens.add({
          targets: ballObj,
          duration: Math.round(duration * 0.5),
          x: endX,
          y: endY,
          ease: 'Quad.easeIn',
          onUpdate: (t) => { ballObj.angle += 12; },
          onComplete: () => {
            this._onBallLanded(shooter, result);
          }
        });
      }
    });
  }

  _onBallLanded(shooter, result) {
    if (result.scored) {
      // Score!
      if (shooter === 'p1') {
        this.p1.score += result.points;
        this.events.emit('p1-scored', { points: result.points, score: this.p1.score, zone: result.zone });
        this._playAnim(this.playerP1, 'p1_celebrate');
        this._playAnim(this.playerP2, 'p2_disappoint');
        this._showBasketFlash(HOOP_RIGHT_X, HOOP_Y);
      } else {
        this.p2.score += result.points;
        this.events.emit('p2-scored', { points: result.points, score: this.p2.score, zone: result.zone });
        this._playAnim(this.playerP2, 'p2_celebrate');
        this._playAnim(this.playerP1, 'p1_disappoint');
        this._showBasketFlash(HOOP_LEFT_X, HOOP_Y);
      }
      if (window.gameAudio) window.gameAudio.playBasket();
      this.events.emit('shot-result', { scorer: shooter, result });
    } else {
      // Miss
      if (window.gameAudio) window.gameAudio.playMiss();
      this.events.emit('shot-miss', { shooter, result });
      this._playAnim(this.playerP1, 'p1_idle');
      this._playAnim(this.playerP2, 'p2_idle');
    }

    // Reset ball
    this.time.delayedCall(600, () => {
      this.ball.setAlpha(0);
      this._enterBuffer();
    });
  }

  _playCPUShotSequence() {
    // CPU auto-shoots with random power (simulating skill)
    const power = Phaser.Math.Between(45, 100);
    const zone = this.shotMechanic.getZone(power);
    const scored = Math.random() <= zone.probability;
    const points = scored ? zone.points : 0;

    // Show ball briefly
    this.ball.setAlpha(1);
    this.ball.x = BALL_START_P2.x;
    this.ball.y = BALL_START_P2.y;
    this._playAnim(this.playerP2, 'p2_shoot');

    this.time.delayedCall(400, () => {
      if (window.gameAudio) window.gameAudio.playWhoosh();
      this._executeShotResult('p2', { scored, points, zone: zone.name, label: zone.label, color: zone.color });
    });
  }

  _showBasketFlash(x, y) {
    // Green ring flash at the hoop
    this.tweens.add({
      targets: this.flashGraphics,
      alpha: { from: 0.8, to: 0 },
      duration: 500,
      onUpdate: (t) => {
        this.flashGraphics.clear();
        this.flashGraphics.lineStyle(8, 0x22C55E, this.flashGraphics.alpha);
        this.flashGraphics.strokeCircle(x, y, 40 + t.progress * 30);
      }
    });
  }

  // ── Buffer ───────────────────────────────────────────────── //

  _enterBuffer() {
    this.state = STATE.BUFFER;
    this._playAnim(this.playerP1, 'p1_idle');
    this._playAnim(this.playerP2, 'p2_idle');

    // Check win conditions
    if (this.gameMode !== 'flat') {
      if (this.p1.lives <= 0 || this.p2.lives <= 0) {
        this.time.delayedCall(800, () => this._endMatch());
        return;
      }
    }

    this.time.delayedCall(800, () => this._nextProblem());
  }

  // ── Possession Display ───────────────────────────────────── //

  _showPossession(player, text) {
    const color = player === 'p1' ? '#E85D04' : '#1A6FBF';
    this.events.emit('show-possession', { text, color });
  }

  // ── Animations ───────────────────────────────────────────── //

  _playAnim(sprite, key) {
    if (!sprite || typeof sprite.play !== 'function') return;
    try { sprite.play(key); } catch (e) {}
  }

  // ── Flash Effects ─────────────────────────────────────────── //

  _flashCorrect() {
    this.cameras.main.flash(200, 34, 197, 94, false);
  }

  _flashWrong() {
    this.cameras.main.shake(200, 0.006);
    this.cameras.main.flash(150, 239, 68, 68, false);
  }

  // ── Match End ─────────────────────────────────────────────── //

  _endMatch() {
    if (this.state === STATE.GAMEOVER) return;
    this.state = STATE.GAMEOVER;

    if (window.gameAudio) window.gameAudio.stopMusic();

    // Determine winner
    let result;
    if (this.gameMode === 'flat') {
      result = 'complete';
    } else if (this.p1.lives <= 0) {
      result = 'lose';
    } else if (this.p2.lives <= 0) {
      result = 'win';
    } else {
      result = this.p1.score > this.p2.score ? 'win' :
               this.p1.score < this.p2.score ? 'lose' : 'draw';
    }

    if (result === 'win') window.gameAudio && window.gameAudio.playVictory();
    else if (result === 'lose') window.gameAudio && window.gameAudio.playDefeat();

    this.events.emit('game-over', {
      result,
      p1Score: this.p1.score,
      p2Score: this.p2.score,
      accuracy: this.mathEngine.getAccuracy(),
      problems: this.problemIndex,
      streakMax: this.p1.streak
    });
  }

  // ── Update ───────────────────────────────────────────────── //

  update() {
    try {
      // Per-frame ball bobbing when idle on player
      if (this.state === STATE.PROBLEM && this.ball && this.ball.alpha === 0) {
        // nothing
      }
    } catch (e) {
      console.error('PlayScene update error:', e);
    }
  }
}
