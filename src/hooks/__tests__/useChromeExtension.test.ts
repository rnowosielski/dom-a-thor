import { renderHook } from '@testing-library/react'
import { vi } from 'vitest'
import { useChromeExtension } from '../useChromeExtension'

// Mock Chrome APIs
const mockChrome = {
  tabs: {
    query: vi.fn(),
    sendMessage: vi.fn(),
  },
  runtime: {
    onMessage: {
      addListener: vi.fn(),
    },
  },
}

Object.defineProperty(globalThis, 'chrome', {
  value: mockChrome,
  writable: true,
})

describe('useChromeExtension', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })


  it('should not make API calls when chrome is not available', async () => {
    // Remove chrome from globalThis
    Object.defineProperty(globalThis, 'chrome', {
      value: undefined,
      writable: true,
    })
    
    const { result } = renderHook(() => useChromeExtension())
    
    expect(result.current.landDetails).toBeNull()
    expect(result.current.isLoading).toBe(false)
    expect(mockChrome.tabs.query).not.toHaveBeenCalled()
  })








})