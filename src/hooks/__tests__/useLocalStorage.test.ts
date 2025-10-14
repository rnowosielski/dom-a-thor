import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useLocalStorage } from '../useLocalStorage'

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
}

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
})

describe('useLocalStorage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    localStorageMock.getItem.mockReset()
    localStorageMock.setItem.mockReset()
  })

  it('should return initial value when localStorage is empty', () => {
    localStorageMock.getItem.mockReturnValue(null)
    
    const { result } = renderHook(() => useLocalStorage('test-key', 'initial-value'))
    
    expect(result.current[0]).toBe('initial-value')
    expect(localStorageMock.getItem).toHaveBeenCalledWith('test-key')
  })

  it('should return stored value from localStorage', () => {
    localStorageMock.getItem.mockReturnValue('"stored-value"')
    
    const { result } = renderHook(() => useLocalStorage('test-key', 'initial-value'))
    
    expect(result.current[0]).toBe('stored-value')
    expect(localStorageMock.getItem).toHaveBeenCalledWith('test-key')
  })

  it('should handle object values', () => {
    const initialValue = { name: 'test', value: 123 }
    const storedValue = { name: 'stored', value: 456 }
    
    localStorageMock.getItem.mockReturnValue(JSON.stringify(storedValue))
    
    const { result } = renderHook(() => useLocalStorage('test-key', initialValue))
    
    expect(result.current[0]).toEqual(storedValue)
  })

  it('should handle array values', () => {
    const initialValue = [1, 2, 3]
    const storedValue = [4, 5, 6]
    
    localStorageMock.getItem.mockReturnValue(JSON.stringify(storedValue))
    
    const { result } = renderHook(() => useLocalStorage('test-key', initialValue))
    
    expect(result.current[0]).toEqual(storedValue)
  })

  it('should handle number values', () => {
    const initialValue = 0
    const storedValue = 42
    
    localStorageMock.getItem.mockReturnValue(JSON.stringify(storedValue))
    
    const { result } = renderHook(() => useLocalStorage('test-key', initialValue))
    
    expect(result.current[0]).toBe(42)
  })

  it('should handle boolean values', () => {
    const initialValue = false
    const storedValue = true
    
    localStorageMock.getItem.mockReturnValue(JSON.stringify(storedValue))
    
    const { result } = renderHook(() => useLocalStorage('test-key', initialValue))
    
    expect(result.current[0]).toBe(true)
  })

  it('should update localStorage when value changes', () => {
    localStorageMock.getItem.mockReturnValue(null)
    
    const { result } = renderHook(() => useLocalStorage('test-key', 'initial'))
    
    act(() => {
      result.current[1]('new-value')
    })
    
    expect(result.current[0]).toBe('new-value')
    expect(localStorageMock.setItem).toHaveBeenCalledWith('test-key', '"new-value"')
  })

  it('should handle function updates', () => {
    localStorageMock.getItem.mockReturnValue('5')
    
    const { result } = renderHook(() => useLocalStorage('test-key', 0))
    
    act(() => {
      result.current[1]((prev) => prev + 1)
    })
    
    expect(result.current[0]).toBe(6)
    expect(localStorageMock.setItem).toHaveBeenCalledWith('test-key', '6')
  })

  it('should handle localStorage errors gracefully on get', () => {
    localStorageMock.getItem.mockImplementation(() => {
      throw new Error('localStorage error')
    })
    
    const { result } = renderHook(() => useLocalStorage('test-key', 'fallback'))
    
    expect(result.current[0]).toBe('fallback')
  })

  it('should handle localStorage errors gracefully on set', () => {
    localStorageMock.getItem.mockReturnValue(null)
    localStorageMock.setItem.mockImplementation(() => {
      throw new Error('localStorage error')
    })
    
    const { result } = renderHook(() => useLocalStorage('test-key', 'initial'))
    
    act(() => {
      result.current[1]('new-value')
    })
    
    // Should still update the state even if localStorage fails
    expect(result.current[0]).toBe('new-value')
  })

  it('should handle invalid JSON in localStorage', () => {
    localStorageMock.getItem.mockReturnValue('invalid-json')
    
    const { result } = renderHook(() => useLocalStorage('test-key', 'fallback'))
    
    expect(result.current[0]).toBe('fallback')
  })

})
