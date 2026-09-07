import { memo, useLayoutEffect, useRef } from "react";
import * as THREE from "three";
import { RepublicCruiser } from "./RepublicCruiser";
import { canyonRock, materials } from "./visualAssets";

import { Panel, Pipe, type Vec3 } from "./ModelParts";

function Building({ position, rotation = 0, variant = 0 }: { position: Vec3; rotation?: number; variant?: number }) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <Panel position={[0, 2.5, 0]} size={[8, 5, 9]} />
      <Panel position={[0, 0.3, 0]} size={[8.6, 0.6, 9.5]} material={materials.steel} />
      <Panel position={[0, 5.05, 0]} size={[8.4, 0.35, 9.4]} material={materials.steel} />
      <Panel position={[0, 2, 4.55]} size={[3.4, 4, 0.25]} material={materials.dark} />
      <Panel position={[0, 1.8, 4.72]} size={[2.6, 3.4, 0.15]} material={materials.steel} />
      <Panel position={[0, 1.8, 4.82]} size={[0.035, 3.3, 0.04]} material={materials.dark} />
      <Panel position={[0, 4.15, 4.74]} size={[2.5, 0.09, 0.09]} material={materials.amber} />
      <Panel position={[2.55, 3.4, 4.6]} size={[0.8, 1.25, 0.1]} material={materials.ochre} />
      {[0, 1, 2].map(i => <Panel key={i} position={[2.55, 3.1 + i * 0.23, 4.68]} size={[0.4, 0.045, 0.04]} material={materials.trim} />)}
      {[-1, 1].map(side => (
        <group key={side}>
          <Panel position={[side * 3.5, 2.6, 4.7]} size={[0.4, 4.8, 0.65]} material={materials.steel} />
          <Pipe position={[side * 4.12, 2.5, 2.4]} size={[0.16, 4.5, 0.16]} />
          <Panel position={[side * 2.1, 5.4, -1]} size={[2.4, 0.6, 3.6]} material={materials.dark} />
          {[0, 1, 2, 3].map(i => <Panel key={i} position={[side * 2.1, 5.74, -2.2 + i * 0.8]} size={[2.1, 0.09, 0.25]} material={materials.trim} />)}
        </group>
      ))}
      <Pipe position={[-2.6, 6.7, -2.8]} size={[0.06, 3.2 + variant, 0.06]} />
      <Panel position={[-2.6, 7.5, -2.8]} size={[1.3, 0.16, 0.12]} material={materials.dark} />
    </group>
  );
}

export function Cargo({ position, rotation = 0 }: { position: Vec3; rotation?: number }) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <Panel size={[1.7, 1.2, 1.4]} material={materials.steel} />
      {[-0.62, 0.62].map(x => <Panel key={x} position={[x, 0, 0]} size={[0.13, 1.27, 1.46]} material={materials.trim} />)}
      <Panel position={[0, 0, 0.72]} size={[0.6, 0.48, 0.04]} material={materials.dark} />
      <Panel position={[0, 0.08, 0.75]} size={[0.3, 0.035, 0.02]} material={materials.amber} />
    </group>
  );
}

function MoistureVaporator({ position }: { position: Vec3 }) {
  return <group position={position}>
    <Pipe position={[0, 0.25, 0]} size={[0.6, 0.5, 0.6]} />
    <Pipe position={[0, 3, 0]} size={[0.16, 6, 0.16]} material={materials.hull} />
    {[1.1, 1.35, 1.6, 3.1, 3.3, 3.5, 4.8].map(y => <Pipe key={y} position={[0, y, 0]} size={[0.36, 0.1, 0.36]} material={materials.trim} />)}
    {[-1, 1].map(side => <Pipe key={side} position={[side * 0.45, 2, 0]} size={[0.12, 3.5, 0.12]} material={materials.hull} />)}
    <Panel position={[0, 5.2, 0]} size={[1.4, 0.08, 0.2]} material={materials.steel} />
  </group>;
}

function Dish({ position }: { position: Vec3 }) {
  return <group position={position}>
    <Pipe position={[0, 3.5, 0]} size={[0.4, 7, 0.4]} />
    <Panel position={[0, 0.4, 0]} size={[3, 0.8, 3]} material={materials.hull} />
    <group position={[0, 7, 0]} rotation={[0.9, 0.1, -0.2]}>
      <mesh material={materials.hull} castShadow>
        <sphereGeometry args={[3.5, 24, 12, 0, Math.PI * 2, 0, 0.95]} />
      </mesh>
      <Pipe position={[0, 3.7, 0]} size={[0.1, 3, 0.1]} material={materials.dark} />
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 2.04, 0]} material={materials.trim}>
        <torusGeometry args={[2.85, 0.07, 6, 32]} />
      </mesh>
    </group>
  </group>;
}

function Canyon({ mobile }: { mobile: boolean }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const count = mobile ? 96 : 160;
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const dummy = new THREE.Object3D();
    const tint = new THREE.Color();
    for (let i = 0; i < count; i++) {
      const side = i % 2 === 0 ? -1 : 1;
      const distant = i >= 64;
      const n = i * 1.618;
      const radius = distant ? 30 + (i % 7) * 7 : 16 + (i % 4) * 3;
      const height = distant ? 12 + Math.sin(n) * 6 : 5 + (i % 5) * 1.6;
      dummy.position.set(side * radius, height * 0.38 - 1, 37 - (i / 2 % 36) * 4.9);
      dummy.scale.set(4 + (i % 4) * 1.9, height, 4 + (i % 3) * 2);
      dummy.rotation.set(Math.sin(n) * 0.12, n, Math.cos(n) * 0.12);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
      tint.set(distant ? "#c5b8a7" : "#ffffff").multiplyScalar(0.8 + (i % 5) * 0.05);
      mesh.setColorAt(i, tint);
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [count]);
  return <instancedMesh ref={ref} args={[canyonRock, materials.rock, count]} receiveShadow castShadow />;
}

function Rubble({ mobile }: { mobile: boolean }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const count = mobile ? 100 : 220;
  useLayoutEffect(() => {
    const dummy = new THREE.Object3D();
    for (let i = 0; i < count; i++) {
      const wave = Math.sin(i * 127.1) * 43758.5453;
      const r = wave - Math.floor(wave);
      const x = (i % 2 ? -1 : 1) * (4.1 + r * 7);
      dummy.position.set(x, 0.02, 27 - (i * 0.731 % 75));
      dummy.scale.setScalar(0.06 + r * 0.25);
      dummy.scale.y *= 0.5;
      dummy.rotation.set(i, i * 2, 0);
      dummy.updateMatrix();
      ref.current?.setMatrixAt(i, dummy.matrix);
    }
    if (ref.current) {
      ref.current.instanceMatrix.needsUpdate = true;
      ref.current.computeBoundingSphere();
    }
  }, [count]);
  return <instancedMesh ref={ref} args={[canyonRock, materials.rock, count]} receiveShadow />;
}

export const Scenery = memo(function Scenery({ mobile }: { mobile: boolean }) {
  return <group>
    <RepublicCruiser />
    <Canyon mobile={mobile} />
    <Rubble mobile={mobile} />
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.075, -20]} material={materials.sand} receiveShadow>
      <planeGeometry args={[240, 300]} />
    </mesh>
    <Building position={[-17, 0, 1]} rotation={0.3} />
    <Building position={[17, 0, -17]} rotation={-0.35} variant={2} />
    <Building position={[-18, 0, -40]} rotation={0.2} />
    <Building position={[9, 0, -56]} rotation={-0.15} variant={3} />
    <Dish position={[-13, 0, -51]} />
    <MoistureVaporator position={[9.8, 0, 17]} />
    <MoistureVaporator position={[-10, 0, -15]} />
    <Cargo position={[-8, 0.6, 18]} rotation={0.15} />
    <Cargo position={[-8.4, 0.6, 20]} rotation={-0.08} />
    <Cargo position={[-8.2, 1.8, 19]} rotation={0.3} />
    <Cargo position={[8.4, 0.6, -17]} rotation={0.4} />
    <Cargo position={[-9.5, 0.6, -35]} rotation={0.1} />
    {[-1, 1].map(side => <group key={side}>
      {[19, 3, -14, -32].map(z => <group key={z} position={[side * 10.8, 0, z]}>
        <Pipe position={[0, 1.8, 0]} size={[0.09, 3.6, 0.09]} />
        <Panel position={[0, 3.6, 0]} size={[0.5, 0.14, 0.3]} material={materials.dark} />
        <Panel position={[0, 3.55, 0.08]} size={[0.38, 0.04, 0.25]} material={materials.amber} />
      </group>)}
      <Pipe position={[side * 11.4, 0.45, -9]} size={[0.16, 64, 0.16]} rotation={[Math.PI / 2, 0, 0]} />
    </group>)}
  </group>;
});
