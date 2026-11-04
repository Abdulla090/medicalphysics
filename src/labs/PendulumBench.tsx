import { memo, useEffect, useRef, useState } from 'react';
import { advancePendulum, type PendulumState } from './physics';
import type { LabCopy } from './i18n';

export type RunStatus = 'idle' | 'running' | 'paused' | 'completed';
interface Props {
  length: number; angle: number; mass: number; cycles: number; speed: number; runId: number; status: RunStatus;
  onComplete: (elapsed: number) => void; t: LabCopy;
}
interface Runtime { state: PendulumState; count: number; samples: { time: number; angle: number }[]; finished: boolean }

export default memo(function PendulumBench({ length, angle, mass, cycles, speed, runId, status, onComplete, t }: Props) {
  const bob = useRef<SVGGElement>(null);
  const runtime = useRef<Runtime>({ state: { theta: angle * Math.PI / 180, omega: 0, time: 0 }, count: 0, samples: [], finished: false });
  const complete = useRef(onComplete);
  complete.current = onComplete;
  const [frame, setFrame] = useState({ time: 0, count: 0, theta: angle, samples: [] as Runtime['samples'] });
  const rodLength = 155 + length * 130;
  const radius = 13 + Math.cbrt(mass) * 11;

  useEffect(() => {
    runtime.current = { state: { theta: angle * Math.PI / 180, omega: 0, time: 0 }, count: 0, samples: [{ time: 0, angle }], finished: false };
    bob.current?.setAttribute('transform', `rotate(${-angle} 360 85)`);
    setFrame({ time: 0, count: 0, theta: angle, samples: [] });
  }, [runId, length, angle, mass, cycles]);

  useEffect(() => {
    if (status !== 'running') return;
    let animation = 0;
    let last = 0;
    let lastPaint = 0;
    const tick = (now: number) => {
      const r = runtime.current;
      if (r.finished) return;
      if (document.hidden) { last = now; animation = requestAnimationFrame(tick); return; }
      let remaining = last ? Math.min((now - last) / 1000, 0.05) * speed : 0;
      last = now;
      while (remaining > 1e-9 && !r.finished) {
        const dt = Math.min(remaining, 1 / 240);
        const previous = r.state;
        r.state = advancePendulum(previous, dt, length);
        if (previous.omega > 0 && r.state.omega <= 0 && r.state.theta > 0) {
          r.count++;
          if (r.count >= cycles) {
            r.state.time = previous.time + dt * previous.omega / (previous.omega - r.state.omega);
            r.finished = true;
          }
        }
        if (r.state.time - (r.samples.at(-1)?.time ?? 0) >= 0.05) {
          r.samples.push({ time: r.state.time, angle: r.state.theta * 180 / Math.PI });
          if (r.samples.length > 240) r.samples.shift();
        }
        remaining -= dt;
      }
      bob.current?.setAttribute('transform', `rotate(${-r.state.theta * 180 / Math.PI} 360 85)`);
      if (now - lastPaint > 80 || r.finished) {
        setFrame({ time: r.state.time, count: r.count, theta: r.state.theta * 180 / Math.PI, samples: [...r.samples] });
        lastPaint = now;
      }
      if (r.finished) { complete.current(r.state.time); return; }
      animation = requestAnimationFrame(tick);
    };
    animation = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animation);
  }, [status, speed, length, cycles]);

  const windowStart = Math.max(0, frame.time - 10);
  const trace = frame.samples.filter(s => s.time >= windowStart).map(s => `${54 + (s.time - windowStart) / 10 * 618},${58 - s.angle / Math.max(angle, 1) * 30}`).join(' ');
  return <div className="lab-bench">
    <div className="lab-bench-heading"><span/>{status !== 'idle' && <span className={`lab-status is-${status}`}>{t[status]}</span>}</div>
    <svg className="lab-pendulum-svg" viewBox="0 0 760 440" role="img" aria-label={`${t.apparatus}: ${t.length} ${length.toFixed(2)} m, ${t.angle} ${angle}°`} style={{ direction: 'ltr' }}>
      <defs>
        <pattern id="pend-grid" width="24" height="24" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r="0.7" fill="var(--lab-grid-dot)"/></pattern>
        <linearGradient id="pend-steel"><stop stopColor="#727f8b"/><stop offset=".32" stopColor="#c8cfd6"/><stop offset=".55" stopColor="#9da8b3"/><stop offset="1" stopColor="#4c5b69"/></linearGradient>
        <linearGradient id="pend-base" x2="0" y2="1"><stop stopColor="#4c5960"/><stop offset="1" stopColor="#28373e"/></linearGradient>
        <radialGradient id="pend-bob" cx=".32" cy=".24" r=".8"><stop stopColor="#e1e5e9"/><stop offset=".28" stopColor="#9ca6af"/><stop offset=".72" stopColor="#4e5e6b"/><stop offset="1" stopColor="#253444"/></radialGradient>
        <filter id="pend-shadow" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="7"/></filter>
      </defs>
      <rect width="760" height="440" fill="url(#pend-grid)"/>
      <path d="M50 395H710" stroke="var(--lab-line)"/>
      <ellipse cx="243" cy="403" rx="115" ry="8" fill="#253a33" opacity=".09" filter="url(#pend-shadow)"/>
      <path d="M161 382 146 397h196l-19-15Z" fill="url(#pend-steel)" stroke="#536473"/>
      <rect x="146" y="397" width="196" height="9" rx="3" fill="url(#pend-base)"/>
      <rect x="191" y="49" width="12" height="336" rx="5" fill="url(#pend-steel)" stroke="#536473" strokeWidth=".5"/>
      <rect x="187" y="67" width="27" height="23" rx="3" fill="url(#pend-base)"/>
      <rect x="174" y="75" width="15" height="7" rx="2" fill="#69777c"/>
      <rect x="202" y="75" width="167" height="7" rx="3" fill="url(#pend-steel)" stroke="#536473" strokeWidth=".5"/>
      <path d="M354 79v9h12v-9" fill="#52656b"/>
      <path d={`M360 85V${85 + rodLength + 22}`} stroke="var(--lab-line-strong)" strokeDasharray="4 5"/>
      <path d={`M${360 - rodLength * Math.sin(angle * Math.PI / 180)} ${85 + rodLength * Math.cos(angle * Math.PI / 180)} A${rodLength} ${rodLength} 0 0 0 ${360 + rodLength * Math.sin(angle * Math.PI / 180)} ${85 + rodLength * Math.cos(angle * Math.PI / 180)}`} stroke="var(--lab-accent)" opacity=".3" strokeDasharray="3 5" fill="none"/>
      <path d={`M360 145 A60 60 0 0 0 ${360 + 60 * Math.sin(angle * Math.PI / 180)} ${85 + 60 * Math.cos(angle * Math.PI / 180)}`} stroke="var(--lab-accent)" fill="none"/>
      <text x="386" y="149" className="lab-svg-accent">θ₀ = {angle}°</text>
      <g ref={bob} transform={`rotate(${-angle} 360 85)`}>
        <path d={`M360 86V${85 + rodLength}`} stroke="#445464" strokeWidth="1.6"/>
        <path d={`M360 ${85 + rodLength - radius - 7}v9`} stroke="#9baead" strokeWidth="3"/>
        <circle cx="360" cy={85 + rodLength} r={radius} fill="url(#pend-bob)" stroke="#5d6265" strokeWidth=".7"/>
        <ellipse cx="355" cy={79 + rodLength} rx="5" ry="3" fill="#fff" opacity=".24"/>
        <circle cx="360" cy={85 + rodLength} r="1.5" fill="#eee"/>
      </g>
      <circle cx="360" cy="85" r="4.5" fill="#344b4e" stroke="#d5dfdd" strokeWidth="2"/>
      <path d={`M517 85V${85 + rodLength}m-6 0h12M511 85h12`} stroke="var(--lab-line-strong)" fill="none"/>
      <path d={`M374 85h138M${360 + radius + 10} ${85 + rodLength}H512`} stroke="var(--lab-line)" strokeDasharray="2 4"/>
      <rect x="489" y={76 + rodLength / 2} width="60" height="24" rx="3" fill="var(--lab-stage)"/>
      <text x="519" y={92 + rodLength / 2} textAnchor="middle" className="lab-svg-accent">{length.toFixed(2)} m</text>
    </svg>
    <div className="lab-instrument-strip" style={{ direction: 'ltr' }}><div><span>{t.elapsed}</span><strong data-testid="elapsed">{frame.time.toFixed(2)}<small>s</small></strong></div><div><span>{t.count}</span><strong data-testid="oscillation-count">{String(frame.count).padStart(2, '0')}<small>/ {cycles}</small></strong></div><div><span>{t.displacement}</span><strong>{frame.theta.toFixed(1)}<small>°</small></strong></div></div>
    <div className="lab-trace"><div className="lab-trace-heading"><span>θ(t)</span><span>{t.displacement} · {t.time} / s</span></div><svg viewBox="0 0 710 108" aria-label={`${t.displacement} / ${t.time}`} role="img" style={{ direction: 'ltr' }}><path d="M54 20V88H680M54 58H680" stroke="var(--lab-line)" fill="none"/>{[0, 2, 4, 6, 8, 10].map(v => <g key={v}><path d={`M${54 + v * 61.8} 20V88`} stroke="var(--lab-line)" strokeDasharray="2 4"/><text x={54 + v * 61.8} y="104" textAnchor="middle" className="lab-svg-small">{(windowStart + v).toFixed(0)}</text></g>)}<text x="40" y="31" textAnchor="end" className="lab-svg-small">+{angle}°</text><text x="40" y="88" textAnchor="end" className="lab-svg-small">−{angle}°</text><polyline points={trace} stroke="var(--lab-accent)" strokeWidth="2" fill="none"/>{!frame.samples.length && <text x="365" y="52" textAnchor="middle" className="lab-svg-small">{t.ready}</text>}</svg></div>
  </div>;
});
