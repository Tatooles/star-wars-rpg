import { useGLTF } from "@react-three/drei";
import { useEffect } from "react";
import { GAME_ASSET_PATHS } from "./assetManifest";

type AssetPreloaderProps = { onReady: () => void };

export function AssetPreloader({ onReady }: AssetPreloaderProps) {
  useGLTF([...GAME_ASSET_PATHS]);
  useEffect(onReady, [onReady]);
  return null;
}
