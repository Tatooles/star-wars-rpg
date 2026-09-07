import { RefObject, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { Panel, Pipe } from "./ModelParts";
import { materials, sphere } from "./visualAssets";

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

const darkCloth = materials.robe;
const leather = materials.leather;
const skin = new THREE.MeshStandardMaterial({ color: "#c9906b", roughness: 0.87 });
const hair = new THREE.MeshStandardMaterial({ color: "#3b271d", roughness: 0.9 });
const saberCore = new THREE.MeshBasicMaterial({ color: new THREE.Color("#dff7ff").multiplyScalar(2), toneMapped: false });
const saberGlow = new THREE.MeshBasicMaterial({
  color: "#42a8ff",
  transparent: true,
  opacity: 0.15,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
  toneMapped: false,
});
const saberHilt = new THREE.MeshStandardMaterial({ color: "#a6afb7", metalness: 0.82, roughness: 0.25 });

export function AnakinModel({ moving, combatPose }: AnakinModelProps) {
  const leftLeg = useRef<THREE.Group>(null);
  const rightLeg = useRef<THREE.Group>(null);
  const rightArm = useRef<THREE.Group>(null);
  const saber = useRef<THREE.Group>(null);
  const body = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    const stride = moving.current ? Math.sin(clock.elapsedTime * 9) * 0.42 : 0;
    if (leftLeg.current) leftLeg.current.rotation.x = stride;
    if (rightLeg.current) rightLeg.current.rotation.x = -stride;
    const pose = combatPose.current;
    if (rightArm.current) {
      if (pose.blocking) {
        rightArm.current.rotation.set(-1.25, 0.2, -0.55);
      } else if (pose.attacking) {
        const sweep = Math.sin(pose.attackProgress * Math.PI);
        const direction = pose.comboStep === 1 ? 1 : -1;
        rightArm.current.rotation.set(-0.6 - sweep * 1.1, direction * (0.3 + sweep * 0.8), -0.2);
      } else {
        rightArm.current.rotation.set(-0.12, 0, -0.2);
      }
    }
    if (saber.current) saber.current.rotation.z = pose.comboStep === 2 ? 0.28 : -0.18;
    if (body.current) body.current.rotation.z = pose.dodging ? -0.28 : 0;
  });

  return (
    <group ref={body} position={[0, -0.86, 0]}>
      {[-1, 1].map(side => (
        <group key={side} ref={side === -1 ? leftLeg : rightLeg} position={[side * 0.17, 0.92, 0]}>
          <mesh material={darkCloth} position={[0, -0.24, 0]} castShadow>
            <capsuleGeometry args={[0.125, 0.35, 6, 12]} />
          </mesh>
          <Pipe position={[0, -0.66, 0]} size={[0.13, 0.47, 0.14]} material={leather} />
          <Panel position={[0, -0.91, 0.09]} size={[0.25, 0.17, 0.44]} material={leather} />
          <Panel position={[0, -0.99, 0.07]} size={[0.26, 0.055, 0.47]} material={materials.dark} />
          <Pipe position={[0, -0.45, 0]} size={[0.14, 0.07, 0.15]} material={leather} />
        </group>
      ))}
      <mesh material={darkCloth} position={[0, 1.33, 0]} scale={[1, 1, 0.65]} castShadow>
        <cylinderGeometry args={[0.33, 0.25, 0.7, 20]} />
      </mesh>
      <mesh material={darkCloth} position={[0, 0.83, 0]} rotation={[0, 0.22, 0]} castShadow>
        <cylinderGeometry args={[0.26, 0.46, 0.77, 24, 3, true, 0.28, Math.PI * 2 - 0.56]} />
      </mesh>
      {[-1, 1].map(side => <group key={side}>
        <Panel position={[side * 0.16, 1.37, 0.18]} size={[0.16, 0.69, 0.06]} rotation={[0.07, 0, side * -0.21]} material={leather} />
        <Panel position={[side * 0.2, 0.84, 0.24]} size={[0.17, 0.64, 0.045]} rotation={[0.12, 0, side * 0.09]} material={leather} />
      </group>)}
      <Pipe position={[0, 1.03, 0]} size={[0.3, 0.14, 0.22]} material={leather} />
      <Panel position={[0, 1.04, 0.225]} size={[0.17, 0.105, 0.05]} material={materials.trim} />
      <Panel position={[-0.24, 1.02, 0.07]} size={[0.13, 0.19, 0.17]} material={leather} />
      <Pipe position={[0, 1.78, 0]} size={[0.105, 0.19, 0.1]} material={skin} />
      <mesh geometry={sphere} material={skin} position={[0, 2, 0]} scale={[0.205, 0.265, 0.19]} castShadow />
      <mesh geometry={sphere} material={skin} position={[0, 1.91, 0.055]} scale={[0.155, 0.16, 0.16]} castShadow />
      <mesh geometry={sphere} material={skin} position={[0, 1.99, 0.187]} scale={[0.038, 0.065, 0.045]} />
      {[-1, 1].map(side => <group key={side}>
        <mesh geometry={sphere} material={skin} position={[side * 0.205, 1.99, 0]} scale={[0.04, 0.073, 0.042]} />
        <Panel position={[side * 0.075, 2.045, 0.174]} size={[0.058, 0.013, 0.013]} material={hair} />
        <Panel position={[side * 0.077, 2.075, 0.172]} size={[0.069, 0.019, 0.014]} rotation={[0, 0, side * 0.1]} material={hair} />
      </group>)}
      <mesh material={hair} position={[0, 2.115, -0.035]} scale={[1.02, 0.76, 1.05]} castShadow>
        <sphereGeometry args={[0.225, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.7]} />
      </mesh>
      {Array.from({ length: 9 }, (_, i) => {
        const angle = 0.7 + i * 0.6;
        return <mesh key={i} geometry={sphere} material={hair}
          position={[Math.sin(angle) * 0.16, 2.02 + Math.cos(i * 2) * 0.06, -0.09 - Math.abs(Math.cos(angle)) * 0.1]}
          rotation={[0.2, 0, Math.sin(angle) * 0.4]} scale={[0.095, 0.22, 0.085]} castShadow />;
      })}
      <group position={[-0.37, 1.58, 0]} rotation={[0.12, 0, -0.13]}>
        <mesh material={darkCloth} position={[0, -0.16, 0]} castShadow><capsuleGeometry args={[0.12, 0.23, 6, 12]} /></mesh>
        <Pipe position={[0, -0.45, 0]} size={[0.09, 0.29, 0.095]} material={darkCloth} />
        <mesh geometry={sphere} material={skin} position={[0, -0.66, 0]} scale={[0.07, 0.115, 0.07]} castShadow />
      </group>
      <group ref={rightArm} position={[0.37, 1.58, 0]}>
        <mesh material={darkCloth} position={[0, -0.16, 0]} castShadow><capsuleGeometry args={[0.12, 0.23, 6, 12]} /></mesh>
        <Pipe position={[0, -0.45, 0]} size={[0.09, 0.29, 0.095]} material={leather} />
        <mesh geometry={sphere} material={leather} position={[0, -0.64, 0.02]} scale={[0.075, 0.11, 0.08]} castShadow />
        <group ref={saber} position={[0.025, -0.66, 0.12]} rotation={[-0.3, 0, -0.18]}>
          <mesh material={saberHilt}><cylinderGeometry args={[0.045, 0.05, 0.29, 16]} /></mesh>
          {[-0.1, -0.06, -0.02, 0.02].map(y => <Pipe key={y} position={[0, y, 0]} size={[0.052, 0.015, 0.052]} material={materials.dark} />)}
          <Pipe position={[0, 0.15, 0]} size={[0.065, 0.06, 0.065]} material={saberHilt} />
          <mesh material={saberCore} position={[0, 1.02, 0]}><capsuleGeometry args={[0.026, 1.65, 6, 12]} /></mesh>
          <mesh material={saberGlow} position={[0, 1.02, 0]}><capsuleGeometry args={[0.075, 1.64, 6, 12]} /></mesh>
          <mesh material={saberGlow} position={[0, 1.02, 0]}><capsuleGeometry args={[0.12, 1.62, 6, 12]} /></mesh>
          <pointLight color="#3baaff" intensity={4} distance={4} position={[0, 0.8, 0]} />
        </group>
      </group>
    </group>
  );
}
