// ============================================================
// AudioManager.js — Handles BGM (MP3) + SFX (MP3 + synth)
// Supports volume control for music and SFX separately
// ============================================================

export class AudioManager {
  constructor() {
    this._ctx         = null;
    this._musicGain   = null;
    this._sfxGain     = null;
    this._bgmSource   = null;
    this._bgmBuffer   = null;
    this._crowdBuffer = null;
    this._sfxBuffers  = {};
    this.musicVolume  = 0.45;
    this.sfxVolume    = 0.80;
    this._initialized = false;
    this._bgmPlaying  = false;
  }

  // Call after user gesture
  async init() {
    if (this._initialized) return;
    try {
      this._ctx = new (window.AudioContext || window.webkitAudioContext)();
      if (this._ctx.state === 'suspended') await this._ctx.resume();

      this._sfxGain = this._ctx.createGain();
      this._sfxGain.gain.value = this.sfxVolume;
      this._sfxGain.connect(this._ctx.destination);

      this._musicGain = this._ctx.createGain();
      this._musicGain.gain.value = this.musicVolume;
      this._musicGain.connect(this._ctx.destination);

      this._initialized = true;

      // Preload audio files
      this._preloadAudio();
    } catch (e) {
      console.warn('[AudioManager] Web Audio init failed:', e);
    }
  }

  async _preloadAudio() {
    const files = {
      bgm:   'assets/audio/Algebra Slam - BGM.mp3',
      crowd: 'assets/audio/croud.mp3',
      score: 'assets/audio/score.mp3',
      error: 'assets/audio/error.mp3',
      won:   'assets/audio/won.mp3',
      lost:  'assets/audio/lost.mp3'
    };

    for (const [key, url] of Object.entries(files)) {
      try {
        const res = await fetch(url);
        const arr = await res.arrayBuffer();
        const buf = await this._ctx.decodeAudioData(arr);
        if (key === 'bgm')   this._bgmBuffer = buf;
        else if (key === 'crowd') this._crowdBuffer = buf;
        else this._sfxBuffers[key] = buf;
      } catch (e) {
        console.warn(`[AudioManager] Could not load ${url}:`, e);
      }
    }
  }

  _playBuffer(buffer, gain, loop = false, volume = 1) {
    if (!this._initialized || !buffer) return null;
    const source = this._ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = loop;
    const g = this._ctx.createGain();
    g.gain.value = volume;
    source.connect(g);
    g.connect(gain);
    source.start(this._ctx.currentTime);
    return source;
  }

  // ── Volume Control ────────────────────────────────────── //

  setMusicVolume(v) {
    this.musicVolume = v;
    if (this._musicGain) this._musicGain.gain.value = v;
  }

  setSfxVolume(v) {
    this.sfxVolume = v;
    if (this._sfxGain) this._sfxGain.gain.value = v;
  }

  // ── Background Music ──────────────────────────────────── //

  startMusic() {
    if (!this._initialized || this._bgmPlaying) return;
    if (!this._bgmBuffer) {
      // Retry once loaded
      setTimeout(() => this.startMusic(), 500);
      return;
    }
    this._bgmSource = this._playBuffer(this._bgmBuffer, this._musicGain, true);
    this._bgmPlaying = true;
  }

  stopMusic() {
    if (this._bgmSource) {
      try { this._bgmSource.stop(); } catch (e) {}
      this._bgmSource = null;
    }
    this._bgmPlaying = false;
  }

  // ── SFX ───────────────────────────────────────────────── //

  playScore() {
    this._playBuffer(this._sfxBuffers['score'], this._sfxGain);
    // Also play crowd briefly
    if (this._crowdBuffer) {
      const src = this._playBuffer(this._crowdBuffer, this._sfxGain, false, 0.6);
    }
  }

  playBasket() { this.playScore(); }

  playWrong() {
    this._playBuffer(this._sfxBuffers['error'], this._sfxGain);
    if (!this._sfxBuffers['error']) this._synthWrong();
  }

  playVictory() {
    this._playBuffer(this._sfxBuffers['won'], this._sfxGain);
  }

  playDefeat() {
    this._playBuffer(this._sfxBuffers['lost'], this._sfxGain);
  }

  playCorrect() {
    // Synth ding for correct answer (before shot)
    if (!this._initialized) return;
    this._synthCorrect();
  }

  playMiss() {
    if (!this._initialized) return;
    this._synthMiss();
  }

  playTick() {
    if (!this._initialized) return;
    this._synthTick(800);
  }

  playUrgentTick() {
    if (!this._initialized) return;
    this._synthTick(1200);
  }

  playWhoosh() {
    if (!this._initialized) return;
    this._synthWhoosh();
  }

  playCountdown() {
    if (!this._initialized) return;
    this._synthTone(660, 0.4, 0.25, 'sine');
  }

  playCountdownGo() {
    if (!this._initialized) return;
    [440, 660, 880].forEach((f, i) => {
      setTimeout(() => this._synthTone(f, 0.3, 0.35, 'sine'), i * 70);
    });
  }

  playHotStreak() {
    if (!this._initialized) return;
    [523, 659, 784, 1047].forEach((f, i) => {
      setTimeout(() => this._synthTone(f, 0.25, 0.18, 'triangle'), i * 60);
    });
  }

  // ── Synth Helpers ─────────────────────────────────────── //

  _synthCorrect() {
    [523.25, 659.25, 783.99].forEach((freq, i) => {
      setTimeout(() => {
        const osc = this._ctx.createOscillator();
        const gain = this._ctx.createGain();
        osc.connect(gain); gain.connect(this._sfxGain);
        osc.type = 'sine';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.35, this._ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this._ctx.currentTime + 0.28);
        osc.start(this._ctx.currentTime);
        osc.stop(this._ctx.currentTime + 0.3);
      }, i * 60);
    });
  }

  _synthWrong() {
    const osc = this._ctx.createOscillator();
    const gain = this._ctx.createGain();
    osc.connect(gain); gain.connect(this._sfxGain);
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(220, this._ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(110, this._ctx.currentTime + 0.25);
    gain.gain.setValueAtTime(0.3, this._ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this._ctx.currentTime + 0.3);
    osc.start(this._ctx.currentTime);
    osc.stop(this._ctx.currentTime + 0.32);
  }

  _synthMiss() {
    const osc = this._ctx.createOscillator();
    const gain = this._ctx.createGain();
    osc.connect(gain); gain.connect(this._sfxGain);
    osc.type = 'square';
    osc.frequency.setValueAtTime(880, this._ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(330, this._ctx.currentTime + 0.35);
    gain.gain.setValueAtTime(0.25, this._ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this._ctx.currentTime + 0.45);
    osc.start(this._ctx.currentTime);
    osc.stop(this._ctx.currentTime + 0.48);
  }

  _synthTick(freq) {
    const osc = this._ctx.createOscillator();
    const gain = this._ctx.createGain();
    osc.connect(gain); gain.connect(this._sfxGain);
    osc.type = 'sine';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.2, this._ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this._ctx.currentTime + 0.08);
    osc.start(this._ctx.currentTime);
    osc.stop(this._ctx.currentTime + 0.1);
  }

  _synthTone(freq, vol, dur, type = 'sine') {
    const osc = this._ctx.createOscillator();
    const gain = this._ctx.createGain();
    osc.connect(gain); gain.connect(this._sfxGain);
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(vol, this._ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this._ctx.currentTime + dur);
    osc.start(this._ctx.currentTime);
    osc.stop(this._ctx.currentTime + dur + 0.02);
  }

  _synthWhoosh() {
    const len = this._ctx.sampleRate * 0.5;
    const buf = this._ctx.createBuffer(1, len, this._ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    const src = this._ctx.createBufferSource();
    src.buffer = buf;
    const filter = this._ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(200, this._ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(4000, this._ctx.currentTime + 0.5);
    const gain = this._ctx.createGain();
    gain.gain.setValueAtTime(0, this._ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.3, this._ctx.currentTime + 0.15);
    gain.gain.exponentialRampToValueAtTime(0.001, this._ctx.currentTime + 0.55);
    src.connect(filter); filter.connect(gain); gain.connect(this._sfxGain);
    src.start(this._ctx.currentTime);
  }
}
