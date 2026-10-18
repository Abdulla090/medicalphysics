import { useEffect, useRef } from 'react';
import { ClinicalHands } from './ClinicalHands';
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
  changingDoorClosed?: boolean;
  patientPrepared: boolean;
  canManipulatePatient?: boolean;
  patientInRoom?: boolean;
  registered?: boolean;
  interactiveTargets?: WorldTargetId[];
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
    const targets = getWorldTargets(live.current.state).filter(item => (!live.current.interactiveTargets || live.current.interactiveTargets.includes(item.id)) && (item.id !== 'patient' || (live.current.patientPrepared && (live.current.patientInRoom ?? true))));
    const target = getAimedTarget(observer.position.toArray(), direction.toArray(), targets, live.current.barrierClosed, live.current.changingDoorClosed);
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
      return getAimedTarget(camera.position.toArray(), ray.ray.direction.toArray(), getWorldTargets(live.current.state).filter(item => (!live.current.interactiveTargets || live.current.interactiveTargets.includes(item.id)) && (item.id !== 'patient' || (live.current.patientPrepared && (live.current.patientInRoom ?? true)))), live.current.barrierClosed, live.current.changingDoorClosed);
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
      if ((target.id === 'patient' || target.id === 'table') && live.current.canManipulatePatient === false) { action(target.id, 'use'); return; }
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
      const click = grip.current.target === 'patient' && Math.abs(grip.current.dx) + Math.abs(grip.current.dy) < 3;
      grip.current = null;
      window.dispatchEvent(new CustomEvent('xray-manipulating', { detail: false }));
      live.current.onGrip(false);
      if (click && permitted()) action('patient', 'use');
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
      if (target && (id !== 'patient' || live.current.canManipulatePatient !== false) && camera.position.distanceTo(new Vector3(...target.position)) <= target.reach + target.radius) live.current.onSelect(id);
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
    <group ref={marker} visible={false}>{[-1,1].flatMap(x=>[-1,1].map(y=><group key={`${x},${y}`} position={[x*.68,y*.68,0]}><mesh position={[-x*.16,0,0]}><planeGeometry args={[.32,.035]}/><meshBasicMaterial color="#f4dfb5" transparent opacity={.85} depthWrite={false}/></mesh><mesh position={[0,-y*.16,0]}><planeGeometry args={[.035,.32]}/><meshBasicMaterial color="#f4dfb5" transparent opacity={.85} depthWrite={false}/></mesh></group>))}</group>
    <group ref={hands} visible={false}>
      <ClinicalHands/>
    </group>
  </>;
}
