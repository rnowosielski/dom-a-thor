#!/usr/bin/env node

import { existsSync, rmSync } from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';

const rootDir = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.join(rootDir, '../dist');
const outputPath = path.join(rootDir, '../dom-a-thor-extension.zip');

if (!existsSync(distDir)) {
  throw new Error('dist/ not found. Run npm run build first.');
}

for (const required of ['manifest.json', 'index.html', 'content.js']) {
  if (!existsSync(path.join(distDir, required))) {
    throw new Error(`dist/${required} is missing.`);
  }
}

if (existsSync(outputPath)) {
  rmSync(outputPath);
}

const zipEntries = ['manifest.json', 'index.html', 'content.js'];
if (existsSync(path.join(distDir, 'assets'))) {
  zipEntries.push('assets');
}
if (existsSync(path.join(distDir, 'icons'))) {
  zipEntries.push('icons');
}

const result = spawnSync('zip', ['-r', outputPath, ...zipEntries], {
  cwd: distDir,
  stdio: 'inherit',
});

if (result.status !== 0) {
  throw new Error('zip command failed');
}

console.log(`Wrote ${outputPath}`);
