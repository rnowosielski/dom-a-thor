/**
 * @vitest-environment node
 */
import { createHash } from 'crypto';
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import https from 'https';
import path from 'path';
import { describe, expect, it } from 'vitest';

type CropSource = {
  pageUrl: string;
  sourceUrl: string;
  meterWidth: number;
  meterHeight: number;
  cropMethod: string;
  locationImageSelector?: string;
};

const downloadBinary = (url: string): Promise<Buffer> =>
  new Promise((resolve, reject) => {
    https
      .get(
        url,
        {
          headers: { 'User-Agent': 'dom-a-thor-fixture-sync/1.0' },
        },
        (response) => {
          if (response.statusCode !== 200) {
            reject(new Error(`HTTP ${response.statusCode} for ${url}`));
            response.resume();
            return;
          }

          const chunks: Buffer[] = [];
          response.on('data', (chunk) => chunks.push(chunk as Buffer));
          response.on('end', () => resolve(Buffer.concat(chunks)));
        }
      )
      .on('error', reject);
  });

const sourcesPath = path.join(process.cwd(), 'test-fixtures/sources.json');
const sources = JSON.parse(readFileSync(sourcesPath, 'utf8')) as Record<string, CropSource>;

describe('extradom crop source fixtures', () => {
  it('downloads plot images referenced by extradom project pages', async () => {
    const fixtureDir = path.join(process.cwd(), 'test-fixtures');
    const publicFixtureDir = path.join(process.cwd(), 'public/test-fixtures');
    mkdirSync(publicFixtureDir, { recursive: true });

    for (const [fileName, source] of Object.entries(sources)) {
      const buffer = await downloadBinary(source.sourceUrl);
      const targetPath = path.join(fixtureDir, fileName);
      writeFileSync(targetPath, buffer);
      copyFileSync(targetPath, path.join(publicFixtureDir, fileName));

      const hash = createHash('sha256').update(buffer).digest('hex');
      expect(buffer.byteLength).toBeGreaterThan(1024);
      expect(hash.length).toBe(64);
    }
  }, 120000);
});
