/**
 * Configuration for the image cropping algorithm
 */
export interface CropConfig {
  cannyLow: number;
  cannyHigh: number;
  dilationIterations: number;
  minAreaPercent: number;
  insetMargin: number;
}

/**
 * Default configuration values that work well for most house images
 */
export const DEFAULT_CROP_CONFIG: CropConfig = {
  cannyLow: 60,
  cannyHigh: 140,
  dilationIterations: 4,
  minAreaPercent: 15,
  insetMargin: 2,
};

export const normalizeExtradomImageUrl = (imageUrl: string): string => {
  const match = imageUrl.match(/wpcdn\.pl\/(.+)$/);
  if (match) {
    return `https://wpcdn.pl/${match[1]}`;
  }

  return imageUrl;
};

export const loadImageAsDataUrl = async (imageUrl: string): Promise<string> => {
  if (imageUrl.startsWith('data:') || imageUrl.startsWith('blob:')) {
    return imageUrl;
  }

  const normalizedUrl = normalizeExtradomImageUrl(imageUrl);
  const response = await fetch(normalizedUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${response.status}`);
  }

  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Failed to read image blob'));
    reader.readAsDataURL(blob);
  });
};

export const getImageNaturalDimensions = (
  imageUrl: string
): Promise<{ width: number; height: number }> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = imageUrl;
  });
};

export const alignMeterDimensionsWithImageOrientation = (
  meterWidth: number,
  meterHeight: number,
  _imageWidth: number,
  _imageHeight: number
): { width: number; height: number } => {
  return { width: meterWidth, height: meterHeight };
};

export const adjustCropToMeterAspect = async (
  cropped: { imageUrl: string; width: number; height: number },
  meterWidth: number,
  meterHeight: number
): Promise<{ imageUrl: string; width: number; height: number }> => {
  const targetAspect = meterWidth / meterHeight;
  const currentAspect = cropped.width / cropped.height;

  if (Math.abs(targetAspect - currentAspect) < 0.005) {
    return cropped;
  }

  return new Promise((resolve, reject) => {
    const img = new Image();

    img.onload = () => {
      let cropWidth = cropped.width;
      let cropHeight = cropped.height;
      let cropX = 0;
      let cropY = 0;

      if (currentAspect > targetAspect) {
        cropWidth = Math.max(1, Math.round(cropped.height * targetAspect));
        const maxOffset = Math.max(0, cropped.width - cropWidth);
        cropX = chooseBestHorizontalCropOffset(img, cropWidth, cropped.height, maxOffset);
      } else {
        cropHeight = Math.max(1, Math.round(cropped.width / targetAspect));
        const maxOffset = Math.max(0, cropped.height - cropHeight);
        cropY = chooseBestVerticalCropOffset(img, cropped.width, cropHeight, maxOffset);
      }

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }

      canvas.width = cropWidth;
      canvas.height = cropHeight;
      ctx.drawImage(
        img,
        cropX,
        cropY,
        cropWidth,
        cropHeight,
        0,
        0,
        cropWidth,
        cropHeight
      );

      resolve({
        imageUrl: canvas.toDataURL('image/png'),
        width: cropWidth,
        height: cropHeight,
      });
    };

    img.onerror = () => reject(new Error('Failed to load cropped image'));
    img.src = cropped.imageUrl;
  });
};

const chooseBestHorizontalCropOffset = (
  image: HTMLImageElement,
  cropWidth: number,
  cropHeight: number,
  maxOffset: number
): number => {
  if (maxOffset <= 0) {
    return 0;
  }

  const fullCanvas = document.createElement('canvas');
  const fullCtx = fullCanvas.getContext('2d');

  if (!fullCtx) {
    return Math.round(maxOffset / 2);
  }

  fullCanvas.width = image.naturalWidth;
  fullCanvas.height = image.naturalHeight;
  fullCtx.drawImage(image, 0, 0);
  const imageData = fullCtx.getImageData(0, 0, fullCanvas.width, fullCanvas.height);
  const step = Math.max(1, Math.round(maxOffset / 48));

  let bestOffset = Math.round(maxOffset / 2);
  let bestScore = Number.NEGATIVE_INFINITY;

  for (let offset = 0; offset <= maxOffset; offset += step) {
    const score = scoreHorizontalCropWindow(
      imageData,
      fullCanvas.width,
      fullCanvas.height,
      offset,
      cropWidth,
      cropHeight
    );

    if (score > bestScore) {
      bestScore = score;
      bestOffset = offset;
    }
  }

  return bestOffset;
};

const chooseBestVerticalCropOffset = (
  image: HTMLImageElement,
  cropWidth: number,
  cropHeight: number,
  maxOffset: number
): number => {
  if (maxOffset <= 0) {
    return 0;
  }

  const fullCanvas = document.createElement('canvas');
  const fullCtx = fullCanvas.getContext('2d');

  if (!fullCtx) {
    return 0;
  }

  fullCanvas.width = image.naturalWidth;
  fullCanvas.height = image.naturalHeight;
  fullCtx.drawImage(image, 0, 0);
  const imageData = fullCtx.getImageData(0, 0, fullCanvas.width, fullCanvas.height);
  const step = Math.max(1, Math.round(maxOffset / 48));

  let bestOffset = 0;
  let bestScore = Number.NEGATIVE_INFINITY;

  for (let offset = 0; offset <= maxOffset; offset += step) {
    const score = scoreVerticalCropWindow(
      imageData,
      fullCanvas.width,
      fullCanvas.height,
      offset,
      cropWidth,
      cropHeight
    );

    if (score > bestScore) {
      bestScore = score;
      bestOffset = offset;
    }
  }

  return bestOffset;
};

const scoreVerticalCropWindow = (
  imageData: ImageData,
  imageWidth: number,
  imageHeight: number,
  offsetY: number,
  windowWidth: number,
  windowHeight: number
): number => {
  const { data } = imageData;
  const edgeBand = Math.max(2, Math.round(Math.min(windowWidth, windowHeight) * 0.05));
  const topBand = Math.max(3, Math.round(windowHeight * 0.08));
  let plotScore = 0;
  let edgePenalty = 0;
  let topWhitePenalty = 0;

  for (let y = 0; y < windowHeight; y++) {
    for (let x = 0; x < windowWidth; x++) {
      const px = x;
      const py = offsetY + y;

      if (px < 0 || py < 0 || px >= imageWidth || py >= imageHeight) {
        continue;
      }

      if (isPlotFillPixel(data, imageWidth, imageHeight, px, py)) {
        plotScore += 2;
      } else if (isGreenPlotPixel(data, imageWidth, imageHeight, px, py)) {
        plotScore += 3;
      } else if (isDarkAnnotationPixel(data, imageWidth, imageHeight, px, py)) {
        plotScore -= 4;
      }

      const onEdge =
        x < edgeBand || y < edgeBand || x >= windowWidth - edgeBand || y >= windowHeight - edgeBand;

      if (!onEdge) {
        continue;
      }

      const i = (py * imageWidth + px) * 4;
      if (
        isBackgroundPixel(data[i], data[i + 1], data[i + 2]) ||
        isDarkAnnotationPixel(data, imageWidth, imageHeight, px, py)
      ) {
        edgePenalty++;
      }

      if (y < topBand && isBackgroundPixel(data[i], data[i + 1], data[i + 2])) {
        topWhitePenalty++;
      }
    }
  }

  return plotScore - edgePenalty * 2 - topWhitePenalty * 3;
};

const scoreHorizontalCropWindow = (
  imageData: ImageData,
  imageWidth: number,
  imageHeight: number,
  offsetX: number,
  windowWidth: number,
  windowHeight: number
): number => {
  const { data } = imageData;
  const edgeBand = Math.max(2, Math.round(Math.min(windowWidth, windowHeight) * 0.05));
  let plotScore = 0;
  let edgePenalty = 0;

  for (let y = 0; y < windowHeight; y++) {
    for (let x = 0; x < windowWidth; x++) {
      const px = offsetX + x;
      const py = y;

      if (px < 0 || py < 0 || px >= imageWidth || py >= imageHeight) {
        continue;
      }

      if (isPlotFillPixel(data, imageWidth, imageHeight, px, py)) {
        plotScore += 2;
      } else if (isGreenPlotPixel(data, imageWidth, imageHeight, px, py)) {
        plotScore += 3;
      } else if (isDarkAnnotationPixel(data, imageWidth, imageHeight, px, py)) {
        plotScore -= 4;
      }

      const onEdge =
        x < edgeBand || y < edgeBand || x >= windowWidth - edgeBand || y >= windowHeight - edgeBand;

      if (!onEdge) {
        continue;
      }

      const i = (py * imageWidth + px) * 4;
      if (
        isBackgroundPixel(data[i], data[i + 1], data[i + 2]) ||
        isDarkAnnotationPixel(data, imageWidth, imageHeight, px, py)
      ) {
        edgePenalty++;
      }
    }
  }

  return plotScore - edgePenalty * 2;
};

export const trimAnnotationMarginsFromCrop = async (
  cropped: { imageUrl: string; width: number; height: number }
): Promise<{ imageUrl: string; width: number; height: number }> => {
  return new Promise((resolve, reject) => {
    const img = new Image();

    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }

      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const trimmedRect = shrinkRectPastLabelBands(
        { x: 0, y: 0, width: canvas.width, height: canvas.height },
        imageData,
        canvas.width,
        canvas.height,
        { forceMarginTrim: true }
      );

      if (
        trimmedRect.x === 0 &&
        trimmedRect.y === 0 &&
        trimmedRect.width === canvas.width &&
        trimmedRect.height === canvas.height
      ) {
        resolve(cropped);
        return;
      }

      resolve(cropToRect(canvas, trimmedRect, 0));
    };

    img.onerror = () => reject(new Error('Failed to load cropped image'));
    img.src = cropped.imageUrl;
  });
};

const untrimmedGreenFrameMinWidth = 680;

const cropHasGreenFrameSideColumns = async (
  cropped: { imageUrl: string; width: number; height: number }
): Promise<boolean> => {
  return new Promise((resolve, reject) => {
    const img = new Image();

    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        resolve(false);
        return;
      }

      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

      resolve(
        hasGreenFrameSideColumns(
          imageData.data,
          canvas.width,
          canvas.height,
          { x: 0, y: 0, width: canvas.width, height: canvas.height }
        )
      );
    };

    img.onerror = () => reject(new Error('Failed to load cropped image'));
    img.src = cropped.imageUrl;
  });
};

const getChosenCropMethodName = async (
  imageUrl: string,
  meterWidth: number,
  meterHeight: number,
  config: CropConfig = DEFAULT_CROP_CONFIG
): Promise<string | null> => {
  const processableUrl = await loadImageAsDataUrl(imageUrl);

  return new Promise((resolve, reject) => {
    const img = new Image();

    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        resolve(null);
        return;
      }

      const maxSide = 1400;
      const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
      canvas.width = Math.round(img.naturalWidth * scale);
      canvas.height = Math.round(img.naturalHeight * scale);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const chosen = findChosenCropRect(canvas, config, meterWidth, meterHeight);

      resolve(chosen?.methodName ?? null);
    };

    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = processableUrl;
  });
};

const enforceMeterAspect = async (
  cropped: { imageUrl: string; width: number; height: number },
  meterWidth: number,
  meterHeight: number,
  maxPasses = 2
): Promise<{ imageUrl: string; width: number; height: number }> => {
  const targetAspect = meterWidth / meterHeight;
  let current = cropped;

  for (let pass = 0; pass < maxPasses; pass++) {
    if (Math.abs(current.width / current.height - targetAspect) <= 0.005) {
      break;
    }

    current = await adjustCropToMeterAspect(current, meterWidth, meterHeight);
  }

  if (Math.abs(current.width / current.height - targetAspect) > 0.005) {
    current = await adjustCropToMeterAspect(current, meterWidth, meterHeight);
  }

  return current;
};

const applyGreenFrameTrimPipeline = async (
  cropped: { imageUrl: string; width: number; height: number },
  meterWidth: number,
  meterHeight: number
): Promise<{ imageUrl: string; width: number; height: number }> => {
  const targetAspect = meterWidth / meterHeight;
  let current = cropped;

  current = await trimAnnotationMarginsFromCrop(current);
  current = await adjustCropToMeterAspect(current, meterWidth, meterHeight);
  current = await trimAnnotationMarginsFromCrop(current);

  for (let pass = 0; pass < 2; pass++) {
    if (Math.abs(current.width / current.height - targetAspect) <= 0.005) {
      break;
    }

    current = await adjustCropToMeterAspect(current, meterWidth, meterHeight);
    current = await trimAnnotationMarginsFromCrop(current);
  }

  if (Math.abs(current.width / current.height - targetAspect) > 0.005) {
    current = await adjustCropToMeterAspect(current, meterWidth, meterHeight);
  }

  current = await trimAnnotationMarginsFromCrop(current);

  return current;
};

const applyPlainPlotTrimPipeline = async (
  cropped: { imageUrl: string; width: number; height: number },
  meterWidth: number,
  meterHeight: number
): Promise<{ imageUrl: string; width: number; height: number }> => {
  const targetAspect = meterWidth / meterHeight;
  let current = await enforceMeterAspect(cropped, meterWidth, meterHeight);

  current = await trimAnnotationMarginsFromCrop(current);

  if (Math.abs(current.width / current.height - targetAspect) > 0.01) {
    current = await enforceMeterAspect(current, meterWidth, meterHeight);
  }

  return current;
};

export const processPlotImageForOverlay = async (
  imageUrl: string,
  meterWidth: number,
  meterHeight: number,
  config: CropConfig = DEFAULT_CROP_CONFIG
): Promise<{ imageUrl: string; width: number; height: number }> => {
  const method = await getChosenCropMethodName(imageUrl, meterWidth, meterHeight, config);
  let current = await cropToInnerRectangle(imageUrl, config, meterWidth, meterHeight);
  const hasGreenFrame = await cropHasGreenFrameSideColumns(current);

  if (method === 'stipple') {
    const targetAspect = meterWidth / meterHeight;
    if (Math.abs(current.width / current.height - targetAspect) > 0.015) {
      current = await enforceMeterAspect(current, meterWidth, meterHeight);
    }

    if (!hasGreenFrame && current.width <= untrimmedGreenFrameMinWidth) {
      return current;
    }
  }

  if (method === 'greenFrame' || hasGreenFrame) {
    return applyGreenFrameTrimPipeline(current, meterWidth, meterHeight);
  }

  return applyPlainPlotTrimPipeline(current, meterWidth, meterHeight);
};

/**
 * Process an image to crop to the inner land-plot rectangle using pure JavaScript
 */
export const cropToInnerRectangle = async (
  imageUrl: string,
  config: CropConfig = DEFAULT_CROP_CONFIG,
  meterWidth?: number,
  meterHeight?: number
): Promise<{imageUrl: string, width: number, height: number}> => {
  const processableUrl = await loadImageAsDataUrl(imageUrl);

  return new Promise((resolve, reject) => {
    const img = new Image();

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }

        const maxSide = 1400;
        const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
        canvas.width = Math.round(img.naturalWidth * scale);
        canvas.height = Math.round(img.naturalHeight * scale);

        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        try {
          const processedData = processImageWithJavaScript(canvas, config, meterWidth, meterHeight);
          resolve(processedData);
        } catch {
          resolve({ imageUrl: canvas.toDataURL('image/png'), width: canvas.width, height: canvas.height });
        }
      } catch (error) {
        reject(error);
      }
    };

    img.onerror = () => {
      reject(new Error('Failed to load image'));
    };

    img.src = processableUrl;
  });
};

/**
 * Process image using pure JavaScript to find and crop the inner rectangle
 */
type CropRect = { x: number; y: number; width: number; height: number };

type ShrinkRectOptions = {
  forceMarginTrim?: boolean;
};

const findChosenCropRect = (
  canvas: HTMLCanvasElement,
  config: CropConfig,
  meterWidth?: number,
  meterHeight?: number
): { cropRect: CropRect; imageData: ImageData; methodName: string } | null => {
  const { cannyLow, cannyHigh, dilationIterations, minAreaPercent } = config;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    return null;
  }

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const contentRect = findPlotBoundsByContentMask(imageData, canvas.width, canvas.height);
  const searchRect = contentRect ?? {
    x: 0,
    y: 0,
    width: canvas.width,
    height: canvas.height,
  };

  const grayData = convertToGrayscale(imageData);
  const blurredData = applyGaussianBlur(grayData, canvas.width, canvas.height);
  const edgeData = applyCannyEdgeDetection(blurredData, canvas.width, canvas.height, cannyLow, cannyHigh);

  let dilatedData = edgeData;
  if (dilationIterations > 0) {
    dilatedData = applyDilation(edgeData, canvas.width, canvas.height, dilationIterations);
  }

  const borderRect = findPlotBoundsByEdgeProjection(
    dilatedData,
    canvas.width,
    canvas.height,
    searchRect
  );
  const stippleRect = findPlotBoundsByStippleProjection(
    imageData,
    canvas.width,
    canvas.height,
    searchRect
  );
  const plotFillRect = findPlotBoundsByPlotFillProjection(
    imageData,
    canvas.width,
    canvas.height,
    searchRect
  );
  const greenFillRect = findPlotBoundsByGreenFillProjection(
    imageData,
    canvas.width,
    canvas.height,
    searchRect
  );
  const greenFrameRect = findPlotBoundsByGreenFrame(
    imageData,
    canvas.width,
    canvas.height,
    searchRect
  );
  const structureRect = findPlotBoundsByStructureMask(
    imageData,
    canvas.width,
    canvas.height,
    searchRect
  );
  const contours = findContours(dilatedData, canvas.width, canvas.height);
  const edgeRect = findBestRectangle(contours, canvas.width, canvas.height, minAreaPercent, contentRect);
  const cropCandidate = chooseCropCandidate(
    contentRect,
    edgeRect,
    borderRect,
    structureRect,
    stippleRect,
    plotFillRect,
    greenFillRect,
    greenFrameRect,
    canvas.width,
    canvas.height,
    meterWidth,
    meterHeight
  );

  if (!cropCandidate) {
    return null;
  }

  return {
    cropRect: cropCandidate.rect,
    imageData,
    methodName: cropCandidate.name,
  };
};

const processImageWithJavaScript = (
  canvas: HTMLCanvasElement,
  config: CropConfig,
  meterWidth?: number,
  meterHeight?: number
): { imageUrl: string, width: number, height: number } => {
  const { insetMargin } = config;
  const chosen = findChosenCropRect(canvas, config, meterWidth, meterHeight);

  if (chosen) {
    const trimmedRect = shrinkRectPastLabelBands(
      chosen.cropRect,
      chosen.imageData,
      canvas.width,
      canvas.height
    );
    const cropInset = chosen.methodName === 'stipple' ? 0 : insetMargin;
    return cropToRect(canvas, trimmedRect, cropInset);
  }

  return { imageUrl: canvas.toDataURL('image/png'), width: canvas.width, height: canvas.height };
};

const isBackgroundPixel = (r: number, g: number, b: number): boolean => {
  const minChannel = Math.min(r, g, b);
  const maxChannel = Math.max(r, g, b);
  const saturation = maxChannel - minChannel;
  const luminance = 0.299 * r + 0.587 * g + 0.114 * b;

  if (minChannel > 235) {
    return true;
  }

  if (saturation < 20 && minChannel > 200) {
    return true;
  }

  if (saturation < 28 && luminance > 185) {
    return true;
  }

  return false;
};

const isBlueLabelPixel = (r: number, g: number, b: number): boolean => {
  return b > 120 && b > r + 40 && b > g + 15;
};

const isDimensionLabelPixel = (r: number, g: number, b: number): boolean => {
  const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
  const saturation = Math.max(r, g, b) - Math.min(r, g, b);
  return luminance < 28 && saturation < 18;
};

const getLocalBackgroundRatio = (
  data: Uint8ClampedArray,
  width: number,
  height: number,
  x: number,
  y: number,
  radius = 2
): number => {
  let background = 0;
  let total = 0;

  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      const px = x + dx;
      const py = y + dy;

      if (px < 0 || py < 0 || px >= width || py >= height) {
        continue;
      }

      total++;
      const i = (py * width + px) * 4;
      if (isBackgroundPixel(data[i], data[i + 1], data[i + 2])) {
        background++;
      }
    }
  }

  return total > 0 ? background / total : 0;
};

const isDarkAnnotationPixel = (
  data: Uint8ClampedArray,
  width: number,
  height: number,
  x: number,
  y: number
): boolean => {
  const i = (y * width + x) * 4;
  const r = data[i];
  const g = data[i + 1];
  const b = data[i + 2];

  if (isBackgroundPixel(r, g, b) || isBlueLabelPixel(r, g, b)) {
    return false;
  }

  const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
  const saturation = Math.max(r, g, b) - Math.min(r, g, b);

  if (luminance > 95 || saturation > 45) {
    return false;
  }

  if (isGreenPlotPixel(data, width, height, x, y)) {
    return false;
  }

  return getLocalBackgroundRatio(data, width, height, x, y) > 0.72;
};

const isMarginInkPixel = (
  data: Uint8ClampedArray,
  width: number,
  height: number,
  x: number,
  y: number
): boolean => {
  const i = (y * width + x) * 4;
  const r = data[i];
  const g = data[i + 1];
  const b = data[i + 2];

  if (isBackgroundPixel(r, g, b) || isBlueLabelPixel(r, g, b)) {
    return false;
  }

  const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
  const saturation = Math.max(r, g, b) - Math.min(r, g, b);

  if (luminance > 165 || saturation > 50) {
    return false;
  }

  if (isGreenPlotPixel(data, width, height, x, y)) {
    return false;
  }

  return getLocalBackgroundRatio(data, width, height, x, y) > 0.58;
};

const isWhiteMarginPixel = (r: number, g: number, b: number): boolean => {
  const minChannel = Math.min(r, g, b);
  const maxChannel = Math.max(r, g, b);
  return minChannel > 238 && maxChannel - minChannel < 28;
};

const isLightPlotSurfacePixel = (
  data: Uint8ClampedArray,
  imageWidth: number,
  imageHeight: number,
  x: number,
  y: number
): boolean => {
  const i = (y * imageWidth + x) * 4;
  const r = data[i];
  const g = data[i + 1];
  const b = data[i + 2];

  if (isWhiteMarginPixel(r, g, b) || isBlueLabelPixel(r, g, b)) {
    return false;
  }

  if (isGreenPlotPixel(data, imageWidth, imageHeight, x, y)) {
    return true;
  }

  if (isDarkAnnotationPixel(data, imageWidth, imageHeight, x, y)) {
    return false;
  }

  const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
  const saturation = Math.max(r, g, b) - Math.min(r, g, b);

  return luminance > 95 && luminance < 245 && saturation < 70;
};

type CenterBandStats = {
  backgroundRatio: number;
  plotRatio: number;
  inkRatio: number;
};

const getCenterBandStats = (
  data: Uint8ClampedArray,
  imageWidth: number,
  imageHeight: number,
  rectX: number,
  rectWidth: number,
  rowY: number
): CenterBandStats => {
  const inset = Math.max(2, Math.round(rectWidth * 0.14));
  const startX = rectX + inset;
  const endX = rectX + rectWidth - inset;
  const samples: Array<{ r: number; g: number; b: number; x: number }> = [];

  for (let x = startX; x <= endX; x++) {
    if (x < 0 || rowY < 0 || x >= imageWidth || rowY >= imageHeight) {
      continue;
    }

    const i = (rowY * imageWidth + x) * 4;
    samples.push({
      r: data[i],
      g: data[i + 1],
      b: data[i + 2],
      x,
    });
  }

  if (samples.length === 0) {
    return { backgroundRatio: 0, plotRatio: 0, inkRatio: 0 };
  }

  let backgroundCount = 0;
  for (const sample of samples) {
    if (isWhiteMarginPixel(sample.r, sample.g, sample.b)) {
      backgroundCount++;
    }
  }

  const backgroundRatio = backgroundCount / samples.length;
  let plotCount = 0;
  let inkCount = 0;

  for (const sample of samples) {
    const { r, g, b, x } = sample;

    if (isWhiteMarginPixel(r, g, b)) {
      continue;
    }

    if (
      isPlotFillPixel(data, imageWidth, imageHeight, x, rowY) ||
      isGreenPlotPixel(data, imageWidth, imageHeight, x, rowY) ||
      isLightPlotSurfacePixel(data, imageWidth, imageHeight, x, rowY)
    ) {
      plotCount++;
      continue;
    }

    if (isDarkAnnotationPixel(data, imageWidth, imageHeight, x, rowY)) {
      inkCount++;
      continue;
    }

    if (isMarginInkPixel(data, imageWidth, imageHeight, x, rowY)) {
      inkCount++;
      continue;
    }

    const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
    const saturation = Math.max(r, g, b) - Math.min(r, g, b);
    const rowLooksLikeMargin = backgroundRatio > 0.34;
    const looksLikeInk = luminance < 145 && saturation < 50;

    if (rowLooksLikeMargin && looksLikeInk) {
      inkCount++;
    }
  }

  return {
    backgroundRatio,
    plotRatio: plotCount / samples.length,
    inkRatio: inkCount / samples.length,
  };
};

const shouldTrimMarginRow = (stats: CenterBandStats, aggressive: boolean): boolean => {
  if (!aggressive) {
    return false;
  }

  if (stats.plotRatio < 0.02) {
    return true;
  }

  if (stats.backgroundRatio > 0.72 && stats.plotRatio < 0.06) {
    return true;
  }

  if (stats.plotRatio < 0.08 && stats.inkRatio > 0.008) {
    return true;
  }

  if (stats.plotRatio < 0.05 && stats.inkRatio > 0.002) {
    return true;
  }

  return stats.plotRatio < 0.03 && stats.backgroundRatio > 0.55;
};

const hasGreenFrameSideColumns = (
  data: Uint8ClampedArray,
  imageWidth: number,
  imageHeight: number,
  rect: CropRect
): boolean => {
  const { x, y, width, height } = rect;
  const columnBand = Math.max(3, Math.round(width * 0.08));
  const rowThreshold = Math.max(4, Math.round(height * 0.08));
  let leftGreenRows = 0;
  let rightGreenRows = 0;

  for (let rowY = y; rowY < y + height; rowY++) {
    for (let colX = x; colX < x + columnBand; colX++) {
      if (isGreenPlotPixel(data, imageWidth, imageHeight, colX, rowY)) {
        leftGreenRows++;
        break;
      }
    }

    for (let colX = x + width - columnBand; colX < x + width; colX++) {
      if (isGreenPlotPixel(data, imageWidth, imageHeight, colX, rowY)) {
        rightGreenRows++;
        break;
      }
    }
  }

  return leftGreenRows > rowThreshold && rightGreenRows > rowThreshold;
};

const findPlotBoundsByPixelProjection = (
  imageData: ImageData,
  width: number,
  height: number,
  searchRect: CropRect,
  isTargetPixel: (
    data: Uint8ClampedArray,
    imageWidth: number,
    imageHeight: number,
    x: number,
    y: number
  ) => boolean,
  rowThresholdRatio: number,
  colThresholdRatio: number,
  minSearchAreaRatio: number,
  maxSearchAreaRatio: number
): CropRect | null => {
  const { data } = imageData;
  const { x: searchX, y: searchY, width: searchWidth, height: searchHeight } = searchRect;
  const rowCounts = new Uint32Array(searchHeight);
  const colCounts = new Uint32Array(searchWidth);

  for (let y = searchY; y < searchY + searchHeight; y++) {
    for (let x = searchX; x < searchX + searchWidth; x++) {
      if (isTargetPixel(data, width, height, x, y)) {
        rowCounts[y - searchY]++;
        colCounts[x - searchX]++;
      }
    }
  }

  const rowThreshold = Math.max(3, Math.round(searchWidth * rowThresholdRatio));
  const colThreshold = Math.max(3, Math.round(searchHeight * colThresholdRatio));

  const topOffset = rowCounts.findIndex((count) => count > rowThreshold);
  if (topOffset < 0) {
    return null;
  }

  let bottomOffset = searchHeight - 1;
  while (bottomOffset >= 0 && rowCounts[bottomOffset] <= rowThreshold) {
    bottomOffset--;
  }
  if (bottomOffset <= topOffset) {
    return null;
  }

  const leftOffset = colCounts.findIndex((count) => count > colThreshold);
  if (leftOffset < 0) {
    return null;
  }

  let rightOffset = searchWidth - 1;
  while (rightOffset >= 0 && colCounts[rightOffset] <= colThreshold) {
    rightOffset--;
  }
  if (rightOffset <= leftOffset) {
    return null;
  }

  const rectWidth = rightOffset - leftOffset + 1;
  const rectHeight = bottomOffset - topOffset + 1;
  const searchArea = searchWidth * searchHeight;
  const rectArea = rectWidth * rectHeight;

  if (rectArea < searchArea * minSearchAreaRatio || rectArea > searchArea * maxSearchAreaRatio) {
    return null;
  }

  return {
    x: searchX + leftOffset,
    y: searchY + topOffset,
    width: rectWidth,
    height: rectHeight,
  };
};

const getPixelLuminance = (
  data: Uint8ClampedArray,
  width: number,
  x: number,
  y: number
): number => {
  const i = (y * width + x) * 4;
  return 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
};

const getLocalLuminanceVariance = (
  data: Uint8ClampedArray,
  width: number,
  height: number,
  x: number,
  y: number,
  radius = 2
): number => {
  let sum = 0;
  let count = 0;

  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= width || ny >= height) {
        continue;
      }
      sum += getPixelLuminance(data, width, nx, ny);
      count++;
    }
  }

  if (count === 0) {
    return 0;
  }

  const mean = sum / count;
  let variance = 0;

  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= width || ny >= height) {
        continue;
      }
      const delta = getPixelLuminance(data, width, nx, ny) - mean;
      variance += delta * delta;
    }
  }

  return variance / count;
};

const isStipplePixel = (
  data: Uint8ClampedArray,
  width: number,
  height: number,
  x: number,
  y: number
): boolean => {
  const i = (y * width + x) * 4;
  const r = data[i];
  const g = data[i + 1];
  const b = data[i + 2];

  if (isBackgroundPixel(r, g, b) || isBlueLabelPixel(r, g, b)) {
    return false;
  }

  const luminance = getPixelLuminance(data, width, x, y);
  if (luminance < 130 || luminance > 245) {
    return false;
  }

  return getLocalLuminanceVariance(data, width, height, x, y) > 10;
};

const findPlotBoundsByStippleProjection = (
  imageData: ImageData,
  width: number,
  height: number,
  searchRect: CropRect
): CropRect | null => {
  return findPlotBoundsByPixelProjection(
    imageData,
    width,
    height,
    searchRect,
    isStipplePixel,
    0.18,
    0.18,
    0.12,
    0.92
  );
};

const isPlotFillPixel = (
  data: Uint8ClampedArray,
  width: number,
  _height: number,
  x: number,
  y: number
): boolean => {
  const i = (y * width + x) * 4;
  const r = data[i];
  const g = data[i + 1];
  const b = data[i + 2];

  if (
    isBackgroundPixel(r, g, b) ||
    isBlueLabelPixel(r, g, b) ||
    isDimensionLabelPixel(r, g, b) ||
    isDarkAnnotationPixel(data, width, _height, x, y) ||
    isWhiteMarginPixel(r, g, b)
  ) {
    return false;
  }

  return true;
};

const isGreenPlotPixel = (
  data: Uint8ClampedArray,
  width: number,
  _height: number,
  x: number,
  y: number
): boolean => {
  const i = (y * width + x) * 4;
  const r = data[i];
  const g = data[i + 1];
  const b = data[i + 2];

  if (isBackgroundPixel(r, g, b) || isBlueLabelPixel(r, g, b) || isDimensionLabelPixel(r, g, b)) {
    return false;
  }

  return g > r + 12 && g > b + 8 && g > 70 && g < 210;
};

const findPlotBoundsByPlotFillProjection = (
  imageData: ImageData,
  width: number,
  height: number,
  searchRect: CropRect
): CropRect | null => {
  return findPlotBoundsByPixelProjection(
    imageData,
    width,
    height,
    searchRect,
    isPlotFillPixel,
    0.12,
    0.12,
    0.2,
    0.92
  );
};

const findPlotBoundsByGreenFillProjection = (
  imageData: ImageData,
  width: number,
  height: number,
  searchRect: CropRect
): CropRect | null => {
  return findPlotBoundsByPixelProjection(
    imageData,
    width,
    height,
    searchRect,
    isGreenPlotPixel,
    0.08,
    0.08,
    0.08,
    0.85
  );
};

const findPlotBoundsByGreenFrame = (
  imageData: ImageData,
  width: number,
  height: number,
  searchRect: CropRect
): CropRect | null => {
  const { data } = imageData;
  const { x: searchX, y: searchY, width: searchWidth, height: searchHeight } = searchRect;
  const colGreenCounts = new Uint32Array(searchWidth);

  for (let y = searchY; y < searchY + searchHeight; y++) {
    for (let x = searchX; x < searchX + searchWidth; x++) {
      if (isGreenPlotPixel(data, width, height, x, y)) {
        colGreenCounts[x - searchX]++;
      }
    }
  }

  const greenColumnThreshold = Math.max(4, Math.round(searchHeight * 0.06));
  let leftOffset = -1;
  let rightOffset = -1;

  for (let x = 0; x < searchWidth; x++) {
    if (colGreenCounts[x] > greenColumnThreshold) {
      if (leftOffset < 0) {
        leftOffset = x;
      }
      rightOffset = x;
    }
  }

  if (leftOffset < 0 || rightOffset <= leftOffset) {
    return null;
  }

  const frameLeft = searchX + leftOffset;
  const frameRight = searchX + rightOffset;
  const frameWidth = frameRight - frameLeft + 1;
  const centerInset = Math.max(6, Math.round(frameWidth * 0.14));
  const centerLeft = Math.min(frameRight, frameLeft + centerInset);
  const centerRight = Math.max(centerLeft, frameRight - centerInset);
  const centerWidth = centerRight - centerLeft + 1;
  const rowFillCounts = new Uint32Array(searchHeight);
  const rowThreshold = Math.max(4, Math.round(centerWidth * 0.34));

  for (let y = searchY; y < searchY + searchHeight; y++) {
    for (let x = centerLeft; x <= centerRight; x++) {
      if (isPlotFillPixel(data, width, height, x, y)) {
        rowFillCounts[y - searchY]++;
      }
    }
  }

  let topOffset = -1;
  let bottomOffset = -1;

  for (let y = 0; y < searchHeight; y++) {
    if (rowFillCounts[y] > rowThreshold) {
      if (topOffset < 0) {
        topOffset = y;
      }
      bottomOffset = y;
    }
  }

  if (topOffset < 0 || bottomOffset <= topOffset) {
    return null;
  }

  while (bottomOffset > topOffset) {
    const rowY = searchY + bottomOffset;
    const rowStats = getCenterBandStats(data, width, height, frameLeft, frameWidth, rowY);
    const labelRatio = getRowDimensionLabelRatio(data, width, height, frameLeft, rowY, frameWidth);
    if (
      labelRatio > 0.004 ||
      shouldTrimMarginRow(rowStats, true) ||
      isDimensionLabelBandRow(data, width, height, frameLeft, rowY, frameWidth)
    ) {
      bottomOffset--;
      continue;
    }
    break;
  }

  const rectArea = frameWidth * (bottomOffset - topOffset + 1);
  const searchArea = searchWidth * searchHeight;

  if (rectArea < searchArea * 0.18 || rectArea > searchArea * 0.88) {
    return null;
  }

  return shrinkRectPastLabelBands(
    {
      x: frameLeft,
      y: searchY + topOffset,
      width: frameWidth,
      height: bottomOffset - topOffset + 1,
    },
    imageData,
    width,
    height
  );
};

const getLineSampleInset = (length: number, horizontal: boolean): number => {
  const insetRatio = horizontal ? 0.16 : 0.1;
  return Math.max(2, Math.round(length * insetRatio));
};

const shrinkPastCenterMarginRows = (
  rect: CropRect,
  imageData: ImageData,
  imageWidth: number,
  imageHeight: number
): CropRect => {
  const { data } = imageData;
  let { x, y, width, height } = rect;
  const aggressiveTrim = hasGreenFrameSideColumns(data, imageWidth, imageHeight, rect);
  const maxTrimSteps = Math.max(18, Math.round(height * 0.12));

  for (let step = 0; step < maxTrimSteps; step++) {
    if (height <= 8) {
      break;
    }

    const bottomStats = getCenterBandStats(data, imageWidth, imageHeight, x, width, y + height - 1);
    if (!shouldTrimMarginRow(bottomStats, aggressiveTrim)) {
      break;
    }

    height--;
  }

  for (let step = 0; step < maxTrimSteps; step++) {
    if (height <= 8) {
      break;
    }

    const topStats = getCenterBandStats(data, imageWidth, imageHeight, x, width, y);
    if (!shouldTrimMarginRow(topStats, aggressiveTrim)) {
      break;
    }

    y++;
    height--;
  }

  return {
    x,
    y,
    width: Math.max(1, width),
    height: Math.max(1, height),
  };
};

const getHorizontalLineCenterRange = (
  x: number,
  length: number,
  imageWidth: number
): { startX: number; endX: number } => {
  const edgeInset = getLineSampleInset(length, true);
  const centerInset = Math.max(edgeInset, Math.round(length * 0.14));
  return {
    startX: x + centerInset,
    endX: Math.min(x + length - centerInset, imageWidth),
  };
};

const isAnnotationBandLine = (
  data: Uint8ClampedArray,
  imageWidth: number,
  imageHeight: number,
  x: number,
  y: number,
  length: number,
  horizontal: boolean
): boolean => {
  let background = 0;
  let plotContent = 0;
  let darkMarks = 0;
  let fullSamples = 0;
  let centerSamples = 0;
  const inset = getLineSampleInset(length, horizontal);
  const start = inset;
  const end = length - inset;
  const centerRange = horizontal ? getHorizontalLineCenterRange(x, length, imageWidth) : null;

  for (let step = start; step < end; step++) {
    const px = horizontal ? x + step : x;
    const py = horizontal ? y : y + step;

    if (px < 0 || py < 0 || px >= imageWidth || py >= imageHeight) {
      continue;
    }

    fullSamples++;
    const i = (py * imageWidth + px) * 4;
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    if (isBackgroundPixel(r, g, b)) {
      background++;
    }

    const inCenterBand =
      !horizontal ||
      (centerRange !== null && px >= centerRange.startX && px < centerRange.endX);

    if (!inCenterBand) {
      continue;
    }

    centerSamples++;
    if (
      isPlotFillPixel(data, imageWidth, imageHeight, px, py) ||
      isGreenPlotPixel(data, imageWidth, imageHeight, px, py)
    ) {
      plotContent++;
      continue;
    }

    if (
      isDarkAnnotationPixel(data, imageWidth, imageHeight, px, py) ||
      isDimensionLabelPixel(r, g, b)
    ) {
      darkMarks++;
      continue;
    }

    const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
    if (luminance < 120) {
      darkMarks++;
    }
  }

  if (fullSamples === 0 || centerSamples === 0) {
    return false;
  }

  const backgroundRatio = background / fullSamples;
  const plotRatio = plotContent / centerSamples;
  const darkRatio = darkMarks / centerSamples;

  return backgroundRatio > 0.62 && plotRatio < 0.1 && darkRatio > 0.006 && darkRatio < 0.22;
};

const getRowBlueLabelRatio = (
  data: Uint8ClampedArray,
  imageWidth: number,
  imageHeight: number,
  x: number,
  y: number,
  width: number
): number => {
  const inset = Math.max(2, Math.round(width * 0.14));
  let labelMarks = 0;
  let samples = 0;

  for (let px = x + inset; px < x + width - inset; px++) {
    if (px < 0 || y < 0 || px >= imageWidth || y >= imageHeight) {
      continue;
    }

    samples++;
    const i = (y * imageWidth + px) * 4;
    if (isBlueLabelPixel(data[i], data[i + 1], data[i + 2])) {
      labelMarks++;
    }
  }

  return samples > 0 ? labelMarks / samples : 0;
};

const getColBlueLabelRatio = (
  data: Uint8ClampedArray,
  imageWidth: number,
  imageHeight: number,
  x: number,
  y: number,
  height: number
): number => {
  const inset = Math.max(2, Math.round(height * 0.14));
  let labelMarks = 0;
  let samples = 0;

  for (let py = y + inset; py < y + height - inset; py++) {
    if (x < 0 || py < 0 || x >= imageWidth || py >= imageHeight) {
      continue;
    }

    samples++;
    const i = (py * imageWidth + x) * 4;
    if (isBlueLabelPixel(data[i], data[i + 1], data[i + 2])) {
      labelMarks++;
    }
  }

  return samples > 0 ? labelMarks / samples : 0;
};

const getRowDimensionLabelRatio = (
  data: Uint8ClampedArray,
  imageWidth: number,
  imageHeight: number,
  x: number,
  y: number,
  width: number
): number => {
  const inset = Math.max(2, Math.round(width * 0.14));
  let labelMarks = 0;
  let samples = 0;

  for (let px = x + inset; px < x + width - inset; px++) {
    if (px < 0 || y < 0 || px >= imageWidth || y >= imageHeight) {
      continue;
    }

    samples++;
    const i = (y * imageWidth + px) * 4;
    if (isDimensionLabelPixel(data[i], data[i + 1], data[i + 2])) {
      labelMarks++;
    }
  }

  return samples > 0 ? labelMarks / samples : 0;
};

const isDimensionLabelBandRow = (
  data: Uint8ClampedArray,
  imageWidth: number,
  imageHeight: number,
  x: number,
  y: number,
  width: number
): boolean => {
  const inset = Math.max(2, Math.round(width * 0.14));
  let background = 0;
  let labelMarks = 0;
  let samples = 0;

  for (let px = x + inset; px < x + width - inset; px++) {
    if (px < 0 || y < 0 || px >= imageWidth || y >= imageHeight) {
      continue;
    }

    samples++;
    const i = (y * imageWidth + px) * 4;
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    if (isBackgroundPixel(r, g, b) || isWhiteMarginPixel(r, g, b)) {
      background++;
      continue;
    }

    if (isDimensionLabelPixel(r, g, b) || isDarkAnnotationPixel(data, imageWidth, imageHeight, px, y)) {
      labelMarks++;
    }
  }

  if (samples === 0) {
    return false;
  }

  return background / samples > 0.55 && labelMarks / samples > 0.008;
};

const isMostlyWhiteMarginRow = (
  data: Uint8ClampedArray,
  imageWidth: number,
  imageHeight: number,
  x: number,
  y: number,
  width: number
): boolean => {
  const inset = Math.max(2, Math.round(width * 0.14));
  let white = 0;
  let samples = 0;

  for (let px = x + inset; px < x + width - inset; px++) {
    if (px < 0 || y < 0 || px >= imageWidth || y >= imageHeight) {
      continue;
    }

    samples++;
    const i = (y * imageWidth + px) * 4;
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    if (isBackgroundPixel(r, g, b) || isWhiteMarginPixel(r, g, b)) {
      white++;
    }
  }

  return samples > 0 && white / samples > 0.85;
};

const isMostlyEmptyMarginLine = (
  data: Uint8ClampedArray,
  imageWidth: number,
  imageHeight: number,
  x: number,
  y: number,
  length: number,
  horizontal: boolean
): boolean => {
  const inset = getLineSampleInset(length, horizontal);
  const start = inset;
  const end = length - inset;
  let background = 0;
  let plotContent = 0;
  let samples = 0;

  for (let step = start; step < end; step++) {
    const px = horizontal ? x + step : x;
    const py = horizontal ? y : y + step;

    if (px < 0 || py < 0 || px >= imageWidth || py >= imageHeight) {
      continue;
    }

    samples++;
    const i = (py * imageWidth + px) * 4;
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    if (isBackgroundPixel(r, g, b)) {
      background++;
      continue;
    }

    if (
      isPlotFillPixel(data, imageWidth, imageHeight, px, py) ||
      isGreenPlotPixel(data, imageWidth, imageHeight, px, py)
    ) {
      plotContent++;
    }
  }

  if (samples === 0) {
    return false;
  }

  return background / samples > 0.82 && plotContent / samples < 0.04;
};

const shrinkRectPastLabelBands = (
  rect: CropRect,
  imageData: ImageData,
  imageWidth: number,
  imageHeight: number,
  options: ShrinkRectOptions = {}
): CropRect => {
  const { data } = imageData;
  let { x, y, width, height } = rect;
  const aggressiveTrim = hasGreenFrameSideColumns(data, imageWidth, imageHeight, rect);
  const trimBlueLabels = !aggressiveTrim;
  const maxTrimSteps = aggressiveTrim
    ? Math.max(40, Math.round(height * 0.18))
    : Math.max(16, Math.round(Math.min(width, height) * 0.12));

  for (let step = 0; step < maxTrimSteps; step++) {
    let trimmed = false;

    if (
      height > 8 &&
      (isAnnotationBandLine(data, imageWidth, imageHeight, x, y, width, true) ||
      (trimBlueLabels &&
        getRowBlueLabelRatio(data, imageWidth, imageHeight, x, y, width) > 0.008) ||
        (aggressiveTrim &&
          isDimensionLabelBandRow(data, imageWidth, imageHeight, x, y, width)) ||
        isMostlyWhiteMarginRow(data, imageWidth, imageHeight, x, y, width))
    ) {
      y++;
      height--;
      trimmed = true;
    } else if (
      height > 8 &&
      isMostlyEmptyMarginLine(data, imageWidth, imageHeight, x, y, width, true)
    ) {
      y++;
      height--;
      trimmed = true;
    }

    if (
      height > 8 &&
      (isAnnotationBandLine(data, imageWidth, imageHeight, x, y + height - 1, width, true) ||
        (trimBlueLabels &&
          getRowBlueLabelRatio(data, imageWidth, imageHeight, x, y + height - 1, width) > 0.008) ||
        (aggressiveTrim &&
          (isDimensionLabelBandRow(data, imageWidth, imageHeight, x, y + height - 1, width) ||
            getRowDimensionLabelRatio(data, imageWidth, imageHeight, x, y + height - 1, width) >
              0.004)))
    ) {
      height--;
      trimmed = true;
    } else if (
      height > 8 &&
      isMostlyEmptyMarginLine(data, imageWidth, imageHeight, x, y + height - 1, width, true)
    ) {
      height--;
      trimmed = true;
    }

    if (
      width > 8 &&
      trimBlueLabels &&
      getColBlueLabelRatio(data, imageWidth, imageHeight, x, y, height) > 0.008
    ) {
      x++;
      width--;
      trimmed = true;
    } else if (width > 8 && isAnnotationBandLine(data, imageWidth, imageHeight, x, y, height, false)) {
      x++;
      width--;
      trimmed = true;
    } else if (
      width > 8 &&
      isMostlyEmptyMarginLine(data, imageWidth, imageHeight, x, y, height, false)
    ) {
      x++;
      width--;
      trimmed = true;
    }

    if (
      width > 8 &&
      trimBlueLabels &&
      getColBlueLabelRatio(data, imageWidth, imageHeight, x + width - 1, y, height) > 0.008
    ) {
      width--;
      trimmed = true;
    } else if (
      width > 8 &&
      isAnnotationBandLine(data, imageWidth, imageHeight, x + width - 1, y, height, false)
    ) {
      width--;
      trimmed = true;
    } else if (
      width > 8 &&
      isMostlyEmptyMarginLine(data, imageWidth, imageHeight, x + width - 1, y, height, false)
    ) {
      width--;
      trimmed = true;
    }

    if (!trimmed) {
      break;
    }
  }

  const trimmedRect = {
    x,
    y,
    width: Math.max(1, width),
    height: Math.max(1, height),
  };

  const useExtendedTrim =
    options.forceMarginTrim ||
    hasGreenFrameSideColumns(data, imageWidth, imageHeight, trimmedRect);

  if (!useExtendedTrim) {
    return trimmedRect;
  }

  const withTopTrim = shrinkPastTopWhiteRows(trimmedRect, imageData, imageWidth, imageHeight);
  const withBottomTrim = shrinkPastBottomDimensionRows(
    withTopTrim,
    imageData,
    imageWidth,
    imageHeight
  );

  if (!hasGreenFrameSideColumns(data, imageWidth, imageHeight, withBottomTrim)) {
    return shrinkUntilCropEdgesAreClean(
      withBottomTrim,
      imageData,
      imageWidth,
      imageHeight
    );
  }

  return shrinkUntilCropEdgesAreClean(
    shrinkPastCenterMarginRows(
      withBottomTrim,
      imageData,
      imageWidth,
      imageHeight
    ),
    imageData,
    imageWidth,
    imageHeight
  );
};

const shrinkPastTopWhiteRows = (
  rect: CropRect,
  imageData: ImageData,
  imageWidth: number,
  imageHeight: number
): CropRect => {
  const { data } = imageData;
  let { x, y, width, height } = rect;
  const maxTrimSteps = Math.max(32, Math.round(height * 0.16));

  for (let step = 0; step < maxTrimSteps; step++) {
    if (height <= 8) {
      break;
    }

    if (
      getTopWhiteMarginRatio({ x, y, width, height }, data, imageWidth, imageHeight, 0.04) > 0.85 ||
      isMostlyWhiteMarginRow(data, imageWidth, imageHeight, x, y, width) ||
      isMostlyEmptyMarginLine(data, imageWidth, imageHeight, x, y, width, true)
    ) {
      y++;
      height--;
      continue;
    }

    break;
  }

  return { x, y, width, height };
};

const shrinkPastBottomDimensionRows = (
  rect: CropRect,
  imageData: ImageData,
  imageWidth: number,
  imageHeight: number
): CropRect => {
  const { data } = imageData;
  let { x, y, width, height } = rect;
  const maxTrimSteps = Math.max(32, Math.round(height * 0.1));

  for (let step = 0; step < maxTrimSteps; step++) {
    if (height <= 8) {
      break;
    }

    const bottomY = y + height - 1;
    const labelRatio = getRowDimensionLabelRatio(data, imageWidth, imageHeight, x, bottomY, width);
    if (
      labelRatio > 0.004 ||
      isDimensionLabelBandRow(data, imageWidth, imageHeight, x, bottomY, width) ||
      isAnnotationBandLine(data, imageWidth, imageHeight, x, bottomY, width, true) ||
      isMostlyEmptyMarginLine(data, imageWidth, imageHeight, x, bottomY, width, true)
    ) {
      height--;
      continue;
    }

    break;
  }

  return { x, y, width, height };
};

const getTopWhiteMarginRatio = (
  rect: CropRect,
  data: Uint8ClampedArray,
  imageWidth: number,
  imageHeight: number,
  bandRatio: number
): number => {
  const { x, y, width, height } = rect;
  const bandRows = Math.max(2, Math.round(height * bandRatio));
  let white = 0;
  let samples = 0;
  const inset = Math.max(2, Math.round(width * 0.14));

  for (let rowY = y; rowY < Math.min(y + bandRows, y + height); rowY++) {
    for (let px = x + inset; px < x + width - inset; px++) {
      if (px < 0 || rowY < 0 || px >= imageWidth || rowY >= imageHeight) {
        continue;
      }

      samples++;
      const i = (rowY * imageWidth + px) * 4;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      if (isBackgroundPixel(r, g, b) || isWhiteMarginPixel(r, g, b)) {
        white++;
      }
    }
  }

  return samples > 0 ? white / samples : 0;
};

const shrinkUntilCropEdgesAreClean = (
  rect: CropRect,
  imageData: ImageData,
  imageWidth: number,
  imageHeight: number
): CropRect => {
  const { data } = imageData;
  let { x, y, width, height } = rect;
  const maxTopTrim = Math.max(32, Math.round(height * 0.16));
  const maxBottomTrim = Math.max(12, Math.round(height * 0.05));

  for (let step = 0; step < maxTopTrim; step++) {
    if (height <= 8) {
      break;
    }

    if (
      getTopWhiteMarginRatio({ x, y, width, height }, data, imageWidth, imageHeight, 0.04) > 0.85 ||
      isMostlyWhiteMarginRow(data, imageWidth, imageHeight, x, y, width) ||
      isMostlyEmptyMarginLine(data, imageWidth, imageHeight, x, y, width, true)
    ) {
      y++;
      height--;
      continue;
    }

    break;
  }

  for (let step = 0; step < maxBottomTrim; step++) {
    if (height <= 8) {
      break;
    }

    const bottomY = y + height - 1;
    const labelRatio = getRowDimensionLabelRatio(data, imageWidth, imageHeight, x, bottomY, width);
    if (
      labelRatio > 0.006 ||
      isDimensionLabelBandRow(data, imageWidth, imageHeight, x, bottomY, width)
    ) {
      height--;
      continue;
    }

    break;
  }

  return { x, y, width, height };
};

const findPlotBoundsByContentMask = (
  imageData: ImageData,
  width: number,
  height: number
): CropRect | null => {
  const { data } = imageData;
  let minX = width;
  let minY = height;
  let maxX = 0;
  let maxY = 0;
  let found = false;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      if (isBackgroundPixel(r, g, b) || isBlueLabelPixel(r, g, b)) {
        continue;
      }

      found = true;
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    }
  }

  if (!found) {
    return null;
  }

  const rectWidth = maxX - minX + 1;
  const rectHeight = maxY - minY + 1;

  return {
    x: minX,
    y: minY,
    width: rectWidth,
    height: rectHeight,
  };
};

const findPlotBoundsByEdgeProjection = (
  edgeData: Uint8Array,
  width: number,
  _height: number,
  searchRect: CropRect
): CropRect | null => {
  const { x: searchX, y: searchY, width: searchWidth, height: searchHeight } = searchRect;
  const colCounts = new Uint32Array(searchWidth);
  const rowCounts = new Uint32Array(searchHeight);

  for (let y = searchY; y < searchY + searchHeight; y++) {
    for (let x = searchX; x < searchX + searchWidth; x++) {
      if (edgeData[y * width + x] === 255) {
        colCounts[x - searchX]++;
        rowCounts[y - searchY]++;
      }
    }
  }

  const colThreshold = Math.max(4, Math.round(searchHeight * 0.14));
  const rowThreshold = Math.max(4, Math.round(searchWidth * 0.14));

  const left = findInnerEdgeBand(colCounts, true, colThreshold);
  const right = findInnerEdgeBand(colCounts, false, colThreshold);
  const top = findInnerEdgeBand(rowCounts, true, rowThreshold);
  const bottom = findInnerEdgeBand(rowCounts, false, rowThreshold);

  if (left < 0 || right <= left || top < 0 || bottom <= top) {
    return null;
  }

  const rectWidth = right - left + 1;
  const rectHeight = bottom - top + 1;
  const searchArea = searchWidth * searchHeight;
  const rectArea = rectWidth * rectHeight;

  if (rectArea < searchArea * 0.2 || rectArea > searchArea * 0.88) {
    return null;
  }

  return {
    x: searchX + left,
    y: searchY + top,
    width: rectWidth,
    height: rectHeight,
  };
};

const findInnerEdgeBand = (
  counts: Uint32Array,
  fromStart: boolean,
  threshold: number
): number => {
  const bands: Array<{ start: number; end: number; strength: number }> = [];
  let bandStart = -1;
  let bandStrength = 0;

  const indices = fromStart
    ? Array.from({ length: counts.length }, (_, index) => index)
    : Array.from({ length: counts.length }, (_, index) => counts.length - 1 - index);

  for (const index of indices) {
    if (counts[index] >= threshold) {
      if (bandStart < 0) {
        bandStart = index;
        bandStrength = counts[index];
      } else {
        bandStrength += counts[index];
      }
      continue;
    }

    if (bandStart >= 0) {
      bands.push({ start: bandStart, end: index - 1, strength: bandStrength });
      bandStart = -1;
      bandStrength = 0;
    }
  }

  if (bandStart >= 0) {
    bands.push({
      start: bandStart,
      end: fromStart ? counts.length - 1 : 0,
      strength: bandStrength,
    });
  }

  if (bands.length === 0) {
    return -1;
  }

  const rankedBands = [...bands].sort((a, b) => b.strength - a.strength);
  const plotBand = rankedBands[0];
  return fromStart ? plotBand.start : plotBand.end;
};

const findPlotBoundsByStructureMask = (
  imageData: ImageData,
  width: number,
  height: number,
  searchRect: CropRect
): CropRect | null => {
  const { data } = imageData;
  const { x: searchX, y: searchY, width: searchWidth, height: searchHeight } = searchRect;
  let minX = width;
  let minY = height;
  let maxX = 0;
  let maxY = 0;
  let found = false;

  for (let y = searchY; y < searchY + searchHeight; y++) {
    for (let x = searchX; x < searchX + searchWidth; x++) {
      const i = (y * width + x) * 4;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      if (isBackgroundPixel(r, g, b) || isBlueLabelPixel(r, g, b)) {
        continue;
      }

      const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
      if (luminance > 198) {
        continue;
      }

      found = true;
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    }
  }

  if (!found) {
    return null;
  }

  return {
    x: minX,
    y: minY,
    width: maxX - minX + 1,
    height: maxY - minY + 1,
  };
};

const isRectInside = (inner: CropRect, outer: CropRect): boolean => {
  return (
    inner.x >= outer.x &&
    inner.y >= outer.y &&
    inner.x + inner.width <= outer.x + outer.width &&
    inner.y + inner.height <= outer.y + outer.height
  );
};

const isValidCropRect = (rect: CropRect | null, imageWidth: number, imageHeight: number): rect is CropRect => {
  if (!rect || rect.width <= 0 || rect.height <= 0) {
    return false;
  }

  const areaRatio = (rect.width * rect.height) / (imageWidth * imageHeight);
  return areaRatio >= 0.05 && areaRatio <= 0.95;
};

const chooseCropCandidate = (
  contentRect: CropRect | null,
  edgeRect: CropRect | null,
  borderRect: CropRect | null,
  structureRect: CropRect | null,
  stippleRect: CropRect | null,
  plotFillRect: CropRect | null,
  greenFillRect: CropRect | null,
  greenFrameRect: CropRect | null,
  imageWidth: number,
  imageHeight: number,
  meterWidth?: number,
  meterHeight?: number
): { name: string; rect: CropRect } | null => {
  const imageCenterX = imageWidth / 2;
  const imageCenterY = imageHeight / 2;

  const candidates = [
    { name: 'stipple', rect: stippleRect },
    { name: 'greenFrame', rect: greenFrameRect },
    { name: 'plotFill', rect: plotFillRect },
    { name: 'greenFill', rect: greenFillRect },
    { name: 'border', rect: borderRect },
    { name: 'edge', rect: edgeRect },
    { name: 'structure', rect: structureRect },
    { name: 'content', rect: contentRect },
  ].filter((candidate): candidate is { name: string; rect: CropRect } =>
    isValidCropRect(candidate.rect, imageWidth, imageHeight)
  );

  if (candidates.length === 0) {
    return null;
  }

  const maxCandidateArea = Math.max(
    ...candidates.map(({ rect }) => rect.width * rect.height)
  );

  const scored = candidates
    .map((candidate) => ({
      name: candidate.name,
      rect: candidate.rect,
      score: scoreCropCandidate(
        candidate,
        imageWidth,
        imageHeight,
        imageCenterX,
        imageCenterY,
        maxCandidateArea,
        meterWidth,
        meterHeight
      ),
    }))
    .filter(({ score }) => score >= 0)
    .sort((a, b) => b.score - a.score);

  const best = scored[0];
  return best ? { name: best.name, rect: best.rect } : null;
};

const scoreCropCandidate = (
  candidate: { name: string; rect: CropRect },
  imageWidth: number,
  imageHeight: number,
  imageCenterX: number,
  imageCenterY: number,
  maxCandidateArea: number,
  meterWidth?: number,
  meterHeight?: number
): number => {
  const { name, rect } = candidate;
  const imageArea = imageWidth * imageHeight;
  const rectArea = rect.width * rect.height;
  const areaRatio = rectArea / imageArea;
  const aspect = rect.width / rect.height;

  if (areaRatio < 0.08 || areaRatio > 0.92) {
    return -1;
  }

  if (name === 'stipple' && meterWidth && meterHeight && meterWidth > 0 && meterHeight > 0) {
    const targetAspect = meterWidth / meterHeight;
    if (Math.abs(aspect - targetAspect) > 0.22) {
      return -1;
    }
  }

  if (
    (name === 'plotFill' || name === 'greenFill' || name === 'greenFrame') &&
    meterWidth &&
    meterHeight &&
    meterWidth > 0 &&
    meterHeight > 0
  ) {
    const targetAspect = meterWidth / meterHeight;
    if (Math.abs(aspect - targetAspect) > 0.25) {
      return -1;
    }
  }

  const normalizedAreaScore = rectArea / maxCandidateArea;

  let aspectScore = 0.55;
  if (meterWidth && meterHeight && meterWidth > 0 && meterHeight > 0) {
    const targetAspect = meterWidth / meterHeight;
    aspectScore = 1 - Math.min(1, Math.abs(aspect - targetAspect) / 0.18);
  }

  const centerX = rect.x + rect.width / 2;
  const centerY = rect.y + rect.height / 2;
  const centerDistance = Math.hypot(centerX - imageCenterX, centerY - imageCenterY);
  const maxDistance = Math.hypot(imageCenterX, imageCenterY);
  const centralityScore = 1 - Math.min(1, centerDistance / maxDistance);

  const plotPreferredMethods = new Set(['stipple', 'plotFill', 'greenFill', 'greenFrame']);
  if (!plotPreferredMethods.has(name) && normalizedAreaScore < 0.72) {
    return -1;
  }

  const methodBonus: Record<string, number> = {
    stipple: 0.12,
    greenFrame: 0.22,
    plotFill: 0.12,
    greenFill: 0.08,
    border: 0.06,
    edge: 0.03,
    structure: -0.15,
    content: -0.2,
  };

  return (
    normalizedAreaScore * 0.45 +
    aspectScore * 0.3 +
    centralityScore * 0.1 +
    (methodBonus[name] ?? 0)
  );
};

/**
 * Convert image data to grayscale
 */
const convertToGrayscale = (imageData: ImageData): Uint8Array => {
  const data = imageData.data;
  const grayData = new Uint8Array(data.length / 4);
  
  for (let i = 0; i < data.length; i += 4) {
    grayData[i / 4] = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
  }
  
  return grayData;
};

/**
 * Apply Gaussian blur
 */
const applyGaussianBlur = (grayData: Uint8Array, width: number, height: number): Uint8Array => {
  const kernel = [
    [1, 2, 1],
    [2, 4, 2],
    [1, 2, 1]
  ];
  const kernelSum = 16;
  
  const blurredData = new Uint8Array(grayData.length);
  
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      let sum = 0;
      
      for (let ky = -1; ky <= 1; ky++) {
        for (let kx = -1; kx <= 1; kx++) {
          const pixelIndex = (y + ky) * width + (x + kx);
          sum += grayData[pixelIndex] * kernel[ky + 1][kx + 1];
        }
      }
      
      const index = y * width + x;
      blurredData[index] = Math.round(sum / kernelSum);
    }
  }
  
  return blurredData;
};

/**
 * Apply Canny edge detection
 */
const applyCannyEdgeDetection = (
  grayData: Uint8Array, 
  width: number, 
  height: number, 
  lowThreshold: number, 
  highThreshold: number
): Uint8Array => {
  // Sobel operators
  const sobelX = [
    [-1, 0, 1],
    [-2, 0, 2],
    [-1, 0, 1]
  ];
  
  const sobelY = [
    [-1, -2, -1],
    [0, 0, 0],
    [1, 2, 1]
  ];
  
  const gradientMagnitude = new Float32Array(grayData.length);
  const gradientDirection = new Float32Array(grayData.length);
  
  // Calculate gradients
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      let gx = 0, gy = 0;
      
      for (let ky = -1; ky <= 1; ky++) {
        for (let kx = -1; kx <= 1; kx++) {
          const pixelIndex = (y + ky) * width + (x + kx);
          const pixelValue = grayData[pixelIndex];
          
          gx += pixelValue * sobelX[ky + 1][kx + 1];
          gy += pixelValue * sobelY[ky + 1][kx + 1];
        }
      }
      
      const index = y * width + x;
      gradientMagnitude[index] = Math.sqrt(gx * gx + gy * gy);
      gradientDirection[index] = Math.atan2(gy, gx);
    }
  }
  
  // Non-maximum suppression
  const suppressedData = new Uint8Array(grayData.length);
  
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const index = y * width + x;
      const magnitude = gradientMagnitude[index];
      const direction = gradientDirection[index];
      
      // Determine neighbors based on gradient direction
      let neighbor1 = 0, neighbor2 = 0;
      
      if (direction >= -Math.PI/8 && direction < Math.PI/8) {
        // Horizontal
        neighbor1 = gradientMagnitude[index - 1];
        neighbor2 = gradientMagnitude[index + 1];
      } else if (direction >= Math.PI/8 && direction < 3*Math.PI/8) {
        // Diagonal
        neighbor1 = gradientMagnitude[index - width - 1];
        neighbor2 = gradientMagnitude[index + width + 1];
      } else if (direction >= 3*Math.PI/8 && direction < 5*Math.PI/8) {
        // Vertical
        neighbor1 = gradientMagnitude[index - width];
        neighbor2 = gradientMagnitude[index + width];
      } else {
        // Diagonal
        neighbor1 = gradientMagnitude[index - width + 1];
        neighbor2 = gradientMagnitude[index + width - 1];
      }
      
      if (magnitude >= neighbor1 && magnitude >= neighbor2) {
        suppressedData[index] = magnitude > highThreshold ? 255 : (magnitude > lowThreshold ? 128 : 0);
      }
    }
  }
  
  // Hysteresis thresholding
  const edgeData = new Uint8Array(grayData.length);
  
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const index = y * width + x;
      
      if (suppressedData[index] === 255) {
        edgeData[index] = 255;
        // Trace weak edges connected to strong edges
        traceWeakEdges(suppressedData, edgeData, width, height, x, y);
      }
    }
  }
  
  return edgeData;
};

/**
 * Trace weak edges connected to strong edges
 */
const traceWeakEdges = (
  suppressedData: Uint8Array, 
  edgeData: Uint8Array, 
  width: number, 
  height: number, 
  startX: number, 
  startY: number, 
): void => {
  const stack: Array<{x: number, y: number}> = [{x: startX, y: startY}];
  
  while (stack.length > 0) {
    const {x, y} = stack.pop()!;
    
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx;
        const ny = y + dy;
        
        if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
          const index = ny * width + nx;
          
          if (suppressedData[index] === 128 && edgeData[index] === 0) {
            edgeData[index] = 255;
            stack.push({x: nx, y: ny});
          }
        }
      }
    }
  }
};

/**
 * Apply dilation
 */
const applyDilation = (edgeData: Uint8Array, width: number, height: number, iterations: number): Uint8Array => {
  let dilatedData = new Uint8Array(edgeData);
  
  for (let iter = 0; iter < iterations; iter++) {
    const newData = new Uint8Array(dilatedData);
    
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const index = y * width + x;
        
        if (dilatedData[index] === 255) {
          // Dilate to neighbors
          for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
              const nx = x + dx;
              const ny = y + dy;
              const neighborIndex = ny * width + nx;
              newData[neighborIndex] = 255;
            }
          }
        }
      }
    }
    
    dilatedData = newData;
  }
  
  return dilatedData;
};

/**
 * Find contours in the edge data
 */
const findContours = (edgeData: Uint8Array, width: number, height: number): Array<Array<{x: number, y: number}>> => {
  const visited = new Uint8Array(edgeData.length);
  const contours: Array<Array<{x: number, y: number}>> = [];
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const index = y * width + x;
      
      if (edgeData[index] === 255 && visited[index] === 0) {
        const contour = traceContour(edgeData, visited, width, height, x, y);
        if (contour.length > 10) { // Filter out very small contours
          contours.push(contour);
        }
      }
    }
  }
  
  return contours;
};

/**
 * Trace a single contour
 */
const traceContour = (
  edgeData: Uint8Array, 
  visited: Uint8Array, 
  width: number, 
  height: number, 
  startX: number, 
  startY: number
): Array<{x: number, y: number}> => {
  const contour: Array<{x: number, y: number}> = [];
  const stack: Array<{x: number, y: number}> = [{x: startX, y: startY}];
  
  while (stack.length > 0) {
    const {x, y} = stack.pop()!;
    const index = y * width + x;
    
    if (visited[index] === 0 && edgeData[index] === 255) {
      visited[index] = 1;
      contour.push({x, y});
      
      // Add neighbors to stack
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx;
          const ny = y + dy;
          
          if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
            const neighborIndex = ny * width + nx;
            if (visited[neighborIndex] === 0 && edgeData[neighborIndex] === 255) {
              stack.push({x: nx, y: ny});
            }
          }
        }
      }
    }
  }
  
  return contour;
};

/**
 * Find the best rectangle from contours
 */
const findBestRectangle = (
  contours: Array<Array<{x: number, y: number}>>,
  width: number,
  height: number,
  minAreaPercent: number,
  contentRect: CropRect | null = null
): CropRect | null => {
  const imgArea = width * height;
  const minArea = imgArea * (minAreaPercent / 100);
  const borderPad = Math.round(Math.min(width, height) * 0.02);
  const imageCenterX = width / 2;
  const imageCenterY = height / 2;

  let best: { rect: CropRect; score: number } | null = null;

  for (const contour of contours) {
    if (contour.length < 4) continue;

    const bounds = getBoundingRect(contour);
    const rectArea = bounds.width * bounds.height;

    if (rectArea < minArea) continue;

    if (contentRect) {
      const contentArea = contentRect.width * contentRect.height;
      if (rectArea < contentArea * 0.4 || rectArea > contentArea * 0.95) {
        continue;
      }
      if (!isRectInside(bounds, contentRect)) {
        continue;
      }
    }

    if (bounds.x <= borderPad || bounds.y <= borderPad ||
        bounds.x + bounds.width >= width - borderPad ||
        bounds.y + bounds.height >= height - borderPad) {
      continue;
    }

    const rect = calculateMinAreaRect(contour);
    const angle = Math.abs(rect.angle % 90);
    const axisAlignedScore = 1 - Math.min(angle, 90 - angle) / 10;
    const rectCenterX = bounds.x + bounds.width / 2;
    const rectCenterY = bounds.y + bounds.height / 2;
    const centerDistance = Math.hypot(rectCenterX - imageCenterX, rectCenterY - imageCenterY);
    const maxDistance = Math.hypot(imageCenterX, imageCenterY);
    const centralityScore = 1 - (centerDistance / maxDistance) * 0.35;
    const score = rectArea * axisAlignedScore * centralityScore;

    if (!best || score > best.score) {
      best = { rect: bounds, score };
    }
  }

  return best ? best.rect : null;
};

/**
 * Get bounding rectangle of contour
 */
const getBoundingRect = (contour: Array<{x: number, y: number}>): {x: number, y: number, width: number, height: number} => {
  let minX = contour[0].x, maxX = contour[0].x;
  let minY = contour[0].y, maxY = contour[0].y;
  
  for (const point of contour) {
    minX = Math.min(minX, point.x);
    maxX = Math.max(maxX, point.x);
    minY = Math.min(minY, point.y);
    maxY = Math.max(maxY, point.y);
  }
  
  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY
  };
};

/**
 * Calculate minimum area rectangle (simplified version)
 */
const calculateMinAreaRect = (contour: Array<{x: number, y: number}>): {x: number, y: number, width: number, height: number, angle: number} => {
  // Simplified: use bounding rectangle with slight angle estimation
  const bounds = getBoundingRect(contour);
  
  // Estimate angle based on contour orientation
  let angle = 0;
  if (contour.length > 2) {
    const first = contour[0];
    const last = contour[contour.length - 1];
    angle = Math.atan2(last.y - first.y, last.x - first.x) * 180 / Math.PI;
  }
  
  return {
    x: bounds.x,
    y: bounds.y,
    width: bounds.width,
    height: bounds.height,
    angle: angle
  };
};

const cropToRect = (
  canvas: HTMLCanvasElement,
  rect: CropRect,
  insetMargin: number
): { imageUrl: string; width: number; height: number } => {
  const insetX = Math.min(insetMargin, rect.width / 4);
  const insetY = Math.min(insetMargin, rect.height / 4);

  const cropX = Math.max(0, Math.round(rect.x + insetX));
  const cropY = Math.max(0, Math.round(rect.y + insetY));
  const cropWidth = Math.max(1, Math.min(canvas.width - cropX, Math.round(rect.width - 2 * insetX)));
  const cropHeight = Math.max(1, Math.min(canvas.height - cropY, Math.round(rect.height - 2 * insetY)));

  const cropCanvas = document.createElement('canvas');
  const cropCtx = cropCanvas.getContext('2d')!;

  cropCanvas.width = cropWidth;
  cropCanvas.height = cropHeight;

  cropCtx.drawImage(
    canvas,
    cropX, cropY, cropWidth, cropHeight,
    0, 0, cropWidth, cropHeight
  );

  return {
    imageUrl: cropCanvas.toDataURL('image/png'),
    width: cropWidth,
    height: cropHeight,
  };
};