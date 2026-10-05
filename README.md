# Dom-A-Thor 🏠🗺️

A Chrome extension and web application for visualizing house placement on land plots using interactive maps. Dom-A-Thor helps users understand how a house would fit on a specific land plot by fetching land data from Polish land registry and overlaying house dimensions on satellite imagery.

## Features

- **Interactive Map Visualization**: View land plots on high-resolution satellite imagery
- **Chrome Extension**: Automatically extracts land dimensions from Polish real estate websites (extradom.pl, archon.pl)
- **Land Data Integration**: Fetches official land plot data from Polish land registry (GUGiK)
- **House Placement**: Visualize house dimensions on the actual land plot
- **Drag & Drop**: Interactive house positioning with rotation and mirroring capabilities
- **Real-time Updates**: Automatic dimension extraction from supported websites

## Tech Stack

- **Frontend**: React 19 + TypeScript + Vite
- **Maps**: Leaflet + React-Leaflet
- **Chrome Extension**: Manifest V3
- **Testing**: Vitest + Testing Library
- **Linting**: ESLint + TypeScript ESLint
- **Build**: Vite with static file copying for extension

## Development Setup

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Chrome browser (for extension testing)

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd dom-a-thor-cursor

# Install dependencies
npm install

# Start development server
npm run dev
```

## Available Scripts

### Development Commands

```bash
# Start development server with hot reload
npm run dev

# Preview production build locally
npm run preview
```

### Building Commands

```bash
# Build for production (creates dist/ folder)
npm run build

# Type checking
npm run lint
```

### Testing Commands

```bash
# Run tests in watch mode
npm test

# Run tests once
npm run test:run

# Run tests with UI interface
npm run test:ui

# Generate test coverage report
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

## Chrome Extension Usage

### Building the Extension

1. **Build the project**:
   ```bash
   npm run build
   ```

2. **Extension files are automatically copied** to the `dist/` folder:
   - `content.js` - Content script for website interaction
   - `manifest.json` - Extension configuration
   - `icon.png` - Extension icon
   - `index.html` - Extension popup

### Installing in Chrome

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top right)
3. Click "Load unpacked"
4. Select the `dist/` folder from your project
5. The extension should now appear in your extensions list

### Using the Extension

1. **Navigate to supported websites**:
   - Visit `extradom.pl` or `archon.pl`
   - Browse to any property listing

2. **Open the extension**:
   - Click the Dom-A-Thor icon in your Chrome toolbar
   - The extension will automatically extract land dimensions

3. **View the visualization**:
   - Enter a land ID (from Polish land registry)
   - The map will show the land plot with house overlay
   - Use controls to adjust house position and orientation

## Supported Websites

Currently supports:
- **extradom.pl** - Extracts land dimensions from property listings
- **archon.pl** - Extracts land dimensions from property listings

### Adding New Websites

To extend support to other real estate portals:

1. **Update manifest.json**:
   ```json
   {
     "host_permissions": [
       "https://www.extradom.pl/*",
       "https://www.archon.pl/*",
       "https://new-website.com/*"
     ],
     "content_scripts": [
       {
         "matches": [
           "https://www.extradom.pl/*",
           "https://www.archon.pl/*",
           "https://new-website.com/*"
         ]
       }
     ]
   }
   ```

2. **Add extraction function** in `src/chrome-extension/content.js`:
   ```javascript
   function fetchLandDetailsFromNewWebsite() {
     // Implement DOM parsing logic
     // Return JSON with width, height, and imageUrl
   }
   ```

3. **Update message listener**:
   ```javascript
   chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
     if (request.action === "getLandDetails") {
       if (window.location.hostname.includes('new-website.com')) {
         const data = fetchLandDetailsFromNewWebsite();
         sendResponse({ data });
       }
       // ... existing handlers
     }
   });
   ```

## Project Structure

```
src/
├── components/           # React components
│   ├── DomAThor.tsx     # Main map component
│   ├── DraggablePolygon.tsx  # Interactive house overlay
│   ├── DynamicCenter.tsx     # Map center management
│   └── DebugControls.tsx     # Development controls
├── chrome-extension/     # Chrome extension files
│   ├── content.js       # Content script
│   ├── manifest.json    # Extension manifest
│   └── icon.png         # Extension icon
├── hooks/               # Custom React hooks
│   ├── useChromeExtension.ts  # Chrome extension integration
│   └── useLocalStorage.ts     # Local storage management
├── utils/               # Utility functions
│   ├── coordinateUtils.ts     # Coordinate transformations
│   ├── leafletUtils.ts        # Leaflet map utilities
│   └── imageProcessor.ts      # Image processing
└── types/               # TypeScript type definitions
    └── leaflet.ts       # Leaflet-related types
```

## Development Practices

### Code Quality

- **TypeScript**: Strict type checking enabled
- **ESLint**: Configured with React and TypeScript rules
- **Testing**: Comprehensive test coverage with Vitest
- **Pre-commit**: Consider adding pre-commit hooks for linting

### Testing Strategy

- **Unit Tests**: Component and utility function testing
- **Integration Tests**: Chrome extension functionality
- **Coverage**: Aim for >80% test coverage
- **Mocking**: Proper mocking of external APIs and Chrome APIs

### Performance Considerations

- **Bundle Size**: Monitor bundle size with `npm run build`
- **Map Performance**: Optimize map rendering for large datasets
- **Extension Size**: Keep extension lightweight for fast loading

## API Integration

### Polish Land Registry (GUGiK)

The application integrates with the Polish land registry API:

```typescript
// Example API call
const response = await fetch(
  `https://uldk.gugik.gov.pl/?request=GetParcelById&id=${landIdentifier}&result=geom_wkt`
);
```

### Map Services

- **Satellite Imagery**: Esri World Imagery service
- **Coordinate System**: EPSG:2180 (Polish coordinate system) to WGS84 conversion

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/new-feature`
3. Make your changes
4. Run tests: `npm run test:run`
5. Check linting: `npm run lint`
6. Commit your changes: `git commit -m 'Add new feature'`
7. Push to the branch: `git push origin feature/new-feature`
8. Submit a pull request

## License

Dom-A-Thor is released under the [Dom-A-Thor License 1.0](LICENSE).

You may use, modify, and share it freely as part of a project under an [OSI-approved open source license](https://opensource.org/licenses).

Any commercial or other for-profit use (direct or indirect) requires a separate agreement with the copyright holder — see [LICENSE](LICENSE) or contact [rnowosielski on GitHub](https://github.com/rnowosielski).

## Support

For issues and questions:
- Create an issue in the repository
- Check existing issues for solutions
- Review the test files for usage examples