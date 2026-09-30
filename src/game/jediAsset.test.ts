/// <reference types="node" />
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { JEDI_CLIPS } from "./jediAnimation";

type Gltf = {
  animations: { name: string; channels: unknown[] }[];
  skins: { joints: number[] }[];
  meshes: { primitives: { indices: number; attributes: Record<string, number> }[] }[];
  accessors: { count: number }[];
  images: { bufferView?: number; uri?: string }[];
  nodes: { name?: string; skin?: number }[];
  cameras?: unknown[];
};

const bytes = readFileSync(new URL("../../public/models/dark-jedi.glb", import.meta.url));
const asset: Gltf = JSON.parse(bytes.subarray(20, 20 + bytes.readUInt32LE(12)).toString());

describe("shipped Jedi asset", () => {
  it("contains every gameplay clip and an articulated, skinned weapon", () => {
    expect(asset.animations.map((clip) => clip.name).sort()).toEqual([...JEDI_CLIPS].sort());
    expect(asset.animations.every((clip) => clip.channels.length > 20)).toBe(true);
    expect(asset.skins[0].joints.length).toBeGreaterThan(40);
    expect(asset.nodes.find((node) => node.name === "SaberBladeCore")?.skin).toBeDefined();
    expect(asset.meshes.every((mesh) => mesh.primitives.every((primitive) =>
      primitive.attributes.JOINTS_0 !== undefined && primitive.attributes.WEIGHTS_0 !== undefined))).toBe(true);
  });

  it("is self-contained and stays inside the mobile geometry and download budgets", () => {
    const triangles = asset.meshes.reduce((total, mesh) => total + mesh.primitives.reduce(
      (count, primitive) => count + asset.accessors[primitive.indices].count / 3, 0), 0);
    expect(triangles).toBeLessThan(60_000);
    expect(asset.meshes.length).toBeLessThanOrEqual(14);
    expect(bytes.length).toBeLessThan(5_000_000);
    expect(asset.images.every((image) => image.bufferView !== undefined && !image.uri)).toBe(true);
    expect(asset.cameras ?? []).toHaveLength(0);
  });
});
