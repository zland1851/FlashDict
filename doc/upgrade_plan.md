# ODH Project Upgrade Plan

## Overview

This document outlines the step-by-step upgrade plan to migrate ODH from Manifest V2 to Manifest V3, ensuring compatibility with modern browsers and Chrome extension policies.

## Upgrade Strategy

**Principle**: One step at a time, with full testing after each step.

## Step-by-Step Plan

### Phase 1: Preparation & Low-Risk Changes

#### Step 1.1: Replace Deprecated APIs (Before Manifest V3 Migration)
**Goal**: Replace deprecated Chrome APIs that work in both V2 and V3
**Risk**: Low
**Files to modify**:
- `src/bg/js/backend.js` (lines 39, 43)

**Changes**:
1. ✅ Replace `chrome.extension.getURL()` → `chrome.runtime.getURL()` (2 occurrences)
2. ⏳ Replace `chrome.browserAction` → `chrome.action` (will be done in Step 2.1 with manifest migration)

**Status**: Part 1 completed - `chrome.extension.getURL()` replaced

**Testing Checklist**:
- [ ] Extension loads without errors
- [ ] Guide page opens on first install
- [ ] Update page opens on extension update
- [ ] All existing functionality works

**Testing Instructions**:
1. Load the extension in Chrome (developer mode)
2. Check browser console for errors
3. Test first install: Uninstall extension, then reinstall - guide page should open
4. Test update: Change version in manifest, reload extension - update page should open
5. Verify all existing functionality still works

---

#### Step 1.2: Update Minimum Chrome Version
**Goal**: Update minimum Chrome version requirement
**Risk**: Low
**Files to modify**:
- `src/manifest.json`

**Changes**:
- Update `minimum_chrome_version` from "50.0.0.0" to "88.0.0.0" (first version with full Manifest V3 support)

**Testing Checklist**:
- [ ] Extension loads in Chrome 88+
- [ ] No compatibility issues

---

### Phase 2: Manifest V3 Core Migration

#### Step 2.1: Update Manifest.json Structure
**Goal**: Convert manifest.json to Manifest V3 format
**Risk**: Medium
**Files to modify**:
- `src/manifest.json`

**Changes**:
1. Change `manifest_version` from 2 to 3
2. Replace `browser_action` → `action`
3. Replace `background.page` → `background.service_worker`
4. Remove `webRequestBlocking` from permissions (if not used)
5. Update `web_accessible_resources` format (V3 requires `matches` field)
6. Replace `chrome.browserAction` → `chrome.action` in backend.js

**Testing Checklist**:
- [ ] Extension loads without manifest errors
- [ ] Extension icon appears in toolbar
- [ ] Popup opens when clicking extension icon
- [ ] Badge text updates correctly
- [ ] No console errors

---

#### Step 2.2: Convert Background Page to Service Worker
**Goal**: Convert background.html to service worker
**Risk**: High
**Files to modify**:
- `src/bg/background.html` → `src/bg/background.js` (new service worker)
- `src/bg/js/backend.js` (refactor for Service Worker)
- `src/bg/js/utils.js` (replace `chrome.extension.getBackgroundPage()`)

**Changes**:
1. Create `src/bg/background.js` as service worker entry point
2. Import all necessary scripts in service worker
3. Handle Service Worker lifecycle (no persistent state)
4. Move state to `chrome.storage` if needed
5. Ensure event listeners are registered at top level
6. Replace `chrome.extension.getBackgroundPage()` usage

**Key Considerations**:
- Service Workers cannot maintain in-memory state
- Event listeners must be registered at top level
- Need to handle Service Worker wake-up events
- `chrome.extension.getBackgroundPage()` is not available in Service Workers

**Testing Checklist**:
- [ ] Service worker starts correctly
- [ ] Extension state persists across browser restarts
- [ ] Message passing works between Content Script and Background
- [ ] AnkiConnect communication works
- [ ] Dictionary script loading works
- [ ] All background functionality works

---

#### Step 2.3: Update Sandbox Configuration
**Goal**: Ensure Sandbox works with Manifest V3
**Risk**: Medium
**Files to modify**:
- `src/manifest.json` (sandbox configuration)
- `src/bg/sandbox/sandbox.js` (if needed)

**Changes**:
1. Verify sandbox configuration is compatible with V3
2. Test script loading mechanism

**Testing Checklist**:
- [ ] Sandbox iframe loads correctly
- [ ] Dictionary scripts can be loaded
- [ ] Script execution works
- [ ] Communication between Sandbox and Background works

---

### Phase 3: Code Modernization & Security

#### Step 3.1: Improve Sandbox Security (Optional but Recommended)
**Goal**: Replace eval() with safer method if possible
**Risk**: Medium
**Files to modify**:
- `src/bg/sandbox/sandbox.js`

**Changes**:
- Evaluate if dynamic import can replace eval()
- Add input validation for script loading
- Improve error handling

**Testing Checklist**:
- [ ] Script loading still works
- [ ] Security is improved
- [ ] No functionality broken

---

#### Step 3.2: Update Dependencies
**Goal**: Update jQuery to latest version
**Risk**: Low
**Files to modify**:
- `src/bg/background.html` (if still used)
- `src/bg/options.html`
- `src/bg/popup.html`

**Changes**:
- Update jQuery from 3.0.0 to latest 3.7.x

**Testing Checklist**:
- [ ] All jQuery-dependent code works
- [ ] No breaking changes

---

### Phase 4: Final Testing & Cleanup

#### Step 4.1: Comprehensive Testing
**Goal**: Full functionality test
**Risk**: Low

**Testing Checklist**:
- [ ] Text selection works (mouse drag, double-click, hotkey)
- [ ] Dictionary query works (built-in and online)
- [ ] Popup displays correctly
- [ ] Anki integration works (AnkiConnect and AnkiWeb)
- [ ] Options page works
- [ ] Dictionary script loading works
- [ ] All UI elements work
- [ ] No console errors
- [ ] Extension works in Chrome latest
- [ ] Extension works in Firefox (if applicable)

---

#### Step 4.2: Update Version Number
**Goal**: Bump version for release
**Risk**: Low
**Files to modify**:
- `src/manifest.json`

**Changes**:
- Update version from 0.9.5 to 1.0.0 (or appropriate version)

---

## Risk Assessment

| Step | Risk Level | Rollback Difficulty | Dependencies |
|------|-----------|---------------------|--------------|
| 1.1 | Low | Easy | None |
| 1.2 | Low | Easy | None |
| 2.1 | Medium | Easy | None |
| 2.2 | High | Medium | Step 2.1 |
| 2.3 | Medium | Medium | Step 2.2 |
| 3.1 | Medium | Easy | Step 2.3 |
| 3.2 | Low | Easy | None |
| 4.1 | Low | N/A | All previous |
| 4.2 | Low | Easy | All previous |

## Testing Strategy

### After Each Step:
1. Load extension in Chrome (developer mode)
2. Check browser console for errors
3. Test core functionality
4. Verify no regressions

### Full Test Suite (After Phase 2):
1. **Text Selection**: Test all selection methods
2. **Dictionary Query**: Test built-in and online dictionaries
3. **Anki Integration**: Test AnkiConnect and AnkiWeb
4. **Options Page**: Test all configuration options
5. **Script Loading**: Test dictionary script loading
6. **Cross-tab**: Test extension works across multiple tabs

## Rollback Plan

If any step fails:
1. Revert the changes for that step
2. Document the issue
3. Fix the issue or adjust the plan
4. Re-test before proceeding

## Notes

- **Service Worker Migration** is the most critical and risky step
- Keep a backup of working V2 version
- Test incrementally, don't skip steps
- Document any issues encountered
- `chrome.extension.getBackgroundPage()` will be handled in Step 2.2 (Service Worker migration)

## Current Status

- [x] Step 1.1 (Part 1): Replace `chrome.extension.getURL()` ✅
- [ ] Step 1.1 (Part 2): Replace `chrome.browserAction` (will be done in Step 2.1)
- [ ] Step 1.2: Update Minimum Chrome Version
- [ ] Step 2.1: Update Manifest.json Structure
- [ ] Step 2.2: Convert Background Page to Service Worker
- [ ] Step 2.3: Update Sandbox Configuration
- [ ] Step 3.1: Improve Sandbox Security
- [ ] Step 3.2: Update Dependencies
- [ ] Step 4.1: Comprehensive Testing
- [ ] Step 4.2: Update Version Number
