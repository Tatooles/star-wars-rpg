# Blender Visual Overhaul — Acceptance Audit

Date: 2026-07-10

Branch: `codex/blender-visual-overhaul`

Reference: [`blender-visual-overhaul-handoff.md`](./blender-visual-overhaul-handoff.md)

## Result

The visual-overhaul acceptance audit passes. The original Blender sources,
runtime GLBs, controller-driven clips, local loading path, preserved gameplay
state machine, and 1080p production render all passed their automated or live
checks. Browser coverage limitations are recorded below.

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
| Anakin | 5,608 | 7 | 11 | 468,308 | Pass |
| B1 | 3,476 | 4 | 5 | 285,212 | Pass |
| B2 | 4,092 | 4 | 6 | 329,156 | Pass |
| Outpost kit | 12,408 | 7 | 0 | 920,116 | Pass |
| Beacon | 2,300 | 3 | 0 | 174,784 | Pass |

The five runtime files total 2,177,576 bytes (2.08 MiB), so additional mesh
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
  its authored `Defeat` clip remains visible for 1.6 seconds.
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

| Metric | Measured |
| --- | ---: |
| FPS | 120 |
| Average frame time | 8.3 ms |
| p95 frame time | 8.5 ms |
| Maximum sampled frame time | 10.1 ms |
| Rendered triangles | 106,790 |
| Draw calls | 660 |
| GPU geometries | 210 |
| GPU textures | 3 |
| Shader programs | 7 |

The production scene mounts the complete environment, all eight shared-source
B1 instances, the B2, Anakin, beacon, HUD-linked indicators, lights, shadows,
and atmosphere. Attack and dodge were exercised live without dropping below
the 60 FPS acceptance threshold. The 120 FPS / 8.3 ms baseline leaves a full
frame of headroom at 60 Hz for projectile/reflection and encounter AI work.
No shader-compilation spike appeared in the 240-frame sustained sample.

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
