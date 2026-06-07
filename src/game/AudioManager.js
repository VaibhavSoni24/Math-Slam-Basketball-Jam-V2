// ============================================================
// AudioManager.js — Web Audio API procedural sound effects
// No audio files needed — all sounds are synthesized
// ============================================================

export class AudioManager {
  constructor() {
    this._ctx = null;
    this._musicGain = null;
    this._sfxGain = null;
    this._musicSource = null;
    this._musicLoop = null;
    this.musicVolume = 0.35;
    this.sfxVolume = 0.75;
    this._initialized = false;
    this._muted = false;
  }

  // Must be called after a user gesture (browser requirement)
  init() {
    if (this._initialized) return;
    try {
      this._ctx = new (window.AudioContext || window.webkitAudioContext)();
      this._sfxGain = this._ctx.createGain();
      this._sfxGain.gain.value = this.sfxVolume;
      this._sfxGain.connect(this._ctx.destination);

      this._musicGain = this._ctx.createGain();
      this._musicGain.gain.value = this.musicVolume;
      this._musicGain.connect(this._ctx.destination);

      this._initialized = true;
    } catch (e) {
      console.warn('Web Audio not supported:', e);
    }
  }

  toggleMute() {
    this._muted = !this._muted;
    if (this._ctx) {
      this._sfxGain.gain.value = this._muted ? 0 : this.sfxVolume;
      this._musicGain.gain.value = this._muted ? 0 : this.musicVolume;
    }
    return this._muted;
  }

  // ── SFX ───────────────────────────────────────────────── //

  playCorrect() {
    if (!this._initialized) return;
    // Rising ding: C5 → E5 → G5 chord sweep
    const notes = [523.25, 659.25, 783.99];
    notes.forEach((freq, i) => {
      setTimeout(() => {
        const osc = this._ctx.createOscillator();
        const gain = this._ctx.createGain();
        osc.connect(gain);
        gain.connect(this._sfxGain);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, this._ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(freq * 1.05, this._ctx.currentTime + 0.12);
        gain.gain.setValueAtTime(0.4, this._ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this._ctx.currentTime + 0.3);
        osc.start(this._ctx.currentTime);
        osc.stop(this._ctx.currentTime + 0.32);
      }, i * 60);
    });
  }

  playWrong() {
    if (!this._initialized) return;
    // Buzzer: sawtooth descending
    const osc = this._ctx.createOscillator();
    const gain = this._ctx.createGain();
    osc.connect(gain);
    gain.connect(this._sfxGain);
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(220, this._ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(110, this._ctx.currentTime + 0.25);
    gain.gain.setValueAtTime(0.35, this._ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this._ctx.currentTime + 0.3);
    osc.start(this._ctx.currentTime);
    osc.stop(this._ctx.currentTime + 0.32);
  }

  playBasket() {
    if (!this._initialized) return;
    // Net swish: filtered noise burst + rising tone
    const bufferSize = this._ctx.sampleRate * 0.3;
    const buffer = this._ctx.createBuffer(1, bufferSize, this._ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);

    const source = this._ctx.createBufferSource();
    source.buffer = buffer;
    const filter = this._ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 3000;
    filter.Q.value = 1.5;
    const gain = this._ctx.createGain();
    gain.gain.value = 0.5;
    source.connect(filter);
    filter.connect(gain);
    gain.connect(this._sfxGain);
    source.start(this._ctx.currentTime);

    // Crowd cheer: harmonic burst
    const osc = this._ctx.createOscillator();
    const oGain = this._ctx.createGain();
    osc.connect(oGain);
    oGain.connect(this._sfxGain);
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(440, this._ctx.currentTime + 0.1);
    osc.frequency.exponentialRampToValueAtTime(880, this._ctx.currentTime + 0.5);
    oGain.gain.setValueAtTime(0, this._ctx.currentTime);
    oGain.gain.linearRampToValueAtTime(0.25, this._ctx.currentTime + 0.1);
    oGain.gain.exponentialRampToValueAtTime(0.001, this._ctx.currentTime + 0.8);
    osc.start(this._ctx.currentTime);
    osc.stop(this._ctx.currentTime + 0.82);
  }

  playMiss() {
    if (!this._initialized) return;
    // Rim clang: metallic tone
    const osc = this._ctx.createOscillator();
    const gain = this._ctx.createGain();
    osc.connect(gain);
    gain.connect(this._sfxGain);
    osc.type = 'square';
    osc.frequency.setValueAtTime(880, this._ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(330, this._ctx.currentTime + 0.35);
    gain.gain.setValueAtTime(0.3, this._ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this._ctx.currentTime + 0.45);
    osc.start(this._ctx.currentTime);
    osc.stop(this._ctx.currentTime + 0.48);
  }

  playTick() {
    if (!this._initialized) return;
    // Short metronome tick
    const osc = this._ctx.createOscillator();
    const gain = this._ctx.createGain();
    osc.connect(gain);
    gain.connect(this._sfxGain);
    osc.type = 'sine';
    osc.frequency.value = 800;
    gain.gain.setValueAtTime(0.2, this._ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this._ctx.currentTime + 0.08);
    osc.start(this._ctx.currentTime);
    osc.stop(this._ctx.currentTime + 0.1);
  }

  playUrgentTick() {
    if (!this._initialized) return;
    // Higher pitch urgent tick for last 5 seconds
    const osc = this._ctx.createOscillator();
    const gain = this._ctx.createGain();
    osc.connect(gain);
    gain.connect(this._sfxGain);
    osc.type = 'square';
    osc.frequency.value = 1200;
    gain.gain.setValueAtTime(0.18, this._ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this._ctx.currentTime + 0.06);
    osc.start(this._ctx.currentTime);
    osc.stop(this._ctx.currentTime + 0.08);
  }

  playWhoosh() {
    if (!this._initialized) return;
    // Ball whoosh: rising filtered noise
    const bufferSize = this._ctx.sampleRate * 0.5;
    const buffer = this._ctx.createBuffer(1, bufferSize, this._ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
    const source = this._ctx.createBufferSource();
    source.buffer = buffer;
    const filter = this._ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(200, this._ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(4000, this._ctx.currentTime + 0.5);
    const gain = this._ctx.createGain();
    gain.gain.setValueAtTime(0, this._ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.3, this._ctx.currentTime + 0.15);
    gain.gain.exponentialRampToValueAtTime(0.001, this._ctx.currentTime + 0.55);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(this._sfxGain);
    source.start(this._ctx.currentTime);
  }

  playCountdown() {
    if (!this._initialized) return;
    const osc = this._ctx.createOscillator();
    const gain = this._ctx.createGain();
    osc.connect(gain);
    gain.connect(this._sfxGain);
    osc.type = 'sine';
    osc.frequency.value = 660;
    gain.gain.setValueAtTime(0.4, this._ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this._ctx.currentTime + 0.25);
    osc.start(this._ctx.currentTime);
    osc.stop(this._ctx.currentTime + 0.3);
  }

  playCountdownGo() {
    if (!this._initialized) return;
    const notes = [440, 660, 880];
    notes.forEach((freq, i) => {
      const osc = this._ctx.createOscillator();
      const gain = this._ctx.createGain();
      osc.connect(gain);
      gain.connect(this._sfxGain);
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.3, this._ctx.currentTime + i * 0.07);
      gain.gain.exponentialRampToValueAtTime(0.001, this._ctx.currentTime + i * 0.07 + 0.35);
      osc.start(this._ctx.currentTime + i * 0.07);
      osc.stop(this._ctx.currentTime + i * 0.07 + 0.4);
    });
  }

  playVictory() {
    if (!this._initialized) return;
    const melody = [523.25, 659.25, 783.99, 1046.5];
    melody.forEach((freq, i) => {
      setTimeout(() => {
        const osc = this._ctx.createOscillator();
        const gain = this._ctx.createGain();
        osc.connect(gain);
        gain.connect(this._sfxGain);
        osc.type = 'triangle';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.35, this._ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this._ctx.currentTime + 0.5);
        osc.start(this._ctx.currentTime);
        osc.stop(this._ctx.currentTime + 0.55);
      }, i * 100);
    });
  }

  playDefeat() {
    if (!this._initialized) return;
    const melody = [523.25, 466.16, 415.30, 369.99];
    melody.forEach((freq, i) => {
      setTimeout(() => {
        const osc = this._ctx.createOscillator();
        const gain = this._ctx.createGain();
        osc.connect(gain);
        gain.connect(this._sfxGain);
        osc.type = 'triangle';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.3, this._ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this._ctx.currentTime + 0.55);
        osc.start(this._ctx.currentTime);
        osc.stop(this._ctx.currentTime + 0.6);
      }, i * 120);
    });
  }

  playHotStreak() {
    if (!this._initialized) return;
    // DJ scratch effect: fast back-and-forth pitch
    const osc = this._ctx.createOscillator();
    const gain = this._ctx.createGain();
    osc.connect(gain);
    gain.connect(this._sfxGain);
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(220, this._ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(880, this._ctx.currentTime + 0.1);
    osc.frequency.linearRampToValueAtTime(440, this._ctx.currentTime + 0.2);
    osc.frequency.linearRampToValueAtTime(660, this._ctx.currentTime + 0.3);
    gain.gain.setValueAtTime(0.25, this._ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this._ctx.currentTime + 0.4);
    osc.start(this._ctx.currentTime);
    osc.stop(this._ctx.currentTime + 0.45);
  }

  // ── Background Music ──────────────────────────────────── //

  startMusic() {
    if (!this._initialized || this._musicLoop) return;
    this._playMusicLoop();
  }

  stopMusic() {
    if (this._musicLoop) {
      clearInterval(this._musicLoop);
      this._musicLoop = null;
    }
    if (this._musicSource) {
      try { this._musicSource.stop(); } catch(e) {}
      this._musicSource = null;
    }
  }

  _playMusicLoop() {
    // Simple procedural beat: bass + hi-hat rhythm
    let beat = 0;
    const bpm = 120;
    const beatMs = 60000 / bpm;
    const bassNotes = [55, 55, 73.42, 55, 65.41, 55, 73.42, 65.41]; // A1 variations

    this._musicLoop = setInterval(() => {
      const now = this._ctx.currentTime;
      const bassFreq = bassNotes[beat % bassNotes.length];

      // Bass hit every other beat
      if (beat % 2 === 0) {
        const bass = this._ctx.createOscillator();
        const bassGain = this._ctx.createGain();
        bass.connect(bassGain);
        bassGain.connect(this._musicGain);
        bass.type = 'sine';
        bass.frequency.value = bassFreq;
        bassGain.gain.setValueAtTime(0.5, now);
        bassGain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
        bass.start(now);
        bass.stop(now + 0.28);
      }

      // Hi-hat on every beat
      const hiBuf = this._ctx.createBuffer(1, this._ctx.sampleRate * 0.05, this._ctx.sampleRate);
      const hiData = hiBuf.getChannelData(0);
      for (let i = 0; i < hiData.length; i++) hiData[i] = Math.random() * 2 - 1;
      const hiSrc = this._ctx.createBufferSource();
      hiSrc.buffer = hiBuf;
      const hiFilter = this._ctx.createBiquadFilter();
      hiFilter.type = 'highpass';
      hiFilter.frequency.value = 8000;
      const hiGain = this._ctx.createGain();
      hiGain.gain.value = 0.08;
      hiSrc.connect(hiFilter);
      hiFilter.connect(hiGain);
      hiGain.connect(this._musicGain);
      hiSrc.start(now);

      // Kick on beats 1 and 3
      if (beat % 4 === 0 || beat % 4 === 2) {
        const kick = this._ctx.createOscillator();
        const kickGain = this._ctx.createGain();
        kick.connect(kickGain);
        kickGain.connect(this._musicGain);
        kick.type = 'sine';
        kick.frequency.setValueAtTime(150, now);
        kick.frequency.exponentialRampToValueAtTime(50, now + 0.1);
        kickGain.gain.setValueAtTime(0.3, now);
        kickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
        kick.start(now);
        kick.stop(now + 0.18);
      }

      beat++;
    }, beatMs);
  }
}
