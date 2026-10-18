# Radiography character assets

## Current sources

The visible patients and receptionist use four articulated anatomical variants adapted in Blender from the MakeHuman CC0 system assets. Faces, hands, skin and eye textures, fitted everyday clothing and four hair styles replace the earlier procedural mannequin. Body proportions and clothing colours vary independently from the clinical acquisition model. Original vendor files and their license headers are preserved in `assets/radiography/vendor/makehuman`; `PROVENANCE.md` lists the official sources and `SHA256.json` records their hashes.

`assets/radiography/clinical-adult.blend`, `clinical-adult-female.blend`, `clinical-adult-older.blend` and `clinical-adult-dark.blend` are editable sources. The crowd includes fitted button shirts, a plain short-sleeve top, a long-sleeve top and an older adult in a jacket. `authored-garments.blend` retains the original project gown. The generator fits that garment to each anatomy and rebinds its joint weights. These are game presentation assets, not a validated anatomical acquisition model.

## Rebuild and verify

1. Optional texture regeneration: `py scripts/prepare-character-textures.py` (Pillow).
2. `npm run assets:characters` (Blender 5.2, or set `BLENDER_PATH`).
3. `node scripts/validate-character-assets.mjs`.
4. `npm run build` regenerates the public offline bundle manifest.

The runtime loads local Draco decoders and compressed glTF files, clones skeletons for independent poses, and shares geometry/texture buffers. Crowd variants retain facial topology while reducing clothing geometry and texture resolution. Files remain below the 5 MB per-character transfer budget enforced by the asset check. The public practice bundle does not contain Blender sources or the downloaded vendor pack.

## Visual checks

Use the installed Chrome executable for the browser tests on this Windows host. The bundled headless software renderer is too slow to serve as a useful performance benchmark here.

```powershell
$env:XRAY_TEST_BASE_URL='http://127.0.0.1:5175'
$env:XRAY_TEST_CHROME_PATH='C:\Program Files\Google\Chrome\Application\chrome.exe'
npm run test:simulator:browser -- visuals.spec.ts room.spec.ts
```

`visuals.spec.ts` walks through registration and the populated hall with actual keyboard and mouse input and saves captures in `artifacts/simulator`. Frame-interval diagnostics include demand-render idle gaps; they are not hardware acceptance measurements.

Department props, interaction design and anatomical glove assets are documented in `DEPARTMENT_ART_DIRECTION.md`.
