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
}
