import { useEffect, useRef, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Cross2Icon, DownloadIcon, ResetIcon, ZoomInIcon, ZoomOutIcon } from '@radix-ui/react-icons';
import { renderPixelsToCanvas } from './physics';
import { getProtocol } from './protocols';
import type { CapturedImage } from './types';
import { Parameter, Toggle } from './Controls';

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
  const [center, setCenter] = useState(0.5);
  const [width, setWidth] = useState(1);
  const [inverted, setInverted] = useState(false);
  const [zoom, setZoom] = useState(1);
  useEffect(() => { setCenter(0.5); setWidth(1); setInverted(false); setZoom(1); }, [image?.id]);
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
    context.fillText('MEDICALPHYSICS / SYNTHETIC SIMULATION', 14, image.height + 25);
    context.fillText(`${getProtocol(image.state.protocol).name}  ${image.state.kvp} kVp  ${image.metrics.mas.toFixed(2)} mAs  SID ${image.state.sid} cm`, 14, image.height + 47);
    downloadFile(result.toDataURL('image/png'), `synthetic-${image.state.protocol}-${image.id}.png`);
  };

  return (
    <Dialog.Root open={!!image} onOpenChange={(open) => { if (!open) onClose(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="sim-dialog-overlay" />
        <Dialog.Content className="sim-image-dialog sim-font" dir="ltr">
          <header className="sim-image-dialog-header">
            <div><span className="sim-eyebrow">ACQUISITION REVIEW</span><Dialog.Title>{image ? getProtocol(image.state.protocol).name : 'Radiograph'}</Dialog.Title></div>
            <Dialog.Close className="sim-icon-button" aria-label="Close image review"><Cross2Icon /></Dialog.Close>
          </header>
          <Dialog.Description className="sim-sr-only">Review a synthetic radiograph. Adjust the display window, invert, zoom, and export a labeled PNG.</Dialog.Description>
          {image && <div className="sim-image-dialog-body">
            <div className="sim-film-view">
              <div className="sim-film-meta"><span>SYNTHETIC ADULT<br />{image.state.kvp} kVp / {image.metrics.mas.toFixed(2)} mAs</span><span>{getProtocol(image.state.protocol).projection}<br />SID {image.state.sid} cm</span></div>
              <div className="sim-film-scroll"><canvas ref={canvasRef} style={{ height: `${zoom * 100}%` }} aria-label={`Synthetic ${getProtocol(image.state.protocol).name} radiograph`} /></div>
              <span className="sim-film-watermark">SYNTHETIC SIMULATION · NOT DIAGNOSTIC</span>
              <div className="sim-film-zoom"><button className="sim-icon-button" aria-label="Zoom out" onClick={() => setZoom((n) => Math.max(0.5, n - 0.25))}><ZoomOutIcon /></button><span>{Math.round(zoom * 100)}%</span><button className="sim-icon-button" aria-label="Zoom in" onClick={() => setZoom((n) => Math.min(3, n + 0.25))}><ZoomInIcon /></button></div>
            </div>
            <aside className="sim-image-settings">
              <span className="sim-section-label">DISPLAY WINDOW</span>
              <Parameter label="Window center" value={center} unit="" min={0} max={1} step={0.01} onChange={setCenter} />
              <Parameter label="Window width" value={width} unit="" min={0.05} max={2} step={0.05} onChange={setWidth} />
              <Toggle label="Invert grayscale" checked={inverted} onChange={setInverted} />
              <button className="sim-outline-button" onClick={() => { setCenter(0.5); setWidth(1); setInverted(false); setZoom(1); }}><ResetIcon /> Reset display</button>
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
