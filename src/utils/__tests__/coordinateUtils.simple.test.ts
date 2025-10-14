import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  calculatePolygonCenter,
  calculateHouseCoordinates,
  type Coordinate,
  type CoordinateArray,
} from '../coordinateUtils'

describe('coordinateUtils - Simple Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
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
  })
})
