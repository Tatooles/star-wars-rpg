import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";

// Desktop-only, subtle optical glow. Touch devices use the direct renderer.
export function CinematicEffects() {
  const { gl, scene, camera, size } = useThree();
  const composer = useRef<EffectComposer | null>(null);
  useEffect(() => {
    const pipeline = new EffectComposer(gl);
    const render = new RenderPass(scene, camera);
    const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.28, 0.55, 1.05);
    const output = new OutputPass();
    pipeline.addPass(render);
    pipeline.addPass(bloom);
    pipeline.addPass(output);
    composer.current = pipeline;
    return () => {
      composer.current = null;
      bloom.dispose();
      output.dispose();
      pipeline.dispose();
    };
  }, [gl, scene, camera]);
  useEffect(() => {
    // Bound the full-screen buffers independently of the screen's native DPR.
    composer.current?.setPixelRatio(Math.min(gl.getPixelRatio(), 1.5));
    composer.current?.setSize(size.width, size.height);
  }, [gl, scene, camera, size]);
  useFrame((_, delta) => {
    if (composer.current) composer.current.render(delta);
    else gl.render(scene, camera);
  }, 1);
  return null;
}
