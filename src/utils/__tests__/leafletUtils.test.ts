import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as L from 'leaflet'
import { createDraggablePolygon, createRotatedImageOverlay, getPolygonCoordinates } from '../leafletUtils'
import type { CoordinateArray } from '../../types/leaflet'

// Mock the imageProcessor module
vi.mock('../imageProcessor', () => ({
  cropToInnerRectangle: vi.fn().mockResolvedValue({
    imageUrl: 'data:image/png;base64,processed',
    width: 800,
    height: 600
  }),
}))

// Mock Leaflet
const mockPolygon = {
  addTo: vi.fn().mockReturnThis(),
  bringToFront: vi.fn(),
  getLatLngs: vi.fn().mockReturnValue([[
    { lat: 52.2, lng: 21.0 },
    { lat: 52.3, lng: 21.0 },
    { lat: 52.3, lng: 21.1 },
    { lat: 52.2, lng: 21.1 },
  ]]),
  on: vi.fn(),
  dragging: {
    enable: vi.fn(),
    disable: vi.fn(),
  },
  transform: {
    enable: vi.fn(),
    disable: vi.fn(),
  },
}

const mockImageOverlay = {
  addTo: vi.fn().mockReturnThis(),
  bringToFront: vi.fn(),
}

vi.mock('leaflet', () => {
  const mockPolygonFn = vi.fn(() => mockPolygon)
  const mockImageOverlayRotatedFn = vi.fn(() => mockImageOverlay)
  
  return {
    default: {
      polygon: mockPolygonFn,
      imageOverlay: {
        rotated: mockImageOverlayRotatedFn,
      },
    },
    polygon: mockPolygonFn,
    imageOverlay: {
      rotated: mockImageOverlayRotatedFn,
    },
  }
})

// Mock canvas and image for mirroring functionality
const mockCanvas = {
  width: 100,
  height: 100,
  getContext: vi.fn(() => ({
    scale: vi.fn(),
    drawImage: vi.fn(),
  })),
  toDataURL: vi.fn(() => 'data:image/png;base64,mocked-data'),
}

const mockImage = {
  width: 100,
  height: 100,
  onload: null,
  onerror: null,
  crossOrigin: '',
  src: '',
}

// Mock DOM elements
Object.defineProperty(document, 'createElement', {
  value: vi.fn((tagName) => {
    if (tagName === 'canvas') return mockCanvas
    return {}
  }),
  writable: true,
})

Object.defineProperty(window, 'Image', {
  value: vi.fn(() => mockImage),
  writable: true,
})

describe('leafletUtils', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('createDraggablePolygon', () => {
    it('should create a draggable polygon with correct options', () => {
      const coordinates: CoordinateArray = [
        [52.2, 21.0],
        [52.3, 21.0],
        [52.3, 21.1],
        [52.2, 21.1],
      ]
      
      const result = createDraggablePolygon(coordinates)
      
      expect(L.polygon).toHaveBeenCalledWith(coordinates, {
        color: 'blue',
        transform: true,
        draggable: true,
        fillOpacity: 0.1,
      })
      
      expect(result).toBe(mockPolygon)
      expect(mockPolygon.bringToFront).toHaveBeenCalled()
      expect(mockPolygon.transform.enable).toHaveBeenCalledWith({
        rotation: true,
        scaling: false,
      })
      expect(mockPolygon.dragging.enable).toHaveBeenCalled()
    })

    it('should handle empty coordinates', () => {
      const coordinates: CoordinateArray = []
      
      const result = createDraggablePolygon(coordinates)
      
      expect(L.polygon).toHaveBeenCalledWith([], {
        color: 'blue',
        transform: true,
        draggable: true,
        fillOpacity: 0.1,
      })
      expect(result).toBe(mockPolygon)
    })

    it('should handle single coordinate', () => {
      const coordinates: CoordinateArray = [[52.2, 21.0]]
      
      const result = createDraggablePolygon(coordinates)
      
      expect(L.polygon).toHaveBeenCalledWith([[52.2, 21.0]], {
        color: 'blue',
        transform: true,
        draggable: true,
        fillOpacity: 0.1,
      })
      expect(result).toBe(mockPolygon)
    })
  })

  describe('createRotatedImageOverlay', () => {
    it('should create rotated image overlay with correct parameters', async () => {
      const coordinates: CoordinateArray = [
        [52.2, 21.0],
        [52.3, 21.0],
        [52.3, 21.1],
        [52.2, 21.1],
      ]
      const imageUrl = 'test-image.jpg'
      
      const result = await createRotatedImageOverlay(imageUrl, coordinates)
      
      expect(L.imageOverlay.rotated).toHaveBeenCalledWith(
        'data:image/png;base64,processed', // Should use processed image URL
        coordinates[3], // rotated coordinates[3] (bottom-left)
        coordinates[0], // rotated coordinates[0] (top-left)
        coordinates[2], // rotated coordinates[2] (bottom-right)
        {
          opacity: 1,
          interactive: true,
        }
      )
      
      expect(result).toBe(mockImageOverlay)
      expect(mockImageOverlay.bringToFront).toHaveBeenCalled()
    })

    it('should handle different image URLs', async () => {
      const coordinates: CoordinateArray = [[52.2, 21.0], [52.3, 21.0], [52.3, 21.1], [52.2, 21.1]]
      const imageUrl = 'https://example.com/image.png'
      
      const result = await createRotatedImageOverlay(imageUrl, coordinates)

      expect(L.imageOverlay.rotated).toHaveBeenCalledWith(
        'data:image/png;base64,processed',
        coordinates[3], // rotated coordinates[3] (bottom-left)
        coordinates[0], // rotated coordinates[0] (top-left)
        coordinates[2], // rotated coordinates[2] (bottom-right)
        {
          opacity: 1,
          interactive: true,
        }
      )
      expect(result).toBe(mockImageOverlay)
    })

    it('should handle base64 image URLs', async () => {
      const coordinates: CoordinateArray = [[52.2, 21.0], [52.3, 21.0], [52.3, 21.1], [52.2, 21.1]]
      const imageUrl = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD'
      
      const result = await createRotatedImageOverlay(imageUrl, coordinates)

      expect(L.imageOverlay.rotated).toHaveBeenCalledWith(
        'data:image/png;base64,processed',
        coordinates[3], // rotated coordinates[3] (bottom-left)
        coordinates[0], // rotated coordinates[0] (top-left)
        coordinates[2], // rotated coordinates[2] (bottom-right)
        {
          opacity: 1,
          interactive: true,
        }
      )
      expect(result).toBe(mockImageOverlay)
    })

  })

  describe('getPolygonCoordinates', () => {
    it('should extract coordinates from polygon as array of [lat, lng] pairs', () => {
      const mockLatLngs = [
        { lat: 52.2, lng: 21.0 },
        { lat: 52.3, lng: 21.0 },
        { lat: 52.3, lng: 21.1 },
        { lat: 52.2, lng: 21.1 },
      ]
      
      const mockPolygonForTest = {
        getLatLngs: vi.fn().mockReturnValue([mockLatLngs])
      } as unknown as L.Polygon
      
      const result = getPolygonCoordinates(mockPolygonForTest)
      
      expect(result).toEqual([
        [52.2, 21.0],
        [52.3, 21.0],
        [52.3, 21.1],
        [52.2, 21.1],
      ])
    })

    it('should handle empty polygon', () => {
      const mockPolygonForTest = {
        getLatLngs: vi.fn().mockReturnValue([[]])
      } as unknown as L.Polygon
      
      const result = getPolygonCoordinates(mockPolygonForTest)
      
      expect(result).toEqual([])
    })

    it('should handle polygon with single coordinate', () => {
      const mockLatLngs = [{ lat: 52.2, lng: 21.0 }]
      
      const mockPolygonForTest = {
        getLatLngs: vi.fn().mockReturnValue([mockLatLngs])
      } as unknown as L.Polygon
      
      const result = getPolygonCoordinates(mockPolygonForTest)
      
      expect(result).toEqual([[52.2, 21.0]])
    })

    it('should handle negative coordinates', () => {
      const mockLatLngs = [
        { lat: -52.2, lng: -21.0 },
        { lat: -52.3, lng: -21.0 },
        { lat: -52.3, lng: -21.1 },
        { lat: -52.2, lng: -21.1 },
      ]
      
      const mockPolygonForTest = {
        getLatLngs: vi.fn().mockReturnValue([mockLatLngs])
      } as unknown as L.Polygon
      
      const result = getPolygonCoordinates(mockPolygonForTest)
      
      expect(result).toEqual([
        [-52.2, -21.0],
        [-52.3, -21.0],
        [-52.3, -21.1],
        [-52.2, -21.1],
      ])
    })
  })
})
