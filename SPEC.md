# Star Wars: Break the Signal — Version 1 Specification

Status: Approved for implementation

Last updated: 2026-07-09

Target: A short, complete, desktop-browser gameplay demo

## 1. Purpose

Build a polished proof-of-concept for a third-person, Star Wars-themed action RPG that runs entirely in a web browser. The game should capture the immediate fantasy of controlling Anakin Skywalker with a lightsaber, fighting battle droids, gaining levels, and completing a real mission.

This is a capability demo, not the foundation of a large open-world RPG. Favor a complete, fun 3–5 minute experience over generalized systems or future-proof abstractions.

## 2. Player Experience

The player controls a stylized late-Clone-Wars/early-*Revenge of the Sith* Anakin Skywalker. He wears dark Jedi robes, has longer hair, and uses a blue lightsaber.

Anakin has landed at a compact Separatist outpost on a rocky alien world. His mission is to cross the outpost, defeat two groups of B1 battle droids, defeat a tougher B2 super battle droid, and disable a communications beacon.

The intended tone is a Jedi power fantasy. B1 droids should be dispatched quickly, blaster bolts should be satisfying to reflect, and Anakin should feel powerful without being invincible.

## 3. Success Criteria

Version 1 succeeds when a new player can:

1. Open the site on a desktop browser and understand how to play.
2. Start the mission and control Anakin in third person.
3. Traverse a compact level using responsive movement and camera controls.
4. Fight droids using a lightsaber combo, dodge, block/reflect, and lock-on.
5. Earn XP from kills and visibly progress from level 1 to level 3.
6. Defeat the B2 guardian, disable the beacon, and reach a mission-complete screen.
7. Replay the mission from the completion screen.

The complete flow must work without a backend, account, save file, downloaded model pack, or external runtime service.

## 4. Platform and Delivery

### Supported

- Current desktop versions of Chrome, Edge, Firefox, and Safari.
- Keyboard and mouse.
- Static hosting over HTTPS.
- A single-player, fully client-side session.

### Mobile behavior

Mobile gameplay is explicitly unsupported in Version 1. On phones and other clearly mobile/coarse-pointer layouts, do not load the playable game. Show a polished full-screen message:

> Desktop required
>
> Star Wars: Break the Signal is not ready for mobile yet. Open it on a desktop or laptop to play.

The mobile screen must never imply that touch controls exist.

## 5. Technology

Use:

- Vite
- React
- TypeScript
- Three.js through React Three Fiber
- Drei for appropriate scene and camera helpers
- Rapier for character/world collision, hit detection, and simple physics
- Web Audio API for procedural sound

The production output must be a static client bundle. Do not add a server, database, authentication, analytics service, or online save system.

Keep the implementation clean and componentized, but specific to this demo. Do not build generic quest engines, mod systems, entity-component frameworks, or data-driven RPG platforms.

## 6. Game Flow

### 6.1 Title screen

Display:

- Title: **Star Wars: Break the Signal**
- A short mission briefing explaining that Anakin must disable the Separatist communications beacon.
- A compact controls reference.
- A prominent **Start Mission** button.

The Start Mission click must initialize/resume audio and capture the mouse for camera control.

### 6.2 Mission

The mission is a mostly linear 3–5 minute route through one compact outdoor Separatist outpost:

1. **Arrival area** — Safe starting space that lets the player move and orient the camera.
2. **Encounter one** — Four B1 battle droids.
3. **Short traversal** — A visually readable path deeper into the outpost.
4. **Encounter two** — Four B1 battle droids with slightly more spatial pressure.
5. **Beacon platform** — One B2 super battle droid guards the communications beacon.
6. **Objective interaction** — After the B2 is defeated, the player interacts with the beacon to disable it.
7. **Mission complete** — Show final level, XP, enemies defeated, and a **Replay Mission** button.

Prevent the player from disabling the beacon while its B2 guardian is alive.

### 6.3 Pause

Escape pauses the game and releases pointer lock. The pause overlay contains:

- Resume
- Restart Mission
- Controls reminder

Restart Mission resets the entire run.

### 6.4 Defeat

If Anakin's health reaches zero, show a brief defeat state with a fast restart action. Restarting returns the player to the mission start at level 1 with zero XP and all enemies restored.

## 7. Controls

Use these default bindings:

| Action | Input |
| --- | --- |
| Move | W/A/S/D |
| Orbit camera | Mouse |
| Basic lightsaber attack | Left mouse button |
| Block / reflect | Hold right mouse button |
| Directional dodge | Left Shift while moving |
| Jump | Space |
| Toggle target lock | Q |
| Interact with beacon | E |
| Pause / release mouse | Escape |

Movement is run-speed by default; Version 1 does not need a separate walk or sprint mode.

Inputs should be ignored while a blocking menu or completion screen is open.

## 8. Camera and Movement

- Use a slightly over-the-right-shoulder third-person camera.
- Mouse movement freely orbits around Anakin during normal traversal.
- The player character moves relative to the camera direction.
- The camera must not pass through terrain, walls, rocks, or structures. If blocked, it moves closer to Anakin and smoothly returns to its normal distance when space becomes available.
- When target lock is active, the camera should keep Anakin and the selected enemy readable in frame.
- Target lock should prefer a living enemy near the center of the view and within a reasonable combat range.
- Losing range, line of sight for too long, or killing the target clears or advances the lock cleanly.
- Movement, dodge, jump, and camera behavior must remain responsive throughout combat.

## 9. Combat

### 9.1 Anakin's Version 1 kit

- A three-hit basic lightsaber combo.
- Directional dodge with a short cooldown or recovery window that prevents constant spam.
- Hold-to-block against melee hits and blaster fire.
- Successful blaster blocks reflect the bolt toward the firing droid.
- Target lock for focused movement and camera framing.
- Clear hit reactions and readable lightsaber contact effects.

Do not add Force powers, heavy attacks, stamina, mana, skill trees, complex parry timing, dismemberment, or additional weapons.

### 9.2 Combat feel

- B1 droids should fall in one or two clean lightsaber hits.
- A reflected blaster bolt can destroy a B1 droid.
- The B2 takes several hits and should survive at least one full basic combo at level 1 tuning.
- Anakin can be defeated if the player ignores incoming attacks.
- Damage, recovery windows, projectile speed, and cooldowns should be stored as easy-to-tune constants.

### 9.3 Health

- Anakin starts each run at full health.
- Levels automatically increase maximum health and lightsaber damage.
- On level-up, increase current health by the same amount as the maximum-health increase; do not perform an unexplained full heal.
- Enemy damage must be forgiving enough for a first-time player to complete the short demo, while still making block and dodge useful.

Initial level bonuses may be tuned during browser testing. Start with approximately:

| Level | Maximum health | Lightsaber damage multiplier |
| --- | ---: | ---: |
| 1 | 100 | 1.00x |
| 2 | 120 | 1.15x |
| 3 | 140 | 1.30x |

## 10. Enemies

### 10.1 B1 battle droid

- Uses a blaster at range.
- Maintains distance from Anakin when practical.
- Repositions occasionally without using a cover system.
- Telegraphs shots clearly enough for blocking.
- Can be destroyed by lightsaber hits or a reflected bolt.
- Awards 25 XP.

### 10.2 B2 super battle droid

- Moves more slowly and deliberately than a B1.
- Has substantially more health.
- Fires heavier blaster bursts.
- Can knock Anakin back with a close-range attack.
- Guards the beacon and serves as the final encounter.
- Awards a larger final XP bonus; start with 100 XP.

### 10.3 AI boundaries

Use simple state-based behavior such as idle/engage, reposition, attack, hit reaction, and defeated. Do not implement squad tactics, navmesh cover selection, advanced formations, reinforcements, stealth, or persistent patrol simulation.

## 11. XP and Levels

Progression exists only for the current mission run.

- Start every run at level 1 with 0 XP.
- B1 droid: 25 XP.
- Level 2 threshold: 75 XP.
- Level 3 threshold: 175 XP.
- B2 droid: 100 XP.
- Level 3 is the Version 1 cap.

These thresholds intentionally cause level-ups during encounters rather than exactly when an encounter ends:

- Level 2 occurs after the third B1 kill.
- Level 3 occurs after the seventh B1 kill.

Leveling is automatic. Each level increases maximum health and lightsaber damage and triggers a short, satisfying visual/audio celebration. There is no skill tree, stat allocation, perk selection, persistent unlock, or saved progression.

At level cap, the XP HUD should communicate **MAX** or an equivalently clear capped state rather than suggesting that level 4 exists.

## 12. HUD and Menus

### In-game HUD

- Upper-left: Anakin's current and maximum health.
- Upper-right: Current objective.
- Bottom center: Current level and XP progress bar.
- Locked target: Small target reticle and enemy health bar.
- Contextual prompt near the beacon when interaction is available.

The HUD should be legible without dominating the 3D scene. Do not add a minimap, compass, inventory, quest log, ability bar, damage-number cloud, or persistent control legend.

### Objective text

Use short objective states:

1. **Reach the Separatist beacon**
2. **Defeat the beacon guardian**
3. **Disable the communications beacon**
4. **Mission complete**

## 13. Visual Direction

- Stylized low-poly 3D with strong silhouettes and intentionally simple geometry.
- Anakin is recognizable through longer hair, dark robes, heroic proportions, movement, and a bright blue lightsaber—not through a photorealistic face.
- B1 and B2 droids should be recognizable stylizations built from simple geometry.
- The environment is a rocky alien landscape with a small Separatist installation, readable paths, beacon machinery, and cinematic lighting.
- Use color, fog, lighting, particles, emissive materials, and strong effects to provide atmosphere without expensive assets.
- The lightsaber needs a convincing emissive blade, glow impression, movement trail or equivalent swing treatment, and impact feedback.
- Blaster bolts and reflected shots must be visually readable.

All Version 1 models and environment pieces should be built from local, self-contained geometry and materials. Do not depend on external 3D model packs, remote assets, copyrighted soundtrack files, or broken-at-runtime URLs.

## 14. Audio

Use lightweight procedural Web Audio for:

- Continuous lightsaber hum while active.
- Lightsaber swing variations.
- Lightsaber impact.
- Blaster fire.
- Reflected blaster fire or reflection cue.
- Anakin damage cue.
- Droid destruction.
- Level-up celebration.
- Beacon shutdown.
- Subtle sci-fi environmental ambience.

Audio begins only after the player's Start Mission interaction. Pause or safely suspend gameplay audio when the game is paused or the tab loses focus.

Do not use recognizable Star Wars music, film dialogue, voice imitation, or copied commercial sound files.

## 15. State and Architecture Boundaries

Keep one authoritative game-session state containing at least:

- Screen state: title, playing, paused, defeated, complete.
- Player health, level, XP, and combat state.
- Living/defeated enemy state.
- Current locked target.
- Current mission objective.
- Beacon enabled/disabled state.
- Enemies defeated count.

Avoid duplicating authoritative gameplay values across React UI state and the frame loop. Rendering and physics may use refs where appropriate, while durable session transitions should remain explicit and testable.

Restart and replay must produce a clean new session without stale enemies, audio nodes, timers, event listeners, projectiles, or target references.

## 16. Implementation Milestones

Implement and verify in this order:

### Milestone 1 — Application shell

- Scaffold the approved stack.
- Add title screen, desktop layout, mobile blocker, pause shell, and production build.

### Milestone 2 — Gray-box traversal

- Create the rocky outpost gray box.
- Add Anakin placeholder/stylized geometry.
- Implement movement, jumping, Rapier collision, over-shoulder camera, pointer lock, and camera collision.

### Milestone 3 — Combat slice

- Add lightsaber rendering and three-hit combo.
- Add block/reflect, dodge, hit detection, health, target lock, and one B1 enemy.
- Tune until the single-enemy loop feels responsive before duplicating enemies.

### Milestone 4 — Complete mission

- Add both B1 encounters and B2 guardian.
- Add mission gates, beacon interaction, defeat/restart, completion, and replay.
- Add XP, level bonuses, HUD, and objective transitions.

### Milestone 5 — Presentation and verification

- Replace remaining gray-box presentation with the approved low-poly styling.
- Add procedural audio, effects, lighting, ambience, and level-up feedback.
- Balance the 3–5 minute run.
- Verify the complete flow in supported browsers and a mobile-sized/coarse-pointer context.

Do not start optional polish while an earlier milestone's end-to-end behavior is broken.

## 17. Non-Goals

Version 1 does not include:

- An open world or Skyrim-sized structure.
- Multiple levels or planets.
- Character creation or alternate playable characters.
- Dialogue, cinematics, branching story, or voice acting.
- Inventory, loot, equipment, merchants, crafting, or economy.
- Force powers or a skill tree.
- Persistent progression, saves, accounts, or backend services.
- Multiplayer.
- Mobile or controller input.
- Advanced enemy squads, cover AI, or complex navigation.
- External model packs or copyrighted music/audio assets.
- A reusable general-purpose RPG framework.

## 18. Acceptance Checklist

The implementation is complete only when all of the following are true:

- [ ] A fresh dependency install and production build complete successfully.
- [ ] Desktop load shows the title, briefing, controls, and Start Mission action.
- [ ] A phone-sized/coarse-pointer visit shows only the desktop-required experience.
- [ ] Starting captures the mouse and enables audio without browser autoplay errors.
- [ ] WASD movement, mouse camera, jump, dodge, attack, block, lock-on, interaction, and pause all work.
- [ ] The camera avoids clipping through major level geometry.
- [ ] Anakin cannot walk through solid level boundaries or fall out of the playable area.
- [ ] The basic three-hit combo produces reliable hits and readable feedback.
- [ ] B1 blaster bolts can be blocked and reflected back to destroy them.
- [ ] Lock-on selects living enemies and clears safely when its target dies.
- [ ] Eight B1 droids and one B2 appear in the intended sequence.
- [ ] Enemy kills award the specified XP exactly once.
- [ ] Level 2 occurs at 75 XP and level 3 at 175 XP.
- [ ] Level-ups visibly update health/damage state and play feedback.
- [ ] The XP bar, level, health, objectives, and locked-target HUD remain accurate.
- [ ] The beacon cannot be disabled before the B2 is defeated.
- [ ] Disabling the beacon reaches the completion screen with accurate run statistics.
- [ ] Death, restart, and replay each create a clean level-1 run.
- [ ] Escape pauses gameplay, releases the mouse, and can resume cleanly.
- [ ] Gameplay and menus have no repeating console errors or unhandled exceptions.
- [ ] The mission is reasonably completable by a first-time player in 3–5 minutes.
- [ ] No runtime asset depends on an external model, music, or sound URL.

## 19. Handoff Prompt

Use this prompt when implementation moves to a fresh Codex task:

> Read `SPEC.md` completely and treat it as the source of truth. Implement the game end-to-end without expanding its scope. Work through the milestones in order, preserving working behavior as you go. Use the installed project skills when helpful. Run the production build and verify the full mission in a real desktop browser, plus the mobile-blocked state. Treat every acceptance-checklist item as part of the definition of done. Do not claim completion for behavior you did not actually verify.
