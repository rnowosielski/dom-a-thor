# Dom-A-Thor Crop Fixtures

Agent-agnostic project skill. Tool-specific entry points:

- Cursor: `.cursor/skills/dom-a-thor-crop-fixtures/SKILL.md`
- Any agent: `AGENTS.md` and `CLAUDE.md` in repo root

## Goal

Keep plot overlay crops correct for extradom project pages. Every new odd project the user reports should become a **source fixture + expected crop reference + regression checks**, without breaking existing diagram types.

## Diagram types (do not mix pipelines)

| Type | Visual | Crop method | Pipeline | Example |
|------|--------|-------------|----------|---------|
| Stipple plot | Dotted hatch border, blue dimension text | `stipple` | `enforceMeterAspect` only; skip green-frame trim if width ≤ 680 | Willa Optima (~341×397) |
| Green frame | Green lawn sides, bottom/top labels | `greenFrame` | Full trim pipeline; reject top white + bottom labels | HomeKoncept 140 (~606×796) |

Fixing one type often breaks the other. After any crop change, run the **full** suite, not a single fixture.

## Wrong-image checklist (check before coding)

On extradom, confirm the source is the **działka plot diagram**, not:

- floor plan / `Parter` interior layout
- house exterior render
- gallery thumbnail or lazy-load placeholder

Prefer `.location__image img[data-name="dzialka"]`. Verify `sourceUrl` in `test-fixtures/sources.json` matches the full-size wpcdn asset (typically 400+ px wide).

Known bad vs good patterns are in [reference.md](reference.md).

## Add a new project fixture

Copy this checklist and complete every item:

```
- [ ] Identify extradom page URL and meter dimensions from "Min. szer. i dł. działki"
- [ ] Confirm działka image URL (full wpcdn, not thumbnail)
- [ ] Add entry to test-fixtures/sources.json
- [ ] npm run crop:sources
- [ ] Copy plot file to public/test-fixtures/ if used by crop-verify.html
- [ ] Add fixture to scripts/generate-crop-references.test.ts
- [ ] Add fixture to src/utils/__tests__/cropFixtures.integration.test.ts
- [ ] npm run crop:references
- [ ] Set cropQualityExpectations (semantic bounds, not only pixels)
- [ ] npm run test:run
- [ ] npm run build and verify extension footer shows src + crop sizes
```

### sources.json entry template

```json
"project-slug-plot.png": {
  "pageUrl": "https://www.extradom.pl/projekt-domu-...",
  "sourceUrl": "https://wpcdn.pl/extradom/designs/...",
  "locationImageSelector": ".location__image img[data-name=\"dzialka\"], .location__image img",
  "meterWidth": 0,
  "meterHeight": 0,
  "cropMethod": "stipple|greenFrame"
}
```

Naming: `{project-slug}-plot.png` in `test-fixtures/`, expected `{project-slug}-crop.png` + `.json` in `test-fixtures/expected/`.

## Regression tests to extend

| File | Purpose |
|------|---------|
| `src/utils/__tests__/cropFixtures.integration.test.ts` | Pixel match + semantic quality (top white, bottom labels, size bounds) |
| `src/utils/__tests__/cropReferenceFixtures.test.ts` | Expected metadata sanity |
| `src/utils/__tests__/extensionPath.test.ts` | PNG canvas path like the extension content script |
| `src/utils/__tests__/labelDetect.test.ts` | HomeKoncept bottom-label regression |
| `src/chrome-extension/__tests__/content.simple.test.js` | Lazy-load / minimum capture size |

### Semantic checks (required)

Pixels alone are not enough. Always assert:

- `topWhiteRatio` ≤ threshold (green frame: ~0.5; stipple: higher OK)
- `bottomAnnotationBandRows` === 0 for green-frame projects with bottom numeric labels
- `minWidth` / `minHeight` / `maxWidth` aligned with good crop (stipple crops are **narrower** than green-frame)

### App.tsx crop acceptance

Extension rejects crops below **320×360**. Stipple projects (~341 wide) must stay above that minimum but **below** the old 400px width gate.

## Commands

```bash
npm run crop:sources      # download sources from sources.json
npm run crop:references   # download + regenerate test-fixtures/expected/*
npm run test:run          # crop integration tests run first
npm run build             # bundles popup + dist/content.js
```

## Extension vs tests mismatch

If tests pass but the extension looks wrong:

1. Footer must show `v1.0.1 · src W×H · crop W×H`
2. `src` ~217×281 → lazy-load thumbnail captured; fix `plotImageCapture.js` / reload tab
3. `Could not establish connection` → reload extradom tab after extension refresh; content script injects on retry
4. Crop OK in tests but labels in UI → old dist loaded; rebuild and refresh extension from `dist/`
5. Compare `processPlotImageForOverlay` output to `test-fixtures/expected/` visually

## Crop logic touch points

- `src/utils/imageProcessor.ts` — `processPlotImageForOverlay`, trim pipeline, method detection
- `src/App.tsx` — crop source selection, minimum crop size, footer debug label
- `src/chrome-extension/plotImageCapture.js` — wait for full image load, min 400px source
- `scripts/build-content-script.mjs` — bundles content script for Chrome (no ES modules)

## When user sends a broken screenshot

1. Read footer `src` and `crop` dimensions if visible
2. Classify diagram type (stipple vs green frame)
3. Compare to expected reference or regenerate if source image was wrong
4. Add or tighten fixture rather than one-off extension hacks
5. Save user report under `test-fixtures/user-reports/` if useful for regression

## Additional resources

- File map, thresholds, and known URL mistakes: [reference.md](reference.md)
