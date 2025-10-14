import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock react-dom/client to prevent actual DOM operations
vi.mock('react-dom/client', () => ({
  createRoot: vi.fn(() => ({
    render: vi.fn(),
  })),
}));

// Mock App component
vi.mock('../App', () => ({
  default: vi.fn(() => 'Mocked App'),
}));

// Mock CSS import
vi.mock('../index.css', () => ({}));

describe('main.tsx', () => {
  beforeEach(() => {
    // Mock document.getElementById to return a valid element
    const mockElement = document.createElement('div');
    mockElement.id = 'root';
    document.getElementById = vi.fn(() => mockElement);
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.clearAllTimers();
  });

  it('should be importable', async () => {
    // Just test that the module can be imported without errors
    await expect(import('../main.tsx')).resolves.toBeDefined();
  });
});
