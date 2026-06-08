// ============================================================
// BootScene.js — Asset loading scene
// Loads all images, spritesheets, and registers animations
// ============================================================

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload() {
    this._createLoadingUI();

    // ── Court ──────────────────────────────────────────────── //
    this.load.image('court_bg', 'assets/images/court_bg.png');

    // ── Ball Assets ────────────────────────────────────────── //
    this.load.image('ball_idle',   'assets/images/ball_idle.png');
    this.load.image('ball_glow',   'assets/images/ball_glow.png');
    this.load.image('ball_shadow', 'assets/images/ball_shadow.png');
    this.load.image('star',        'assets/images/star.png');

    // Ball spin spritesheet (4 cols × 2 rows = 8 frames)
    // The sheet is 1400×700 (approx) so each frame ~350×350
    this.load.spritesheet('ball_spin', 'assets/sprites/ball_spin_sheet.png', {
      frameWidth: 350,
      frameHeight: 350
    });

    // ── Player 1 (Orange) States ───────────────────────────── //
    this.load.image('p1_idle',  'assets/images/player_orange.png');
    this.load.image('p1_throw', 'assets/images/player_1_throw.png');
    this.load.image('p1_happy', 'assets/images/player_1_happy.png');
    this.load.image('p1_sad',   'assets/images/player_1_sad.png');
    this.load.image('p1_cry',   'assets/images/player_1_cry.png');
    this.load.image('p1_won',   'assets/images/player_1_won.png');

    // ── Player 2 (Blue) States ─────────────────────────────── //
    this.load.image('p2_idle',  'assets/images/player_blue.png');
    this.load.image('p2_throw', 'assets/images/player_2_throw.png');
    this.load.image('p2_happy', 'assets/images/player_2_happy.png');
    this.load.image('p2_sad',   'assets/images/player_2_sad.png');
    this.load.image('p2_cry',   'assets/images/player_2_cry.png');
    this.load.image('p2_won',   'assets/images/player_2_won.png');

    // Progress events
    this.load.on('progress', v  => this._updateProgress(v));
    this.load.on('complete', () => this._onLoadComplete());
  }

  create() {
    // Register ball spin animation
    this.anims.create({
      key: 'ball_spin_anim',
      frames: this.anims.generateFrameNumbers('ball_spin', { start: 0, end: 7 }),
      frameRate: 12,
      repeat: -1
    });

    // Transition to menu after brief pause
    this.time.delayedCall(350, () => {
      this.scene.start('MenuScene');
    });
  }

  // ── Loading UI ────────────────────────────────────────── //

  _createLoadingUI() {
    const { width, height } = this.scale;
    const cx = width / 2;
    const cy = height / 2;

    const bg = this.add.graphics();
    bg.fillGradientStyle(0x060614, 0x060614, 0x0F3460, 0x1A1A2E, 1);
    bg.fillRect(0, 0, width, height);

    // Basketball emoji with bouncing animation
    const ball = this.add.text(cx, cy - 100, '🏀', { fontSize: 72 }).setOrigin(0.5);
    this.tweens.add({
      targets: ball,
      y: cy - 130,
      duration: 450,
      yoyo: true,
      repeat: -1,
      ease: 'Quad.easeOut'
    });

    this.add.text(cx, cy - 20, 'MATH SLAM', {
      fontFamily: "'Bebas Neue', sans-serif",
      fontSize: 64,
      color: '#E85D04',
      letterSpacing: 8,
      shadow: { offsetX: 0, offsetY: 4, color: '#000', blur: 8, fill: true }
    }).setOrigin(0.5);

    this.add.text(cx, cy + 30, 'BASKETBALL JAM', {
      fontFamily: "'Bebas Neue', sans-serif",
      fontSize: 32,
      color: '#1A6FBF',
      letterSpacing: 4,
      shadow: { offsetX: 0, offsetY: 2, color: '#000', blur: 4, fill: true }
    }).setOrigin(0.5);

    // Progress bar
    const barW = 400, barH = 12;
    const barY = cy + 100;

    this.add.rectangle(cx, barY, barW, barH, 0x0F3460).setOrigin(0.5);
    this._progressFill = this.add.rectangle(cx - barW/2, barY, 0, barH, 0xE85D04).setOrigin(0, 0.5);

    this._loadingText = this.add.text(cx, barY + 30, 'Loading...', {
      fontFamily: 'Inter, sans-serif',
      fontSize: 14,
      fontWeight: 'bold',
      color: '#94A3B8',
      letterSpacing: 3
    }).setOrigin(0.5);
  }

  _updateProgress(value) {
    const barW = 400;
    if (this._progressFill) this._progressFill.width = value * barW;
    if (this._loadingText)  this._loadingText.setText(`Loading... ${Math.round(value * 100)}%`);
  }

  _onLoadComplete() {
    if (this._loadingText)  this._loadingText.setText('Ready!');
    if (this._progressFill) this._progressFill.width = 400;
  }
}
