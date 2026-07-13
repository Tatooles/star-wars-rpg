import { RefObject, useEffect, useMemo, useRef } from "react";
import { createPortal, useFrame } from "@react-three/fiber";
import { useAnimations, useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { clone } from "three/examples/jsm/utils/SkeletonUtils.js";
import { selectAnakinActionKey, selectAnakinClip, visualAssetManifest } from "./visualAssets";

type AnakinModelProps = {
  moving: RefObject<boolean>;
  combatPose: RefObject<CombatPose>;
};

export type CombatPose = {
  attacking: boolean;
  attackProgress: number;
  comboStep: number;
  blocking: boolean;
  dodging: boolean;
};

const saberCore = new THREE.MeshBasicMaterial({ color: "#e6fbff", toneMapped: false });
const saberGlow = new THREE.MeshBasicMaterial({
  color: "#249cff",
  transparent: true,
  opacity: 0.3,
  blending: THREE.AdditiveBlending,
  toneMapped: false,
  depthWrite: false,
});
const saberHilt = new THREE.MeshStandardMaterial({
  color: "#a6afb7",
  metalness: 0.82,
  roughness: 0.25,
});
const runtimeRobe = new THREE.MeshStandardMaterial({ color: "#27160f", roughness: 0.9 });
const runtimeTabard = new THREE.MeshStandardMaterial({ color: "#53301f", roughness: 0.84 });
const runtimeSkin = new THREE.MeshStandardMaterial({ color: "#b87857", roughness: 0.78 });

export function AnakinModel({ moving, combatPose }: AnakinModelProps) {
  const gltf = useGLTF(visualAssetManifest.anakin.runtimePath);
  const scene = useMemo(() => clone(gltf.scene), [gltf.scene]);
  const { actions } = useAnimations(gltf.animations, scene);
  const rightHand = useMemo(() => scene.getObjectByName("hand_r"), [scene]);
  const activeClip = useRef<string | undefined>(undefined);
  const actionMap = useRef<Record<string, THREE.AnimationAction | null>>({});
  const body = useRef<THREE.Group>(null);
  const saber = useRef<THREE.Group>(null);

  useEffect(() => {
    actionMap.current = { ...actions };
    scene.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        object.castShadow = true;
        object.receiveShadow = true;
        if (object.name.includes("Base_CC0")) {
          object.material = runtimeSkin;
        } else if (object.name.includes("Fitted_Robe")) {
          object.material = runtimeRobe;
          object.geometry.computeVertexNormals();
        } else if (object.name.includes("Wrap") || object.name.includes("Tabard")) {
          object.material = runtimeTabard;
        }
      }
    });
  }, [actions, scene]);

  useFrame(() => {
    const pose = combatPose.current;
    const nextClip = selectAnakinClip({
      moving: moving.current,
      attacking: pose.attacking,
      blocking: pose.blocking,
    });
    const nextKey = selectAnakinActionKey({
      moving: moving.current,
      attacking: pose.attacking,
      blocking: pose.blocking,
      comboStep: pose.comboStep,
    });
    if (nextKey !== activeClip.current) {
      const previousClip = activeClip.current?.split(":")[0];
      const previous = previousClip ? actionMap.current[previousClip] : undefined;
      const next = actionMap.current[nextClip];
      previous?.fadeOut(0.12);
      next?.reset().fadeIn(0.12).play();
      next?.setLoop(nextClip === "Attack1" ? THREE.LoopOnce : THREE.LoopRepeat, Infinity);
      activeClip.current = nextKey;
    }
    if (body.current) body.current.rotation.z = pose.dodging ? -0.24 : 0;
    if (saber.current) {
      if (pose.blocking) saber.current.rotation.set(-0.55, 0.25, Math.PI - 0.7);
      else if (pose.attacking) saber.current.rotation.set(-0.3, 0, Math.PI - 1.15 + pose.attackProgress * 2.1);
      else saber.current.rotation.set(0.1, 0, Math.PI - 0.2);
    }
  });

  return (
    <group ref={body} position={[0, -0.88, 0]} rotation={[0, Math.PI, 0]}>
      <primitive object={scene} />
      {rightHand && createPortal(<group ref={saber} position={[0, 0.12, 0]} rotation={[0, 0, 0]}>
        <mesh material={saberHilt}>
          <cylinderGeometry args={[0.045, 0.052, 0.3, 12]} />
        </mesh>
        <mesh material={saberCore} position={[0, 0.92, 0]}>
          <cylinderGeometry args={[0.024, 0.024, 1.68, 10]} />
        </mesh>
        <mesh material={saberGlow} position={[0, 0.92, 0]}>
          <cylinderGeometry args={[0.07, 0.07, 1.72, 12]} />
        </mesh>
        <pointLight color="#238fff" intensity={4} distance={3.6} position={[0, 0.9, 0]} />
      </group>, rightHand)}
    </group>
  );
}

useGLTF.preload(visualAssetManifest.anakin.runtimePath);
