# Manifest V3 Compliance Check

## Current Status: ✅ Compliant with Manifest V3

Based on the [Chrome Extension Manifest documentation](https://developer.chrome.com/docs/extensions/reference/manifest), the current `manifest.json` is properly configured for Manifest V3.

## Manifest Fields Verification

### ✅ Required Fields
- `manifest_version: 3` - Correct
- `name: "__MSG_appName__"` - Correct (using i18n)
- `version: "1.0.7"` - Correct

### ✅ Chrome Web Store Required
- `description: "__MSG_appDesc__"` - Correct (using i18n)
- `icons` - Correct (16, 48, 128 sizes)

### ✅ Manifest V3 Specific Changes
- `action` (replaced `browser_action`) - ✅ Correct
- `background.service_worker` (replaced `background.page`) - ✅ Correct
- `host_permissions` (separated from `permissions`) - ✅ Correct
- `web_accessible_resources` with `matches` field - ✅ Correct

### ✅ Permissions
- `permissions: ["webRequest", "storage"]` - ✅ Correct
  - `webRequest` API is still available in Manifest V3
  - `blocking` option is supported (no separate `webRequestBlocking` permission needed)
  - `extraHeaders` option is supported with proper `host_permissions`
- `host_permissions: ["https://ankiweb.net/*", "https://ankiuser.net/*"]` - ✅ Correct

### ✅ Other Fields
- `content_scripts` - ✅ Correct
- `sandbox` - ✅ Correct (still supported in V3)
- `options_ui` - ✅ Correct
- `commands` - ✅ Correct
- `minimum_chrome_version: "88.0.0.0"` - ✅ Correct (first version with full V3 support)

## Known Issues & Notes

### webRequest API Usage
The extension uses `chrome.webRequest.onBeforeSendHeaders` with:
- `blocking` option - ✅ Supported in Manifest V3
- `extraHeaders` option - ✅ Supported in Manifest V3 (requires `host_permissions`)

**Current implementation in `ankiweb.js`:**
```javascript
chrome.webRequest.onBeforeSendHeaders.addListener(
    this.rewriteHeader,
    { urls: ['https://ankiweb.net/account/login', 'https://ankiuser.net/edit/save'] },
    ['requestHeaders', 'blocking', 'extraHeaders']
);
```

This is **correct** for Manifest V3 as long as:
1. ✅ `webRequest` permission is declared
2. ✅ `host_permissions` includes the target URLs
3. ✅ Both conditions are met in the current manifest

## Service Worker Implementation

### ✅ Service Worker File
- `bg/background.js` - Created and properly configured
- Uses `importScripts()` to load dependencies - ✅ Correct for Service Worker

### ⚠️ Known Limitations
- Service Workers cannot use DOM APIs
- Service Workers cannot directly access iframes
- Sandbox communication needs to be handled via `chrome.runtime.sendMessage`

## Testing Checklist

- [ ] Extension loads without manifest errors
- [ ] Service Worker starts correctly
- [ ] Extension icon appears in toolbar
- [ ] Popup opens when clicking icon
- [ ] Options page opens
- [ ] Content scripts load on web pages
- [ ] Dictionary queries work
- [ ] Anki integration works (AnkiConnect/AnkiWeb)
- [ ] Sandbox scripts load and execute
- [ ] No console errors in Service Worker

## References

- [Chrome Extension Manifest V3 Documentation](https://developer.chrome.com/docs/extensions/reference/manifest)
- [Chrome Extension API Reference](https://developer.chrome.com/docs/extensions/reference/api)
- [Manifest V3 Migration Guide](https://developer.chrome.com/docs/extensions/mv3/intro/mv3-migration/)
