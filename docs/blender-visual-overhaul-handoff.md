# Blender Visual Overhaul — Implementation Handoff

- Status: Approved design; implementation intentionally deferred to a separate Codex task
- Branch: `codex/blender-visual-overhaul`
- Planning baseline: `c042258` (`Add production FPS counter`)

## Purpose

Replace the game's procedural placeholder meshes with a cohesive, Blender-authored visual set while preserving the short browser-game experience defined in [`SPEC.md`](../SPEC.md).

`SPEC.md` remains the source of truth for gameplay, mission flow, controls, progression, platform support, and non-goals. This handoff records only the approved visual direction, production contract, integration boundaries, and verification gates for the overhaul.

Do not stop after producing a single showcase model. The requested outcome is the complete asset set integrated and verified in the running game. Intermediate commits are recovery and review checkpoints, not stopping points.

## Approved Direction

- Use grounded stylized realism: realistic proportions and layered construction, simplified enough to remain readable and fast in a browser.
- Use a cinematic dusk palette: rust-colored rock, cold slate Separatist metal, a warm hazy horizon, restrained red beacon light, and the blue lightsaber as the strongest color accent.
- Apply lightly weathered, battle-used surfaces: dusty robe hems, restrained edge wear, droid scorch marks, and chipped machinery. Keep silhouettes and faction colors clear.
- Create original interpretations in Blender. Do not use ripped movie/game assets, downloaded character packs, remote textures, or runtime model URLs.
- Anakin should read immediately as a late-Clone-Wars/early-*Revenge of the Sith* version through longer hair, dark layered robes, heroic proportions, and his blue lightsaber. Do not attempt an exact Hayden Christensen likeness.
- B1 and B2 droids must be unmistakable at the normal gameplay camera distance. Their canonical head shapes, limb proportions, armor masses, colors, and integrated weapons are the highest-priority recognition cues.
- Preserve the current HUD and menus. This is a 3D asset, animation, lighting-integration, and set-dressing pass—not a UI redesign.

## Required Asset Set

### Characters and weapons

1. Rigged Anakin model with layered robes, hair, boots, belt, hands, and an authored lightsaber hilt.
2. Rigged B1 battle droid with integrated blaster and muzzle attachment.
3. Rigged B2 super battle droid with integrated arm blaster/muzzle and a close-range attack pose.
4. Runtime lightsaber blade treatment that remains bright and readable, using the Blender hilt plus the existing Three.js emissive/effect system as appropriate.

### Environment

1. Communications beacon centerpiece with inactive/disabled visual state support.
2. A compact modular Separatist outpost kit: platform/trim pieces, barriers, machinery, consoles or power boxes, antenna elements, and a small cable/pipe vocabulary.
3. Several distinct rocky formations suitable for the existing perimeter and traversal route.
4. Static set dressing such as crates or equipment clusters where it improves depth without obscuring combat.

The environment kit should reskin and enrich the existing level. It must not redesign the route, encounter positions, beacon location, raised platform, or mission structure.

## Animation Contract

Animations should be authored in Blender, exported in place, and driven by the existing character controllers. Do not use root motion for navigation.

Use stable clip names unless the implementation establishes an equally explicit typed mapping:

### Anakin

- `Idle`
- `Run`
- `Backpedal`
- `Attack1`
- `Attack2`
- `Attack3`
- `Block`
- `Dodge`
- `Hit`
- `Defeat`
- `Interact`

### B1

- `Idle`
- `Move`
- `Fire`
- `Hit`
- `Defeat`

### B2

- `Idle`
- `Move`
- `BurstFire`
- `Melee`
- `Hit`
- `Defeat`

Animation timing may be tuned to improve combat feel: windups, contact frames, recovery, blending, projectile release moments, and transitions can change. Do not rebalance damage, health, enemy counts, controls, XP, or overall difficulty.

The current droid components immediately unmount dead enemies. Adapt presentation so a defeat clip can finish while gameplay treats the enemy as defeated and removes its active collider/target registration immediately.

## Blender and Export Contract

- Use meters, Y-up, and local +Z as character forward to match the current yaw logic.
- Put each character root at ground contact and export at scale `1`.
- Apply transforms before export and keep armature/object naming stable.
- Add named empties/bones for runtime attachments where relevant, including B1/B2 muzzle origins and lightsaber blade/swing-effect anchors.
- Embed animation clips in the character GLBs.
- Use PBR materials with baked detail where it is visually useful. Prefer base color, normal, and packed occlusion/roughness/metalness textures; use emissive only where it contributes in game.
- Keep editable Blender sources and optimized runtime exports in the repository. Do not add Git LFS unless binary size makes ordinary Git impractical.
- Keep texture references relative/packed so a clean checkout can reproduce exports without machine-specific paths.

Suggested repository layout:

```text
art/blender/characters/anakin.blend
art/blender/characters/b1.blend
art/blender/characters/b2.blend
art/blender/environment/outpost-kit.blend
art/blender/environment/beacon.blend
public/assets/models/anakin.glb
public/assets/models/b1.glb
public/assets/models/b2.glb
public/assets/models/outpost-kit.glb
public/assets/models/beacon.glb
```

Blender Python scripts may be added under `art/blender/scripts/` when they make creation or export reproducible. The assets must still be real, editable `.blend` files and visually inspected in Blender and in the game.

## Unattended Blender Execution Safety

Blender 5.1.2 was preflighted on this Mac on 2026-07-10. The desktop GUI, Python API, PBR render, `.blend` save, animated GLB export, and clean-room GLB re-import all work.

One environment-specific failure was found during preflight: launching background Blender inside the default restricted command sandbox produced a deterministic `SIGSEGV` before Python started. Both crash reports ended in Blender's Metal-device startup path (`supports_barycentric_whitelist` / `MTLBackend::metal_is_supported`). The identical commands and full asset smoke test succeeded with normal macOS GPU access, followed by three consecutive unattended launches with exit code `0`.

Treat the following as a mandatory execution contract:

1. Invoke Blender through the absolute executable path:

   ```text
   /Applications/Blender.app/Contents/MacOS/Blender
   ```

2. Every CLI/background Blender invocation must use the tool's escalated/normal-GPU execution context (`sandbox_permissions: "require_escalated"`). Do not run `/opt/homebrew/bin/blender --background ...` in the default restricted sandbox.
3. Before asset work, run this unattended preflight in the safe execution context and require exit code `0`:

   ```bash
   /Applications/Blender.app/Contents/MacOS/Blender \
     --background \
     --factory-startup \
     --python-expr "import bpy; print('BLENDER_PREFLIGHT_OK', bpy.app.version_string)"
   ```

4. Prefer bounded, one-shot Blender scripts. Save the editable `.blend` before exporting runtime files; do not make a long unsaved GUI session the only copy of meaningful work.
5. Export to a temporary GLB path first. Re-import it into a clean Blender scene and verify expected objects, materials, armatures, and actions before replacing the repository's runtime GLB.
6. Keep `.blend` sources and checkpoint commits frequent enough that a failed process loses only the current bounded operation.
7. If a Blender process exits nonzero, inspect its output, discard any unvalidated temporary export, and retry once using the required normal-GPU execution context. Do not wait for the user to acknowledge a macOS crash dialog; Codex can dismiss it through Computer Use if necessary and resume from the last validated `.blend`.

This contract avoids the diagnosed crash path and provides unattended recovery if an unrelated Blender failure occurs later.

## Starting Performance Guardrails

The acceptance target is 60 FPS at 1080p on a recent mainstream laptop, including modern integrated graphics. Measured runtime behavior outranks any individual budget below, but start with these guardrails:

- Anakin: approximately 25–40k rendered triangles at the highest in-game detail.
- B1: approximately 10–18k triangles, with all instances sharing source geometry and materials.
- B2: approximately 18–30k triangles.
- Keep the typical visible scene near or below roughly 300k rendered triangles before effects.
- Prefer one or two materials per droid family and a small number of atlased environment materials.
- Use 2K textures only for assets that visibly benefit at gameplay distance; use 1K/shared maps for repeated B1s and smaller props.
- Reuse geometry/materials across all B1 instances; clone skeletons correctly rather than reparsing or duplicating textures.
- Add LODs where profiling shows a meaningful benefit, especially for rocks and distant machinery.
- Compress GLBs and textures with a browser-supported pipeline after validating that animation, normals, and materials survive the optimization.
- Limit real-time shadow casters and point lights to the elements that materially improve the scene.

Do not lower the approved quality target preemptively. Build the grounded-stylized result, measure it, and optimize the demonstrated bottlenecks.

## Codebase Integration Boundaries

Read these files before editing:

- [`src/game/Player.tsx`](../src/game/Player.tsx): Rapier player body, movement, attack windows, and current presentation mount.
- [`src/game/AnakinModel.tsx`](../src/game/AnakinModel.tsx): procedural model to replace.
- [`src/game/B1Droid.tsx`](../src/game/B1Droid.tsx): B1 AI, firing cadence, collider, muzzle calculation, and procedural meshes.
- [`src/game/B2Droid.tsx`](../src/game/B2Droid.tsx): B2 AI, burst/melee timing, collider, and procedural meshes.
- [`src/game/Outpost.tsx`](../src/game/Outpost.tsx): authoritative world placement and most fixed collision geometry.
- [`src/game/outpostGround.ts`](../src/game/outpostGround.ts): raised-platform ground rules used by gameplay and indicators.
- [`src/game/Beacon.tsx`](../src/game/Beacon.tsx): beacon placement and active/disabled runtime behavior.
- [`src/game/Atmosphere.tsx`](../src/game/Atmosphere.tsx): current sky, fog, and celestial treatment.
- [`src/game/GameScene.tsx`](../src/game/GameScene.tsx): scene composition, encounter gates, lights, effects, and runtime refs.
- [`src/App.tsx`](../src/App.tsx): title flow, lazy scene loading, Suspense fallback, and HUD/menu boundary.
- [`src/game/combatTuning.ts`](../src/game/combatTuning.ts): existing combat values. Keep difficulty values stable.

Keep physics and visuals separated. Existing Rapier bodies, encounter locations, movement boundaries, target registration, `cameraObstacle` behavior, beacon interaction range, and mission state should remain authoritative. Attach imported visuals beneath those systems rather than deriving gameplay collision from detailed render meshes.

Preserve the current level layout and collision footprint. Decorative objects should remain outside critical movement lanes unless their simple collider is deliberately matched to an existing obstacle.

The title screen should preload the required local GLBs and animation data. Keep the existing screen design; disable or defer `Start Mission` until required assets are ready, with only a small loading status if necessary.

## Implementation Checkpoints

Make focused commits at these boundaries and continue working after each one:

1. **Blender/GLB pipeline and finished B1 benchmark**
   - Editable B1 source, optimized GLB, core clips, runtime loader, and one in-game B1 validated under the actual camera and lighting.
2. **Complete animated character set**
   - Anakin, B1, and B2 sources/exports integrated with gameplay, attachment points, combat events, hit reactions, and defeat presentation.
3. **Beacon and environment kit**
   - Blender sources/exports integrated into the preserved level, with cinematic dusk materials and readable set dressing.
4. **Final integration and optimization**
   - Preloading, compression, lighting/shadow tuning, regression fixes, complete gameplay QA, and measured performance evidence.

Send progress updates and visual evidence at useful moments, but do not wait for approval between checkpoints unless a newly discovered decision would materially change this brief.

## Acceptance and Verification

Completion requires evidence for every item below:

### Asset completeness

- Editable `.blend` sources and local optimized exports exist for Anakin, B1, B2, beacon, and the modular environment kit.
- All required clips play correctly without sliding, scale jumps, broken skinning, missing textures, or machine-local paths.
- B1 and B2 are immediately recognizable from the normal gameplay camera.
- Anakin, his saber, the droids, beacon, and environment share the approved grounded-stylized visual language.
- No remote model/texture dependency or ripped third-party asset is present.

### Gameplay preservation

- Complete the mission from title screen through both B1 encounters, the B2 fight, beacon interaction, mission-complete screen, and replay.
- Exercise attack combo, block/reflect, dodge, target lock, player defeat/restart, pause/resume, and beacon-disabled state.
- Verify projectile origins, saber contacts, hit timing, health bars/reticles, enemy death cleanup, and camera framing with the new rigs.
- Confirm the route, encounter triggers, collisions, raised platform, objective progression, controls, damage, health, XP, and difficulty remain functionally intact.

### Loading and compatibility

- A clean production build serves every asset from the local bundle.
- Title-screen preloading works on a cold load and does not allow gameplay to begin with missing models.
- Smoke-test the supported desktop browsers available on the machine and document any browser that could not be tested.

### Performance and repository health

- Measure production-mode FPS at 1920×1080 during traversal, a four-B1 encounter, effects-heavy blocking/reflection, and the B2/beacon encounter.
- Meet the 60 FPS target on representative recent mainstream hardware or provide profiling evidence and continue optimizing until the requirement is satisfied.
- Check asset payload size, draw calls, triangle count, texture memory, shader compilation stutter, and sustained frame time rather than relying only on an idle FPS reading.
- Run `pnpm test`, `pnpm lint`, `pnpm build`, and `git diff --check`.
- Record a successful Blender preflight and clean-room re-import for each final character/environment GLB.
- Perform a final branch-vs-`main` review after all checkpoint commits.

## Non-goals

- No HUD or menu redesign.
- No new levels, encounters, enemies, weapons, Force powers, destructible props, or interactions.
- No combat difficulty rebalance.
- No change to the mission structure, level route, collision layout, controls, progression, or backend architecture.
- No photoreal actor likeness or film-quality digital double.
- No requirement for a gaming-class GPU.

## Suggested Skills

- `implement`: execute this approved handoff without reopening settled product decisions.
- `computer-use:computer-use`: operate and visually inspect Blender when GUI work is needed; prefer Blender's CLI/Python API for reproducible operations.
- `browser:control-in-app-browser`: inspect the local game at the real camera distance and capture visual/runtime evidence.
- `code-review`: review the finished branch against `main`, including standards and correctness.

Do not substitute image generation for the requested Blender-authored 3D assets.

## Copy-paste Start for the Implementation Task

> Implement `docs/blender-visual-overhaul-handoff.md` completely on the existing `codex/blender-visual-overhaul` branch. Use Blender to create the editable sources and optimized local GLBs, integrate the full character and environment set, make the specified checkpoint commits, and continue through final performance and gameplay verification without stopping at the B1 benchmark. Treat `SPEC.md` as the gameplay source of truth and the handoff document as the approved visual-production contract. Keep the user updated with visual evidence, but pause only for a genuine decision that would materially change the approved scope.
