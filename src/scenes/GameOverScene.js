// ============================================================
// GameOverScene.js — Canvas results screen (backup to DOM)
// The primary game-over UI is handled by HudScene's DOM overlay
// This scene provides the Phaser canvas backdrop
// ============================================================

export class GameOverScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameOverScene' });
  }

  init(data) {
    this.result = data.result || 'lose';
    this.p1Score = data.p1Score || 0;
    this.p2Score = data.p2Score || 0;
    this.accuracy = data.accuracy || 0;
  }

  create() {
    const { width, height } = this.scale;

    // Starfield background
    const bg = this.add.graphics();
    const bgColor = this.result === 'win' ? 0x0a1a0a : this.result === 'lose' ? 0x1a0a0a : 0x0a0a1a;
    bg.fillGradientStyle(bgColor, bgColor, 0x1A1A2E, 0x1A1A2E, 1);
    bg.fillRect(0, 0, width, height);

    // Random stars
    for (let i = 0; i < 80; i++) {
      const x = Phaser.Math.Between(0, width);
      const y = Phaser.Math.Between(0, height);
      const r = Phaser.Math.FloatBetween(0.5, 2.5);
      const star = this.add.circle(x, y, r, 0xffffff, Phaser.Math.FloatBetween(0.2, 0.8));
      this.tweens.add({
        targets: star,
        alpha: 0,
        duration: Phaser.Math.Between(800, 2500),
        yoyo: true,
        repeat: -1,
        delay: Phaser.Math.Between(0, 2000)
      });
    }

    // Trophy / ball emoji
    const emoji = this.result === 'win' ? '🏆' : this.result === 'lose' ? '😤' : '📊';
    const emojiTxt = this.add.text(width / 2, height / 2 - 100, emoji, {
      fontSize: '80px'
    }).setOrigin(0.5).setAlpha(0);

    this.tweens.add({
      targets: emojiTxt,
      alpha: 1,
      scaleX: { from: 0, to: 1 },
      scaleY: { from: 0, to: 1 },
      duration: 600,
      ease: 'Back.easeOut',
      delay: 200
    });

    // Bounce animation for emoji
    this.tweens.add({
      targets: emojiTxt,
      y: emojiTxt.y - 15,
      duration: 1000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
      delay: 800
    });
  }
}
