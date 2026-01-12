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
2. ✅ Replace `chrome.browserAction` → `chrome.action` (completed in Step 2.1)

**Status**: ✅ **COMPLETED** - All deprecated APIs replaced

**Testing Checklist**:
- [x] Extension loads without errors ✅
- [x] Guide page opens on first install ✅
- [x] Update page opens on extension update ✅
- [x] All existing functionality works ✅

**Status**: ✅ **COMPLETED**

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
- ✅ Update `minimum_chrome_version` from "50.0.0.0" to "88.0.0.0" (first version with full Manifest V3 support)

**Testing Checklist**:
- [x] Extension loads in Chrome 88+ ✅
- [x] No compatibility issues ✅

**Status**: ✅ **COMPLETED**

---

### Phase 2: Manifest V3 Core Migration

#### Step 2.1: Update Manifest.json Structure
**Goal**: Convert manifest.json to Manifest V3 format
**Risk**: Medium
**Files to modify**:
- `src/manifest.json`

**Changes**:
1. ✅ Change `manifest_version` from 2 to 3
2. ✅ Replace `browser_action` → `action`
3. ✅ Replace `background.page` → `background.service_worker`
4. ✅ Remove `webRequestBlocking` from permissions (wrapped in try-catch in ankiweb.js)
5. ✅ Update `web_accessible_resources` format (V3 requires `matches` field)
6. ✅ Replace `chrome.browserAction` → `chrome.action` in backend.js

**Testing Checklist**:
- [x] Extension loads without manifest errors ✅
- [x] Extension icon appears in toolbar ✅
- [x] Popup opens when clicking extension icon ✅
- [x] Badge text updates correctly ✅
- [x] No console errors ✅

**Status**: ✅ **COMPLETED**

---

#### Step 2.2: Convert Background Page to Service Worker
**Goal**: Convert background.html to service worker
**Risk**: High
**Files to modify**:
- `src/bg/background.html` → `src/bg/background.js` (new service worker)
- `src/bg/js/backend.js` (refactor for Service Worker)
- `src/bg/js/utils.js` (replace `chrome.extension.getBackgroundPage()`)

**Changes**:
1. ✅ Create `src/bg/background.js` as service worker entry point
2. ✅ Import all necessary scripts in service worker
3. ✅ Handle Service Worker lifecycle (no persistent state)
4. ✅ Move state to `chrome.storage` if needed
5. ✅ Ensure event listeners are registered at top level
6. ✅ Replace `chrome.extension.getBackgroundPage()` usage (using chrome.runtime.sendMessage)

**Key Considerations**:
- Service Workers cannot maintain in-memory state
- Event listeners must be registered at top level
- Need to handle Service Worker wake-up events
- `chrome.extension.getBackgroundPage()` is not available in Service Workers

**Additional Implementation**:
- ✅ Created offscreen document (`bg/background.html`) for DOM-dependent APIs (Audio, Sandbox iframe)
- ✅ Implemented message routing between Service Worker, Offscreen Document, and Sandbox
- ✅ Fixed Audio API by forwarding to offscreen document

**Testing Checklist**:
- [x] Service worker starts correctly ✅
- [x] Extension state persists across browser restarts ✅
- [x] Message passing works between Content Script and Background ✅
- [x] AnkiConnect communication works ✅
- [x] Dictionary script loading works ✅
- [x] All background functionality works ✅

**Status**: ✅ **COMPLETED**

---

#### Step 2.3: Update Sandbox Configuration
**Goal**: Ensure Sandbox works with Manifest V3
**Risk**: Medium
**Files to modify**:
- `src/manifest.json` (sandbox configuration)
- `src/bg/sandbox/sandbox.js` (if needed)

**Changes**:
1. ✅ Verify sandbox configuration is compatible with V3
2. ✅ Test script loading mechanism
3. ✅ Updated sandbox communication to use window.postMessage via offscreen document

**Testing Checklist**:
- [x] Sandbox iframe loads correctly ✅
- [x] Dictionary scripts can be loaded ✅
- [x] Script execution works ✅
- [x] Communication between Sandbox and Background works ✅

**Status**: ✅ **COMPLETED**

---

### Phase 3: Code Modernization & Security

#### Step 3.1: Improve Sandbox Security (Optional but Recommended)
**Goal**: Replace eval() with safer method if possible
**Risk**: Medium
**Files to modify**:
- `src/bg/sandbox/sandbox.js`

**Changes**:
- ✅ Evaluated eval() usage (kept in sandbox as it's isolated and safe)
- ✅ Add input validation for script loading (name parameter, scripttext validation)
- ✅ Improve error handling (better error logging, null checks)

**Testing Checklist**:
- [x] Script loading still works ✅
- [x] Security is improved ✅
- [x] No functionality broken ✅

**Status**: ✅ **COMPLETED**

---

#### Step 3.2: Update Dependencies
**Goal**: Update jQuery to latest version
**Risk**: Low
**Files to modify**:
- `src/bg/background.html` (if still used)
- `src/bg/options.html`
- `src/bg/popup.html`

**Changes**:
- ✅ Update jQuery from 3.0.0 to 3.7.1 (latest stable)
- ✅ Updated references in popup.html and options.html

**Testing Checklist**:
- [x] All jQuery-dependent code works ✅
- [x] No breaking changes ✅

**Status**: ✅ **COMPLETED**

---

### Phase 4: Final Testing & Cleanup

#### Step 4.1: Comprehensive Testing
**Goal**: Full functionality test
**Risk**: Low

**Testing Checklist**:
- [x] Text selection works (mouse drag, double-click, hotkey) ✅
- [x] Dictionary query works (built-in and online) ✅
- [x] Popup displays correctly ✅
- [x] Anki integration works (AnkiConnect and AnkiWeb) ✅
- [x] Options page works ✅
- [x] Dictionary script loading works ✅
- [x] All UI elements work ✅
- [x] No console errors ✅
- [x] Extension works in Chrome latest ✅
- [ ] Extension works in Firefox (if applicable) - Not tested

**Additional Work**:
- ✅ Created automated testing framework (Jest + Puppeteer)
- ✅ Created unit tests for utility functions
- ✅ Created E2E test structure for extension features
- ✅ Updated Puppeteer to latest version (24.35.0)

**Status**: ✅ **COMPLETED** (Manual testing done, automated tests framework created)

---

#### Step 4.2: Update Version Number
**Goal**: Bump version for release
**Risk**: Low
**Files to modify**:
- `src/manifest.json`

**Changes**:
- ✅ Update version from 0.9.5 to 1.0.7 (current version)

**Status**: ✅ **COMPLETED**

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

### ✅ Phase 1: Preparation & Low-Risk Changes - COMPLETED
- [x] Step 1.1: Replace Deprecated APIs ✅
  - [x] Part 1: Replace `chrome.extension.getURL()` ✅
  - [x] Part 2: Replace `chrome.browserAction` → `chrome.action` ✅
- [x] Step 1.2: Update Minimum Chrome Version ✅

### ✅ Phase 2: Manifest V3 Core Migration - COMPLETED
- [x] Step 2.1: Update Manifest.json Structure ✅
- [x] Step 2.2: Convert Background Page to Service Worker ✅
- [x] Step 2.3: Update Sandbox Configuration ✅

### ✅ Phase 3: Code Modernization & Security - COMPLETED
- [x] Step 3.1: Improve Sandbox Security ✅
- [x] Step 3.2: Update Dependencies (jQuery 3.7.1) ✅

### ✅ Phase 4: Final Testing & Cleanup - COMPLETED
- [x] Step 4.1: Comprehensive Testing ✅
  - Manual testing completed
  - Automated testing framework created
- [x] Step 4.2: Update Version Number ✅ (v1.0.7)

## Summary

**All planned upgrade steps have been completed!** 🎉

The extension has been successfully migrated from Manifest V2 to Manifest V3, with all deprecated APIs replaced, Service Worker architecture implemented, security improvements added, and comprehensive testing completed. The extension is now ready for use with modern Chrome browsers.
