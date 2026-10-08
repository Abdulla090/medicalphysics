import { generateRadiograph } from './physics';
import type { SimulatorState } from './types';

export interface RadiographRequest { id: string; state: SimulatorState; seed?: number; width?: number }
export type RadiographResponse = { id: string; pixels: Uint16Array; width: number; height: number } | { id: string; error: string };

self.onmessage = (event: MessageEvent<RadiographRequest>) => {
  const { id, state, seed, width } = event.data;
  try {
    const image = generateRadiograph(state, seed, width);
    self.postMessage({ id, ...image }, { transfer: [image.pixels.buffer] });
  } catch (error) {
    self.postMessage({ id, error: error instanceof Error ? error.message : 'Radiograph calculation failed.' });
  }
};
