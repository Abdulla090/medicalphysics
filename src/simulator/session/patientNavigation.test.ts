import { expect, test } from 'vitest';
import { createSession } from './clinicalSession';
import { findPatientRoute, patientColliders, pointBlocked } from './patientNavigation';
import { advancePatientRoute } from '../patientMotion';

test('escorted patient has a navigable path from reception to private changing room', () => {
  const s = createSession('route-test');
  const colliders = patientColliders(s.state, false, false);
  const from = {x:5.4,z:4.3}, to={x:-5.51,z:5.08};
  expect(pointBlocked(from,colliders)).toBe(false);
  expect(pointBlocked(to,colliders)).toBe(false);
  const route = findPatientRoute(from,to,colliders);
  expect(route, 'Patient path must exist through the open corridor and changing-room door').not.toBeNull();
  expect(route?.at(-1)).toEqual(to);
  const first = [...(route ?? []).map(p=>[p.x,p.z] as [number,number])];
  const next = advancePatientRoute([from.x,from.z],first,0.08);
  expect(pointBlocked({x:next[0],z:next[1]},colliders)).toBe(false);
  expect(first.length).toBeGreaterThan(0);
});
