/**
 * @vitest-environment node
 */
import { mkdirSync, readFileSync, writeFileSync } from 'fs';
import path from 'path';
import { beforeAll, it } from 'vitest';
import { installCanvasPolyfill } from '../src/test/canvasPolyfill';
import { processPlotImageForOverlay } from '../src/utils/imageProcessor';

const fixtures = [
  {
    name: 'willa-optima',
    sourceFile: 'willa-optima-plot.png',
    meterWidth: 19.77,
    meterHeight: 23.05,
  },
  {
    name: 'homekoncept-140',
    sourceFile: 'homekoncept-140-plot.jpg',
    meterWidth: 20.8,
    meterHeight: 27.3,
  },
  {
    name: 'kubiczny-d30',
    sourceFile: 'kubiczny-d30-plot.jpg',
    meterWidth: 20.65,
    meterHeight: 26.24,
  },
  {
    name: 'z-charakterem-1',
    sourceFile: 'z-charakterem-1-plot.png',
    meterWidth: 18.25,
    meterHeight: 27.35,
  },
  {
    name: 'willa-parkowa-4',
    sourceFile: 'willa-parkowa-4-plot.png',
    meterWidth: 27.86,
    meterHeight: 25.64,
  },
] as const;

beforeAll(async () => {
  await installCanvasPolyfill();
});

it('writes crop reference fixtures', async () => {
  const outputDir = path.join(process.cwd(), 'test-fixtures/expected');
  mkdirSync(outputDir, { recursive: true });

  for (const fixture of fixtures) {
    const sourcePath = path.join(process.cwd(), 'test-fixtures', fixture.sourceFile);
    const mime = fixture.sourceFile.endsWith('.png') ? 'image/png' : 'image/jpeg';
    const sourceBuffer = readFileSync(sourcePath);
    const sourceDataUrl = `data:${mime};base64,${sourceBuffer.toString('base64')}`;
    const result = await processPlotImageForOverlay(
      sourceDataUrl,
      fixture.meterWidth,
      fixture.meterHeight
    );
    const pngBuffer = Buffer.from(result.imageUrl.split(',')[1], 'base64');

    writeFileSync(path.join(outputDir, `${fixture.name}-crop.png`), pngBuffer);
    writeFileSync(
      path.join(outputDir, `${fixture.name}-crop.json`),
      JSON.stringify(
        {
          width: result.width,
          height: result.height,
          aspect: result.width / result.height,
          meterAspect: fixture.meterWidth / fixture.meterHeight,
          areaRatio: (result.width * result.height) / (sourceBuffer.length || 1),
        },
        null,
        2
      )
    );
  }
}, 120000);
