# Visual slice v2 evidence

Status: implementation checkpoint, **not visual acceptance**. The slice remains behind the explicit user approval gate in `visual-overhaul-v2-handoff.md`.

## Production-camera evidence

All runtime captures use the ordinary 1920x1080 production viewport, camera, HUD, lighting, enemy presentation, and asset settings.

- Opening/traversal: `art/previews/runtime-slice-final-neutral.jpg`
- Normal combat distance / movement into the B1 lane: `art/previews/runtime-slice-movement.jpg`
- Attack key pose: `art/previews/runtime-slice-attack.jpg`
- Corrected orientation/shadow checkpoint: `art/previews/runtime-fixes-final.jpg`
- Supplemental corrected Anakin view: `art/previews/anakin-corrected-v9.jpg`
- Supplemental B1 walk contact pose: `art/previews/b1-walk-cycle.jpg`
- Cleaned robe close view: `art/previews/anakin-panels-cleaned.jpg`
- Cleaned robe production-camera view: `art/previews/runtime-robe-fixed.jpg`
- Supplemental source turntables: `art/previews/anakin-styled-v8.png`, `art/previews/b1-styled-v2.png`

Missing approval evidence:

- A valid block/reflection screenshot with Anakin, the B1, projectile, saber, and environment all visible was not captured.
- A continuous production-runtime video showing movement, attack, B1 fire, and block/reflection was not captured.

Those omissions mean the required approval package is incomplete.

## Desktop performance checkpoint

Environment: Codex in-app browser, explicit 1920x1080 viewport, development server on the Apple M3 Pro host.

- Neutral screenshots showed 60–63 FPS after warm-up.
- The captured attack key pose showed 57 FPS.
- Cold/intermediate measurements fell as low as 1–23 FPS while the original 14 MB character loaded and while the browser was being synchronously inspected. Hidden body removal, Draco compression, WebP textures, merged B1 geometry, DPR cap 1.25, and a 1024 shadow map restored the warm screenshot readings.
- A 300-frame in-app instrumentation window could not complete reliably because the controlled tab was throttled while background inspection calls were pending. Therefore sustained average, p95, maximum frame time, and trustworthy peak renderer counters are **not claimed**.
- A production-build sustained movement/combat benchmark is still required before performance acceptance.

## Asset and mobile-oriented budget

| Asset | Runtime payload | Re-imported triangles | Mesh/material structure | Notes |
| --- | ---: | ---: | --- | --- |
| Anakin | 2.8 MB | 41,608 character triangles | Local compressed textures; five clips including dedicated backpedal | Above the 20–35k starting triangle guardrail; further LOD/mesh consolidation is indicated for mobile. Floating upper overlays and the redundant belt hilt were removed; retained lower tabards average 3.3–3.6 mm from the fitted robe across all five authored pose families. |
| B1 | 122 KB | 5,792 | One merged rigged runtime object with five material primitives and four clips; shared GLB cache across instances | Below the 8–15k starting triangle range but silhouette remains readable at gameplay distance. |

Rendering decisions:

- Local GLBs only; no remote runtime fetches.
- Draco-compressed geometry and WebP textures.
- `dpr={[1, 1.25]}` provides a bounded quality tier without changing mobile gameplay.
- Repeated B1 instances clone one cached source and share the imported geometry/material resources.
- The representative environment uses small modular primitives and preserves the existing collision footprint.
- Dynamic-light count is bounded; the main shadow map is 1024².
- No desktop-only custom shader was introduced.

## Export/re-import validation

Blender 5.1.2 successfully re-imported both checked-in GLBs:

- Anakin: 12 imported character mesh nodes and 41,608 character triangles. Actions: `Idle`, `Run`, `Backpedal`, `Attack1`, `Block`. The exported hip hilt is absent and the idle arm bones contain authored non-zero rotations.
- B1: merged five-material rigid rig, 5,792 triangles, actions `Idle`, `Walk`, `Fire`, `Hit`.

## Automated verification

- `pnpm test`: 10 files, 37 tests passed.
- `pnpm lint`: passed.
- `pnpm build`: passed; existing large `GameScene` chunk warning remains.
- `git diff --check`: passed.
- Final two-axis review was run; collision/provenance/combo findings were addressed. Missing approval evidence and sustained production metrics remain explicitly open above.
