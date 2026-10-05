import { useFrame, useThree } from "@react-three/fiber";
import { Environment } from "@react-three/drei";
import {
  Bloom,
  BrightnessContrast,
  EffectComposer,
  HueSaturation,
  N8AO,
  ToneMapping,
  Vignette,
  wrapEffect,
} from "@react-three/postprocessing";
import { BlendFunction, Effect, EffectAttribute, ToneMappingMode } from "postprocessing";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import type { Look } from "./visualStyle";

// ---------------------------------------------------------------------------
// Materials: palette remap, cel shading with a rim light, HDR glow boost
// ---------------------------------------------------------------------------

const RESTYLED = "lookRestyled";

function gradientTexture(bands: number[]) {
  const data = new Uint8Array(bands.map((band) => Math.round(band * 255)));
  const texture = new THREE.DataTexture(data, bands.length, 1, THREE.RedFormat);
  texture.minFilter = THREE.NearestFilter;
  texture.magFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;
  texture.needsUpdate = true;
  return texture;
}

function remapColor(color: THREE.Color, palette: Record<string, string>) {
  const replacement = palette[`#${color.getHexString()}`];
  if (replacement) color.set(replacement);
}

function createToonMaterial(source: THREE.MeshStandardMaterial, look: Look, gradientMap: THREE.Texture) {
  const toon = look.toon!;
  const material = new THREE.MeshToonMaterial({
    color: source.color.clone(),
    map: source.map,
    vertexColors: source.vertexColors,
    emissive: source.emissive.clone(),
    emissiveIntensity: source.emissiveIntensity,
    emissiveMap: source.emissiveMap,
    transparent: source.transparent,
    opacity: source.opacity,
    side: source.side,
    alphaTest: source.alphaTest,
    depthWrite: source.depthWrite,
    gradientMap,
  });
  material.name = source.name;
  const rimColor = new THREE.Color(toon.rimColor);
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uRimColor = { value: rimColor };
    shader.uniforms.uRimStrength = { value: toon.rimStrength };
    shader.uniforms.uRimWidth = { value: toon.rimWidth };
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        "#include <common>\nuniform vec3 uRimColor;\nuniform float uRimStrength;\nuniform float uRimWidth;",
      )
      .replace(
        "#include <opaque_fragment>",
        `float rimFacing = 1.0 - saturate( dot( normal, normalize( vViewPosition ) ) );
        float rim = smoothstep( 1.0 - uRimWidth, 1.0 - uRimWidth + 0.08, rimFacing );
        outgoingLight += uRimColor * rim * uRimStrength * ( 0.3 + diffuseColor.rgb );
        #include <opaque_fragment>`,
      );
  };
  material.customProgramCacheKey = () => "toon-rim";
  return material;
}

function useRestyleMaterials(look: Look) {
  const scene = useThree((state) => state.scene);
  const gradientMap = useMemo(() => (look.toon ? gradientTexture(look.toon.bands) : null), [look]);
  const converted = useRef(new Map<THREE.Material, THREE.Material>());
  const elapsed = useRef(1);

  useFrame((_, delta) => {
    // New objects (enemies, bolts, impacts) appear during play; sweep a few times a second.
    elapsed.current += delta;
    if (elapsed.current < 0.25) return;
    elapsed.current = 0;
    scene.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      const next = materials.map((material: THREE.Material) => {
        if (material.userData[RESTYLED]) return material;
        const cached = converted.current.get(material);
        if (cached) return cached;
        let result: THREE.Material = material;
        if (material instanceof THREE.MeshStandardMaterial) {
          remapColor(material.color, look.palette);
          result = gradientMap ? createToonMaterial(material, look, gradientMap) : material;
        } else if (material instanceof THREE.MeshBasicMaterial && material.userData.glow) {
          // Boost in the shader so color changes (e.g. reflected bolts) keep their glow.
          material.onBeforeCompile = (shader) => {
            shader.uniforms.uGlowBoost = { value: look.glowBoost };
            shader.fragmentShader = shader.fragmentShader
              .replace("#include <common>", "#include <common>\nuniform float uGlowBoost;")
              .replace("#include <opaque_fragment>", "outgoingLight *= uGlowBoost;\n#include <opaque_fragment>");
          };
          material.customProgramCacheKey = () => "glow-boost";
          material.needsUpdate = true;
        }
        result.userData[RESTYLED] = true;
        converted.current.set(material, result);
        return result;
      });
      object.material = Array.isArray(object.material) ? next : next[0];
    });
  });
}

// ---------------------------------------------------------------------------
// Sky
// ---------------------------------------------------------------------------

const skyVertex = /* glsl */ `
varying vec3 vDirection;
void main() {
  vDirection = normalize(position);
  vec4 world = modelMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * viewMatrix * world;
}`;

const skyFragment = /* glsl */ `
uniform vec3 zenith;
uniform vec3 horizon;
uniform vec3 ground;
uniform vec3 sunColor;
uniform vec3 sunDirection;
varying vec3 vDirection;
void main() {
  vec3 dir = normalize(vDirection);
  float h = dir.y;
  vec3 color = h > 0.0
    ? mix(horizon, zenith, pow(smoothstep(0.0, 1.0, h), 0.55))
    : mix(horizon, ground, smoothstep(0.0, 0.25, -h));
  float sun = max(dot(dir, normalize(sunDirection)), 0.0);
  color += sunColor * (pow(sun, 900.0) * 2.5 + pow(sun, 12.0) * 0.35 + pow(sun, 3.0) * 0.12);
  gl_FragColor = vec4(color, 1.0);
  #include <colorspace_fragment>
}`;

function SkyDome({ sky }: { sky: NonNullable<Look["sky"]> }) {
  const mesh = useRef<THREE.Mesh>(null);
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: skyVertex,
        fragmentShader: skyFragment,
        side: THREE.BackSide,
        depthWrite: false,
        fog: false,
        uniforms: {
          zenith: { value: new THREE.Color(sky.zenith) },
          horizon: { value: new THREE.Color(sky.horizon) },
          ground: { value: new THREE.Color(sky.ground) },
          sunColor: { value: new THREE.Color(sky.sun) },
          sunDirection: { value: new THREE.Vector3(...sky.sunDirection) },
        },
      }),
    [sky],
  );
  useFrame(({ camera }) => mesh.current?.position.copy(camera.position));
  return (
    <mesh ref={mesh} material={material} scale={150} renderOrder={-1} frustumCulled={false}>
      <sphereGeometry args={[1, 32, 16]} />
    </mesh>
  );
}

// ---------------------------------------------------------------------------
// Ink outlines from depth discontinuities
// ---------------------------------------------------------------------------

const outlineFragment = /* glsl */ `
uniform vec3 outlineColor;
uniform float thickness;
uniform float strength;
uniform float fadeStart;
uniform float fadeEnd;

float inverseViewDepth(const in vec2 uv) {
  return 1.0 / max(-getViewZ(readDepth(uv)), 1e-3);
}

void mainImage(const in vec4 inputColor, const in vec2 uv, const in float depth, out vec4 outputColor) {
  float centerDepth = max(-getViewZ(depth), 1e-3);
  float center = 1.0 / centerDepth;
  vec2 o = texelSize * thickness;
  // 1/z is planar in screen space, so its Laplacian ignores flat slopes and finds silhouettes.
  float lx = abs(inverseViewDepth(uv + vec2(o.x, 0.0)) + inverseViewDepth(uv - vec2(o.x, 0.0)) - 2.0 * center);
  float ly = abs(inverseViewDepth(uv + vec2(0.0, o.y)) + inverseViewDepth(uv - vec2(0.0, o.y)) - 2.0 * center);
  float edge = smoothstep(0.04, 0.16, (lx + ly) / center);
  edge *= 1.0 - smoothstep(fadeStart, fadeEnd, centerDepth);
  outputColor = vec4(mix(inputColor.rgb, outlineColor, edge * strength), inputColor.a);
}`;

class InkOutlineEffect extends Effect {
  constructor({
    color = "#000000",
    thickness = 1,
    strength = 1,
    fadeStart = 25,
    fadeEnd = 60,
  }: { color?: string; thickness?: number; strength?: number; fadeStart?: number; fadeEnd?: number } = {}) {
    super("InkOutlineEffect", outlineFragment, {
      attributes: EffectAttribute.DEPTH,
      blendFunction: BlendFunction.NORMAL,
      uniforms: new Map<string, THREE.Uniform>([
        ["outlineColor", new THREE.Uniform(new THREE.Color(color))],
        ["thickness", new THREE.Uniform(thickness)],
        ["strength", new THREE.Uniform(strength)],
        ["fadeStart", new THREE.Uniform(fadeStart)],
        ["fadeEnd", new THREE.Uniform(fadeEnd)],
      ]),
    });
  }
}

const InkOutline = wrapEffect(InkOutlineEffect);

// ---------------------------------------------------------------------------

export function LookDirector({ look, mobile }: { look: Look; mobile: boolean }) {
  useRestyleMaterials(look);
  const post = look.bloom || look.outline || look.grade || look.ambientOcclusion;
  return (
    <>
      {look.sky && <SkyDome sky={look.sky} />}
      {look.sky && look.environment && (
        <Environment resolution={64} frames={1}>
          <SkyDome sky={look.sky} />
        </Environment>
      )}
      {post && (
        <EffectComposer multisampling={mobile ? 0 : 4}>
          {look.ambientOcclusion ? <N8AO aoRadius={1.2} intensity={2.2} distanceFalloff={0.6} halfRes={mobile} /> : <></>}
          {look.outline ? (
            <InkOutline
              color={look.outline.color}
              thickness={look.outline.thickness}
              strength={look.outline.strength}
              fadeStart={look.outline.fadeStart}
              fadeEnd={look.outline.fadeEnd}
            />
          ) : <></>}
          {look.bloom ? (
            <Bloom
              mipmapBlur
              intensity={look.bloom.intensity}
              luminanceThreshold={look.bloom.threshold}
              luminanceSmoothing={look.bloom.smoothing}
            />
          ) : <></>}
          <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
          {look.grade ? <HueSaturation saturation={look.grade.saturation} /> : <></>}
          {look.grade ? (
            <BrightnessContrast brightness={look.grade.brightness} contrast={look.grade.contrast} />
          ) : <></>}
          {look.grade ? <Vignette offset={0.3} darkness={look.grade.vignette} /> : <></>}
        </EffectComposer>
      )}
    </>
  );
}
