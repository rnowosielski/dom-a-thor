/** @type {import('semantic-release').GlobalConfig} */
export default {
  branches: ['main'],
  tagFormat: 'v${version}',
  plugins: [
    '@semantic-release/commit-analyzer',
    '@semantic-release/release-notes-generator',
    '@semantic-release/changelog',
    [
      '@semantic-release/exec',
      {
        prepareCmd:
          'node scripts/set-extension-version.mjs ${nextRelease.version} && node scripts/sync-extension-version.mjs && npm run build && npm run package:extension',
      },
    ],
    [
      '@semantic-release/git',
      {
        assets: [
          'CHANGELOG.md',
          'package.json',
          'src/chrome-extension/version.json',
          'src/chrome-extension/manifest.json',
        ],
        message: 'chore(release): ${nextRelease.version} [skip ci]\n\n${nextRelease.notes}',
      },
    ],
    [
      '@semantic-release/github',
      {
        assets: [{ path: 'dom-a-thor-extension.zip', label: 'Chrome extension (zip)' }],
      },
    ],
    [
      '@semantic-release/exec',
      {
        publishCmd: 'node scripts/publish-chrome-extension.mjs',
      },
    ],
  ],
};
