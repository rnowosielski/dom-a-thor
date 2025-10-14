import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render } from '@testing-library/react'
import { DynamicCenter } from '../DynamicCenter'

// Mock react-leaflet
const mockUseMap = vi.fn()
vi.mock('react-leaflet', () => ({
  useMap: () => mockUseMap(),
}))

describe('DynamicCenter', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should call setView when center changes', () => {
    const mockSetView = vi.fn()
    mockUseMap.mockReturnValue({
      setView: mockSetView,
    })

    const center: [number, number] = [52.2296756, 21.0122287]
    
    render(<DynamicCenter center={center} />)
    
    expect(mockSetView).toHaveBeenCalledWith(center)
  })

  it('should call setView when center prop updates', () => {
    const mockSetView = vi.fn()
    mockUseMap.mockReturnValue({
      setView: mockSetView,
    })

    const { rerender } = render(<DynamicCenter center={[52.2296756, 21.0122287]} />)
    
    expect(mockSetView).toHaveBeenCalledWith([52.2296756, 21.0122287])
    expect(mockSetView).toHaveBeenCalledTimes(1)
    
    const newCenter: [number, number] = [52.3, 21.1]
    rerender(<DynamicCenter center={newCenter} />)
    
    expect(mockSetView).toHaveBeenCalledWith(newCenter)
    expect(mockSetView).toHaveBeenCalledTimes(2)
  })

  it('should handle multiple center updates', () => {
    const mockSetView = vi.fn()
    mockUseMap.mockReturnValue({
      setView: mockSetView,
    })

    const { rerender } = render(<DynamicCenter center={[52.2296756, 21.0122287]} />)
    
    const centers = [
      [52.3, 21.1],
      [52.4, 21.2],
      [52.5, 21.3],
    ]
    
    centers.forEach(center => {
      rerender(<DynamicCenter center={center as [number, number]} />)
    })
    
    expect(mockSetView).toHaveBeenCalledTimes(4) // initial + 3 updates
    expect(mockSetView).toHaveBeenLastCalledWith([52.5, 21.3])
  })

  it('should return null (no DOM elements)', () => {
    const mockSetView = vi.fn()
    mockUseMap.mockReturnValue({
      setView: mockSetView,
    })

    const { container } = render(<DynamicCenter center={[52.2296756, 21.0122287]} />)
    
    expect(container.firstChild).toBeNull()
  })

  it('should handle negative coordinates', () => {
    const mockSetView = vi.fn()
    mockUseMap.mockReturnValue({
      setView: mockSetView,
    })

    const center: [number, number] = [-52.2296756, -21.0122287]
    
    render(<DynamicCenter center={center} />)
    
    expect(mockSetView).toHaveBeenCalledWith(center)
  })

  it('should handle zero coordinates', () => {
    const mockSetView = vi.fn()
    mockUseMap.mockReturnValue({
      setView: mockSetView,
    })

    const center: [number, number] = [0, 0]
    
    render(<DynamicCenter center={center} />)
    
    expect(mockSetView).toHaveBeenCalledWith(center)
  })

  it('should handle extreme coordinates', () => {
    const mockSetView = vi.fn()
    mockUseMap.mockReturnValue({
      setView: mockSetView,
    })

    const center: [number, number] = [90, 180]
    
    render(<DynamicCenter center={center} />)
    
    expect(mockSetView).toHaveBeenCalledWith(center)
  })

  it('should handle decimal precision coordinates', () => {
    const mockSetView = vi.fn()
    mockUseMap.mockReturnValue({
      setView: mockSetView,
    })

    const center: [number, number] = [52.123456789, 21.987654321]
    
    render(<DynamicCenter center={center} />)
    
    expect(mockSetView).toHaveBeenCalledWith(center)
  })
})
