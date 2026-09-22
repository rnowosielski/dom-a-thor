import { existsSync, readFileSync } from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';

const expectedDir = path.join(process.cwd(), 'test-fixtures/expected');

const readReference = (name: string) => {
  const jsonPath = path.join(expectedDir, `${name}-crop.json`);
  const pngPath = path.join(expectedDir, `${name}-crop.png`);
  expect(existsSync(jsonPath)).toBe(true);
  expect(existsSync(pngPath)).toBe(true);
  return JSON.parse(readFileSync(jsonPath, 'utf8')) as {
    width: number;
    height: number;
    aspect: number;
    meterAspect: number;
  };
};

describe('crop reference fixtures', () => {
  it('stores Willa Optima reference crop metadata', () => {
    const reference = readReference('willa-optima');
    expect(reference.width).toBeGreaterThan(200);
    expect(reference.height).toBeGreaterThan(250);
    expect(reference.aspect).toBeCloseTo(19.77 / 23.05, 2);
  });

  it('stores HomeKoncept 140 reference crop metadata', () => {
    const reference = readReference('homekoncept-140');
    expect(reference.width).toBeGreaterThan(600);
    expect(reference.height).toBeGreaterThan(780);
    expect(reference.aspect).toBeCloseTo(20.8 / 27.3, 2);
  });

  it('stores Z Charakterem 1 reference crop metadata', () => {
    const reference = readReference('z-charakterem-1');
    expect(reference.width).toBeGreaterThan(260);
    expect(reference.height).toBeGreaterThan(395);
    expect(reference.aspect).toBeCloseTo(18.25 / 27.35, 2);
  });
});
