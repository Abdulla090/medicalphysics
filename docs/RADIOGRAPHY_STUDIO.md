# Radiography Studio — interactive teaching department

The `/tools/xray-simulator` route is an interactive **fictional clinical radiography exercise**. It combines a walkable department, modeled patient, equipment positioning, a synthetic projection engine, radiographic critique, a learning coach, and session export. It is built for students to practice reasoning, equipment geometry and workflow in a controlled environment. It is not a medical device, a diagnostic system or an accredited competency assessment.

## Student practice path

1. **Referral and identity:** Walk to reception and interact with the training patient. Ask for two stated identifiers and check the fictional referral, examination and indication.
2. **Preparation and safety:** Speak to the patient, resolve any scripted safety holds, remove relevant artifacts, provide a gown and ensure privacy while they change.
3. **Transfer:** Invite the patient from the changing room and escort them into Imaging 01. Wait for the actor to reach the correct examination equipment.
4. **Positioning:** Use the hand-hygiene station before patient contact. Align the patient manually, set rotation and arm position and inspect projected anatomical field coverage.
5. **Acquisition:** Arm the detector, enter the protected control room and close the door. Select a plausible protocol and technique, prepare the exposure and coordinate the time-limited intercom breath instruction.
6. **Critique and disposition:** The student must document four technical judgements before the model reveals its evidence. They may accept the exercise image with recorded flags or propose a technically justified repeat and return to repositioning.

The initial camera is **Walk**. Use WASD/arrow keys to move, drag to look, E for nearby actions, and the touch movement pad on phones. The top bar provides OSCE coach, Course, Training record and Imaging lab controls. The inspection studio offers independent camera views and direct access to numeric equipment settings.

## Learning systems

| System | What the student does | What the model reports |
| --- | --- | --- |
| Radiography Coach | Predict a priority fault from observed setup, state why it matters, test a one-variable counterfactual, document image findings | Priority workflow flags, simulated parameter consequences and a post-image structured assessment |
| Clinical instructor | Study six tailored learning stages; submit two questions per stage | Case-specific rationale, live setup observations and knowledge score |
| Physics workshop | Capture a baseline, change source distance, focal spot or collimator, predict increase/decrease/unchanged | Model-relative detector fluence, geometric blur or field area and target-crop estimate |
| Image critique station | Classify projection, alignment, coverage, respiration and explain any corrective repeat | Frozen acquisition-state evidence and transparent teaching score |
| Radiograph viewer | Window, zoom, invert and compare landmarks and quantitative image descriptors | Synthetic signal distribution, projected coverage margins and visual model observations |
| Shift log | Review student actions, scored questions and acquisitions; export JSON | Timestamped training events and captured settings (within current browser session) |

## Physics scope

The projection engine uses an analytical volumetric phantom and divergent rays. Its synthetic detector response depends on tube settings, distance, patient orientation and size, collimation, approximate attenuation, scatter, focal spot, motion and simulated photon/readout noise. Anatomical structures and simplified pulmonary vessels are procedural; all clinical case identifiers are fictional.

The metrics are **educational estimates**. Relative fluence is not air kerma, patient dose or a calibrated exposure index. Projected anatomy-envelope and signal statistics cannot determine whether actual radiographic anatomy is fully shown or whether another exposure is justified. Local protocols, qualified supervision and independent clinical validation remain essential.

## Verification and release boundaries

Use `npm run typecheck:simulator`, `npm run lint:simulator`, `npm run test:simulator` and `npm run build` before shipping changes. Browser smoke tests use `npx playwright test --config playwright.simulator.config.ts`; on Windows they can use an installed browser with `XRAY_TEST_CHROME_PATH` set to the Chrome executable.

Before institutional deployment, establish a clinician-approved curriculum, patient-safety and technique rubric, verified imaging geometry and measured equipment-specific calibration, independent reference phantom images for every supported view, multi-device performance budgets and failure recovery, accessibility coverage, privacy/data retention policy and an instructor-led acceptance study. These gates are not satisfied merely by passing automated software tests.
