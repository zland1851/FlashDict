# CLAUDE.md - Claude Code Configuration

This file provides guidance to Claude Code when working with the ODH (Online Dictionary Helper) codebase.

## Project Overview

ODH is a Chrome extension for looking up words in online dictionaries and creating Anki flashcards. It uses Manifest V3 with a TypeScript service worker architecture.

## Tech Stack

- **Runtime**: Chrome Extension (Manifest V3)
- **Language**: TypeScript (service worker), JavaScript (legacy UI)
- **Build**: esbuild (bundling), TypeScript compiler
- **Testing**: Jest (unit tests), Puppeteer (e2e tests)
- **Package Manager**: npm

## Project Structure

```
src/
├── bg/                    # Background/service worker
│   ├── ts/               # TypeScript source
│   │   ├── bootstrap/    # App initialization (DI, handlers, events)
│   │   ├── core/         # Core infrastructure (Container, EventBus, MessageRouter)
│   │   ├── handlers/     # Message handlers
│   │   ├── interfaces/   # TypeScript interfaces
│   │   ├── managers/     # State managers (OptionsManager)
│   │   ├── security/     # Security (Validator, Middleware, Credentials)
│   │   ├── services/     # Business logic services
│   │   ├── utils/        # Utilities (builtin, deinflector)
│   │   └── service-worker.ts  # Entry point
│   ├── js/               # Legacy JavaScript (UI, offscreen)
│   ├── sandbox/          # Dictionary sandbox (isolated eval)
│   └── data/             # Builtin dictionary data
├── fg/                   # Frontend (content scripts)
│   ├── js/              # Content script JavaScript
│   └── css/             # Styles
├── dict/                 # Dictionary scripts
└── manifest.json
```

## Common Commands

```bash
# Build extension
npm run build

# Run unit tests
npm test -- --testPathIgnorePatterns=e2e

# Run all tests (requires Chrome)
npm test

# Type check
npm run build:tsc

# Clean build
rm -rf dist && npm run build
```

## Architecture Patterns

### Dependency Injection
Services are created via `Container` and wired in `bootstrap/`. Never instantiate services directly.

### Message Routing
All messages flow through `MessageRouter` with security middleware:
```
Content Script → Service Worker → MessageRouter → Handler
```

### Sandbox Communication
Dictionary scripts run in an isolated sandbox:
```
Service Worker → Offscreen Document → Sandbox iframe → Dictionary
```

## Key Files

| File | Purpose |
|------|---------|
| `src/bg/ts/service-worker.ts` | Main entry point |
| `src/bg/ts/bootstrap/index.ts` | App initialization |
| `src/bg/ts/core/MessageRouter.ts` | Message handling |
| `src/bg/ts/services/BackendService.ts` | Core business logic |
| `src/bg/ts/services/SandboxBridge.ts` | Sandbox communication |
| `src/bg/js/background.js` | Offscreen document handler |

## Code Conventions

- Use TypeScript for all new code in `src/bg/ts/`
- Follow SOLID principles (single responsibility, dependency injection)
- Add validators in `security/Validator.ts` for new message types
- Use `createHandler()` for registering message handlers
- Keep sandbox communication through `SandboxBridge`

## Testing

- Unit tests in `tests/unit/` - mock Chrome APIs
- E2E tests in `tests/e2e/` - require real Chrome browser
- Run unit tests frequently: `npm test -- --testPathIgnorePatterns=e2e`

## Common Tasks

### Adding a New Message Handler
1. Add action constant in `bootstrap/constants.ts`
2. Add validator in `security/Validator.ts`
3. Register handler in `service-worker.ts` or `bootstrap/HandlerRegistry.ts`

### Adding a New Service
1. Create interface in `interfaces/`
2. Implement service in `services/`
3. Register in `bootstrap/ServiceFactory.ts`
4. Wire in `bootstrap/index.ts`

### Debugging
- Service worker console: `chrome://extensions/` → Inspect views: service worker
- Offscreen document console: Check background.html in DevTools
- Content script console: Regular page DevTools

## Don't

- Don't modify files in `dist/` (generated)
- Don't use relative imports without `.js` extension in service worker
- Don't bypass `MessageRouter` for message handling
- Don't store secrets in code (use `CredentialManager`)
