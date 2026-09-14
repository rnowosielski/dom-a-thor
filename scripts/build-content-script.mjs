import { readFileSync, writeFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const rootDir = path.dirname(fileURLToPath(import.meta.url));
const extensionDir = path.join(rootDir, '../src/chrome-extension');
const distContentPath = path.join(rootDir, '../dist/content.js');

const stripModuleSyntax = (source) =>
  source
    .replace(/^export async function /gm, 'async function ')
    .replace(/^export function /gm, 'function ')
    .replace(/^export const /gm, 'const ')
    .replace(/^export \{[^}]+\};?\s*$/gm, '');

const captureSource = stripModuleSyntax(
  readFileSync(path.join(extensionDir, 'plotImageCapture.js'), 'utf8')
);
const listenerSource = readFileSync(path.join(extensionDir, 'content-listener.js'), 'utf8');

writeFileSync(distContentPath, `${captureSource}\n${listenerSource}\n`);
