import { describe, expect, it } from "vitest";
import { isLegacyCameraObstacle } from "./outpostCameraObstacles";

describe("outpost camera obstacles", () => {
  it("preserves the legacy obstacle equivalents", () => {
    expect(isLegacyCameraObstacle("Ground_Main")).toBe(true);
    expect(isLegacyCameraObstacle("RockFormation_06")).toBe(true);
    expect(isLegacyCameraObstacle("OutpostWall_-5.7")).toBe(true);
    expect(isLegacyCameraObstacle("RaisedPlatform")).toBe(true);
    expect(isLegacyCameraObstacle("BeaconDeck")).toBe(true);
    expect(isLegacyCameraObstacle("AntennaMast_6.3")).toBe(true);
    expect(isLegacyCameraObstacle("PowerPanel_02")).toBe(true);
  });

  it("keeps decorative additions out of camera and targeting collision", () => {
    expect(isLegacyCameraObstacle("RockFormation_07")).toBe(false);
    expect(isLegacyCameraObstacle("RockShard_01")).toBe(false);
    expect(isLegacyCameraObstacle("PathSlab_04")).toBe(false);
    expect(isLegacyCameraObstacle("Crate_2_1")).toBe(false);
    expect(isLegacyCameraObstacle("Cable_Main")).toBe(false);
    expect(isLegacyCameraObstacle("PowerBox_03")).toBe(false);
  });
});
