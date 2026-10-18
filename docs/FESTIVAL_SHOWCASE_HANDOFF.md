# University festival showcase handoff

The user requested optional skips first, then an explicit stop to switch to Astra before the larger showcase readiness pass.

## Implemented shortcuts

The default `/tools/xray-simulator` encounter offers **Skip for demo** for registration, preparation/changing, escort, positioning and equipment setup. The same control appears inside workstation dialogs. Controls are localized in English and Sorani, and each shortcut is persisted as a `festival-skip` action with its stage. Manual progression remains available.

Equipment skipping brings the operator into the protected control room and opens the exposure station. Preparation, breathing instruction, deliberate exposure and image review still require user actions. Assessment sessions reject shortcuts in the shared transition validator; academic sessions hide them. Demonstrations display a footer disclosure and do not display a practice score in the guide. Registration dialogue is not rewritten to falsely claim manual identity verification.

Scope: the default clinical encounter; the `?studio` legacy interface is unchanged.

## Verification

- `npm run typecheck:simulator`
- `npm run lint:simulator`
- `npm run test:simulator` (140 tests, including all five case shortcut paths, replay, early exposure rejection, and assessment rejection)
- `npm run build`
- `$env:XRAY_SOFTWARE_RENDERER='1'; npm run test:simulator:browser -- tests/simulator/festival.spec.ts` (desktop and phone shortcut navigation and exposure interlocks)

## Next phase, after the user switches models

Audit and improve the whole encounter for a university festival: arrival and registration, physical navigation and patient routing, manual controls, protection, acquisition, review, discharge, rapid restart, failure recovery, bilingual accessibility, responsive presentation, offline behavior and target hardware performance. Preserve existing local work: this checkout already had many modified and untracked files before this phase.

Passing the shortcut checks does not establish overall showcase readiness, clinical accuracy, or performance on university hardware. The full walk-through and faculty/content review remain part of the larger pass. Do not declare the whole simulation production ready based on this first phase.
