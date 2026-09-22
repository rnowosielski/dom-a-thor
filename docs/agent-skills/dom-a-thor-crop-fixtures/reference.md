# Dom-A-Thor Crop Reference

## Key files

```
test-fixtures/
  sources.json              # extradom page + wpcdn source URLs
  {project}-plot.png        # downloaded source diagram
  expected/
    {project}-crop.png      # golden crop output
    {project}-crop.json     # width, height, aspect metadata
  user-reports/             # optional user screenshots

src/utils/imageProcessor.ts # crop pipeline
src/App.tsx                 # extension popup crop + validation
src/chrome-extension/
  plotImageCapture.js       # extradom image capture (tests import this)
  content-listener.js       # chrome message handler
scripts/
  download-crop-sources.test.ts
  generate-crop-references.test.ts
  build-content-script.mjs  # emits dist/content.js
```

## Current fixtures

| Project | cropMethod | Meters | Good crop (approx) | Source size (approx) |
|---------|------------|--------|--------------------|----------------------|
| Willa Optima 1 | stipple | 19.77 × 23.05 | 341 × 397 | 438 × 442 PNG |
| HomeKoncept 140 | greenFrame | 20.8 × 27.3 | 606 × 796 | 915 × 1028 JPG |
| Kubiczny D30 | plainPlot | 20.65 × 26.24 | 598 × 760 | 1559 × 2155 JPG |

## Known wrong source URLs

### Willa Optima

- **Wrong:** `.../666016/...` — floor plan (Parter), not działka
- **Right:** `.../666007/090413eded...png` — stipple plot with 19,77 × 23,05

### HomeKoncept 140

- **Wrong:** `.../683453/...` — house exterior photo (2133×1200)
- **Right:** `.../683450/e047c428...jpg` — green-frame plot diagram

## Broken crop signatures

| Symptom | Likely cause |
|---------|----------------|
| ~724×950 with bottom labels 150/1530/400 | Green-frame trim skipped; aspect-only path |
| ~227×265 house only (Willa) | Over-trimmed stipple / wrong source |
| Large top white band (HomeKoncept) | Top margin trim skipped |
| ~217×281 in extension footer | Lazy-load thumbnail captured before full image |
| `Plot crop unavailable` on Willa | App min crop width too high (valid ~341px) |
| ~530×673 with terrace/stairs cut off (Kubiczny) | Plain gray plot sent through green-frame trim pipeline |
| Tests pass, extension broken | Stale dist, unreloaded tab, or content script not injected |

## cropQualityExpectations guide

Set bounds from the **good** reference crop, not the broken one:

- `maxTopWhiteRatio`: 0.5 for green frame; higher for stipple
- `maxBottomAnnotationBandRows`: 0 when bottom dimension strip must be removed
- `minWidth` / `minHeight`: slightly below good crop dimensions
- `maxWidth`: slightly above good crop; catches untrimmed green-frame (~724px)

## imageProcessor pipeline summary

```
processPlotImageForOverlay
  → getChosenCropMethodName / cropToInnerRectangle
  → detect green lawn side columns on inner crop
  → if stipple && !greenFrame && width ≤ 680: enforceMeterAspect → return
  → if !greenFrame: applyPlainPlotTrimPipeline (aspect → trim → optional aspect)
  → else: applyGreenFrameTrimPipeline (trim → aspect → trim loops)
```

`trimAnnotationMarginsFromCrop` uses `{ forceMarginTrim: true }` so top/bottom margin trim runs even when green side columns are not detected.

## Extension reload procedure

```bash
npm run build
```

1. Chrome → Extensions → refresh Dom-A-Thor (loaded from `dist/`)
2. Reload extradom project tab (F5)
3. Close popup completely, reopen
4. Confirm footer: `v1.0.1 · src … · crop …`

## Adding a third project (example flow)

User: "Project X on extradom has extra left margin."

1. Open page, find działka `data-src` wpcdn URL and meter params
2. Add to `sources.json` with guessed `cropMethod` from visual style
3. `npm run crop:sources && npm run crop:references`
4. Inspect `test-fixtures/expected/project-x-crop.png` — if wrong, fix source URL or pipeline before committing bounds
5. Add row to `cropFixtures` array + `cropQualityExpectations`
6. Run full `npm run test:run`
7. Verify extension footer on live page
