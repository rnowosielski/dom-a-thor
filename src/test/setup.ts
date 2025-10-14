import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Mock console methods to prevent test output pollution
global.console = {
  ...console,
  error: vi.fn(),
  warn: vi.fn(),
  log: vi.fn(),
  info: vi.fn(),
  debug: vi.fn(),
}

// Mock global fetch
global.fetch = vi.fn()

// Mock Chrome extension APIs
Object.defineProperty(globalThis, 'chrome', {
  value: {
    tabs: {
      query: vi.fn((_, callback) => {
        if (callback) {
          setTimeout(() => callback([{ id: 123 }]), 0)
        }
      }),
      sendMessage: vi.fn((_, __, callback) => {
        if (callback) {
          setTimeout(() => callback({ data: '{"width":25,"height":30}' }), 0)
        }
      }),
    },
    runtime: {
      onMessage: {
        addListener: vi.fn((callback) => {
          // Store the callback for testing
          if (typeof callback === 'function') {
            // @ts-expect-error Mocking
            global.chromeMessageListener = callback
          }
        }),
      },
    },
  },
  writable: true,
})

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
}
Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageMock,
})

// Mock URL constructor
global.URL = class URL {
  href: string
  constructor(url: string, base?: string) {
    if (typeof url === 'undefined' || url === null) {
      this.href = ''
      return
    }
    this.href = base ? `${base.replace(/\/$/, '')}/${url.replace(/^\//, '')}` : url
  }
} as any

// Mock Leaflet
vi.mock('leaflet', () => ({
  polygon: vi.fn(() => ({
    bringToFront: vi.fn(),
    transform: {
      enable: vi.fn(),
      disable: vi.fn(),
    },
    dragging: {
      enable: vi.fn(),
      disable: vi.fn(),
    },
    getLatLngs: vi.fn(() => [[{ lat: 52.2, lng: 21.0 }]]),
  })),
  imageOverlay: {
    rotated: vi.fn(() => ({
      bringToFront: vi.fn(),
      addTo: vi.fn(),
    })),
  },
}))
