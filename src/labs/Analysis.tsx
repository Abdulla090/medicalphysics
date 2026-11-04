import type { ExperimentId, Reading } from './physics';
import { derivedResult, groupedReadings, linearFit, STANDARD_GRAVITY } from './physics';
import type { LabCopy } from './i18n';

export default function Analysis({ readings, experiment, t }: { readings: Reading[]; experiment: ExperimentId; t: LabCopy }) {
  const points = groupedReadings(readings, experiment);
  const fit = linearFit(points);
  const result = derivedResult(experiment, fit);
  const pendulum = experiment === 'simple-pendulum';
  const hooke = experiment === 'hookes-law';
  const xLabel = pendulum ? 'L / m' : hooke ? 'x / m' : 'I / A';
  const yLabel = pendulum ? 'T² / s²' : hooke ? 'F / N' : 'V / V';
  const maxX = Math.max(pendulum ? 1 : hooke ? 0.1 : 0.1, ...points.map(p => p.x)) * 1.15;
  const maxY = Math.max(pendulum ? 4 : hooke ? 1 : 6, ...points.map(p => p.y + (p.uncertainty ?? 0)), fit ? fit.slope * maxX + fit.intercept : 0) * 1.12;
  const minY = Math.min(0, fit?.intercept ?? 0, ...points.map(p => p.y - (p.uncertainty ?? 0))) * 1.15;
  const sx = (v: number) => 70 + v / maxX * 570;
  const sy = (v: number) => 290 - (v - minY) / (maxY - minY) * 245;
  const unit = pendulum ? 'm/s²' : hooke ? 'N/m' : 'Ω';
  const label = pendulum ? 'g' : hooke ? 'k' : 'R';
  const hasSimulated = readings.some(r => r.source === 'simulation');
  const largeAngle = readings.some(r => (r.angle ?? 0) > 10);
  const mixedAngle = new Set(readings.filter(r => r.source === 'simulation').map(r => r.angle)).size > 1;
  return <section className="lab-analysis" aria-label={t.analysis}>
    <div className="lab-analysis-plot"><div className="lab-section-heading"><div><h2>{t.graph}</h2></div><span className="lab-equation">{pendulum ? 'T² = (4π²/g)L + b' : hooke ? 'F = kx + b' : 'V = RI + b'}</span></div>
      <svg className="lab-fit-svg" viewBox="0 0 710 345" role="img" aria-label={`${t.graph}: ${yLabel} versus ${xLabel}, ${points.length} ${t.distinct}`} style={{ direction: 'ltr' }}>
        {Array.from({ length: 6 }, (_, i) => { const x = maxX * i / 5; const y = minY + (maxY - minY) * i / 5; return <g key={i}><path d={`M${sx(x)} 45V290M70 ${sy(y)}H640`} stroke="var(--lab-line)" strokeDasharray="3 4"/><text x={sx(x)} y="311" textAnchor="middle" className="lab-svg-small">{x.toFixed(maxX < 0.5 ? 3 : 2)}</text><text x="58" y={sy(y) + 4} textAnchor="end" className="lab-svg-small">{y.toFixed(1)}</text></g>; })}
        <path d="M70 40V290H650" stroke="var(--lab-line-strong)" fill="none"/><text x="355" y="340" textAnchor="middle" className="lab-svg-label">{xLabel}</text><text x="17" y="168" textAnchor="middle" transform="rotate(-90 17 168)" className="lab-svg-label">{yLabel}</text>
        {fit && <line x1={sx(0)} y1={sy(fit.intercept)} x2={sx(maxX)} y2={sy(fit.slope * maxX + fit.intercept)} stroke="var(--lab-accent)" strokeWidth="1.8"/>}
        {points.map(p => <g key={p.x}>{p.uncertainty !== null && <path d={`M${sx(p.x)} ${sy(p.y - p.uncertainty)}V${sy(p.y + p.uncertainty)}m-4 0h8M${sx(p.x) - 4} ${sy(p.y - p.uncertainty)}h8`} stroke="var(--lab-accent)"/>}<circle cx={sx(p.x)} cy={sy(p.y)} r="4.5" fill="var(--lab-surface)" stroke="var(--lab-accent)" strokeWidth="2"><title>{xLabel}: {p.x.toFixed(4)}, {yLabel}: {p.y.toFixed(4)} · n = {p.repeats}</title></circle></g>)}
        {!points.length && <text x="355" y="160" textAnchor="middle" className="lab-svg-label">{pendulum ? 'T² ∝ L' : hooke ? 'F ∝ x' : 'V ∝ I'}</text>}
      </svg>
      <p className="lab-help">{pendulum ? t.graphDesc : hooke ? t.hookeGuide : t.ohmGuide}</p>
      {points.length > 0 && <div className="lab-table-scroll"><table className="lab-group-table"><caption className="sr-only">{t.distinct}</caption><thead><tr><th>{xLabel}</th><th>{yLabel}</th><th>n</th><th>u({pendulum ? 'T²' : hooke ? 'F' : 'V'})</th></tr></thead><tbody>{points.map(p => <tr key={p.x}><td>{p.x.toFixed(4)}</td><td>{p.y.toFixed(4)}</td><td>{p.repeats}</td><td>{p.uncertainty === null ? '—' : p.uncertainty.toPrecision(3)}</td></tr>)}</tbody></table></div>}
    </div>
    <aside className="lab-analysis-result"><span className="lab-result-label">{t.result}</span><div className="lab-result-number" style={{ direction: 'ltr' }}><span>{label} = </span>{result ? result.value.toFixed(3) : '—'}<small>{unit}</small></div>
      {result?.uncertainty !== null && result && <p className="lab-result-uncertainty" style={{ direction: 'ltr' }}>± {result.uncertainty.toPrecision(3)} {unit} <span>(1σ)</span></p>}
      <dl className="lab-fit-stats"><div><dt>{t.gradient}</dt><dd>{fit ? fit.slope.toFixed(5) : '—'} <small>{pendulum ? 's²/m' : unit}</small></dd></div><div><dt>{t.intercept}</dt><dd>{fit ? fit.intercept.toFixed(5) : '—'} <small>{pendulum ? 's²' : hooke ? 'N' : 'V'}</small></dd></div><div><dt>R²</dt><dd>{fit ? fit.rSquared.toFixed(5) : '—'}</dd></div><div><dt>{t.distinct}</dt><dd>{points.length}</dd></div>{pendulum && <><div><dt>{t.reference}</dt><dd>{STANDARD_GRAVITY} <small>m/s²</small></dd></div><div><dt>{t.difference}</dt><dd>{result ? `${(Math.abs(result.value - STANDARD_GRAVITY) / STANDARD_GRAVITY * 100).toFixed(3)}%` : '—'}</dd></div></>}</dl>
      {!fit && <p className="lab-inline-note">{pendulum ? t.fitEmpty : t.fitEmptyOther}</p>}
      {fit && !result && <p className="lab-warning">{t.invalidSlope}</p>}
      {fit && fit.slopeUncertainty === null && <p className="lab-help">{t.noUncertainty}</p>}
      {pendulum && largeAngle && <p className="lab-warning">{t.largeAngleData}</p>}
      {pendulum && mixedAngle && <p className="lab-warning">{t.mixedAngles}</p>}
      <details className="lab-method"><summary>{t.method}</summary><p className="lab-help">{t.fitMethod}</p>{hasSimulated && <p className="lab-help">{t.idealUncertainty}</p>}</details>
    </aside>
  </section>;
}
