/**
 * @vitest-environment node
 */
import { readFileSync } from 'fs';
import { beforeAll, it, expect } from 'vitest';
import {
  adjustCropToMeterAspect,
  cropToInnerRectangle,
  processPlotImageForOverlay,
} from '../imageProcessor';
import { analyzeCropEdgeLabelDensity, fixtureToDataUrl, installCanvasPolyfill } from '../../test/canvasPolyfill';

beforeAll(async () => {
  await installCanvasPolyfill();
});

it('processPlotImageForOverlay removes bottom labels on homekoncept', async () => {
  const url = fixtureToDataUrl('homekoncept-140-plot.jpg');
  const result = await processPlotImageForOverlay(url, 20.8, 27.3);
  const edge = await analyzeCropEdgeLabelDensity(result.imageUrl);

  expect(result.width).toBeLessThanOrEqual(700);
  expect(edge.bottomAnnotationBandRows).toBe(0);
}, 120000);

it('broken aspect-only crop keeps bottom labels', async () => {
  const url = fixtureToDataUrl('homekoncept-140-plot.jpg');
  const cropped = await cropToInnerRectangle(url, undefined, 20.8, 27.3);
  let broken = cropped;
  broken = await adjustCropToMeterAspect(broken, 20.8, 27.3);
  broken = await adjustCropToMeterAspect(broken, 20.8, 27.3);
  const edge = await analyzeCropEdgeLabelDensity(broken.imageUrl);

  expect(broken.width).toBe(724);
  expect(edge.bottomAnnotationBandRows).toBeGreaterThanOrEqual(2);
}, 120000);
