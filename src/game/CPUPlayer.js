// ============================================================
// CPUPlayer.js — CPU AI opponent simulation
// Speed tiers: Easy / Medium / Hard / Matched
// ============================================================

export class CPUPlayer {
  constructor() {
    this.name = 'CPU Shaq';
    this.score = 0;
    this.lives = 3;
    this.streak = 0;
    this.errorRate = 0.12;      // 12% chance to make a mistake
    this.speedTier = 'medium';  // easy | medium | hard | matched
    this._answerTimeout = null;
    this._currentProblem = null;
  }

  setSpeedTier(tier) {
    this.speedTier = tier;
    switch (tier) {
      case 'easy':    this.errorRate = 0.22; break;
      case 'medium':  this.errorRate = 0.12; break;
      case 'hard':    this.errorRate = 0.05; break;
      case 'matched': this.errorRate = 0.10; break;
    }
  }

  setName(name) { this.name = name; }

  reset() {
    this.score = 0;
    this.lives = 3;
    this.streak = 0;
    this._clearTimeout();
    this._currentProblem = null;
  }

  // Called when a new problem starts. Schedules an answer.
  // onAnswer(correct, timeTaken) is called when CPU answers
  scheduleProblem(problem, timeLimit, onAnswer) {
    this._clearTimeout();
    this._currentProblem = problem;

    const delay = this._getAnswerDelay(timeLimit);

    this._answerTimeout = setTimeout(() => {
      const willAnswer = Math.random() > 0.08; // 8% timeout rate
      if (!willAnswer) {
        onAnswer(false, timeLimit, true); // timeout
        return;
      }

      const willBeCorrect = Math.random() > this.errorRate;
      onAnswer(willBeCorrect, delay / 1000, false);
    }, delay);
  }

  _getAnswerDelay(timeLimit) {
    const timeLimitMs = timeLimit * 1000;

    // Delay ranges (ms) per tier
    switch (this.speedTier) {
      case 'easy':
        return this._randomDelay(timeLimitMs * 0.6, timeLimitMs * 0.95);
      case 'medium':
        return this._randomDelay(timeLimitMs * 0.35, timeLimitMs * 0.75);
      case 'hard':
        return this._randomDelay(timeLimitMs * 0.15, timeLimitMs * 0.45);
      case 'matched':
        return this._randomDelay(timeLimitMs * 0.25, timeLimitMs * 0.65);
      default:
        return this._randomDelay(timeLimitMs * 0.3, timeLimitMs * 0.7);
    }
  }

  _randomDelay(min, max) {
    return min + Math.random() * (max - min);
  }

  applyVerdict(isCorrect) {
    if (isCorrect) {
      this.streak++;
      // CPU doesn't always score (simulate shot accuracy)
      const shotSuccess = Math.random() > 0.25;
      if (shotSuccess) this.score += 10;
    } else {
      this.streak = 0;
    }
  }

  loseLife() {
    this.lives = Math.max(0, this.lives - 1);
  }

  isEliminated() {
    return this.lives <= 0;
  }

  cancelProblem() {
    this._clearTimeout();
  }

  _clearTimeout() {
    if (this._answerTimeout !== null) {
      clearTimeout(this._answerTimeout);
      this._answerTimeout = null;
    }
  }

  // Status text for HUD display
  getStatusText() {
    if (this.streak >= 3) return `🔥 ${this.streak} streak!`;
    return 'Thinking...';
  }
}
