/**
 * @vitest-environment node
 */
import { readFileSync } from 'fs';
import { beforeAll, describe, expect, it } from 'vitest';
import { createCanvas, loadImage } from '@napi-rs/canvas';
import {
  analyzeCropEdgeLabelDensity,
  fixtureToDataUrl,
  installCanvasPolyfill,
} from '../../test/canvasPolyfill';
import { processPlotImageForOverlay } from '../imageProcessor';

describe('extension crop path', () => {
  beforeAll(async () => {
    await installCanvasPolyfill();
  });

  it('produces the same HomeKoncept crop after PNG canvas extraction', async () => {
    const buffer = readFileSync(`${process.cwd()}/test-fixtures/homekoncept-140-plot.jpg`);
    const img = await loadImage(buffer);
    const canvas = createCanvas(img.width, img.height);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);
    const pngDataUrl = canvas.toDataURL('image/png');

    const fromFixture = await processPlotImageForOverlay(
      fixtureToDataUrl('homekoncept-140-plot.jpg'),
      20.8,
      27.3
    );
    const fromExtensionPath = await processPlotImageForOverlay(pngDataUrl, 20.8, 27.3);
    const edge = await analyzeCropEdgeLabelDensity(fromExtensionPath.imageUrl);

    expect(fromExtensionPath.width).toBe(fromFixture.width);
    expect(fromExtensionPath.height).toBe(fromFixture.height);
    expect(fromExtensionPath.width).toBeLessThanOrEqual(700);
    expect(edge.bottomAnnotationBandRows).toBe(0);
  }, 120000);
});
