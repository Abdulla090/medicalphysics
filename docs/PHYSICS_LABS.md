# Stage 1 physics laboratories

Open `/labs` from the Labs navigation item or the Stage 1 Physics Labs entry on Tools.

| Experiment | Route | Analysis |
| --- | --- | --- |
| Simple pendulum | `/labs/stage-1/simple-pendulum` | T² against L; g = 4π² / gradient |
| Hooke's law | `/labs/stage-1/hookes-law` | F against extension x; gradient = k |
| Ohm's law | `/labs/stage-1/ohms-law` | V against I; gradient = R |

## Teaching workflow

1. Read the Lab manual for objectives, apparatus, procedure, precautions, discussion questions, and primary textbook references.
2. Adjust the apparatus. For the pendulum, choose a small fixed release angle, vary length, and record three trials at each of at least five lengths.
3. Start measurement to release the simulated pendulum. Timing ends automatically after 5, 10, or 20 complete returns. Pause/resume preserves the current trajectory and clock. Playback speed changes the rate at which simulated time advances, not the physical period.
4. For physical work, use Enter bench reading. Pendulum input is length in metres, total elapsed time in seconds, and the number of oscillations. Hooke input is extension in metres and force in newtons. Ohm input is current in amperes and voltage in volts.
5. Use Analysis to view the fit and derived constant. Simulation and bench datasets are selected separately; they are never combined in a fit.
6. Record a student/group name and conclusion. Export CSV for the selected source, or Print report / Save as PDF to include observations, conclusion, graph, grouped data, and fit. The analysis is printed even when a different tab is open.

Teaching view reveals the predicted pendulum period for demonstrations. It is a display option, not an instructor authorization or assessment mechanism. The spring constant and resistance are locked after the first simulated reading to keep a dataset on one apparatus; deleting its simulated readings permits changing the constant.

## Physics and analysis

The pendulum uses fourth-order Runge-Kutta integration of θ̈ = -(g/L) sin θ. The maximum integration step is 1/240 simulated second. Complete oscillations are counted at successive positive turning points; the final crossing time is interpolated between integration steps. The independently calculated theoretical period uses the complete elliptic integral through the arithmetic-geometric mean. Reference gravitational acceleration is 9.80665 m/s². The model has no damping, finite bob size, or string mass. Bob mass only changes the rendered size and mechanical energy.

The displayed apparatus is schematic and explicitly not to scale. Dimensions and graphs use SI units. The small-angle T²-L fit is intentionally distinct from the nonlinear simulation: increasing release angle increases the period and biases the small-angle estimate of g downward. The interface flags release angles above 10 degrees and datasets with changing release angles.

Hooke's law records static equilibrium F = mg = kx. Its 3D apparatus includes a steel helical spring, stand and clamp, a centimetre ruler with millimetre graduations, pointer, 50 g hanger, and slotted brass masses. A load change drives an exact underdamped response with damping ratio 0.32; velocity is retained if the load changes again during motion. Recording waits for settlement. Reduced motion snaps to equilibrium. The rendered coil changes pitch while preserving wire diameter. Scene units are five per metre, with the unloaded endpoint aligned to the ruler zero.

Ohm's law uses V = IR with ideal meters and a constant-temperature 5 W resistor. The 3D circuit routes supply positive through the series milliammeter to the resistor, and returns to supply negative; a separate voltmeter is connected across the resistor. Supply, meter displays, HTML readings, and recorded values use the same state. The output switch sets current, voltage, and power to zero and disables recording while off. The supply's 3D voltage knob advances the same voltage setting as the labelled HTML control. These remain introductory ideal models, not apparatus calibration tools or a thermal simulation.

Both benches provide orbit and zoom controls, overview/front/close-up cameras, reset, and a schematic diagram. WebGL failure falls back to the diagram. Geometry, panel textures, lighting, and reflection softboxes are generated locally; no remote model, font, or HDRI fetch is required for the 3D apparatus. The scene renders on demand and invalidates while the spring or camera moves. Hardware frame rate has not been benchmarked.

Repeated periods at each exact recorded length are averaged before squaring. Other labs average repeated y values at each x. Fits use unweighted least squares with a free intercept, one point per distinct setting. Error bars show propagated standard error of repeated observations where repeats exist. The slope uncertainty uses residual scatter with n-2 degrees of freedom; it requires at least three distinct settings. This fit is not weighted by those error bars and ignores x uncertainty. The g uncertainty propagates slope uncertainty only. Instrument resolution, reaction time, reference-value variation, and systematic effects need separate treatment in a physical report. Negligible scatter in ideal data is not evidence of physical accuracy.

CSV exports retain full internal precision, SI unit headers, source, and timestamps; pendulum exports also retain amplitude and bob mass for simulated trials. Table values are rounded only for display.

## Persistence and boundaries

Notebooks are stored per experiment in versioned browser local storage under `physics-lab:v1:<experiment>`. Readings, source selection, student/group, and notes persist on that browser/device. Settings and unfinished runs do not persist. Reset apparatus retains the notebook. Individual readings can be deleted. Each notebook is capped at 500 readings. Invalid stored data is rejected and a storage notice is shown. A browser storage failure is surfaced so that the user can export before leaving.

There is no server sync, roster, graded submission, instructor role, or university assessment integration in this module. Review the existing training authorization model before adding any of those features. Simulated observations remain explicitly labelled as model data.

The lab has English and Sorani UI, RTL layout, a white and charcoal interface, keyboard-operated tabs, labelled controls and charts, and reduced-motion control feedback. The lab deliberately keeps its white surface when the surrounding app is in dark mode. Explanatory copy lives in the manual and the expandable analysis method section. Pendulum motion starts on an explicit measurement action and remains pausable; spring motion follows changes in load. Simulated time suspends while the page is hidden, and frame delta is capped after stalls.

## Verification

Run from the nested `medicalphysics` checkout:

```powershell
npm run typecheck:labs
npm run lint:labs
npm run test:labs
npm run test:labs:browser
npm run build
```

Numerical tests cover the small-angle and elliptic periods, trajectory energy, full-cycle timing, regression, repeated-reading aggregation, derived constants, persistence input validation, and CSV precision. Browser tests cover all three experiments, pause/resume, stored notebooks, physical data entry and source separation, printing, export, mobile overflow, Sorani, dark mode, and automated accessibility checks. Visual review artifacts are generated in `artifacts/labs`.

Software checks do not replace review of the teaching method, uncertainty conventions, and Sorani terminology by the department before use in a formal course.
