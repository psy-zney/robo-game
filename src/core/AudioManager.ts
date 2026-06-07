type BrowserAudioWindow = Window &
  typeof globalThis & {
    webkitAudioContext?: typeof AudioContext;
  };

export class AudioManager {
  private audioCtx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private motorOsc: OscillatorNode | null = null;
  private motorGain: GainNode | null = null;
  private motorFilter: BiquadFilterNode | null = null;
  private musicGain: GainNode | null = null;
  private padOscillators: OscillatorNode[] = [];

  private initialized = false;
  private musicWanted = false;
  private musicPlaying = false;
  private musicIntervalId: number | null = null;
  private musicStep = 0;

  private masterVolume = 0.8;
  private sfxVolume = 0.7;
  private musicVolume = 0.3;

  public initOnUserGesture() {
    const init = () => this.init();
    window.addEventListener('pointerdown', init, { once: true });
    window.addEventListener('keydown', init, { once: true });
  }

  private init() {
    if (this.initialized) return;

    const AudioCtor = window.AudioContext || (window as BrowserAudioWindow).webkitAudioContext;
    if (!AudioCtor) {
      console.warn('Web Audio API not supported');
      return;
    }

    this.audioCtx = new AudioCtor();
    this.masterGain = this.audioCtx.createGain();
    this.masterGain.gain.value = this.masterVolume;
    this.masterGain.connect(this.audioCtx.destination);

    this.setupMotor();
    this.setupMusic();

    this.initialized = true;
    if (this.musicWanted) {
      this.startMusic();
    }
  }

  private setupMotor() {
    if (!this.audioCtx || !this.masterGain) return;

    this.motorGain = this.audioCtx.createGain();
    this.motorGain.gain.value = 0;

    this.motorFilter = this.audioCtx.createBiquadFilter();
    this.motorFilter.type = 'lowpass';
    this.motorFilter.frequency.value = 700;
    this.motorFilter.Q.value = 1.3;

    this.motorOsc = this.audioCtx.createOscillator();
    this.motorOsc.type = 'sine';
    this.motorOsc.frequency.value = 120;
    this.motorOsc.connect(this.motorGain);
    this.motorGain.connect(this.motorFilter);
    this.motorFilter.connect(this.masterGain);
    this.motorOsc.start();
  }

  private setupMusic() {
    if (!this.audioCtx || !this.masterGain) return;

    this.musicGain = this.audioCtx.createGain();
    this.musicGain.gain.value = 0;
    this.musicGain.connect(this.masterGain);

    const padFrequencies = [55, 82.5, 110, 164.81];
    for (const [index, frequency] of padFrequencies.entries()) {
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      osc.type = index % 2 === 0 ? 'sine' : 'triangle';
      osc.frequency.value = frequency;
      osc.detune.value = (Math.random() - 0.5) * 8;
      gain.gain.value = 0.018;
      osc.connect(gain);
      gain.connect(this.musicGain);
      osc.start();
      this.padOscillators.push(osc);
    }
  }

  public startMusic() {
    this.musicWanted = true;
    if (!this.audioCtx || !this.musicGain || this.musicPlaying) return;

    if (this.audioCtx.state === 'suspended') {
      void this.audioCtx.resume();
    }

    const t = this.audioCtx.currentTime;
    if (this.padOscillators.length === 0) {
      this.setupMusic();
    }
    this.musicGain.gain.cancelScheduledValues(t);
    this.musicGain.gain.setValueAtTime(this.musicGain.gain.value, t);
    this.musicGain.gain.linearRampToValueAtTime(this.musicVolume * 0.24, t + 1.6);
    this.musicPlaying = true;
    this.startMusicSequencer();
  }

  public stopMusic() {
    this.musicWanted = false;
    if (!this.audioCtx || !this.musicGain || !this.musicPlaying) return;

    const t = this.audioCtx.currentTime;
    this.musicGain.gain.cancelScheduledValues(t);
    this.musicGain.gain.setValueAtTime(this.musicGain.gain.value, t);
    this.musicGain.gain.linearRampToValueAtTime(0, t + 0.8);
    this.musicPlaying = false;
    this.stopMusicSequencer();
  }

  public toggleMusic() {
    if (this.musicPlaying || this.musicWanted) {
      this.stopMusic();
    } else {
      this.startMusic();
    }
  }

  public isMusicPlaying() {
    return this.musicPlaying || this.musicWanted;
  }

  public setMasterVolume(volume: number) {
    this.masterVolume = Math.max(0, Math.min(1, volume));
    if (this.masterGain) {
      this.masterGain.gain.value = this.masterVolume;
    }
  }

  public setSfxVolume(volume: number) {
    this.sfxVolume = Math.max(0, Math.min(1, volume));
  }

  public setMusicVolume(volume: number) {
    this.musicVolume = Math.max(0, Math.min(1, volume));
    if (this.musicGain && this.musicPlaying) {
      this.musicGain.gain.value = this.musicVolume * 0.24;
    }
  }

  public setMovement(active: boolean) {
    if (!this.audioCtx || !this.motorGain || !this.motorOsc) return;

    const targetVolume = active ? 0.04 * this.sfxVolume : 0;
    this.motorGain.gain.cancelScheduledValues(this.audioCtx.currentTime);
    this.motorGain.gain.setTargetAtTime(targetVolume, this.audioCtx.currentTime, 0.12);
    this.motorOsc.frequency.setTargetAtTime(active ? 142 : 120, this.audioCtx.currentTime, 0.16);
  }

  public playBump() {
    this.playTone({ frequency: 280, endFrequency: 120, duration: 0.15, type: 'triangle', gain: 0.08, filter: 480 });
  }

  public playClean() {
    this.playTone({ frequency: 620, endFrequency: 980, duration: 0.12, type: 'triangle', gain: 0.08, filter: 1200 });
  }

  public playSweep() {
    this.playNoise(0.15, 0.12, 'bandpass', 3000);
  }

  public playMop() {
    this.playTone({ frequency: 200, endFrequency: 80, duration: 0.20, type: 'sine', gain: 0.10, filter: 400 });
  }

  public playBark() {
    this.playTone({ frequency: 410, endFrequency: 250, duration: 0.12, type: 'sawtooth', gain: 0.15, filter: 900 });
    window.setTimeout(() => {
      this.playTone({ frequency: 390, endFrequency: 230, duration: 0.12, type: 'sawtooth', gain: 0.13, filter: 850 });
    }, 180);
  }

  public playBite() {
    this.playTone({ frequency: 180, endFrequency: 95, duration: 0.50, type: 'sawtooth', gain: 0.20, filter: 620 });
  }

  public playCharge() {
    this.playTone({ frequency: 440, endFrequency: 660, duration: 0.50, type: 'sine', gain: 0.035, filter: 1200 });
  }

  public playDayComplete() {
    this.playNotes([523.25, 659.25, 783.99, 1046.5], 0.12, 0.28, 0.09);
  }

  public playWrongTool() {
    this.playTone({ frequency: 150, endFrequency: 110, duration: 0.15, type: 'square', gain: 0.06, filter: 500 });
  }

  public playWallHit() {
    this.playTone({ frequency: 150, endFrequency: 55, duration: 0.15, type: 'triangle', gain: 0.15, filter: 300 });
  }

  public playHuskyCollision() {
    this.playTone({ frequency: 210, endFrequency: 80, duration: 0.25, type: 'sawtooth', gain: 0.20, filter: 480 });
  }

  public playBatteryFull() {
    this.playNotes([523.25, 659.25, 783.99], 0.08, 0.20, 0.08);
  }

  public playBatteryLow() {
    this.playTone({ frequency: 880, endFrequency: 660, duration: 0.20, type: 'square', gain: 0.10, filter: 1600 });
  }

  public playGameOver() {
    this.playNotes([440, 392, 349.23, 293.66], 0.15, 0.30, 0.11, 'sawtooth');
  }

  public playCollectItem() {
    this.playTone({ frequency: 880, endFrequency: 1760, duration: 0.15, type: 'sine', gain: 0.10, filter: 2400 });
  }

  public playStorageFull() {
    this.playTone({ frequency: 220, endFrequency: 180, duration: 0.20, type: 'square', gain: 0.08, filter: 800 });
  }

  private startMusicSequencer() {
    if (this.musicIntervalId !== null) return;

    this.musicStep = 0;
    this.musicIntervalId = window.setInterval(() => this.scheduleMusicStep(), 240);
  }

  private stopMusicSequencer() {
    if (this.musicIntervalId === null) return;

    window.clearInterval(this.musicIntervalId);
    this.musicIntervalId = null;
  }

  private scheduleMusicStep() {
    if (!this.audioCtx || !this.musicGain || !this.musicPlaying) return;

    const t = this.audioCtx.currentTime;
    const step = this.musicStep % 16;
    const bass = [55, 55, 82.5, 73.42, 65.41, 65.41, 82.5, 98];
    const arp = [220, 261.63, 329.63, 392, 329.63, 261.63, 246.94, 196];

    if (step % 4 === 0) {
      this.playMusicTone(bass[(step / 2) % bass.length], t, 0.22, 'triangle', 0.09, 420);
    }
    if (step % 2 === 0) {
      this.playMusicTone(arp[(step / 2) % arp.length], t + 0.015, 0.16, 'sine', 0.035, 1200);
    }
    if (step % 4 === 2) {
      this.playMusicNoise(t, 0.055);
    }

    this.musicStep = (this.musicStep + 1) % 16;
  }

  private playMusicTone(
    frequency: number,
    startTime: number,
    duration: number,
    type: OscillatorType,
    gainValue: number,
    filterFrequency: number
  ) {
    if (!this.audioCtx || !this.musicGain) return;

    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();
    const filter = this.audioCtx.createBiquadFilter();

    osc.type = type;
    osc.frequency.setValueAtTime(frequency, startTime);
    filter.type = 'lowpass';
    filter.frequency.value = filterFrequency;
    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.exponentialRampToValueAtTime(gainValue, startTime + 0.025);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.musicGain);
    osc.start(startTime);
    osc.stop(startTime + duration + 0.02);
  }

  private playMusicNoise(startTime: number, duration: number) {
    if (!this.audioCtx || !this.musicGain) return;

    const source = this.createNoiseSource(duration);
    const filter = this.audioCtx.createBiquadFilter();
    const gain = this.audioCtx.createGain();
    filter.type = 'highpass';
    filter.frequency.value = 4200;
    gain.gain.setValueAtTime(0.026, startTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.musicGain);
    source.start(startTime);
    source.stop(startTime + duration);
  }

  private playNotes(
    notes: number[],
    stepDuration: number,
    noteDuration: number,
    gain: number,
    type: OscillatorType = 'sine'
  ) {
    if (!this.audioCtx) return;

    notes.forEach((note, index) => {
      window.setTimeout(() => {
        this.playTone({ frequency: note, duration: noteDuration, type, gain, filter: 1800 });
      }, index * stepDuration * 1000);
    });
  }

  private playTone(options: {
    frequency: number;
    endFrequency?: number;
    duration: number;
    type: OscillatorType;
    gain: number;
    filter?: number;
  }) {
    if (!this.audioCtx || !this.masterGain) return;

    const t = this.audioCtx.currentTime;
    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();
    const filter = this.audioCtx.createBiquadFilter();

    osc.type = options.type;
    osc.frequency.setValueAtTime(options.frequency, t);
    if (options.endFrequency && options.endFrequency > 0) {
      osc.frequency.exponentialRampToValueAtTime(options.endFrequency, t + options.duration);
    }

    filter.type = 'lowpass';
    filter.frequency.value = options.filter ?? 1200;
    gain.gain.setValueAtTime(Math.max(0.0001, options.gain * this.sfxVolume), t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + options.duration);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + options.duration + 0.02);
  }

  private playNoise(
    duration: number,
    gainValue: number,
    filterType: BiquadFilterType,
    filterFrequency: number
  ) {
    if (!this.audioCtx || !this.masterGain) return;

    const t = this.audioCtx.currentTime;
    const source = this.createNoiseSource(duration);
    const filter = this.audioCtx.createBiquadFilter();
    const gain = this.audioCtx.createGain();

    filter.type = filterType;
    filter.frequency.value = filterFrequency;
    filter.Q.value = 0.5;
    gain.gain.setValueAtTime(gainValue * this.sfxVolume, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    source.start(t);
    source.stop(t + duration);
  }

  private createNoiseSource(duration: number) {
    if (!this.audioCtx) {
      throw new Error('Audio context is not initialized');
    }

    const bufferSize = Math.max(1, Math.floor(this.audioCtx.sampleRate * duration));
    const buffer = this.audioCtx.createBuffer(1, bufferSize, this.audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i += 1) {
      data[i] = (Math.random() * 2 - 1) * 0.28;
    }

    const source = this.audioCtx.createBufferSource();
    source.buffer = buffer;
    return source;
  }
}
