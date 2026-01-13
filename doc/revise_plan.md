# ODH Project Revision Plan - TypeScript Migration & Architecture Modernization

## Overview

This document outlines the revision plan to migrate ODH from JavaScript to TypeScript, implementing the new modular architecture that has been prepared. The Manifest V3 upgrade is complete, and now we need to modernize the codebase with TypeScript, improve maintainability, and enhance test coverage.

## Current State

### Completed
- ✅ Manifest V3 migration (service worker, offscreen document, sandbox)
- ✅ TypeScript configuration (tsconfig.json with path aliases)
- ✅ Jest testing framework setup
- ✅ Core TypeScript modules created (Container, EventBus, MessageRouter)
- ✅ Service interfaces defined (IAnkiService, IOptionsStore, IMessageHandler, IDictionary, IAudioPlayer)
- ✅ Service implementations started (AnkiConnectService, OptionsManager, NoteFormatterService)
- ✅ Utility modules (deinflector, builtin, text utils)
- ✅ Unit test structure established

### Remaining Work
- Migrate existing JS code to TypeScript
- Integrate new architecture with legacy code
- Complete missing TypeScript modules
- Improve test coverage
- Remove deprecated code
- Update build process

## Revision Strategy

**Principle**: Incremental migration with backward compatibility, one module at a time.

## Phase 1: Infrastructure & Build Setup

### Step 1.1: Commit Initial TypeScript Infrastructure
**Goal**: Commit the new TypeScript configuration and testing framework
**Risk**: Low
**Files to commit**:
- `tsconfig.json`
- `jest.config.ts`
- `tests/` directory
- `src/bg/ts/` directory
- `src/fg/ts/` directory
- Updated `package.json`

**Changes**:
- Add all TypeScript files to git
- Update package.json dependencies
- Verify build and test scripts work

**Status**: 🔄 IN PROGRESS

---

### Step 1.2: Build System Enhancement
**Goal**: Enhance build process for TypeScript compilation and bundling
**Risk**: Low
**Files to modify**:
- `package.json` (add build scripts)
- Create `webpack.config.js` or update build process
- Create `.gitignore` for dist directory

**Changes**:
1. Add TypeScript compilation to build process
2. Set up source maps for debugging
3. Configure output directories
4. Add watch mode for development

---

## Phase 2: Background Services Migration

### Step 2.1: Migrate AnkiConnect to TypeScript
**Goal**: Replace `src/bg/js/ankiconnect.js` with TypeScript version
**Risk**: Medium
**Files to modify**:
- Delete `src/bg/js/ankiconnect.js`
- Update `src/bg/background.js` import
- Create `src/bg/ts/services/AnkiWebService.ts`

**Changes**:
1. ✅ AnkiConnectService.ts already created
2. Create AnkiWebService.ts implementing IAnkiService
3. Integrate with existing backend.js
4. Update message handlers

**Testing Checklist**:
- [ ] AnkiConnect communication works
- [ ] AnkiWeb integration works
- [ ] Deck/model loading works
- [ ] Note adding works
- [ ] Error handling works

---

### Step 2.2: Migrate Options Management
**Goal**: Replace options handling with TypeScript OptionsManager
**Risk**: Medium
**Files to modify**:
- `src/bg/js/options.js` (migrate to TypeScript)
- Update `src/bg/js/backend.js` to use OptionsManager
- Update `src/bg/js/popup.js` to use OptionsManager

**Changes**:
1. ✅ OptionsManager.ts already created
2. Migrate options.js TypeScript version
3. Integrate OptionsManager with backend
4. Update all options access patterns
5. Add options change event handling

**Testing Checklist**:
- [ ] Options load correctly
- [ ] Options save correctly
- [ ] Options update correctly
- [ ] Options page works
- [ ] Default options apply

---

### Step 2.3: Migrate Dictionary Services
**Goal**: Create TypeScript dictionary service architecture
**Risk**: Medium
**Files to create**:
- `src/bg/ts/services/DictionaryService.ts`
- `src/bg/ts/services/DictionaryLoader.ts`
- `src/bg/ts/services/TranslationService.ts`

**Files to modify**:
- `src/bg/js/agent.js`
- `src/bg/js/utils.js` (dictionary-related)

**Changes**:
1. Create IDictionary interface implementation
2. Create DictionaryLoader for script loading
3. Create TranslationService for query handling
4. Integrate with existing sandbox
5. Update message routing

**Testing Checklist**:
- [ ] Built-in dictionaries load
- [ ] Online dictionaries work
- [ ] Script loading works
- [ ] Translation queries work
- [ ] Caching works

---

### Step 2.4: Migrate Audio Services
**Goal**: Create TypeScript audio service
**Risk**: Medium
**Files to create**:
- `src/bg/ts/services/AudioService.ts`
- Implement `IAudioPlayer` interface

**Files to modify**:
- `src/bg/js/backend.js` (audio-related)
- `src/bg/js/utils.js` (audio-related)

**Changes**:
1. Create AudioService implementing IAudioPlayer
2. Handle offscreen document communication for audio
3. Support multiple audio sources
4. Add audio caching

**Testing Checklist**:
- [ ] Audio playback works
- [ ] Audio selection works
- [ ] Audio for Anki works
- [ ] Multiple audio sources work

---

### Step 2.5: Create Service Bootstrap
**Goal**: Use DI Container to initialize all services
**Risk**: Medium
**Files to create**:
- `src/bg/ts/bootstrap.ts`
- `src/bg/ts/services/index.ts`

**Files to modify**:
- `src/bg/background.js`

**Changes**:
1. Create bootstrap function to register all services
2. Wire up dependencies via Container
3. Initialize EventBus for inter-service communication
4. Set up MessageRouter with all handlers
5. Update background.js to use bootstrap

**Testing Checklist**:
- [ ] All services initialize correctly
- [ ] Dependencies resolve correctly
- [ ] Message routing works
- [ ] Event bus works
- [ ] No circular dependencies

---

## Phase 3: Content Script Migration

### Step 3.1: Migrate Frontend API
**Goal**: Convert `src/fg/js/api.js` to TypeScript
**Risk**: Medium
**Files to create**:
- `src/fg/ts/api.ts`
- `src/fg/ts/types.ts` (shared types)

**Files to modify**:
- Delete `src/fg/js/api.js`

**Changes**:
1. ✅ text.ts utilities already created
2. Create typed API for background communication
3. Add type-safe message sending
4. Add response type handling
5. Create error types

**Testing Checklist**:
- [ ] API methods work
- [ ] Type checking passes
- [ ] Error handling works
- [ ] Message sending works

---

### Step 3.2: Migrate Frontend Logic
**Goal**: Convert `src/fg/js/frontend.js` to TypeScript
**Risk**: Medium
**Files to create**:
- `src/fg/ts/FrontendManager.ts`
- `src/fg/ts/SelectionHandler.ts`

**Files to modify**:
- Delete `src/fg/js/frontend.js`

**Changes**:
1. Create FrontendManager for content script orchestration
2. Create SelectionHandler for text selection
3. Use typed API for backend communication
4. Handle UI rendering with TypeScript
5. Add event handling

**Testing Checklist**:
- [ ] Text selection works
- [ ] Mouse selection works
- [ ] Hotkey works
- [ ] Popup opens correctly
- [ ] Dictionary query works

---

### Step 3.3: Migrate Frame Script
**Goal**: Convert `src/fg/js/frame.js` to TypeScript
**Risk**: Low
**Files to create**:
- `src/fg/ts/FrameHandler.ts`

**Files to modify**:
- Delete `src/fg/js/frame.js`

**Changes**:
1. Create frame message handler
2. Handle iframe communication
3. Add type safety

**Testing Checklist**:
- [ ] Frame messages work
- [ ] Communication with parent works

---

### Step 3.4: Migrate Popup
**Goal**: Convert `src/fg/js/popup.js` to TypeScript
**Risk**: Low
**Files to create**:
- `src/fg/ts/PopupManager.ts`

**Files to modify**:
- Delete `src/fg/js/popup.js`

**Changes**:
1. Create PopupManager
2. Type-safe UI updates
3. Event handling for popup

**Testing Checklist**:
- [ ] Popup displays correctly
- [ ] All buttons work
- [ ] Audio plays
- [ ] Anki add works

---

## Phase 4: Test Coverage Enhancement

### Step 4.1: Complete Unit Tests
**Goal**: Ensure all TypeScript modules have comprehensive tests
**Risk**: Low
**Files to create**:
- Complete tests for all services
- Integration tests

**Changes**:
1. Add missing test cases
2. Increase coverage to 80%+
3. Add edge case tests
4. Add error path tests

**Testing Checklist**:
- [ ] All services have tests
- [ ] Coverage threshold met
- [ ] All tests pass

---

### Step 4.2: Add Integration Tests
**Goal**: Test service interactions
**Risk**: Low
**Files to create**:
- `tests/integration/` directory
- Integration test suites

**Changes**:
1. Create integration tests for service interactions
2. Test message routing end-to-end
3. Test storage integration
4. Test full workflows

**Testing Checklist**:
- [ ] Integration tests pass
- [ ] Workflows tested

---

## Phase 5: Cleanup & Documentation

### Step 5.1: Remove Legacy Code
**Goal**: Remove all migrated JavaScript files
**Risk**: Medium
**Files to delete**:
- All `src/bg/js/*.js` (after migration)
- All `src/fg/js/*.js` (after migration)
- Old test files

**Changes**:
1. Delete migrated files
2. Update imports in remaining files
3. Clean up unused dependencies

**Testing Checklist**:
- [ ] All functionality still works
- [ ] No broken imports
- [ ] Extension loads correctly

---

### Step 5.2: Update Documentation
**Goal**: Document new architecture
**Risk**: Low
**Files to create/update**:
- `README.md` (architecture overview)
- `CONTRIBUTING.md` (development guide)
- API documentation
- Code comments

**Changes**:
1. Document service architecture
2. Document message protocol
3. Document DI Container usage
4. Add development setup guide

---

### Step 5.3: Final Testing & Release
**Goal**: Comprehensive testing before release
**Risk**: Low

**Testing Checklist**:
- [ ] Manual testing of all features
- [ ] Automated tests pass
- [ ] No console errors
- [ ] Performance acceptable
- [ ] Accessibility checks pass
- [ ] Security review
- [ ] Update version number

---

## Architecture Overview

### New TypeScript Structure

```
src/
├── bg/
│   ├── ts/
│   │   ├── core/           # Core infrastructure
│   │   │   ├── Container.ts      # DI Container
│   │   │   ├── EventBus.ts       # Event system
│   │   │   └── MessageRouter.ts # Message routing
│   │   ├── interfaces/      # Service contracts
│   │   │   ├── IAnkiService.ts
│   │   │   ├── IOptionsStore.ts
│   │   │   ├── IMessageHandler.ts
│   │   │   ├── IDictionary.ts
│   │   │   └── IAudioPlayer.ts
│   │   ├── services/        # Service implementations
│   │   │   ├── AnkiConnectService.ts
│   │   │   ├── AnkiWebService.ts
│   │   │   ├── OptionsManager.ts
│   │   │   ├── DictionaryService.ts
│   │   │   ├── TranslationService.ts
│   │   │   ├── AudioService.ts
│   │   │   └── NoteFormatterService.ts
│   │   ├── managers/        # High-level managers
│   │   ├── utils/          # Utility functions
│   │   │   ├── deinflector.ts
│   │   │   ├── builtin.ts
│   │   │   └── ...
│   │   └── bootstrap.ts    # Service initialization
│   └── js/               # Legacy JS (to be migrated)
├── fg/
│   ├── ts/
│   │   ├── api.ts          # Background communication API
│   │   ├── types.ts       # Shared types
│   │   ├── FrontendManager.ts
│   │   ├── SelectionHandler.ts
│   │   ├── FrameHandler.ts
│   │   ├── PopupManager.ts
│   │   └── utils/         # Frontend utilities
│   │       └── text.ts
│   └── js/               # Legacy JS (to be migrated)
```

### Key Design Patterns

1. **Dependency Injection**: Use Container for service management
2. **Event-Driven**: EventBus for loose coupling
3. **Message Router**: Centralized message handling
4. **Interface Segregation**: Each service has focused responsibilities
5. **Single Responsibility**: Each module does one thing well

---

## Risk Assessment

| Phase | Risk Level | Rollback Difficulty | Dependencies |
|-------|-----------|---------------------|--------------|
| 1 - Infrastructure | Low | Easy | None |
| 2 - Background Services | Medium | Medium | Phase 1 |
| 3 - Content Scripts | Medium | Medium | Phase 2 |
| 4 - Tests | Low | Easy | Phases 1-3 |
| 5 - Cleanup | Medium | Medium | Phases 1-4 |

---

## Testing Strategy

### After Each Phase:
1. Run TypeScript compiler (`npm run lint`)
2. Run unit tests (`npm run test`)
3. Load extension in Chrome
4. Test core functionality
5. Check console for errors

### Full Test Suite (After All Phases):
1. **Extension Loading**: Service worker starts correctly
2. **Options**: Settings load/save correctly
3. **Dictionary**: All dictionaries work
4. **Anki**: Both AnkiConnect and AnkiWeb work
5. **Content Script**: Text selection and popup work
6. **Audio**: Audio playback works
7. **Messages**: All message types work

---

## Notes

- Keep backward compatibility during migration
- Test incrementally, don't skip steps
- Document any breaking changes
- Update version number after major changes
- Consider browser compatibility (Chrome 88+)

---

## Current Status

### Phase 1: Infrastructure & Build Setup - IN PROGRESS
- [ ] Step 1.1: Commit Initial TypeScript Infrastructure 🔄
- [ ] Step 1.2: Build System Enhancement

### Phase 2: Background Services Migration - PENDING
- [ ] Step 2.1: Migrate AnkiConnect to TypeScript
- [ ] Step 2.2: Migrate Options Management
- [ ] Step 2.3: Migrate Dictionary Services
- [ ] Step 2.4: Migrate Audio Services
- [ ] Step 2.5: Create Service Bootstrap

### Phase 3: Content Script Migration - PENDING
- [ ] Step 3.1: Migrate Frontend API
- [ ] Step 3.2: Migrate Frontend Logic
- [ ] Step 3.3: Migrate Frame Script
- [ ] Step 3.4: Migrate Popup

### Phase 4: Test Coverage Enhancement - PENDING
- [ ] Step 4.1: Complete Unit Tests
- [ ] Step 4.2: Add Integration Tests

### Phase 5: Cleanup & Documentation - PENDING
- [ ] Step 5.1: Remove Legacy Code
- [ ] Step 5.2: Update Documentation
- [ ] Step 5.3: Final Testing & Release
·