import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from '../App';

// Mock react-dom/client
vi.mock('react-dom/client', () => ({
  createRoot: vi.fn(() => ({
    render: vi.fn(),
  })),
}));

// Mock App component
vi.mock('../App', () => ({
  default: vi.fn(() => <div>Mocked App</div>),
}));

// Mock CSS import
vi.mock('../index.css', () => ({}));

describe('main.tsx', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock document.getElementById
    const mockElement = document.createElement('div');
    mockElement.id = 'root';
    document.getElementById = vi.fn(() => mockElement);
  });

  it('should render App component with StrictMode', async () => {
    // Import main.tsx to trigger the execution
    await import('../main.tsx');

    // Verify createRoot was called with the root element
    expect(createRoot).toHaveBeenCalledWith(expect.any(HTMLElement));
    
    // Verify render was called
    const mockRoot = (createRoot as any).mock.results[0].value;
    expect(mockRoot.render).toHaveBeenCalledWith(
      expect.objectContaining({
        type: StrictMode,
        props: {
          children: expect.any(Object)
        }
      })
    );
  });

  it('should handle missing root element gracefully', async () => {
    // Mock document.getElementById to return null
    document.getElementById = vi.fn(() => null);
    
    // This should not throw an error due to the non-null assertion
    await expect(async () => await import('../main.tsx')).not.toThrow();
  });
});
