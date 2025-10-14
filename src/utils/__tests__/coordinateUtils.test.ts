import { describe, it, expect, vi, beforeEach } from 'vitest'
import proj4 from 'proj4'
import { parse } from 'wellknown'
import {
  transformCoordinates,
  calculatePolygonCenter,
  calculateHouseCoordinates,
  parseWKTGeometry,
  fetchLandData,
  type Coordinate,
  type CoordinateArray,
} from '../coordinateUtils'

// Mock dependencies
vi.mock('proj4')
vi.mock('wellknown')

describe('coordinateUtils', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('transformCoordinates', () => {
    it('should transform coordinates from EPSG2180 to WGS84', () => {
      const mockCoordinates: [number, number][] = [
        [500000, 5000000],
        [501000, 5001000],
      ]
      
      // Mock proj4 to return transformed coordinates
      vi.mocked(proj4).mockImplementation(() => [21.0, 52.0])
      
      const result = transformCoordinates(mockCoordinates)
      
      expect(proj4).toHaveBeenCalledWith(
        '+proj=tmerc +lat_0=0 +lon_0=19 +k=0.9993 +x_0=500000 +y_0=-5300000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs',
        'EPSG:4326',
        [500000, 5000000]
      )
      expect(result).toEqual([
        [52.0, 21.0],
        [52.0, 21.0],
      ])
    })

    it('should handle empty coordinates array', () => {
      const result = transformCoordinates([])
      expect(result).toEqual([])
    })
  })

  describe('calculatePolygonCenter', () => {
    it('should calculate the center point of a polygon', () => {
      const coordinates: CoordinateArray = [
        [0, 0],
        [10, 0],
        [10, 10],
        [0, 10],
      ]
      
      const result = calculatePolygonCenter(coordinates)
      
      expect(result).toEqual([5, 5])
    })

    it('should handle single coordinate', () => {
      const coordinates: CoordinateArray = [[5, 10]]
      
      const result = calculatePolygonCenter(coordinates)
      
      expect(result).toEqual([5, 10])
    })

    it('should handle empty array', () => {
      const coordinates: CoordinateArray = []
      
      const result = calculatePolygonCenter(coordinates)
      
      expect(result).toEqual([NaN, NaN])
    })

    it('should handle three coordinates', () => {
      const coordinates: CoordinateArray = [
        [0, 0],
        [3, 0],
        [0, 3],
      ]
      
      const result = calculatePolygonCenter(coordinates)
      
      expect(result).toEqual([1, 1])
    })
  })

  describe('calculateHouseCoordinates', () => {
    it('should calculate house coordinates based on dimensions and center', () => {
      const center: Coordinate = [52.2296756, 21.0122287]
      const width = 25
      const height = 25
      
      const result = calculateHouseCoordinates(center, width, height)
      
      expect(result).toHaveLength(4)
      expect(result[0]).toEqual([
        expect.closeTo(center[0] - (height / 2) / 111132, 6),
        expect.closeTo(center[1] - (width / 2) / (111320 * Math.cos((center[0] * Math.PI) / 180)), 6),
      ])
      expect(result[1]).toEqual([
        expect.closeTo(center[0] + (height / 2) / 111132, 6),
        expect.closeTo(center[1] - (width / 2) / (111320 * Math.cos((center[0] * Math.PI) / 180)), 6),
      ])
      expect(result[2]).toEqual([
        expect.closeTo(center[0] + (height / 2) / 111132, 6),
        expect.closeTo(center[1] + (width / 2) / (111320 * Math.cos((center[0] * Math.PI) / 180)), 6),
      ])
      expect(result[3]).toEqual([
        expect.closeTo(center[0] - (height / 2) / 111132, 6),
        expect.closeTo(center[1] + (width / 2) / (111320 * Math.cos((center[0] * Math.PI) / 180)), 6),
      ])
    })

    it('should handle zero dimensions', () => {
      const center: Coordinate = [52.2296756, 21.0122287]
      const width = 0
      const height = 0
      
      const result = calculateHouseCoordinates(center, width, height)
      
      expect(result).toEqual([
        [center[0], center[1]],
        [center[0], center[1]],
        [center[0], center[1]],
        [center[0], center[1]],
      ])
    })

    it('should handle negative dimensions', () => {
      const center: Coordinate = [52.2296756, 21.0122287]
      const width = -25
      const height = -25
      
      const result = calculateHouseCoordinates(center, width, height)
      
      expect(result).toHaveLength(4)
      // With negative dimensions, the coordinates should be larger than center
      expect(result[0][0]).toBeGreaterThan(center[0])
      expect(result[0][1]).toBeGreaterThan(center[1])
    })
  })

  describe('parseWKTGeometry', () => {
    it('should parse valid WKT polygon data', () => {
      const mockGeometry = {
        type: 'Polygon',
        coordinates: [[[500000, 5000000], [501000, 5001000]]],
      }
      
      vi.mocked(parse).mockReturnValue(mockGeometry)
      vi.mocked(proj4).mockImplementation(() => [21.0, 52.0])
      
      const result = parseWKTGeometry('POLYGON((500000 5000000, 501000 5001000))')
      
      expect(parse).toHaveBeenCalledWith('POLYGON((500000 5000000, 501000 5001000))')
      expect(result).toEqual([
        [52.0, 21.0],
        [52.0, 21.0],
      ])
    })

    it('should return null for invalid geometry', () => {
      vi.mocked(parse).mockReturnValue(null)
      
      const result = parseWKTGeometry('invalid wkt')
      
      expect(result).toBeNull()
    })

    it('should return null for non-polygon geometry', () => {
      const mockGeometry = {
        type: 'Point',
        coordinates: [500000, 5000000],
      }
      
      vi.mocked(parse).mockReturnValue(mockGeometry)
      
      const result = parseWKTGeometry('POINT(500000 5000000)')
      
      expect(result).toBeNull()
    })

    it('should return null for polygon without coordinates', () => {
      const mockGeometry = {
        type: 'Polygon',
        coordinates: null,
      }
      
      vi.mocked(parse).mockReturnValue(mockGeometry)
      
      const result = parseWKTGeometry('POLYGON EMPTY')
      
      expect(result).toBeNull()
    })

    it('should handle empty polygon coordinates', () => {
      const mockGeometry = {
        type: 'Polygon',
        coordinates: [],
      }
      
      vi.mocked(parse).mockReturnValue(mockGeometry)
      
      const result = parseWKTGeometry('POLYGON EMPTY')
      
      expect(result).toBeNull()
    })
  })

  describe('fetchLandData', () => {
    it('should fetch and parse land data successfully', async () => {
      const mockResponse = {
        ok: true,
        text: vi.fn().mockResolvedValue('POLYGON((500000 5000000, 501000 5001000))'),
      }
      
      global.fetch = vi.fn().mockResolvedValue(mockResponse)
      
      const mockGeometry = {
        type: 'Polygon',
        coordinates: [[[500000, 5000000], [501000, 5001000]]],
      }
      
      vi.mocked(parse).mockReturnValue(mockGeometry)
      vi.mocked(proj4).mockImplementation(() => [21.0, 52.0])
      
      const result = await fetchLandData('12345')
      
      expect(fetch).toHaveBeenCalledWith(
        'https://uldk.gugik.gov.pl/?request=GetParcelById&id=12345&result=geom_wkt'
      )
      expect(result).toEqual([
        [52.0, 21.0],
        [52.0, 21.0],
      ])
    })

    it('should return null on fetch error', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'))
      
      const result = await fetchLandData('12345')
      
      expect(result).toBeNull()
    })

    it('should return null on HTTP error', async () => {
      const mockResponse = {
        ok: false,
        status: 404,
      }
      
      global.fetch = vi.fn().mockResolvedValue(mockResponse)
      
      const result = await fetchLandData('12345')
      
      expect(result).toBeNull()
    })

    it('should return null on parse error', async () => {
      const mockResponse = {
        ok: true,
        text: vi.fn().mockResolvedValue('invalid wkt'),
      }
      
      global.fetch = vi.fn().mockResolvedValue(mockResponse)
      vi.mocked(parse).mockReturnValue(null)
      
      const result = await fetchLandData('12345')
      
      expect(result).toBeNull()
    })

    it('should handle empty land identifier', async () => {
      const result = await fetchLandData('')
      
      expect(fetch).toHaveBeenCalledWith(
        'https://uldk.gugik.gov.pl/?request=GetParcelById&id=&result=geom_wkt'
      )
    })
  })
})
