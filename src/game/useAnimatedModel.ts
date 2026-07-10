import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import { RefObject, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { clone } from "three/examples/jsm/utils/SkeletonUtils.js";

const ONE_SHOT_CLIPS = new Set([
  "Attack1", "Attack2", "Attack3", "Dodge", "Hit", "Defeat", "Interact",
  "Fire", "BurstFire", "Melee",
]);

export function useAnimatedModel(url: string, desiredClip: RefObject<string>) {
  const gltf = useGLTF(url);
  const scene = useMemo(() => clone(gltf.scene), [gltf.scene]);
  const mixer = useMemo(() => new THREE.AnimationMixer(scene), [scene]);
  const activeClip = useRef("");

  const actions = useMemo(() => {
    const result = new Map<string, THREE.AnimationAction>();
    for (const clip of gltf.animations) result.set(clip.name, mixer.clipAction(clip));
    return result;
  }, [gltf.animations, mixer]);

  useEffect(() => {
    scene.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        object.castShadow = true;
        object.receiveShadow = true;
      }
    });
    return () => {
      mixer.stopAllAction();
    };
  }, [mixer, scene]);

  useFrame((_, delta) => {
    const nextName = actions.has(desiredClip.current) ? desiredClip.current : "Idle";
    if (nextName !== activeClip.current) {
      const previous = actions.get(activeClip.current);
      const next = actions.get(nextName);
      previous?.fadeOut(0.12);
      if (next) {
        next.reset().setEffectiveTimeScale(1).setEffectiveWeight(1);
        if (ONE_SHOT_CLIPS.has(nextName)) {
          next.setLoop(THREE.LoopOnce, 1);
          next.clampWhenFinished = nextName === "Defeat";
        } else {
          next.setLoop(THREE.LoopRepeat, Infinity);
          next.clampWhenFinished = false;
        }
        next.fadeIn(0.1).play();
      }
      activeClip.current = nextName;
    }
    mixer.update(delta);
  });

  return scene;
}
