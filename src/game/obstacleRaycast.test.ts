import { describe, expect, it, vi } from "vitest";
import * as THREE from "three";
import { intersectObstacles } from "./obstacleRaycast";

function box(z: number, tagged = false) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1));
  mesh.position.z = z;
  mesh.userData.cameraObstacle = tagged;
  mesh.updateMatrixWorld();
  return mesh;
}
const ray = () => new THREE.Raycaster(new THREE.Vector3(0.1, 0.1, 5), new THREE.Vector3(0, 0, -1));

describe("obstacle raycasts", () => {
  it("skips decorative geometry while retaining the nearest tagged obstruction", () => {
    const decoration = box(3);
    const raycast = vi.spyOn(decoration, "raycast");
    const near = box(1, true);
    const far = box(-3, true);
    expect(intersectObstacles(ray(), [far, decoration, near])[0].object).toBe(near);
    expect(raycast).not.toHaveBeenCalled();
  });

  it("honors tagged ancestors and nested tags without raycasting children twice", () => {
    const root = new THREE.Group();
    const obstacle = new THREE.Group();
    obstacle.userData.cameraObstacle = true;
    const child = box(0, true);
    obstacle.add(child);
    root.add(obstacle);
    root.updateMatrixWorld(true);
    const raycast = vi.spyOn(child, "raycast");
    expect(intersectObstacles(ray(), [root])[0].object).toBe(child);
    expect(raycast).toHaveBeenCalledTimes(1);
  });

  it("respects ray distance for visibility and attack checks", () => {
    const shortRay = ray();
    shortRay.far = 2;
    expect(intersectObstacles(shortRay, [box(0, true)])).toEqual([]);
  });
});
