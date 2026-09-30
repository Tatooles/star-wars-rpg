import { useEffect, useMemo, useRef, type RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import { clone } from "three/examples/jsm/utils/SkeletonUtils.js";
import * as THREE from "three";
import { JEDI_CLIPS, resolveJediClip, type CombatPose, type JediClip } from "./jediAnimation";

export type { CombatPose } from "./jediAnimation";
const MODEL_URL = "/models/dark-jedi.glb";

type AnakinModelProps = {
  moving: RefObject<boolean>;
  combatPose: RefObject<CombatPose>;
  playing: boolean;
};

export function AnakinModel({ moving, combatPose, playing }: AnakinModelProps) {
  const gltf = useGLTF(MODEL_URL);
  const character = useMemo(() => {
    const scene = clone(gltf.scene);
    scene.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        object.castShadow = true;
        object.receiveShadow = true;
      }
    });
    const blade = scene.getObjectByName("SaberBladeCore");
    let glow: THREE.SkinnedMesh | undefined;
    let bladeMaterial: THREE.MeshBasicMaterial | undefined;
    if (blade instanceof THREE.SkinnedMesh) {
      bladeMaterial = new THREE.MeshBasicMaterial({ color: "#dff7ff", toneMapped: false });
      blade.material = bladeMaterial;
      blade.castShadow = false;
      glow = blade.clone();
      glow.name = "SaberGlow";
      glow.geometry = blade.geometry.clone();
      const positions = glow.geometry.getAttribute("position");
      const normals = glow.geometry.getAttribute("normal");
      for (let i = 0; i < positions.count; i++) {
        positions.setXYZ(i, positions.getX(i) + normals.getX(i) * 0.018,
          positions.getY(i) + normals.getY(i) * 0.018,
          positions.getZ(i) + normals.getZ(i) * 0.018);
      }
      positions.needsUpdate = true;
      glow.geometry.computeBoundingSphere();
      glow.material = new THREE.MeshBasicMaterial({ color: "#279bff", transparent: true,
        opacity: 0.2, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
      glow.castShadow = false;
      glow.receiveShadow = false;
      blade.parent?.add(glow);
    }
    const mixer = new THREE.AnimationMixer(scene);
    const actions = new Map<JediClip, THREE.AnimationAction>();
    for (const name of JEDI_CLIPS) {
      const clip = gltf.animations.find((candidate) => candidate.name === name);
      if (!clip) throw new Error(`Jedi asset is missing animation: ${name}`);
      const action = mixer.clipAction(clip);
      const oneShot = name.startsWith("Attack") || name === "Dodge";
      action.setLoop(oneShot ? THREE.LoopOnce : THREE.LoopRepeat, oneShot ? 1 : Infinity);
      action.clampWhenFinished = oneShot;
      actions.set(name, action);
    }
    return { scene, mixer, actions, glow, bladeMaterial };
  }, [gltf.scene, gltf.animations]);
  const currentClip = useRef<JediClip | null>(null);

  useEffect(() => {
    currentClip.current = null;
    return () => {
      character.mixer.stopAllAction();
      character.glow?.geometry.dispose();
      if (character.glow?.material instanceof THREE.Material) character.glow.material.dispose();
      character.bladeMaterial?.dispose();
    };
  }, [character]);

  useFrame((_, delta) => {
    if (!playing) return;
    const pose = combatPose.current;
    const name = resolveJediClip(moving.current, pose);
    const action = character.actions.get(name)!;
    if (currentClip.current !== name) {
      const previous = currentClip.current ? character.actions.get(currentClip.current) : undefined;
      action.reset().setEffectiveTimeScale(1).setEffectiveWeight(1).play();
      if (previous) action.crossFadeFrom(previous, name.startsWith("Attack") ? 0.055 : 0.1, false);
      currentClip.current = name;
    }
    // Sample attacks from the collision/hit-window clock, rather than a second animation timer.
    action.paused = name.startsWith("Attack");
    if (action.paused) action.time = THREE.MathUtils.clamp(pose.attackProgress, 0, 1) * action.getClip().duration;
    character.mixer.update(Math.min(delta, 0.05));
    if (import.meta.env.DEV) document.documentElement.dataset.jediAnimation = name;
  });

  return <group position={[0, -0.87, 0]}><primitive object={character.scene} dispose={null} /></group>;
}

useGLTF.preload(MODEL_URL);
