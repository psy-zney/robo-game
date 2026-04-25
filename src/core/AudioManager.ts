export class AudioManager {
  private audioCtx: AudioContext | null = null;
  private motorOsc: OscillatorNode | null = null;
  private motorGain: GainNode | null = null;
  private motorFilter: BiquadFilterNode | null = null;
  private backgroundOsc1: OscillatorNode | null = null;
  private backgroundOsc2: OscillatorNode | null = null;
  private backgroundGain: GainNode | null = null;
  private initialized = false;

  public initOnUserGesture() {
    window.addEventListener(
      'pointerdown',
      () => {
        this.init();
      },
      { once: true }
    );
  }

  private init() {
    if (this.initialized) {
      return;
    }

    const AudioCtor = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtor) {
      return;
    }

    this.audioCtx = new AudioCtor();
    this.motorGain = this.audioCtx.createGain();
    this.motorGain.gain.value = 0;

    this.motorFilter = this.audioCtx.createBiquadFilter();
    this.motorFilter.type = 'lowpass';
    this.motorFilter.frequency.value = 700;
    this.motorFilter.Q.value = 1.3;

    this.backgroundGain = this.audioCtx.createGain();
    this.backgroundGain.gain.value = 0.015;

    this.motorGain.connect(this.motorFilter);
    this.motorFilter.connect(this.audioCtx.destination);
    this.backgroundGain.connect(this.audioCtx.destination);

    this.motorOsc = this.audioCtx.createOscillator();
    this.motorOsc.type = 'sine';
    this.motorOsc.frequency.value = 120;
    this.motorOsc.connect(this.motorGain);
    this.motorOsc.start();

    this.backgroundOsc1 = this.audioCtx.createOscillator();
    this.backgroundOsc1.type = 'sine';
    this.backgroundOsc1.frequency.value = 64;
    this.backgroundOsc1.connect(this.backgroundGain);
    this.backgroundOsc1.start();

    this.backgroundOsc2 = this.audioCtx.createOscillator();
    this.backgroundOsc2.type = 'triangle';
    this.backgroundOsc2.frequency.value = 78;
    this.backgroundOsc2.connect(this.backgroundGain);
    this.backgroundOsc2.start();

    this.initialized = true;
  }

  public setMovement(active: boolean) {
    if (!this.audioCtx || !this.motorGain) {
      return;
    }

    const targetVolume = active ? 0.04 : 0;
    this.motorGain.gain.cancelScheduledValues(this.audioCtx.currentTime);
    this.motorGain.gain.setTargetAtTime(targetVolume, this.audioCtx.currentTime, 0.12);
    if (active && this.motorOsc) {
      this.motorOsc.frequency.setTargetAtTime(140, this.audioCtx.currentTime, 0.16);
    } else if (this.motorOsc) {
      this.motorOsc.frequency.setTargetAtTime(120, this.audioCtx.currentTime, 0.16);
    }
  }

  public playBump() {
    if (!this.audioCtx) {
      return;
    }

    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();
    const filter = this.audioCtx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 480;

    osc.type = 'triangle';
    osc.frequency.value = 280;
    gain.gain.value = 0.08;
    gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + 0.15);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.audioCtx.destination);

    osc.start();
    osc.stop(this.audioCtx.currentTime + 0.15);
  }

  public playClean() {
    if (!this.audioCtx) {
      return;
    }

    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();
    const filter = this.audioCtx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 1000;

    osc.type = 'triangle';
    osc.frequency.value = 600;
    gain.gain.value = 0.08;
    gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + 0.12);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.audioCtx.destination);

    osc.start();
    osc.stop(this.audioCtx.currentTime + 0.12);
  }

  // ════════════════════════════════════════════
  // Âm thanh mới - New sound effects
  // ════════════════════════════════════════════

  /** Âm thanh quét sàn - Sweep sound (scratchy noise) */
  public playSweep() {
    if (!this.audioCtx) return;
    const t = this.audioCtx.currentTime;
    const bufferSize = this.audioCtx.sampleRate * 0.15;
    const buffer = this.audioCtx.createBuffer(1, bufferSize, this.audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    // Tạo tiếng xào xạc bằng noise ngẫu nhiên - Generate scratchy noise
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.3;
    }
    const source = this.audioCtx.createBufferSource();
    source.buffer = buffer;
    const filter = this.audioCtx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 3000;
    filter.Q.value = 0.5;
    const gain = this.audioCtx.createGain();
    gain.gain.setValueAtTime(0.12, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.audioCtx.destination);
    source.start(t);
    source.stop(t + 0.15);
  }

  /** Âm thanh lau sàn - Mop sound (wet squishy) */
  public playMop() {
    if (!this.audioCtx) return;
    const t = this.audioCtx.currentTime;
    const osc = this.audioCtx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(200, t);
    osc.frequency.exponentialRampToValueAtTime(80, t + 0.2);

    const gain = this.audioCtx.createGain();
    gain.gain.setValueAtTime(0.1, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);

    const filter = this.audioCtx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 400;

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.audioCtx.destination);
    osc.start(t);
    osc.stop(t + 0.2);
  }

  /** Âm thanh chó sủa - Dog bark sound */
  public playBark() {
    if (!this.audioCtx) return;
    const t = this.audioCtx.currentTime;

    // 2 short barks - 2 tiếng sủa ngắn
    for (let i = 0; i < 2; i++) {
      const offset = i * 0.18;
      const osc = this.audioCtx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(400, t + offset);
      osc.frequency.exponentialRampToValueAtTime(250, t + offset + 0.12);

      const gain = this.audioCtx.createGain();
      gain.gain.setValueAtTime(0.15, t + offset);
      gain.gain.exponentialRampToValueAtTime(0.001, t + offset + 0.12);

      const filter = this.audioCtx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 800;
      filter.Q.value = 2;

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.audioCtx.destination);
      osc.start(t + offset);
      osc.stop(t + offset + 0.12);
    }
  }

  /** Âm thanh chó cắn (hung dữ) - Dog bite/attack sound */
  public playBite() {
    if (!this.audioCtx) return;
    const t = this.audioCtx.currentTime;

    // Tiếng gầm dài hơn - Longer growl
    const osc = this.audioCtx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(180, t);
    osc.frequency.linearRampToValueAtTime(350, t + 0.1);
    osc.frequency.linearRampToValueAtTime(120, t + 0.4);

    const gain = this.audioCtx.createGain();
    gain.gain.setValueAtTime(0.2, t);
    gain.gain.linearRampToValueAtTime(0.25, t + 0.15);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);

    const filter = this.audioCtx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 600;
    filter.Q.value = 3;

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.audioCtx.destination);
    osc.start(t);
    osc.stop(t + 0.5);
  }

  /** Âm thanh sạc pin - Charging sound (gentle hum) */
  public playCharge() {
    if (!this.audioCtx) return;
    const t = this.audioCtx.currentTime;
    const osc = this.audioCtx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = 440;

    const gain = this.audioCtx.createGain();
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.03, t + 0.1);
    gain.gain.linearRampToValueAtTime(0.03, t + 0.3);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);

    osc.connect(gain);
    gain.connect(this.audioCtx.destination);
    osc.start(t);
    osc.stop(t + 0.5);
  }

  /** Âm thanh hoàn thành ngày - Day complete jingle */
  public playDayComplete() {
    if (!this.audioCtx) return;
    const t = this.audioCtx.currentTime;
    const notes = [523, 659, 784, 1047]; // C5, E5, G5, C6 - Hợp âm vui nhộn

    notes.forEach((freq, i) => {
      const offset = i * 0.12;
      const osc = this.audioCtx!.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = freq;

      const gain = this.audioCtx!.createGain();
      gain.gain.setValueAtTime(0.1, t + offset);
      gain.gain.exponentialRampToValueAtTime(0.001, t + offset + 0.3);

      osc.connect(gain);
      gain.connect(this.audioCtx!.destination);
      osc.start(t + offset);
      osc.stop(t + offset + 0.3);
    });
  }

  /** Âm thanh sai công cụ - Wrong tool buzz */
  public playWrongTool() {
    if (!this.audioCtx) return;
    const t = this.audioCtx.currentTime;
    const osc = this.audioCtx.createOscillator();
    osc.type = 'square';
    osc.frequency.value = 150;

    const gain = this.audioCtx.createGain();
    gain.gain.setValueAtTime(0.06, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);

    osc.connect(gain);
    gain.connect(this.audioCtx.destination);
    osc.start(t);
    osc.stop(t + 0.15);
  }
}
