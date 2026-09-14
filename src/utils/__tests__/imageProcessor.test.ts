import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  alignMeterDimensionsWithImageOrientation,
  adjustCropToMeterAspect,
  cropToInnerRectangle,
  DEFAULT_CROP_CONFIG,
  type CropConfig,
} from '../imageProcessor';

// Mock canvas and image
const mockCtx = {
  drawImage: vi.fn(),
  getImageData: vi.fn(() => ({
    data: new Uint8ClampedArray(800 * 600 * 4),
    width: 800,
    height: 600,
  })),
};

const mockCanvas = {
  _width: 800,
  _height: 600,
  get width() { return this._width; },
  set width(value) { this._width = value; },
  get height() { return this._height; },
  set height(value) { this._height = value; },
  getContext: vi.fn(() => mockCtx),
  toDataURL: vi.fn(() => 'data:image/png;base64,mockdata'),
};

const mockImage = {
  width: 800,
  height: 600,
  naturalWidth: 800,
  naturalHeight: 600,
  crossOrigin: '',
  onload: null as (() => void) | null,
  onerror: null as (() => void) | null,
  src: '',
};

vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
  const url = String(input);
  if (url.includes('invalid-url')) {
    throw new Error('Failed to fetch image');
  }

  return {
    ok: true,
    blob: async () => new Blob(['mock'], { type: 'image/png' }),
  };
}));

// Mock DOM elements
Object.defineProperty(global, 'Image', {
  value: vi.fn(() => {
    const img = { ...mockImage };
    // Override src setter to trigger onload/onerror
    Object.defineProperty(img, 'src', {
      set: function(value) {
        this._src = value;
        // Simulate immediate loading for successful cases
        setTimeout(() => {
          if (this.onload && value !== 'invalid-url') {
            this.onload();
          } else if (this.onerror && value === 'invalid-url') {
            this.onerror();
          }
        }, 0);
      },
      get: function() {
        return this._src || '';
      }
    });
    return img;
  }),
});

Object.defineProperty(global, 'document', {
  value: {
    createElement: vi.fn((tagName: string) => {
      if (tagName === 'canvas') {
        return mockCanvas;
      }
      return {};
    }),
  },
});

describe('imageProcessor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockImage.width = 800;
    mockImage.height = 600;
    mockImage.naturalWidth = 800;
    mockImage.naturalHeight = 600;
    mockCanvas._width = 800;
    mockCanvas._height = 600;
    mockCtx.getImageData.mockReturnValue({
      data: new Uint8ClampedArray(800 * 600 * 4),
      width: 800,
      height: 600,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('cropToInnerRectangle', () => {
    it('should process image successfully with default config', async () => {
      const imageUrl = 'data:image/png;base64,test';
      
      const result = await cropToInnerRectangle(imageUrl);
      
      expect(result).toEqual({
        imageUrl: 'data:image/png;base64,mockdata',
        width: 800,
        height: 600
      });
      // Note: src and crossOrigin are set internally by the Image constructor, we can't easily test them in this mock setup
    });

    it('should process image with custom config', async () => {
      const imageUrl = 'data:image/png;base64,test';
      const customConfig: CropConfig = {
        cannyLow: 50,
        cannyHigh: 150,
        dilationIterations: 3,
        minAreaPercent: 25,
        insetMargin: 8,
      };
      
      const result = await cropToInnerRectangle(imageUrl, customConfig);
      
      expect(result).toEqual({
        imageUrl: 'data:image/png;base64,mockdata',
        width: 800,
        height: 600
      });
    });

    it('should handle image load error', async () => {
      const imageUrl = 'https://example.com/invalid-url.png';

      await expect(cropToInnerRectangle(imageUrl)).rejects.toThrow('Failed to fetch image');
    });

    it('should handle canvas context error', async () => {
      mockCanvas.getContext.mockReturnValueOnce(null);
      
      const imageUrl = 'data:image/png;base64,test';
      
      await expect(cropToInnerRectangle(imageUrl)).rejects.toThrow('Could not get canvas context');
    });

    it('should scale large images', async () => {
      mockImage.width = 2000;
      mockImage.height = 1500;
      mockImage.naturalWidth = 2000;
      mockImage.naturalHeight = 1500;
      
      const imageUrl = 'data:image/png;base64,test';
      
      await cropToInnerRectangle(imageUrl);
      
      // Should scale down to max 1400px on longest side
      // Note: Canvas dimensions are set internally, we verify the function completes successfully
      expect(mockCanvas.toDataURL).toHaveBeenCalled();
    });

    it('should not scale small images', async () => {
      mockImage.width = 800;
      mockImage.height = 600;
      
      const imageUrl = 'data:image/png;base64,test';
      
      await cropToInnerRectangle(imageUrl);
      
      // Note: Canvas dimensions are set internally, we verify the function completes successfully
      expect(mockCanvas.toDataURL).toHaveBeenCalled();
    });
  });

  describe('DEFAULT_CROP_CONFIG', () => {
    it('should have correct default values', () => {
      expect(DEFAULT_CROP_CONFIG).toEqual({
        cannyLow: 60,
        cannyHigh: 140,
        dilationIterations: 4,
        minAreaPercent: 15,
        insetMargin: 2,
      });
    });
  });

  describe('Image processing pipeline', () => {
    it('should complete image processing successfully', async () => {
      const imageUrl = 'data:image/png;base64,test';
      
      await cropToInnerRectangle(imageUrl);
      
      // Verify canvas operations were called
      expect(mockCanvas.getContext).toHaveBeenCalled();
      expect(mockCanvas.toDataURL).toHaveBeenCalled();
    });

    it('should handle processing errors gracefully', async () => {
      mockCtx.getImageData.mockImplementationOnce(() => {
        throw new Error('Processing error');
      });
      
      const imageUrl = 'data:image/png;base64,test';
      
      // Should fall back to original image instead of throwing
      const result = await cropToInnerRectangle(imageUrl);
      expect(result).toEqual({
        imageUrl: 'data:image/png;base64,mockdata',
        width: 800,
        height: 600
      });
    });
  });

  describe('Edge detection and contour finding', () => {
    it('should process edge detection pipeline', async () => {
      const imageUrl = 'data:image/png;base64,test';
      
      const result = await cropToInnerRectangle(imageUrl);
      
      // Should complete successfully even if no contours are found
      expect(result).toEqual({
        imageUrl: 'data:image/png;base64,mockdata',
        width: 800,
        height: 600
      });
    });

    it('should handle empty contours gracefully', async () => {
      const imageUrl = 'data:image/png;base64,test';
      
      const result = await cropToInnerRectangle(imageUrl);
      
      // Should fall back to original image when no valid rectangles found
      expect(result).toEqual({
        imageUrl: 'data:image/png;base64,mockdata',
        width: 800,
        height: 600
      });
    });
  });

  describe('adjustCropToMeterAspect', () => {
    it('should center-crop when plot aspect differs from meter aspect', async () => {
      const cropped = {
        imageUrl: 'data:image/png;base64,cropped',
        width: 346,
        height: 397,
      };

      const result = await adjustCropToMeterAspect(cropped, 19.77, 23.05);

      expect(result.width).toBeLessThanOrEqual(346);
      expect(result.height).toBe(397);
    });
  });

  describe('alignMeterDimensionsWithImageOrientation', () => {
    it('should preserve extradom meter dimensions regardless of image pixel shape', () => {
      expect(alignMeterDimensionsWithImageOrientation(19.77, 23.05, 438, 442)).toEqual({
        width: 19.77,
        height: 23.05,
      });
      expect(alignMeterDimensionsWithImageOrientation(19.77, 23.05, 442, 438)).toEqual({
        width: 19.77,
        height: 23.05,
      });
    });
  });

  describe('schematic diagram cropping', () => {
    it('should crop to plot content while ignoring blue dimension labels', async () => {
      const width = 400;
      const height = 300;
      const data = new Uint8ClampedArray(width * height * 4);

      for (let i = 0; i < data.length; i += 4) {
        data[i] = 255;
        data[i + 1] = 255;
        data[i + 2] = 255;
        data[i + 3] = 255;
      }

      for (let x = 20; x < 120; x++) {
        const i = (12 * width + x) * 4;
        data[i] = 30;
        data[i + 1] = 100;
        data[i + 2] = 220;
        data[i + 3] = 255;
      }

      for (let y = 60; y < 240; y++) {
        for (let x = 80; x < 320; x++) {
          const i = (y * width + x) * 4;
          const isBorder =
            y === 60 || y === 239 || x === 80 || x === 319;
          const value = isBorder ? 60 : 120;
          data[i] = value;
          data[i + 1] = value;
          data[i + 2] = value;
          data[i + 3] = 255;
        }
      }

      for (let y = 40; y < 260; y++) {
        for (let x = 60; x < 340; x++) {
          if (y >= 60 && y < 240 && x >= 80 && x < 320) {
            continue;
          }
          const i = (y * width + x) * 4;
          data[i] = 225;
          data[i + 1] = 225;
          data[i + 2] = 225;
          data[i + 3] = 255;
        }
      }

      mockCanvas._width = width;
      mockCanvas._height = height;
      mockImage.width = width;
      mockImage.height = height;
      mockImage.naturalWidth = width;
      mockImage.naturalHeight = height;

      mockCtx.getImageData.mockReturnValueOnce({ data, width, height });

      const result = await cropToInnerRectangle('data:image/png;base64,schematic');

      expect(result.width).toBeLessThan(width * 0.75);
      expect(result.height).toBeLessThan(height * 0.75);
      expect(result.width).toBeGreaterThan(width * 0.45);
      expect(result.height).toBeGreaterThan(height * 0.45);
      expect(result.width / result.height).toBeCloseTo(240 / 180, 1);
    });
  });
});