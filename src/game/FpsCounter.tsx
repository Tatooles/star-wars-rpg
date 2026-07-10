import { useEffect, useState } from "react";
import { calculateFps } from "./fps";

const SAMPLE_WINDOW_MS = 500;

export function FpsCounter() {
  const [fps, setFps] = useState<number | null>(null);

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
          setFps(calculateFps(frameCount, elapsedMs));
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
