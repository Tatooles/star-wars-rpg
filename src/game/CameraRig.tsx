import { useFrame, useThree } from "@react-three/fiber";
import type { RapierRigidBody } from "@react-three/rapier";
import { RefObject, useRef } from "react";
import * as THREE from "three";
import { advanceCameraYaw } from "./controlModel";
import { resolveCameraLockPosition } from "./cameraTarget";
import type { Controls } from "./useControls";

type CameraRigProps = {
  playerRef: RefObject<RapierRigidBody | null>;
  yawRef: RefObject<number>;
  controls: RefObject<Controls>;
  enabled: boolean;
  lockedTargetId: string | null;
  lockedTargetPositionRef: RefObject<THREE.Vector3 | null>;
};

const CAMERA_PITCH = -0.2;

export function CameraRig({
  playerRef,
  yawRef,
  controls,
  enabled,
  lockedTargetId,
  lockedTargetPositionRef,
}: CameraRigProps) {
  const { camera, scene } = useThree();
  const currentPosition = useRef(new THREE.Vector3(2.4, 4.5, 25));
  const raycaster = useRef(new THREE.Raycaster());

  useFrame((_, delta) => {
    const body = playerRef.current;
    if (!body) return;
    const translation = body.translation();
    if (import.meta.env.DEV) document.documentElement.dataset.cameraYaw = yawRef.current.toFixed(3);
    const target = new THREE.Vector3(translation.x, translation.y + 0.75, translation.z);
    const lockPosition = resolveCameraLockPosition(
      lockedTargetId,
      lockedTargetPositionRef.current,
    );
    const yawBeforeManualTurn = yawRef.current;
    const turningManually = enabled
      && !lockPosition
      && controls.current.turnAxis !== 0;
    if (enabled) {
      yawRef.current = advanceCameraYaw({
        cameraYaw: yawRef.current,
        deltaSeconds: delta,
        turnAxis: controls.current.turnAxis,
        targetLocked: Boolean(lockPosition),
      });
    }
    if (lockPosition) {
      const lockAngle = Math.atan2(lockPosition.x - translation.x, lockPosition.z - translation.z);
      const yawDifference = Math.atan2(
        Math.sin(lockAngle - yawRef.current),
        Math.cos(lockAngle - yawRef.current),
      );
      yawRef.current += yawDifference * Math.min(1, delta * 5.5);
      target.lerp(new THREE.Vector3(lockPosition.x, lockPosition.y + 0.6, lockPosition.z), 0.24);
    }
    const distance = 7.2;
    const flatDistance = Math.cos(CAMERA_PITCH) * distance;
    const desired = new THREE.Vector3(
      target.x - Math.sin(yawRef.current) * flatDistance + Math.cos(yawRef.current) * 1.15,
      target.y + 1.1 - Math.sin(CAMERA_PITCH) * distance,
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
    if (turningManually) {
      const yawDelta = yawRef.current - yawBeforeManualTurn;
      currentPosition.current
        .sub(target)
        .applyAxisAngle(THREE.Object3D.DEFAULT_UP, yawDelta)
        .add(target);
    }
    const smoothing = 1 - Math.exp(-delta * (obstruction ? 18 : 7));
    currentPosition.current.lerp(desired, smoothing);
    camera.position.copy(currentPosition.current);
    camera.lookAt(target);
  }, -1);

  return null;
}
