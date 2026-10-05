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

## Chrome Web Store API (service account)

CI and `npm run publish:chrome` authenticate with a **Google Cloud service account**
linked to your Chrome Web Store publisher (no OAuth refresh token or consent screen).

Official guide: [Use a service account with the Chrome Web Store API](https://developer.chrome.com/docs/webstore/service-accounts).

### One-time setup

1. [Google Cloud Console](https://console.cloud.google.com/) — create or pick a project.
2. Enable [Chrome Web Store API](https://console.cloud.google.com/apis/library/chromewebstore.googleapis.com).
3. **IAM → Service accounts → Create** (no extra IAM roles required for the API key step).
4. Open the service account → **Keys → Add key → JSON** — download the key file once; store it safely.
5. [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole) → **Account** (publisher settings) → add the service account **email** (`…@….iam.gserviceaccount.com`).
   Google allows **one** service account per publisher.

### GitHub repository secrets

| Secret | Description |
|--------|-------------|
| `CHROME_EXTENSION_ID` | e.g. `bklplnceagglphbpbhhnjkogehgidcdg` |
| `CHROME_SERVICE_ACCOUNT_JSON` | Full contents of the downloaded JSON key file |

Keep publishing credentials in GitHub Secrets or the local publishing process
environment, never in source code or extension assets. Local `.env` files, private
keys, and credential JSON files are ignored as a safeguard; the publisher reads
process environment variables and does not load `.env` files itself. Only sanitized
`.env.example` or `.env.*.example` templates should be committed. Never expose
publishing secrets through `VITE_*` variables, which can be bundled into client code.

Optional repository variable:

| Variable | Description |
|----------|-------------|
| `CHROME_PUBLISH_TARGET` | `default` (production) or `trustedTesters` (CI default: `default`) |

### Local publish

```bash
npm run build && npm run package:extension
export CHROME_EXTENSION_ID=bklplnceagglphbpbhhnjkogehgidcdg
export CHROME_SERVICE_ACCOUNT_KEY=/path/to/service-account-key.json
npm run publish:chrome
```

Alternatively set `CHROME_SERVICE_ACCOUNT_JSON` to the raw JSON string (same as the GitHub secret).

Do not commit JSON keys. Rotate the key in Cloud Console if it is ever exposed.

## Automated release

Releases run from **CI on push to `main`** when commits follow [Conventional Commits](https://www.conventionalcommits.org/) (see [CONTRIBUTING.md](../CONTRIBUTING.md)).

On each releasable merge, **semantic-release** will:

1. Choose the next semver (`fix:` → patch, `feat:` → minor, `BREAKING CHANGE` / `feat!:` → major)
2. Update `version.json`, `manifest.json`, and `CHANGELOG.md`
3. Create a Git tag and GitHub Release with `dom-a-thor-extension.zip`
4. Publish to the Chrome Web Store when `CHROME_EXTENSION_ID` and `CHROME_SERVICE_ACCOUNT_JSON` are set

**One-time baseline:** if the extension is already at `1.0.1` in the store but the repo has no release tag yet, tag the current `main` commit once:

```bash
git tag v1.0.1
git push origin v1.0.1
```

The first automatic release after that will bump from `v1.0.1` based on new conventional commits.

First upload must be done **manually** in the Developer Dashboard so Google assigns `CHROME_EXTENSION_ID`.

## Manual upload (first time)

1. `npm run build && npm run package:extension`
2. Developer Dashboard → New item → upload `dom-a-thor-extension.zip`
3. Complete listing, screenshots, privacy policy URL, permission justifications
4. Submit for review
