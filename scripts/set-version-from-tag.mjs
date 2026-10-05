#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const tag = process.argv[2];
if (!tag) {
  throw new Error('Usage: node scripts/set-version-from-tag.mjs v1.2.3');
}

const scriptPath = path.join(path.dirname(fileURLToPath(import.meta.url)), 'set-extension-version.mjs');
const result = spawnSync(process.execPath, [scriptPath, tag], { stdio: 'inherit' });

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}
