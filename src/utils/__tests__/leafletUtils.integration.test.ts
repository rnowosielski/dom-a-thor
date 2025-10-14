import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the imageProcessor module
vi.mock('../imageProcessor', () => ({
  cropToInnerRectangle: vi.fn(),
}));

// Mock Leaflet
vi.mock('leaflet', () => ({
  default: {
    imageOverlay: {
      rotated: vi.fn(() => ({
        bringToFront: vi.fn(),
      })),
    },
  },
}));

import { createRotatedImageOverlay } from '../leafletUtils';
import { cropToInnerRectangle } from '../imageProcessor';
import L from 'leaflet';

// Get the mocked objects
const mockOverlay = { bringToFront: vi.fn() };
const mockL = L as any;

describe('leafletUtils integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createRotatedImageOverlay', () => {
    it('should process house image with cropping', async () => {
      const mockCroppedImage = {
        imageUrl: 'data:image/png;base64,cropped',
        width: 800,
        height: 600
      };
      
      // Mock the image processing pipeline
      vi.mocked(cropToInnerRectangle).mockResolvedValue(mockCroppedImage);
      
      const imageUrl = 'data:image/png;base64,original';
      const coordinates = [
        [52.2296756, 21.0122287],
        [52.2296756, 21.0122288],
        [52.2296757, 21.0122288],
        [52.2296757, 21.0122287],
      ];
      
      const result = await createRotatedImageOverlay(imageUrl, coordinates, false, false);
      
      expect(result).toBeDefined();
      expect(result.bringToFront).toBeDefined();
      expect(mockL.imageOverlay.rotated).toHaveBeenCalledWith(
        mockCroppedImage.imageUrl,
        coordinates[3], // rotated coordinates[3] (bottom-left)
        coordinates[0], // rotated coordinates[0] (top-left)
        coordinates[2], // rotated coordinates[2] (bottom-right)
        expect.any(Object)
      );
    });

    it('should handle image processing errors gracefully', async () => {
      // Mock cropToInnerRectangle to throw an error
      vi.mocked(cropToInnerRectangle).mockRejectedValue(new Error('Processing failed'));
      
      const imageUrl = 'data:image/png;base64,original';
      const coordinates = [
        [52.2296756, 21.0122287],
        [52.2296756, 21.0122288],
        [52.2296757, 21.0122288],
        [52.2296757, 21.0122287],
      ];
      
      // Should not throw, should fall back to original image
      const result = await createRotatedImageOverlay(imageUrl, coordinates, false, false);
      
      expect(result).toBeDefined();
      expect(result.bringToFront).toBeDefined();
      // Should fall back to original image URL
      expect(mockL.imageOverlay.rotated).toHaveBeenCalledWith(
        imageUrl,
        coordinates[3], // rotated coordinates[3] (bottom-left)
        coordinates[0], // rotated coordinates[0] (top-left)
        coordinates[2], // rotated coordinates[2] (bottom-right)
        expect.any(Object)
      );
    });
  });
});
