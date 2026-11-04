import { Component, Suspense, lazy, useCallback, useEffect, useRef, useState, type ErrorInfo, type ReactNode } from 'react';
import { ResetIcon } from '@radix-ui/react-icons';
import StaticBench from './StaticBench';
import { STANDARD_GRAVITY, stepLoadedSpring, type SpringState } from './physics';
import type { LabCopy } from './i18n';

const BenchScene = lazy(() => import('./BenchScene'));
export type BenchCamera = 'perspective' | 'front' | 'detail';
export interface SpringMotion { state: SpringState }

class GraphicsBoundary extends Component<{ children: ReactNode; fallback: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(_error: Error, _info: ErrorInfo) { /* The diagram preserves the experiment if WebGL fails. */ }
  render() { return this.state.failed ? this.props.fallback : this.props.children; }
}

interface Props {
  hooke: boolean; input: number; constant: number; powered: boolean; onTogglePower: () => void;
  onVoltageStep: () => void; onReady: (ready: boolean) => void; t: LabCopy;
}

export default function ApparatusBench({ hooke, input, constant, powered, onTogglePower, onVoltageStep, onReady, t }: Props) {
  const [diagram, setDiagram] = useState(false);
  const [camera, setCamera] = useState<BenchCamera>('perspective');
  const [viewRevision, setViewRevision] = useState(0);
  const [contextLost, setContextLost] = useState(false);
  const loseContext = useCallback(() => setContextLost(true), []);
  const [settling, setSettling] = useState(false);
  const motion = useRef<SpringMotion>({ state: { extension: input * STANDARD_GRAVITY / constant, velocity: 0 } });
  const requestRender = useRef<() => void>(() => {});
  const [extension, setExtension] = useState(motion.current.state.extension);

  useEffect(() => {
    if (!hooke) { onReady(powered); return; }
    const target = input * STANDARD_GRAVITY / constant;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || Math.abs(motion.current.state.extension - target) < 1e-8) {
      motion.current.state = { extension: target, velocity: 0 };
      setExtension(target); setSettling(false); onReady(true); requestRender.current(); return;
    }
    setSettling(true); onReady(false);
    let raf = 0; let previous = 0; let lastReadout = 0; let stillFor = 0;
    const step = (now: number) => {
      const dt = previous ? Math.min((now - previous) / 1000, 0.04) : 0;
      previous = now;
      if (document.hidden) { raf = requestAnimationFrame(step); return; }
      motion.current.state = stepLoadedSpring(motion.current.state, dt, input, constant);
      const state = motion.current.state;
      stillFor = Math.abs(state.extension - target) < 0.00002 && Math.abs(state.velocity) < 0.0002 ? stillFor + dt : 0;
      if (stillFor > 0.18) {
        motion.current.state = { extension: target, velocity: 0 };
        setExtension(target); setSettling(false); onReady(true); requestRender.current(); return;
      }
      if (now - lastReadout > 80) { setExtension(state.extension); lastReadout = now; }
      requestRender.current();
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [hooke, input, constant, onReady, powered]);

  const fallback = <div className="lab-graphics-fallback"><StaticBench hooke={hooke} input={hooke ? input : powered ? input : 0} constant={constant} t={t}/></div>;
  return <div className="lab-apparatus-bench">
    <div className="lab-scene-toolbar"><div className="lab-view-modes" role="group" aria-label={t.view}><button aria-pressed={!diagram} onClick={() => setDiagram(false)}>3D</button><button aria-pressed={diagram} onClick={() => setDiagram(true)}>{t.diagram}</button></div>{!diagram && <div className="lab-camera-presets" role="group" aria-label={t.camera}>{(['perspective', 'front', 'detail'] as const).map(v => <button key={v} aria-pressed={camera === v} onClick={() => setCamera(v)}>{t[v]}</button>)}<button className="lab-scene-reset" aria-label={t.resetView} title={t.resetView} onClick={() => { setCamera('perspective'); setViewRevision(v => v + 1); }}><ResetIcon/></button></div>}</div>
    {diagram || contextLost ? fallback : <div className="lab-three-viewport" role="img" aria-label={hooke ? t.springApparatus : t.circuitApparatus}><GraphicsBoundary fallback={fallback}><Suspense fallback={<div className="lab-scene-loading" aria-busy="true">{t.apparatus}</div>}><BenchScene hooke={hooke} mass={input} voltage={input} constant={constant} powered={powered} onTogglePower={onTogglePower} onVoltageStep={onVoltageStep} cameraView={camera} viewRevision={viewRevision} motion={motion} requestRender={requestRender} onContextLost={loseContext}/></Suspense></GraphicsBoundary><span className="lab-scene-gesture">{t.rotateHint}</span></div>}
    {<div className="lab-instrument-strip" dir="ltr"><div><span>{hooke ? t.extension : t.current}</span><strong data-testid="bench-primary-reading">{hooke ? (extension * 100).toFixed(2) : (powered ? input / constant * 1000 : 0).toFixed(2)}<small>{hooke ? 'cm' : 'mA'}</small></strong></div><div><span>{hooke ? t.force : t.voltage}</span><strong>{(hooke ? input * STANDARD_GRAVITY : powered ? input : 0).toFixed(3)}<small>{hooke ? 'N' : 'V'}</small></strong></div><div><span>{hooke ? t.load : t.power}</span><strong>{hooke ? (input * 1000).toFixed(0) : (powered ? input * input / constant : 0).toFixed(3)}<small>{hooke ? 'g' : 'W'}</small></strong></div></div>}
    {settling && <div className="lab-settling" role="status">{t.settling}</div>}
  </div>;
}
