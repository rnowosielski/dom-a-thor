import { describe, it, expect } from 'vitest';

describe('components/DomAThor.tsx', () => {
  it('should be importable', async () => {
    // Just test that the module can be imported without errors
    await expect(import('../DomAThor')).resolves.toBeDefined();
  });
});
