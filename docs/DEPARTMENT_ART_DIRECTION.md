# Department presentation and interaction

The clinical game fills the viewport. Its instrument layer shows one current action, encounter progress, a portal-aware direction arrow and an optional floor plan. Completed conversation questions fold into history; identity checks, screening, positioning, equipment setup, privacy, exposure and image disposition remain deliberate learner actions. Only currently available nearby targets receive focus brackets.

The waiting hall has nine authored seats, eight articulated adults, personal belongings, acoustic wall panels and an original champagne-metal wave relief. Interior lighting is anchored in reception, imaging and waiting. Doors and character articulation refresh their shadows. New ground objects have footprints in `sceneManifest.ts`, shared with navigation and collisions.

## Original assets

`assets/radiography/department-props.blend` contains editable, named parts for a wheelchair, drawer trolley, leather bag, reading stack and wall relief. The runtime GLB joins parts by material and uses local Draco compression. The kit is approximately 164 KiB. `scripts/build-department-assets.py` rebuilds it in Blender and re-exports the retained original `waiting-chair.blend`.

`assets/radiography/clinical-hands.blend` contains anatomical glove meshes derived from the CC0 character source. `scripts/build-clinical-hands.py` rebuilds this source and its 21 KiB local runtime export. Its underlying anatomy carries the same MakeHuman CC0 provenance as the adults.

Rebuild these scripts with Blender in background mode. Run `node scripts/validate-department-assets.mjs`, `node scripts/validate-character-assets.mjs`, the simulator checks, and the production build. `tests/simulator/visuals.spec.ts` walks the department using actual inputs; `room.spec.ts` exercises all five manual encounters and the Sorani phone layout. `offline.spec.ts` requires a production preview and checks the explicitly downloaded public bundle.

Presentation assets do not change the synthetic acquisition phantom or clinical scoring. These changes are a browser game implementation; PS5 hardware, a physical controller, institutional clinical acceptance and production faculty deployment are not certified by these checks.
