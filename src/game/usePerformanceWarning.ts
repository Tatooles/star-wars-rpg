import { useCallback, useRef, useState } from "react";

const LOW_FPS_SAMPLE_LIMIT = 8;

export function usePerformanceWarning(active: boolean, runId: number) {
  const lowFpsSamples = useRef(0);
  const sampledRunId = useRef(runId);
  const [warning, setWarning] = useState({ runId, dismissed: false, visible: false });
  const current = warning.runId === runId
    ? warning
    : { runId, dismissed: false, visible: false };

  const sample = useCallback((fps: number) => {
    if (sampledRunId.current !== runId) {
      sampledRunId.current = runId;
      lowFpsSamples.current = 0;
    }
    if (!active || current.dismissed) {
      lowFpsSamples.current = 0;
      return;
    }
    if (fps >= 30) {
      lowFpsSamples.current = 0;
      if (current.visible) setWarning({ runId, dismissed: false, visible: false });
      return;
    }
    lowFpsSamples.current += 1;
    if (lowFpsSamples.current >= LOW_FPS_SAMPLE_LIMIT) {
      setWarning({ runId, dismissed: false, visible: true });
    }
  }, [active, current.dismissed, current.visible, runId]);

  const dismiss = useCallback(() => {
    setWarning({ runId, dismissed: true, visible: false });
  }, [runId]);

  return { dismiss, sample, visible: current.visible };
}
