import * as THREE from "three";

/** Match the existing ancestor-tag rule before doing expensive triangle tests. */
export function intersectObstacles(ray: THREE.Raycaster, roots: THREE.Object3D[]) {
  const hits: THREE.Intersection[] = [];
  const visit = (object: THREE.Object3D) => {
    if (object.userData.cameraObstacle) {
      ray.intersectObject(object, true, hits);
      return;
    }
    for (const child of object.children) visit(child);
  };
  for (const root of roots) visit(root);
  return hits.sort((a, b) => a.distance - b.distance);
}
