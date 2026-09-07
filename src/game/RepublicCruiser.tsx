import * as THREE from "three";
import { Panel, Pipe } from "./ModelParts";
import { materials } from "./visualAssets";

const outline = new THREE.Shape();
outline.moveTo(0, -22);
outline.lineTo(-8.5, 8);
outline.lineTo(-4, 6);
outline.lineTo(4, 6);
outline.lineTo(8.5, 8);
outline.closePath();
const hull = new THREE.ExtrudeGeometry(outline, { depth: 1.1, bevelEnabled: true, bevelSize: 0.28, bevelThickness: 0.3, bevelSegments: 1, steps: 1 });

export function RepublicCruiser() {
  return <group position={[7, 24, -91]} rotation={[0, -0.55, -0.04]} scale={0.85}>
    <mesh geometry={hull} rotation={[Math.PI / 2, 0, 0]} material={materials.hull} />
    <Panel position={[0, 0.3, -4]} size={[1.6, 0.13, 27]} material={materials.ochre} />
    <Panel position={[0, 0.5, 3.5]} size={[5, 1, 5]} material={materials.steel} />
    {[-1, 1].map(side => <group key={side}>
      <Panel position={[side * 2, 1.7, 3.7]} size={[0.7, 2.2, 1.2]} material={materials.hull} />
      <Panel position={[side * 2, 2.8, 3.4]} size={[1.8, 0.7, 2.2]} material={materials.hull} />
      <Panel position={[side * 2, 2.85, 4.55]} size={[1.45, 0.16, 0.02]} material={materials.dark} />
      <Pipe position={[side * 3, -0.5, 7]} size={[0.85, 2.6, 0.85]} rotation={[Math.PI / 2, 0, 0]} material={materials.steel} />
      <Pipe position={[side * 3, -0.5, 8.32]} size={[0.64, 0.03, 0.64]} rotation={[Math.PI / 2, 0, 0]} material={materials.blue} />
      {[0, 1, 2, 3].map(i => <Panel key={i} position={[side * (2 + i * 1.05), 0.15, i * 2 - 3]} size={[0.55, 0.3, 1.8]} material={materials.steel} />)}
    </group>)}
  </group>;
}
