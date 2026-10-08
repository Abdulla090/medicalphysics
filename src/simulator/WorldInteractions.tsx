import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Group, Raycaster, Vector2, Vector3 } from 'three';
import { getAimedTarget, getWorldTargets, isOperatorProtected, manipulateTarget, type WorldTarget, type WorldTargetId } from './worldInteraction';
import type { SimulatorState } from './types';

export type WorldAction = 'use' | 'pose' | 'breath' | 'grid' | 'light' | 'parameter' | 'protocol' | 'review' | 'focal' | 'girth-up' | 'girth-down' | 'wheel-up' | 'wheel-down';
export interface WorldInteractionProps {
  state: SimulatorState;
  enabled: boolean;
  disabled: boolean;
  barrierClosed: boolean;
  onHover: (target: WorldTargetId | null) => void;
  onSelect: (target: WorldTargetId) => void;
  onAction: (target: WorldTargetId, action: WorldAction) => void;
  onManipulate: (state: SimulatorState) => void;
  onProtectionChange: (protectedPosition: boolean) => void;
  onGrip: (holding: boolean) => void;
  paused: boolean;
}

const direction = new Vector3();
const ray = new Raycaster();
const pointer = new Vector2();

/** Actual room reach and camera aim govern interaction. Pointer motion moves apparatus. */
export function WorldInteractions(props: WorldInteractionProps) {
  const { camera, gl, invalidate } = useThree();
  const live = useRef(props);
  live.current = props;
  const aimed = useRef<WorldTarget | null>(null);
  const previousHover = useRef<WorldTargetId | null>(null);
  const protection = useRef<boolean | undefined>();
  const grip = useRef<{ target: WorldTargetId; start: SimulatorState; dx: number; dy: number; x: number; y: number; mode: 'move' | 'rotate' } | null>(null);
  const hands = useRef<Group>(null);
  const marker = useRef<Group>(null);

  useEffect(() => { protection.current = undefined; }, [props.disabled, props.enabled, props.barrierClosed]);

  useFrame(({ camera: observer }) => {
    if (!live.current.enabled) return;
    observer.getWorldDirection(direction);
    const targets = getWorldTargets(live.current.state);
    const target = getAimedTarget(observer.position.toArray(), direction.toArray(), targets, live.current.barrierClosed);
    aimed.current = target;
    if ((target?.id ?? null) !== previousHover.current) {
      previousHover.current = target?.id ?? null;
      live.current.onHover(previousHover.current);
    }
    const protectedPosition = isOperatorProtected(observer.position.toArray(), live.current.barrierClosed);
    if (protectedPosition !== protection.current && !live.current.disabled) {
      protection.current = protectedPosition;
      live.current.onProtectionChange(protectedPosition);
    }
    if (hands.current) {
      hands.current.visible = !!grip.current;
      hands.current.position.copy(observer.position);
      hands.current.quaternion.copy(observer.quaternion);
    }
    if (marker.current) {
      marker.current.visible = !!target && !live.current.paused;
      if (target) {
        marker.current.position.set(...target.position);
        marker.current.scale.setScalar(Math.min(target.radius, 0.18));
        marker.current.quaternion.copy(observer.quaternion);
      }
    }
  });

  useEffect(() => {
    const canvas = gl.domElement;
    const permitted = () => live.current.enabled && !live.current.disabled && !live.current.paused;
    const focused = () => document.activeElement === canvas || document.pointerLockElement === canvas;
    const atPointer = (event: PointerEvent) => {
      if (document.pointerLockElement === canvas) return aimed.current;
      const bounds = canvas.getBoundingClientRect();
      pointer.set((event.clientX - bounds.left) / bounds.width * 2 - 1, -(event.clientY - bounds.top) / bounds.height * 2 + 1);
      ray.setFromCamera(pointer, camera);
      return getAimedTarget(camera.position.toArray(), ray.ray.direction.toArray(), getWorldTargets(live.current.state), live.current.barrierClosed);
    };
    const action = (id: WorldTargetId, type: WorldAction) => {
      live.current.onSelect(id);
      live.current.onAction(id, type);
      invalidate();
    };
    const keydown = (event: KeyboardEvent) => {
      if (!permitted() || !focused() || event.repeat) return;
      const keys: Record<string, WorldAction> = { KeyE: 'use', KeyR: 'pose', KeyB: 'breath', KeyG: 'grid', KeyL: 'light', KeyT: 'parameter', KeyN: 'protocol', KeyV: 'review', KeyX: 'focal', BracketRight: 'girth-up', BracketLeft: 'girth-down' };
      const type = keys[event.code];
      if (!type || !aimed.current) return;
      event.preventDefault();
      action(aimed.current.id, type);
    };
    const down = (event: PointerEvent) => {
      if (!permitted() || event.button !== 0) return;
      const target = atPointer(event);
      if (!target) return;
      canvas.focus({ preventScroll: true });
      live.current.onSelect(target.id);
      if (target.id === 'tube' || target.id === 'patient' || target.id === 'table') {
        grip.current = { target: target.id, start: live.current.state, dx: 0, dy: 0, x: event.clientX, y: event.clientY, mode: event.shiftKey ? 'rotate' : 'move' };
        window.dispatchEvent(new CustomEvent('xray-manipulating', { detail: true }));
        live.current.onGrip(true);
        if (document.pointerLockElement !== canvas) canvas.setPointerCapture(event.pointerId);
      } else action(target.id, 'use');
      invalidate();
    };
    const move = (event: PointerEvent) => {
      const held = grip.current;
      if (!held || !permitted()) return;
      const locked = document.pointerLockElement === canvas;
      held.dx += locked ? event.movementX : event.clientX - held.x;
      held.dy += locked ? event.movementY : event.clientY - held.y;
      held.x = event.clientX; held.y = event.clientY;
      if (Math.abs(held.dx) + Math.abs(held.dy) > 3) live.current.onManipulate(manipulateTarget(held.start, held.target, held.dx, held.dy, held.mode));
      invalidate();
    };
    const release = () => {
      if (!grip.current) return;
      grip.current = null;
      window.dispatchEvent(new CustomEvent('xray-manipulating', { detail: false }));
      live.current.onGrip(false);
      invalidate();
    };
    const wheel = (event: WheelEvent) => {
      if (!permitted() || !aimed.current) return;
      if (aimed.current.id !== 'tube' && aimed.current.id !== 'console') return;
      event.preventDefault();
      action(aimed.current.id, event.deltaY < 0 ? 'wheel-up' : 'wheel-down');
    };
    const select = (event: Event) => {
      if (!permitted()) return;
      const id = (event as CustomEvent<WorldTargetId>).detail;
      const target = getWorldTargets(live.current.state).find((item) => item.id === id);
      if (target && camera.position.distanceTo(new Vector3(...target.position)) <= target.reach + target.radius) live.current.onSelect(id);
    };
    canvas.addEventListener('keydown', keydown);
    canvas.addEventListener('pointerdown', down);
    canvas.addEventListener('wheel', wheel, { passive: false });
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', release);
    window.addEventListener('pointercancel', release);
    window.addEventListener('blur', release);
    window.addEventListener('xray-select-object', select);
    return () => {
      release();
      canvas.removeEventListener('keydown', keydown);
      canvas.removeEventListener('pointerdown', down);
      canvas.removeEventListener('wheel', wheel);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', release);
      window.removeEventListener('pointercancel', release);
      window.removeEventListener('blur', release);
      window.removeEventListener('xray-select-object', select);
    };
  }, [camera, gl, invalidate]);

  return <>
    <group ref={marker} visible={false}><mesh><ringGeometry args={[0.88, 1, 48]} /><meshBasicMaterial color="#5c816d" transparent opacity={0.6} depthWrite={false} /></mesh></group>
    <group ref={hands} visible={false}>
      {[-1, 1].map((side) => <group key={side} position={[side * 0.21, -0.29, -0.45]} rotation={[0.22, side * -0.3, side * -0.18]}>
        <mesh position={[0, -0.105, 0.03]} rotation={[-0.35, 0, 0]}><capsuleGeometry args={[0.034, 0.16, 6, 16]} /><meshStandardMaterial color="#466260" roughness={0.88} /></mesh>
        <mesh scale={[0.85, 1.25, 0.43]}><sphereGeometry args={[0.048, 24, 20]} /><meshStandardMaterial color="#b1c5b9" roughness={0.75} /></mesh>
        {[0, 1, 2, 3].map((finger) => <mesh key={finger} position={[(finger - 1.5) * 0.018, 0.073 - Math.abs(finger - 1.4) * 0.009, -0.01]} rotation={[0.45, 0, (finger - 1.5) * -0.05]}><capsuleGeometry args={[0.0085, 0.047, 5, 12]} /><meshStandardMaterial color="#b1c5b9" roughness={0.75} /></mesh>)}
        <mesh position={[side * -0.045, 0.008, -0.004]} rotation={[0.25, 0, side * -0.65]}><capsuleGeometry args={[0.011, 0.032, 5, 12]} /><meshStandardMaterial color="#b1c5b9" roughness={0.75} /></mesh>
      </group>)}
    </group>
  </>;
}
