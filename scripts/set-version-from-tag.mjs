#!/usr/bin/env node

import { readFileSync, writeFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const tag = process.argv[2];
if (!tag) {
  throw new Error('Usage: node scripts/set-version-from-tag.mjs v1.2.3');
}

const match = tag.match(/^v(\d+\.\d+\.\d+)$/);
if (!match) {
  throw new Error(`Tag must look like v1.2.3, received: ${tag}`);
}

const version = match[1];
const rootDir = path.dirname(fileURLToPath(import.meta.url));
const versionPath = path.join(rootDir, '../src/chrome-extension/version.json');

writeFileSync(versionPath, `${JSON.stringify({ version }, null, 2)}\n`);
