import { readFileSync } from 'fs';
import path from 'path';

let installed = false;

const loadCanvasModule = async () => {
  return import('@napi-rs/canvas');
};

export const installCanvasPolyfill = async (): Promise<void> => {
  if (installed) {
    return;
  }

  const { createCanvas, Image } = await loadCanvasModule();

  globalThis.Image = Image as unknown as typeof Image;
  globalThis.document = {
    createElement(tagName: string) {
      if (tagName === 'canvas') {
        return createCanvas(1, 1) as unknown as HTMLCanvasElement;
      }

      throw new Error(`Unsupported element: ${tagName}`);
    },
  } as Document;

  installed = true;
};

export const fixtureToDataUrl = (relativePath: string): string => {
  const buffer = readFileSync(path.join(process.cwd(), 'test-fixtures', relativePath));
  const mime = relativePath.endsWith('.png') ? 'image/png' : 'image/jpeg';
  return `data:${mime};base64,${buffer.toString('base64')}`;
};

export const compareDataUrlToReferencePng = async (
  actualDataUrl: string,
  expectedRelativePath: string
): Promise<{ width: number; height: number; differingPixels: number; totalPixels: number }> => {
  const { createCanvas, loadImage } = await loadCanvasModule();
  const expectedPath = path.join(process.cwd(), 'test-fixtures/expected', expectedRelativePath);
  const actualImage = await loadImage(actualDataUrl);
  const expectedImage = await loadImage(expectedPath);

  if (actualImage.width !== expectedImage.width || actualImage.height !== expectedImage.height) {
    return {
      width: actualImage.width,
      height: actualImage.height,
      differingPixels: Number.MAX_SAFE_INTEGER,
      totalPixels: actualImage.width * actualImage.height,
    };
  }

  const width = actualImage.width;
  const height = actualImage.height;
  const actualCanvas = createCanvas(width, height);
  const expectedCanvas = createCanvas(width, height);
  const actualCtx = actualCanvas.getContext('2d');
  const expectedCtx = expectedCanvas.getContext('2d');

  actualCtx.drawImage(actualImage, 0, 0);
  expectedCtx.drawImage(expectedImage, 0, 0);

  const actualData = actualCtx.getImageData(0, 0, width, height).data;
  const expectedData = expectedCtx.getImageData(0, 0, width, height).data;
  let differingPixels = 0;

  for (let i = 0; i < actualData.length; i += 4) {
    if (
      actualData[i] !== expectedData[i] ||
      actualData[i + 1] !== expectedData[i + 1] ||
      actualData[i + 2] !== expectedData[i + 2] ||
      actualData[i + 3] !== expectedData[i + 3]
    ) {
      differingPixels++;
    }
  }

  return {
    width,
    height,
    differingPixels,
    totalPixels: width * height,
  };
};

export const isCanvasAvailable = async (): Promise<boolean> => {
  try {
    await loadCanvasModule();
    return true;
  } catch {
    return false;
  }
};

export type CropEdgeLabelDensity = {
  width: number;
  height: number;
  topWhiteRatio: number;
  bottomLabelRowRatio: number;
  bottomLabelBandRows: number;
  bottomAnnotationBandRows: number;
};

const isDimensionLabelPixel = (r: number, g: number, b: number): boolean => {
  const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
  const saturation = Math.max(r, g, b) - Math.min(r, g, b);
  return luminance < 28 && saturation < 18;
};

const isWhiteMarginPixel = (r: number, g: number, b: number): boolean => {
  const minChannel = Math.min(r, g, b);
  const maxChannel = Math.max(r, g, b);
  return minChannel > 238 && maxChannel - minChannel < 28;
};

export const analyzeCropEdgeLabelDensity = async (
  imageDataUrl: string
): Promise<CropEdgeLabelDensity> => {
  const { createCanvas, loadImage } = await loadCanvasModule();
  const image = await loadImage(imageDataUrl);
  const canvas = createCanvas(image.width, image.height);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(image, 0, 0);
  const { width, height, data } = ctx.getImageData(0, 0, image.width, image.height);
  const centerInset = Math.max(2, Math.round(width * 0.14));
  const topBandRows = Math.max(2, Math.round(height * 0.04));
  const bottomBandRows = Math.max(4, Math.round(height * 0.04));

  let topWhitePixels = 0;
  let topPixels = 0;

  for (let y = 0; y < topBandRows; y++) {
    for (let x = centerInset; x < width - centerInset; x++) {
      topPixels++;
      const i = (y * width + x) * 4;
      if (isWhiteMarginPixel(data[i], data[i + 1], data[i + 2])) {
        topWhitePixels++;
      }
    }
  }

  let bottomLabelBandRows = 0;
  let bottomAnnotationBandRows = 0;
  let maxBottomLabelRowRatio = 0;
  const annotationBandRows = Math.max(6, Math.round(height * 0.06));

  for (let y = height - bottomBandRows; y < height; y++) {
    let labelMarks = 0;
    let samples = 0;

    for (let x = centerInset; x < width - centerInset; x++) {
      samples++;
      const i = (y * width + x) * 4;
      if (isDimensionLabelPixel(data[i], data[i + 1], data[i + 2])) {
        labelMarks++;
      }
    }

    const rowRatio = samples > 0 ? labelMarks / samples : 0;
    maxBottomLabelRowRatio = Math.max(maxBottomLabelRowRatio, rowRatio);
    if (rowRatio > 0.006) {
      bottomLabelBandRows++;
    }
  }

  for (let y = height - annotationBandRows; y < height; y++) {
    let labelMarks = 0;
    let background = 0;
    let samples = 0;

    for (let x = centerInset; x < width - centerInset; x++) {
      samples++;
      const i = (y * width + x) * 4;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const min = Math.min(r, g, b);
      const max = Math.max(r, g, b);
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;
      const sat = max - min;

      if (isDimensionLabelPixel(r, g, b)) {
        labelMarks++;
      }

      if (min > 235 || (sat < 28 && lum > 185)) {
        background++;
      }
    }

    const labelRatio = samples > 0 ? labelMarks / samples : 0;
    const backgroundRatio = samples > 0 ? background / samples : 0;
    if (labelRatio > 0.025 && backgroundRatio > 0.45) {
      bottomAnnotationBandRows++;
    }
  }

  return {
    width,
    height,
    topWhiteRatio: topPixels > 0 ? topWhitePixels / topPixels : 0,
    bottomLabelRowRatio: maxBottomLabelRowRatio,
    bottomLabelBandRows,
    bottomAnnotationBandRows,
  };
};
