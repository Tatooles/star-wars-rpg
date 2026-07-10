import { useFrame } from "@react-three/fiber";
import { CapsuleCollider, RapierRigidBody, RigidBody } from "@react-three/rapier";
import { RefObject, useRef } from "react";
import * as THREE from "three";
import type { ProjectileSpawn } from "./B1Droid";
import type { EnemyState } from "./session";
import { B2_TUNING } from "./combatTuning";
import { EnemyIndicator } from "./EnemyIndicator";
import { GAME_ASSETS, type B2Clip } from "./assetManifest";
import { ImportedCharacter, type ImportedCharacterHandle } from "./ImportedCharacter";
import { getEnemyPresentation } from "./enemyPresentation";

type B2DroidProps = {
  enemy: EnemyState;
  playerRef: RefObject<RapierRigidBody | null>;
  playing: boolean;
  active: boolean;
  locked: boolean;
  registerBody: (enemyId: string, body: RapierRigidBody | null) => void;
  onFire: (spawn: ProjectileSpawn) => void;
  onMelee: (direction: THREE.Vector3) => void;
};

export function B2Droid({
  enemy,
  playerRef,
  playing,
  active,
  locked,
  registerBody,
  onFire,
  onMelee,
}: B2DroidProps) {
  const bodyRef = useRef<RapierRigidBody>(null);
  const burstCooldown = useRef<number>(B2_TUNING.initialBurstCooldown);
  const burstShots = useRef(0);
  const burstTimer = useRef(0);
  const meleeCooldown = useRef(0);
  const muzzleFlash = useRef<THREE.PointLight>(null);
  const model = useRef<THREE.Group>(null);
  const lastHealth = useRef(enemy.health);
  const hitReaction = useRef(0);
  const imported = useRef<ImportedCharacterHandle>(null);
  const desiredClip = useRef<B2Clip>("Idle");
  const defeatedFor = useRef(0);
  const burstAnimationFor = useRef(0);
  const meleeAnimationFor = useRef(0);

  useFrame((_, delta) => {
    const body = bodyRef.current;
    const player = playerRef.current;
    if (!enemy.alive) defeatedFor.current += delta;
    else defeatedFor.current = 0;
    const presentation = getEnemyPresentation(enemy.alive, defeatedFor.current);
    registerBody(enemy.id, presentation.registerTarget ? body : null);
    if (model.current) model.current.visible = presentation.visible;
    if (!enemy.alive) {
      desiredClip.current = "Defeat";
      return;
    }
    if (enemy.health < lastHealth.current) hitReaction.current = B2_TUNING.hitRecovery;
    lastHealth.current = enemy.health;
    hitReaction.current = Math.max(0, hitReaction.current - delta);
    if (model.current) {
      model.current.rotation.z = hitReaction.current > 0
        ? Math.sin(hitReaction.current * 36) * 0.1
        : 0;
    }
    burstAnimationFor.current = Math.max(0, burstAnimationFor.current - delta);
    meleeAnimationFor.current = Math.max(0, meleeAnimationFor.current - delta);
    desiredClip.current = hitReaction.current > 0
      ? "Hit"
      : meleeAnimationFor.current > 0
        ? "Melee"
        : burstAnimationFor.current > 0
          ? "BurstFire"
          : "Idle";
    if (!body || !player || !playing || !active || !enemy.alive) return;
    if (hitReaction.current > 0) return;
    const position = body.translation();
    const playerPosition = player.translation();
    const towardPlayer = new THREE.Vector3(
      playerPosition.x - position.x,
      0,
      playerPosition.z - position.z,
    );
    const distance = towardPlayer.length();
    towardPlayer.normalize();
    if (distance > 5.5) {
      body.setNextKinematicTranslation({
        x: position.x + towardPlayer.x * delta * 1.45,
        y: position.y,
        z: position.z + towardPlayer.z * delta * 1.45,
      });
      if (burstAnimationFor.current <= 0 && meleeAnimationFor.current <= 0) desiredClip.current = "Move";
    }
    body.setNextKinematicRotation(
      new THREE.Quaternion().setFromAxisAngle(
        new THREE.Vector3(0, 1, 0),
        Math.atan2(towardPlayer.x, towardPlayer.z),
      ),
    );

    meleeCooldown.current = Math.max(0, meleeCooldown.current - delta);
    if (distance < B2_TUNING.meleeRange && meleeCooldown.current <= 0) {
      onMelee(towardPlayer);
      meleeAnimationFor.current = 0.62;
      meleeCooldown.current = B2_TUNING.meleeCooldown;
    }

    burstCooldown.current -= delta;
    burstTimer.current -= delta;
    if (burstCooldown.current <= 0 && burstShots.current === 0 && distance < 24) {
      burstShots.current = B2_TUNING.burstShots;
      burstTimer.current = 0;
      burstCooldown.current = B2_TUNING.burstCooldown;
    }
    if (burstShots.current > 0 && burstTimer.current <= 0) {
      const muzzle = new THREE.Vector3(position.x + 0.58, position.y + 1.25, position.z)
        .addScaledVector(towardPlayer, 0.75);
      imported.current?.getAttachmentWorldPosition("Muzzle_B2", muzzle);
      const target = new THREE.Vector3(playerPosition.x, playerPosition.y + 0.2, playerPosition.z);
      onFire({ position: muzzle, direction: target.sub(muzzle).normalize(), sourceId: enemy.id });
      burstAnimationFor.current = 0.65;
      burstShots.current -= 1;
      burstTimer.current = B2_TUNING.burstSpacing;
      if (muzzleFlash.current) muzzleFlash.current.intensity = 12;
    }
    if (muzzleFlash.current) muzzleFlash.current.intensity *= Math.exp(-delta * 18);
  });

  return (
    <RigidBody
      ref={bodyRef}
      type="kinematicPosition"
      colliders={false}
      position={enemy.position}
      name={`enemy-${enemy.id}`}
    >
      {enemy.alive && <CapsuleCollider args={[0.85, 0.68]} position={[0, 0.25, 0]} />}
      <group ref={model}>
        <ImportedCharacter ref={imported} url={GAME_ASSETS.b2} desiredClip={desiredClip} />
        <pointLight ref={muzzleFlash} color="#ff3c1f" intensity={0} distance={5} position={[0.68, 0.9, 0.9]} />
      </group>
      <EnemyIndicator
        bodyRef={bodyRef}
        enemy={enemy}
        locked={locked}
        showHealthBar={!active}
      />
    </RigidBody>
  );
}
