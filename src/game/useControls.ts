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
    const releaseHeldControls = () => {
      controls.current.forward = false;
      controls.current.backward = false;
      controls.current.left = false;
      controls.current.right = false;
      controls.current.jump = false;
      controls.current.dodge = false;
      controls.current.attack = false;
      controls.current.block = false;
      controls.current.lock = false;
      controls.current.interact = false;
    };
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
    window.addEventListener("blur", releaseHeldControls);
    return () => {
      window.removeEventListener("keydown", keyDown);
      window.removeEventListener("keyup", keyUp);
      window.removeEventListener("mousedown", mouseDown);
      window.removeEventListener("mouseup", mouseUp);
      window.removeEventListener("contextmenu", onContextMenu);
      window.removeEventListener("blur", releaseHeldControls);
      releaseTimers.forEach((timer) => window.clearTimeout(timer));
      releaseHeldControls();
    };
  }, [enabled]);

  return controls;
}
