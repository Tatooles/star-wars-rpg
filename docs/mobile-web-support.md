# Mobile Web Support

Star Wars: Break the Signal supports browser play on touch-first phones and tablets. This document supersedes the archived Version 1 mobile blocker without changing the archived implementation history.

## Experience policy

- Touch gameplay is landscape-only. Portrait orientation pauses an active mission and asks the player to rotate the device.
- Returning to landscape leaves the mission paused until the player explicitly resumes.
- Touch-first devices start with touch controls. Hybrid devices may switch between touch and mouse interfaces based on recent pointer input; keyboard controls continue to work in either mode.
- WebGL capability, rather than a mobile user-agent check, determines whether the game can load.

## Touch controls

- A fixed lower-left analog joystick controls forward/backward movement and camera rotation, including simultaneous diagonal input.
- The lower-right action cluster keeps stable, labeled positions for Attack, hold-to-Block, Dodge, and Target Lock.
- Interact appears separately above the action cluster only when an interaction is available.
- Pause remains isolated in the upper-right safe area.
- A compact control diagram appears on the title screen, and in-game control hints fade after three seconds.

## Presentation and performance

- Mobile layouts respect dynamic viewport height and safe-area insets.
- The FPS counter remains visible beside the player-health label.
- Mobile rendering targets 60 FPS with a stable 30 FPS minimum by reducing maximum device-pixel ratio, shadow resolution, and antialiasing cost.
- Sustained performance below 30 FPS produces a dismissible warning.
- Supported browsers may offer a user-initiated fullscreen button; fullscreen is never forced.
- iPhone and iPad users can add the game to the Home Screen for an explicit standalone, landscape-oriented experience without Safari toolbars.

## Deliberate exclusions

This pass does not add mobile-specific difficulty, vibration, gamepad support, remapping, handedness settings, a service worker, offline caching, an installation prompt, a native wrapper, or a fallback renderer.

## Verification

Automated coverage verifies joystick normalization, dead-zone behavior, analog gameplay scaling, action press semantics, input-store interruption cleanup, and device/input policy. Completion also requires responsive browser checks and a user-run full mission on physical iPhone Safari.
