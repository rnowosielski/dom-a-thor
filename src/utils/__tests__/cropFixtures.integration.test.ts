/**
 * @vitest-environment node
 */
import { readFileSync } from 'fs';
import path from 'path';
import { beforeAll, describe, expect, it } from 'vitest';
import {
  analyzeCropEdgeLabelDensity,
  compareDataUrlToReferencePng,
  fixtureToDataUrl,
  installCanvasPolyfill,
  isCanvasAvailable,
} from '../../test/canvasPolyfill';
import { processPlotImageForOverlay } from '../imageProcessor';

type CropReference = {
  width: number;
  height: number;
  aspect: number;
  meterAspect: number;
  areaRatio: number;
};

const cropFixtures = [
  {
    name: 'willa-optima',
    sourceFile: 'willa-optima-plot.png',
    meterWidth: 19.77,
    meterHeight: 23.05,
    referencePng: 'willa-optima-crop.png',
    referenceJson: 'willa-optima-crop.json',
    maxDifferentPixelRatio: 0,
  },
  {
    name: 'homekoncept-140',
    sourceFile: 'homekoncept-140-plot.jpg',
    meterWidth: 20.8,
    meterHeight: 27.3,
    referencePng: 'homekoncept-140-crop.png',
    referenceJson: 'homekoncept-140-crop.json',
    maxDifferentPixelRatio: 0,
  },
] as const;

const readReference = (referenceJson: string): CropReference => {
  const filePath = path.join(process.cwd(), 'test-fixtures/expected', referenceJson);
  return JSON.parse(readFileSync(filePath, 'utf8')) as CropReference;
};

const canvasReady = await isCanvasAvailable();

const cropQualityExpectations = {
  'willa-optima': {
    maxBottomAnnotationBandRows: 1,
    maxTopWhiteRatio: 0.95,
    minWidth: 335,
    minHeight: 390,
    maxWidth: 360,
  },
  'homekoncept-140': {
    maxBottomAnnotationBandRows: 0,
    maxTopWhiteRatio: 0.5,
    minWidth: 590,
    minHeight: 780,
    maxWidth: 620,
  },
} as const;

describe.skipIf(!canvasReady)('crop fixture regression', () => {
  beforeAll(async () => {
    await installCanvasPolyfill();
  });

  it.each(cropFixtures)('$name matches saved crop reference pixels', async (fixture) => {
    const reference = readReference(fixture.referenceJson);
    const sourceDataUrl = fixtureToDataUrl(fixture.sourceFile);
    const actual = await processPlotImageForOverlay(
      sourceDataUrl,
      fixture.meterWidth,
      fixture.meterHeight
    );

    expect(actual.width).toBe(reference.width);
    expect(actual.height).toBe(reference.height);
    expect(actual.width / actual.height).toBeCloseTo(reference.meterAspect, 2);

    const comparison = await compareDataUrlToReferencePng(actual.imageUrl, fixture.referencePng);
    const differentRatio = comparison.differingPixels / comparison.totalPixels;

    expect(comparison.width).toBe(reference.width);
    expect(comparison.height).toBe(reference.height);
    expect(differentRatio).toBeLessThanOrEqual(fixture.maxDifferentPixelRatio);

    const edge = await analyzeCropEdgeLabelDensity(actual.imageUrl);
    const quality = cropQualityExpectations[fixture.name];
    expect(edge.bottomAnnotationBandRows).toBeLessThanOrEqual(quality.maxBottomAnnotationBandRows);
    expect(edge.topWhiteRatio).toBeLessThanOrEqual(quality.maxTopWhiteRatio);
    expect(actual.width).toBeGreaterThanOrEqual(quality.minWidth);
    expect(actual.height).toBeGreaterThanOrEqual(quality.minHeight);
    expect(actual.width).toBeLessThanOrEqual(quality.maxWidth);
  }, 45000);

  it('documents the user-reported HomeKoncept regression screenshot', () => {
    const screenshotPath = path.join(
      process.cwd(),
      'test-fixtures/user-reports/homekoncept-bottom-labels-broken.png'
    );
    expect(readFileSync(screenshotPath).byteLength).toBeGreaterThan(1024);
  });
});
