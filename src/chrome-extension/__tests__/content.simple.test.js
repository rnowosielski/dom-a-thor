import { describe, it, expect } from 'vitest';

describe('chrome-extension/content.js', () => {
  it('should be importable', async () => {
    // Just test that the module can be imported without errors
    await expect(import('../content.js')).resolves.toBeDefined();
  });
});
