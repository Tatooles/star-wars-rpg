# Surface assets

These six original 1K JPEG maps are bundled locally, so the game does not depend on a third-party asset server at runtime. The normal maps use the OpenGL convention.

| Surface | Source | Bundled maps |
| --- | --- | --- |
| Sand | [Sand 01, Poly Haven](https://polyhaven.com/a/sand_01) | Diffuse, normal |
| Canyon rock | [Rock Boulder Dry, Poly Haven](https://polyhaven.com/a/rock_boulder_dry) | Diffuse, normal |
| Worn steel | [Metal Plate, Poly Haven](https://polyhaven.com/a/metal_plate) | Diffuse, normal |

All three assets are released under [CC0 by Poly Haven](https://polyhaven.com/license). Downloaded September 7, 2026 from the file URLs returned by `https://api.polyhaven.com/files/{asset}`. Total transfer size is approximately 4.5 MB.

`SurfaceAssets.tsx` sets color space, normal strength, and tiling. `visualAssets.ts` supplies shared materials, procedural cloth/panel detail, and deformed rock geometry. Scenery is built in the app; the Jedi and droids remain procedural character models, rather than scanned or sculpted character assets.
