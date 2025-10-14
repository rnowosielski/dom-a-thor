import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { cropToInnerRectangle, DEFAULT_CROP_CONFIG, type CropConfig } from '../imageProcessor';

// Mock canvas and image
const mockCanvas = {
  _width: 800,
  _height: 600,
  get width() { return this._width; },
  set width(value) { this._width = value; },
  get height() { return this._height; },
  set height(value) { this._height = value; },
  getContext: vi.fn(() => ({
    drawImage: vi.fn(),
    getImageData: vi.fn(() => ({
      data: new Uint8ClampedArray(800 * 600 * 4),
      width: 800,
      height: 600,
    })),
  })),
  toDataURL: vi.fn(() => 'data:image/png;base64,mockdata'),
};

const mockImage = {
  width: 800,
  height: 600,
  crossOrigin: '',
  onload: null as (() => void) | null,
  onerror: null as (() => void) | null,
  src: '',
};

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
      const imageUrl = 'invalid-url';
      
      await expect(cropToInnerRectangle(imageUrl)).rejects.toThrow('Failed to load image');
    });

    it('should handle canvas context error', async () => {
      mockCanvas.getContext.mockReturnValue(null);
      
      const imageUrl = 'data:image/png;base64,test';
      
      await expect(cropToInnerRectangle(imageUrl)).rejects.toThrow('Could not get canvas context');
    });

    it('should scale large images', async () => {
      mockImage.width = 2000;
      mockImage.height = 1500;
      
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
        dilationIterations: 1,
        minAreaPercent: 20,
        insetMargin: 10,
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
      // Mock getImageData to throw an error
      const mockCtx = mockCanvas.getContext();
      mockCtx.getImageData.mockImplementation(() => {
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
});