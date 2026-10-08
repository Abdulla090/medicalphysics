export type ProtocolId = 'chest-pa' | 'chest-ap' | 'chest-lateral' | 'abdomen-ap' | 'pelvis-ap';
export type CameraView = 'room' | 'patient' | 'tube' | 'detector' | 'first-person';
export type AnatomyView = 'surface' | 'skeleton' | 'organs';

export interface SimulatorState {
  protocol: ProtocolId;
  kvp: number;
  ma: number;
  exposureMs: number;
  sid: number;
  tubeAngle: number;
  collimationWidth: number;
  collimationHeight: number;
  patientRotation: number;
  patientOffsetX: number;
  patientOffsetY: number;
  patientSize: number;
  arms: 'down' | 'raised' | 'hips';
  breathHeld: boolean;
  grid: boolean;
  focalSpot: number;
  anatomy: AnatomyView;
  lightField: boolean;
  showLabels: boolean;
  shielded: boolean;
  detectorReady: boolean;
}

export interface Protocol {
  id: ProtocolId;
  name: string;
  projection: 'PA' | 'AP' | 'LAT';
  region: 'chest' | 'abdomen' | 'pelvis';
  position: 'erect' | 'supine';
  centerY: number;
  description: string;
  positioning: string[];
  defaults: Partial<SimulatorState>;
}

export interface ExposureMetrics {
  mas: number;
  magnification: number;
  unsharpness: number;
  relativeExposure: number;
  noise: number;
}

export interface CapturedImage {
  id: string;
  createdAt: number;
  state: SimulatorState;
  metrics: ExposureMetrics;
  pixels: Uint16Array;
  width: number;
  height: number;
  previewUrl: string;
  warnings: string[];
}

export interface ReadinessCheck {
  id: string;
  label: string;
  passed: boolean;
  blocking: boolean;
  detail: string;
}
