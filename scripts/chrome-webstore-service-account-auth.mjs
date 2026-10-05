#!/usr/bin/env node

import { createSign } from 'node:crypto';
import { readFileSync } from 'node:fs';

const CHROME_WEBSTORE_SCOPE = 'https://www.googleapis.com/auth/chromewebstore';
const GOOGLE_TOKEN_AUDIENCE = 'https://oauth2.googleapis.com/token';

const base64UrlEncode = (value) => Buffer.from(value, 'utf8').toString('base64url');

/**
 * @param {Record<string, unknown>} header
 * @param {Record<string, unknown>} payload
 * @param {string} privateKeyPem
 */
const signServiceAccountJwt = (header, payload, privateKeyPem) => {
  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signingInput = `${encodedHeader}.${encodedPayload}`;
  const signature = createSign('RSA-SHA256').update(signingInput).sign(privateKeyPem, 'base64url');
  return `${signingInput}.${signature}`;
};

/**
 * @returns {{ client_email: string, private_key: string }}
 */
export const loadChromeWebStoreServiceAccount = () => {
  const inlineJson = process.env.CHROME_SERVICE_ACCOUNT_JSON?.trim();
  if (inlineJson) {
    return parseServiceAccountJson(inlineJson);
  }

  const keyPath =
    process.env.CHROME_SERVICE_ACCOUNT_KEY?.trim() ??
    process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim();

  if (keyPath) {
    return parseServiceAccountJson(readFileSync(keyPath, 'utf8'));
  }

  throw new Error(
    'Missing service account credentials. Set CHROME_SERVICE_ACCOUNT_JSON or CHROME_SERVICE_ACCOUNT_KEY.'
  );
};

/**
 * @param {string} jsonText
 */
const parseServiceAccountJson = (jsonText) => {
  let parsed;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    throw new Error('Service account JSON is not valid JSON');
  }

  const clientEmail = parsed.client_email;
  const privateKey = parsed.private_key;

  if (typeof clientEmail !== 'string' || !clientEmail.includes('@')) {
    throw new Error('Service account JSON must include client_email');
  }

  if (typeof privateKey !== 'string' || !privateKey.includes('BEGIN PRIVATE KEY')) {
    throw new Error('Service account JSON must include private_key');
  }

  return { client_email: clientEmail, private_key: privateKey };
};

export const getChromeWebStoreAccessToken = async () => {
  const { client_email, private_key } = loadChromeWebStoreServiceAccount();
  const issuedAt = Math.floor(Date.now() / 1000);
  const assertion = signServiceAccountJwt(
    { alg: 'RS256', typ: 'JWT' },
    {
      iss: client_email,
      sub: client_email,
      aud: GOOGLE_TOKEN_AUDIENCE,
      iat: issuedAt,
      exp: issuedAt + 3600,
      scope: CHROME_WEBSTORE_SCOPE,
    },
    private_key
  );

  const body = new URLSearchParams({
    grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
    assertion,
  });

  const response = await fetch(GOOGLE_TOKEN_AUDIENCE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });

  if (!response.ok) {
    throw new Error(`Service account token request failed: ${response.status} ${await response.text()}`);
  }

  const payload = await response.json();
  if (!payload.access_token) {
    throw new Error('Service account token response did not include access_token');
  }

  return payload.access_token;
};
