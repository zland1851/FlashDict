# ODH Extension Automated Tests

This directory contains automated tests for the ODH Chrome extension.

## Test Structure

```
tests/
├── unit/           # Unit tests for individual functions
├── e2e/            # End-to-end tests for extension features
└── helpers/        # Test utilities and helpers
```

## Running Tests

### Install Dependencies

```bash
npm install
```

### Run All Tests

```bash
npm test
```

### Run Unit Tests Only

```bash
npm run test:unit
```

### Run E2E Tests Only

```bash
npm run test:e2e
```

**Note**: E2E tests require Chrome browser and may have issues on macOS. If E2E tests fail due to browser launch issues, you can still run unit tests which don't require a browser.

### Run Tests in Watch Mode

```bash
npm run test:watch
```

### Generate Coverage Report

```bash
npm run test:coverage
```

## Test Categories

### Unit Tests (`tests/unit/`)

- Test individual utility functions
- Test helper modules
- Fast execution, no browser required
- ✅ Currently passing

### E2E Tests (`tests/e2e/`)

- Test extension loading
- Test popup functionality
- Test options page
- Test dictionary functionality
- Test text selection
- Requires Chrome browser
- ⚠️ May have issues on macOS due to browser launch restrictions

## Troubleshooting

### E2E Tests Failing on macOS

If E2E tests fail with browser launch errors on macOS, this is often due to:

1. **macOS Security Settings**: Chrome may be blocked by macOS security
2. **Puppeteer Version**: Older Puppeteer versions may have compatibility issues
3. **System Permissions**: May need to grant terminal/IDE permissions to run Chrome

**Solutions**:
- Run unit tests only: `npm run test:unit` (these don't require a browser)
- Test manually in Chrome browser
- Use CI/CD environment (GitHub Actions, etc.) for automated E2E testing

### Browser Launch Errors

If you see errors like "Failed to launch the browser process", try:

1. Update Puppeteer: `npm update puppeteer`
2. Check Chrome installation
3. Run with verbose logging to see detailed errors

## Writing New Tests

### Unit Test Example

```javascript
describe('MyFunction', () => {
    test('should do something', () => {
        expect(myFunction()).toBe(expectedValue);
    });
});
```

### E2E Test Example

```javascript
describe('Feature', () => {
    let browser;
    let page;

    beforeAll(async () => {
        browser = await puppeteer.launch({...});
        page = await browser.newPage();
    });

    afterAll(async () => {
        await browser.close();
    });

    test('should work', async () => {
        await page.goto('https://example.com');
        // Test something
    });
});
```

## Test Helpers

### Extension Loader (`helpers/extension-loader.js`)

- `getExtensionPath()` - Get extension directory path
- `loadExtension(browser)` - Load extension in Puppeteer
- `getPopupUrl(extensionId)` - Get popup page URL
- `getOptionsUrl(extensionId)` - Get options page URL

### Test Utils (`helpers/test-utils.js`)

- `waitFor(condition, timeout)` - Wait for condition
- `getConsoleErrors(page)` - Get console errors
- `clearStorage(page)` - Clear browser storage
- `setExtensionOptions(page, options)` - Set extension options
- `simulateTextSelection(page, selector, start, end)` - Simulate text selection

## Notes

- E2E tests require Chrome browser (installed via Puppeteer)
- Tests run in non-headless mode to support extensions
- Some tests may require network access
- AnkiConnect tests require Anki to be running (optional)
- Unit tests are platform-independent and should work everywhere

## Dependencies

- **Puppeteer**: v24.35.0 (latest, updated from v21.0.0)
  - Removed `puppeteer-core` (not needed, Puppeteer includes it)
  - Updated to resolve deprecated dependency warnings
- **Jest**: v29.7.0
- **Node.js**: Requires Node.js 18+ (Puppeteer requirement)
