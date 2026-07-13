export function calculateFps(frameCount: number, elapsedMs: number) {
  if (frameCount <= 0 || elapsedMs <= 0) return 0;
  return Math.round((frameCount * 1_000) / elapsedMs);
}

export function summarizeFrameTimes(samples: number[]) {
  if (samples.length === 0) return { averageMs: 0, p95Ms: 0, maxMs: 0 };
  const sorted = [...samples].sort((a, b) => a - b);
  const average = samples.reduce((total, sample) => total + sample, 0) / samples.length;
  const p95Index = Math.max(0, Math.ceil(sorted.length * 0.95) - 1);
  return {
    averageMs: Math.round(average * 10) / 10,
    p95Ms: Math.round(sorted[p95Index] * 10) / 10,
    maxMs: Math.round(sorted[sorted.length - 1] * 10) / 10,
  };
}
