import * as THREE from "three";
import { mergeVertices } from "three/addons/utils/BufferGeometryUtils.js";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";

// Small, deterministic PBR textures shared by the whole scene. No network assets.
function surface(kind: "sand" | "stone" | "metal" | "cloth") {
  const size = 256;
  const color = new Uint8Array(size * size * 4);
  const relief = new Uint8Array(size * size * 4);
  let seed = 731;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      seed = (seed * 16807) % 2147483647;
      const grain = seed / 2147483647;
      const u = x / size * Math.PI * 2;
      const v = y / size * Math.PI * 2;
      const broad = Math.sin(u * 3 + Math.sin(v * 2)) * Math.cos(v * 4 + Math.sin(u));
      let value = 0.8;
      if (kind === "sand") value += broad * 0.075 + Math.sin(v * 22 + Math.sin(u * 3) * 2) * 0.035 + (grain - 0.5) * 0.18;
      if (kind === "stone") value += broad * 0.12 + Math.sin(v * 36 + Math.sin(u * 2) * 2) * 0.07 + (grain - 0.5) * 0.19;
      if (kind === "metal") {
        const seam = x < 3 || y < 3 || (x > 126 && x < 130);
        const scratch = grain > 0.975 ? -0.22 : 0;
        value = seam ? 0.3 : 0.8 + broad * 0.055 + (grain - 0.5) * 0.09 + scratch;
      }
      if (kind === "cloth") value += Math.sin(u * 64) * Math.sin(v * 64) * 0.1 + (grain - 0.5) * 0.08;
      const index = (y * size + x) * 4;
      for (let c = 0; c < 3; c++) {
        color[index + c] = Math.min(255, value * 255);
        relief[index + c] = Math.min(255, value * 255);
      }
      color[index + 3] = relief[index + 3] = 255;
    }
  }
  const map = new THREE.DataTexture(color, size, size);
  const bumpMap = new THREE.DataTexture(relief, size, size);
  for (const texture of [map, bumpMap]) {
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.magFilter = THREE.LinearFilter;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.generateMipmaps = true;
    texture.anisotropy = 4;
    texture.needsUpdate = true;
  }
  map.colorSpace = THREE.SRGBColorSpace;
  return { map, bumpMap };
}

const sand = surface("sand");
sand.map.repeat.set(24, 70);
sand.bumpMap.repeat.copy(sand.map.repeat);
const stone = surface("stone");
const metal = surface("metal");
const cloth = surface("cloth");

export const materials = {
  sand: new THREE.MeshStandardMaterial({ ...sand, color: "#d8bd94", roughness: 1, bumpScale: 0.12 }),
  rock: new THREE.MeshStandardMaterial({ ...stone, color: "#b99c80", roughness: 0.98, bumpScale: 0.18 }),
  distantRock: new THREE.MeshStandardMaterial({ color: "#997965", roughness: 1 }),
  hull: new THREE.MeshStandardMaterial({ ...metal, color: "#d2cbb6", roughness: 0.73, metalness: 0.18, bumpScale: 0.025 }),
  steel: new THREE.MeshStandardMaterial({ ...metal, color: "#8c9a9b", roughness: 0.55, metalness: 0.5, bumpScale: 0.035 }),
  dark: new THREE.MeshStandardMaterial({ color: "#222b2d", roughness: 0.67, metalness: 0.5 }),
  trim: new THREE.MeshStandardMaterial({ color: "#b9b6a5", roughness: 0.42, metalness: 0.7 }),
  ochre: new THREE.MeshStandardMaterial({ ...metal, color: "#935536", roughness: 0.84, metalness: 0.2, bumpScale: 0.025 }),
  droid: new THREE.MeshStandardMaterial({ ...metal, color: "#c7b08a", roughness: 0.58, metalness: 0.4, bumpScale: 0.015 }),
  armor: new THREE.MeshStandardMaterial({ ...metal, color: "#52656e", roughness: 0.38, metalness: 0.75, bumpScale: 0.018 }),
  robe: new THREE.MeshStandardMaterial({ ...cloth, color: "#302d2b", roughness: 1, bumpScale: 0.015, side: THREE.DoubleSide }),
  leather: new THREE.MeshStandardMaterial({ ...cloth, color: "#382921", roughness: 0.64, bumpScale: 0.008, side: THREE.DoubleSide }),
  blue: new THREE.MeshBasicMaterial({ color: new THREE.Color("#76c9ed").multiplyScalar(2), toneMapped: false }),
  amber: new THREE.MeshBasicMaterial({ color: "#ffe0a1", toneMapped: false }),
  red: new THREE.MeshBasicMaterial({ color: "#ff5138", toneMapped: false }),
};

export const roundedBox = new RoundedBoxGeometry(1, 1, 1, 2, 0.08);
export const cylinder = new THREE.CylinderGeometry(1, 1, 1, 16);
export const sphere = new THREE.SphereGeometry(1, 16, 12);

// Continuous deformation keeps shared vertices together and removes primitive silhouettes.
export const canyonRock = (() => {
  const geometry = new THREE.IcosahedronGeometry(1, 5);
  const positions = geometry.attributes.position;
  const point = new THREE.Vector3();
  for (let i = 0; i < positions.count; i++) {
    point.fromBufferAttribute(positions, i);
    const shape = 1 + Math.sin(point.x * 9 + point.y * 5) * 0.1
      + Math.sin(point.z * 13 - point.y * 8) * 0.055;
    point.multiplyScalar(shape);
    point.x *= 1 + Math.sin(point.y * 18) * 0.045;
    positions.setXYZ(i, point.x, point.y, point.z);
  }
  // Weld before recalculating normals: the source polyhedron is non-indexed.
  geometry.deleteAttribute("normal");
  const smooth = mergeVertices(geometry);
  smooth.computeVertexNormals();
  geometry.dispose();
  return smooth;
})();
