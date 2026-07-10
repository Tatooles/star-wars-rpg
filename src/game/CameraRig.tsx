import { useFrame, useThree } from "@react-three/fiber";
import type { RapierRigidBody } from "@react-three/rapier";
import { RefObject, useEffect, useRef } from "react";
import * as THREE from "three";

type CameraRigProps = {
  playerRef: RefObject<RapierRigidBody | null>;
  yawRef: RefObject<number>;
  enabled: boolean;
  lockedTargetRef?: RefObject<RapierRigidBody | null>;
};

export function CameraRig({ playerRef, yawRef, enabled, lockedTargetRef }: CameraRigProps) {
  const { camera, scene } = useThree();
  const pitch = useRef(-0.2);
  const currentPosition = useRef(new THREE.Vector3(2.4, 4.5, 25));
  const raycaster = useRef(new THREE.Raycaster());

  useEffect(() => {
    const onMouseMove = (event: MouseEvent) => {
      if (!enabled || !document.pointerLockElement) return;
      yawRef.current -= event.movementX * 0.0024;
      pitch.current = THREE.MathUtils.clamp(pitch.current - event.movementY * 0.0019, -0.62, 0.32);
    };
    window.addEventListener("mousemove", onMouseMove);
    return () => window.removeEventListener("mousemove", onMouseMove);
  }, [enabled, yawRef]);

  useFrame((_, delta) => {
    const body = playerRef.current;
    if (!body) return;
    const translation = body.translation();
    if (import.meta.env.DEV) document.documentElement.dataset.cameraYaw = yawRef.current.toFixed(3);
    const target = new THREE.Vector3(translation.x, translation.y + 0.75, translation.z);
    const lockBody = lockedTargetRef?.current;
    if (lockBody) {
      const lockPosition = lockBody.translation();
      const lockAngle = Math.atan2(lockPosition.x - translation.x, lockPosition.z - translation.z);
      const yawDifference = Math.atan2(
        Math.sin(lockAngle - yawRef.current),
        Math.cos(lockAngle - yawRef.current),
      );
      yawRef.current += yawDifference * Math.min(1, delta * 5.5);
      target.lerp(new THREE.Vector3(lockPosition.x, lockPosition.y + 0.6, lockPosition.z), 0.24);
    }
    const distance = 7.2;
    const flatDistance = Math.cos(pitch.current) * distance;
    const desired = new THREE.Vector3(
      target.x - Math.sin(yawRef.current) * flatDistance + Math.cos(yawRef.current) * 1.15,
      target.y + 1.1 - Math.sin(pitch.current) * distance,
      target.z - Math.cos(yawRef.current) * flatDistance - Math.sin(yawRef.current) * 1.15,
    );

    const direction = desired.clone().sub(target);
    const desiredDistance = direction.length();
    direction.normalize();
    const collisionRay = raycaster.current;
    collisionRay.set(target, direction);
    collisionRay.far = desiredDistance;
    const obstruction = collisionRay
      .intersectObjects(scene.children, true)
      .find((hit) => {
        let object: THREE.Object3D | null = hit.object;
        while (object) {
          if (object.userData.cameraObstacle) return true;
          object = object.parent;
        }
        return false;
      });

    if (obstruction) {
      desired.copy(target).addScaledVector(direction, Math.max(1.4, obstruction.distance - 0.35));
    }
    const smoothing = 1 - Math.exp(-delta * (obstruction ? 18 : 7));
    currentPosition.current.lerp(desired, smoothing);
    camera.position.copy(currentPosition.current);
    camera.lookAt(target);
  });

  return null;
}
