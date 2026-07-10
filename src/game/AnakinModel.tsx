import { RefObject, useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { GAME_ASSETS, type AnakinClip } from "./assetManifest";
import { ImportedCharacter, type ImportedCharacterHandle } from "./ImportedCharacter";

type AnakinModelProps = {
  moving: RefObject<boolean>;
  backpedaling: RefObject<boolean>;
  combatPose: RefObject<CombatPose>;
  health: number;
};

export type CombatPose = {
  attacking: boolean;
  attackProgress: number;
  comboStep: number;
  blocking: boolean;
  dodging: boolean;
  interacting: boolean;
};

function createSaberBlade() {
  const group = new THREE.Group();
  group.name = "RuntimeSaberBlade";
  const core = new THREE.Mesh(
    new THREE.CylinderGeometry(0.025, 0.025, 1.25, 8),
    new THREE.MeshBasicMaterial({ color: "#e9fbff", toneMapped: false }),
  );
  const glow = new THREE.Mesh(
    new THREE.CylinderGeometry(0.07, 0.07, 1.28, 10),
    new THREE.MeshBasicMaterial({
      color: "#339dff",
      transparent: true,
      opacity: 0.32,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    }),
  );
  core.position.y = 0.63;
  glow.position.y = 0.63;
  group.add(core, glow);
  const light = new THREE.PointLight("#268cff", 3.2, 3.5);
  light.position.y = 0.55;
  group.add(light);
  return group;
}

export function AnakinModel({ moving, backpedaling, combatPose, health }: AnakinModelProps) {
  const imported = useRef<ImportedCharacterHandle>(null);
  const desiredClip = useRef<AnakinClip>("Idle");
  const previousHealth = useRef(health);
  const hitFor = useRef(0);
  const saberBlade = useMemo(() => createSaberBlade(), []);

  useEffect(() => {
    const anchor = imported.current?.getObject("SaberBladeAnchor");
    if (!anchor) return;
    anchor.add(saberBlade);
    return () => {
      anchor.remove(saberBlade);
    };
  }, [saberBlade]);

  useFrame((_, delta) => {
    if (health < previousHealth.current && health > 0) hitFor.current = 0.3;
    previousHealth.current = health;
    hitFor.current = Math.max(0, hitFor.current - delta);
    const pose = combatPose.current;
    if (health <= 0) desiredClip.current = "Defeat";
    else if (hitFor.current > 0) desiredClip.current = "Hit";
    else if (pose.attacking) desiredClip.current = `Attack${pose.comboStep + 1}` as AnakinClip;
    else if (pose.blocking) desiredClip.current = "Block";
    else if (pose.dodging) desiredClip.current = "Dodge";
    else if (pose.interacting) desiredClip.current = "Interact";
    else if (moving.current) desiredClip.current = backpedaling.current ? "Backpedal" : "Run";
    else desiredClip.current = "Idle";
  });

  return (
    <group position={[0, -0.86, 0]}>
      <ImportedCharacter ref={imported} url={GAME_ASSETS.anakin} desiredClip={desiredClip} />
    </group>
  );
}
