// ============================================================
// BootScene.js — Asset loading scene
// Shows loading progress, then starts MenuScene
// ============================================================

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload() {
    // Show loading UI
    this._createLoadingUI();

    // Load all game assets
    this.load.image('court_bg',   'assets/images/court_bg.png');
    this.load.image('hoop',       'assets/images/hoop.png');
    this.load.image('basketball', 'assets/images/basketball.png');

    // Player spritesheets (2x2 grid = 4 poses)
    // Each frame is roughly 1/2 of image dimensions
    this.load.spritesheet('player_p1', 'assets/images/player_p1.png', {
      frameWidth: 256,
      frameHeight: 256
    });
    this.load.spritesheet('player_p2', 'assets/images/player_p2.png', {
      frameWidth: 256,
      frameHeight: 256
    });

    // Progress events
    this.load.on('progress', (value) => {
      this._updateProgress(value);
    });

    this.load.on('complete', () => {
      this._onLoadComplete();
    });
  }

  create() {
    // Register sprite animations (use single image frames by index)
    // P1 animations
    this.anims.create({
      key: 'p1_idle',
      frames: this.anims.generateFrameNumbers('player_p1', { frames: [0] }),
      frameRate: 1, repeat: -1
    });
    this.anims.create({
      key: 'p1_focus',
      frames: this.anims.generateFrameNumbers('player_p1', { frames: [1] }),
      frameRate: 1, repeat: -1
    });
    this.anims.create({
      key: 'p1_shoot',
      frames: this.anims.generateFrameNumbers('player_p1', { frames: [2] }),
      frameRate: 1, repeat: -1
    });
    this.anims.create({
      key: 'p1_celebrate',
      frames: this.anims.generateFrameNumbers('player_p1', { frames: [3] }),
      frameRate: 1, repeat: -1
    });

    // P2 animations
    this.anims.create({
      key: 'p2_idle',
      frames: this.anims.generateFrameNumbers('player_p2', { frames: [0] }),
      frameRate: 1, repeat: -1
    });
    this.anims.create({
      key: 'p2_focus',
      frames: this.anims.generateFrameNumbers('player_p2', { frames: [1] }),
      frameRate: 1, repeat: -1
    });
    this.anims.create({
      key: 'p2_shoot',
      frames: this.anims.generateFrameNumbers('player_p2', { frames: [2] }),
      frameRate: 1, repeat: -1
    });
    this.anims.create({
      key: 'p2_disappoint',
      frames: this.anims.generateFrameNumbers('player_p2', { frames: [3] }),
      frameRate: 1, repeat: -1
    });

    // Additional aliases for celebrate/disappoint using existing frames
    this.anims.create({
      key: 'p2_celebrate',
      frames: this.anims.generateFrameNumbers('player_p2', { frames: [3] }),
      frameRate: 1, repeat: -1
    });

    this.anims.create({
      key: 'p1_disappoint',
      frames: this.anims.generateFrameNumbers('player_p1', { frames: [1] }),
      frameRate: 1, repeat: -1
    });

    // Transition to menu
    this.time.delayedCall(400, () => {
      this.scene.start('MenuScene');
    });
  }

  _createLoadingUI() {
    const { width, height } = this.scale;

    // Dark background
    this.add.rectangle(width / 2, height / 2, width, height, 0x1A1A2E);

    // Logo text
    this.add.text(width / 2, height / 2 - 60, 'MATH SLAM', {
      fontFamily: "'Bebas Neue', sans-serif",
      fontSize: 48,
      color: '#E85D04',
      letterSpacing: 8
    }).setOrigin(0.5);

    this.add.text(width / 2, height / 2 - 16, 'BASKETBALL JAM', {
      fontFamily: "'Bebas Neue', sans-serif",
      fontSize: 24,
      color: '#1A6FBF',
      letterSpacing: 4
    }).setOrigin(0.5);

    // Progress bar background
    const barW = 320, barH = 6;
    const barX = width / 2 - barW / 2;
    const barY = height / 2 + 40;

    this.add.rectangle(width / 2, barY + barH / 2, barW, barH, 0x0F3460);

    // Progress fill
    this._progressFill = this.add.rectangle(barX, barY + barH / 2, 0, barH, 0xE85D04)
      .setOrigin(0, 0.5);

    // Loading label
    this._loadingText = this.add.text(width / 2, barY + 20, 'Loading...', {
      fontFamily: 'Inter, sans-serif',
      fontSize: 12,
      color: '#94A3B8',
      letterSpacing: 2
    }).setOrigin(0.5);

    // Basketball emoji spinning
    this._ball = this.add.text(width / 2, height / 2 + 80, '🏀', {
      fontSize: 32
    }).setOrigin(0.5);
  }

  _updateProgress(value) {
    const barW = 320;
    const filled = value * barW;
    if (this._progressFill) this._progressFill.width = filled;
    if (this._loadingText) this._loadingText.setText(`Loading... ${Math.round(value * 100)}%`);
    if (this._ball) this._ball.angle += 5;
  }

  _onLoadComplete() {
    if (this._loadingText) this._loadingText.setText('Ready!');
    if (this._progressFill) this._progressFill.width = 320;
  }
}
