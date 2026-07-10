import { afterEach, describe, expect, it, vi } from "vitest";
import { ProceduralAudio } from "./audio";

class FakeAudioParam {
  value = 0;
  setValueAtTime() {}
  exponentialRampToValueAtTime() {}
}

class FakeAudioNode {
  connect(node: FakeAudioNode) {
    return node;
  }
}

class FakeGainNode extends FakeAudioNode {
  gain = new FakeAudioParam();
}

class FakeOscillatorNode extends FakeAudioNode {
  type: OscillatorType = "sine";
  frequency = new FakeAudioParam();
  start = vi.fn();
  stop = vi.fn();
}

class FakeAudioContext {
  static instances: FakeAudioContext[] = [];

  state: AudioContextState = "running";
  currentTime = 0;
  sampleRate = 48_000;
  destination = new FakeAudioNode();
  oscillators: FakeOscillatorNode[] = [];

  constructor() {
    FakeAudioContext.instances.push(this);
  }

  createGain() {
    return new FakeGainNode();
  }

  createOscillator() {
    const oscillator = new FakeOscillatorNode();
    this.oscillators.push(oscillator);
    return oscillator;
  }

  resume() {
    return Promise.resolve();
  }

  suspend() {
    return Promise.resolve();
  }
}

describe("ProceduralAudio", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    FakeAudioContext.instances = [];
  });

  it("does not start an endless oscillator when the mission begins", async () => {
    vi.stubGlobal("window", { AudioContext: FakeAudioContext });
    vi.stubGlobal("document", { documentElement: { dataset: {} } });

    const audio = new ProceduralAudio();
    await audio.start();

    const { oscillators } = FakeAudioContext.instances[0];
    expect(oscillators.filter((oscillator) => oscillator.start.mock.calls.length > oscillator.stop.mock.calls.length)).toEqual([]);
  });
});
