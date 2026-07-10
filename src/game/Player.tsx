import { useFrame } from "@react-three/fiber";
import {
  CapsuleCollider,
  CuboidCollider,
  RapierCollider,
  RapierRigidBody,
  RigidBody,
  useRapier,
} from "@react-three/rapier";
import { RefObject, useCallback, useRef } from "react";
import * as THREE from "three";
import { AnakinModel, type CombatPose } from "./AnakinModel";
import type { Controls } from "./useControls";
import type { SoundCue } from "./audio";

const RUN_SPEED = 7.2;
const JUMP_SPEED = 7.4;
const DODGE_SPEED = 16;
const ATTACK_DURATIONS = [0.46, 0.5, 0.62];

type PlayerProps = {
  bodyRef: RefObject<RapierRigidBody | null>;
  cameraYaw: RefObject<number>;
  controls: RefObject<Controls>;
  damageMultiplier: number;
  blockingRef: RefObject<boolean>;
  invulnerableRef: RefObject<boolean>;
  lockedTargetRef: RefObject<RapierRigidBody | null>;
  controlLockUntilRef: RefObject<number>;
  onEnemyHit: (enemyId: string, damage: number) => void;
  onSound: (cue: SoundCue) => void;
};

export function Player({
  bodyRef,
  cameraYaw,
  controls,
  damageMultiplier,
  blockingRef,
  invulnerableRef,
  lockedTargetRef,
  controlLockUntilRef,
  onEnemyHit,
  onSound,
}: PlayerProps) {
  const { world, rapier, rigidBodyStates } = useRapier();
  const model = useRef<THREE.Group>(null);
  const moving = useRef(false);
  const lastJumpPress = useRef(0);
  const lastAttackPress = useRef(0);
  const lastDodgePress = useRef(0);
  const targetRotation = useRef(Math.PI);
  const attackTime = useRef(0);
  const attackDuration = useRef(ATTACK_DURATIONS[0]);
  const comboStep = useRef(0);
  const hitThisSwing = useRef(new Set<string>());
  const dodgeTime = useRef(0);
  const dodgeCooldown = useRef(0);
  const saberCollider = useRef<RapierCollider>(null);
  const pose = useRef<CombatPose>({
    attacking: false,
    attackProgress: 0,
    comboStep: 0,
    blocking: false,
    dodging: false,
  });
  const resolveEnemyHit = useCallback(
    (name: string | undefined) => {
      const enemyId = name?.replace("enemy-", "");
      if (!enemyId || hitThisSwing.current.has(enemyId)) return;
      hitThisSwing.current.add(enemyId);
      onEnemyHit(enemyId, Math.round(34 * damageMultiplier));
    },
    [damageMultiplier, onEnemyHit],
  );

  useFrame((_, delta) => {
    const body = bodyRef.current;
    if (!body) return;
    const input = controls.current;
    const x = Number(input.right) - Number(input.left);
    const z = Number(input.backward) - Number(input.forward);
    const length = Math.hypot(x, z);
    const velocity = body.linvel();
    moving.current = length > 0.01;
    const movementLocked = performance.now() < controlLockUntilRef.current;

    if (!movementLocked && length > 0) {
      const localAngle = Math.atan2(x, -z);
      const worldAngle = cameraYaw.current + localAngle;
      const wantsDodge = input.dodgePresses !== lastDodgePress.current && dodgeCooldown.current <= 0;
      if (wantsDodge) {
        dodgeTime.current = 0.24;
        dodgeCooldown.current = 0.85;
        onSound("dodge");
      }
      const speed = dodgeTime.current > 0 ? DODGE_SPEED : RUN_SPEED;
      body.setLinvel(
        { x: Math.sin(worldAngle) * speed, y: velocity.y, z: Math.cos(worldAngle) * speed },
        true,
      );
      targetRotation.current = worldAngle;
    } else if (!movementLocked) {
      body.setLinvel({ x: 0, y: velocity.y, z: 0 }, true);
    }
    const lockedTarget = lockedTargetRef.current;
    if (lockedTarget && !movementLocked) {
      const playerPosition = body.translation();
      const targetPosition = lockedTarget.translation();
      targetRotation.current = Math.atan2(
        targetPosition.x - playerPosition.x,
        targetPosition.z - playerPosition.z,
      );
    }
    lastDodgePress.current = input.dodgePresses;
    dodgeTime.current = Math.max(0, dodgeTime.current - delta);
    dodgeCooldown.current = Math.max(0, dodgeCooldown.current - delta);
    invulnerableRef.current = dodgeTime.current > 0;

    const grounded = Math.abs(velocity.y) < 0.08;
    if (input.jumpPresses !== lastJumpPress.current && grounded) {
      body.setLinvel({ x: body.linvel().x, y: JUMP_SPEED, z: body.linvel().z }, true);
    }
    lastJumpPress.current = input.jumpPresses;

    const currentRotation = body.rotation();
    const currentYaw = Math.atan2(2 * currentRotation.w * currentRotation.y, 1 - 2 * currentRotation.y ** 2);
    const difference = Math.atan2(
      Math.sin(targetRotation.current - currentYaw),
      Math.cos(targetRotation.current - currentYaw),
    );
    const nextYaw = currentYaw + difference * Math.min(1, delta * 13);
    body.setRotation(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), nextYaw), true);

    const attackPressed = input.attackPresses !== lastAttackPress.current;
    if (attackPressed && attackTime.current <= 0.15 && !input.block) {
      comboStep.current = attackTime.current > 0 ? (comboStep.current + 1) % 3 : 0;
      attackDuration.current = ATTACK_DURATIONS[comboStep.current];
      attackTime.current = attackDuration.current;
      hitThisSwing.current.clear();
      onSound((`swing${comboStep.current + 1}`) as SoundCue);
    }
    lastAttackPress.current = input.attackPresses;
    attackTime.current = Math.max(0, attackTime.current - delta);
    const progress = 1 - attackTime.current / attackDuration.current;
    pose.current.attacking = attackTime.current > 0;
    pose.current.attackProgress = THREE.MathUtils.clamp(progress, 0, 1);
    pose.current.comboStep = comboStep.current;
    pose.current.blocking = input.block && attackTime.current <= 0;
    pose.current.dodging = dodgeTime.current > 0;
    blockingRef.current = pose.current.blocking;
    const attackColliderEnabled =
      pose.current.attacking && pose.current.attackProgress >= 0.18 && pose.current.attackProgress <= 0.72;
    saberCollider.current?.setEnabled(attackColliderEnabled);
    if (attackColliderEnabled) {
      const rotation = body.rotation();
      const forward = new THREE.Vector3(0, 0, 1.25).applyQuaternion(
        new THREE.Quaternion(rotation.x, rotation.y, rotation.z, rotation.w),
      );
      const translation = body.translation();
      const shapePosition = {
        x: translation.x + forward.x,
        y: translation.y + 0.35,
        z: translation.z + forward.z,
      };
      world.intersectionsWithShape(
        shapePosition,
        rotation,
        new rapier.Cuboid(0.8, 0.65, 1.25),
        (collider) => {
          const parent = collider.parent();
          const name = parent ? rigidBodyStates.get(parent.handle)?.object.name : undefined;
          if (name?.startsWith("enemy-")) resolveEnemyHit(name);
          return true;
        },
        undefined,
        undefined,
        saberCollider.current ?? undefined,
        body,
      );
    }
  });

  return (
    <RigidBody
      ref={bodyRef}
      colliders={false}
      position={[0, 2.1, 18]}
      rotation={[0, Math.PI, 0]}
      enabledRotations={[false, false, false]}
      linearDamping={8}
      mass={1.2}
      canSleep={false}
      name="player"
    >
      <CapsuleCollider args={[0.62, 0.43]} position={[0, 0.12, 0]} />
      <CuboidCollider
        ref={saberCollider}
        args={[0.78, 0.65, 1.15]}
        position={[0, 0.35, 1.2]}
        sensor
        onIntersectionEnter={({ other }) => {
          if (!pose.current.attacking || pose.current.attackProgress < 0.18 || pose.current.attackProgress > 0.72) return;
          resolveEnemyHit(other.rigidBodyObject?.name);
        }}
      />
      <group ref={model}>
        <AnakinModel moving={moving} combatPose={pose} />
      </group>
    </RigidBody>
  );
}
