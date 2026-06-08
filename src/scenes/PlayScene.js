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

// Layout constants (calibrated to court_bg which has hoops on each side)
const P1_X          = 260;
const P2_X          = 1020;
const PLAYER_Y      = 580;   // feet on floor
const PLAYER_W      = 180;
const PLAYER_H      = 230;

// Hoop rim center positions in court_bg image (1280×720)
const HOOP_LEFT_X   = 280;
const HOOP_RIGHT_X  = 1000;
const HOOP_Y        = 300;

// Ball starting positions (in player's hands)
const BALL_P1 = { x: P1_X + 80,  y: PLAYER_Y - 180 };
const BALL_P2 = { x: P2_X - 80,  y: PLAYER_Y - 180 };
const BALL_SIZE = 72;

export class PlayScene extends Phaser.Scene {
  constructor() {
    super({ key: 'PlayScene' });
  }

  init(data) {
    this.gameMode   = data.mode || 'solo';
    this.gameTier   = data.tier || 'pro';

    this.state          = STATE.COUNTDOWN;
    this.currentProblem = null;
    this.problemIndex   = 0;
    this.totalProblems  = this.gameMode === 'flat' ? 10 : Phaser.Math.Between(9, 12);
    this.problemTimeLimit = this.gameMode === 'flat' ? 999 : 12;

    // Player state
    this.p1 = { score: 0, lives: 3, streak: 0, totalTime: 0, name: 'YOU' };
    this.p2 = {
      score: 0, lives: 3, streak: 0, totalTime: 0,
      name: this.gameMode === 'local2p' ? 'PLAYER 2' : 'CPU SHAQ'
    };

    // 2P turn system: alternate who answers first per problem
    this.turnOwner       = 'p1'; // who answers this round (alternates in 2P)
    this.p1Answered      = false;
    this.p2Answered      = false;
    this.whoHasPossession = null;
    this.shotPhaseActive  = false;
    this._problemTimerEvent = null;
    this._shotTimeout       = null;
  }

  create() {
    // ── Canvas visuals ────────────────────────────────────── //
    this._createCourt();
    this._createPlayers();
    this._createBall();
    this._createShadow();
    this._createBallGlow();

    // ── Engines ───────────────────────────────────────────── //
    this.mathEngine = new MathEngine();
    this.mathEngine.setTier(this.gameTier);

    this.cpu = new CPUPlayer();
    this.cpu.setSpeedTier(
      this.gameTier === 'varsity' ? 'easy' :
      this.gameTier === 'pro'     ? 'medium' : 'hard'
    );

    this.shotMechanic = new ShotMechanic();

    // ── Input ─────────────────────────────────────────────── //
    this._setupInput();

    // ── Listen for HUD events ─────────────────────────────── //
    this.events.on('player-answered',   this._onPlayerAnswered, this);
    this.events.on('p2-player-answered',this._onP2PlayerAnswered, this);

    // ── Init audio ────────────────────────────────────────── //
    if (window.gameAudio) {
      window.gameAudio.init().catch(() => {});
    }

    // ── Start countdown ───────────────────────────────────── //
    this._startCountdown();
  }

  // ── Court ─────────────────────────────────────────────── //

  _createCourt() {
    const { width, height } = this.scale;
    if (this.textures.exists('court_bg')) {
      this.add.image(width / 2, height / 2, 'court_bg')
        .setDisplaySize(width, height)
        .setDepth(0);
    } else {
      const g = this.add.graphics();
      g.fillGradientStyle(0x0a0a1e, 0x0a0a1e, 0x1A1A2E, 0x0F2040, 1);
      g.fillRect(0, 0, width, height);
      // Simple court floor
      g.fillStyle(0xC8864E, 0.8);
      g.fillRect(0, H - 200, width, 200);
    }
  }

  _createPlayers() {
    const p1Key = this.textures.exists('p1_idle') ? 'p1_idle' : null;
    const p2Key = this.textures.exists('p2_idle') ? 'p2_idle' : null;

    if (p1Key) {
      this.playerP1 = this.add.image(P1_X, PLAYER_Y, p1Key)
        .setDisplaySize(PLAYER_W, PLAYER_H)
        .setDepth(8)
        .setOrigin(0.5, 1);
    } else {
      this.playerP1 = this._drawPlayerFallback(P1_X, PLAYER_Y, 0xE85D04, 'P1');
    }

    if (p2Key) {
      this.playerP2 = this.add.image(P2_X, PLAYER_Y, p2Key)
        .setDisplaySize(PLAYER_W, PLAYER_H)
        .setDepth(8)
        .setOrigin(0.5, 1)
        .setFlipX(true);
    } else {
      this.playerP2 = this._drawPlayerFallback(P2_X, PLAYER_Y, 0x1A6FBF, 'P2');
    }

    // Player name labels
    this.add.text(P1_X, PLAYER_Y + 12, this.p1.name, {
      fontFamily: "'Nunito', sans-serif",
      fontSize: 16, fontStyle: 'bold',
      color: '#FF8C3A', stroke: '#000', strokeThickness: 3
    }).setOrigin(0.5).setDepth(9);

    this.add.text(P2_X, PLAYER_Y + 12, this.p2.name, {
      fontFamily: "'Nunito', sans-serif",
      fontSize: 16, fontStyle: 'bold',
      color: '#4DA6FF', stroke: '#000', strokeThickness: 3
    }).setOrigin(0.5).setDepth(9);
  }

  _drawPlayerFallback(x, y, color, label) {
    const g = this.add.graphics().setDepth(8);
    g.fillStyle(color, 1);
    g.fillCircle(x, y - 80, 24);
    g.fillRect(x - 18, y - 58, 36, 55);
    return g;
  }

  _setPlayerSprite(player, key) {
    // player = this.playerP1 or this.playerP2
    if (!player || typeof player.setTexture !== 'function') return;
    if (this.textures.exists(key)) {
      player.setTexture(key);
    }
  }

  _createBall() {
    // Use spinning spritesheet if available; fall back to idle image
    if (this.textures.exists('ball_spin')) {
      this.ball = this.add.sprite(BALL_P1.x, BALL_P1.y, 'ball_spin', 0)
        .setDisplaySize(BALL_SIZE, BALL_SIZE)
        .setDepth(12)
        .setAlpha(0);
    } else if (this.textures.exists('ball_idle')) {
      this.ball = this.add.image(BALL_P1.x, BALL_P1.y, 'ball_idle')
        .setDisplaySize(BALL_SIZE, BALL_SIZE)
        .setDepth(12)
        .setAlpha(0);
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
        .setDisplaySize(60, 20)
        .setDepth(7)
        .setAlpha(0);
    }
  }

  _createBallGlow() {
    if (this.textures.exists('ball_glow')) {
      this.ballGlow = this.add.image(0, 0, 'ball_glow')
        .setDisplaySize(120, 120)
        .setDepth(13)
        .setAlpha(0);
    }
  }

  // ── Input Setup ──────────────────────────────────────────── //

  _setupInput() {
    // P1: Space or Enter releases shot
    this.input.keyboard.on('keydown-SPACE', () => {
      if (this.state === STATE.SHOT && this.whoHasPossession === 'p1') {
        this._releaseShotP1();
      }
    });
    this.input.keyboard.on('keydown-ENTER', () => {
      if (this.state === STATE.SHOT && this.whoHasPossession === 'p1') {
        this._releaseShotP1();
      }
    });
  }

  // ── Countdown ─────────────────────────────────────────────── //

  _startCountdown() {
    this.state = STATE.COUNTDOWN;

    let el = document.getElementById('countdown-overlay');
    if (!el) {
      el = document.createElement('div');
      el.id = 'countdown-overlay';
      document.body.appendChild(el);
    }
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
    if (this.problemIndex >= this.totalProblems) {
      this._endMatch();
      return;
    }

    this.state         = STATE.PROBLEM;
    this.p1Answered    = false;
    this.p2Answered    = false;
    this.whoHasPossession = null;
    this.shotPhaseActive  = false;
    this.problemIndex++;

    // Alternate who answers first in 2P mode
    if (this.gameMode === 'local2p') {
      this.turnOwner = this.problemIndex % 2 === 1 ? 'p1' : 'p2';
    } else {
      this.turnOwner = 'p1'; // P1 always answers in solo/flat
    }

    // Generate problem
    this.currentProblem = this.mathEngine.generateProblem();
    this._roundStartTime = Date.now();

    // Notify HUD
    this.events.emit('new-problem', {
      problem:   this.currentProblem,
      index:     this.problemIndex,
      total:     this.totalProblems,
      timeLimit: this.problemTimeLimit,
      turnOwner: this.turnOwner,
      mode:      this.gameMode
    });

    // Player sprites — focus pose
    this._setPlayerSprite(this.playerP1, 'p1_idle');
    this._setPlayerSprite(this.playerP2, 'p2_idle');

    // CPU answers in solo/flat mode
    if (this.gameMode !== 'local2p') {
      this.cpu.scheduleProblem(this.currentProblem, this.problemTimeLimit, (isCorrect, timeTaken, timedOut) => {
        if (!this.p2Answered && this.state === STATE.PROBLEM) {
          this._onCPUAnswered(isCorrect, timedOut);
        }
      });
    }

    // Problem timer
    let timerCount = 0;
    this._problemTimerEvent = this.time.addEvent({
      delay: 1000,
      repeat: this.problemTimeLimit - 1,
      callback: () => {
        timerCount++;
        const remaining = this.problemTimeLimit - timerCount;
        this.events.emit('timer-tick', remaining);
        if (remaining <= 5 && remaining > 0) window.gameAudio?.playUrgentTick?.();
        if (remaining <= 0) this._onProblemTimeout();
      }
    });
  }

  // ── Answer Handling ──────────────────────────────────────── //

  // P1 (player 1 / human solo)
  _onPlayerAnswered(userAnswer) {
    if (this.state !== STATE.PROBLEM) return;
    if (this.p1Answered) return;

    // In 2P mode, only process if it's P1's turn
    if (this.gameMode === 'local2p' && this.turnOwner !== 'p1') return;

    this.p1Answered = true;
    const timeTaken = (Date.now() - this._roundStartTime) / 1000;
    this.p1.totalTime += timeTaken;

    if (this._problemTimerEvent) this._problemTimerEvent.remove();
    this.cpu.cancelProblem();

    const verdict = this.mathEngine.submitAttempt(
      userAnswer, this.currentProblem, this.p1.lives, this.p1.score
    );

    if (verdict.correct) {
      this.p1.score  += verdict.score_delta;
      this.p1.streak  = verdict.streak;
      this.whoHasPossession = 'p1';
      window.gameAudio?.playCorrect?.();

      this.events.emit('p1-verdict', {
        correct: true, score: this.p1.score,
        streak:  this.p1.streak, delta: verdict.score_delta
      });

      if (this.gameMode === 'local2p') {
        // In 2P mode, the other player (P2) now gets a shot chance too
        // But P1 answered first correctly → P1 gets possession
        this.events.emit('p2-status', 'P1 answered first!');
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
      // Wrong answer — allow retry
      this.p1Answered = false;
      window.gameAudio?.playWrong?.();
      this._flashScreen('#EF4444', 0.15);
      this.events.emit('p1-verdict', { correct: false, score: this.p1.score, streak: 0 });
      this.events.emit('allow-retry', {});
    }
  }

  // P2 human (local 2P mode)
  _onP2PlayerAnswered(userAnswer) {
    if (this.state !== STATE.PROBLEM) return;
    if (this.p2Answered) return;
    if (this.gameMode !== 'local2p') return;
    if (this.turnOwner !== 'p2') return;

    this.p2Answered = true;
    const timeTaken = (Date.now() - this._roundStartTime) / 1000;
    this.p2.totalTime += timeTaken;

    if (this._problemTimerEvent) this._problemTimerEvent.remove();

    const verdict = this.mathEngine.submitAttempt(
      userAnswer, this.currentProblem, this.p2.lives, this.p2.score
    );

    if (verdict.correct) {
      this.p2.score  += verdict.score_delta;
      this.p2.streak  = verdict.streak;
      this.whoHasPossession = 'p2';
      window.gameAudio?.playCorrect?.();

      this.events.emit('p2-verdict', {
        correct: true, score: this.p2.score,
        streak:  this.p2.streak, delta: verdict.score_delta
      });
      this.events.emit('p1-status', 'P2 answered first!');
      this._showPossession('p2', 'P2 GOT IT! 🏀');
      this._flashScreen('#4DA6FF', 0.15);
      this._playCPUShotSequence(); // P2 shoots
    } else {
      this.p2Answered = false;
      window.gameAudio?.playWrong?.();
      this.events.emit('p2-verdict', { correct: false, score: this.p2.score, streak: 0 });
      this.events.emit('allow-p2-retry', {});
    }
  }

  // CPU answers
  _onCPUAnswered(isCorrect, timedOut) {
    if (this.state !== STATE.PROBLEM || this.p1Answered) return;

    if (timedOut) {
      this.events.emit('p2-status', 'Thinking...');
      return;
    }

    this.p2Answered = true;
    if (this._problemTimerEvent) this._problemTimerEvent.remove();

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
      this.events.emit('p2-status', 'CPU missed...');
    }
  }

  _onProblemTimeout() {
    if (this.state !== STATE.PROBLEM) return;
    this.cpu.cancelProblem();

    // Lose life if not already answered
    if (!this.p1Answered && this.gameMode !== 'flat') {
      this.p1.lives = Math.max(0, this.p1.lives - 1);
      this.events.emit('p1-lost-life', this.p1.lives);
    }
    if (!this.p2Answered && this.gameMode !== 'flat') {
      this.p2.lives = Math.max(0, this.p2.lives - 1);
      this.events.emit('p2-lost-life', this.p2.lives);
    }

    this.events.emit('timeout');
    this.events.emit('reveal-answer', { answer: this.currentProblem.answer });

    // Check elimination
    if (this.p1.lives <= 0 || (this.p2.lives <= 0 && this.gameMode !== 'flat')) {
      this.time.delayedCall(1400, () => this._endMatch());
      return;
    }

    this.time.delayedCall(1400, () => this._nextProblem());
  }

  // ── Shot Phase ──────────────────────────────────────────── //

  _startShotPhase(shooter) {
    this.state = STATE.SHOT;
    this.shotPhaseActive = true;

    // Show ball at shooter's position
    const pos = shooter === 'p1' ? BALL_P1 : BALL_P2;
    this.ball.x = pos.x;
    this.ball.y = pos.y;
    this.ball.angle = 0;
    this.ball.setAlpha(1);

    // Play spin animation if it's a sprite
    if (this.ball.play && this.anims.exists('ball_spin_anim')) {
      this.ball.play('ball_spin_anim');
    }

    // Shadow
    if (this.ballShadow) {
      this.ballShadow.setPosition(pos.x, PLAYER_Y - 10);
      this.ballShadow.setAlpha(0.5);
    }

    // Switch to throw sprite
    if (shooter === 'p1') {
      this._setPlayerSprite(this.playerP1, 'p1_throw');
    } else {
      this._setPlayerSprite(this.playerP2, 'p2_throw');
    }

    // Start power bar
    this.shotMechanic.start((power, zone) => {
      this.events.emit('power-update', { power, zone });
    });

    this.events.emit('shot-phase-start', { shooter });

    // Auto-timeout after 4.5s
    this._shotTimeout = this.time.delayedCall(4500, () => {
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
    window.gameAudio?.playWhoosh?.();

    const isP1  = shooter === 'p1';
    const targetX = isP1 ? HOOP_RIGHT_X : HOOP_LEFT_X;
    const startPos = isP1 ? BALL_P1 : BALL_P2;
    const duration = result.scored ? 900 : 700;
    const endX = result.scored ? targetX : targetX + (isP1 ? 80 : -80);
    const endY = result.scored ? HOOP_Y + 10 : HOOP_Y + 100;
    const arcPeak = Math.min(startPos.y, HOOP_Y) - 140;

    const ball = this.ball;

    // Arc tween — up
    this.tweens.add({
      targets: ball,
      duration: Math.round(duration * 0.45),
      x: (startPos.x + targetX) / 2,
      y: arcPeak,
      ease: 'Quad.easeOut',
      onComplete: () => {
        // Arc tween — down
        this.tweens.add({
          targets: ball,
          duration: Math.round(duration * 0.55),
          x: endX,
          y: endY,
          ease: 'Quad.easeIn',
          onComplete: () => this._onBallLanded(shooter, result)
        });
      }
    });

    // Shadow follows ball on ground (lerps to hoop)
    if (this.ballShadow) {
      this.tweens.add({
        targets: this.ballShadow,
        x: endX,
        y: PLAYER_Y - 10,
        scaleX: 0.4,
        duration: duration,
        ease: 'Linear'
      });
    }
  }

  _onBallLanded(shooter, result) {
    if (this.ballShadow) this.ballShadow.setAlpha(0);
    // Stop spin animation
    if (this.ball.stop) this.ball.stop();

    if (result.scored) {
      const isP1 = shooter === 'p1';

      // Glow effect at hoop
      this._showBallGlow(result.scored ? (isP1 ? HOOP_RIGHT_X : HOOP_LEFT_X) : 0);

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
    // CPU auto-shoot
    const power = Phaser.Math.Between(50, 98);
    const zone  = this.shotMechanic.getZone(power);
    const scored = Math.random() <= zone.probability;
    const points = scored ? zone.points : 0;

    this.ball.setAlpha(1);
    this.ball.x = BALL_P2.x;
    this.ball.y = BALL_P2.y;
    this.ball.angle = 0;
    if (this.ballShadow) this.ballShadow.setPosition(BALL_P2.x, PLAYER_Y - 10).setAlpha(0.5);
    this._setPlayerSprite(this.playerP2, 'p2_throw');

    this.time.delayedCall(380, () => {
      window.gameAudio?.playWhoosh?.();
      this._executeShotResult('p2', { scored, points, zone: zone.name, label: zone.label, color: zone.color });
    });
  }

  _showBallGlow(x) {
    if (!this.ballGlow || !x) return;
    this.ballGlow.setPosition(x, HOOP_Y);
    this.ballGlow.setAlpha(0.9);
    this.tweens.add({
      targets: this.ballGlow,
      alpha: 0,
      scale: 1.6,
      duration: 700,
      ease: 'Quad.easeOut'
    });
  }

  // ── Buffer ─────────────────────────────────────────────── //

  _enterBuffer() {
    this.state = STATE.BUFFER;

    // Return players to idle
    this._setPlayerSprite(this.playerP1, 'p1_idle');
    this._setPlayerSprite(this.playerP2, 'p2_idle');

    // Check win conditions
    if (this.gameMode !== 'flat') {
      if (this.p1.lives <= 0 || this.p2.lives <= 0) {
        this.time.delayedCall(900, () => this._endMatch());
        return;
      }
    }

    this.time.delayedCall(900, () => this._nextProblem());
  }

  // ── Possession ─────────────────────────────────────────── //

  _showPossession(player, text) {
    this.events.emit('show-possession', {
      text,
      color: player === 'p1' ? '#FF8C3A' : '#4DA6FF'
    });
  }

  // ── Flash ──────────────────────────────────────────────── //

  _flashScreen(hexColor, intensity = 0.25) {
    // Camera flash using a screen overlay tween
    const hex = parseInt(hexColor.replace('#', ''), 16);
    this.cameras.main.flash(180, (hex >> 16) & 0xFF, (hex >> 8) & 0xFF, hex & 0xFF, false);
  }

  // ── Match End ──────────────────────────────────────────── //

  _endMatch() {
    if (this.state === STATE.GAMEOVER) return;
    this.state = STATE.GAMEOVER;

    window.gameAudio?.stopMusic?.();
    this._setPlayerSprite(this.playerP1, 'p1_idle');
    this._setPlayerSprite(this.playerP2, 'p2_idle');

    // Determine winner
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
      // Tiebreaker: faster average time wins
      const p1Avg = this.p1.totalTime / Math.max(1, this.problemIndex);
      const p2Avg = this.p2.totalTime / Math.max(1, this.problemIndex);
      result = p1Avg <= p2Avg ? 'win' : 'lose';
    }

    // Update player sprites to win/lose state
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

  update() {
    // Subtle ball bobbing near player while in PROBLEM state
    if (this.state === STATE.PROBLEM && this.ball && this.ball.alpha < 0.1) {
      // nothing to animate while hidden
    }
  }
}
