import { calculateMetrics, getReadinessChecks } from './physics';
import type { SimulatorState } from './types';

export type PhysicsTopic = 'distance' | 'sharpness' | 'field';
export type LabDirection = 'increase' | 'decrease' | 'unchanged';

export interface ExperimentObservation {
  baseline: number;
  current: number;
  change: number;
  direction: LabDirection;
  metric: string;
  unit: string;
  explanation: string;
  coverageChanged: boolean;
  coverageOkay: boolean;
}

export function observePhysicsExperiment(topic: PhysicsTopic, initial: SimulatorState, current: SimulatorState): ExperimentObservation {
  const initialMetrics = calculateMetrics(initial);
  const currentMetrics = calculateMetrics(current);
  const title = topic === 'distance' ? 'Relative detector fluence' : topic === 'sharpness' ? 'Geometric unsharpness' : 'Detector field area';
  const unit = topic === 'distance' ? 'model ratio' : topic === 'sharpness' ? 'mm' : 'cm²';
  const baseline = topic === 'distance' ? initialMetrics.relativeExposure : topic === 'sharpness' ? initialMetrics.unsharpness : initial.collimationWidth * initial.collimationHeight;
  const value = topic === 'distance' ? currentMetrics.relativeExposure : topic === 'sharpness' ? currentMetrics.unsharpness : current.collimationWidth * current.collimationHeight;
  const delta = value - baseline;
  const direction = Math.abs(delta) <= Math.max(0.00001, Math.abs(baseline) * 0.001) ? 'unchanged' : delta > 0 ? 'increase' : 'decrease';
  const pastCoverage = getReadinessChecks(initial).find(check => check.id === 'coverage')?.passed === true;
  const coverageOkay = getReadinessChecks(current).find(check => check.id === 'coverage')?.passed === true;
  const explanation = topic === 'distance'
    ? 'For this fixed-technique experiment, increasing source-to-image distance lowers modeled incident detector fluence according to the inverse-square relationship. Patient dose is not calculated.'
    : topic === 'sharpness'
      ? 'Geometric unsharpness increases with focal spot size and object-to-detector separation; source geometry also matters. The number is a detector-plane approximation.'
      : 'A smaller radiation field decreases projected field area. It may also cut off anatomy; check the projected teaching envelope, then inspect the acquired image edges.';
  return { baseline, current: value, change: delta, direction, metric: title, unit, explanation, coverageChanged: coverageOkay !== pastCoverage, coverageOkay };
}
