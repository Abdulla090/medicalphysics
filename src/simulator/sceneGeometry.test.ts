import { describe, expect, it } from 'vitest';
import { Euler, Matrix4, Vector3 } from 'three';
import { DEFAULT_STATE, PROTOCOLS, applyProtocol } from './protocols';
import { objectDetectorDistance } from './physics';
import { getSceneGeometry } from './sceneGeometry';

describe('shared scene and acquisition geometry', () => {
  it('keeps the physical central-ray SID constant while angulating the tube', () => {
    for (const protocol of PROTOCOLS) for (const tubeAngle of [-30, 0, 30]) {
      const state = { ...applyProtocol(DEFAULT_STATE, protocol.id), tubeAngle };
      const { source, target } = getSceneGeometry(state);
      expect(new Vector3(...source).distanceTo(new Vector3(...target)) * 100).toBeCloseTo(state.sid, 9);
    }
  });
  it('transforms the image-engine source and detector into the rendered room for every projection', () => {
    for (const protocol of PROTOCOLS) for (const tubeAngle of [-20, 0, 20]) {
      const state = { ...applyProtocol(DEFAULT_STATE, protocol.id), tubeAngle };
      const geometry = getSceneGeometry(state);
      const base = new Matrix4().makeRotationFromEuler(new Euler(...geometry.patientRotation));
      const root = new Vector3(...geometry.patientPosition);
      const b = protocol.projection === 'PA' ? new Vector3(0, 0, 1) : protocol.projection === 'LAT' ? new Vector3(1, 0, 0) : new Vector3(0, 0, -1);
      const detector = b.clone().multiplyScalar(objectDetectorDistance(state));
      detector.y = protocol.centerY;
      const angle = tubeAngle * Math.PI / 180;
      const source = detector.clone().addScaledVector(b, -state.sid * Math.cos(angle));
      source.y += state.sid * Math.sin(angle);
      const toWorld = (point: Vector3) => point.multiplyScalar(0.01).applyMatrix4(base).add(root);
      expect(toWorld(detector).distanceTo(new Vector3(...geometry.target))).toBeLessThan(1e-9);
      expect(toWorld(source).distanceTo(new Vector3(...geometry.source))).toBeLessThan(1e-9);
    }
  });
  it('maps detector-plane patient displacement consistently in erect and supine postures', () => {
    for (const protocol of PROTOCOLS) {
      const baseState = applyProtocol(DEFAULT_STATE, protocol.id);
      const base = getSceneGeometry(baseState);
      const changed = getSceneGeometry({ ...baseState, patientOffsetX: 7, patientOffsetY: 4 });
      const u = protocol.projection === 'LAT' ? new Vector3(0, 0, -1) : new Vector3(1, 0, 0);
      const displacement = u.multiplyScalar(0.07).add(new Vector3(0, 0.04, 0)).applyEuler(new Euler(...base.patientRotation));
      const actual = new Vector3(...changed.patientPosition).sub(new Vector3(...base.patientPosition));
      expect(actual.distanceTo(displacement)).toBeLessThan(1e-9);
    }
  });
});
