# Visual slice asset provenance

This manifest covers the replacement-visual vertical slice only. Runtime binaries are checked in under `public/assets/models`; editable Blender sources are under `art/blender/characters`.

## Anakin source model and fitted assets

- Runtime: `public/assets/models/anakin.glb`
- Editable source: `art/blender/characters/anakin.blend`
- SHA-256: `6aecb214ff7b98316dba55539ea2a1af3fd751c7747d64910a3c67ec3324b347`
- Base generator: MakeHuman/MPFB official system assets
- Garment pack: MakeHuman Community `suits02`, using `donitz_monk_robe`
- Creator/publisher: MakeHuman Community contributors / MakeHuman Community asset repository
- Date obtained: 2026-07-12
- Original downloads:
  - `makehuman_system_assets_cc0.zip` (local verified copy: `makehuman_system_assets_cc0_clean.zip`), SHA-256 `b542127a8e25547c7c29c19f2d1d2adb9a664c80396ecd694095dbc8028a0107`
  - `suits02_cc0.zip`, SHA-256 `437f4d7ab92b698c1fb1047e7d62b22c11f195b2473e936118661dc8e6b7eb7a`
- Source pages:
  - https://static.makehumancommunity.org/about/license.html
  - https://static.makehumancommunity.org/assets/assetpacks/makehuman_system_assets.html
  - https://static.makehumancommunity.org/assets/assetpacks/suits02.html
- License: CC0 1.0 for exported MakeHuman characters and the named official asset-pack content, as stated on the linked project pages.
- Exact license record: https://creativecommons.org/publicdomain/zero/1.0/legalcode
- Attribution requirement: none under CC0. Source and creator/publisher are still recorded above; no in-game attribution is required.
- Project-authored changes: body proportions, garment island removal/cropping, materials, removal of failed floating upper overlays, rest-pose conformance and 26-group weight transfer for retained lower tabards, fitted front/side utility belt, removal of the redundant floating belt hilt, natural arm poses across all five actions, calibrated run/backpedal actions, hidden-body removal below the intact neck, WebP/Draco runtime export.

## B1 battle droid

- Runtime: `public/assets/models/b1.glb`
- Editable source: `art/blender/characters/b1.blend`
- SHA-256: `5f7e1d1647fd85f46e041651747d74f1105f4b06da2fda991cc7f692af2a160d`
- Source: original project-authored geometry and materials created in Blender; no downloaded mesh or texture content.
- Creator/publisher: this project / project owner
- Date created: 2026-07-12
- Original downloaded filename/checksum: not applicable; no third-party source file exists.
- License status: original project asset owned by the project owner; not represented as a Blender-licensed or CC0 third-party asset.
- Attribution requirement: none; project-authored asset.
- Runtime treatment: merged five-material mesh with a rigid armature, `Idle`/`Walk`/`Fire`/`Hit` clips, and Draco compression.

## Environment slice

- Source: original project-authored React Three Fiber geometry and materials in `src/game/Outpost.tsx` and `src/game/Atmosphere.tsx`.
- Downloaded content: none.
