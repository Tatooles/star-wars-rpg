import { useEffect, useRef, useState } from "react";
import { calculateFps } from "./fps";

const SAMPLE_WINDOW_MS = 500;

type FpsCounterProps = {
  onSample?: (fps: number) => void;
};

export function FpsCounter({ onSample }: FpsCounterProps) {
  const [fps, setFps] = useState<number | null>(null);
  const sampleHandler = useRef(onSample);

  useEffect(() => {
    sampleHandler.current = onSample;
  }, [onSample]);

  useEffect(() => {
    let animationFrameId = 0;
    let sampleStartedAt: number | null = null;
    let frameCount = 0;

    const measureFrame = (now: number) => {
      if (sampleStartedAt === null) {
        sampleStartedAt = now;
      } else {
        frameCount += 1;
        const elapsedMs = now - sampleStartedAt;

        if (elapsedMs >= SAMPLE_WINDOW_MS) {
          const nextFps = calculateFps(frameCount, elapsedMs);
          setFps(nextFps);
          sampleHandler.current?.(nextFps);
          sampleStartedAt = now;
          frameCount = 0;
        }
      }

      animationFrameId = window.requestAnimationFrame(measureFrame);
    };

    animationFrameId = window.requestAnimationFrame(measureFrame);
    return () => window.cancelAnimationFrame(animationFrameId);
  }, []);

  return (
    <div className="fps-counter" aria-label="Frames per second">
      <strong>{fps ?? "--"}</strong>
      <span> FPS</span>
    </div>
  );
}
