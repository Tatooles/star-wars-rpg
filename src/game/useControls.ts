import { useEffect, useRef } from "react";

export type Controls = {
  forward: boolean;
  backward: boolean;
  left: boolean;
  right: boolean;
  jump: boolean;
  dodge: boolean;
  attack: boolean;
  block: boolean;
  lock: boolean;
  interact: boolean;
};

const initialControls: Controls = {
  forward: false,
  backward: false,
  left: false,
  right: false,
  jump: false,
  dodge: false,
  attack: false,
  block: false,
  lock: false,
  interact: false,
};

const keyMap: Record<string, keyof Controls | undefined> = {
  KeyW: "forward",
  KeyS: "backward",
  KeyA: "left",
  KeyD: "right",
  Space: "jump",
  ShiftLeft: "dodge",
  ShiftRight: "dodge",
  KeyQ: "lock",
  KeyE: "interact",
};

export function useControls(enabled: boolean) {
  const controls = useRef<Controls>({ ...initialControls });

  useEffect(() => {
    const reset = () => Object.assign(controls.current, initialControls);
    const onKey = (pressed: boolean) => (event: KeyboardEvent) => {
      const action = keyMap[event.code];
      if (!action || !enabled) return;
      if (action === "jump" || action === "dodge") event.preventDefault();
      controls.current[action] = pressed;
    };
    const onMouse = (pressed: boolean) => (event: MouseEvent) => {
      if (!enabled) return;
      if (event.button === 0) controls.current.attack = pressed;
      if (event.button === 2) controls.current.block = pressed;
    };
    const onContextMenu = (event: MouseEvent) => event.preventDefault();

    const keyDown = onKey(true);
    const keyUp = onKey(false);
    const mouseDown = onMouse(true);
    const mouseUp = onMouse(false);
    window.addEventListener("keydown", keyDown);
    window.addEventListener("keyup", keyUp);
    window.addEventListener("mousedown", mouseDown);
    window.addEventListener("mouseup", mouseUp);
    window.addEventListener("contextmenu", onContextMenu);
    window.addEventListener("blur", reset);
    return () => {
      window.removeEventListener("keydown", keyDown);
      window.removeEventListener("keyup", keyUp);
      window.removeEventListener("mousedown", mouseDown);
      window.removeEventListener("mouseup", mouseUp);
      window.removeEventListener("contextmenu", onContextMenu);
      window.removeEventListener("blur", reset);
      reset();
    };
  }, [enabled]);

  return controls;
}
