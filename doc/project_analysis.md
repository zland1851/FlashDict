# ODH Project Technical Analysis & Upgrade Plan

## Project Overview

**Online Dictionary Helper (ODH)** is a Chrome/Firefox browser extension that displays dictionary definitions for words and phrases selected on web pages, and supports creating Anki flashcards from the results.

- **Source**: Forked from [ninja33/ODH](https://github.com/ninja33/ODH)
- **Current Version**: 0.9.5
- **Last Updated**: Approximately 4 years ago
- **Main Languages**: JavaScript (84.4%), HTML (11.3%), CSS (4.3%)

## Core Features

### 1. Dictionary Query Functionality
- **Built-in Dictionary**: Collins English-Chinese Dictionary (offline)
- **Online Dictionaries**: Supports multiple online dictionary scripts
  - English-Chinese: Cambridge, Oxford, Youdao, Baicizhan, Collins, etc.
  - English-English: Collins, LDOCE6, UrbanDict, etc.
  - Other Languages: French, Spanish, German, Russian, Italian, etc.
- **Dictionary Script System**: Supports user-defined dictionary scripts (executed in Sandbox environment)

### 2. Anki Integration
- **AnkiConnect**: Communicates with Anki desktop via AnkiConnect add-on
- **AnkiWeb**: Supports AnkiWeb online service
- **Flashcard Creation**: Automatically fills fields such as word, pronunciation, definition, example sentences, etc.

### 3. Text Selection & Popup
- **Multiple Selection Methods**: Mouse drag, double-click, hotkey trigger
- **Context Extraction**: Automatically extracts sentences containing the selected word
- **Popup Display**: Shows dictionary definitions near the selected text

### 4. Word Inflection Processing
- **Deinflector**: Supports English word inflection reduction (e.g., plurals, past tense, etc.)

## Technical Architecture

### 1. File Structure

```
src/
├── manifest.json          # Extension manifest file
├── bg/                    # Background (background scripts)
│   ├── background.html    # Background page
│   ├── js/
│   │   ├── backend.js     # Main background logic
│   │   ├── agent.js       # Sandbox communication proxy
│   │   ├── ankiconnect.js # AnkiConnect interface
│   │   ├── ankiweb.js     # AnkiWeb interface
│   │   ├── builtin.js     # Built-in dictionary
│   │   ├── deinflector.js # Word inflection processing
│   │   ├── options.js     # Options page logic
│   │   ├── popup.js       # Popup window logic
│   │   └── utils.js       # Utility functions
│   ├── sandbox/           # Sandbox environment (runs dictionary scripts)
│   │   ├── sandbox.html
│   │   ├── sandbox.js     # Sandbox main logic
│   │   ├── api.js         # Sandbox API interface
│   │   └── sign.js
│   └── css/               # Style files
├── fg/                    # Frontend (content scripts)
│   ├── js/
│   │   ├── frontend.js    # Frontend main logic
│   │   ├── popup.js       # Popup display
│   │   ├── frame.js       # Popup frame
│   │   ├── range.js       # Text range processing
│   │   ├── text.js        # Text processing
│   │   ├── spell.js       # Spell checking
│   │   └── api.js         # Frontend API
│   └── css/               # Style files
├── dict/                  # Dictionary scripts directory
│   └── *.js               # Various dictionary scripts
└── _locales/              # Internationalization files
```

### 2. Core Modules

#### 2.1 Background Script
- **File**: `bg/js/backend.js`
- **Class**: `ODHBack`
- **Responsibilities**:
  - Manage extension state and options
  - Handle message passing (communication with Content Script)
  - Manage dictionary script loading and execution
  - Handle Anki-related operations
  - Manage word inflection and built-in dictionary

#### 2.2 Content Script
- **File**: `fg/js/frontend.js`
- **Class**: `ODHFront`
- **Responsibilities**:
  - Listen to mouse and keyboard events
  - Handle text selection
  - Display popup
  - Communicate with Background Script to get dictionary results

#### 2.3 Sandbox (Sandbox Environment)
- **File**: `bg/sandbox/sandbox.js`
- **Class**: `Sandbox`
- **Responsibilities**:
  - Securely execute user-defined dictionary scripts
  - Provide restricted API interfaces (fetch, deinflect, etc.)
  - Communicate with Background Script via postMessage

#### 2.4 Dictionary Script Interface
- **Standard Format**: Each dictionary script must be a class with a `findTerm(word)` method
- **Returns**: Promise that resolves to an array of dictionary results
- **Examples**: `encn_Youdao.js`, `encn_Cambridge.js`, etc.

#### 2.5 Options Page
- **Files**: `bg/js/options.js`, `bg/options.html`
- **Main Functions**:
  - **General Options Management**: Enable/disable extension, mouse selection, hotkey configuration, context and example sentence count settings
  - **Anki Configuration**: 
    - Service selection (AnkiConnect/AnkiWeb/None)
    - AnkiWeb login (username/password)
    - Deck and template selection
    - Field mapping (expression, reading, definition, sentence, etc.)
    - Tags and duplicate card settings
  - **Dictionary Configuration**:
    - Current dictionary selection
    - Monolingual/bilingual dictionary mode
    - Audio preference settings
  - **Script Management**:
    - System script list (built-in dictionary scripts)
    - User-defined scripts (UDF Scripts)
    - Script enable/disable and cloud loading options
- **Key Functions**:
  - `populateAnkiDeckAndModel()`: Get deck and template lists from Anki
  - `populateAnkiFields()`: Get field list based on template
  - `updateAnkiStatus()`: Check Anki connection status
  - `populateDictionary()`: Populate available dictionary list
  - `populateSysScriptsList()`: Manage system script list
  - `onSaveClicked()`: Save all configuration options
- **Dependencies**: jQuery, `odhback()` (background script interface), `optionsLoad()`/`optionsSave()` (storage utilities)

### 3. Communication Mechanism

```
Content Script <---> Background Script <---> Sandbox
     (message)              (message)              (postMessage)
```

- **Content Script ↔ Background**: `chrome.runtime.sendMessage()`
- **Background ↔ Sandbox**: `window.postMessage()` (via iframe)

## Deprecated Technologies & APIs

### 1. Manifest V2 → Manifest V3

**Current Status**: Using Manifest V2
```json
{
  "manifest_version": 2,
  "browser_action": {...},
  "background": {
    "page": "bg/background.html"
  }
}
```

**Issues**:
- Chrome plans to phase out Manifest V2 in 2024
- Firefox is also migrating to Manifest V3

**Migration Required**:
- `browser_action` → `action`
- `background.page` → `background.service_worker`
- `webRequestBlocking` → Declarative API (`declarativeNetRequest`)
- `chrome.extension.getURL()` → `chrome.runtime.getURL()` (partially already in use)

### 2. Deprecated Chrome APIs

#### 2.1 `chrome.extension.getURL()`
- **Location**: `src/bg/js/backend.js:39, 43`
- **Status**: Deprecated, should use `chrome.runtime.getURL()`
- **Impact**: Low (some code already uses new API)

#### 2.2 `chrome.browserAction`
- **Location**: `src/bg/js/backend.js:56, 59`
- **Status**: Changed to `chrome.action` in Manifest V3
- **Impact**: High (requires migration to Manifest V3)

#### 2.3 `webRequestBlocking`
- **Location**: `src/manifest.json:38`
- **Status**: Requires declarative API in Manifest V3
- **Impact**: Medium (needs to check if actually used)

### 3. Security-Related Issues

#### 3.1 Use of `eval()` in Sandbox
- **Location**: `src/bg/sandbox/sandbox.js:39`
- **Code**: `let SCRIPT = eval(\`(${scripttext})\`);`
- **Issue**: Using `eval()` to execute remote scripts poses security risks
- **Recommendation**: Consider safer script loading methods (e.g., dynamic import, but requires Manifest V3)

#### 3.2 Remote Script Loading
- **Location**: `src/bg/sandbox/sandbox.js:18`
- **Code**: Loading scripts from GitHub
- **Issue**: Requires HTTPS and may be subject to CORS restrictions

### 4. Dependency Versions

#### 4.1 jQuery 3.0.0
- **Location**: `src/bg/background.html:4`
- **Status**: Older version (current latest is 3.7.x)
- **Impact**: Low (functions normally, but update recommended)

### 5. Browser Compatibility

#### 5.1 Minimum Chrome Version
- **Current**: `"minimum_chrome_version": "50.0.0.0"`
- **Status**: Too old, modern browsers no longer support it
- **Recommendation**: Update to at least Chrome 88+ (supports Manifest V3)

## Technology Stack Analysis

### 1. Frontend Technologies
- **JavaScript**: ES6+ (uses class, async/await, Promise)
- **HTML5**: Standard HTML
- **CSS3**: Custom styles
- **jQuery**: DOM manipulation and event handling

### 2. Browser APIs
- **Chrome Extension API**: 
  - `chrome.runtime` (message passing)
  - `chrome.tabs` (tab management)
  - `chrome.storage` (data storage)
  - `chrome.i18n` (internationalization)
  - `chrome.commands` (hotkeys)
- **Web API**:
  - `DOMParser` (HTML parsing)
  - `fetch` (via Sandbox API proxy)
  - `postMessage` (cross-context communication)

### 3. External Services
- **AnkiConnect**: Local HTTP service (default port 8765)
- **AnkiWeb**: Online service API
- **Online Dictionaries**: Various third-party dictionary websites

## Upgrade Priority Recommendations

### High Priority (Must Fix)

1. **Migrate to Manifest V3**
   - Upgrade `manifest_version` to 3
   - Replace `browser_action` with `action`
   - Change `background.page` to `service_worker`
   - Handle `webRequestBlocking` permission

2. **Replace Deprecated Chrome APIs**
   - Replace all `chrome.extension.getURL()` with `chrome.runtime.getURL()`
   - Replace `chrome.browserAction` with `chrome.action`

3. **Service Worker Migration**
   - Background Script needs to change from persistent page to Service Worker
   - Handle state persistence (Service Workers cannot maintain state)
   - Handle event listener registration timing

### Medium Priority (Recommended Fixes)

4. **Sandbox Security**
   - Evaluate use of `eval()`, consider safer alternatives
   - Strengthen security checks for remote script loading

5. **Dependency Updates**
   - Update jQuery to latest stable version
   - Check for other dependencies that need updating

6. **Code Modernization**
   - Use ES6+ module system (if Manifest V3 supports it)
   - Optimize async code structure

### Low Priority (Optional Optimizations)

7. **Performance Optimization**
   - Optimize concurrent dictionary query processing
   - Cache mechanism optimization

8. **User Experience**
   - Improve error handling prompts
   - Optimize popup display effects

## Potential Issues & Challenges

### 1. Service Worker Limitations
- **Issue**: Service Workers cannot maintain persistent state
- **Impact**: State management in Background Script needs refactoring
- **Solution**: Use `chrome.storage` for state persistence

### 2. Message Passing Changes
- **Issue**: Communication between Service Worker and Content Script is slightly different
- **Impact**: Need to test all message passing paths
- **Solution**: Ensure all `chrome.runtime.sendMessage()` calls are handled correctly

### 3. Sandbox Environment
- **Issue**: Sandbox usage in Manifest V3 may change
- **Impact**: Dictionary script loading mechanism may need adjustment
- **Solution**: Consult Manifest V3 documentation, ensure Sandbox configuration is correct

### 4. Permission Model Changes
- **Issue**: Manifest V3 permission model is stricter
- **Impact**: Some features may require explicit user authorization
- **Solution**: Update permission declarations, add necessary permission requests

## Testing Recommendations

### 1. Functional Testing
- [ ] Text selection functionality
- [ ] Dictionary query functionality (built-in and online)
- [ ] Anki flashcard creation functionality
- [ ] Options page configuration
- [ ] Dictionary script loading

### 2. Compatibility Testing
- [ ] Latest Chrome version
- [ ] Latest Firefox version
- [ ] Latest Edge version (if supported)

### 3. Security Testing
- [ ] Sandbox script execution security
- [ ] Remote script loading security
- [ ] Permission usage reasonableness

## References

- [Chrome Extension Manifest V3 Migration Guide](https://developer.chrome.com/docs/extensions/mv3/intro/)
- [Firefox WebExtensions Manifest V3](https://extensionworkshop.com/documentation/develop/manifest-v3-migration-guide/)
- [ODH Original Project](https://github.com/ninja33/ODH)
- [AnkiConnect Documentation](https://github.com/FooSoft/anki-connect)

## Summary

The ODH project has a clear architecture and complete functionality, but uses outdated Manifest V2 and some deprecated Chrome APIs. The main upgrade work focuses on:

1. **Core Migration**: Manifest V2 → V3
2. **API Updates**: Deprecated APIs → New APIs
3. **Architecture Adjustment**: Background Page → Service Worker
4. **Security Enhancement**: Sandbox script execution mechanism

It is recommended to upgrade step by step according to priority, ensuring thorough testing at each stage to avoid breaking existing functionality.
