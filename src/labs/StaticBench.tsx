import type { LabCopy } from './i18n';

export default function StaticBench({ hooke, input, constant, t }: { hooke: boolean; input: number; constant: number; t: LabCopy }) {
  const force = input * 9.80665;
  const extension = force / constant;
  const springBottom = 190 + Math.min(extension, 0.5) * 200;
  const coil = Array.from({ length: 19 }, (_, i) => `${i % 2 === 0 ? 337 : 383},${110 + i * (springBottom - 110) / 18}`).join(' ');
  return <div className="lab-bench lab-static-bench">
    <svg viewBox="0 0 760 440" className="lab-static-svg" role="img" aria-label={hooke ? t.spring : t.resistance} style={{ direction: 'ltr' }}><defs><pattern id="static-grid" width="24" height="24" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r=".7" fill="var(--lab-grid-dot)"/></pattern><linearGradient id="static-metal"><stop stopColor="#7d8a8c"/><stop offset=".4" stopColor="#d9e0df"/><stop offset="1" stopColor="#71817f"/></linearGradient></defs><rect width="760" height="440" fill="url(#static-grid)"/>

      {hooke ? <><path d="M100 395H660" stroke="var(--lab-line)"/><rect x="173" y="69" width="12" height="320" rx="4" fill="url(#static-metal)"/><rect x="165" y="77" width="210" height="10" rx="4" fill="url(#static-metal)"/><path d="M140 390h90l15 12H125Z" fill="#62666a"/><path d="M360 87v23" stroke="var(--lab-accent)" strokeWidth="2"/><polyline points={coil} fill="none" stroke="var(--lab-accent)" strokeWidth="3" strokeLinejoin="round"/><path d={`M360 ${springBottom}v22`} stroke="var(--lab-accent)" strokeWidth="2"/><rect x="329" y={springBottom + 22} width="62" height="49" rx="5" fill="url(#static-metal)" stroke="#71817f"/><text x="360" y={springBottom + 51} textAnchor="middle" className="lab-svg-label">{(input * 1000).toFixed(0)} g</text><path d={`M470 190V${springBottom}m-6 0h12M464 190h12`} stroke="var(--lab-accent)"/><path d="M398 190h65" stroke="var(--lab-line-strong)" strokeDasharray="3 4"/><text x="490" y={190 + (springBottom - 190) / 2 + 4} className="lab-svg-accent">x = {(extension * 100).toFixed(2)} cm</text><path d={`M360 ${springBottom + 83}v32m-5-7 5 7 5-7`} stroke="var(--lab-accent)" fill="none"/><text x="380" y={springBottom + 110} className="lab-svg-small">F = mg</text></> : <>
        <path d="M174 184v-38h163m46 0h189v168H174v-96" stroke="var(--lab-accent)" strokeWidth="2.2" fill="none"/><path d="M337 146v-15h46v30h-46Z" stroke="var(--lab-accent)" strokeWidth="2" fill="var(--lab-surface)"/><text x="360" y="111" textAnchor="middle" className="lab-svg-accent">R = {constant} Ω</text>
        <path d="M281 146v88h158v-88" stroke="var(--lab-accent)" strokeWidth="1.5" fill="none"/><circle cx="360" cy="234" r="20" fill="var(--lab-stage)" stroke="var(--lab-accent)" strokeWidth="1.5"/><text x="360" y="240" textAnchor="middle" className="lab-svg-label">V</text><circle cx="492" cy="314" r="20" fill="var(--lab-stage)" stroke="var(--lab-accent)" strokeWidth="1.5"/><text x="492" y="320" textAnchor="middle" className="lab-svg-label">A</text>
        <path d="M155 184h38m-30 17h22m-30 17h38" stroke="var(--lab-text)" strokeWidth="2"/><text x="126" y="183" className="lab-svg-label">+</text><text x="126" y="224" className="lab-svg-label">−</text><text x="155" y="260" textAnchor="middle" className="lab-svg-accent">{input.toFixed(1)} V</text><text x="492" y="361" textAnchor="middle" className="lab-svg-accent">I = {(input / constant * 1000).toFixed(2)} mA</text><circle cx="281" cy="146" r="3" fill="var(--lab-accent)"/><circle cx="439" cy="146" r="3" fill="var(--lab-accent)"/>
      </>}
    </svg>
  </div>;
}
