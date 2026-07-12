# Star Wars RPG Visual Overhaul V2 — Planning Handoff

## Objective

Run a focused visual-direction interview with the user, diagnose the failed visual-overhaul attempt, and produce a replacement `docs/visual-overhaul-v2-handoff.md`. This task is planning and visual exploration only. Do not implement assets or code until the user explicitly approves the replacement handoff.

The user wants to answer only genuine taste, sourcing, and approval decisions. Do not ask them how to model, rig, texture, animate, optimize, or operate Blender. Those are the agent's responsibilities.

## Repository and authority

Follow `AGENTS.md`. In particular, the user's current request, current behavior, tests, and current durable documentation outrank archived implementation plans. Do not reopen settled gameplay decisions.

Failed branch: `codex/blender-visual-overhaul`

Failed branch tip: `ee11b46`

The failed branch is published at `origin/codex/blender-visual-overhaul`. It must not be merged. Preserve it as negative evidence. Any future implementation must start from fresh `origin/main` on a new branch, tentatively `codex/visual-overhaul-v2`.

## Existing evidence to inspect

Do not restate these artifacts; read and reference them:

- `docs/blender-visual-overhaul-handoff.md` on the failed branch
- `docs/blender-visual-overhaul-acceptance.md` on the failed branch
- The complete diff `origin/main...origin/codex/blender-visual-overhaul`
- `/Users/kevintatooles/.codex/visualizations/2026/07/10/019f4dbf-4794-7b31-8157-3f787d0138e6/opening-gameplay.png`
- `/Users/kevintatooles/.codex/visualizations/2026/07/10/019f4dbf-4794-7b31-8157-3f787d0138e6/lightsaber-attack.png`
- `art/previews/anakin.png` on the failed branch
- `art/previews/b1.png` on the failed branch
- `art/previews/b2.png` on the failed branch
- `art/previews/outpost-kit.png` on the failed branch
- `art/previews/beacon.png` on the failed branch

The user rejected the result because the runtime scene was visibly unacceptable: block-built/LEGO-like characters, poor recognizability, severe striping or moire across surfaces, muddy lighting, weak materials, and an overall early-prototype appearance. The previous agent incorrectly treated passing tests, asset validation, Blender previews, and FPS measurements as visual acceptance.

This was not caused by the user failing to explain 3D production. The prior handoff already required recognizable assets and gameplay-camera inspection. The failure was the chosen production method, execution quality, and failure to stop when runtime screenshots looked bad.

## Required interaction style

Invoke `$grill-me` and follow its one-question-at-a-time workflow.

- Ask only decisions that materially affect the visual outcome or viable production method.
- For every question, provide a recommended answer.
- Investigate codebase facts yourself.
- If the user does not know an art term or implementation detail, propose visual options instead of asking them to invent an answer.
- The user may answer with simple reactions such as “B is closest,” “less cartoony,” “still looks cheap,” or “recommend one.” That is sufficient input.
- Do not make the user select the least-bad option. Iterate when every direction is rejected.

## Planning sequence

1. Inspect the failed branch, documents, and runtime screenshots. Explain the concrete failure briefly and without blaming the user.
2. Establish visual taste before discussing implementation. Produce 3–4 distinct concept directions for Anakin, a B1 droid, and a small outpost combat tableau. Use image generation or reference boards so the user can react to images rather than abstract prose. Show characters at approximately gameplay-camera distance, not only portrait close-ups.
3. Resolve the asset-production strategy only after a direction is selected. Explicitly evaluate whether the target requires licensed base assets, specialized generation/modeling tools, deliberate manual Blender work, or a human 3D artist. Do not promise that Blender Python can generate artist-quality humanoid characters.
4. Resolve character silhouette/proportions, material language, palette, environment readability, lighting, animation expectations, asset provenance/licensing, performance constraints, and objective rejection criteria.
5. Define one vertical-slice approval milestone containing only Anakin, one B1, a small representative environment section, final-intent lighting/materials, and attack/reflection presentation using the real gameplay camera and HUD.
6. Require multiple 1920x1080 production-runtime screenshots of that slice. The user must explicitly approve them before any B2, beacon, additional droids, or full environment work is authorized.
7. Once shared understanding is reached, write `docs/visual-overhaul-v2-handoff.md`. Do not implement it in the planning task.

## Non-negotiable constraints for the replacement handoff

- No procedurally assembled final characters made from cubes, cylinders, or other visible primitives.
- Blender scripting may support export, validation, repetitive setup, and bounded hard-surface work; it may not substitute for deliberate final character modeling.
- No ripped or unlicensed third-party assets. Record the source and license for every adapted asset.
- Blender studio renders are supplemental evidence only. The primary quality gate is the production game at the normal camera distance.
- Tests, triangle counts, clean imports, FPS, and technical validation cannot establish visual quality.
- Do not build the complete asset set before validating and obtaining user approval for the vertical slice.
- If the selected visual target cannot be achieved with the available production method, stop and report that honestly rather than lowering the visual bar.
- Preserve current gameplay and physics unless the user explicitly approves a change.

## First question

After completing the read-only diagnosis, ask one question only:

> I recommend that I create several visual direction boards first so you can react to concrete images. Do you have any visual references you definitely want included, or should I begin from a grounded, Clone-Wars-inspired stylized direction and present alternatives?

Do not ask technical 3D questions.

## Deliverable

The planning task is complete only when:

- The user has selected and refined a visual direction using concrete images.
- A viable, honestly described asset-production method is agreed.
- Objective rejection criteria exist.
- The vertical-slice scope and mandatory approval gate are explicit.
- `docs/visual-overhaul-v2-handoff.md` captures the decisions.
- No implementation has begun.

## Suggested skills

- `$grill-me` / `grilling`: conduct the one-question-at-a-time decision interview.
- `imagegen`: generate visual direction boards and gameplay-distance concept tableaux for user reaction.
- `research`: only if current asset sources, tool capabilities, or licenses must be verified; prefer primary sources and record provenance.
- `computer-use:computer-use`: reserve for later Blender GUI inspection after the visual plan is approved, not during the planning task.
