import { RefObject, useEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import {
  ANAKIN_CLIPS,
  ATTACK_CLIPS,
  dampWeights,
  isLowerBodyTrack,
  resolveLayerWeights,
  resolveTargetWeights,
  type AnakinClip,
  type ClipWeights,
} from "./anakinAnimationModel";

type AnakinModelProps = {
  /** 1 = moving forward, -1 = backpedaling, 0 = standing. */
  locomotion: RefObject<number>;
  combatPose: RefObject<CombatPose>;
};

export type CombatPose = {
  attacking: boolean;
  attackProgress: number;
  comboStep: number;
  blocking: boolean;
  dodging: boolean;
  dodgeProgress: number;
};

// Built by art/blender/scripts/anakin_build.py.
const MODEL_URL = `${import.meta.env.BASE_URL}models/anakin.glb`;
// The Blender model is 1.86 m tall; the gameplay capsule expects ~2.45 units,
// with its base 0.93 units below the rigid body origin.
const MODEL_SCALE = 1.31;
const MODEL_FLOOR = -0.93;
const LOOP_SPEED: Partial<Record<AnakinClip, number>> = { Idle: 1, Run: 1.6, Backpedal: 2.1, Block: 1 };

const saberCore = new THREE.MeshBasicMaterial({ color: "#e4f6ff", toneMapped: false });
const saberGlow = new THREE.MeshBasicMaterial({
  color: "#42a8ff",
  transparent: true,
  opacity: 0.3,
  blending: THREE.AdditiveBlending,
  depthWrite: false,
  toneMapped: false,
});

type LayeredActions = Record<AnakinClip, { upper: THREE.AnimationAction; lower: THREE.AnimationAction }>;

function prepareModel(scene: THREE.Object3D) {
  if (scene.userData.anakinPrepared) return;
  scene.userData.anakinPrepared = true;
  scene.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    object.castShadow = true;
    // Skinned bounds come from the bind pose; animated swings can leave them.
    object.frustumCulled = false;
  });

  const blade = scene.getObjectByName("SaberBlade");
  if (!(blade instanceof THREE.Mesh)) return;
  blade.material = saberCore;
  blade.castShadow = false;
  blade.geometry.computeBoundingBox();
  const bounds = blade.geometry.boundingBox!;
  const size = bounds.getSize(new THREE.Vector3());
  const center = bounds.getCenter(new THREE.Vector3());
  // Thicken the core a little and wrap it in an additive glow sleeve.
  const axis = size.x > size.y && size.x > size.z ? "x" : size.y > size.z ? "y" : "z";
  const length = size[axis];
  blade.geometry.translate(-center.x, -center.y, -center.z);
  blade.geometry.scale(axis === "x" ? 1 : 1.7, axis === "y" ? 1 : 1.7, axis === "z" ? 1 : 1.7);
  blade.geometry.translate(center.x, center.y, center.z);
  const glow = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.042, length * 1.03, 12, 1), saberGlow);
  if (axis === "x") glow.rotation.z = Math.PI / 2;
  if (axis === "z") glow.rotation.x = Math.PI / 2;
  glow.position.copy(center);
  blade.add(glow);
  const light = new THREE.PointLight("#238fff", 2.2, 3.2);
  light.position.copy(center);
  blade.add(light);
}

function createLayeredActions(mixer: THREE.AnimationMixer, clips: THREE.AnimationClip[]) {
  const actions = {} as LayeredActions;
  for (const name of ANAKIN_CLIPS) {
    const clip = clips.find((candidate) => candidate.name === name);
    if (!clip) throw new Error(`anakin.glb is missing the ${name} animation`);
    const layer = (lower: boolean) => {
      const tracks = clip.tracks.filter((track) => isLowerBodyTrack(track.name) === lower);
      const action = mixer.clipAction(new THREE.AnimationClip(`${name}.${lower ? "lower" : "upper"}`, clip.duration, tracks));
      const driven = !(name in LOOP_SPEED);
      action.setLoop(driven ? THREE.LoopOnce : THREE.LoopRepeat, Infinity);
      action.clampWhenFinished = true;
      action.paused = driven;
      action.timeScale = LOOP_SPEED[name] ?? 1;
      action.setEffectiveWeight(0);
      action.play();
      return action;
    };
    actions[name] = { upper: layer(false), lower: layer(true) };
  }
  return actions;
}

function seekClip(actions: LayeredActions, name: AnakinClip, progress: number) {
  const { upper, lower } = actions[name];
  const time = THREE.MathUtils.clamp(progress, 0, 1) * upper.getClip().duration * 0.999;
  upper.time = time;
  lower.time = time;
}

export function AnakinModel({ locomotion, combatPose }: AnakinModelProps) {
  const { scene, animations } = useGLTF(MODEL_URL);
  const blend = useRef<ClipWeights>(resolveTargetWeights({
    locomotion: 0,
    attacking: false,
    comboStep: 0,
    blocking: false,
    dodging: false,
  }));

  const animation = useRef<{ mixer: THREE.AnimationMixer; actions: LayeredActions } | null>(null);

  useEffect(() => {
    prepareModel(scene);
    const mixer = new THREE.AnimationMixer(scene);
    animation.current = { mixer, actions: createLayeredActions(mixer, animations) };
    return () => {
      animation.current = null;
      mixer.stopAllAction();
      mixer.uncacheRoot(scene);
    };
  }, [animations, scene]);

  useFrame((_, delta) => {
    if (!animation.current) return;
    const { mixer, actions } = animation.current;
    const pose = combatPose.current;
    const step = Math.min(delta, 0.1);
    blend.current = dampWeights(
      blend.current,
      resolveTargetWeights({ ...pose, locomotion: locomotion.current }),
      step,
    );
    const layers = resolveLayerWeights(blend.current);

    // Progress-driven clips stay in lockstep with gameplay hit windows.
    if (pose.attacking) seekClip(actions, ATTACK_CLIPS[pose.comboStep] ?? "Attack1", pose.attackProgress);
    if (pose.dodging) seekClip(actions, "Dodge", pose.dodgeProgress);
    for (const name of ANAKIN_CLIPS) {
      actions[name].upper.setEffectiveWeight(layers.upper[name]);
      actions[name].lower.setEffectiveWeight(layers.lower[name]);
    }
    mixer.update(step);
  });

  return <primitive object={scene} scale={MODEL_SCALE} position={[0, MODEL_FLOOR, 0]} />;
}

useGLTF.preload(MODEL_URL);
