import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { Euler, PerspectiveCamera, Vector3, type Camera } from 'three';
import type { CameraView, SimulatorState } from './types';
import { getSceneGeometry } from './sceneGeometry';
import type { Point3 } from './sceneGeometry';
import { getRoomColliders, moveObserver } from './RoomMovement';

type ControlsProps = {
  state: SimulatorState;
  view: CameraView;
  cameraReset: number;
  onWalkChange?: (walking: boolean) => void;
  barrierClosed?: boolean;
  paused?: boolean;
};

type SpringState = {
  position: Vector3;
  target: Vector3;
  positionVelocity: Vector3;
  targetVelocity: Vector3;
  moving: boolean;
};

const MOVEMENT_KEYS = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowLeft', 'ArrowDown', 'ArrowRight', 'ShiftLeft', 'ShiftRight', 'KeyC']);
const WALK_CODES = { forward: 'KeyW', backward: 'KeyS', left: 'KeyA', right: 'KeyD' } as const;
const temporary = new Vector3();
const lookRotation = new Euler(0, 0, 0, 'YXZ');

function getPreset(view: CameraView, state: SimulatorState): { position: Point3; target: Point3 } {
  const geometry = getSceneGeometry(state);
  const { target, source, supine } = geometry;
  switch (view) {
    case 'patient': return supine
      ? { position: [1.56, 2.24, 1.93], target: [-0.45, 0.97, 0.50] }
      : { position: [2.1, 1.64, -0.16], target: [0.65, 1.15, -1.95] };
    case 'tube': return { position: [source[0] + 1.15, source[1] + 0.72, source[2] + 1.05], target: source };
    case 'detector': return supine
      ? { position: [0.45, 1.69, target[2] + 1.31], target: [-0.45, 0.78, target[2]] }
      : { position: [-0.80, 1.87, -0.46], target: [0.65, 1.24, -2.15] };
    case 'first-person': return { position: [2.13, 1.62, 2.30], target: [0.54, 1.35, -1.7] };
    default: return { position: [4.12, 2.57, 4.31], target: [-0.15, 1.30, -0.46] };
  }
}

/** First person uses the active render camera. Orbit remains available for inspection. */
export function SceneControls({ state, view, cameraReset, onWalkChange, barrierClosed = true, paused = false }: ControlsProps) {
  const { camera, gl, invalidate, size } = useThree();
  const orbit = useRef<React.ComponentRef<typeof OrbitControls>>(null);
  const spring = useRef<SpringState>({ position: new Vector3(), target: new Vector3(), positionVelocity: new Vector3(), targetVelocity: new Vector3(), moving: false });
  const keys = useRef(new Set<string>());
  const look = useRef({ yaw: 0, pitch: 0 });
  const dragging = useRef(false);
  const pointer = useRef({ id: -1, x: 0, y: 0 });
  const walking = useRef(false);
  const manipulating = useRef(false);
  const crouching = useRef(false);
  const previousView = useRef<CameraView | null>(null);
  const previousReset = useRef(cameraReset);
  const roamPose = useRef<{ position: Vector3; yaw: number; pitch: number; crouching: boolean } | null>(null);
  const callback = useRef(onWalkChange);
  callback.current = onWalkChange;
  const pause = useRef(paused);
  pause.current = paused;
  const reportedPose = useRef<number[]>([]);
  const reportedRotation = useRef(new Euler(0, 0, 0, 'YXZ'));

  const reportPose = (observer: Camera) => {
    const position = observer.position;
    const rotation = observer.quaternion;
    const next = [position.x, position.y, position.z, rotation.x, rotation.y, rotation.z, rotation.w];
    if (next.every((value, index) => value === reportedPose.current[index])) return;
    reportedPose.current = next;
    reportedRotation.current.setFromQuaternion(rotation, 'YXZ');
    // Developer diagnostics describe the render camera; they do not drive the interface.
    gl.domElement.dataset.observerPosition = JSON.stringify([position.x, position.y, position.z].map((value) => Number(value.toFixed(5))));
    gl.domElement.dataset.observerYaw = reportedRotation.current.y.toFixed(6);
    gl.domElement.dataset.observerPitch = reportedRotation.current.x.toFixed(6);
  };

  useEffect(() => {
    if (paused) {
      keys.current.clear();
      dragging.current = false;
      spring.current.moving = false;
      if (walking.current) callback.current?.(false);
      walking.current = false;
      const canvas = gl.domElement;
      if (pointer.current.id >= 0 && canvas.hasPointerCapture(pointer.current.id)) canvas.releasePointerCapture(pointer.current.id);
      if (document.pointerLockElement === canvas) document.exitPointerLock();
    }
    invalidate();
  }, [paused, gl, invalidate]);

  useEffect(() => {
    if (!(camera instanceof PerspectiveCamera)) return;
    const aspect = size.width / Math.max(1, size.height);
    const framing = view === 'room' ? Math.max(1, 1.25 / aspect) : 1;
    camera.fov = view === 'first-person' ? 60 : Math.min(76, 2 * Math.atan(Math.tan(43 * Math.PI / 360) * framing) * 180 / Math.PI);
    camera.updateProjectionMatrix();
    invalidate();
  }, [camera, invalidate, size.width, size.height, view]);

  useEffect(() => {
    const canvas = gl.domElement;
    const pressedKeys = keys.current;
    canvas.tabIndex = 0;
    canvas.setAttribute('aria-label', 'Interactive radiography room. W A S D or arrow keys walk, Shift moves faster, C changes stance, E uses equipment. Hold the right mouse button and drag to look. Left drag uses equipment or looks around empty space. Double click enables mouse look. Escape releases mouse look.');
    canvas.style.touchAction = 'none';
    canvas.style.outlineOffset = '-3px';
    return () => {
      pressedKeys.clear();
      callback.current?.(false);
    };
  }, [gl]);

  useEffect(() => {
    const resetRequested = previousReset.current !== cameraReset;
    if (previousView.current === 'first-person' && view !== 'first-person') {
      roamPose.current = { position: camera.position.clone(), ...look.current, crouching: crouching.current };
    }
    const preserveRoam = view === 'first-person' && !resetRequested && (previousView.current === 'first-person' || roamPose.current);
    previousView.current = view;
    previousReset.current = cameraReset;
    if (preserveRoam) {
      if (roamPose.current) {
        camera.position.copy(roamPose.current.position);
        look.current = { yaw: roamPose.current.yaw, pitch: roamPose.current.pitch };
        crouching.current = roamPose.current.crouching;
        lookRotation.set(look.current.pitch, look.current.yaw, 0);
        camera.quaternion.setFromEuler(lookRotation);
        roamPose.current = null;
      }
      camera.updateMatrixWorld(true);
      invalidate();
      return;
    }
    const preset = getPreset(view, state);
    spring.current.position.set(...preset.position);
    spring.current.target.set(...preset.target);
    spring.current.positionVelocity.set(0, 0, 0);
    spring.current.targetVelocity.set(0, 0, 0);
    keys.current.clear();
    dragging.current = false;
    walking.current = false;
    crouching.current = false;
    manipulating.current = false;
    callback.current?.(false);
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (view === 'first-person' || reduceMotion) {
      camera.position.set(...preset.position);
      camera.lookAt(...preset.target);
      orbit.current?.target.set(...preset.target);
      orbit.current?.update();
      const euler = new Euler().setFromQuaternion(camera.quaternion, 'YXZ');
      look.current = { yaw: euler.y, pitch: euler.x };
      spring.current.moving = false;
      camera.updateMatrixWorld(true);
    } else {
      spring.current.moving = true;
    }
    invalidate();
    // Changing a protocol reframes the rig; technique adjustments preserve the viewpoint.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, cameraReset, state.protocol, camera, invalidate]);

  useEffect(() => {
    const canvas = gl.domElement;
    const clear = () => {
      keys.current.clear();
      dragging.current = false;
      if (walking.current) callback.current?.(false);
      walking.current = false;
    };
    const down = (event: KeyboardEvent) => {
      const locked = document.pointerLockElement === canvas;
      if (pause.current || view !== 'first-person' || (!locked && document.activeElement !== canvas)) return;
      if (event.target instanceof HTMLElement && event.target.closest('input, textarea, select, [contenteditable="true"]')) return;
      if (event.code === 'Escape') {
        if (locked) document.exitPointerLock();
        canvas.blur();
        clear();
        return;
      }
      if (!MOVEMENT_KEYS.has(event.code) || manipulating.current) return;
      event.preventDefault();
      if (event.code === 'KeyC') {
        if (!event.repeat) crouching.current = !crouching.current;
        invalidate();
        return;
      }
      keys.current.add(event.code);
      invalidate();
    };
    const up = (event: KeyboardEvent) => {
      keys.current.delete(event.code);
      if (MOVEMENT_KEYS.has(event.code)) invalidate();
    };
    const pointerDown = (event: PointerEvent) => {
      const rightLook = view === 'first-person' && event.button === 2;
      if (pause.current || event.button !== 0 && !rightLook) return;
      canvas.focus({ preventScroll: true });
      spring.current.moving = false;
      if (view !== 'first-person' || manipulating.current || document.pointerLockElement === canvas) return;
      dragging.current = true;
      pointer.current = { id: event.pointerId, x: event.clientX, y: event.clientY };
      canvas.setPointerCapture(event.pointerId);
    };
    const turn = (dx: number, dy: number) => {
      if (pause.current || view !== 'first-person' || manipulating.current) return;
      look.current.yaw -= dx * 0.0031;
      look.current.pitch = Math.max(-1.25, Math.min(1.25, look.current.pitch - dy * 0.0031));
      lookRotation.set(look.current.pitch, look.current.yaw, 0);
      camera.quaternion.setFromEuler(lookRotation);
      camera.updateMatrixWorld(true);
      invalidate();
    };
    const pointerMove = (event: PointerEvent) => {
      if (document.pointerLockElement === canvas || !dragging.current || event.pointerId !== pointer.current.id) return;
      const dx = event.clientX - pointer.current.x;
      const dy = event.clientY - pointer.current.y;
      pointer.current.x = event.clientX;
      pointer.current.y = event.clientY;
      turn(dx, dy);
    };
    const lockedMove = (event: MouseEvent) => {
      if (document.pointerLockElement === canvas) turn(event.movementX, event.movementY);
    };
    const pointerUp = (event: PointerEvent) => {
      if (pointer.current.id !== event.pointerId) return;
      dragging.current = false;
      if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
    };
    const touchWalk = (event: Event) => {
      if (pause.current || view !== 'first-person' || manipulating.current) return;
      const detail = (event as CustomEvent<{ direction: keyof typeof WALK_CODES; pressed: boolean }>).detail;
      if (!detail || !(detail.direction in WALK_CODES)) return;
      const code = WALK_CODES[detail.direction];
      if (detail.pressed) keys.current.add(code);
      else keys.current.delete(code);
      invalidate();
    };
    const lockPointer = () => {
      if (pause.current || view !== 'first-person' || manipulating.current || document.pointerLockElement === canvas || !canvas.requestPointerLock) return;
      canvas.focus({ preventScroll: true });
      dragging.current = false;
      if (pointer.current.id >= 0 && canvas.hasPointerCapture(pointer.current.id)) canvas.releasePointerCapture(pointer.current.id);
      try { Promise.resolve(canvas.requestPointerLock()).catch(() => { /* Drag look remains available if pointer lock is denied. */ }); }
      catch { /* Browsers without pointer lock retain the same drag controls. */ }
    };
    const lockChanged = () => {
      clear();
      if (document.pointerLockElement === canvas) canvas.focus({ preventScroll: true });
      else canvas.blur();
    };
    const manipulationChanged = (event: Event) => {
      const detail = (event as CustomEvent<boolean | { active: boolean }>).detail;
      manipulating.current = typeof detail === 'boolean' ? detail : !!detail?.active;
      if (manipulating.current) clear();
    };
    const visibilityChanged = () => { if (document.hidden) clear(); };
    const contextMenu = (event: MouseEvent) => { if (view === 'first-person') event.preventDefault(); };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    canvas.addEventListener('blur', clear);
    canvas.addEventListener('pointerdown', pointerDown);
    canvas.addEventListener('pointermove', pointerMove);
    canvas.addEventListener('pointerup', pointerUp);
    canvas.addEventListener('pointercancel', pointerUp);
    window.addEventListener('blur', clear);
    window.addEventListener('xray-walk', touchWalk);
    canvas.addEventListener('dblclick', lockPointer);
    canvas.addEventListener('contextmenu', contextMenu);
    document.addEventListener('mousemove', lockedMove);
    document.addEventListener('pointerlockchange', lockChanged);
    document.addEventListener('visibilitychange', visibilityChanged);
    window.addEventListener('xray-roam', lockPointer);
    window.addEventListener('xray-manipulating', manipulationChanged);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      canvas.removeEventListener('blur', clear);
      canvas.removeEventListener('pointerdown', pointerDown);
      canvas.removeEventListener('pointermove', pointerMove);
      canvas.removeEventListener('pointerup', pointerUp);
      canvas.removeEventListener('pointercancel', pointerUp);
      window.removeEventListener('blur', clear);
      window.removeEventListener('xray-walk', touchWalk);
      canvas.removeEventListener('dblclick', lockPointer);
      canvas.removeEventListener('contextmenu', contextMenu);
      document.removeEventListener('mousemove', lockedMove);
      document.removeEventListener('pointerlockchange', lockChanged);
      document.removeEventListener('visibilitychange', visibilityChanged);
      window.removeEventListener('xray-roam', lockPointer);
      window.removeEventListener('xray-manipulating', manipulationChanged);
      if (document.pointerLockElement === canvas) document.exitPointerLock();
      clear();
    };
  }, [view, camera, gl, invalidate]);

  useFrame((frameState, rawDelta) => {
    if (pause.current) {
      reportPose(frameState.camera);
      return;
    }
    // Swept collision steps keep walking stable even on slower renderers.
    // The inspection spring retains its smaller integration step.
    const delta = Math.max(0, Math.min(rawDelta, view === 'first-person' ? 0.25 : 0.05));
    if (view === 'first-person') {
      const observer = frameState.camera;
      const pressed = keys.current;
      const forward = Number(pressed.has('KeyW') || pressed.has('ArrowUp')) - Number(pressed.has('KeyS') || pressed.has('ArrowDown'));
      const right = Number(pressed.has('KeyD') || pressed.has('ArrowRight')) - Number(pressed.has('KeyA') || pressed.has('ArrowLeft'));
      const moving = !!(forward || right) && !manipulating.current;
      if (moving !== walking.current) {
        walking.current = moving;
        callback.current?.(moving);
      }
      const speed = crouching.current ? 0.75 : pressed.has('ShiftLeft') || pressed.has('ShiftRight') ? 2.1 : 1.35;
      const length = Math.hypot(forward, right) || 1;
      const sin = Math.sin(look.current.yaw);
      const cos = Math.cos(look.current.yaw);
      const dx = moving ? (-sin * forward + cos * right) / length * speed * delta : 0;
      const dz = moving ? (-cos * forward - sin * right) / length * speed * delta : 0;
      const eyeHeight = crouching.current ? 1.12 : 1.62;
      const next = moveObserver(observer.position, { x: dx, z: dz }, getRoomColliders(state, eyeHeight, barrierClosed));
      observer.position.set(next.x, eyeHeight, next.z);
      // Update the render camera's matrices explicitly; input can arrive between demand frames.
      lookRotation.set(look.current.pitch, look.current.yaw, 0);
      observer.quaternion.setFromEuler(lookRotation);
      observer.updateMatrix();
      observer.updateMatrixWorld(true);
      reportPose(observer);
      if (moving) invalidate();
      return;
    }
    const animation = spring.current;
    if (!animation.moving || !orbit.current) {
      reportPose(frameState.camera);
      return;
    }
    // Critically damped spring (mass 1, stiffness 100, damping 20), interruptible by drag.
    const step = (current: Vector3, goal: Vector3, velocity: Vector3) => {
      temporary.copy(goal).sub(current).multiplyScalar(100).addScaledVector(velocity, -20);
      velocity.addScaledVector(temporary, delta);
      current.addScaledVector(velocity, delta);
    };
    step(camera.position, animation.position, animation.positionVelocity);
    step(orbit.current.target, animation.target, animation.targetVelocity);
    orbit.current.update();
    reportPose(frameState.camera);
    if (camera.position.distanceToSquared(animation.position) < 0.000008 && orbit.current.target.distanceToSquared(animation.target) < 0.000008 && animation.positionVelocity.lengthSq() < 0.00008) {
      camera.position.copy(animation.position);
      orbit.current.target.copy(animation.target);
      orbit.current.update();
      animation.moving = false;
    } else invalidate();
  });

  return (
    <OrbitControls
      ref={orbit}
      enabled={view !== 'first-person' && !paused}
      makeDefault
      enableDamping
      dampingFactor={0.09}
      minDistance={0.7}
      maxDistance={9.5}
      minPolarAngle={0.15}
      maxPolarAngle={Math.PI * 0.485}
      target={[-0.15, 1.30, -0.46]}
      onStart={() => { spring.current.moving = false; }}
    />
  );
}
