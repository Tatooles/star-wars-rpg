export type SoundCue =
  | "swing1"
  | "swing2"
  | "swing3"
  | "impact"
  | "blaster"
  | "reflect"
  | "hurt"
  | "destroy"
  | "levelUp"
  | "beacon"
  | "dodge";

type BrowserAudioContext = typeof AudioContext;

export class ProceduralAudio {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;

  async start() {
    if (!this.context) this.createGraph();
    await this.context?.resume();
    this.reportState();
  }

  async resume() {
    await this.context?.resume();
    this.reportState();
  }

  async suspend() {
    if (this.context?.state === "running") await this.context.suspend();
    this.reportState();
  }

  play(cue: SoundCue) {
    const context = this.context;
    const master = this.master;
    if (!context || !master || context.state !== "running") return;
    const now = context.currentTime;

    if (cue === "swing1" || cue === "swing2" || cue === "swing3") {
      const variation = cue === "swing1" ? 0 : cue === "swing2" ? 1 : 2;
      this.tone([150, 195, 125][variation], [58, 72, 44][variation], [0.22, 0.25, 0.31][variation], "sawtooth", 0.08);
      this.noise([0.12, 0.15, 0.2][variation], 0.04, [900, 1250, 720][variation]);
    } else if (cue === "impact") {
      this.tone(95, 42, 0.18, "square", 0.1);
    } else if (cue === "blaster") {
      this.tone(540, 105, 0.12, "sawtooth", 0.06);
    } else if (cue === "reflect") {
      this.tone(320, 920, 0.16, "square", 0.075);
    } else if (cue === "hurt") {
      this.tone(110, 62, 0.28, "sawtooth", 0.09);
    } else if (cue === "destroy") {
      this.noise(0.32, 0.13, 520);
      this.tone(125, 35, 0.35, "square", 0.07);
    } else if (cue === "levelUp") {
      [0, 0.12, 0.24].forEach((delay, index) => {
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        oscillator.type = "triangle";
        oscillator.frequency.value = [392, 523, 784][index];
        gain.gain.setValueAtTime(0.0001, now + delay);
        gain.gain.exponentialRampToValueAtTime(0.1, now + delay + 0.035);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + delay + 0.35);
        oscillator.connect(gain).connect(master);
        oscillator.onended = () => {
          oscillator.disconnect();
          gain.disconnect();
        };
        oscillator.start(now + delay);
        oscillator.stop(now + delay + 0.38);
      });
    } else if (cue === "beacon") {
      this.tone(210, 35, 1.15, "sawtooth", 0.11);
      this.noise(0.9, 0.07, 260);
    } else if (cue === "dodge") {
      this.noise(0.16, 0.04, 1100);
    }
  }

  private createGraph() {
    const AudioContextConstructor = window.AudioContext ??
      (window as typeof window & { webkitAudioContext?: BrowserAudioContext }).webkitAudioContext;
    if (!AudioContextConstructor) return;
    const context = new AudioContextConstructor();
    const master = context.createGain();
    master.gain.value = 0.5;
    master.connect(context.destination);

    this.context = context;
    this.master = master;
  }

  private tone(startFrequency: number, endFrequency: number, duration: number, type: OscillatorType, volume: number) {
    const context = this.context;
    const master = this.master;
    if (!context || !master) return;
    const now = context.currentTime;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(startFrequency, now);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(1, endFrequency), now + duration);
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    oscillator.connect(gain).connect(master);
    oscillator.onended = () => {
      oscillator.disconnect();
      gain.disconnect();
    };
    oscillator.start(now);
    oscillator.stop(now + duration + 0.02);
  }

  private noise(duration: number, volume: number, lowpassFrequency: number) {
    const context = this.context;
    const master = this.master;
    if (!context || !master) return;
    const buffer = context.createBuffer(1, Math.ceil(context.sampleRate * duration), context.sampleRate);
    const channel = buffer.getChannelData(0);
    for (let index = 0; index < channel.length; index += 1) channel[index] = Math.random() * 2 - 1;
    const source = context.createBufferSource();
    const filter = context.createBiquadFilter();
    const gain = context.createGain();
    filter.type = "lowpass";
    filter.frequency.value = lowpassFrequency;
    gain.gain.setValueAtTime(volume, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + duration);
    source.buffer = buffer;
    source.connect(filter).connect(gain).connect(master);
    source.onended = () => {
      source.disconnect();
      filter.disconnect();
      gain.disconnect();
    };
    source.start();
  }

  private reportState() {
    if (import.meta.env.DEV && this.context) {
      document.documentElement.dataset.audioState = this.context.state;
    }
  }
}
