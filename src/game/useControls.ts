import { useEffect, useRef } from "react";

export type Controls = {
  forward: boolean;
  backward: boolean;
  turnLeft: boolean;
  turnRight: boolean;
  dodge: boolean;
  attack: boolean;
  block: boolean;
  lock: boolean;
  interact: boolean;
  dodgePresses: number;
  attackPresses: number;
  lockPresses: number;
  interactPresses: number;
};

const initialControls: Controls = {
  forward: false,
  backward: false,
  turnLeft: false,
  turnRight: false,
  dodge: false,
  attack: false,
  block: false,
  lock: false,
  interact: false,
  dodgePresses: 0,
  attackPresses: 0,
  lockPresses: 0,
  interactPresses: 0,
};

type HeldAction =
  | "forward"
  | "backward"
  | "turnLeft"
  | "turnRight"
  | "dodge"
  | "attack"
  | "block"
  | "lock"
  | "interact";

type PressCounter = "dodgePresses" | "attackPresses" | "lockPresses" | "interactPresses";

type KeyboardBinding = {
  action: HeldAction;
  preventDefault?: boolean;
  pressCounter?: PressCounter;
};

const keyBindings: Record<string, KeyboardBinding | undefined> = {
  KeyW: { action: "forward" },
  KeyS: { action: "backward" },
  KeyA: { action: "turnLeft" },
  KeyD: { action: "turnRight" },
  Space: { action: "attack", preventDefault: true, pressCounter: "attackPresses" },
  KeyF: { action: "block" },
  ShiftLeft: { action: "dodge", preventDefault: true, pressCounter: "dodgePresses" },
  ShiftRight: { action: "dodge", preventDefault: true, pressCounter: "dodgePresses" },
  KeyQ: { action: "lock", pressCounter: "lockPresses" },
  KeyE: { action: "interact", pressCounter: "interactPresses" },
};

export function useControls(enabled: boolean) {
  const controls = useRef<Controls>({ ...initialControls });

  useEffect(() => {
    const pressedKeys = new Set<string>();
    const pressedMouseButtons = new Set<number>();
    const isKeyboardActionHeld = (action: HeldAction) => {
      for (const code of pressedKeys) {
        if (keyBindings[code]?.action === action) return true;
      }
      return false;
    };
    const syncHeldControls = () => {
      controls.current.forward = isKeyboardActionHeld("forward");
      controls.current.backward = isKeyboardActionHeld("backward");
      controls.current.turnLeft = isKeyboardActionHeld("turnLeft");
      controls.current.turnRight = isKeyboardActionHeld("turnRight");
      controls.current.dodge = isKeyboardActionHeld("dodge");
      controls.current.attack = isKeyboardActionHeld("attack") || pressedMouseButtons.has(0);
      controls.current.block = isKeyboardActionHeld("block") || pressedMouseButtons.has(2);
      controls.current.lock = isKeyboardActionHeld("lock");
      controls.current.interact = isKeyboardActionHeld("interact");
    };
    const releaseHeldControls = () => {
      pressedKeys.clear();
      pressedMouseButtons.clear();
      syncHeldControls();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      const binding = keyBindings[event.code];
      if (!enabled || !binding) return;
      if (binding.preventDefault) event.preventDefault();
      const firstPress = !pressedKeys.has(event.code);
      pressedKeys.add(event.code);
      syncHeldControls();
      if (!firstPress || event.repeat) return;
      if (binding.pressCounter) controls.current[binding.pressCounter] += 1;
    };
    const onKeyUp = (event: KeyboardEvent) => {
      const binding = keyBindings[event.code];
      if (!enabled || !binding) return;
      if (binding.preventDefault) event.preventDefault();
      pressedKeys.delete(event.code);
      syncHeldControls();
    };
    const mouseDown = (event: MouseEvent) => {
      if (!enabled || (event.button !== 0 && event.button !== 2)) return;
      const firstPress = !pressedMouseButtons.has(event.button);
      pressedMouseButtons.add(event.button);
      syncHeldControls();
      if (event.button === 0 && firstPress) controls.current.attackPresses += 1;
    };
    const mouseUp = (event: MouseEvent) => {
      pressedMouseButtons.delete(event.button);
      syncHeldControls();
    };
    const preventContextMenu = (event: MouseEvent) => {
      if (enabled) event.preventDefault();
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("mousedown", mouseDown);
    window.addEventListener("mouseup", mouseUp);
    window.addEventListener("contextmenu", preventContextMenu);
    window.addEventListener("blur", releaseHeldControls);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("mousedown", mouseDown);
      window.removeEventListener("mouseup", mouseUp);
      window.removeEventListener("contextmenu", preventContextMenu);
      window.removeEventListener("blur", releaseHeldControls);
      releaseHeldControls();
    };
  }, [enabled]);

  return { controls };
}
