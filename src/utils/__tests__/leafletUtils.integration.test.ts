import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../imageProcessor', () => ({
  cropToInnerRectangle: vi.fn(),
  getImageNaturalDimensions: vi.fn(),
}));

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
import { cropToInnerRectangle, getImageNaturalDimensions } from '../imageProcessor';
import L from 'leaflet';

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

      vi.mocked(cropToInnerRectangle).mockResolvedValue(mockCroppedImage);
      vi.mocked(getImageNaturalDimensions).mockResolvedValue({
        width: 800,
        height: 600,
      });

      const imageUrl = 'https://example.com/original.png';
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
        coordinates[1],
        coordinates[2],
        coordinates[0],
        expect.any(Object)
      );
    });

    it('should handle image processing errors gracefully', async () => {
      vi.mocked(cropToInnerRectangle).mockRejectedValue(new Error('Processing failed'));
      vi.mocked(getImageNaturalDimensions).mockRejectedValue(new Error('Processing failed'));

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
        imageUrl,
        coordinates[1],
        coordinates[2],
        coordinates[0],
        expect.any(Object)
      );
    });
  });
});
