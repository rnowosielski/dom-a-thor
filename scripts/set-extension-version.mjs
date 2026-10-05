#!/usr/bin/env node

import { readFileSync, writeFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const rawVersion = process.argv[2];
if (!rawVersion) {
  throw new Error('Usage: node scripts/set-extension-version.mjs 1.2.3');
}

const match = String(rawVersion).match(/^v?(\d+\.\d+\.\d+)$/);
if (!match) {
  throw new Error(`Version must look like 1.2.3 or v1.2.3, received: ${rawVersion}`);
}

const version = match[1];
const rootDir = path.dirname(fileURLToPath(import.meta.url));
const versionPath = path.join(rootDir, '../src/chrome-extension/version.json');

writeFileSync(versionPath, `${JSON.stringify({ version }, null, 2)}\n`);

const packagePath = path.join(rootDir, '../package.json');
const packageJson = JSON.parse(readFileSync(packagePath, 'utf8'));
packageJson.version = version;
writeFileSync(packagePath, `${JSON.stringify(packageJson, null, 2)}\n`);
