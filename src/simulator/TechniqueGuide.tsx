import { useId, useState } from 'react';
import type { ClinicalCase } from './clinicalCases';
import type { SimulatorState } from './types';
import { analyzeProjectionCoverage, calculateMetrics, getReadinessChecks } from './physics';
import { getProtocol } from './protocols';
import './techniqueGuide.css';

type Language = 'en' | 'ku';
type NumericStatus = 'low' | 'target' | 'high';
type NumericDimension = 'kvp' | 'mas' | 'sid';
type Expected = ClinicalCase['expected'];

const T = {
  en: {
    show: 'Show student technique tips',
    hide: 'Hide student technique tips',
    caption: 'LIVE EXERCISE FEEDBACK',
    low: 'Too low for this exercise',
    target: 'Correct exercise range',
    high: 'Too high for this exercise',
    range: 'Case exercise range',
    equipmentLimit: 'Simulator equipment limit',
    equipmentLimitNote: 'Simulator equipment limits only describe the controls available here. They are not recommended clinical settings.',
    kvp: 'Tube voltage · kVp',
    mas: 'Total exposure · mAs',
    sid: 'Source–image distance · SID',
    explain: 'mAs = tube current (mA) × exposure time (ms) ÷ 1000. Current and time work together; neither has a universal ideal value.',
    position: 'Positioning & beam alignment',
    collimation: 'Collimation & requested coverage',
    setupPass: 'Exercise setup check passed',
    setupAttention: 'Needs correction',
    coveragePass: 'Requested anatomy covered',
    coverageAttention: 'Coverage incomplete',
    selectedProjection: 'Selected setup',
    requestedProjection: 'Exercise request',
    currentGeometry: 'Current geometry',
    referenceCoverage: 'Modeled reference coverage',
    positionTarget: 'Centering, body rotation, tube alignment and arm position match this exercise’s setup checks.',
    positionAttention: 'Correct before exposure',
    issueCenter: 'centering',
    issueRotation: 'body rotation',
    issueTube: 'tube alignment',
    issueArms: 'arm position',
    collimationTarget: 'The protocol-specific projected reference anatomy is inside the current field. Keep the field no wider than needed and inspect every image edge.',
    collimationAttention: 'Part of the protocol-specific projected reference anatomy falls outside the current field. Recenter or adjust the field deliberately, then inspect every image edge.',
    projectionMismatch: 'Match the selected projection to the exercise request before interpreting positioning or collimation feedback.',
    caveat: 'Training ranges and geometry checks are for this simulated case only. They are not clinical presets, dose measurements or proof of diagnostic adequacy. Real technique depends on the patient, detector, equipment and local radiography protocol.',
    lowKvp: 'Lower modeled beam penetration may leave insufficient detector signal.',
    targetKvp: 'Beam energy matches this case exercise interval; positioning and patient size still matter.',
    highKvp: 'Higher penetration changes subject contrast and detector signal; do not assume higher is better.',
    lowMas: 'Fewer modeled photons can increase quantum noise in the synthetic image.',
    targetMas: 'Photon fluence matches this case exercise interval; check motion and image quality.',
    highMas: 'More output may reduce simulated noise but increases exposure in real practice. More is not automatically better.',
    lowSid: 'Shorter distance can increase magnification and receptor fluence at fixed settings.',
    targetSid: 'Distance matches this case exercise interval; verify image coverage and alignment.',
    highSid: 'Longer distance reduces receptor fluence at the same settings; assess geometry and technique together.',
  },
  ku: {
    show: 'پیشاندانی ئامۆژگارییەکانی خوێندکار',
    hide: 'شاردنەوەی ئامۆژگارییەکانی خوێندکار',
    caption: 'هەڵسەنگاندنی ڕاستەوخۆی ڕاهێنان',
    low: 'بۆ ئەم ڕاهێنانە زۆر کەمە',
    target: 'لە مەودای دروستی ڕاهێنانە',
    high: 'بۆ ئەم ڕاهێنانە زۆر بەرزە',
    range: 'مەودای ئەم کەیسەی ڕاهێنان',
    equipmentLimit: 'سنووری ئامێری مۆدێلەکە',
    equipmentLimitNote: 'سنوورەکانی ئامێر تەنها کۆنترۆڵە بەردەستەکانی ئەم سیمولاتەرە پیشان دەدەن؛ ڕێکخستنی پێشنیارکراوی کلینیکی نین.',
    kvp: 'ڤۆڵتاژی تیوب · kVp',
    mas: 'کۆی ئێکسپۆژەر · mAs',
    sid: 'دووری سەرچاوە بۆ وێنە · SID',
    explain: 'mAs = جەریانی تیوب (mA) × کاتی تیشکدان (ms) ÷ ١٠٠٠. جەریان و کات پێکەوە کاریگەریان هەیە؛ هیچ بڕێکی گشتی بۆ هەموو دۆخێک نییە.',
    position: 'ڕێکخستنی نەخۆش و هاوڕێکی تیوب',
    collimation: 'سنووردارکردنی بوار و داپۆشینی داواکراو',
    setupPass: 'پشکنینی ڕێکخستنی ڕاهێنان تێپەڕا',
    setupAttention: 'پێویستی بە چاککردن هەیە',
    coveragePass: 'ئەناتۆمی داواکراو لە بوارەکەدایە',
    coverageAttention: 'داپۆشین تەواو نییە',
    selectedProjection: 'ڕێکخستنی هەڵبژێردراو',
    requestedProjection: 'داواکاری ڕاهێنان',
    currentGeometry: 'هەندەسەی ئێستا',
    referenceCoverage: 'داپۆشینی سەرچاوەی مۆدێل',
    positionTarget: 'ناوەندکردن، سووڕانی جەستە، هاوڕێکی تیوب و دۆخی باڵەکان لەگەڵ پشکنینەکانی ئەم ڕاهێنانە دەگونجێن.',
    positionAttention: 'پێش وێنەگرتن چاکی بکە',
    issueCenter: 'ناوەندکردن',
    issueRotation: 'سووڕانی جەستە',
    issueTube: 'هاوڕێکی تیوب',
    issueArms: 'دۆخی باڵەکان',
    collimationTarget: 'ئەناتۆمی سەرچاوەی پڕۆتۆکۆڵ لە ناو بوارەکەدایە. بوارەکە بەبێ پێویستی فراوان مەکە و هەموو لێوارەکانی وێنە بپشکنە.',
    collimationAttention: 'بەشێک لە ئەناتۆمی سەرچاوەی پڕۆتۆکۆڵ لە دەرەوەی بوارەکە دەکەوێت. ناوەند یان بوار بە مەبەست ڕێکبخە و لێوارەکانی وێنە بپشکنە.',
    projectionMismatch: 'پێش هەڵسەنگاندنی ڕێکخستن یان سنووردارکردنی بوار، ئاڕاستەی هەڵبژێردراو لەگەڵ داواکاری ڕاهێنان یەکسان بکە.',
    caveat: 'مەودا و پشکنینە هەندەسییەکان تەنها بۆ ئەم کەیسەی سیمولاتەرە. ڕێکخستنی کلینیکی، پێوانەی دۆز یان بەڵگەی گونجاوی دەستنیشانکردن نین. لە کاردا نەخۆش، وەرگر، ئامێر و پڕۆتۆکۆڵی ناوخۆیی گرنگن.',
    lowKvp: 'تێپەڕینی تیشکی مۆدێل کەمترە و ڕەنگە سیگناڵی وەرگر بەس نەبێت.',
    targetKvp: 'وزەی تیشک لە مەودای ئەم کەیسەی ڕاهێنانە؛ قەبارە و ڕێکخستنی نەخۆش هێشتا گرنگن.',
    highKvp: 'تێپەڕینی زیاتر کۆنتراست و سیگناڵ دەگۆڕێت؛ زیاتر هەمیشە باشتر نییە.',
    lowMas: 'فۆتۆنی کەمتر دەتوانێت نەویز لە وێنەی ساختەدا زیاد بکات.',
    targetMas: 'ژمارەی فۆتۆن لە مەودای ئەم کەیسەی ڕاهێنانە؛ جوڵە و کوالیتی وێنە بپشکنە.',
    highMas: 'دەرچوونی زیاتر ڕەنگە نەویز کەم بکاتەوە، بەڵام لە ڕادیۆگرافیی ڕاستەقینەدا تیشکدان زیاد دەکات.',
    lowSid: 'دووری کەمتر دەتوانێت گەورەبوونی وێنە و تیشکی وەرگر زیاد بکات.',
    targetSid: 'دووری لە مەودای ئەم کەیسەی ڕاهێنانە؛ داپۆشین و ڕێکخستن بپشکنە.',
    highSid: 'دووری زیاتر بە هەمان ڕێکخستن تیشکی وەرگر کەم دەکاتەوە.',
  },
} as const;

const SIMULATOR_LIMITS = {
  kvp: '40–150 kVp',
  mas: '25–500 mA × 1–500 ms',
  sid: '80–200 cm',
} as const;

function techniqueStatus(value: number, [min, max]: readonly [number, number]): NumericStatus {
  return value < min ? 'low' : value > max ? 'high' : 'target';
}

function getTechniqueStatuses(state: SimulatorState, expected: Expected) {
  return {
    kvp: techniqueStatus(state.kvp, expected.kvp),
    mas: techniqueStatus(state.ma * state.exposureMs / 1000, expected.mas),
    sid: techniqueStatus(state.sid, expected.sid),
  };
}

/** An optional, non-blocking reference; never silently changes exposure values. */
export function TechniqueGuide({ state, clinicalCase, language = 'en' }: {
  state: SimulatorState; clinicalCase: ClinicalCase; language?: Language;
}) {
  const [open, setOpen] = useState(false);
  const guideId = useId();
  const copy = T[language];
  const expected = clinicalCase.expected;
  const metrics = calculateMetrics(state);
  const statuses = getTechniqueStatuses(state, expected);
  const rows: { id: NumericDimension; value: string; unit: string; range: [number, number] }[] = [
    { id: 'kvp', value: String(state.kvp), unit: 'kVp', range: expected.kvp },
    { id: 'mas', value: metrics.mas.toFixed(2), unit: 'mAs', range: expected.mas },
    { id: 'sid', value: String(state.sid), unit: 'cm', range: expected.sid },
  ];
  const descriptions: Record<NumericDimension, Record<NumericStatus, string>> = {
    kvp: { low: copy.lowKvp, target: copy.targetKvp, high: copy.highKvp },
    mas: { low: copy.lowMas, target: copy.targetMas, high: copy.highMas },
    sid: { low: copy.lowSid, target: copy.targetSid, high: copy.highSid },
  };
  const selectedProtocol = getProtocol(state.protocol);
  const requestedProtocol = getProtocol(clinicalCase.requested);
  const protocolMatches = state.protocol === clinicalCase.requested;
  const checks = getReadinessChecks(state);
  const passed = (id: string) => checks.find(item => item.id === id)?.passed === true;
  const positionPassed = protocolMatches && passed('centering') && passed('rotation') && passed('arms');
  const coverage = analyzeProjectionCoverage(state);
  const coveragePassed = protocolMatches && passed('coverage');
  const positionIssues: string[] = [];
  if (!passed('centering')) positionIssues.push(copy.issueCenter);
  if (Math.abs(state.patientRotation) > 3) positionIssues.push(copy.issueRotation);
  if (Math.abs(state.tubeAngle) > 3) positionIssues.push(copy.issueTube);
  if (selectedProtocol.projection === 'LAT' && state.arms !== 'raised') positionIssues.push(copy.issueArms);
  const mismatch = `${copy.requestedProjection}: ${requestedProtocol.name} · ${copy.selectedProjection}: ${selectedProtocol.name}. ${copy.projectionMismatch}`;
  const positionDescription = !protocolMatches ? mismatch : positionPassed ? copy.positionTarget : `${copy.positionAttention}: ${positionIssues.join(' · ')}.`;
  const collimationDescription = !protocolMatches ? mismatch : coveragePassed ? copy.collimationTarget : copy.collimationAttention;

  return <section className={`sim-student-guide${language === 'ku' ? ' is-kurdish' : ''}`} aria-label={copy.show}>
    <button type="button" className="sim-student-guide-trigger" aria-expanded={open} aria-controls={guideId} onClick={() => setOpen(value => !value)}>
      <span aria-hidden="true">?</span>{open ? copy.hide : copy.show}<b aria-hidden="true">{open ? '−' : '+'}</b>
    </button>
    {open && <div id={guideId} className="sim-student-guide-body" aria-live="polite">
      <p className="sim-student-guide-caption">{copy.caption}</p>
      <div className="sim-student-guide-grid" dir={language === 'ku' ? 'rtl' : 'ltr'}>
        {rows.map(({ id, value, unit, range }) => <div className="sim-student-guide-reading" data-state={statuses[id]} key={id}>
          <div className="sim-student-guide-reading-head"><strong>{copy[id]}</strong><span>{copy[statuses[id]]}</span></div>
          <div className="sim-student-guide-values" dir="ltr"><b>{value} <small>{unit}</small></b><span>{copy.range}: {range[0]}–{range[1]} {unit}</span></div>
          <p>{descriptions[id][statuses[id]]}</p>
          <small className="sim-student-guide-limit"><b>{copy.equipmentLimit}:</b> <span dir="ltr">{SIMULATOR_LIMITS[id]}</span></small>
        </div>)}
      </div>
      <p className="sim-student-guide-limit-note">{copy.equipmentLimitNote}</p>
      <div className="sim-student-guide-geometry" dir={language === 'ku' ? 'rtl' : 'ltr'}>
        <div className="sim-student-guide-reading" data-state={positionPassed ? 'target' : 'attention'}>
          <div className="sim-student-guide-reading-head"><strong>{copy.position}</strong><span>{positionPassed ? copy.setupPass : copy.setupAttention}</span></div>
          <div className="sim-student-guide-geometry-values" dir="ltr"><span>{copy.currentGeometry}</span><b>ΔX {state.patientOffsetX.toFixed(1)} cm · ΔY {state.patientOffsetY.toFixed(1)} cm · R {state.patientRotation.toFixed(0)}° · Tube {state.tubeAngle.toFixed(0)}°</b></div>
          <p>{positionDescription}</p>
        </div>
        <div className="sim-student-guide-reading" data-state={coveragePassed ? 'target' : 'attention'}>
          <div className="sim-student-guide-reading-head"><strong>{copy.collimation}</strong><span>{coveragePassed ? copy.coveragePass : copy.coverageAttention}</span></div>
          <div className="sim-student-guide-geometry-values" dir="ltr"><span>{copy.currentGeometry}</span><b>{state.collimationWidth} × {state.collimationHeight} cm</b></div>
          <div className="sim-student-guide-geometry-values" dir="ltr"><span>{copy.referenceCoverage}</span><b>{coverage.envelopeCoveragePercent}% envelope · {coverage.landmarkCoveragePercent}% landmarks</b></div>
          <p>{collimationDescription}</p>
        </div>
      </div>
      <p className="sim-student-guide-principle">{copy.explain}</p>
      <p className="sim-student-guide-caveat">{copy.caveat}</p>
    </div>}
  </section>;
}
