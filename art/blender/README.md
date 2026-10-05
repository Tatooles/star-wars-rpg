# Blender assets

## Anakin

The player character is generated entirely by script, so it can be rebuilt and
tweaked without hand-editing the `.blend`.

| File | Purpose |
| --- | --- |
| `scripts/anakin_build.py` | Geometry, vertex-color materials, rig, skinning, export |
| `scripts/anakin_anims.py` | Gameplay animations (IK-posed saber arm, baked to FK) |
| `scripts/anakin_preview.py` | Turnaround / animation contact-sheet renders |
| `characters/anakin.blend` | Saved output of the build script |
| `../concepts/anakin/` | Reference art (`01-hero-three-quarter.jpg` is the appearance target) |

Rebuild the `.blend` and `public/models/anakin.glb` from the repository root:

```sh
blender -b --factory-startup -P art/blender/scripts/anakin_build.py
```

Preview renders (for example, attack arcs from above):

```sh
blender -b art/blender/characters/anakin.blend -P art/blender/scripts/anakin_preview.py -- \
  --out /tmp/anakin --action Attack1 --frames 1,5,10,14,19,25 --views top --sheet attack1.png
```

The GLB contains eight clips: `Idle`, `Run`, `Backpedal`, `Attack1`–`Attack3`,
`Block`, and `Dodge`. `src/game/AnakinModel.tsx` plays them in upper/lower-body
layers; attack and dodge clips are scrubbed by gameplay progress so the swing
stays in sync with the hit window in `combatTuning.ts`. Attack clips start and
end in the idle pose so combos can cross-fade cleanly.
