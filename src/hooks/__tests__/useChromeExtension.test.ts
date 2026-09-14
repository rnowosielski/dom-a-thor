import { renderHook, waitFor } from '@testing-library/react'
import { vi } from 'vitest'
import { useChromeExtension } from '../useChromeExtension'

const mockSendMessage = vi.fn();
const mockExecuteScript = vi.fn();

const mockChrome = {
  tabs: {
    query: vi.fn((_, callback) => {
      callback?.([{ id: 123, url: 'https://www.extradom.pl/projekt-domu-test' }]);
    }),
    sendMessage: mockSendMessage,
  },
  scripting: {
    executeScript: mockExecuteScript,
  },
  runtime: {
    lastError: undefined,
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
    Object.defineProperty(globalThis, 'chrome', {
      value: mockChrome,
      writable: true,
    })
    vi.clearAllMocks()
    mockChrome.runtime.lastError = undefined
    mockExecuteScript.mockResolvedValue(undefined)
    mockSendMessage.mockImplementation((_, __, callback) => {
      callback?.({ data: '{"width":20.8,"height":27.3,"imageUrl":"https://wpcdn.pl/plot.jpg"}' })
    })
  })

  it('should not make API calls when chrome is not available', async () => {
    Object.defineProperty(globalThis, 'chrome', {
      value: undefined,
      writable: true,
    })
    
    const { result } = renderHook(() => useChromeExtension())
    
    expect(result.current.landDetails).toBeNull()
    expect(result.current.isLoading).toBe(false)
    expect(mockChrome.tabs.query).not.toHaveBeenCalled()
  })

  it('loads land details when the content script responds', async () => {
    const { result } = renderHook(() => useChromeExtension())

    await waitFor(() => {
      expect(result.current.landDetails?.width).toBe(20.8)
    })
  })

  it('injects the content script when the receiving end does not exist', async () => {
    mockSendMessage
      .mockImplementationOnce((_, __, callback) => {
        mockChrome.runtime.lastError = { message: 'Could not establish connection. Receiving end does not exist.' }
        callback?.(undefined)
      })
      .mockImplementationOnce((_, __, callback) => {
        mockChrome.runtime.lastError = undefined
        callback?.({ data: '{"width":19.77,"height":23.05,"imageUrl":"https://wpcdn.pl/plot.png"}' })
      })

    const { result } = renderHook(() => useChromeExtension())

    await waitFor(() => {
      expect(mockExecuteScript).toHaveBeenCalledWith({
        target: { tabId: 123 },
        files: ['content.js'],
      })
      expect(result.current.landDetails?.width).toBe(19.77)
    })
  })
})