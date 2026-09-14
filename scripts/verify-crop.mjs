#!/usr/bin/env node

const devServerUrl = process.env.CROP_VERIFY_URL ?? 'http://127.0.0.1:5174';
const pageUrl = `${devServerUrl}/crop-verify.html?autotest=1`;

async function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function loadPage(url) {
  if (typeof fetch !== 'function') {
    throw new Error('fetch is unavailable in this Node runtime');
  }

  const response = await fetch(url, { redirect: 'follow' });
  if (!response.ok) {
    throw new Error(`Failed to load ${url}: ${response.status}`);
  }
}

async function readResult(baseUrl) {
  const response = await fetch(`${baseUrl}/__crop_verify_result`);
  if (!response.ok) {
    throw new Error(`Failed to read crop verify result: ${response.status}`);
  }

  const text = await response.text();
  if (!text || text === '{}') {
    return null;
  }

  return JSON.parse(text);
}

async function main() {
  console.log(`Open this page in a browser while dev server is running:\n  ${pageUrl}\n`);
  console.log(`Then POST results are available at:\n  ${devServerUrl}/__crop_verify_result\n`);

  try {
    await loadPage(pageUrl);
  } catch (error) {
    console.error('Dev server is not reachable. Start it with: npm run dev');
    console.error(String(error));
    process.exit(1);
  }

  let result = null;
  for (let attempt = 0; attempt < 20; attempt++) {
    result = await readResult(devServerUrl);
    if (result?.result?.width) {
      break;
    }
    await wait(500);
  }

  if (!result?.result?.width) {
    console.error('No crop verification result found.');
    console.error('Load the page in a browser once, then rerun: npm run verify:crop');
    process.exit(1);
  }

  console.log(result.log ?? '');
  console.log(`\nallPass: ${result.allPass}`);
  console.log(`crop: ${result.result.width}x${result.result.height}`);

  process.exit(result.allPass ? 0 : 1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
