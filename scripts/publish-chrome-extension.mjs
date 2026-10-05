#!/usr/bin/env node

import { existsSync, readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getChromeWebStoreAccessToken } from './chrome-webstore-service-account-auth.mjs';

const rootDir = path.dirname(fileURLToPath(import.meta.url));
const zipPath = path.join(rootDir, '../dom-a-thor-extension.zip');

const extensionId = process.env.CHROME_EXTENSION_ID;
const serviceAccountJson = process.env.CHROME_SERVICE_ACCOUNT_JSON?.trim();
const publishTarget = process.env.CHROME_PUBLISH_TARGET ?? 'default';

const missingStoreSecrets = [
  ['CHROME_EXTENSION_ID', extensionId],
  ['CHROME_SERVICE_ACCOUNT_JSON', serviceAccountJson],
].filter(([, value]) => !value);

if (missingStoreSecrets.length > 0) {
  console.log(
    `Chrome Web Store publish skipped (missing ${missingStoreSecrets.map(([name]) => name).join(', ')}).`
  );
  process.exit(0);
}

if (!existsSync(zipPath)) {
  throw new Error('dom-a-thor-extension.zip not found. Run npm run package:extension first.');
}

const uploadZip = async (accessToken) => {
  const zipBuffer = readFileSync(zipPath);
  const response = await fetch(
    `https://www.googleapis.com/upload/chromewebstore/v1.1/items/${extensionId}`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/zip',
        'x-goog-api-version': '2',
      },
      body: zipBuffer,
    }
  );

  const text = await response.text();
  if (!response.ok) {
    throw new Error(`Chrome Web Store upload failed: ${response.status} ${text}`);
  }

  return text ? JSON.parse(text) : {};
};

const publishItem = async (accessToken) => {
  const url = new URL(
    `https://www.googleapis.com/chromewebstore/v1.1/items/${extensionId}/publish`
  );
  url.searchParams.set('publishTarget', publishTarget);

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Length': '0',
    },
  });

  const text = await response.text();
  if (!response.ok) {
    throw new Error(`Chrome Web Store publish failed: ${response.status} ${text}`);
  }

  return text ? JSON.parse(text) : {};
};

const accessToken = await getChromeWebStoreAccessToken();
const uploadResult = await uploadZip(accessToken);
console.log('Upload result:', uploadResult);

const publishResult = await publishItem(accessToken);
console.log('Publish result:', publishResult);
