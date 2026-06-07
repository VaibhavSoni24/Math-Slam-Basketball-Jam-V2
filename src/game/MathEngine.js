// ============================================================
// MathEngine.js — Client-side math problem generator
// Grades 3-6: Multiplication, Division, Fractions, Mixed Ops
// ============================================================

export class MathEngine {
  constructor() {
    this.problemHistory = [];
    this.correctCount = 0;
    this.totalCount = 0;
    this.streakCount = 0;
    this.currentTier = 'pro';
    this.difficultyLevel = 1; // 1-5 scale within tier
  }

  setTier(tier) {
    this.currentTier = tier;
    this.difficultyLevel = 1;
  }

  reset() {
    this.problemHistory = [];
    this.correctCount = 0;
    this.totalCount = 0;
    this.streakCount = 0;
    this.difficultyLevel = 1;
  }

  // Adaptive difficulty check (called at problem 4 mark)
  checkAdaptiveDifficulty() {
    if (this.totalCount < 4) return;
    const accuracy = this.correctCount / this.totalCount;
    if (accuracy > 0.85 && this.difficultyLevel < 5) {
      this.difficultyLevel = Math.min(5, this.difficultyLevel + 1);
    } else if (accuracy < 0.50 && this.difficultyLevel > 1) {
      this.difficultyLevel = Math.max(1, this.difficultyLevel - 1);
    }
  }

  // Generate next problem based on tier + difficulty
  generateProblem() {
    if (this.totalCount === 4) this.checkAdaptiveDifficulty();

    let problem;
    switch (this.currentTier) {
      case 'varsity': problem = this._genVarsity(); break;
      case 'pro':     problem = this._genPro(); break;
      case 'allstar': problem = this._genAllStar(); break;
      default:        problem = this._genPro();
    }

    // Avoid repeating last 3 problems
    if (this.problemHistory.includes(problem.stem) && this.problemHistory.length > 3) {
      return this.generateProblem();
    }

    this.problemHistory.push(problem.stem);
    if (this.problemHistory.length > 10) this.problemHistory.shift();

    return problem;
  }

  // Mock bridge: submit attempt → return verdict
  submitAttempt(userAnswer, problem, lives, score) {
    const isCorrect = String(userAnswer).trim() === String(problem.answer).trim();
    this.totalCount++;

    if (isCorrect) {
      this.correctCount++;
      this.streakCount++;
    } else {
      this.streakCount = 0;
    }

    const scoreDelta = isCorrect ? (this.streakCount >= 3 ? 15 : 10) : 0;

    return {
      correct: isCorrect,
      score_delta: scoreDelta,
      hp: lives,
      streak: this.streakCount,
      correct_answer: problem.answer
    };
  }

  getAccuracy() {
    if (this.totalCount === 0) return 100;
    return Math.round((this.correctCount / this.totalCount) * 100);
  }

  // ── Varsity (Grades 2–3): 2-digit add/subtract ──────────── //
  _genVarsity() {
    const topics = ['addition', 'subtraction'];
    const topic = topics[Math.floor(Math.random() * topics.length)];

    const difficulty = this.difficultyLevel;
    const max = difficulty <= 2 ? 50 : difficulty <= 4 ? 80 : 99;

    if (topic === 'addition') {
      const a = this._rand(10, max - 10);
      const b = this._rand(10, Math.min(max - a, 40));
      return {
        stem: `${a} + ${b} = ?`,
        answer: a + b,
        distractors: this._makeDistractors(a + b, 'add'),
        topic: 'addition_2digit'
      };
    } else {
      const b = this._rand(10, max - 20);
      const a = b + this._rand(5, 40);
      return {
        stem: `${a} - ${b} = ?`,
        answer: a - b,
        distractors: this._makeDistractors(a - b, 'sub'),
        topic: 'subtraction_2digit'
      };
    }
  }

  // ── Pro (Grades 3–4): Multiplication + Division ─────────── //
  _genPro() {
    const topics = ['multiplication', 'division'];
    const topic = this.difficultyLevel <= 2 ? 'multiplication' :
                  topics[Math.floor(Math.random() * topics.length)];

    if (topic === 'multiplication') {
      const maxFactor = this.difficultyLevel <= 1 ? 6 :
                        this.difficultyLevel <= 3 ? 9 : 12;
      const a = this._rand(2, maxFactor);
      const b = this._rand(2, maxFactor);
      return {
        stem: `${a} × ${b} = ?`,
        answer: a * b,
        distractors: this._makeDistractors(a * b, 'mult'),
        topic: 'multiplication_facts'
      };
    } else {
      const maxFactor = this.difficultyLevel <= 3 ? 9 : 12;
      const b = this._rand(2, maxFactor);
      const ans = this._rand(2, maxFactor);
      const a = b * ans;
      return {
        stem: `${a} ÷ ${b} = ?`,
        answer: ans,
        distractors: this._makeDistractors(ans, 'div'),
        topic: 'division_basic'
      };
    }
  }

  // ── All-Star (Grades 5–6): Fractions + Decimals + Mixed ─── //
  _genAllStar() {
    const topics = ['fractions', 'decimals', 'mixed'];
    const topicIdx = Math.min(
      Math.floor(this.difficultyLevel / 2),
      topics.length - 1
    );
    const topic = topics[topicIdx] || topics[Math.floor(Math.random() * topics.length)];

    if (topic === 'fractions') {
      return this._genFraction();
    } else if (topic === 'decimals') {
      return this._genDecimal();
    } else {
      // Mixed: mix of mult + decimal + simple fraction
      const roll = Math.random();
      if (roll < 0.4) return this._genPro();
      if (roll < 0.7) return this._genDecimal();
      return this._genFraction();
    }
  }

  _genFraction() {
    // Simple fraction addition: 1/4 + 1/4 etc
    const denoms = [2, 3, 4, 6, 8];
    const d = denoms[Math.floor(Math.random() * denoms.length)];
    const n1 = this._rand(1, d - 1);
    const n2 = this._rand(1, d - 1);
    const sumNum = n1 + n2;

    // Simplify
    const gcd = this._gcd(sumNum, d);
    const ansNum = sumNum / gcd;
    const ansDen = d / gcd;

    const answerStr = ansDen === 1 ? `${ansNum}` : `${ansNum}/${ansDen}`;
    const mixedWhole = ansNum > ansDen ? Math.floor(ansNum / ansDen) : 0;
    const mixedRem = ansNum % ansDen;

    return {
      stem: `\\frac{${n1}}{${d}} + \\frac{${n2}}{${d}} = ?`,
      answer: answerStr,
      display: `${n1}/${d} + ${n2}/${d}`,
      distractors: this._makeFractionDistractors(ansNum, ansDen),
      topic: 'fractions_add',
      isKatex: true
    };
  }

  _genDecimal() {
    const difficulty = this.difficultyLevel;
    if (difficulty <= 2) {
      // Simple: 0.5 + 0.3
      const a = Math.round(this._rand(1, 9)) / 10;
      const b = Math.round(this._rand(1, 9)) / 10;
      const ans = Math.round((a + b) * 10) / 10;
      return {
        stem: `${a} + ${b} = ?`,
        answer: String(ans),
        distractors: [
          String(Math.round((ans + 0.1) * 10) / 10),
          String(Math.round((ans - 0.1) * 10) / 10),
          String(Math.round((ans + 0.2) * 10) / 10)
        ],
        topic: 'decimals_compare'
      };
    } else {
      // 0.6 × 5
      const a = Math.round(this._rand(1, 9)) / 10;
      const b = this._rand(2, 9);
      const ans = Math.round(a * b * 10) / 10;
      return {
        stem: `${a} × ${b} = ?`,
        answer: String(ans),
        distractors: [
          String(Math.round((ans + 0.5) * 10) / 10),
          String(Math.round((ans - 0.5) * 10) / 10),
          String(Math.round((ans + 1) * 10) / 10)
        ],
        topic: 'mixed_ops'
      };
    }
  }

  // ── Distractor generation ─────────────────────────────── //
  _makeDistractors(answer, opType) {
    const distractors = new Set();
    const offsets = opType === 'mult' ? [answer * 2, answer - answer % 5, answer + this._rand(1,5)]
                  : opType === 'div'  ? [answer + 1, answer - 1, answer + 2]
                  : [answer + this._rand(1,5), answer - this._rand(1,5), answer + 10];

    for (const o of offsets) {
      if (o !== answer && o > 0) distractors.add(o);
    }

    // Fill to 3 if needed
    while (distractors.size < 3) {
      const rand = answer + this._randSign() * this._rand(1, 10);
      if (rand !== answer && rand > 0) distractors.add(rand);
    }

    return [...distractors].slice(0, 3).map(String);
  }

  _makeFractionDistractors(num, den) {
    const correct = den === 1 ? `${num}` : `${num}/${den}`;
    const d1 = den === 1 ? `${num + 1}` : `${num + 1}/${den}`;
    const d2 = den === 1 ? `${num - 1}` : `${num}/${den + 1}`;
    const d3 = den === 1 ? `${num * 2}` : `${num - 1}/${den}`;
    return [d1, d2, d3].filter(d => d !== correct);
  }

  // ── Helpers ──────────────────────────────────────────────── //
  _rand(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  _randSign() {
    return Math.random() < 0.5 ? 1 : -1;
  }

  _gcd(a, b) {
    return b === 0 ? a : this._gcd(b, a % b);
  }
}
