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
  jumpPresses: number;
  dodgePresses: number;
  attackPresses: number;
  blockPresses: number;
  lockPresses: number;
  interactPresses: number;
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
  jumpPresses: 0,
  dodgePresses: 0,
  attackPresses: 0,
  blockPresses: 0,
  lockPresses: 0,
  interactPresses: 0,
};

type ControlAction =
  | "forward"
  | "backward"
  | "left"
  | "right"
  | "jump"
  | "dodge"
  | "lock"
  | "interact";

const keyMap: Record<string, ControlAction | undefined> = {
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
    const releaseTimers = new Map<ControlAction, number>();
    const reset = () => Object.assign(controls.current, initialControls);
    const onKey = (pressed: boolean) => (event: KeyboardEvent) => {
      const action = keyMap[event.code];
      if (!action || !enabled) return;
      if (action === "jump" || action === "dodge") event.preventDefault();
      const previousTimer = releaseTimers.get(action);
      if (previousTimer) window.clearTimeout(previousTimer);
      const movementAction = action === "forward" || action === "backward" || action === "left" || action === "right";
      if (!pressed && movementAction) {
        releaseTimers.set(
          action,
          window.setTimeout(() => {
            controls.current[action] = false;
            releaseTimers.delete(action);
          }, 72),
        );
      } else {
        controls.current[action] = pressed;
      }
      if (pressed && !event.repeat) {
        if (action === "jump") controls.current.jumpPresses += 1;
        if (action === "dodge") controls.current.dodgePresses += 1;
        if (action === "lock") controls.current.lockPresses += 1;
        if (action === "interact") controls.current.interactPresses += 1;
      }
    };
    const onMouse = (pressed: boolean) => (event: MouseEvent) => {
      if (!enabled) return;
      if (event.button === 0) {
        controls.current.attack = pressed;
        if (pressed) controls.current.attackPresses += 1;
      }
      if (event.button === 2) {
        controls.current.block = pressed;
        if (pressed) controls.current.blockPresses += 1;
      }
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
      releaseTimers.forEach((timer) => window.clearTimeout(timer));
      reset();
    };
  }, [enabled]);

  return controls;
}
