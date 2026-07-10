import { useFrame } from "@react-three/fiber";
import {
  CapsuleCollider,
  RapierRigidBody,
  RigidBody,
} from "@react-three/rapier";
import { RefObject, useCallback, useEffect, useRef } from "react";
import * as THREE from "three";
import { AnakinModel, type CombatPose } from "./AnakinModel";
import { PLAYER_TUNING } from "./combatTuning";
import type { PlayerCombatState } from "./session";
import type { Controls } from "./useControls";
import type { SoundCue } from "./audio";

type PlayerProps = {
  bodyRef: RefObject<RapierRigidBody | null>;
  cameraYaw: RefObject<number>;
  controls: RefObject<Controls>;
  playing: boolean;
  damageMultiplier: number;
  blockingRef: RefObject<boolean>;
  invulnerableRef: RefObject<boolean>;
  lockedTargetRef: RefObject<RapierRigidBody | null>;
  controlLockUntilRef: RefObject<number>;
  getAssistedEnemyId: (range: number) => string | null;
  onEnemyHit: (enemyId: string, damage: number) => void;
  onCombatStateChange: (combat: PlayerCombatState) => void;
  onSound: (cue: SoundCue) => void;
};

export function Player({
  bodyRef,
  cameraYaw,
  controls,
  playing,
  damageMultiplier,
  blockingRef,
  invulnerableRef,
  lockedTargetRef,
  controlLockUntilRef,
  getAssistedEnemyId,
  onEnemyHit,
  onCombatStateChange,
  onSound,
}: PlayerProps) {
  const model = useRef<THREE.Group>(null);
  const moving = useRef(false);
  const lastJumpPress = useRef(0);
  const lastAttackPress = useRef(0);
  const lastDodgePress = useRef(0);
  const targetRotation = useRef(Math.PI);
  const attackTime = useRef(0);
  const attackDuration = useRef<number>(PLAYER_TUNING.attackDurations[0]);
  const comboStep = useRef(0);
  const hitThisSwing = useRef(new Set<string>());
  const dodgeTime = useRef(0);
  const dodgeCooldown = useRef(0);
  const pose = useRef<CombatPose>({
    attacking: false,
    attackProgress: 0,
    comboStep: 0,
    blocking: false,
    dodging: false,
  });
  const reportedCombat = useRef<PlayerCombatState>({
    attacking: false,
    blocking: false,
    dodging: false,
    comboStep: 0,
  });
  const reportCombatState = useCallback(
    (next: PlayerCombatState) => {
      const current = reportedCombat.current;
      if (
        current.attacking === next.attacking &&
        current.blocking === next.blocking &&
        current.dodging === next.dodging &&
        current.comboStep === next.comboStep
      ) {
        return;
      }
      reportedCombat.current = next;
      onCombatStateChange(next);
    },
    [onCombatStateChange],
  );
  const resolveEnemyHit = useCallback(
    (name: string | undefined) => {
      const enemyId = name?.replace("enemy-", "");
      if (!enemyId || hitThisSwing.current.has(enemyId)) return;
      hitThisSwing.current.add(enemyId);
      onEnemyHit(enemyId, Math.round(PLAYER_TUNING.attackDamage * damageMultiplier));
    },
    [damageMultiplier, onEnemyHit],
  );

  useEffect(() => {
    if (playing) return;
    attackTime.current = 0;
    dodgeTime.current = 0;
    dodgeCooldown.current = 0;
    blockingRef.current = false;
    invulnerableRef.current = false;
    lastJumpPress.current = controls.current.jumpPresses;
    lastAttackPress.current = controls.current.attackPresses;
    lastDodgePress.current = controls.current.dodgePresses;
    pose.current.attacking = false;
    pose.current.blocking = false;
    pose.current.dodging = false;
    pose.current.comboStep = 0;
    comboStep.current = 0;
    reportCombatState({ attacking: false, blocking: false, dodging: false, comboStep: 0 });
  }, [blockingRef, controls, invulnerableRef, playing, reportCombatState]);

  useFrame((_, delta) => {
    const body = bodyRef.current;
    if (!body || !playing) return;
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
        dodgeTime.current = PLAYER_TUNING.dodgeDuration;
        dodgeCooldown.current = PLAYER_TUNING.dodgeCooldown;
        onSound("dodge");
      }
      const speed = dodgeTime.current > 0 ? PLAYER_TUNING.dodgeSpeed : PLAYER_TUNING.runSpeed;
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
      body.setLinvel({ x: body.linvel().x, y: PLAYER_TUNING.jumpSpeed, z: body.linvel().z }, true);
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
      attackDuration.current = PLAYER_TUNING.attackDurations[comboStep.current];
      attackTime.current = attackDuration.current;
      hitThisSwing.current.clear();
      onSound((`swing${comboStep.current + 1}`) as SoundCue);
      const assistedEnemyId = getAssistedEnemyId(PLAYER_TUNING.targetAssistRange);
      resolveEnemyHit(assistedEnemyId ? `enemy-${assistedEnemyId}` : undefined);
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
    reportCombatState({
      attacking: pose.current.attacking,
      blocking: pose.current.blocking,
      dodging: pose.current.dodging,
      comboStep: comboStep.current as 0 | 1 | 2,
    });
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
      <group ref={model}>
        <AnakinModel moving={moving} combatPose={pose} />
      </group>
    </RigidBody>
  );
}
