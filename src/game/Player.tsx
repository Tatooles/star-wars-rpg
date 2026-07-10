import { useFrame } from "@react-three/fiber";
import { CapsuleCollider, RapierRigidBody, RigidBody } from "@react-three/rapier";
import { RefObject, useRef } from "react";
import * as THREE from "three";
import { AnakinModel } from "./AnakinModel";
import type { Controls } from "./useControls";

const RUN_SPEED = 7.2;
const JUMP_SPEED = 7.4;

type PlayerProps = {
  bodyRef: RefObject<RapierRigidBody | null>;
  cameraYaw: RefObject<number>;
  controls: RefObject<Controls>;
};

export function Player({ bodyRef, cameraYaw, controls }: PlayerProps) {
  const model = useRef<THREE.Group>(null);
  const moving = useRef(false);
  const jumpWasDown = useRef(false);
  const targetRotation = useRef(0);

  useFrame((_, delta) => {
    const body = bodyRef.current;
    if (!body) return;
    const input = controls.current;
    const x = Number(input.right) - Number(input.left);
    const z = Number(input.backward) - Number(input.forward);
    const length = Math.hypot(x, z);
    const velocity = body.linvel();
    moving.current = length > 0.01;

    if (length > 0) {
      const localAngle = Math.atan2(x, z);
      const worldAngle = cameraYaw.current + localAngle;
      const speed = RUN_SPEED;
      body.setLinvel(
        { x: Math.sin(worldAngle) * speed, y: velocity.y, z: Math.cos(worldAngle) * speed },
        true,
      );
      targetRotation.current = worldAngle;
    } else {
      body.setLinvel({ x: 0, y: velocity.y, z: 0 }, true);
    }

    const grounded = Math.abs(velocity.y) < 0.08;
    if (input.jump && !jumpWasDown.current && grounded) {
      body.setLinvel({ x: body.linvel().x, y: JUMP_SPEED, z: body.linvel().z }, true);
    }
    jumpWasDown.current = input.jump;

    if (model.current) {
      const difference = Math.atan2(
        Math.sin(targetRotation.current - model.current.rotation.y),
        Math.cos(targetRotation.current - model.current.rotation.y),
      );
      model.current.rotation.y += difference * Math.min(1, delta * 13);
    }
  });

  return (
    <RigidBody
      ref={bodyRef}
      colliders={false}
      position={[0, 2.1, 18]}
      enabledRotations={[false, false, false]}
      linearDamping={8}
      mass={1.2}
      canSleep={false}
      name="player"
    >
      <CapsuleCollider args={[0.62, 0.43]} position={[0, 0.12, 0]} />
      <group ref={model}>
        <AnakinModel moving={moving} />
      </group>
    </RigidBody>
  );
}
