import { PointerEvent, useEffect, useRef, useState } from "react";
import type { TouchAction } from "./controlInput";
import { resolveJoystickAxes } from "./mobileControlsModel";
import type { TouchControls } from "./useControls";

type MobileControlsProps = {
  controls: TouchControls;
  beaconNearby: boolean;
  onPause: () => void;
};

type StickOffset = { x: number; y: number };

export function MobileControls({ controls, beaconNearby, onPause }: MobileControlsProps) {
  const joystickRef = useRef<HTMLDivElement>(null);
  const joystickPointer = useRef<number | null>(null);
  const [stickOffset, setStickOffset] = useState<StickOffset>({ x: 0, y: 0 });
  const [showHints, setShowHints] = useState(true);

  useEffect(() => {
    const timer = window.setTimeout(() => setShowHints(false), 3_000);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => () => controls.release(), [controls]);

  const updateJoystick = (event: PointerEvent<HTMLDivElement>) => {
    const joystick = joystickRef.current;
    if (!joystick) return;
    const bounds = joystick.getBoundingClientRect();
    const radius = Math.min(bounds.width, bounds.height) * 0.38;
    const offsetX = event.clientX - (bounds.left + bounds.width / 2);
    const offsetY = event.clientY - (bounds.top + bounds.height / 2);
    const distance = Math.hypot(offsetX, offsetY);
    const scale = distance > radius ? radius / distance : 1;
    const clamped = { x: offsetX * scale, y: offsetY * scale };
    setStickOffset(clamped);
    controls.setJoystick(resolveJoystickAxes(clamped, radius));
  };

  const beginJoystick = (event: PointerEvent<HTMLDivElement>) => {
    if (joystickPointer.current !== null) return;
    joystickPointer.current = event.pointerId;
    event.currentTarget.setPointerCapture(event.pointerId);
    updateJoystick(event);
  };

  const moveJoystick = (event: PointerEvent<HTMLDivElement>) => {
    if (joystickPointer.current !== event.pointerId) return;
    updateJoystick(event);
  };

  const releaseJoystick = (event: PointerEvent<HTMLDivElement>) => {
    if (joystickPointer.current !== event.pointerId) return;
    joystickPointer.current = null;
    setStickOffset({ x: 0, y: 0 });
    controls.setJoystick({ move: 0, turn: 0 });
  };

  return (
    <div className={`mobile-controls${showHints ? " show-hints" : ""}`} aria-label="Touch controls">
      <button className="mobile-pause" onClick={onPause} aria-label="Pause mission">Ⅱ</button>
      <div
        ref={joystickRef}
        className="mobile-joystick"
        onPointerDown={beginJoystick}
        onPointerMove={moveJoystick}
        onPointerUp={releaseJoystick}
        onPointerCancel={releaseJoystick}
        onLostPointerCapture={releaseJoystick}
      >
        <span className="control-hint joystick-hint">MOVE · TURN</span>
        <i
          className="mobile-joystick-knob"
          style={{ transform: `translate(${stickOffset.x}px, ${stickOffset.y}px)` }}
        />
      </div>

      <div className="mobile-action-cluster">
        {beaconNearby && (
          <ActionButton action="interact" label="Interact" controls={controls} className="action-interact" />
        )}
        <ActionButton action="lock" label="Lock" controls={controls} className="action-lock" />
        <ActionButton action="block" label="Block" controls={controls} className="action-block" />
        <ActionButton action="dodge" label="Dodge" controls={controls} className="action-dodge" />
        <ActionButton action="attack" label="Attack" controls={controls} className="action-attack" />
      </div>
    </div>
  );
}

type ActionButtonProps = {
  action: TouchAction;
  label: string;
  controls: TouchControls;
  className: string;
};

function ActionButton({ action, label, controls, className }: ActionButtonProps) {
  const activePointer = useRef<number | null>(null);

  const press = (event: PointerEvent<HTMLButtonElement>) => {
    if (activePointer.current !== null) return;
    activePointer.current = event.pointerId;
    event.currentTarget.setPointerCapture(event.pointerId);
    controls.setAction(action, true);
  };
  const release = (event: PointerEvent<HTMLButtonElement>) => {
    if (activePointer.current !== event.pointerId) return;
    activePointer.current = null;
    controls.setAction(action, false);
  };

  return (
    <button
      className={`mobile-action ${className}`}
      onPointerDown={press}
      onPointerUp={release}
      onPointerCancel={release}
      onLostPointerCapture={release}
      aria-label={label}
    >
      {label}
      <span className="control-hint">{action === "block" ? "HOLD" : "TAP"}</span>
    </button>
  );
}
