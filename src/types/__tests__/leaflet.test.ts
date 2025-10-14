import { describe, it, expect, vi } from 'vitest';
import L from 'leaflet';
import type { 
  ExtendedPolygon, 
  ExtendedImageOverlay, 
  Coordinate, 
  CoordinateArray 
} from '../leaflet';

describe('types/leaflet.ts', () => {
  describe('ExtendedPolygon interface', () => {
    it('should extend L.Polygon with dragging and transform properties', () => {
      // Create a mock polygon that implements ExtendedPolygon
      const mockPolygon: ExtendedPolygon = {
        ...({} as L.Polygon),
        dragging: {} as L.Handler,
        transform: {
          enable: vi.fn(),
          disable: vi.fn(),
        },
      };

      expect(mockPolygon.dragging).toBeDefined();
      expect(mockPolygon.transform).toBeDefined();
      expect(typeof mockPolygon.transform.enable).toBe('function');
      expect(typeof mockPolygon.transform.disable).toBe('function');
    });

    it('should allow dragging to be undefined', () => {
      const mockPolygon: ExtendedPolygon = {
        ...({} as L.Polygon),
        dragging: undefined,
        transform: {
          enable: vi.fn(),
          disable: vi.fn(),
        },
      };

      expect(mockPolygon.dragging).toBeUndefined();
      expect(mockPolygon.transform).toBeDefined();
    });

    it('should work with transform enable method', () => {
      const mockPolygon: ExtendedPolygon = {
        ...({} as L.Polygon),
        transform: {
          enable: vi.fn(),
          disable: vi.fn(),
        },
      };

      // Test the transform.enable method
      mockPolygon.transform.enable({ rotation: true, scaling: false });
      expect(mockPolygon.transform.enable).toHaveBeenCalledWith({ rotation: true, scaling: false });

      mockPolygon.transform.enable({ rotation: false, scaling: true });
      expect(mockPolygon.transform.enable).toHaveBeenCalledWith({ rotation: false, scaling: true });
    });

    it('should work with transform disable method', () => {
      const mockPolygon: ExtendedPolygon = {
        ...({} as L.Polygon),
        transform: {
          enable: vi.fn(),
          disable: vi.fn(),
        },
      };

      // Test the transform.disable method
      mockPolygon.transform.disable();
      expect(mockPolygon.transform.disable).toHaveBeenCalled();
    });

    it('should handle dragging handler methods', () => {
      const mockHandler = {
        enable: vi.fn(),
        disable: vi.fn(),
      } as unknown as L.Handler;

      const mockPolygon: ExtendedPolygon = {
        ...({} as L.Polygon),
        dragging: mockHandler,
        transform: {
          enable: vi.fn(),
          disable: vi.fn(),
        },
      };

      expect(mockPolygon.dragging).toBeDefined();
      expect(mockPolygon.dragging?.enable).toBeDefined();
      expect(mockPolygon.dragging?.disable).toBeDefined();
    });
  });

  describe('ExtendedImageOverlay interface', () => {
    it('should extend L.ImageOverlay with bringToFront method', () => {
      const mockOverlay: ExtendedImageOverlay = {
        ...({} as L.ImageOverlay),
        bringToFront: vi.fn().mockReturnThis(),
      };

      expect(typeof mockOverlay.bringToFront).toBe('function');
      expect(mockOverlay.bringToFront()).toBe(mockOverlay);
    });

    it('should chain bringToFront method calls', () => {
      const mockOverlay: ExtendedImageOverlay = {
        ...({} as L.ImageOverlay),
        bringToFront: vi.fn().mockReturnThis(),
      };

      const result = mockOverlay.bringToFront().bringToFront();
      expect(result).toBe(mockOverlay);
      expect(mockOverlay.bringToFront).toHaveBeenCalledTimes(2);
    });

    it('should work with L.ImageOverlay properties', () => {
      const mockOverlay: ExtendedImageOverlay = {
        ...({} as L.ImageOverlay),
        bringToFront: vi.fn().mockReturnThis(),
      };

      // Verify it has the bringToFront method
      expect(typeof mockOverlay.bringToFront).toBe('function');
      
      // Call the method
      const result = mockOverlay.bringToFront();
      expect(result).toBe(mockOverlay);
    });
  });

  describe('Coordinate type', () => {
    it('should be a tuple of two numbers', () => {
      const coordinate: Coordinate = [52.2296756, 21.0122287];
      
      expect(Array.isArray(coordinate)).toBe(true);
      expect(coordinate).toHaveLength(2);
      expect(typeof coordinate[0]).toBe('number');
      expect(typeof coordinate[1]).toBe('number');
    });

    it('should accept valid coordinate values', () => {
      const validCoordinates: Coordinate[] = [
        [0, 0],
        [-90, -180],
        [90, 180],
        [52.2296756, 21.0122287],
        [0.123456, -0.654321],
      ];

      validCoordinates.forEach(coord => {
        expect(coord).toHaveLength(2);
        expect(typeof coord[0]).toBe('number');
        expect(typeof coord[1]).toBe('number');
      });
    });

    it('should handle edge case coordinates', () => {
      const edgeCases: Coordinate[] = [
        [Number.MAX_SAFE_INTEGER, Number.MIN_SAFE_INTEGER],
        [Number.MIN_VALUE, Number.MAX_VALUE],
        [Infinity, -Infinity],
        [0, 0],
      ];

      edgeCases.forEach(coord => {
        expect(coord).toHaveLength(2);
        expect(typeof coord[0]).toBe('number');
        expect(typeof coord[1]).toBe('number');
      });
    });

    it('should be immutable when used in arrays', () => {
      const coordinate: Coordinate = [52.2296756, 21.0122287];
      const originalLat = coordinate[0];
      const originalLng = coordinate[1];

      // Simulate array operations
      const newCoordinate: Coordinate = [coordinate[0] + 0.001, coordinate[1] + 0.001];
      
      expect(coordinate[0]).toBe(originalLat);
      expect(coordinate[1]).toBe(originalLng);
      expect(newCoordinate[0]).toBe(originalLat + 0.001);
      expect(newCoordinate[1]).toBe(originalLng + 0.001);
    });
  });

  describe('CoordinateArray type', () => {
    it('should be an array of Coordinate tuples', () => {
      const coordinateArray: CoordinateArray = [
        [52.2296756, 21.0122287],
        [52.2296757, 21.0122288],
        [52.2296758, 21.0122289],
      ];

      expect(Array.isArray(coordinateArray)).toBe(true);
      expect(coordinateArray.length).toBeGreaterThan(0);
      
      coordinateArray.forEach(coord => {
        expect(Array.isArray(coord)).toBe(true);
        expect(coord).toHaveLength(2);
        expect(typeof coord[0]).toBe('number');
        expect(typeof coord[1]).toBe('number');
      });
    });

    it('should accept empty array', () => {
      const emptyArray: CoordinateArray = [];
      
      expect(Array.isArray(emptyArray)).toBe(true);
      expect(emptyArray).toHaveLength(0);
    });

    it('should accept single coordinate', () => {
      const singleCoordinate: CoordinateArray = [[52.2296756, 21.0122287]];
      
      expect(Array.isArray(singleCoordinate)).toBe(true);
      expect(singleCoordinate).toHaveLength(1);
    });

    it('should work with array methods', () => {
      const coordinateArray: CoordinateArray = [
        [52.2296756, 21.0122287],
        [52.2296757, 21.0122288],
        [52.2296758, 21.0122289],
      ];

      // Test map
      const latitudes = coordinateArray.map(coord => coord[0]);
      expect(latitudes).toEqual([52.2296756, 52.2296757, 52.2296758]);

      // Test filter
      const filtered = coordinateArray.filter(coord => coord[0] > 52.2296756);
      expect(filtered).toHaveLength(2);

      // Test reduce
      const sumLat = coordinateArray.reduce((sum, coord) => sum + coord[0], 0);
      expect(sumLat).toBeCloseTo(156.6890271, 6);
    });

    it('should handle large coordinate arrays', () => {
      const largeArray: CoordinateArray = Array.from({ length: 1000 }, (_, i) => [
        52.2296756 + i * 0.001,
        21.0122287 + i * 0.001
      ]);

      expect(largeArray).toHaveLength(1000);
      expect(Array.isArray(largeArray[0])).toBe(true);
      expect(largeArray[0]).toHaveLength(2);
    });

    it('should work with polygon-like coordinate arrays', () => {
      // Simulate a polygon (first and last coordinates are the same)
      const polygonCoordinates: CoordinateArray = [
        [52.2296756, 21.0122287],
        [52.2296757, 21.0122287],
        [52.2296757, 21.0122288],
        [52.2296756, 21.0122288],
        [52.2296756, 21.0122287], // Closing coordinate
      ];

      expect(polygonCoordinates).toHaveLength(5);
      expect(polygonCoordinates[0]).toEqual(polygonCoordinates[4]); // Closed polygon
      
      // Test that all coordinates are valid
      polygonCoordinates.forEach(coord => {
        expect(coord).toHaveLength(2);
        expect(typeof coord[0]).toBe('number');
        expect(typeof coord[1]).toBe('number');
      });
    });
  });

  describe('Type compatibility', () => {
    it('should be compatible with Leaflet types', () => {
      // Test that our extended types can be used where Leaflet types are expected
      const mockPolygon: ExtendedPolygon = {
        ...({} as L.Polygon),
        transform: {
          enable: vi.fn(),
          disable: vi.fn(),
        },
      };

      // Should be assignable to L.Polygon
      const leafletPolygon: L.Polygon = mockPolygon;
      expect(leafletPolygon).toBeDefined();

      const mockOverlay: ExtendedImageOverlay = {
        ...({} as L.ImageOverlay),
        bringToFront: vi.fn().mockReturnThis(),
      };

      // Should be assignable to L.ImageOverlay
      const leafletOverlay: L.ImageOverlay = mockOverlay;
      expect(leafletOverlay).toBeDefined();
    });

    it('should work with function parameters', () => {
      const processPolygon = (polygon: ExtendedPolygon) => {
        polygon.transform.enable({ rotation: true, scaling: false });
        return polygon;
      };

      const processOverlay = (overlay: ExtendedImageOverlay) => {
        return overlay.bringToFront();
      };

      const processCoordinates = (coords: CoordinateArray) => {
        return coords.length;
      };

      const mockPolygon: ExtendedPolygon = {
        ...({} as L.Polygon),
        transform: {
          enable: vi.fn(),
          disable: vi.fn(),
        },
      };

      const mockOverlay: ExtendedImageOverlay = {
        ...({} as L.ImageOverlay),
        bringToFront: vi.fn().mockReturnThis(),
      };

      const coordinates: CoordinateArray = [[0, 0], [1, 1]];

      expect(processPolygon(mockPolygon)).toBe(mockPolygon);
      expect(processOverlay(mockOverlay)).toBe(mockOverlay);
      expect(processCoordinates(coordinates)).toBe(2);
    });
  });
});
