type BrowserAudioWindow = Window &
  typeof globalThis & {
    webkitAudioContext?: typeof AudioContext;
  };

export interface MusicTrack {
  id: string;
  title: string;
  artist: string;
  url?: string;
  procedural?: boolean;
}

export const MUSIC_TRACKS: MusicTrack[] = [
  {
    id: 'funkyrobot',
    title: 'Funky Robot',
    artist: 'Anttis (CC0)',
    url: '/audio/bgm_funkyrobot.mp3'
  },
  {
    id: 'ambient',
    title: 'Cyber Ambient',
    artist: 'Anttis (CC0)',
    url: '/audio/bgm_ambient.mp3'
  },
  {
    id: 'synth',
    title: 'Retro Chiptune',
    artist: 'Procedural Synth',
    procedural: true
  }
];

export class AudioManager {
  private audioCtx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;

  // Motor (robot vacuum cleaner suction & drone)
  private motorGain: GainNode | null = null;
  private motorOsc: OscillatorNode | null = null;
  private motorSubOsc: OscillatorNode | null = null;
  private motorNoiseGain: GainNode | null = null;
  private motorNoiseSource: AudioBufferSourceNode | null = null;
  private motorNoiseFilter: BiquadFilterNode | null = null;

  // Music System
  private currentTrackIndex = 0;
  private audioElement: HTMLAudioElement | null = null;
  private mediaSourceNode: MediaElementAudioSourceNode | null = null;
  private musicWanted = false;
  private musicPlaying = false;
  private musicIntervalId: number | null = null;
  private musicStep = 0;
  private proceduralMusicGain: GainNode | null = null;
  private padOscillators: OscillatorNode[] = [];

  // Volumes
  private masterVolume = 0.8;
  private sfxVolume = 0.75;
  private musicVolume = 0.45;
  private sfxEnabled = true;

  // Sound Buffers Cache
  private buffers = new Map<string, AudioBuffer[]>();
  private buffersLoaded = false;
  private initialized = false;

  constructor() {
    // Lazy creation; will initialize context upon user gesture
  }

  public initOnUserGesture() {
    if (this.initialized) return;

    const unlock = () => {
      this.init();
      if (this.audioCtx && this.audioCtx.state === 'suspended') {
        void this.audioCtx.resume();
      }
    };

    window.addEventListener('pointerdown', unlock, { once: true });
    window.addEventListener('keydown', unlock, { once: true });
    window.addEventListener('touchstart', unlock, { once: true });
    window.addEventListener('click', unlock, { once: true });
  }

  public init() {
    if (this.initialized) return;

    const AudioCtor = window.AudioContext || (window as BrowserAudioWindow).webkitAudioContext;
    if (!AudioCtor) {
      console.warn('Web Audio API not supported');
      return;
    }

    try {
      this.audioCtx = new AudioCtor();
      this.masterGain = this.audioCtx.createGain();
      this.masterGain.gain.value = this.masterVolume;
      this.masterGain.connect(this.audioCtx.destination);

      this.sfxGain = this.audioCtx.createGain();
      this.sfxGain.gain.value = this.sfxEnabled ? this.sfxVolume : 0;
      this.sfxGain.connect(this.masterGain);

      this.musicGain = this.audioCtx.createGain();
      this.musicGain.gain.value = this.musicVolume;
      this.musicGain.connect(this.masterGain);

      this.setupMotor();
      this.setupProceduralMusic();
      void this.loadSoundBuffers();

      this.initialized = true;

      if (this.musicWanted && !this.musicPlaying) {
        this.playCurrentTrack();
      }
    } catch (e) {
      console.error('Failed to initialize AudioContext:', e);
    }
  }

  private async loadSoundBuffers() {
    if (this.buffersLoaded || !this.audioCtx) return;

    const soundFiles: Record<string, string[]> = {
      clean: ['/audio/clean.wav', '/audio/clean2.wav', '/audio/clean3.wav'],
      bump: ['/audio/bump.wav', '/audio/bump2.wav'],
      wallHit: ['/audio/wallHit.wav'],
      wrongTool: ['/audio/wrongTool.wav'],
      storageFull: ['/audio/storageFull.wav'],
      batteryLow: ['/audio/batteryLow.wav'],
      batteryFull: ['/audio/batteryFull.wav'],
      collectItem: ['/audio/collectItem.wav'],
      charge: ['/audio/charge.wav'],
      dayComplete: ['/audio/dayComplete.wav'],
      gameOver: ['/audio/gameOver.wav'],
      huskyCollision: ['/audio/huskyCollision.wav'],
      bite: ['/audio/bite.wav'],
      bark: ['/audio/bark.ogg'],
      uiClick: ['/audio/uiClick.wav'],
      uiSwitch: ['/audio/uiSwitch.wav']
    };

    const entries = Object.entries(soundFiles);
    for (const [key, paths] of entries) {
      const bufferList: AudioBuffer[] = [];
      for (const p of paths) {
        try {
          const res = await fetch(p);
          if (!res.ok) continue;
          const arrayBuffer = await res.arrayBuffer();
          if (this.audioCtx) {
            const audioBuffer = await this.audioCtx.decodeAudioData(arrayBuffer);
            bufferList.push(audioBuffer);
          }
        } catch {
          // If a buffer fails to load, fallback oscillator handles it seamlessly
        }
      }
      if (bufferList.length > 0) {
        this.buffers.set(key, bufferList);
      }
    }

    this.buffersLoaded = true;
  }

  // --- Motor (Vacuum & Engine) ---
  private setupMotor() {
    if (!this.audioCtx || !this.sfxGain) return;

    this.motorGain = this.audioCtx.createGain();
    this.motorGain.gain.value = 0;

    // Dual-frequency motor hum
    const filter = this.audioCtx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 650;
    filter.Q.value = 1.2;

    this.motorOsc = this.audioCtx.createOscillator();
    this.motorOsc.type = 'sine';
    this.motorOsc.frequency.value = 115;

    this.motorSubOsc = this.audioCtx.createOscillator();
    this.motorSubOsc.type = 'triangle';
    this.motorSubOsc.frequency.value = 230;

    const oscMix = this.audioCtx.createGain();
    oscMix.gain.value = 0.05;

    this.motorOsc.connect(oscMix);
    this.motorSubOsc.connect(oscMix);
    oscMix.connect(filter);
    filter.connect(this.motorGain);

    // Suction air noise
    const noiseBuffer = this.audioCtx.createBuffer(1, Math.floor(this.audioCtx.sampleRate * 2), this.audioCtx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.15;
    }

    this.motorNoiseSource = this.audioCtx.createBufferSource();
    this.motorNoiseSource.buffer = noiseBuffer;
    this.motorNoiseSource.loop = true;

    this.motorNoiseFilter = this.audioCtx.createBiquadFilter();
    this.motorNoiseFilter.type = 'bandpass';
    this.motorNoiseFilter.frequency.value = 850;
    this.motorNoiseFilter.Q.value = 1.4;

    this.motorNoiseGain = this.audioCtx.createGain();
    this.motorNoiseGain.gain.value = 0;

    this.motorNoiseSource.connect(this.motorNoiseFilter);
    this.motorNoiseFilter.connect(this.motorNoiseGain);
    this.motorNoiseGain.connect(this.motorGain);

    this.motorGain.connect(this.sfxGain);

    this.motorOsc.start();
    this.motorSubOsc.start();
    this.motorNoiseSource.start();
  }

  public setMovement(active: boolean) {
    if (!this.audioCtx || !this.motorGain || !this.motorOsc || !this.motorSubOsc || !this.motorNoiseGain) return;

    const t = this.audioCtx.currentTime;
    const targetVolume = active && this.sfxEnabled ? 0.35 : 0;
    const targetFreq = active ? 142 : 115;
    const targetNoiseVol = active && this.sfxEnabled ? 0.06 : 0;

    this.motorGain.gain.cancelScheduledValues(t);
    this.motorGain.gain.setTargetAtTime(targetVolume, t, 0.18);

    this.motorOsc.frequency.setTargetAtTime(targetFreq, t, 0.22);
    this.motorSubOsc.frequency.setTargetAtTime(targetFreq * 2, t, 0.22);

    this.motorNoiseGain.gain.cancelScheduledValues(t);
    this.motorNoiseGain.gain.setTargetAtTime(targetNoiseVol, t, 0.18);
  }

  // --- Music Playback & Track Management ---
  public getTracks(): MusicTrack[] {
    return MUSIC_TRACKS;
  }

  public getCurrentTrack(): MusicTrack {
    return MUSIC_TRACKS[this.currentTrackIndex] ?? MUSIC_TRACKS[0];
  }

  public getCurrentTrackIndex(): number {
    return this.currentTrackIndex;
  }

  public setTrack(index: number) {
    if (index < 0 || index >= MUSIC_TRACKS.length) return;
    if (this.currentTrackIndex === index && this.musicPlaying) return;

    const wasPlaying = this.musicPlaying || this.musicWanted;
    this.stopMusicInternal();
    this.currentTrackIndex = index;
    if (wasPlaying) {
      this.startMusic();
    }
  }

  public nextTrack(): MusicTrack {
    const nextIndex = (this.currentTrackIndex + 1) % MUSIC_TRACKS.length;
    this.setTrack(nextIndex);
    return this.getCurrentTrack();
  }

  public startMusic() {
    this.musicWanted = true;
    if (!this.initialized) {
      this.init();
    }

    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      void this.audioCtx.resume();
    }

    this.playCurrentTrack();
  }

  private playCurrentTrack() {
    const track = this.getCurrentTrack();
    if (!track) return;

    if (track.procedural) {
      this.stopAudioElement();
      this.startProceduralMusic();
      this.musicPlaying = true;
      return;
    }

    this.stopProceduralMusic();

    if (!this.audioElement) {
      this.audioElement = new Audio();
      this.audioElement.loop = true;
      this.audioElement.crossOrigin = 'anonymous';

      if (this.audioCtx && this.musicGain) {
        try {
          this.mediaSourceNode = this.audioCtx.createMediaElementSource(this.audioElement);
          this.mediaSourceNode.connect(this.musicGain);
        } catch {
          // If connecting media element source is restricted, fallback to direct element volume
        }
      }
    }

    if (track.url) {
      if (!this.audioElement.src.endsWith(track.url)) {
        this.audioElement.src = track.url;
      }

      this.audioElement.volume = this.masterVolume * this.musicVolume;
      const playPromise = this.audioElement.play();
      if (playPromise) {
        playPromise
          .then(() => {
            this.musicPlaying = true;
          })
          .catch((err) => {
            console.warn('Audio playback waiting for gesture:', err);
          });
      }
    }
  }

  private stopAudioElement() {
    if (this.audioElement) {
      this.audioElement.pause();
    }
  }

  public stopMusic() {
    this.musicWanted = false;
    this.stopMusicInternal();
  }

  private stopMusicInternal() {
    this.musicPlaying = false;
    this.stopAudioElement();
    this.stopProceduralMusic();
  }

  public toggleMusic(): boolean {
    if (this.musicPlaying || this.musicWanted) {
      this.stopMusic();
      return false;
    } else {
      this.startMusic();
      return true;
    }
  }

  public isMusicPlaying(): boolean {
    return this.musicPlaying || this.musicWanted;
  }

  // --- Procedural Synth Music Fallback / Track ---
  private setupProceduralMusic() {
    if (!this.audioCtx || !this.musicGain) return;

    this.proceduralMusicGain = this.audioCtx.createGain();
    this.proceduralMusicGain.gain.value = 0;
    this.proceduralMusicGain.connect(this.musicGain);

    const padFrequencies = [55, 82.5, 110, 164.81];
    for (const [index, frequency] of padFrequencies.entries()) {
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      osc.type = index % 2 === 0 ? 'sine' : 'triangle';
      osc.frequency.value = frequency;
      osc.detune.value = (Math.random() - 0.5) * 8;
      gain.gain.value = 0.018;
      osc.connect(gain);
      gain.connect(this.proceduralMusicGain);
      osc.start();
      this.padOscillators.push(osc);
    }
  }

  private startProceduralMusic() {
    if (!this.audioCtx || !this.proceduralMusicGain) return;

    const t = this.audioCtx.currentTime;
    this.proceduralMusicGain.gain.cancelScheduledValues(t);
    this.proceduralMusicGain.gain.setValueAtTime(this.proceduralMusicGain.gain.value, t);
    this.proceduralMusicGain.gain.linearRampToValueAtTime(0.24, t + 1.2);

    if (this.musicIntervalId === null) {
      this.musicStep = 0;
      this.musicIntervalId = window.setInterval(() => this.scheduleMusicStep(), 240);
    }
  }

  private stopProceduralMusic() {
    if (!this.audioCtx || !this.proceduralMusicGain) return;

    const t = this.audioCtx.currentTime;
    this.proceduralMusicGain.gain.cancelScheduledValues(t);
    this.proceduralMusicGain.gain.setValueAtTime(this.proceduralMusicGain.gain.value, t);
    this.proceduralMusicGain.gain.linearRampToValueAtTime(0, t + 0.6);

    if (this.musicIntervalId !== null) {
      window.clearInterval(this.musicIntervalId);
      this.musicIntervalId = null;
    }
  }

  private scheduleMusicStep() {
    if (!this.audioCtx || !this.proceduralMusicGain || !this.musicPlaying) return;

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
    if (!this.audioCtx || !this.proceduralMusicGain) return;

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
    gain.connect(this.proceduralMusicGain);
    osc.start(startTime);
    osc.stop(startTime + duration + 0.02);
  }

  private playMusicNoise(startTime: number, duration: number) {
    if (!this.audioCtx || !this.proceduralMusicGain) return;

    const source = this.createNoiseSource(duration);
    const filter = this.audioCtx.createBiquadFilter();
    const gain = this.audioCtx.createGain();
    filter.type = 'highpass';
    filter.frequency.value = 4200;
    gain.gain.setValueAtTime(0.026, startTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.proceduralMusicGain);
    source.start(startTime);
    source.stop(startTime + duration);
  }

  // --- Volume Controls ---
  public setMasterVolume(volume: number) {
    this.masterVolume = Math.max(0, Math.min(1, volume));
    if (this.masterGain) {
      this.masterGain.gain.value = this.masterVolume;
    }
    if (this.audioElement) {
      this.audioElement.volume = this.masterVolume * this.musicVolume;
    }
  }

  public setSfxVolume(volume: number) {
    this.sfxVolume = Math.max(0, Math.min(1, volume));
    if (this.sfxGain && this.sfxEnabled) {
      this.sfxGain.gain.value = this.sfxVolume;
    }
  }

  public setMusicVolume(volume: number) {
    this.musicVolume = Math.max(0, Math.min(1, volume));
    if (this.musicGain) {
      this.musicGain.gain.value = this.musicVolume;
    }
    if (this.audioElement) {
      this.audioElement.volume = this.masterVolume * this.musicVolume;
    }
  }

  public toggleSfx(): boolean {
    this.sfxEnabled = !this.sfxEnabled;
    if (this.sfxGain) {
      this.sfxGain.gain.value = this.sfxEnabled ? this.sfxVolume : 0;
    }
    return this.sfxEnabled;
  }

  public isSfxEnabled(): boolean {
    return this.sfxEnabled;
  }

  public getMasterVolume(): number {
    return this.masterVolume;
  }

  public getMusicVolume(): number {
    return this.musicVolume;
  }

  public getSfxVolume(): number {
    return this.sfxVolume;
  }

  // --- Buffer Player Helper ---
  private playSoundBuffer(
    key: string,
    volume = 1.0,
    pitchVariance = 0.05
  ): boolean {
    if (!this.sfxEnabled || !this.audioCtx || !this.sfxGain) return false;

    const list = this.buffers.get(key);
    if (!list || list.length === 0) return false;

    try {
      const buffer = list[Math.floor(Math.random() * list.length)];
      const source = this.audioCtx.createBufferSource();
      source.buffer = buffer;

      if (pitchVariance > 0) {
        source.playbackRate.value = 1 + (Math.random() * 2 - 1) * pitchVariance;
      }

      const gain = this.audioCtx.createGain();
      gain.gain.value = volume;

      source.connect(gain);
      gain.connect(this.sfxGain);
      source.start();
      return true;
    } catch (e) {
      console.warn('Error playing buffer', key, e);
      return false;
    }
  }

  // --- Sound Effects API ---

  /** Cleaned dirt particle or stain */
  public playClean() {
    if (!this.playSoundBuffer('clean', 0.85, 0.12)) {
      this.playTone({ frequency: 620, endFrequency: 980, duration: 0.12, type: 'triangle', gain: 0.08, filter: 1200 });
    }
  }

  /** Sweeping brush friction */
  public playSweep() {
    if (!this.sfxEnabled || !this.audioCtx || !this.sfxGain) return;

    // Realistic broom brush sound: Fast noise sweep with highpass & bandpass formant
    const t = this.audioCtx.currentTime;
    const duration = 0.14;
    const source = this.createNoiseSource(duration);
    const filter = this.audioCtx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(2400, t);
    filter.frequency.exponentialRampToValueAtTime(850, t + duration);
    filter.Q.value = 2.0;

    const gain = this.audioCtx.createGain();
    gain.gain.setValueAtTime(0.001, t);
    gain.gain.exponentialRampToValueAtTime(0.12, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);
    source.start(t);
    source.stop(t + duration);
  }

  /** Wet mopping squish & wipe */
  public playMop() {
    if (!this.sfxEnabled || !this.audioCtx || !this.sfxGain) return;

    // Realistic wet squish: Dual layer of water drop tone + squelch noise
    const t = this.audioCtx.currentTime;
    const duration = 0.18;

    // Wet low-tone resonance
    this.playTone({ frequency: 240, endFrequency: 85, duration: 0.16, type: 'sine', gain: 0.10, filter: 420 });

    // Squelch friction
    const noise = this.createNoiseSource(duration);
    const filter = this.audioCtx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1100, t);
    filter.frequency.exponentialRampToValueAtTime(320, t + duration);
    filter.Q.value = 1.8;

    const gain = this.audioCtx.createGain();
    gain.gain.setValueAtTime(0.001, t);
    gain.gain.exponentialRampToValueAtTime(0.09, t + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);
    noise.start(t);
    noise.stop(t + duration);
  }

  /** Soft furniture bump */
  public playBump() {
    if (!this.playSoundBuffer('bump', 0.9, 0.08)) {
      this.playTone({ frequency: 280, endFrequency: 120, duration: 0.15, type: 'triangle', gain: 0.08, filter: 480 });
    }
  }

  /** Hard wall collision */
  public playWallHit() {
    if (!this.playSoundBuffer('wallHit', 0.95, 0.05)) {
      this.playTone({ frequency: 150, endFrequency: 55, duration: 0.15, type: 'triangle', gain: 0.15, filter: 300 });
    }
  }

  /** Wrong tool used on mess */
  public playWrongTool() {
    if (!this.playSoundBuffer('wrongTool', 0.85, 0.02)) {
      this.playTone({ frequency: 150, endFrequency: 110, duration: 0.15, type: 'square', gain: 0.06, filter: 500 });
    }
  }

  /** Husky barking */
  public playBark() {
    if (!this.playSoundBuffer('bark', 0.85, 0.08)) {
      this.playTone({ frequency: 410, endFrequency: 250, duration: 0.12, type: 'sawtooth', gain: 0.15, filter: 900 });
      window.setTimeout(() => {
        this.playTone({ frequency: 390, endFrequency: 230, duration: 0.12, type: 'sawtooth', gain: 0.13, filter: 850 });
      }, 180);
    }
  }

  /** Husky bite attack */
  public playBite() {
    if (!this.playSoundBuffer('bite', 0.95, 0.05)) {
      this.playTone({ frequency: 180, endFrequency: 95, duration: 0.50, type: 'sawtooth', gain: 0.20, filter: 620 });
    }
  }

  /** Impact with husky */
  public playHuskyCollision() {
    if (!this.playSoundBuffer('huskyCollision', 0.9, 0.05)) {
      this.playTone({ frequency: 210, endFrequency: 80, duration: 0.25, type: 'sawtooth', gain: 0.20, filter: 480 });
    }
  }

  /** Charging station active hum/pulse */
  public playCharge() {
    if (!this.playSoundBuffer('charge', 0.8, 0.05)) {
      this.playTone({ frequency: 440, endFrequency: 660, duration: 0.50, type: 'sine', gain: 0.035, filter: 1200 });
    }
  }

  /** Battery reached full charge */
  public playBatteryFull() {
    if (!this.playSoundBuffer('batteryFull', 0.9, 0)) {
      this.playNotes([523.25, 659.25, 783.99], 0.08, 0.20, 0.08);
    }
  }

  /** Low battery warning pulse */
  public playBatteryLow() {
    if (!this.playSoundBuffer('batteryLow', 0.85, 0)) {
      this.playTone({ frequency: 880, endFrequency: 660, duration: 0.20, type: 'square', gain: 0.10, filter: 1600 });
    }
  }

  /** Storage canister full */
  public playStorageFull() {
    if (!this.playSoundBuffer('storageFull', 0.85, 0)) {
      this.playTone({ frequency: 220, endFrequency: 180, duration: 0.20, type: 'square', gain: 0.08, filter: 800 });
    }
  }

  /** Day complete / victory fanfare */
  public playDayComplete() {
    if (!this.playSoundBuffer('dayComplete', 0.95, 0)) {
      this.playNotes([523.25, 659.25, 783.99, 1046.5], 0.12, 0.28, 0.09);
    }
  }

  /** Game over / system shutdown */
  public playGameOver() {
    if (!this.playSoundBuffer('gameOver', 0.95, 0)) {
      this.playNotes([440, 392, 349.23, 293.66], 0.15, 0.30, 0.11, 'sawtooth');
    }
  }

  /** Collect bonus item */
  public playCollectItem() {
    if (!this.playSoundBuffer('collectItem', 0.85, 0.08)) {
      this.playTone({ frequency: 880, endFrequency: 1760, duration: 0.15, type: 'sine', gain: 0.10, filter: 2400 });
    }
  }

  /** UI tactile click */
  public playUiClick() {
    if (!this.playSoundBuffer('uiClick', 0.65, 0.04)) {
      this.playTone({ frequency: 600, endFrequency: 450, duration: 0.04, type: 'triangle', gain: 0.05, filter: 2000 });
    }
  }

  /** UI toggle switch */
  public playUiSwitch() {
    if (!this.playSoundBuffer('uiSwitch', 0.7, 0.04)) {
      this.playTone({ frequency: 450, endFrequency: 750, duration: 0.05, type: 'sine', gain: 0.06, filter: 2400 });
    }
  }

  // --- Procedural Tone / Noise Synthesis Fallbacks ---
  private playNotes(
    notes: number[],
    stepDuration: number,
    noteDuration: number,
    gain: number,
    type: OscillatorType = 'sine'
  ) {
    if (!this.audioCtx || !this.sfxEnabled) return;

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
    if (!this.audioCtx || !this.sfxGain || !this.sfxEnabled) return;

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
    gain.gain.setValueAtTime(Math.max(0.0001, options.gain), t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + options.duration);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + options.duration + 0.02);
  }

  private createNoiseSource(duration: number): AudioBufferSourceNode {
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

/** Global shared instance for menu and gameplay */
export const sharedAudioManager = new AudioManager();
