# Dark Jedi character

Selected concept: `reference/dark-jedi.png` (full-body image 02). The charcoal wrap tunic, chestnut leather tabards, belt, bracers, fitted trousers, tall boots, brown hair, and blue saber follow that reference. The face and hairstyle are an approximation built from an authored human base; this is not an automatic reconstruction of the photograph. Hanging panels use skeletal deformation, without cloth simulation.

## Deliverables

- `dark-jedi.blend`: editable character, 53-bone game rig, seven actions, packed textures/reference, and studio review camera/lights. Open the Action Editor to select an action; Idle is the saved default.
- `../../public/models/dark-jedi.glb`: self-contained runtime asset, 52,382 triangles, 12 skinned material meshes, approximately 3.9 MiB. The game adds a lightweight blue saber halo.
- Actions: Idle (2s), Run (0.467s), Attack1 (0.467s), Attack2 (0.5s), Attack3 (0.617s), Block (1.3s), Dodge (0.25s). All are in place. Root motion remains under the existing player controller; attack sampling follows gameplay progress rather than a separate timer.

The model faces +Z in Three.js and stands approximately 2.3 world units high. The existing capsule collider remains the gameplay authority. Textures are embedded; upstream source caches and generated review renders are ignored by Git.

## Rebuild with Blender CLI

Tested with Blender 5.1.2, Python 3, and MPFB 2.0.17. No Blender GUI setup or installed add-on is required; the build enables the cached MPFB module only inside its process.

```sh
python3 art/jedi/source/fetch_sources.py
blender --background --factory-startup --threads 2 --python-exit-code 1 --python art/jedi/source/build_character.py
blender --background --factory-startup --threads 2 --python-exit-code 1 --python art/jedi/source/animate_export.py
```

Run commands from the repository root. Download URLs and SHA-256 digests are pinned in `source/sources.json`. The first command verifies cached files too. The build creates neutral front/side/face renders; the animation/export pass creates five posed review renders under `art/jedi/previews/`. It exports only the rig and meshes marked `game_asset`, excluding studio lights, camera, and reference. Material batching preserves skin weights and reduces runtime draw calls.

## Source provenance and licenses

- Human topology, morph targets, and game rig/weights: [MakeHuman Community MPFB 2.0.17](https://github.com/makehumancommunity/mpfb2/tree/v2.0.17). MPFB code is GPL; its generated human assets use MakeHuman's CC0 asset exception. The add-on is downloaded into the ignored cache, not shipped in the game. See [MakeHuman licensing](https://github.com/makehumancommunity/makehuman/blob/master/LICENSE.md) and [output asset FAQ](https://static.makehumancommunity.org/makehuman/faq/are_makehuman_files_free.html).
- Hair: `cortu_short_messy_hair`, Cortu, from the official [Hair 01 CC0 pack](https://static.makehumancommunity.org/assets/assetpacks/hair01.html). This pack republishes its included assets under CC0; older individual headers may differ. Recolored chestnut for this character.
- Skin: Margaret Toigo's `toigo_light_skin_male_bronze`, from the official [Skins 02 CC0 pack](https://static.makehumancommunity.org/assets/assetpacks/skins02.html), resized to 1024px.
- Eyes: MakeHuman's low-poly eyes and brown texture, pinned to upstream commit `a8bc2d54ff0ac92e78ff71431b1023eda42bf482`, under its CC0 asset exception.
- Garments, leather/cloth textures, eyebrows, saber, and animation poses are authored by the accompanying Blender scripts. The reference is the user-selected generated concept.

## Verification

The asset contract tests check embedded textures, all seven clips, joint/weight attributes, the skinned saber, and download/geometry budgets. Animation selection tests cover movement and combat priority. Visual checks must additionally cover front/back silhouette, feet on the floor, running deformation, all three attacks, blocking, dodge, pause/resume, and restart in the running app. Successful export or typechecking alone does not establish visual quality or physical-device performance.
