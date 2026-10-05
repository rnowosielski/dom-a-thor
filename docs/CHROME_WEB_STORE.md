# Chrome Web Store release

Dom-A-Thor is packaged from `dist/` into `dom-a-thor-extension.zip` for upload to the
[Chrome Web Store](https://chrome.google.com/webstore/devconsole).

## Privacy policy URL

Use this URL in the Chrome Web Store listing (both work; prefer the shorter site root after deploy):

- **https://rnowosielski.github.io/dom-a-thor/** (redirects to the policy)
- **https://rnowosielski.github.io/dom-a-thor/privacy-policy.html**

## GitHub Pages (privacy policy)

1. Repository **Settings → Pages**
2. **Build and deployment → Source**: choose **GitHub Actions** (not “Deploy from a branch”)
3. If the first workflow run failed with “Get Pages site failed”, save that setting once, then **Actions → Pages → Re-run all jobs**

The workflow uses `enablement: true` so a later run can register the site after step 2.

## Store listing copy (starter)

**Short description:** Preview house plot size on your land parcel from supported Polish project sites.

**Detailed description:** Dom-A-Thor reads minimum plot dimensions and the plot diagram from supported
architecture catalog pages, then overlays the house footprint on a map. Optionally enter a GUGiK parcel
ID to load your plot boundary from the public ULDK service.

**Category:** Productivity (or Developer Tools)

**Single purpose:** Help users visualize whether a catalog house fits a land parcel.

### Permission justifications (Dashboard)

| Permission / host | Why |
|-----------------|-----|
| `storage` | Remember Land ID and mirror settings locally |
| `scripting` | Inject reader script if the content script is not loaded yet |
| `tabs` | Read the active tab URL and message the content script |
| Catalog hosts | Read plot dimensions and diagram on project pages |
| `wpcdn.pl` / `i.wpimg.pl` | Load full-size plot images from extradom CDNs |
| `uldk.gugik.gov.pl` | Fetch public parcel geometry when you enter a Land ID |

## Versioning

- Source of truth: `src/chrome-extension/version.json`
- `npm run build` syncs `src/chrome-extension/manifest.json` and the popup footer

Release version **must** increase for each store upload (semver `MAJOR.MINOR.PATCH`).

## Local build and zip

```bash
npm ci
npm run test:run
npm run build
npm run package:extension
```

Output: `dom-a-thor-extension.zip` (manifest, popup, content script, icons, assets only).

## Chrome Web Store API secrets

Create [OAuth client](https://console.cloud.google.com/) (Desktop app or as in Chrome Web Store API docs),
link it in the Developer Dashboard, and obtain a **refresh token**.

Add GitHub repository secrets:

| Secret | Description |
|--------|-------------|
| `CHROME_EXTENSION_ID` | From Developer Dashboard after first manual upload |
| `CHROME_CLIENT_ID` | OAuth client ID |
| `CHROME_CLIENT_SECRET` | OAuth client secret |
| `CHROME_REFRESH_TOKEN` | Long-lived refresh token for publish scope |

Optional:

| Variable / secret | Description |
|-------------------|-------------|
| `CHROME_PUBLISH_TARGET` | `default` (production) or `trustedTesters` (default in CI: `default`) |

## Automated release

Push a semver tag:

```bash
git tag v1.0.2
git push origin v1.0.2
```

The **Release** workflow will:

1. Set `version.json` from the tag
2. Run tests and production build
3. Create `dom-a-thor-extension.zip`
4. Upload and publish to the Chrome Web Store (when secrets are configured)
5. Attach the zip to the GitHub Release

First upload must be done **manually** in the Developer Dashboard so Google assigns `CHROME_EXTENSION_ID`.

## Manual upload (first time)

1. `npm run build && npm run package:extension`
2. Developer Dashboard → New item → upload `dom-a-thor-extension.zip`
3. Complete listing, screenshots, privacy policy URL, permission justifications
4. Submit for review
