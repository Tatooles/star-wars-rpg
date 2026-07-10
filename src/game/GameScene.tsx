import { Canvas } from "@react-three/fiber";
import { Physics, RapierRigidBody } from "@react-three/rapier";
import { MutableRefObject, useRef } from "react";
import * as THREE from "three";
import { CameraRig } from "./CameraRig";
import { Outpost } from "./Outpost";
import { Player } from "./Player";
import { useControls } from "./useControls";

type GameSceneProps = {
  playing: boolean;
};

export function GameScene({ playing }: GameSceneProps) {
  const playerRef = useRef<RapierRigidBody>(null);
  const yawRef = useRef(Math.PI) as MutableRefObject<number>;
  const controls = useControls(playing);

  return (
    <Canvas
      shadows
      camera={{ fov: 54, near: 0.08, far: 180, position: [2.4, 4.5, 25] }}
      dpr={[1, 1.7]}
      gl={{ antialias: true, powerPreference: "high-performance" }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.08;
      }}
    >
      <color attach="background" args={["#141719"]} />
      <fog attach="fog" args={["#292723", 30, 100]} />
      <hemisphereLight args={["#9eb7c8", "#3b251a", 1.8]} />
      <directionalLight
        castShadow
        color="#ffe2bd"
        intensity={3.2}
        position={[14, 24, 10]}
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-34}
        shadow-camera-right={34}
        shadow-camera-top={34}
        shadow-camera-bottom={-34}
      />
      <pointLight color="#ef713c" intensity={22} distance={48} position={[-16, 4, -44]} />
      <Physics paused={!playing} gravity={[0, -20, 0]} timeStep="vary">
        <Outpost />
        <Player bodyRef={playerRef} cameraYaw={yawRef} controls={controls} />
      </Physics>
      <CameraRig playerRef={playerRef} yawRef={yawRef} enabled={playing} />
    </Canvas>
  );
}
