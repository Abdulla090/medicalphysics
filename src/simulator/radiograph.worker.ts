import { analyzeRadiographQuality, generateRadiograph, type RadiographQualityReport } from './physics';
import type { SimulatorState } from './types';

export interface RadiographRequest { id: string; state: SimulatorState; seed?: number; width?: number }
export type RadiographResponse = { id: string; pixels: Uint16Array; width: number; height: number; quality: RadiographQualityReport } | { id: string; error: string };

self.onmessage = (event: MessageEvent<RadiographRequest>) => {
  const { id, state, seed, width } = event.data;
  try {
    const image = generateRadiograph(state, seed, width);
    const quality = analyzeRadiographQuality(state, image.pixels, image.width, image.height);
    self.postMessage({ id, ...image, quality } satisfies RadiographResponse, { transfer: [image.pixels.buffer] });
  } catch (error) {
    self.postMessage({ id, error: error instanceof Error ? error.message : 'Radiograph calculation failed.' });
  }
};
