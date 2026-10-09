import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Group } from 'three';
import { PatientModel } from './PatientModel';
import { getSceneGeometry } from './sceneGeometry';
import { advancePatientRoute, samplePatientPose } from './patientMotion';
import type { SimulatorState } from './types';

type Point = [number, number];
type Destination = 'reception' | 'changing' | 'changing-complete' | 'corridor' | 'imaging';

/**
 * The same synthetic patient physically travels through the department.
 * Waypoints follow the actual corridor and door openings. This actor yields to
 * the exam-position phantom only after reaching the X-ray station.
 */
export function GamePatientActor({ state, registered, gownHanded = false, patientPrepared, patientInRoom, changingDoorClosed }: {
  state: SimulatorState; registered: boolean; gownHanded?: boolean; patientPrepared: boolean; patientInRoom: boolean; changingDoorClosed: boolean;
}) {
  const group = useRef<Group>(null);
  const person = useRef<Group>(null);
  const { invalidate } = useThree();
  const motion = useRef<{ position: Point; path: Point[]; phase: Destination; running: boolean; time: number; lastTick: number }>({
    position: [5.4, 4.3], path: [], phase: 'reception', running: false, time: 0, lastTick: performance.now(),
  });
  const phase: Destination = !registered ? 'reception' : !gownHanded ? 'changing' : !patientPrepared ? 'changing-complete'
    : !patientInRoom && changingDoorClosed ? 'changing-complete' : !patientInRoom ? 'corridor' : 'imaging';
  useEffect(() => {
    const m = motion.current;
    if (phase === 'reception') {
      m.position = [5.4, 4.3];
      m.path = [];
      m.running = false;
      m.time = 0;
    } else if (phase === 'changing-complete') {
      m.path = [];
      m.running = false;
    } else if (m.phase !== phase) {
      m.path = phase === 'changing'
        ? [[5.4, 4.88], [-2.95, 4.88], [-4.0, 4.88], [-5.51, 5.08]]
        : phase === 'corridor'
          ? [[-4.0, 4.88], [-2.54, 4.75]]
          : [[2.10, 4.75], [2.10, 2.75], [0.80, 1.40], getSceneGeometry(state).supine ? [0.5, 1.4] : [getSceneGeometry(state).patientPosition[0], getSceneGeometry(state).patientPosition[2]]];
      m.running = true;
    }
    m.phase = phase;
    m.lastTick = performance.now();
    invalidate();
  }, [phase, state, changingDoorClosed, invalidate]);

  useFrame(() => {
    const m = motion.current;
    const actor = group.current;
    if (!actor) return;
    const now = performance.now();
    const elapsed = Math.min(0.08, Math.max(0, (now - m.lastTick) / 1000));
    m.lastTick = now;
    if (m.running && m.path.length) {
      const [x, z] = m.path[0];
      const dx = x - m.position[0], dz = z - m.position[1];
      const desired = Math.atan2(dx, dz);
      actor.rotation.y += Math.atan2(Math.sin(desired - actor.rotation.y), Math.cos(desired - actor.rotation.y)) * Math.min(1, elapsed * 7);
      // Patient waits at the corridor-side threshold if someone closes the
      // changing door early; no animation may cross a solid privacy door.
      const waitingAtDoor = m.phase === 'changing' && changingDoorClosed && m.position[0] <= -2.951;
      const distanceToWaypoint = Math.hypot(dx, dz);
      // Ease the approach to each waypoint without walking on the spot or
      // overshooting the real doorway geometry after a delayed render frame.
      const approach = Math.min(1.18, Math.max(0.36, distanceToWaypoint * 2.0));
      const travel = m.phase === 'changing' && changingDoorClosed
        ? Math.min(elapsed * approach, Math.max(0, m.position[0] + 2.95))
        : elapsed * approach;
      if (!waitingAtDoor && travel > 0) m.position = advancePatientRoute(m.position, m.path, travel);
      if (travel > 0) m.time += elapsed;
      if (!m.path.length) {
        m.running = false;
        if (m.phase === 'changing' || m.phase === 'corridor' || m.phase === 'imaging') window.dispatchEvent(new CustomEvent('xray-patient-arrived', { detail: m.phase }));
      }
      if (!waitingAtDoor && travel > 0) invalidate();
    }
    const pose = samplePatientPose(m.running ? m.time : now / 1000, m.running);
    actor.position.set(m.position[0], pose.stepLift * 0.38, m.position[1]);
    if (person.current) person.current.rotation.z = pose.pelvisRoll;
    actor.visible = phase !== 'imaging' || m.running;
  });

  return <group ref={group} position={[5.4, 0, 4.3]}>
    <group ref={person}>
      <PatientModel state={{ ...state, anatomy: 'surface', arms: 'down' }} garment={patientPrepared ? 'gown' : 'outpatient'} gait={motion} />
    </group>
  </group>;
}
