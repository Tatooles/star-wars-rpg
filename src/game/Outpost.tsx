import { CuboidCollider, RigidBody } from "@react-three/rapier";
import * as THREE from "three";
import { RAISED_PLATFORM } from "./outpostGround";

import { canyonRock, materials, roundedBox } from "./visualAssets";
import { Panel, Pipe } from "./ModelParts";
import { Scenery } from "./Scenery";

const rockMaterial = materials.rock;
const groundMaterial = materials.sand;
const metalMaterial = materials.steel;
const pathMaterial = materials.hull;
const signalMaterial = materials.red;

type ObstacleProps = {
  position: [number, number, number];
  size: [number, number, number];
  rotation?: [number, number, number];
  material?: THREE.Material;
};

function Obstacle({ position, size, rotation = [0, 0, 0], material = rockMaterial }: ObstacleProps) {
  return (
    <RigidBody type="fixed" colliders="cuboid" position={position} rotation={rotation}>
      <mesh
        material={material}
        scale={material === rockMaterial ? [size[0] / 2, size[1] / 2, size[2] / 2] : size}
        castShadow
        receiveShadow
        userData={{ cameraObstacle: true }}
      >
        {material === rockMaterial ? (
          <primitive object={canyonRock} attach="geometry" />
        ) : (
          <primitive object={roundedBox} attach="geometry" />
        )}
      </mesh>
    </RigidBody>
  );
}

export function Outpost({ mobile }: { mobile: boolean }) {
  return (
    <group>
      <Scenery mobile={mobile} />
      <RigidBody type="fixed" colliders="cuboid" position={[0, -0.55, -10]}>
        <mesh material={groundMaterial} receiveShadow userData={{ cameraObstacle: true }}>
          <boxGeometry args={[24, 1, 78]} />
        </mesh>
      </RigidBody>
      {Array.from({ length: 23 }, (_, index) => (
        <mesh
          key={index}
          material={index % 5 === 0 ? materials.steel : pathMaterial}
          position={[0, 0.015, 24 - index * 3.1]}
          rotation={[0, index % 2 === 0 ? 0.015 : -0.015, 0]}
          receiveShadow
        >
          <boxGeometry args={[3.8, 0.05, 2.8]} />
        </mesh>
      ))}
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[0.7, 4, 39]} position={[-12.3, 3, -10]} />
        <CuboidCollider args={[0.7, 4, 39]} position={[12.3, 3, -10]} />
        <CuboidCollider args={[12, 4, 0.7]} position={[0, 3, 29]} />
        <CuboidCollider args={[12, 4, 0.7]} position={[0, 3, -49]} />
      </RigidBody>

      <Obstacle position={[-8.6, 1.4, 14]} size={[5.2, 3.8, 4]} rotation={[0.12, 0.42, 0.05]} />
      <Obstacle position={[9, 1.1, 10]} size={[4.3, 3.1, 6.2]} rotation={[-0.08, -0.25, 0.08]} />
      <Obstacle position={[-9.4, 1.8, -4]} size={[3.4, 5.1, 7]} rotation={[0.03, -0.32, -0.05]} />
      <Obstacle position={[9.5, 1.2, -10]} size={[4.1, 3.4, 5]} rotation={[0.08, 0.2, 0.12]} />
      <Obstacle position={[-8.8, 1.2, -24]} size={[4.5, 3.4, 7]} rotation={[0.08, 0.3, -0.04]} />
      <Obstacle position={[9.6, 1.5, -30]} size={[3.8, 4.2, 6]} rotation={[0, -0.3, 0.06]} />

      <Obstacle position={[-5.7, 1.8, -5]} size={[1.1, 4.6, 8]} material={metalMaterial} />
      <Obstacle position={[5.7, 1.8, -5]} size={[1.1, 4.6, 8]} material={metalMaterial} />
      {[-5, -27].map(z => (
        <group key={z} position={[0, 0, z]}>
          {[-1, 1].map(side => <group key={side}>
            <Panel position={[side * 5.7, 2.5, 0]} size={[1.25, 5, 1.35]} material={materials.hull} />
            <Panel position={[side * 5.7, 1, 0.8]} size={[1.4, 0.25, 0.35]} material={materials.ochre} />
            <Panel position={[side * 5.7, 3.4, 0.71]} size={[0.3, 1.25, 0.08]} material={materials.amber} />
          </group>)}
          <Panel position={[0, 5.25, 0]} size={[12.6, 0.9, 1.5]} material={materials.steel} />
          <Panel position={[0, 5.25, 0.8]} size={[4.8, 0.5, 0.1]} material={materials.ochre} />
          {[-1.7, -1.25, -0.8, 0.8, 1.25, 1.7].map(x => <Panel key={x} position={[x, 5.25, 0.87]} size={[0.15, 0.26, 0.03]} material={materials.trim} />)}
          <Pipe position={[0, 5.9, 0]} size={[0.1, 11, 0.1]} rotation={[0, 0, Math.PI / 2]} />
        </group>
      ))}
      {[-1, 1].map(side => <group key={`runway-${side}`}>
        {Array.from({ length: 18 }, (_, i) => <Panel key={i} position={[side * 4.25, 0.045, 23 - i * 4]} size={[0.1, 0.025, 0.55]} material={materials.amber} />)}
      </group>)}
      <mesh
        material={metalMaterial}
        position={[RAISED_PLATFORM.centerX, RAISED_PLATFORM.centerY, RAISED_PLATFORM.centerZ]}
        receiveShadow
        userData={{ cameraObstacle: true }}
      >
        <cylinderGeometry
          args={[
            RAISED_PLATFORM.topRadius,
            RAISED_PLATFORM.bottomRadius,
            RAISED_PLATFORM.height,
            64,
          ]}
        />
      </mesh>
      <RigidBody type="fixed" colliders="cuboid" position={[0, -0.45, -42]}>
        <mesh material={metalMaterial} receiveShadow userData={{ cameraObstacle: true }}>
          <boxGeometry args={[18, 0.9, 12]} />
        </mesh>
      </RigidBody>

      {[-1, 1].map((side) => (
        <group key={side} position={[side * 6.3, 2.4, -39]} userData={{ cameraObstacle: true }}>
          <mesh material={metalMaterial} castShadow userData={{ cameraObstacle: true }}>
            <cylinderGeometry args={[0.7, 1.15, 5.4, 8]} />
          </mesh>
          <mesh material={metalMaterial} position={[0, 2.5, 0]} rotation={[0, 0, side * 0.65]} castShadow>
            <boxGeometry args={[0.5, 4.2, 0.5]} />
          </mesh>
        </group>
      ))}
      {[-1, 1].map((side) => (
        <group key={`signal-${side}`} position={[side * 5.2, 1.05, -31]} userData={{ cameraObstacle: true }}>
          <mesh material={metalMaterial} castShadow>
            <boxGeometry args={[0.8, 2.1, 0.8]} />
          </mesh>
          <mesh material={signalMaterial} position={[0, 0.5, 0.42]}>
            <boxGeometry args={[0.28, 0.64, 0.08]} />
          </mesh>
          <pointLight color="#f34e2d" intensity={5} distance={5} position={[0, 0.5, 0.7]} />
        </group>
      ))}
    </group>
  );
}
