# Blender Visual Overhaul — Acceptance Audit

Date: 2026-07-10

Branch: `codex/blender-visual-overhaul`

Reference: [`blender-visual-overhaul-handoff.md`](./blender-visual-overhaul-handoff.md)

## Result

Pass. The complete integrated scene, sustained four-B1 reflection fixture, and
B2/beacon reflection fixture all cleared the 60 FPS target at 1920×1080 after
the review-driven character fidelity pass. All profiling fixtures were removed
before the final repository gates and commit.

## Asset and Blender audit

The reproducible build command was run with Blender 5.1.2 in the required
normal-GPU execution context:

```text
/Applications/Blender.app/Contents/MacOS/Blender --background --factory-startup --python art/blender/scripts/build_assets.py -- all
```

It saved each editable `.blend`, exported to a candidate GLB, reset Blender to
an empty scene, re-imported the candidate, verified required nodes, materials,
armatures, and action names, and only then replaced the runtime GLB.

| Asset | Triangles | Materials | Clips | GLB bytes | Result |
| --- | ---: | ---: | ---: | ---: | --- |
| Anakin | 22,392 | 8 | 11 | 1,647,800 | Pass |
| B1 | 4,548 | 4 | 5 | 371,020 | Pass |
| B2 | 5,212 | 4 | 6 | 416,780 | Pass |
| Outpost kit | 12,408 | 7 | 0 | 920,116 | Pass |
| Beacon | 2,300 | 3 | 0 | 174,784 | Pass |

The five runtime files total 3,530,500 bytes (3.37 MiB), so additional mesh
compression was not required to meet loading or frame-time targets. The files
contain no external texture/model URLs. Material color, roughness, metalness,
emissive accents, edge variation, and modeled scorch/weathering detail are
self-contained.

Named runtime attachments validated on clean import:

- `SaberBladeAnchor`
- `Muzzle_B1`
- `Muzzle_B2`
- `Beacon_Rings`

Visual review images:

- [`anakin.png`](../art/previews/anakin.png)
- [`b1.png`](../art/previews/b1.png)
- [`b2.png`](../art/previews/b2.png)
- [`outpost-kit.png`](../art/previews/outpost-kit.png)
- [`beacon.png`](../art/previews/beacon.png)

## Gameplay and loading audit

- The imported visuals remain children of the existing Rapier bodies. Existing
  encounter positions, world boundaries, camera obstacles, beacon range,
  platform ground rule, damage, health, XP, and combat tuning remain
  authoritative.
- B1 and B2 muzzle positions resolve from their GLB attachment nodes, with the
  prior physics-position calculation retained as a safe fallback.
- A defeated enemy unregisters as a target and loses its collider immediately;
  its authored `Defeat` clip remains visible for 2 seconds, longer than the
  longest 44-frame authored defeat.
- The title screen preloads all five local GLBs. A cold production reload showed
  `Loading Mission` disabled, then changed to enabled `Start Mission` only after
  all assets resolved.
- Production browser sampling covered title/start, normal camera framing,
  attack, dodge, all character/environment visibility, and the existing HUD.
- The full mission state trace covers encounter one, encounter two, the B2,
  beacon disable, mission complete, and replay. Existing suites also cover the
  three-hit combat state, block immunity, dodge immunity, target-lock cleanup,
  player defeat/restart, pause/resume, progression, timers, and beacon gating.
- Production browser runs separately exercised keyboard movement and camera
  turning, attack combo, block/reflection, dodge, target lock, pause/resume,
  defeat presentation, both B1 encounter states, the B2/beacon state, mission
  completion, and replay. The deterministic full-mission reducer trace verifies
  that those mounted states remain connected in the required order rather than
  relying on visual inspection alone.

## Production performance

Hardware: MacBook Pro `Mac15,6`, Apple M3 Pro (11-core CPU, 14-core GPU), 18 GB
memory. Viewport: 1920×1080. Production Vite preview, full local asset set.

| Scenario | Average FPS | Average frame | p95 frame | Max frame | Draw calls | Triangles | Geometries | Textures | Programs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Traversal / complete loaded scene | 64.4 | 15.5 ms | 18.3 ms | 22.8 ms | 914 | 159,750 | 260 | 3 | 7 |
| Four-B1 sustained block/reflection | 61.8 | 16.2 ms | 17.9 ms | 19.2 ms | 929 | 160,418 | 273 | 3 | 7 |
| B2/beacon sustained block/reflection | 80.0 | 12.5 ms | 16.1 ms | 45.1 ms | 322 | 79,968 | 235 | 3 | 8 |

Each row is a production-build 240-frame telemetry window with the browser
isolated from prior WebGL tabs. The traversal sample mounts the complete
environment, all eight shared-source B1 instances, the B2, Anakin, beacon,
HUD-linked indicators, lights, shadows, and atmosphere. The encounter fixtures
exercise the real projectile, procedural-audio, reflection, damage, hit
animation, and impact-burst paths; they alter only initial placement, encounter
state, and health so each scenario can be sampled continuously. Those fixture
changes were reverted immediately after capture.

The first half-second samples after a cold scenario start varied while WebGL
programs and assets warmed. Sustained 240-frame windows remained above target,
geometry and texture counts stabilized, and no continuing shader-compilation
stutter appeared. Projectile collision and hit detection remain on the existing
Rapier sensors; their render meshes use shared geometry/material resources and
an additive glow instead of a per-bolt dynamic light. Completed impact bursts
hide and unregister once, preventing effect buildup. The Canvas caps DPR at 1.5
and the single directional shadow map at 1024² to keep the complete scene above
the 1080p target without changing gameplay geometry or collision fidelity.

## Browser compatibility

- Codex in-app Chromium browser: pass. Cold load, local asset responses, title,
  start, WebGL scene, animation sampling, and 1080p telemetry all worked.
- Safari: installed, but the Mac locked before the Safari accessibility smoke
  test could begin. This browser is documented as not tested in this run.
- Edge and Firefox: not installed on the test machine, so not tested.

The production preview served all five GLBs locally with HTTP 200 responses and
their exact expected byte sizes. Browser logs contained no runtime errors; only
upstream Three.js clock and Rapier initialization deprecation warnings appeared.

## Repository gates

Final required gates:

```text
pnpm test
pnpm lint
pnpm build
git diff --check
```

`pnpm install --frozen-lockfile` also completed successfully from the checked-in
lockfile before the final production build.

The final branch-vs-`main` code review is performed after the final integration
checkpoint commit.
