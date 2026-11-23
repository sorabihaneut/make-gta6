// Sol Corona: Vice Coast - Procedural Web Audio Sound Engine
// Synthesizes all sound effects and radio synth music in real-time without external audio files.

class SoundEngine {
  constructor() {
    this.ctx = null;
    this.initialized = false;
    this.masterGain = null;
    this.sfxGain = null;
    this.musicGain = null;
    this.engineOsc = null;
    this.engineGain = null;
    this.sirenOsc = null;
    this.sirenGain = null;
    this.radioPlaying = false;
    this.radioTimer = null;
    this.stationIndex = 0;
    this.stations = ['80s Vice Wave FM', 'Sol Corona Underground', 'Pacific Groove Radio', 'Radio Off'];
  }

  init() {
    if (this.initialized) return;
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return;
      this.ctx = new AudioContextClass();

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.8, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.setValueAtTime(0.7, this.ctx.currentTime);
      this.sfxGain.connect(this.masterGain);

      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.setValueAtTime(0.35, this.ctx.currentTime);
      this.musicGain.connect(this.masterGain);

      this.setupEngineSynth();
      this.setupSirenSynth();
      this.startRadio();
      this.initialized = true;
    } catch {
      // AudioContext unavailable or blocked
    }
  }

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  setupEngineSynth() {
    if (!this.ctx) return;
    this.engineGain = this.ctx.createGain();
    this.engineGain.gain.setValueAtTime(0, this.ctx.currentTime);
    this.engineGain.connect(this.sfxGain);

    this.engineOsc = this.ctx.createOscillator();
    this.engineOsc.type = 'sawtooth';
    this.engineOsc.frequency.setValueAtTime(45, this.ctx.currentTime);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(320, this.ctx.currentTime);

    this.engineOsc.connect(filter);
    filter.connect(this.engineGain);
    this.engineOsc.start();
  }

  setupSirenSynth() {
    if (!this.ctx) return;
    this.sirenGain = this.ctx.createGain();
    this.sirenGain.gain.setValueAtTime(0, this.ctx.currentTime);
    this.sirenGain.connect(this.sfxGain);

    this.sirenOsc = this.ctx.createOscillator();
    this.sirenOsc.type = 'triangle';
    this.sirenOsc.frequency.setValueAtTime(650, this.ctx.currentTime);
    this.sirenOsc.connect(this.sirenGain);
    this.sirenOsc.start();
  }

  updateEngine(rpmRatio, inVehicle) {
    if (!this.ctx || !this.engineGain || !this.engineOsc) return;
    if (!inVehicle) {
      this.engineGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.05);
      return;
    }
    const targetFreq = 40 + Math.max(0, Math.min(1, rpmRatio)) * 140;
    this.engineOsc.frequency.setTargetAtTime(targetFreq, this.ctx.currentTime, 0.08);
    this.engineGain.gain.setTargetAtTime(0.18 + rpmRatio * 0.12, this.ctx.currentTime, 0.05);
  }

  updateSirens(wantedLevel, policeNearby) {
    if (!this.ctx || !this.sirenGain || !this.sirenOsc) return;
    if (wantedLevel <= 0 || !policeNearby) {
      this.sirenGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.2);
      return;
    }
    const t = this.ctx.currentTime;
    const freq = 650 + Math.sin(t * 5.5) * 280;
    this.sirenOsc.frequency.setValueAtTime(freq, t);
    this.sirenGain.gain.setTargetAtTime(0.15, t, 0.1);
  }

  playGunshot(type = 'pistol') {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;

    const bufferSize = this.ctx.sampleRate * 0.15;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.04));
    }

    const whiteNoise = this.ctx.createBufferSource();
    whiteNoise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = type === 'shotgun' ? 'lowpass' : 'bandpass';
    filter.frequency.setValueAtTime(type === 'shotgun' ? 600 : 1200, t);

    const gain = this.ctx.createGain();
    const vol = type === 'shotgun' ? 0.45 : 0.3;
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.18);

    whiteNoise.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    whiteNoise.start(t);
  }

  playImpact(strength = 1) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(120, t);
    osc.frequency.exponentialRampToValueAtTime(30, t + 0.15);

    gain.gain.setValueAtTime(Math.min(0.4, 0.15 * strength), t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.2);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.2);
  }

  playTireScreech() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const bufferSize = this.ctx.sampleRate * 0.12;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.25;
    }
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1400, t);
    filter.Q.setValueAtTime(3, t);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.12, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.15);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);
    src.start(t);
  }

  playMissionFanfare() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const notes = [261.63, 329.63, 392.0, 523.25]; // C4, E4, G4, C5
    notes.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t + idx * 0.12);
      gain.gain.setValueAtTime(0.2, t + idx * 0.12);
      gain.gain.exponentialRampToValueAtTime(0.01, t + idx * 0.12 + 0.35);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(t + idx * 0.12);
      osc.stop(t + idx * 0.12 + 0.35);
    });
  }

  startRadio() {
    if (!this.ctx || this.radioPlaying) return;
    this.radioPlaying = true;
    let step = 0;
    const bassline = [110, 110, 130.81, 146.83, 110, 98.0, 110, 164.81];
    const synthNotes = [220, 261.63, 329.63, 392.0, 440, 523.25];

    this.radioTimer = setInterval(() => {
      if (!this.ctx || this.stationIndex === 3) return; // Station 3 is OFF
      const t = this.ctx.currentTime;

      // Synth Bass beat
      const bassOsc = this.ctx.createOscillator();
      const bassGain = this.ctx.createGain();
      bassOsc.type = 'sawtooth';
      const freq = bassline[step % bassline.length];
      bassOsc.frequency.setValueAtTime(freq, t);

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(260 + (step % 4) * 80, t);

      bassGain.gain.setValueAtTime(0.12, t);
      bassGain.gain.exponentialRampToValueAtTime(0.01, t + 0.22);

      bassOsc.connect(filter);
      filter.connect(bassGain);
      bassGain.connect(this.musicGain);
      bassOsc.start(t);
      bassOsc.stop(t + 0.24);

      // Hi-hat groove
      if (step % 2 === 1) {
        const hhBuf = this.ctx.createBuffer(1, this.ctx.sampleRate * 0.04, this.ctx.sampleRate);
        const data = hhBuf.getChannelData(0);
        for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * 0.15;
        const hhSrc = this.ctx.createBufferSource();
        hhSrc.buffer = hhBuf;
        const hhFilter = this.ctx.createBiquadFilter();
        hhFilter.type = 'highpass';
        hhFilter.frequency.setValueAtTime(5500, t);
        const hhGain = this.ctx.createGain();
        hhGain.gain.setValueAtTime(0.08, t);
        hhGain.gain.exponentialRampToValueAtTime(0.005, t + 0.04);
        hhSrc.connect(hhFilter);
        hhFilter.connect(hhGain);
        hhGain.connect(this.musicGain);
        hhSrc.start(t);
      }

      // Arpeggio Lead
      if (step % 4 === 0) {
        const leadOsc = this.ctx.createOscillator();
        const leadGain = this.ctx.createGain();
        leadOsc.type = 'sine';
        const leadFreq = synthNotes[(step / 4) % synthNotes.length];
        leadOsc.frequency.setValueAtTime(leadFreq, t);
        leadGain.gain.setValueAtTime(0.08, t);
        leadGain.gain.exponentialRampToValueAtTime(0.005, t + 0.4);
        leadOsc.connect(leadGain);
        leadGain.connect(this.musicGain);
        leadOsc.start(t);
        leadOsc.stop(t + 0.42);
      }

      step++;
    }, 220);
  }

  nextRadioStation() {
    this.stationIndex = (this.stationIndex + 1) % this.stations.length;
    return this.stations[this.stationIndex];
  }

  getCurrentStation() {
    return this.stations[this.stationIndex];
  }
}

export const sound = new SoundEngine();
