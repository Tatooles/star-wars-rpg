import { useFrame } from "@react-three/fiber";
import { type RefObject, useRef } from "react";
import * as THREE from "three";
import { Panel, Pipe } from "./ModelParts";
import { materials, sphere } from "./visualAssets";

function Joint({ position, radius = 0.1 }: { position: [number, number, number]; radius?: number }) {
  return <mesh geometry={sphere} material={materials.dark} position={position} scale={radius} castShadow />;
}

export function BattleDroidModel({ walking }: { walking: RefObject<boolean> }) {
  const left = useRef<THREE.Group>(null);
  const right = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    const stride = walking.current ? Math.sin(clock.elapsedTime * 9) * 0.25 : 0;
    if (left.current) left.current.rotation.x = stride;
    if (right.current) right.current.rotation.x = -stride;
  });
  return <group>
    <Pipe position={[0, 1.13, 0]} size={[0.065, 0.4, 0.065]} material={materials.dark} />
    <group position={[0, 1.45, 0.02]} rotation={[0.16, 0, 0]}>
      <Panel size={[0.26, 0.34, 0.44]} material={materials.droid} />
      <Panel position={[0, -0.1, 0.3]} size={[0.21, 0.18, 0.48]} material={materials.droid} rotation={[0.2, 0, 0]} />
      {[-1, 1].map(side => <Panel key={side} position={[side * 0.134, 0.015, 0.15]} size={[0.025, 0.065, 0.14]} material={materials.dark} />)}
      <Panel position={[0, -0.18, 0.46]} size={[0.11, 0.05, 0.12]} material={materials.dark} />
    </group>
    <Panel position={[0, 0.77, 0]} size={[0.4, 0.56, 0.28]} material={materials.droid} />
    <Panel position={[0, 0.87, 0.16]} size={[0.3, 0.23, 0.09]} material={materials.droid} />
    <Pipe position={[0, 0.34, 0]} size={[0.075, 0.36, 0.075]} material={materials.dark} />
    <Panel position={[0, 0.17, 0]} size={[0.35, 0.16, 0.24]} material={materials.droid} />
    <Panel position={[0, 0.82, -0.28]} size={[0.33, 0.57, 0.21]} material={materials.droid} />
    <Pipe position={[0.11, 1.28, -0.3]} size={[0.015, 0.75, 0.015]} material={materials.dark} />
    {[-1, 1].map(side => <group key={side}>
      <Joint position={[side * 0.3, 1.0, 0]} radius={0.11} />
      <group position={[side * 0.3, 0.94, 0]} rotation={[-0.35, 0, side * 0.12]}>
        <Pipe position={[0, -0.2, 0]} size={[0.063, 0.4, 0.065]} material={materials.droid} />
        <Joint position={[0, -0.43, 0]} radius={0.075} />
        <group position={[0, -0.43, 0]} rotation={[-1.05, 0, 0]}>
          <Pipe position={[0, -0.21, 0]} size={[0.053, 0.42, 0.055]} material={materials.droid} />
          <Joint position={[0, -0.45, 0]} radius={0.07} />
        </group>
      </group>
      <group ref={side === -1 ? left : right} position={[side * 0.14, 0.1, 0]}>
        <Joint position={[0, 0, 0]} />
        <Panel position={[0, -0.25, 0]} size={[0.105, 0.42, 0.13]} material={materials.droid} />
        <Joint position={[0, -0.5, 0]} radius={0.085} />
        <Pipe position={[0, -0.73, 0.015]} size={[0.047, 0.43, 0.05]} material={materials.dark} />
        <Panel position={[0, -0.71, 0.07]} size={[0.105, 0.38, 0.085]} material={materials.droid} />
        <Panel position={[0, -0.98, 0.12]} size={[0.18, 0.1, 0.38]} material={materials.droid} />
      </group>
    </group>)}
    <group position={[0.33, 0.65, 0.55]}>
      <Panel size={[0.13, 0.18, 0.45]} material={materials.dark} />
      <Pipe position={[0, 0.025, 0.4]} size={[0.045, 0.45, 0.045]} rotation={[Math.PI / 2, 0, 0]} material={materials.dark} />
      <Pipe position={[0, 0.025, 0.63]} size={[0.067, 0.09, 0.067]} rotation={[Math.PI / 2, 0, 0]} />
      <Panel position={[0, -0.17, -0.07]} size={[0.07, 0.24, 0.11]} rotation={[0.3, 0, 0]} material={materials.dark} />
    </group>
  </group>;
}

export function SuperBattleDroidModel() {
  return <group>
    <mesh geometry={sphere} position={[0, 1.3, 0]} scale={[0.67, 0.78, 0.39]} material={materials.armor} castShadow />
    <Panel position={[0, 1.37, 0.29]} size={[0.92, 0.77, 0.28]} material={materials.armor} rotation={[-0.12, 0, 0]} />
    <Panel position={[0, 1.93, 0.12]} size={[0.35, 0.22, 0.34]} material={materials.armor} />
    <Panel position={[0, 1.9, 0.31]} size={[0.22, 0.045, 0.035]} material={materials.dark} />
    <Panel position={[-0.29, 1.59, 0.46]} size={[0.12, 0.055, 0.025]} material={materials.red} />
    <Pipe position={[0, 0.49, 0]} size={[0.23, 0.4, 0.21]} material={materials.dark} />
    <Panel position={[0, 0.29, 0]} size={[0.64, 0.28, 0.38]} material={materials.armor} />
    {[-1, 1].map(side => <group key={side}>
      <Joint position={[side * 0.68, 1.55, 0]} radius={0.21} />
      <Panel position={[side * 0.74, 1.37, 0]} size={[0.33, 0.55, 0.48]} material={materials.armor} />
      <Joint position={[side * 0.76, 1.01, 0.08]} radius={0.16} />
      <Panel position={[side * 0.76, 0.92, 0.33]} size={[0.29, 0.31, 0.76]} rotation={[-0.15, 0, 0]} material={materials.armor} />
      <Joint position={[side * 0.28, 0.18, 0]} radius={0.17} />
      <Panel position={[side * 0.29, -0.17, 0]} size={[0.3, 0.57, 0.34]} material={materials.armor} />
      <Joint position={[side * 0.29, -0.53, 0.06]} radius={0.15} />
      <Panel position={[side * 0.29, -0.87, 0]} size={[0.23, 0.58, 0.26]} material={materials.armor} />
      <Panel position={[side * 0.29, -1.29, 0.16]} size={[0.36, 0.2, 0.58]} material={materials.dark} />
    </group>)}
    {[0.64, 0.83].map(x => <Pipe key={x} position={[x, 0.94, 0.77]} size={[0.055, 0.32, 0.055]} rotation={[Math.PI / 2, 0, 0]} material={materials.dark} />)}
  </group>;
}
