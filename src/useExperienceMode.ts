import { useCallback, useEffect, useState } from "react";
import {
  detectWebGlSupport,
  isPortraitViewport,
  resolveInitialInputMode,
  resolveInputModeAfterPointer,
  type InputMode,
} from "./experienceMode";

export function useExperienceMode(onPortrait: () => void) {
  const [inputMode, setInputMode] = useState<InputMode>(() => {
    const developmentOverride = import.meta.env.DEV
      ? new URLSearchParams(window.location.search).get("input")
      : null;
    if (developmentOverride === "touch" || developmentOverride === "desktop") {
      return developmentOverride;
    }
    return resolveInitialInputMode({
      coarsePointer: window.matchMedia("(pointer: coarse)").matches,
      maxTouchPoints: navigator.maxTouchPoints,
    });
  });
  const [portrait, setPortrait] = useState(() => (
    isPortraitViewport(window.innerWidth, window.innerHeight)
  ));
  const [webGlSupported] = useState(detectWebGlSupport);
  const [fullscreenSupported] = useState(() => Boolean(document.fullscreenEnabled));

  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      if (import.meta.env.DEV && new URLSearchParams(window.location.search).has("input")) return;
      setInputMode((current) => resolveInputModeAfterPointer(current, event.pointerType));
    };
    window.addEventListener("pointerdown", onPointerDown, { capture: true });
    return () => window.removeEventListener("pointerdown", onPointerDown, { capture: true });
  }, []);

  useEffect(() => {
    const updateOrientation = () => {
      const nextPortrait = isPortraitViewport(window.innerWidth, window.innerHeight);
      setPortrait(nextPortrait);
      if (inputMode === "touch" && nextPortrait) onPortrait();
    };
    updateOrientation();
    window.addEventListener("resize", updateOrientation);
    window.addEventListener("orientationchange", updateOrientation);
    return () => {
      window.removeEventListener("resize", updateOrientation);
      window.removeEventListener("orientationchange", updateOrientation);
    };
  }, [inputMode, onPortrait]);

  const enterFullscreen = useCallback(() => {
    void document.documentElement.requestFullscreen?.().catch(() => undefined);
  }, []);

  return {
    enterFullscreen,
    fullscreenSupported,
    inputMode,
    portrait,
    touchMode: inputMode === "touch",
    webGlSupported,
  };
}
