import { useLoader, useThree } from "@react-three/fiber";
import { useLayoutEffect, useEffect } from "react";
import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { materials } from "./visualAssets";

const paths = [
  "/textures/sand_01_diff_1k.jpg", "/textures/sand_01_nor_gl_1k.jpg",
  "/textures/rock_boulder_dry_diff_1k.jpg", "/textures/rock_boulder_dry_nor_gl_1k.jpg",
  "/textures/metal_plate_diff_1k.jpg", "/textures/metal_plate_nor_gl_1k.jpg",
];

export function SurfaceAssets() {
  const textures = useLoader(THREE.TextureLoader, paths);
  const { gl, scene } = useThree();
  useLayoutEffect(() => {
    textures.forEach((texture, i) => {
      texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
      texture.colorSpace = i % 2 === 0 ? THREE.SRGBColorSpace : THREE.NoColorSpace;
      texture.anisotropy = Math.min(8, gl.capabilities.getMaxAnisotropy());
      texture.repeat.set(i < 2 ? 6 : 2, i < 2 ? 19 : 2);
      texture.needsUpdate = true;
    });
    const [sandColor, sandNormal, rockColor, rockNormal, metalColor, metalNormal] = textures;
    for (const [material, map, normalMap, strength] of [
      [materials.sand, sandColor, sandNormal, 0.65],
      [materials.rock, rockColor, rockNormal, 1.1],
      [materials.steel, metalColor, metalNormal, 0.3],
    ] as const) {
      material.map = map;
      material.bumpMap = null;
      material.normalMap = normalMap;
      material.normalScale.setScalar(strength);
      material.needsUpdate = true;
    }
  }, [textures, gl]);
  useEffect(() => {
    const room = new RoomEnvironment();
    const generator = new THREE.PMREMGenerator(gl);
    const environment = generator.fromScene(room, 0.04);
    Object.assign(scene, { environment: environment.texture, environmentIntensity: 0.65 });
    room.dispose();
    generator.dispose();
    return () => {
      Object.assign(scene, { environment: null });
      environment.dispose();
    };
  }, [gl, scene]);
  return null;
}
