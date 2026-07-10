export type FrameSummary = {
  averageFrameMs: number;
  p95FrameMs: number;
  maxFrameMs: number;
  averageFps: number;
  samples: number;
};

const round = (value: number) => Math.round(value * 10) / 10;

export function summarizeFrameTimes(frameTimesMs: number[]): FrameSummary {
  if (frameTimesMs.length === 0) {
    return { averageFrameMs: 0, p95FrameMs: 0, maxFrameMs: 0, averageFps: 0, samples: 0 };
  }
  const sorted = [...frameTimesMs].sort((a, b) => a - b);
  const averageFrameMs = frameTimesMs.reduce((sum, value) => sum + value, 0) / frameTimesMs.length;
  const p95Index = Math.min(sorted.length - 1, Math.ceil(sorted.length * 0.95) - 1);
  return {
    averageFrameMs: round(averageFrameMs),
    p95FrameMs: round(sorted[p95Index]),
    maxFrameMs: round(sorted[sorted.length - 1]),
    averageFps: round(1_000 / averageFrameMs),
    samples: frameTimesMs.length,
  };
}
