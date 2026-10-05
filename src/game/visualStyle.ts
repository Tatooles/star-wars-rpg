export type LookId = "legacy" | "clone-wars" | "cel" | "atmospheric";

type Vec3 = [number, number, number];

export type Look = {
  id: LookId;
  label: string;
  /** Cel-shading bands (0..1 light levels) and rim light; null keeps PBR materials. */
  toon: { bands: number[]; rimColor: string; rimStrength: number; rimWidth: number } | null;
  /** Screen-space ink lines from depth discontinuities. */
  outline: { color: string; thickness: number; strength: number; fadeStart: number; fadeEnd: number } | null;
  /** Gradient sky dome; null keeps the original dark sphere. */
  sky: { zenith: string; horizon: string; ground: string; sun: string; sunDirection: Vec3 } | null;
  background: string;
  fog: { color: string; near: number; far: number };
  hemisphere: { sky: string; ground: string; intensity: number };
  sun: { color: string; intensity: number; position: Vec3 };
  /** Original material hex -> restyled hex. */
  palette: Record<string, string>;
  /** Multiplier for emissive "glow" materials so they exceed the bloom threshold. */
  glowBoost: number;
  bloom: { intensity: number; threshold: number; smoothing: number } | null;
  ambientOcclusion: boolean;
  /** Use the sky as an environment map for reflections (PBR looks only). */
  environment: boolean;
  grade: { saturation: number; contrast: number; brightness: number; vignette: number } | null;
  softShadows: boolean;
  shadow: { bias: number; normalBias: number; radius: number };
  camera: { distance: number; height: number; fov: number };
};

const LEGACY: Look = {
  id: "legacy",
  label: "Current",
  toon: null,
  outline: null,
  sky: null,
  background: "#141719",
  fog: { color: "#292723", near: 30, far: 100 },
  hemisphere: { sky: "#9eb7c8", ground: "#3b251a", intensity: 1.8 },
  sun: { color: "#ffe2bd", intensity: 3.2, position: [14, 24, 10] },
  palette: {},
  glowBoost: 1,
  bloom: null,
  ambientOcclusion: false,
  environment: false,
  grade: null,
  softShadows: false,
  shadow: { bias: 0, normalBias: 0, radius: 1 },
  camera: { distance: 7.2, height: 1.1, fov: 54 },
};

// Warm desert dusk shared by the restyled looks.
const DESERT_PALETTE: Record<string, string> = {
  "#312c29": "#9a6b47", // ground
  "#50443a": "#b88a5e", // path
  "#4b4038": "#8a5a3c", // rocks
  "#303b40": "#55636b", // outpost metal
  "#263138": "#3c4a52", // beacon body
  "#44535a": "#6c7e86", // beacon trim
  "#b7a27b": "#d9be86", // B1 tan
  "#35424b": "#4a6070", // B2 armor
};

export const LOOKS: Record<LookId, Look> = {
  legacy: LEGACY,
  "clone-wars": {
    id: "clone-wars",
    label: "Clone Wars painterly",
    toon: { bands: [0.42, 0.62, 0.84, 1], rimColor: "#ffd6a0", rimStrength: 0.55, rimWidth: 0.28 },
    outline: { color: "#1b0f0a", thickness: 1.5, strength: 0.9, fadeStart: 22, fadeEnd: 60 },
    sky: {
      zenith: "#2a3f6b",
      horizon: "#f0a067",
      ground: "#5b3a2a",
      sun: "#ffd9a0",
      sunDirection: [-0.62, 0.22, -0.75],
    },
    background: "#2a3f6b",
    fog: { color: "#cf9a80", near: 36, far: 125 },
    hemisphere: { sky: "#86a8e6", ground: "#6a4030", intensity: 1.3 },
    sun: { color: "#ffcf9a", intensity: 3.7, position: [-26, 15, -20] },
    palette: DESERT_PALETTE,
    glowBoost: 3.2,
    bloom: { intensity: 1.1, threshold: 1, smoothing: 0.2 },
    ambientOcclusion: false,
    environment: false,
    grade: { saturation: 0.15, contrast: 0.14, brightness: 0, vignette: 0.45 },
    softShadows: true,
    shadow: { bias: -0.0004, normalBias: 0.045, radius: 3 },
    camera: { distance: 5.6, height: 0.9, fov: 50 },
  },
  cel: {
    id: "cel",
    label: "Bold cel",
    toon: { bands: [0.5, 1], rimColor: "#ffffff", rimStrength: 0.35, rimWidth: 0.22 },
    outline: { color: "#0d0a0a", thickness: 1.8, strength: 1, fadeStart: 26, fadeEnd: 70 },
    sky: {
      zenith: "#3f86d6",
      horizon: "#cfe6f2",
      ground: "#a77c55",
      sun: "#fff6dc",
      sunDirection: [0.45, 0.72, 0.53],
    },
    background: "#3f86d6",
    fog: { color: "#cfe0e6", near: 40, far: 130 },
    hemisphere: { sky: "#d6e8ff", ground: "#9a7450", intensity: 1.6 },
    sun: { color: "#fff3df", intensity: 3, position: [18, 30, 14] },
    palette: {
      ...DESERT_PALETTE,
      "#312c29": "#c9985f",
      "#50443a": "#e0b780",
      "#4b4038": "#b0764a",
    },
    glowBoost: 2.6,
    bloom: { intensity: 0.8, threshold: 1, smoothing: 0.2 },
    ambientOcclusion: false,
    environment: false,
    grade: { saturation: 0.22, contrast: 0.06, brightness: 0.02, vignette: 0.25 },
    softShadows: true,
    shadow: { bias: -0.0004, normalBias: 0.045, radius: 3 },
    camera: { distance: 5.6, height: 0.9, fov: 50 },
  },
  atmospheric: {
    id: "atmospheric",
    label: "Atmospheric PBR",
    toon: null,
    outline: null,
    sky: {
      zenith: "#1f2c48",
      horizon: "#e48a52",
      ground: "#3a2519",
      sun: "#ffc07a",
      sunDirection: [-0.66, 0.16, -0.73],
    },
    background: "#1f2c48",
    fog: { color: "#b8714a", near: 18, far: 95 },
    hemisphere: { sky: "#8ea4c8", ground: "#5a3a26", intensity: 0.9 },
    sun: { color: "#ffb36e", intensity: 4.4, position: [-28, 11, -22] },
    palette: DESERT_PALETTE,
    glowBoost: 3.4,
    bloom: { intensity: 1.3, threshold: 1, smoothing: 0.25 },
    ambientOcclusion: true,
    environment: true,
    grade: { saturation: 0.08, contrast: 0.12, brightness: -0.02, vignette: 0.55 },
    softShadows: true,
    shadow: { bias: -0.0004, normalBias: 0.045, radius: 3 },
    camera: { distance: 5.6, height: 0.9, fov: 50 },
  },
};

export function resolveLook(search: string): Look {
  const requested = new URLSearchParams(search).get("look");
  return requested && requested in LOOKS ? LOOKS[requested as LookId] : LEGACY;
}
