export type InputMode = "desktop" | "touch";

type DeviceCapabilities = {
  coarsePointer: boolean;
  maxTouchPoints: number;
};

export function resolveInitialInputMode({
  coarsePointer,
  maxTouchPoints,
}: DeviceCapabilities): InputMode {
  return coarsePointer && maxTouchPoints > 0 ? "touch" : "desktop";
}

export function resolveInputModeAfterPointer(
  current: InputMode,
  pointerType: string,
): InputMode {
  if (pointerType === "touch") return "touch";
  if (pointerType === "mouse") return "desktop";
  return current;
}

export function isPortraitViewport(width: number, height: number) {
  return height > width;
}

export function detectWebGlSupport() {
  try {
    const canvas = document.createElement("canvas");
    return Boolean(canvas.getContext("webgl2"));
  } catch {
    return false;
  }
}
