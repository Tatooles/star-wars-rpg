import * as THREE from "three";
import { cylinder, materials, roundedBox } from "./visualAssets";

export type Vec3 = [number, number, number];
type BoxProps = { position?: Vec3; size: Vec3; material?: THREE.Material; rotation?: Vec3 };

export function Panel({ position, size, material = materials.hull, rotation }: BoxProps) {
  return <mesh geometry={roundedBox} material={material} position={position} scale={size} rotation={rotation} castShadow receiveShadow />;
}

export function Pipe({ position, size, material = materials.steel, rotation }: BoxProps) {
  return <mesh geometry={cylinder} material={material} position={position} scale={size} rotation={rotation} castShadow receiveShadow />;
}

