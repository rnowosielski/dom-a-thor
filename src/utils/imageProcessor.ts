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
  dilationIterations: 1,
  minAreaPercent: 20,
  insetMargin: 10,
};

/**
 * Process an image to crop to the inner land-plot rectangle using pure JavaScript
 * @param imageUrl - The URL or data URL of the image to process
 * @param config - Configuration parameters for the cropping algorithm
 * @returns Promise<string> - The processed image as a data URL
 */
export const cropToInnerRectangle = async (
  imageUrl: string,
  config: CropConfig = DEFAULT_CROP_CONFIG
): Promise<{imageUrl: string, width: number, height: number}> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      try {
        // Create canvas for the original image
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }

        // Scale image if too large (max 1400px on longest side)
        const maxSide = 1400;
        const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        // Process with pure JavaScript implementation
        try {
          const processedData = processImageWithJavaScript(canvas, config);
          resolve(processedData);
        } catch {
          // Fall back to original image if processing fails
          resolve({imageUrl:canvas.toDataURL('image/png'), width: canvas.width, height: canvas.height});
        }
      } catch (error) {
        reject(error);
      }
    };
    
    img.onerror = () => {
      reject(new Error('Failed to load image'));
    };
    
    img.src = imageUrl;
  });
};

/**
 * Process image using pure JavaScript to find and crop the inner rectangle
 */
const processImageWithJavaScript = (canvas: HTMLCanvasElement, config: CropConfig): { imageUrl: string, width: number, height: number } => {
  const { cannyLow, cannyHigh, dilationIterations, minAreaPercent, insetMargin } = config;
  
  // Get image data
  const ctx = canvas.getContext('2d')!;
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  
  // Convert to grayscale
  const grayData = convertToGrayscale(imageData);
  
  // Apply Gaussian blur
  const blurredData = applyGaussianBlur(grayData, canvas.width, canvas.height);
  
  // Apply Canny edge detection
  const edgeData = applyCannyEdgeDetection(blurredData, canvas.width, canvas.height, cannyLow, cannyHigh);
  
  // Apply dilation if needed
  let dilatedData = edgeData;
  if (dilationIterations > 0) {
    dilatedData = applyDilation(edgeData, canvas.width, canvas.height, dilationIterations);
  }
  
  // Find contours and best rectangle
  const contours = findContours(dilatedData, canvas.width, canvas.height);
  const bestRect = findBestRectangle(contours, canvas.width, canvas.height, minAreaPercent);
  
  if (bestRect) {
    // Crop using perspective transform
    return { imageUrl: cropWithPerspectiveTransform(canvas, bestRect, insetMargin), width: bestRect.width, height: bestRect.height }
  } else {
    // Fallback: return original image
    return { imageUrl: canvas.toDataURL('image/png'), width: canvas.width, height: canvas.height };
  }
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
  minAreaPercent: number
): {x: number, y: number, width: number, height: number, angle: number} | null => {
  const imgArea = width * height;
  const minArea = imgArea * (minAreaPercent / 100);
  const borderPad = Math.round(Math.min(width, height) * 0.02);
  
  let best: {rect: {x: number, y: number, width: number, height: number, angle: number}, score: number} | null = null;
  
  for (const contour of contours) {
    if (contour.length < 4) continue;
    
    // Get bounding rectangle
    const bounds = getBoundingRect(contour);
    const rectArea = bounds.width * bounds.height;
    
    // Check area constraint
    if (rectArea < minArea) continue;
    
    // Check if it's not hugging the border
    if (bounds.x <= borderPad || bounds.y <= borderPad ||
        bounds.x + bounds.width >= width - borderPad ||
        bounds.y + bounds.height >= height - borderPad) {
      continue;
    }
    
    // Calculate minimum area rectangle (simplified)
    const rect = calculateMinAreaRect(contour);
    const angle = Math.abs(rect.angle % 90);
    const axisAlignedScore = 1 - Math.min(angle, 90 - angle) / 10;
    const score = rectArea * axisAlignedScore;
    
    if (!best || score > best.score) {
      best = { rect, score };
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

/**
 * Crop image using perspective transform
 */
const cropWithPerspectiveTransform = (
  canvas: HTMLCanvasElement,
  rect: {x: number, y: number, width: number, height: number, angle: number},
  insetMargin: number
): string => {
  // Simplified cropping - just crop to the rectangle bounds with inset
  const insetX = Math.min(insetMargin, rect.width / 4);
  const insetY = Math.min(insetMargin, rect.height / 4);
  
  const cropX = Math.max(0, rect.x + insetX);
  const cropY = Math.max(0, rect.y + insetY);
  const cropWidth = Math.min(canvas.width - cropX, rect.width - 2 * insetX);
  const cropHeight = Math.min(canvas.height - cropY, rect.height - 2 * insetY);
  
  // Create new canvas for cropped image
  const cropCanvas = document.createElement('canvas');
  const cropCtx = cropCanvas.getContext('2d')!;
  
  cropCanvas.width = cropWidth;
  cropCanvas.height = cropHeight;
  
  // Draw cropped portion
  cropCtx.drawImage(
    canvas,
    cropX, cropY, cropWidth, cropHeight,
    0, 0, cropWidth, cropHeight
  );
  
  return cropCanvas.toDataURL('image/png');
};