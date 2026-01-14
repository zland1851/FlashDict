# ODH Extension Testing Checklist

## Step 4.1: Comprehensive Testing

> **Note**: This project now includes automated tests! See `tests/README.md` for details.
> 
> To run automated tests:
> ```bash
> npm install
> npm test
> ```

## Automated Testing

The project includes automated unit and E2E tests using Jest and Puppeteer. See `tests/` directory for test files.

## Manual Testing (Fallback)

### Core Functionality Tests

#### 1. Text Selection
- [ ] Mouse drag selection works
- [ ] Double-click selection works
- [ ] Hotkey selection works (Alt+Q default)
- [ ] Selection works in editable areas
- [ ] Selection works in different websites

#### 2. Dictionary Query
- [ ] Built-in dictionary (Collins) works
- [ ] Online dictionaries load correctly
- [ ] Dictionary dropdown shows available dictionaries
- [ ] Dictionary switching works
- [ ] Translation results display correctly
- [ ] Multiple definitions display correctly

#### 3. Popup Display
- [ ] Popup opens when clicking extension icon
- [ ] Dictionary list displays correctly
- [ ] Options are accessible
- [ ] UI elements render correctly
- [ ] No layout issues

#### 4. Anki Integration
- [ ] AnkiConnect connection works
- [ ] Notes can be added to Anki
- [ ] No duplicate notes (fixed)
- [ ] AnkiWeb connection works (if enabled)
- [ ] Deck names load correctly
- [ ] Model names load correctly
- [ ] Field names load correctly

#### 5. Options Page
- [ ] Options page opens correctly
- [ ] All settings can be saved
- [ ] Settings persist after reload
- [ ] Dictionary script selection works
- [ ] Anki configuration works

#### 6. Dictionary Script Loading
- [ ] Built-in scripts load
- [ ] System scripts load
- [ ] User-defined scripts load
- [ ] Script errors are handled gracefully
- [ ] Dictionary list updates correctly

#### 7. Audio Playback
- [ ] Audio plays when clicking play icon
- [ ] Audio works for different dictionaries
- [ ] No errors in console

#### 8. UI Elements
- [ ] All buttons work
- [ ] Icons display correctly
- [ ] Tooltips work (if any)
- [ ] Keyboard shortcuts work

#### 9. Console Errors
- [ ] No critical errors in Service Worker console
- [ ] No critical errors in offscreen document console
- [ ] No critical errors in popup console
- [ ] No critical errors in content script console

#### 10. Cross-browser Compatibility
- [ ] Extension works in Chrome latest
- [ ] Extension works in Edge (if applicable)
- [ ] Extension works in other Chromium browsers (if applicable)

### Performance Tests
- [ ] Extension loads quickly
- [ ] Dictionary queries are responsive
- [ ] No memory leaks
- [ ] Service Worker stays alive

### Edge Cases
- [ ] Works with very long text selections
- [ ] Works with special characters
- [ ] Works with empty selections
- [ ] Works when AnkiConnect is not running
- [ ] Works when network is unavailable
- [ ] Works after browser restart

## Test Results

**Date**: [To be filled]
**Tester**: [To be filled]
**Chrome Version**: [To be filled]

### Passed Tests
- [List of passed tests]

### Failed Tests
- [List of failed tests with details]

### Notes
- [Any additional notes or observations]
