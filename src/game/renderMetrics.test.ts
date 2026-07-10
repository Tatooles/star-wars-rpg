import { describe, expect, it } from "vitest";
import { summarizeFrameTimes } from "./renderMetrics";

describe("render metrics", () => {
  it("reports sustained frame time and tail latency", () => {
    expect(summarizeFrameTimes([10, 12, 16, 18, 20])).toEqual({
      averageFrameMs: 15.2,
      p95FrameMs: 20,
      maxFrameMs: 20,
      averageFps: 65.8,
      samples: 5,
    });
  });
});
