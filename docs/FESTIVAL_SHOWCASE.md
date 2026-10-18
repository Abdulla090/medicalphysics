# University festival operation

## Start the showcase

From this repository, run `npm ci`, `npm run build`, then `npm run preview -- --host 127.0.0.1 --port 5175 --strictPort`.

Open `http://127.0.0.1:5175/tools/xray-simulator?festival&case=outpatient-chest`. The training catalogue also links to the festival encounter. An account is not required for practice. Keep the terminal serving the build open. This is a local preview, not a public deployment.

The welcome panel explains movement, looking, interaction and pause. Choose English or Sorani there. The question-mark button reopens the controls. The menu offers full screen where supported, graphics settings, report export, offline download and restart. Restart asks for confirmation and lets the operator select one of the five cases.

## Student flow

1. Ask and transcribe two identifiers, review the referral, obtain agreement, and complete registration.
2. Invite the patient to follow. Walk to the changing room, stay near the patient, discuss preparation, and hand over the gown.
3. Step outside, close the privacy door, and ask whether changing is complete. Reopen the door and invite the patient onward.
4. Lead the patient to Imaging 01. Use the hygiene dispenser, then adjust and confirm patient positioning. The live checks show what remains to correct.
5. Arm the detector and set the equipment. Enter the control room and close its lead door.
6. Prepare, give the breathing instruction, and deliberately expose while the instruction remains active. The real synthetic-imaging worker generates the image.
7. Review the source image using window, level, inversion and zoom. Record coverage, positioning and rationale before accepting or repeating. A repeat returns to positioning, then equipment.
8. Reopen the control-room door, return to the patient, explain completion and document the encounter. Escort the patient to the exit.
9. Finish and save. **Next student** starts a fresh encounter with the same case and welcome screen. Export the report before replacing an encounter if it is needed later.

The existing optional demo shortcuts remain available in practice. They are recorded as skips, excluded from academic assessment, and visibly identified as demonstrations. They never trigger an exposure. A shortcut demonstration is not evidence that a student completed the manual workflow.

## Prepare for unreliable Wi-Fi

On the finished production build, open the menu and choose **Download practice for offline use**. Wait for completion. Download progress reports the number of real files stored. The bundle includes room and patient assets, imaging code, English and Sorani fonts, and the application shell. It excludes authenticated API data.

Rehearse by disabling the network and reopening the practice page. Assigned assessments require a connection and remain paused when their evidence cannot be saved. Practice has an explicit in-memory fallback if device storage fails: keep the tab open, export the report and image, and retry saving from the menu. Closing that tab loses unsaved work.

## Recovery at the booth

- If a patient waits, return nearby and clear their path. Use the department map and current objective.
- If a breathing instruction expires, give it again before exposing.
- If processing fails or is canceled, prepare again and retry. Stale worker responses cannot replace the current image.
- If graphics are interrupted, use **Reopen 3D room**. The encounter remains in memory and the graphics profile drops to Low. Settings can be raised again from the menu.
- If a saved image is missing, use **Reload saved image** in review. No replacement image is fabricated.
- Use **Restart encounter** when deliberately handing the station to a new visitor midway through a case. The current report can be exported before confirmation.

## Release evidence and limits

See `FESTIVAL_SHOWCASE_HANDOFF.md` for the latest automated verification. Generated screenshots are in `artifacts/simulator/`.

This is an educational synthetic-imaging exhibit. Its model and teaching rubric are not clinical validation or certification. Faculty should approve the teaching content before the event. Rehearse on the actual festival laptop, display and phones with their production browsers; automated software-renderer tests do not establish physical-device frame rate or touch ergonomics.

Compatible dependency security updates were applied. The production dependency audit has no critical findings; remaining advisories include React Router 6 and build tooling that require broader version migrations. The repository is not represented as hardened for unrestricted public hosting. The raw audit is saved locally at `artifacts/festival-dependency-audit.json`.
