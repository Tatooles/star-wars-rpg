import type { JoystickAxes } from "./mobileControlsModel";

export type ControlAction =
  | "forward"
  | "backward"
  | "turnLeft"
  | "turnRight"
  | "dodge"
  | "attack"
  | "block"
  | "lock"
  | "interact";

export type TouchAction = "dodge" | "attack" | "block" | "lock" | "interact";

export type Controls = {
  moveAxis: number;
  turnAxis: number;
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

type PressCounter = "dodgePresses" | "attackPresses" | "lockPresses" | "interactPresses";

const counterForAction: Partial<Record<TouchAction, PressCounter>> = {
  dodge: "dodgePresses",
  attack: "attackPresses",
  lock: "lockPresses",
  interact: "interactPresses",
};

export function createControlInput() {
  const keyboardActions = new Set<ControlAction>();
  const mouseActions = new Set<TouchAction>();
  const touchActions = new Set<TouchAction>();
  let joystick: JoystickAxes = { move: 0, turn: 0 };
  const state: Controls = {
    moveAxis: 0,
    turnAxis: 0,
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

  const sync = () => {
    const keyboardMove = Number(keyboardActions.has("forward"))
      - Number(keyboardActions.has("backward"));
    const keyboardTurn = Number(keyboardActions.has("turnLeft"))
      - Number(keyboardActions.has("turnRight"));
    state.moveAxis = joystick.move !== 0 ? joystick.move : keyboardMove;
    state.turnAxis = joystick.turn !== 0 ? joystick.turn : keyboardTurn;
    for (const action of ["dodge", "attack", "block", "lock", "interact"] as const) {
      state[action] = keyboardActions.has(action)
        || mouseActions.has(action)
        || touchActions.has(action);
    }
  };

  const setAction = (
    source: Set<ControlAction> | Set<TouchAction>,
    action: ControlAction | TouchAction,
    pressed: boolean,
  ) => {
    const firstPress = pressed && !source.has(action as never);
    if (pressed) source.add(action as never);
    else source.delete(action as never);
    if (firstPress && action in counterForAction) {
      const counter = counterForAction[action as TouchAction];
      if (counter) state[counter] += 1;
    }
    sync();
  };
  const resetTouchInput = () => {
    touchActions.clear();
    joystick = { move: 0, turn: 0 };
  };

  return {
    state,
    setKeyboardAction(action: ControlAction, pressed: boolean) {
      setAction(keyboardActions, action, pressed);
    },
    setMouseAction(action: "attack" | "block", pressed: boolean) {
      setAction(mouseActions, action, pressed);
    },
    setTouchAction(action: TouchAction, pressed: boolean) {
      setAction(touchActions, action, pressed);
    },
    setJoystick(axes: JoystickAxes) {
      joystick = axes;
      sync();
    },
    releaseTouch() {
      resetTouchInput();
      sync();
    },
    releaseAll() {
      keyboardActions.clear();
      mouseActions.clear();
      resetTouchInput();
      sync();
    },
  };
}

export type ControlInput = ReturnType<typeof createControlInput>;
