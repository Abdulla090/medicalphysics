import { useEffect, useMemo, useRef, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Cross2Icon, DownloadIcon, ResetIcon, ZoomInIcon, ZoomOutIcon } from '@radix-ui/react-icons';
import { analyzeRadiographQuality, renderPixelsToCanvas } from './physics';
import { getProtocol } from './protocols';
import type { CapturedImage } from './types';
import { Parameter, Toggle } from './Controls';
import './radiograph-review.css';

type CritiqueFocus = 'projection' | 'field' | 'alignment' | 'fluence';

function downloadFile(data: Blob | string, name: string) {
  const url = typeof data === 'string' ? data : URL.createObjectURL(data);
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  if (typeof data !== 'string') setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function RadiographViewer({ image, onClose }: { image: CapturedImage | null; onClose: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [center, setCenter] = useState(0.46);
  const [width, setWidth] = useState(0.86);
  const [inverted, setInverted] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [landmarkOverlay, setLandmarkOverlay] = useState(false);
  const [focus, setFocus] = useState<CritiqueFocus>('projection');
  const [predictions, setPredictions] = useState<Partial<Record<CritiqueFocus, 'review' | 'observed'>>>({});
  const quality = useMemo(() => image ? analyzeRadiographQuality(image.state, image.pixels, image.width, image.height) : null, [image]);
  useEffect(() => { setCenter(0.46); setWidth(0.86); setInverted(false); setZoom(1); setLandmarkOverlay(false); setFocus('projection'); setPredictions({}); }, [image?.id]);
  useEffect(() => {
    if (image && canvasRef.current) renderPixelsToCanvas(image.pixels, image.width, image.height, canvasRef.current, center, width, inverted);
  }, [image, center, width, inverted]);

  const savePng = () => {
    if (!image || !canvasRef.current) return;
    const result = document.createElement('canvas');
    result.width = image.width;
    result.height = image.height + 70;
    const context = result.getContext('2d');
    if (!context) return;
    context.fillStyle = '#111918';
    context.fillRect(0, 0, result.width, result.height);
    context.drawImage(canvasRef.current, 0, 0);
    context.fillStyle = '#d9e7df';
    context.font = '12px monospace';
    context.fillText('MEDICALPHYSICS / SYNTHETIC STUDY · NOT DIAGNOSTIC', 14, image.height + 25);
    context.fillText(`${getProtocol(image.state.protocol).name}  ${image.state.kvp} kVp  ${image.metrics.mas.toFixed(2)} mAs  SID ${image.state.sid} cm`, 14, image.height + 47);
    downloadFile(result.toDataURL('image/png'), `synthetic-${image.state.protocol}-${image.id}.png`);
  };

  const focusedFinding = quality?.findings.find(item => item.id === focus);
  const resetDisplay = () => { setCenter(0.46); setWidth(0.86); setInverted(false); setZoom(1); };

  return (
    <Dialog.Root open={!!image} onOpenChange={(open) => { if (!open) onClose(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="sim-dialog-overlay" />
        <Dialog.Content className="sim-image-dialog sim-font" dir="ltr">
          <header className="sim-image-dialog-header">
            <div><span className="sim-eyebrow">ACQUISITION REVIEW</span><Dialog.Title>{image ? getProtocol(image.state.protocol).name : 'Radiograph'}</Dialog.Title></div>
            <Dialog.Close className="sim-icon-button" aria-label="Close image review"><Cross2Icon /></Dialog.Close>
          </header>
          <Dialog.Description className="sim-sr-only">Explore a synthetic radiograph, measure modeled coverage and inspect protocol-specific image quality cues. The image is educational, not diagnostic.</Dialog.Description>
          {image && <div className="sim-image-dialog-body">
            <div className="sim-film-view">
              <div className="sim-film-meta"><span>SYNTHETIC ADULT<br />{image.state.kvp} kVp / {image.metrics.mas.toFixed(2)} mAs</span><span>{getProtocol(image.state.protocol).projection}<br />SID {image.state.sid} cm</span></div>
              <div className="sim-film-scroll"><div className="sim-review-film-frame" style={{ width: image.width * zoom, height: image.height * zoom }}>
                <canvas ref={canvasRef} style={{ width: '100%', height: '100%' }} aria-label={`Synthetic ${getProtocol(image.state.protocol).name} radiograph`} />
                {landmarkOverlay && quality && <div className="sim-review-overlay" aria-hidden="true">
                  {quality.coverage.landmarks.filter(item => item.inField && Math.abs(item.detectorXcm) <= 17.5 && Math.abs(item.detectorYcm) <= 21.5).map(item => <span key={item.id} className="sim-review-landmark" style={{ left: `${50 + 100 * item.detectorXcm / 35}%`, top: `${50 - 100 * item.detectorYcm / 43}%` }} title={item.label}><i /></span>)}
                  {Number.isFinite(quality.coverage.bounds.leftCm) && <div className="sim-review-envelope" style={{
                    left: `${50 + 100 * quality.coverage.bounds.leftCm / 35}%`,
                    top: `${50 - 100 * quality.coverage.bounds.topCm / 43}%`,
                    width: `${100 * (quality.coverage.bounds.rightCm - quality.coverage.bounds.leftCm) / 35}%`,
                    height: `${100 * (quality.coverage.bounds.topCm - quality.coverage.bounds.bottomCm) / 43}%`,
                    borderColor: quality.coverage.envelopeCoveragePercent === 100 ? '#84f0c2' : '#f0ad81',
                  }} />}
                </div>}
              </div></div>
              <span className="sim-film-watermark">SYNTHETIC SIMULATION · NOT DIAGNOSTIC</span>
              <div className="sim-film-zoom"><button className="sim-review-overlay-toggle" type="button" aria-pressed={landmarkOverlay} onClick={() => setLandmarkOverlay(value => !value)}>{landmarkOverlay ? 'Hide' : 'Show'} reference points</button><button className="sim-icon-button" aria-label="Zoom out" onClick={() => setZoom((n) => Math.max(0.5, n - 0.25))}><ZoomOutIcon /></button><span>{Math.round(zoom * 100)}%</span><button className="sim-icon-button" aria-label="Zoom in" onClick={() => setZoom((n) => Math.min(3, n + 0.25))}><ZoomInIcon /></button></div>
            </div>
            <aside className="sim-image-settings">
              {quality && <section className="sim-review-quality" aria-label="Quantitative synthetic image quality">
                <span className="sim-section-label">CAPTURED IMAGE / MODEL OBSERVATIONS</span>
                <div className="sim-review-quality-grid">
                  <div><strong>{quality.coverage.envelopeCoveragePercent}%</strong><span>Sampled volume visible</span></div>
                  <div><strong>{quality.coverage.landmarkCoveragePercent}%</strong><span>Landmarks in field</span></div>
                  <div><strong>{quality.tonalSpanPercent.toFixed(1)}%</strong><span>P10–P90 tonal span</span></div>
                  <div><strong>{quality.relativeDetectorFluence.toFixed(2)}×</strong><span>Relative air fluence</span></div>
                </div>
                <p className="sim-review-quant-note">Synthetic measurements; no patient dose, detector EI or clinical acceptance score.</p>
              </section>}
              {quality && <section className="sim-review-tutor" aria-label="Guided radiograph critique">
                <span className="sim-section-label">GUIDED IMAGE CRITIQUE</span>
                <p>Choose what to inspect, then compare your prediction with the modeled evidence.</p>
                <div className="sim-review-focus-options" role="group" aria-label="Select image critique dimension">
                  {(['projection', 'field', 'alignment', 'fluence'] as const).map(option => <button key={option} type="button" aria-pressed={focus === option} onClick={() => setFocus(option)}>{option === 'fluence' ? 'Signal' : option === 'field' ? 'Coverage' : option === 'alignment' ? 'Position' : 'Projection'}</button>)}
                </div>
                {focus === 'projection' ? <div className="sim-review-explanation"><strong>{getProtocol(image.state.protocol).name} projection</strong><p>{quality.projectionExplanation}</p><span>Look for</span><ul>{quality.inspect.map(cue => <li key={cue}>{cue}</li>)}</ul></div>
                  : focusedFinding && <div className="sim-review-prediction">
                    <strong>First, predict: Does {focusedFinding.label.toLowerCase()} need attention?</strong>
                    <div className="sim-review-prediction-options" role="group" aria-label={`Prediction for ${focusedFinding.label}`}>
                      {(['review', 'observed'] as const).map(option => <button key={option} type="button" aria-pressed={predictions[focus] === option} onClick={() => setPredictions(previous => ({ ...previous, [focus]: option }))}>{option === 'review' ? 'Inspect a concern' : 'Within exercise reference'}</button>)}
                    </div>
                    {predictions[focus] && <div className="sim-review-explanation" role="status"><strong>{predictions[focus] === focusedFinding.status ? 'Your prediction matches the model' : 'Compare your prediction with the model'} · {focusedFinding.label}</strong><p>{focusedFinding.evidence}</p><span>Corrective reasoning</span><p>{focusedFinding.correctiveAction}</p></div>}
                  </div>}
                {quality.findings.some(item => item.status === 'review') && <div className="sim-review-alert"><strong>{quality.findings.filter(item => item.status === 'review').length} modeled concern(s) to discuss</strong><p>{quality.findings.filter(item => item.status === 'review').map(item => item.label).join(' · ')}</p></div>}
                <div className="sim-review-landmark-list"><span>Reference landmark audit</span>{quality.coverage.landmarks.map(item => <div key={item.id}><span>{item.label}</span><strong className={item.inField ? '' : 'needs-review'}>{item.inField ? 'IN FIELD' : 'OUTSIDE'}</strong></div>)}</div>
              </section>}
              <section className="sim-review-window-controls"><span className="sim-section-label">DISPLAY WINDOW / PRESENTATION ONLY</span>
                <Parameter label="Window center" value={center} unit="" min={0} max={1} step={0.01} onChange={setCenter} />
                <Parameter label="Window width" value={width} unit="" min={0.05} max={2} step={0.05} onChange={setWidth} />
                <Toggle label="Invert grayscale" checked={inverted} onChange={setInverted} />
                <button className="sim-outline-button" onClick={resetDisplay}><ResetIcon /> Reset display</button>
              </section>
              <div className="sim-review-metrics"><span className="sim-section-label">CAPTURED GEOMETRY</span><dl><div><dt>Magnification</dt><dd>{image.metrics.magnification.toFixed(3)}×</dd></div><div><dt>Geometric blur</dt><dd>{image.metrics.unsharpness.toFixed(3)} mm</dd></div><div><dt>Focal spot</dt><dd>{image.state.focalSpot.toFixed(1)} mm</dd></div><div><dt>Tube angle</dt><dd>{image.state.tubeAngle}°</dd></div><div><dt>Patient rotation</dt><dd>{image.state.patientRotation}°</dd></div><div><dt>Patient offset</dt><dd>{image.state.patientOffsetX.toFixed(1)} / {image.state.patientOffsetY.toFixed(1)} cm</dd></div><div><dt>Arms</dt><dd>{image.state.arms === 'raised' ? 'Raised' : image.state.arms === 'hips' ? 'At hips' : 'Alongside'}</dd></div><div><dt>Breathing</dt><dd>{image.state.breathHeld ? 'Suspended' : 'Free'}</dd></div></dl></div>
              <div className="sim-review-notes"><strong>Acquisition observations</strong>{image.warnings.length ? image.warnings.map((warning) => <p key={warning}>{warning}</p>) : <p>Positioning checks passed for this procedural phantom.</p>}</div>
              <button className="sim-primary-button" onClick={savePng}><DownloadIcon /> Export labeled PNG</button>
              <p className="sim-field-note">Analytical phantom projection. Display values are normalized, not calibrated detector readings.</p>
            </aside>
          </div>}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
