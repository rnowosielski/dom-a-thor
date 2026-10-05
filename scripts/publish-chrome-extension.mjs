#!/usr/bin/env node

import { createReadStream, existsSync, readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const rootDir = path.dirname(fileURLToPath(import.meta.url));
const zipPath = path.join(rootDir, '../dom-a-thor-extension.zip');

const extensionId = process.env.CHROME_EXTENSION_ID;
const clientId = process.env.CHROME_CLIENT_ID;
const clientSecret = process.env.CHROME_CLIENT_SECRET;
const refreshToken = process.env.CHROME_REFRESH_TOKEN;
const publishTarget = process.env.CHROME_PUBLISH_TARGET ?? 'default';

const missing = [
  ['CHROME_EXTENSION_ID', extensionId],
  ['CHROME_CLIENT_ID', clientId],
  ['CHROME_CLIENT_SECRET', clientSecret],
  ['CHROME_REFRESH_TOKEN', refreshToken],
].filter(([, value]) => !value);

if (missing.length > 0) {
  throw new Error(
    `Missing Chrome Web Store secrets: ${missing.map(([name]) => name).join(', ')}`
  );
}

if (!existsSync(zipPath)) {
  throw new Error('dom-a-thor-extension.zip not found. Run npm run package:extension first.');
}

const getAccessToken = async () => {
  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
    grant_type: 'refresh_token',
  });

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });

  if (!response.ok) {
    throw new Error(`OAuth token request failed: ${response.status} ${await response.text()}`);
  }

  const payload = await response.json();
  if (!payload.access_token) {
    throw new Error('OAuth response did not include access_token');
  }

  return payload.access_token;
};

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

const accessToken = await getAccessToken();
const uploadResult = await uploadZip(accessToken);
console.log('Upload result:', uploadResult);

const publishResult = await publishItem(accessToken);
console.log('Publish result:', publishResult);
