import { useEffect, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Group } from 'three';
import { PatientModel } from './PatientModel';
import { getSceneGeometry } from './sceneGeometry';
import { advancePatientRoute, samplePatientPose } from './patientMotion';
import type { SimulatorState } from './types';

type Point = [number, number];
type Destination = 'waiting' | 'reception' | 'changing' | 'changing-complete' | 'corridor' | 'imaging';

// Start just in front of the intentionally empty waiting chair so the standing
// actor does not intersect the seat while still visibly joining from the hall.
const WAITING_START: Point = [-2.52, 8.03];
const RECEPTION_FRONT: Point = [5.88, 4.88];

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
  const [escortRequested, setEscortRequested] = useState(false);
  const { invalidate } = useThree();
  const motion = useRef<{ position: Point; path: Point[]; phase: Destination; running: boolean; time: number; lastTick: number; pauseUntil: number }>({
    position: WAITING_START, path: [], phase: 'waiting', running: false, time: 0, lastTick: performance.now(), pauseUntil: 0,
  });
  const phase: Destination = !escortRequested ? 'reception' : !gownHanded ? 'changing' : !patientPrepared ? 'changing-complete'
    : !patientInRoom && changingDoorClosed ? 'changing-complete' : !patientInRoom ? 'corridor' : 'imaging';
  useEffect(() => {
    if (!registered) setEscortRequested(false);
  }, [registered]);
  useEffect(() => {
    const follow = () => { if (registered) setEscortRequested(true); };
    window.addEventListener('xray-patient-follow', follow);
    return () => window.removeEventListener('xray-patient-follow', follow);
  }, [registered]);
  useEffect(() => {
    const m = motion.current;
    if (phase === 'reception') {
      if (m.phase !== 'reception') {
        m.position = WAITING_START;
        m.path = [[-2.05, 7.72], [-1.96, 6.58], [-1.96, 5.34], [2.35, 4.88], RECEPTION_FRONT];
        m.running = true;
        m.time = 0;
        m.pauseUntil = performance.now() + 850;
      }
    } else if (phase === 'changing-complete') {
      m.path = [];
      m.running = false;
    } else if (m.phase !== phase) {
      m.path = phase === 'changing'
        ? [[5.25, 4.88], [2.35, 4.88], [-2.95, 4.88], [-4.0, 4.88], [-5.51, 5.08]]
        : phase === 'corridor'
          ? [[-4.0, 4.88], [-2.54, 4.75]]
          : [[2.10, 4.75], [2.10, 2.75], [0.80, 1.40], getSceneGeometry(state).supine ? [0.5, 1.4] : [getSceneGeometry(state).patientPosition[0], getSceneGeometry(state).patientPosition[2]]];
      m.running = true;
      m.pauseUntil = performance.now() + (phase === 'changing' ? 650 : phase === 'corridor' ? 500 : 550);
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
    let moving = false;
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
      const departurePaused = now < m.pauseUntil;
      moving = !departurePaused && !waitingAtDoor && travel > 0;
      if (moving) m.position = advancePatientRoute(m.position, m.path, travel);
      if (moving) m.time += elapsed;
      if (!m.path.length) {
        m.running = false;
        if (m.phase === 'reception' || m.phase === 'changing' || m.phase === 'corridor' || m.phase === 'imaging') window.dispatchEvent(new CustomEvent('xray-patient-arrived', { detail: m.phase }));
      }
      if (moving || departurePaused) invalidate();
    }
    const pose = samplePatientPose(moving ? m.time : now / 1000, moving);
    actor.position.set(m.position[0], pose.stepLift * 0.38, m.position[1]);
    if (person.current) person.current.rotation.z = pose.pelvisRoll;
    actor.visible = phase !== 'imaging' || m.running;
  });

  return <group ref={group} position={[WAITING_START[0], 0, WAITING_START[1]]}>
    <group ref={person}>
      <PatientModel state={{ ...state, anatomy: 'surface', arms: 'down' }} garment={patientPrepared ? 'gown' : 'outpatient'} gait={motion} />
    </group>
  </group>;
}
