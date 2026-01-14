# ODH TypeScript Architecture Documentation

## Table of Contents

- [Project Overview](#project-overview)
- [TypeScript Migration Overview](#typescript-migration-overview)
- [Directory Structure](#directory-structure)
- [Core Architecture Patterns](#core-architecture-patterns)
- [Message Handlers](#message-handlers)
- [Services](#services)
- [Service Bootstrap](#service-bootstrap)
- [Interfaces](#interfaces)
- [Design Patterns](#design-patterns)
- [Current State](#current-state)

---

## Project Overview

### What is ODH (Online Dictionary Helper)?

ODH is a Chrome/Firefox browser extension that enhances web browsing by enabling users to:

- **Instant Dictionary Lookups**: Select words/phrases on any webpage to get instant dictionary definitions
- **Anki Integration**: Create Anki flashcards from dictionary lookups to aid language learning
- **Dual Anki Support**: Integration with both local Anki (via AnkiConnect) and cloud Anki (via AnkiWeb)
- **Custom Dictionaries**: Load custom dictionary scripts for various language pairs
- **Context Preservation**: Maintain contextual information and example sentences with lookups

### Current Status

| Item | Status |
|------|--------|
| Manifest Version | V3 (Chrome extension specification) |
| Development Branch | `odh-revise` |
| Main Branch | `master` |
| TypeScript Migration | In Progress |

---

## TypeScript Migration Overview

### Configuration

**TypeScript Target**: ES2020 with DOM support
**Module System**: ES2020 modules
**Strict Mode**: Enabled (all strict checks active)

### Path Aliases

| Alias | Maps To |
|-------|---------|
| `@bg/*` | `src/bg/ts/*` |
| `@fg/*` | `src/fg/ts/*` |
| `@/*` | `src/*` |

### Recent Commits (Phase 1: Infrastructure)

| Commit | Description |
|--------|-------------|
| `f216416` | TypeScript migration infrastructure and revision plan |
| `46b9bf7` | Updated build scripts in package.json |
| `2be6d21` | AnkiWebService TypeScript implementation |
| `e9b54b4` | OptionsHandler for message routing system |
| `51fdf58` | DictionaryHandler for dictionary lookup messages |
| `f880c95` | AudioHandler for audio playback messages |
| `4a91008` | Service Bootstrap (complete initialization system) |

---

## Directory Structure

```
src/bg/ts/
├── bootstrap.ts              # Service initialization and DI wiring
├── index.ts                  # Main export point
│
├── core/                     # Core infrastructure
│   ├── Container.ts          # Dependency Injection container
│   ├── EventBus.ts           # Event pub/sub system
│   └── MessageRouter.ts      # Message routing and dispatching
│
├── interfaces/               # Contracts/interfaces
│   ├── IAnkiService.ts       # Anki integration interface
│   ├── IDictionary.ts        # Dictionary lookup interface
│   ├── IMessageHandler.ts    # Message handler interface
│   ├── IOptionsStore.ts      # Options storage interface
│   ├── IAudioPlayer.ts       # Audio player interface
│   └── index.ts              # Interface exports
│
├── handlers/                 # Message handlers
│   ├── AudioHandler.ts       # Audio playback messages
│   ├── DictionaryHandler.ts  # Dictionary lookup messages
│   ├── OptionsHandler.ts     # Options change messages
│   └── index.ts              # Handler exports
│
├── services/                 # Business logic services
│   ├── AnkiConnectService.ts # AnkiConnect (local Anki)
│   ├── AnkiWebService.ts     # AnkiWeb (cloud Anki)
│   ├── NoteFormatterService.ts # Dictionary→Anki note conversion
│   └── index.ts              # Service exports
│
├── managers/                 # State management
│   └── OptionsManager.ts     # Extension options management
│
├── utils/                    # Utilities
│   ├── builtin.ts            # Built-in utilities
│   ├── deinflector.ts        # Word form normalization
│   └── validators/           # Validation utilities
│
└── types/                    # Type definitions
```

---

## Core Architecture Patterns

### Dependency Injection Container

**File**: `src/bg/ts/core/Container.ts`

**Purpose**: Centralized service management following IoC pattern

**Features**:
- Singleton and transient lifecycle scopes
- Lazy service instantiation
- Circular dependency detection
- Service registration/unregistration
- Child container support for test isolation

**Error Types**:
- `ServiceNotFoundError`
- `CircularDependencyError`
- `ServiceAlreadyRegisteredError`

**Usage**:
```typescript
const container = createContainer();
container.registerSingleton('myService', () => new MyService());
const service = container.resolve('myService');
```

---

### Event Bus (Pub/Sub)

**File**: `src/bg/ts/core/EventBus.ts`

**Purpose**: Loose coupling through event-driven architecture

**Features**:
- Typed event handling with `TypedEventBus<TEvents>`
- Handler priority support
- One-time subscriptions with `once()`
- Sync and async event emission
- Handler error catching
- Debug logging

**Key Types**:
```typescript
type EventHandler<T> = (event: T) => void;
type AsyncEventHandler<T> = (event: T) => Promise<void>;

interface SubscriptionOptions {
  priority?: number;
  once?: boolean;
}
```

---

### Message Router

**File**: `src/bg/ts/core/MessageRouter.ts`

**Purpose**: Route messages from content scripts/popup to appropriate handlers

**Features**:
- Action-based routing
- Middleware pipeline support
- Error handling and wrapping
- Handler validation

**Middleware Pattern**:
```typescript
type MessageMiddleware = (
  message: Message,
  sender: MessageSender,
  next: () => Promise<MessageResponse>
) => Promise<MessageResponse>;
```

**Built-in Middleware**:
- Logging middleware
- Validation middleware
- Rate-limiting middleware

---

## Message Handlers

### OptionsHandler

**File**: `src/bg/ts/handlers/OptionsHandler.ts`

| Property | Value |
|----------|-------|
| Action | `opt_optionsChanged` |
| Implements | `IMessageHandler<OptionsHandlerParams, ExtensionOptions>` |

**Responsibilities**:
- Handles options change messages
- Updates extension options via OptionsManager
- Returns current options

---

### DictionaryHandler

**File**: `src/bg/ts/handlers/DictionaryHandler.ts`

| Property | Value |
|----------|-------|
| Actions | `findTerm`, `getTranslation` |
| Implements | `IMessageHandler<DictionaryHandlerParams, DictionaryDefinition \| null>` |

**Responsibilities**:
- Handles dictionary lookup messages
- Dispatches dictionary lookups
- Manages dictionary registry

**Methods**:
- `addDictionary()` / `removeDictionary()` - Dictionary management
- `getDictionaries()` / `getDictionaryNames()` - Introspection

---

### AudioHandler

**File**: `src/bg/ts/handlers/AudioHandler.ts`

| Property | Value |
|----------|-------|
| Action | `playAudio` |
| Implements | `IMessageHandler<AudioHandlerParams, string \| null>` |

**Responsibilities**:
- Handles audio playback messages
- Forwards to offscreen document (Service Worker limitation)
- Manages audio callback routing

**Note**: In Service Worker environment, Web Audio API is unavailable; delegates to offscreen document.

---

## Services

### AnkiConnectService

**File**: `src/bg/ts/services/AnkiConnectService.ts`

**Purpose**: Local Anki integration via AnkiConnect plugin

**Implements**: `IAnkiService`

**Configuration**:
```typescript
interface AnkiConnectConfig {
  baseUrl?: string;      // Default: http://127.0.0.1:8765
  version?: number;      // Default: 6
  timeout?: number;      // Default: 3000ms
  fetchFn?: typeof fetch; // For testing
}
```

**Methods**:
| Method | Description |
|--------|-------------|
| `addNote()` | Add a note to Anki |
| `getDeckNames()` | Get list of deck names |
| `getModelNames()` | Get list of model/note type names |
| `getModelFieldNames()` | Get field names for a model |
| `getVersion()` | Get AnkiConnect version |
| `sync()` | Trigger Anki sync |
| `findNotes()` | Search for notes |
| `notesInfo()` | Get note information |
| `storeMediaFile()` | Store media file in Anki |

**Error Types**:
- `AnkiConnectError`
- `AnkiConnectTimeoutError`
- `AnkiConnectConnectionError`

---

### AnkiWebService

**File**: `src/bg/ts/services/AnkiWebService.ts`

**Purpose**: Cloud Anki integration via AnkiWeb

**Implements**: `IAnkiService`

**Features**:
- Web scraping and form submission to ankiweb.net
- Session-based authentication with CSRF tokens
- Profile parsing with deck/model information
- Automatic retry logic for failed operations

**Methods**:
| Method | Description |
|--------|-------------|
| `initConnection()` | Authenticate and fetch profile |
| `addNote()` | Save note to AnkiWeb |
| `getDeckNames()` | Get deck names from profile |
| `getModelNames()` | Get model names from profile |
| `getModelFieldNames()` | Get field names for a model |
| `getVersion()` | Returns 'web' if connected |

**Error Types**:
- `AnkiWebError`
- `AnkiWebLoginError`
- `AnkiWebAuthError`

---

### NoteFormatterService

**File**: `src/bg/ts/services/NoteFormatterService.ts`

**Purpose**: Convert dictionary lookups into Anki notes

**Features**:
- Customizable field mapping (ODH fields → Anki fields)
- Multi-value merging (multiple fields → single Anki field)
- Audio file naming and handling
- Tag parsing
- Duplicate option handling

**Formatting Flow**:
1. Validate options (deck, model, expression field required)
2. Build field mappings from `NoteDefinition` to Anki fields
3. Merge multiple values using separator (default: `<br>`)
4. Generate audio filenames: `ODH_<dict>_<word>_<index>.mp3`
5. Return structured `AnkiNote`

---

### OptionsManager

**File**: `src/bg/ts/managers/OptionsManager.ts`

**Purpose**: Manage extension options with persistence and change notifications

**Implements**: `IOptionsStore`

**Storage Adapters**:
| Adapter | Use Case |
|---------|----------|
| `ChromeStorageAdapter` | Production (uses chrome.storage.local/sync) |
| `MemoryStorageAdapter` | Testing (in-memory storage) |

**Methods**:
| Method | Description |
|--------|-------------|
| `load()` | Load options from storage |
| `save()` | Save complete options |
| `update()` | Partial update with defaults filling |
| `getCurrent()` | Get current cached options |
| `getDefaults()` | Get default options |
| `subscribe()` | Subscribe to changes (returns unsubscribe fn) |
| `reset()` | Restore to defaults |

---

## Service Bootstrap

**File**: `src/bg/ts/bootstrap.ts`

**Purpose**: Single entry point for initializing entire application

### Bootstrap Flow

```
1. Create core infrastructure (Container, EventBus, MessageRouter)
2. Register core services in container
3. Create and register OptionsManager
4. Create and register Anki services (AnkiConnect, AnkiWeb)
5. Create and register NoteFormatterService
6. Create and register message handlers
7. Wire up options change events
8. Register handlers with MessageRouter
9. Emit initialization complete event
10. Return BootstrapContext with all services
```

### Service Names Registry

```typescript
const SERVICE_NAMES = {
  // Core
  CONTAINER: 'container',
  EVENT_BUS: 'eventBus',
  MESSAGE_ROUTER: 'messageRouter',

  // Managers
  OPTIONS_MANAGER: 'optionsManager',

  // Services
  ANKI_CONNECT: 'ankiConnectService',
  ANKI_WEB: 'ankiWebService',
  NOTE_FORMATTER: 'noteFormatterService',

  // Handlers
  OPTIONS_HANDLER: 'optionsHandler',
  DICTIONARY_HANDLER: 'dictionaryHandler',
  AUDIO_HANDLER: 'audioHandler',
};
```

### Event Types

```typescript
const EVENTS = {
  OPTIONS_CHANGED: 'options:changed',
  OPTIONS_LOADED: 'options:loaded',
  TRANSLATION_REQUESTED: 'translation:requested',
  TRANSLATION_COMPLETED: 'translation:completed',
  NOTE_ADDED: 'note:added',
  NOTE_FAILED: 'note:failed',
  DICTIONARY_LOADED: 'dictionary:loaded',
  DICTIONARY_SELECTED: 'dictionary:selected',
  ANKI_CONNECTED: 'anki:connected',
  ANKI_DISCONNECTED: 'anki:disconnected',
};
```

### Bootstrap Context

```typescript
interface BootstrapContext {
  container: Container;
  eventBus: EventBus;
  messageRouter: MessageRouter;
  optionsManager: OptionsManager;
  ankiConnectService: AnkiConnectService;
  ankiWebService: AnkiWebService;
  noteFormatterService: NoteFormatterService;
  optionsHandler: OptionsHandler;
  dictionaryHandler: DictionaryHandler;
  audioHandler: AudioHandler;
}
```

### Usage

```typescript
const context = bootstrap({ debug: true });
// All services ready and wired
```

---

## Interfaces

### IMessageHandler

```typescript
interface IMessageHandler<TParams, TResponse> {
  handle(params: TParams, sender: MessageSender): Promise<TResponse>;
  canHandle(action: string): boolean;
}
```

### IAnkiService

```typescript
interface IAnkiService {
  getVersion(): Promise<string | null>;
  addNote(note: AnkiNote): Promise<AddNoteResult>;
  getDeckNames(): Promise<string[]>;
  getModelNames(): Promise<string[]>;
  getModelFieldNames(modelName: string): Promise<string[]>;
}
```

### IDictionary

```typescript
interface IDictionary {
  findTerm(word: string): Promise<DictionaryDefinition | null>;
  getMetadata(): DictionaryMetadata;
}
```

### IOptionsStore

```typescript
interface IOptionsStore {
  load(): Promise<ExtensionOptions>;
  save(options: ExtensionOptions): Promise<void>;
  update(changes: PartialOptions): Promise<ExtensionOptions>;
  getCurrent(): ExtensionOptions | null;
  subscribe(callback: OptionsChangeCallback): Unsubscribe;
  reset(): Promise<ExtensionOptions>;
}
```

---

## Design Patterns

| Pattern | Location | Purpose |
|---------|----------|---------|
| **Dependency Injection** | `Container.ts` | Invert control, manage dependencies |
| **Factory** | Throughout (`create*` functions) | Service instantiation |
| **Pub/Sub** | `EventBus.ts` | Loose coupling via events |
| **Middleware** | `MessageRouter.ts` | Composable message processing |
| **Strategy** | AnkiConnect vs AnkiWeb | Pluggable Anki backends |
| **Adapter** | Storage adapters | Abstract storage layer |
| **Singleton** | Global getters | Global access to services |
| **Observer** | `OptionsManager.subscribe()` | Reactive options changes |
| **Template Method** | Middleware chain | Composable pipelines |

### SOLID Principles Applied

| Principle | Implementation |
|-----------|----------------|
| **Single Responsibility** | Each handler handles one action type; each service has one concern |
| **Open/Closed** | Extension points via handlers map, middleware pipeline |
| **Liskov Substitution** | Both AnkiConnect and AnkiWeb implement IAnkiService identically |
| **Interface Segregation** | Separate interfaces (IMessageHandler, IDictionary, IAnkiService, etc.) |
| **Dependency Inversion** | Depend on interfaces/abstractions, not concrete implementations |

---

## Current State

### Modified Files (Pending Commit)

- `src/bg/ts/handlers/index.ts` - Added AudioHandler export

### Architecture Maturity

**Foundation Complete** - Ready for:
- Frontend TypeScript migration
- Test coverage expansion
- Integration testing
- Chrome API abstraction layer

### Key Technical Notes

1. **Service Worker Constraints**: Audio playback delegated to offscreen document (Service Worker cannot use Web Audio API)

2. **AnkiWeb Challenge**: Web scraping required (no official API); includes retry logic for session management

3. **Field Mapping Flexibility**: Single dictionary field can map to multiple Anki fields through merging

4. **Global Singletons**: Each core service has global getter/setter for convenience access

5. **Error Hierarchy**: Custom error types for proper error handling and debugging

6. **Storage Abstraction**: Adapter pattern allows testing without Chrome API dependency

---

## Next Steps

1. **Frontend Migration**: Migrate content scripts and popup to TypeScript
2. **Test Coverage**: Add unit tests for all services and handlers
3. **Integration Tests**: Test message flow between components
4. **Chrome API Abstraction**: Create abstraction layer for better testability
5. **Documentation**: Add JSDoc comments to all public APIs
