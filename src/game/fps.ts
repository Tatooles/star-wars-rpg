export function calculateFps(frameCount: number, elapsedMs: number) {
  if (frameCount <= 0 || elapsedMs <= 0) return 0;
  return Math.round((frameCount * 1_000) / elapsedMs);
}
