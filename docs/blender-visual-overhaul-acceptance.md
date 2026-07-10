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

## Production performance

Hardware: MacBook Pro `Mac15,6`, Apple M3 Pro (11-core CPU, 14-core GPU), 18 GB
memory. Viewport: 1920×1080. Production Vite preview, full local asset set.

| Scenario | Average FPS | Average frame | p95 frame | Max frame | Draw calls | Triangles | Geometries | Textures | Programs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Traversal / complete loaded scene | 69.4 | 14.4 ms | 17.8 ms | 29.4 ms | 914 | 159,750 | 260 | 3 | 7 |
| Four-B1 sustained block/reflection | 69.2 | 14.4 ms | 17.3 ms | 22.6 ms | 920 | 159,822 | 268 | 3 | 7 |
| B2/beacon sustained block/reflection | 93.3 | 10.7 ms | 13.3 ms | 47.0 ms | 334 | 80,296 | 245 | 3 | 9 |

Each row is a production-build 240-frame telemetry window with the browser
isolated from prior WebGL tabs. The traversal sample mounts the complete
environment, all eight shared-source B1 instances, the B2, Anakin, beacon,
HUD-linked indicators, lights, shadows, and atmosphere. The encounter fixtures
exercise the real projectile, procedural-audio, reflection, damage, hit
animation, and impact-burst paths; they alter only initial placement, encounter
state, and health so each scenario can be sampled continuously. Those fixture
changes were reverted immediately after capture.

The first half-second samples after a cold scenario start varied while WebGL
programs and assets warmed (the lowest individual counter reading was 56 FPS in
the loaded traversal scene and 59 FPS in the B2 fixture). Sustained 240-frame
windows remained above target, geometry and texture counts stabilized, and no
continuing shader-compilation stutter appeared. The lightweight projectile path
uses shared geometry/material resources and direct distance checks; completed
impact bursts hide and unregister once, preventing the earlier effect buildup.

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

The final branch-vs-`main` code review is performed after the final integration
checkpoint commit.
