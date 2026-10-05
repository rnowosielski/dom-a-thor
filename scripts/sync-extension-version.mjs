#!/usr/bin/env node

import { readFileSync, writeFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const rootDir = path.dirname(fileURLToPath(import.meta.url));
const extensionDir = path.join(rootDir, '../src/chrome-extension');
const versionPath = path.join(extensionDir, 'version.json');
const manifestPath = path.join(extensionDir, 'manifest.json');

const { version } = JSON.parse(readFileSync(versionPath, 'utf8'));
if (!/^\d+\.\d+\.\d+$/.test(version)) {
  throw new Error(`Invalid extension version in version.json: ${version}`);
}

const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
manifest.version = version;
writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
