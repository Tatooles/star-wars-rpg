import { useEffect, useMemo, useRef, useState } from "react";
import {
  createControlInput,
  type ControlAction,
  type TouchAction,
} from "./controlInput";
import type { JoystickAxes } from "./mobileControlsModel";

export type { Controls } from "./controlInput";

type KeyboardBinding = {
  action: ControlAction;
  preventDefault?: boolean;
};

const keyBindings: Record<string, KeyboardBinding | undefined> = {
  KeyW: { action: "forward" },
  KeyS: { action: "backward" },
  KeyA: { action: "turnLeft" },
  KeyD: { action: "turnRight" },
  Space: { action: "attack", preventDefault: true },
  KeyF: { action: "block" },
  ShiftLeft: { action: "dodge", preventDefault: true },
  ShiftRight: { action: "dodge", preventDefault: true },
  KeyQ: { action: "lock" },
  KeyE: { action: "interact" },
};

export type TouchControls = {
  setJoystick: (axes: JoystickAxes) => void;
  setAction: (action: TouchAction, pressed: boolean) => void;
  release: () => void;
};

export function useControls(enabled: boolean, mouseEnabled = true) {
  const [input] = useState(createControlInput);
  const controls = useRef(input.state);
  const touchControls = useMemo<TouchControls>(() => ({
    setJoystick: (axes) => input.setJoystick(axes),
    setAction: (action, pressed) => input.setTouchAction(action, pressed),
    release: () => input.releaseTouch(),
  }), [input]);

  useEffect(() => {
    const pressedKeys = new Set<string>();
    const isKeyboardActionHeld = (action: ControlAction) => {
      for (const code of pressedKeys) {
        if (keyBindings[code]?.action === action) return true;
      }
      return false;
    };
    const onKeyDown = (event: KeyboardEvent) => {
      const binding = keyBindings[event.code];
      if (!enabled || !binding) return;
      if (binding.preventDefault) event.preventDefault();
      pressedKeys.add(event.code);
      input.setKeyboardAction(binding.action, true);
    };
    const onKeyUp = (event: KeyboardEvent) => {
      const binding = keyBindings[event.code];
      if (!binding) return;
      if (enabled && binding.preventDefault) event.preventDefault();
      pressedKeys.delete(event.code);
      input.setKeyboardAction(binding.action, isKeyboardActionHeld(binding.action));
    };
    const mouseDown = (event: MouseEvent) => {
      if (!enabled || !mouseEnabled || (event.button !== 0 && event.button !== 2)) return;
      input.setMouseAction(event.button === 0 ? "attack" : "block", true);
    };
    const mouseUp = (event: MouseEvent) => {
      if (event.button !== 0 && event.button !== 2) return;
      input.setMouseAction(event.button === 0 ? "attack" : "block", false);
    };
    const preventContextMenu = (event: MouseEvent) => {
      if (enabled) event.preventDefault();
    };
    const releaseAllControls = () => input.releaseAll();

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("mousedown", mouseDown);
    window.addEventListener("mouseup", mouseUp);
    window.addEventListener("contextmenu", preventContextMenu);
    window.addEventListener("blur", releaseAllControls);
    if (!enabled) releaseAllControls();

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("mousedown", mouseDown);
      window.removeEventListener("mouseup", mouseUp);
      window.removeEventListener("contextmenu", preventContextMenu);
      window.removeEventListener("blur", releaseAllControls);
      releaseAllControls();
    };
  }, [enabled, input, mouseEnabled]);

  return { controls, touchControls };
}
