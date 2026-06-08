// ============================================================
// CPUPlayer.js — Smart CPU opponent
// Behaves like an intelligent kid of the chosen grade
// ============================================================

export class CPUPlayer {
  constructor() {
    this.name   = 'CPU Shaq';
    this.score  = 0;
    this.lives  = 3;
    this.streak = 0;

    // Tier-based behavioral parameters
    this._tier        = 'pro';
    this._errorRate   = 0.12;   // probability of wrong answer
    this._minDelaySec = 3.0;    // fastest possible answer (sec)
    this._maxDelaySec = 8.0;    // slowest (sec)
    this._timeoutRate = 0.05;   // probability of not answering at all

    this._answerTimeout  = null;
    this._currentProblem = null;
  }

  /**
   * Configures the CPU to behave like a smart student at the given tier.
   * - varsity (Grades 2-3): slow, occasionally wrong, sometimes too slow
   * - pro     (Grades 3-4): moderate speed, ~90% accuracy, challenges player
   * - allstar (Grades 5-6): fast and sharp, rarely wrong
   */
  setTier(tier) {
    this._tier = tier;
    switch (tier) {
      case 'varsity':
        // Like a smart 2nd-3rd grader: gets it right eventually but takes time
        this._errorRate   = 0.20;   // 20% chance of wrong
        this._minDelaySec = 4.5;
        this._maxDelaySec = 9.5;
        this._timeoutRate = 0.08;
        break;
      case 'pro':
        // Like a capable 4th grader: solid but beatable
        this._errorRate   = 0.10;
        this._minDelaySec = 2.5;
        this._maxDelaySec = 7.5;
        this._timeoutRate = 0.04;
        break;
      case 'allstar':
        // Like a sharp 6th grader: fast, rarely wrong, real challenge
        this._errorRate   = 0.04;
        this._minDelaySec = 1.5;
        this._maxDelaySec = 5.5;
        this._timeoutRate = 0.02;
        break;
      default:
        this._errorRate   = 0.12;
        this._minDelaySec = 3.0;
        this._maxDelaySec = 8.0;
        this._timeoutRate = 0.05;
    }
  }

  // Legacy method for backward compat
  setSpeedTier(tier) {
    const map = { easy: 'varsity', medium: 'pro', hard: 'allstar' };
    this.setTier(map[tier] || tier);
  }

  setName(name) { this.name = name; }

  reset() {
    this.score  = 0;
    this.lives  = 3;
    this.streak = 0;
    this._clearTimeout();
    this._currentProblem = null;
  }

  /**
   * Schedule CPU's answer for the given problem.
   * Simulates a human student thinking through the math.
   *
   * @param problem      — the current problem object
   * @param timeLimit    — seconds available
   * @param onAnswer     — callback(isCorrect, timeTaken, timedOut)
   * @param mode         — game mode ('flat' = practice: 5s delay, always correct)
   */
  scheduleProblem(problem, timeLimit, onAnswer, mode) {
    this._clearTimeout();
    this._currentProblem = problem;

    // Practice mode: CPU gives player 5s to try, then steps in correctly
    if (mode === 'flat') {
      this._answerTimeout = setTimeout(() => {
        onAnswer(true, 5, false);
      }, 5000);
      return;
    }

    // Calculate a realistic "thinking time" based on problem type
    const thinkingTime = this._calcThinkingTime(problem, timeLimit);

    this._answerTimeout = setTimeout(() => {
      // Does the CPU answer at all?
      if (Math.random() < this._timeoutRate) {
        onAnswer(false, timeLimit, true);
        return;
      }

      // Does the CPU get it right?
      const correct = Math.random() >= this._errorRate;
      onAnswer(correct, thinkingTime / 1000, false);
    }, thinkingTime);
  }

  /**
   * Calculate how long the CPU "thinks" about the problem.
   * Harder problems → longer, easier → shorter, all capped by timeLimit.
   */
  _calcThinkingTime(problem, timeLimit) {
    const timeLimitMs = timeLimit * 1000;
    let minMs = this._minDelaySec * 1000;
    let maxMs = this._maxDelaySec * 1000;

    // Adjust for problem difficulty
    if (problem.topic) {
      if (problem.topic.includes('addition') || problem.topic.includes('subtraction')) {
        // Easy operation — answer faster
        minMs *= 0.75;
        maxMs *= 0.75;
      } else if (problem.topic.includes('fractions')) {
        // Fractions take longer even for smart students
        minMs *= 1.3;
        maxMs *= 1.25;
      } else if (problem.topic.includes('division')) {
        // Division takes a bit longer
        minMs *= 1.1;
        maxMs *= 1.1;
      }
    }

    // Clamp to time limit
    minMs = Math.min(minMs, timeLimitMs * 0.35);
    maxMs = Math.min(maxMs, timeLimitMs * 0.92);

    if (minMs >= maxMs) maxMs = minMs + 500;

    return minMs + Math.random() * (maxMs - minMs);
  }

  cancelProblem() { this._clearTimeout(); }

  _clearTimeout() {
    if (this._answerTimeout !== null) {
      clearTimeout(this._answerTimeout);
      this._answerTimeout = null;
    }
  }

  getStatusText() {
    if (this.streak >= 3) return `🔥 ${this.streak} streak!`;
    return 'Thinking...';
  }

  isEliminated() { return this.lives <= 0; }
  loseLife()     { this.lives = Math.max(0, this.lives - 1); }
}
