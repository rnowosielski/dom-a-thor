#!/usr/bin/env node

import { mkdirSync, readFileSync, writeFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createCanvas, loadImage } from '@napi-rs/canvas';

const rootDir = path.dirname(fileURLToPath(import.meta.url));
const extensionDir = path.join(rootDir, '../src/chrome-extension');
const sourcePath = path.join(extensionDir, 'icon.png');
const iconsDir = path.join(extensionDir, 'icons');

const sizes = [16, 48, 128];

mkdirSync(iconsDir, { recursive: true });

const sourceBuffer = readFileSync(sourcePath);
const sourceImage = await loadImage(sourceBuffer);

for (const size of sizes) {
  const canvas = createCanvas(size, size);
  const context = canvas.getContext('2d');
  context.drawImage(sourceImage, 0, 0, size, size);
  writeFileSync(path.join(iconsDir, `icon-${size}.png`), canvas.toBuffer('image/png'));
}
