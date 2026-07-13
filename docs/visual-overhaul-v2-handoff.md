# Star Wars RPG Visual Overhaul V2 — Replacement Handoff

Status: Drafted from the completed 12-question visual-direction interview; implementation is **not authorized** until the user explicitly approves this document.

Planning date: 2026-07-12

Implementation baseline: fresh `origin/main`

Suggested implementation branch: `codex/visual-overhaul-v2`

## Purpose

Replace the game's placeholder presentation with a cohesive, recognizable, performant visual slice without changing the current mission, combat, camera, physics, HUD, or progression.

This handoff supersedes the visual-production direction on the failed `codex/blender-visual-overhaul` branch. It does not revive the archived Version 1 visual requirements when they conflict with the decisions below.

The first implementation objective is deliberately narrow: prove the selected look with Anakin, one B1 droid, a small representative outpost section, final-intent materials and lighting, and representative combat presentation in the production game. The rest of the asset set is unauthorized until that slice receives explicit user approval.

## Authority and branch rules

Use this order of authority:

1. The user's current request and later explicit approvals.
2. This replacement handoff.
3. Current application behavior and automated tests, except where the user explicitly approves a change.
4. Current durable documentation.
5. Archived implementation material as historical context only.

Implementation must start from a fresh `origin/main` on a new branch. Do not continue, merge, cherry-pick asset work from, or treat the failed `codex/blender-visual-overhaul` branch as a production foundation. Its tip, `ee11b46`, is negative evidence only.

Useful integration ideas from that branch may be independently re-derived after the vertical slice is approved, but its generated meshes, materials, acceptance conclusions, and asset-production script are not approved for reuse.

## Diagnosis of the failed pass

The failed branch met technical checks while visibly missing the requested result:

- Final characters were visibly assembled from boxes, cones, cylinders, spheres, and similarly obvious primitives.
- Anakin read as a block-built toy rather than a recognizable grounded-stylized character.
- B1 and B2 silhouettes were weak at the normal gameplay distance.
- Repeating high-frequency surface patterns produced severe striping and moire in the production camera.
- Lighting crushed large portions of the scene into black and muddy brown values.
- Materials lacked convincing cloth, leather, painted metal, rock, and dust separation.
- Blender preview renders obscured weaknesses that were obvious in production gameplay.
- Passing tests, valid GLBs, triangle counts, FPS results, and clean imports were incorrectly treated as visual acceptance.

The failure was the chosen production method, execution quality, and approval process. It was not caused by missing 3D-production instructions from the user.

## Approved visual target

### Overall direction

Use **grounded stylized realism** as the primary language, with selective graphic simplification borrowed from high-end animation and sculpted tactical art where it improves clarity or makes the zero-budget production method viable.

The approved concept direction corresponds to the interview's grounded-stylized option:

- believable adult proportions;
- strong, immediately readable silhouettes;
- selective real-time PBR material response;
- simplified, deliberately authored forms;
- cinematic but readable early-dusk lighting;
- premium small-game presentation rather than photorealism;
- no resemblance to LEGO, voxel art, collectible toys, or a generic low-poly asset pack.

Do not target the interview's cinematic semi-real concept as a hidden requirement. That level of character fidelity would not be an honest zero-budget promise. The goal is to reproduce the approved board's composition, silhouette strength, palette, lighting hierarchy, and perceived finish closely without attempting an exact mesh or actor likeness.

### Anakin

Anakin must read immediately at the production gameplay distance through:

- grounded heroic adult proportions, approximately natural human anatomy with restrained shoulder and stance exaggeration;
- an athletic build rather than a bulky action-hero build;
- medium-long, tousled brown hair with a clear silhouette;
- dark layered Jedi robes with distinct overlapping masses;
- readable belt, boots, gloves or forearm treatment, and robe movement;
- a bright blue lightsaber with a stable core, restrained glow, and readable swing presentation;
- confident, agile poses rather than neutral mannequin posture.

Do not pursue an exact Hayden Christensen likeness. Facial detail is secondary to full-body recognition at the real camera distance, but the face must still look intentionally modeled rather than assembled from primitives.

### B1 battle droid

The B1 must contrast sharply with Anakin and be unmistakable through:

- a long, narrow canonical head and projecting face profile;
- extremely thin skeletal limbs;
- an open, ribbed mechanical torso;
- narrow hips and a slightly hunched mechanical posture;
- muted tan armor over dark joints;
- a compact integrated or securely held blaster;
- rigid, precise animation that contrasts with Anakin's organic motion.

A B1 may begin from ordinary hard-surface modeling primitives as part of a deliberate modeling workflow, but the final silhouette and surfaces must not visibly read as a collection of unrefined primitives.

### Materials and wear

Use restrained battle-worn materials:

- broad, stable value groups that survive the production camera;
- recognizable cloth, leather, painted metal, exposed mechanics, dust, and rock;
- sparse dust accumulation at robe hems, boots, ground contacts, and sheltered environment edges;
- limited, intentional edge wear at exposed corners;
- only a few deliberately placed scorch marks or chips;
- low-frequency authored variation instead of dense procedural noise.

Reject herringbone, checker, stripe, or other high-frequency patterns that shimmer or alias at gameplay distance. Do not use dense scratches, uniform grunge overlays, or noisy normal maps merely to imply detail.

### Palette and lighting

Use an early-dusk palette:

- rust and ochre rock;
- warm horizon light;
- cool slate Separatist metal;
- muted tan B1 plating;
- charcoal and umber robes;
- restrained red outpost signals;
- the blue lightsaber as the strongest color accent.

The sky may be moody, but the scene must be brighter and more legible than the failed pass. Use strong ambient fill and controlled key/rim separation so that:

- Anakin remains distinct from the ground;
- the B1 is readable against the outpost;
- walkable paths and combat lanes are obvious;
- material families remain distinguishable;
- shadows retain information instead of becoming featureless black shapes.

### Environment language

Build a layered military outpost rather than an empty frontier or a dense fortified base.

The representative environment should include enough machinery, barriers, cables, crates, antenna or communications elements, and rock framing to feel inhabited. Preserve large, clean combat lanes, camera visibility, and an obvious route toward the beacon.

Use repeated modules economically, but break repetition through placement, scale, rotation, decals, and a small number of authored variants. Decorative objects must not alter the current collision layout or obstruct the existing route.

### Animation language

Prioritize responsive combat with strong, slightly exaggerated key poses:

- Anakin's locomotion should remain grounded and natural.
- Attacks, blocks, reflections, dodges, hits, and interaction poses must read immediately at gameplay distance.
- Lightsaber arcs should feel decisive without becoming broad cartoon smears.
- B1 locomotion and firing should be deliberately rigid and mechanical.
- Transitions must not cause foot sliding, scale changes, broken attachments, or obvious pose snapping.
- Root motion must not replace the current gameplay controller.

Animation timing may be adapted to the current attack, block, projectile, and dodge windows. Do not rebalance combat values as part of the visual overhaul.

## Zero-budget production contract

The asset budget is **$0**. Do not propose or purchase paid models, textures, materials, plugins, subscriptions, generation credits, or animation packs.

The permitted production approach is:

1. Research free candidate assets and tools using primary license sources.
2. Use only assets whose source, author, download location, and license can be recorded and whose license permits modification and inclusion in this project.
3. Deliberately remodel, retopologize, retexture, rig, and optimize free bases in Blender as needed to reach the approved direction.
4. Use free, properly licensed animation sources where they fit; adapt them rather than accepting mismatched motion unchanged.
5. Model bounded hard-surface elements manually in Blender when suitable free sources do not exist.
6. Use Blender scripting only for validation, export, repetitive setup, deterministic conversion, or other bounded technical work.

Blender Python must not serve as an unattended substitute for final humanoid character artistry. No final character may be procedurally assembled from visible boxes, cylinders, cones, capsules, or spheres.

Potential source categories include free-plan assets with game-compatible licenses, CC0 assets, permissively licensed character bases, and royalty-free animation libraries. A source being free to download is not sufficient evidence of permission.

Do not use:

- ripped assets from a film, television production, commercial game, or proprietary model viewer;
- fan-uploaded franchise models without an explicit usable license;
- remote runtime model or texture URLs;
- assets with unclear authorship or provenance;
- generated 3D output whose license, training restrictions, or redistribution rights cannot be verified;
- paid assets offered temporarily without a durable license record.

Maintain a provenance manifest for every adapted external asset with:

- asset name and role;
- creator or publisher;
- canonical source URL;
- date obtained;
- exact license name and license URL or included license text;
- original filename and checksum;
- modifications made;
- attribution requirement and where it is fulfilled.

If the approved visual target cannot be reached using this zero-budget method, stop and report that honestly. Do not lower the visual bar, expand beyond the vertical slice, or ask the user to accept the least-bad result.

## Technical integration boundaries

Current gameplay and physics remain authoritative. Before implementation, re-read the current versions of:

- `src/game/Player.tsx`
- `src/game/AnakinModel.tsx`
- `src/game/B1Droid.tsx`
- `src/game/B2Droid.tsx`
- `src/game/Outpost.tsx`
- `src/game/Beacon.tsx`
- `src/game/Atmosphere.tsx`
- `src/game/GameScene.tsx`
- `src/game/CameraRig.tsx`
- `src/game/Projectile.tsx`
- `src/game/ImpactBurst.tsx`
- `src/game/outpostGround.ts`
- `src/game/combatTuning.ts`
- `src/App.tsx`

Preserve:

- the Rapier player and enemy bodies;
- encounter positions and activation rules;
- world boundaries and current collision footprint;
- camera-obstacle behavior and over-the-right-shoulder camera framing;
- target registration and target-lock behavior;
- projectile origins, hit detection, block/reflection rules, and attack windows;
- the raised-platform ground rules;
- beacon interaction distance and mission gating;
- controls, damage, health, XP, enemy counts, objective order, and mission timing;
- the existing HUD and menus.

Imported or newly authored render assets should attach beneath the existing gameplay systems. Do not derive detailed gameplay collision from render meshes.

The visual overhaul must not add mobile controls, remove the mobile blocker, redesign responsive gameplay UI, or otherwise conflict with the separate mobile-compatibility branch.

## Performance and mobile-aware asset constraints

Performance is part of visual acceptance, not a later cleanup step.

### Desktop requirement

The approved vertical slice must sustain 60 FPS at 1920x1080 on the existing Apple M3 Pro test machine in a production build during representative movement and combat.

Measure frame times over sustained windows. Report average frame time, p95 frame time, maximum frame time, draw calls, rendered triangles, geometries, textures, shader programs, and asset payload. Separate cold-start shader compilation from sustained gameplay rather than hiding either result.

### Mobile-aware requirement

The visual asset pipeline must remain compatible with a future mobile gameplay branch. This task does not implement or expose mobile gameplay.

Design and audit assets for:

- scalable device-pixel ratio and quality tiers;
- shared geometry and materials across repeated B1 instances;
- one or two materials per repeated character where practical;
- bounded texture resolution and texture-memory use;
- compressed, local GLB and texture delivery when the validated browser pipeline supports it;
- limited transparent overdraw;
- limited real-time shadow casters and dynamic lights;
- optional LODs where profiling shows a real benefit;
- no desktop-only shader dependency without a lower-cost fallback.

Starting budgets for the vertical slice, subject to profiling and visible quality:

- Anakin: approximately 20–35k rendered triangles at highest in-game detail;
- B1: approximately 8–15k rendered triangles, sharing source geometry and materials across instances;
- character textures: prefer 1K maps and justify any 2K map by visible gameplay-distance benefit;
- representative environment: use modular, instanced, and atlased content where it reduces real cost without visible repetition.

These are starting guardrails, not evidence of acceptance. Measured frame time and the approved runtime appearance outrank any individual triangle budget.

Include a mobile-oriented asset/rendering budget report for the slice. If the separate mobile branch is available and safe to inspect, a read-only or isolated rendering benchmark may supplement the report. Do not merge branches or change mobile functionality for this task.

## Mandatory vertical slice

No complete asset-set production is authorized initially.

The first milestone contains only:

1. **Anakin**
   - grounded heroic proportions;
   - final-intent hair, robes, skin, leather, and lightsaber materials;
   - idle and locomotion presentation;
   - one representative lightsaber attack;
   - block/reflection pose and saber effect;
   - no exact actor likeness requirement.
2. **One B1 battle droid**
   - final-intent silhouette, materials, blaster, and muzzle location;
   - idle or mechanical locomotion;
   - one firing action;
   - representative hit or reflected-shot response where needed to judge the combat presentation.
3. **One small representative outpost section**
   - a short path or combat lane;
   - rust-rock framing;
   - slate military machinery or barriers;
   - a small amount of layered set dressing;
   - final-intent early-dusk lighting and atmosphere.
4. **Production integration**
   - the real production camera;
   - the unchanged HUD;
   - existing physics and combat timing;
   - representative movement, attack, B1 fire, block, and reflection presentation.

Do not build or integrate the B2, beacon, additional droid variants, the complete environment kit, or the full animation set before this slice is approved.

## Required approval evidence

The primary evidence is the production game, not Blender.

Provide at least four 1920x1080 screenshots from a production build:

1. opening or traversal framing with Anakin, the path, and the representative environment visible;
2. Anakin and the B1 together at the normal combat distance;
3. the representative lightsaber attack at its strongest readable key pose;
4. block/reflection presentation with the B1, projectile, saber, and environment visible.

Also provide:

- a short production-runtime capture showing movement into combat, the attack, B1 fire, and block/reflection;
- one supplemental closer character view for inspecting materials and silhouette, clearly labeled as supplemental;
- sustained desktop performance measurements at 1920x1080;
- the mobile-oriented asset/rendering budget report;
- asset-provenance records for every external source used;
- clean Blender-to-GLB export and re-import validation;
- relevant automated test, lint, build, and diff-check results.

Screenshots must use the ordinary camera position, field of view, HUD, lighting, post-processing, and production asset settings. Do not use a special showcase camera, hidden debug lights, reduced enemy presentation, temporary supersampling, or a Blender render as the primary approval view.

Blender renders, wireframes, turntables, topology views, and close-ups may supplement the runtime evidence. They cannot establish visual acceptance.

## Automatic rejection criteria

The vertical slice fails without further debate if any of the following is visible:

- Anakin or the B1 is not recognizable at normal gameplay distance.
- Either character reads as LEGO-like, block-built, voxel, chibi, toy-like, or assembled from obvious primitives.
- Character proportions or poses resemble a stiff collectible figure.
- Surfaces exhibit striping, moire, checker shimmer, unstable specular noise, or distracting texture crawl.
- Lighting hides silhouettes, navigation, combat actions, or material separation.
- The palette collapses into muddy brown or featureless black values.
- Materials read as flat placeholder colors or uniformly wet plastic.
- The environment looks like scattered generic asset-pack props rather than one authored outpost.
- Animation exhibits foot sliding, broken skinning, attachment drift, scale jumps, pose snapping, or weightless attacks.
- Saber, projectile, muzzle, attack, or reflection presentation is unclear at the normal camera distance.
- Any asset lacks an acceptable source and license record.
- Sustained desktop performance misses the approved 60 FPS target at 1920x1080 on the M3 Pro test machine.
- The asset design clearly prevents a reasonable lower-cost mobile quality tier.
- Any gameplay, physics, route, combat tuning, HUD, or mobile-functionality change appears without explicit approval.

Passing tests, valid imports, clean exports, low triangle counts, small files, or high FPS cannot override a visual rejection.

## Approval protocol

When the vertical slice evidence is ready:

1. Present all required runtime evidence together.
2. State every criterion that passed, failed, or could not be verified.
3. Ask the user for explicit visual approval.
4. Treat silence, technical success, or partial approval as **not approved**.
5. If rejected, revise only the slice and present new production evidence.
6. If the available zero-budget method cannot reach the target, stop and report the limitation honestly.

Only explicit user approval authorizes work on the B2, beacon, additional droids, full environment, and remaining animation set.

## Post-approval expansion

After explicit vertical-slice approval, expand the approved language in controlled checkpoints:

1. Complete the remaining Anakin and B1 animation/presentation requirements.
2. Create and integrate the B2 using the same silhouette, material, provenance, and performance rules.
3. Create and integrate the beacon and remaining modular outpost environment.
4. Finish loading, compression, LOD, shadow, lighting, effects, and performance work.
5. Run full mission QA from title screen through replay.
6. Perform a final branch-versus-`main` review and present final production-runtime evidence.

Each checkpoint must preserve the approved slice rather than silently redefining the art direction.

## Repository and verification requirements

Keep editable sources and optimized runtime exports in the repository using a clear layout such as:

```text
art/blender/characters/
art/blender/environment/
art/blender/scripts/
art/provenance/
art/previews/
public/assets/models/
public/assets/textures/
```

Use local, relative, reproducible asset references. Do not add Git LFS unless binary size demonstrates that ordinary Git is impractical and the user explicitly approves the repository change.

Before final completion, verify at minimum:

- title-to-mission asset loading;
- traversal and both B1 encounters;
- the B2 fight and beacon interaction;
- attack combo, dodge, block/reflection, target lock, hit reactions, defeat/restart, pause/resume, mission completion, and replay;
- collision and camera behavior across the preserved route;
- local production asset delivery with no remote dependency;
- supported desktop browsers available on the test machine;
- sustained performance in traversal, a multi-B1 reflection encounter, and the B2/beacon encounter;
- `pnpm test`;
- `pnpm lint`;
- `pnpm build`;
- `git diff --check`;
- final branch-versus-`main` review.

## Explicit non-goals

- No mobile controls, mobile HUD, mobile camera redesign, or removal of the mobile blocker.
- No HUD or menu redesign.
- No new mission, level, encounter, enemy, weapon, Force power, or interaction.
- No combat, health, damage, XP, timing, or difficulty rebalance.
- No route, collision-layout, camera-control, or progression change.
- No exact actor likeness or film-quality digital double.
- No paid asset, plugin, service, or generation credit.
- No full asset-set build before vertical-slice approval.

## Planning completion and next authorization

The visual-direction interview is complete. This document captures the selected target, zero-budget production contract, gameplay boundaries, performance requirements, automatic rejection criteria, and mandatory vertical-slice approval gate.

Creating this document does not authorize implementation. The next task may begin only after the user explicitly approves this replacement handoff.
