# Architecture Review: SOLID, Security, Clean Break

## Overview

This document reviews the current ODH TypeScript migration with a focus on:
1. **SOLID Principles** - Design quality
2. **Security** - Protection against threats
3. **Clean Architecture** - No backward compatibility with legacy JavaScript

**Decision**: Remove all legacy code and compatibility layers. Build clean TypeScript-only architecture.

---

## Current State Analysis

### What Exists

```
src/bg/
├── ts/                     # TypeScript (NEW - KEEP)
│   ├── core/              # Container, EventBus, MessageRouter
│   ├── interfaces/        # IAnkiService, IDictionary, etc.
│   ├── services/          # AnkiConnectService, AnkiWebService, etc.
│   ├── handlers/          # OptionsHandler, AudioHandler, etc.
│   ├── managers/          # OptionsManager
│   └── bootstrap.ts       # Service initialization
│
├── js/                     # JavaScript (LEGACY - DELETE)
│   ├── backend.js         # 619 lines - REPLACE with TypeScript
│   ├── options-compat.js  # Compat layer - DELETE
│   ├── anki-compat.js     # Compat layer - DELETE
│   ├── ankiconnect.js     # Legacy - Already replaced by TS
│   ├── ankiweb.js         # Legacy - Already replaced by TS
│   ├── utils.js           # Some utilities - MIGRATE or DELETE
│   ├── deinflector.js     # Already in TS
│   ├── builtin.js         # Already in TS
│   └── agent.js           # Sandbox communication - KEEP for now
│
└── sandbox/               # Sandbox (KEEP - Security requirement)
    ├── sandbox.html
    ├── sandbox.js         # eval() execution - KEEP
    └── api.js             # Sandbox API - KEEP
```

---

## SOLID Principles Analysis

### S - Single Responsibility Principle

**VIOLATIONS FOUND:**

1. **bootstrap.ts** - Does too much:
   - Creates ALL services
   - Wires ALL dependencies
   - Registers ALL handlers
   - Sets up ALL event subscriptions
   - **Fix**: Split into separate modules (ServiceFactory, HandlerRegistry, EventWiring)

2. **backend.js (legacy)** - ODHBack class is a "God Object":
   - Message handling
   - Options management
   - Anki communication
   - Dictionary management
   - Audio playback
   - Tab management
   - **Fix**: DELETE entirely, use TypeScript services

3. **OptionsManager** - Mostly good, but handles:
   - Storage
   - Validation
   - Change notification
   - **Acceptable**: These are cohesive operations on Options

### O - Open/Closed Principle

**VIOLATIONS FOUND:**

1. **MessageRouter** - Good, but:
   - Handler registration is open (good)
   - Middleware is extensible (good)
   - ✅ NO VIOLATION

2. **bootstrap.ts** - Must be modified to add new services:
   - **Fix**: Use module-based registration pattern

### L - Liskov Substitution Principle

**CURRENT STATE - GOOD:**

1. **IAnkiService** - Both implementations are interchangeable:
   - AnkiConnectService ✅
   - AnkiWebService ✅

2. **IMessageHandler** - All handlers are interchangeable ✅

### I - Interface Segregation Principle

**VIOLATIONS FOUND:**

1. **IAnkiService** - Too broad:
   ```typescript
   interface IAnkiService {
     getVersion(): Promise<string | null>;
     addNote(note: AnkiNote): Promise<AddNoteResult>;
     getDeckNames(): Promise<string[]>;
     getModelNames(): Promise<string[]>;
     getModelFieldNames(modelName: string): Promise<string[]>;
     // Should split into:
     // - IAnkiConnection (getVersion)
     // - IAnkiNoteService (addNote)
     // - IAnkiMetadataService (getDeckNames, getModelNames, getModelFieldNames)
   }
   ```

2. **IOptionsStore** - Could be cleaner:
   ```typescript
   // Current - acceptable but could split:
   interface IOptionsStore {
     load(): Promise<ExtensionOptions>;
     save(options: ExtensionOptions): Promise<void>;
     // Read operations
     getCurrent(): ExtensionOptions | null;
     getDefaults(): ExtensionOptions;
     // Write operations
     update(changes: PartialOptions): Promise<ExtensionOptions>;
     reset(): Promise<ExtensionOptions>;
     // Observation
     subscribe(callback: OptionsChangeCallback): Unsubscribe;
   }
   ```

### D - Dependency Inversion Principle

**CURRENT STATE - MIXED:**

1. **Container.ts** - GOOD: Enables DI properly

2. **bootstrap.ts** - VIOLATION:
   ```typescript
   // Current - Creates concrete implementations directly
   const ankiConnectService = createAnkiConnectService();

   // Should use - Factory registration
   container.register('ankiService', (c) => {
     const options = c.resolve<OptionsManager>('options');
     return options.getCurrent()?.services === 'ankiweb'
       ? new AnkiWebService()
       : new AnkiConnectService();
   });
   ```

3. **Handlers** - GOOD: Depend on interfaces, not implementations

---

## Security Analysis

### Current Security Model

```
┌─────────────────────────────────────────────────────────────┐
│ TRUSTED ZONE                                                 │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Service Worker (TypeScript)                              │ │
│ │ - Options management                                     │ │
│ │ - Anki communication                                     │ │
│ │ - Message routing                                        │ │
│ └─────────────────────────────────────────────────────────┘ │
│                           │                                  │
│                           ▼                                  │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Offscreen Document                                       │ │
│ │ - Audio playback (Web Audio API)                        │ │
│ │ - Sandbox host                                          │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ UNTRUSTED ZONE (Sandboxed)                                   │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Sandbox iframe                                           │ │
│ │ - eval() execution of dictionary scripts                │ │
│ │ - Isolated from extension APIs                          │ │
│ │ - No access to chrome.* APIs                            │ │
│ │ - Communication only via postMessage                    │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### Security Strengths ✅

1. **Sandbox Isolation**: Dictionary scripts run in isolated sandbox
2. **No Direct Chrome API Access**: Sandbox cannot access chrome.*
3. **Message-Based Communication**: All cross-boundary communication via messages
4. **Content Security Policy**: Manifest enforces CSP

### Security Weaknesses ⚠️

1. **No Input Validation on Messages**:
   ```typescript
   // Current - No validation
   async handle(params: AudioHandlerParams, sender: MessageSender) {
     // Directly uses params.url without validation
     const result = await this.sendToOffscreen({
       action: 'playAudio',
       params: { url: params.url }  // URL not validated!
     });
   }
   ```

2. **No Origin Verification**:
   ```typescript
   // Should verify sender.origin or sender.url
   if (!this.isAllowedSender(sender)) {
     throw new SecurityError('Unauthorized sender');
   }
   ```

3. **Credential Storage** (AnkiWeb):
   ```typescript
   // Passwords stored in chrome.storage.local
   // Consider: Don't store passwords, use session-only
   ```

4. **Error Information Leakage**:
   ```typescript
   // Current - Exposes internal errors
   catch (error) {
     console.error('Error:', error);  // Logs sensitive info
     return null;
   }
   ```

### Security Fixes Required

1. **Message Validation Layer**:
   ```typescript
   // Create validation middleware
   function validateMessage(schema: Schema) {
     return (message: Message, sender: MessageSender, next: Function) => {
       const result = schema.safeParse(message.params);
       if (!result.success) {
         throw new ValidationError('Invalid message parameters');
       }
       return next();
     };
   }
   ```

2. **URL Validation**:
   ```typescript
   function isValidAudioUrl(url: string): boolean {
     try {
       const parsed = new URL(url);
       return ['http:', 'https:', 'data:'].includes(parsed.protocol);
     } catch {
       return false;
     }
   }
   ```

3. **Sender Verification**:
   ```typescript
   function isAllowedSender(sender: MessageSender): boolean {
     // Only allow messages from our extension
     return sender.extensionId === chrome.runtime.id;
   }
   ```

---

## Revised Migration Plan

### Phase 1: Clean Break - Remove Legacy JavaScript

**Goal**: Delete all legacy JavaScript, create pure TypeScript service worker

**Files to DELETE**:
```
src/bg/js/backend.js         # Replace with TypeScript BackendService
src/bg/js/options-compat.js  # No longer needed
src/bg/js/anki-compat.js     # No longer needed
src/bg/js/ankiconnect.js     # Already in TypeScript
src/bg/js/ankiweb.js         # Already in TypeScript
src/bg/js/options.js         # Already in TypeScript (OptionsManager)
```

**Files to KEEP (for now)**:
```
src/bg/js/agent.js           # Sandbox communication (migrate later)
src/bg/js/utils.js           # Some utilities (migrate utilities needed)
src/bg/js/deinflector.js     # Already in TypeScript (keep JS for sandbox)
src/bg/js/builtin.js         # Already in TypeScript (keep JS for sandbox)
```

**Files to CREATE**:
```
src/bg/ts/BackendService.ts          # Main service worker logic
src/bg/ts/TabManager.ts              # Tab management
src/bg/ts/ChromeApiAdapter.ts        # Chrome API abstraction
src/bg/ts/security/Validator.ts      # Input validation
src/bg/ts/security/Sanitizer.ts      # Output sanitization
```

### Phase 2: SOLID Refactoring

**2.1 Split bootstrap.ts**:
```
src/bg/ts/bootstrap/
├── index.ts                  # Main bootstrap entry
├── ServiceFactory.ts         # Creates service instances
├── HandlerRegistry.ts        # Registers message handlers
├── EventWiring.ts            # Sets up event subscriptions
└── ContainerConfig.ts        # Container configuration
```

**2.2 Split IAnkiService**:
```typescript
// New interfaces
interface IAnkiConnection {
  getVersion(): Promise<string | null>;
  isConnected(): boolean;
}

interface IAnkiNoteService {
  addNote(note: AnkiNote): Promise<AddNoteResult>;
}

interface IAnkiMetadata {
  getDeckNames(): Promise<string[]>;
  getModelNames(): Promise<string[]>;
  getModelFieldNames(modelName: string): Promise<string[]>;
}

// Composed interface (for convenience)
interface IAnkiService extends IAnkiConnection, IAnkiNoteService, IAnkiMetadata {}
```

**2.3 Factory Pattern for Services**:
```typescript
// ServiceFactory.ts
export class ServiceFactory {
  constructor(private container: Container) {}

  createAnkiService(type: 'connect' | 'web'): IAnkiService {
    return type === 'web'
      ? this.container.resolve<AnkiWebService>('AnkiWebService')
      : this.container.resolve<AnkiConnectService>('AnkiConnectService');
  }
}
```

### Phase 3: Security Hardening

**3.1 Create Validation Layer**:
```typescript
// src/bg/ts/security/Validator.ts
import { z } from 'zod';  // Or manual validation

export const AudioParamsSchema = z.object({
  url: z.string().url().refine(url => {
    const parsed = new URL(url);
    return ['http:', 'https:', 'data:'].includes(parsed.protocol);
  }),
  callbackId: z.string().optional()
});

export const OptionsSchema = z.object({
  enabled: z.boolean(),
  services: z.enum(['none', 'ankiconnect', 'ankiweb']),
  // ... complete schema
});
```

**3.2 Secure Message Middleware**:
```typescript
// src/bg/ts/middleware/SecurityMiddleware.ts
export function securityMiddleware(
  message: Message,
  sender: MessageSender,
  next: () => Promise<MessageResponse>
): Promise<MessageResponse> {
  // 1. Verify sender
  if (!isAllowedSender(sender)) {
    return Promise.resolve({
      success: false,
      error: 'Unauthorized'
    });
  }

  // 2. Validate message structure
  if (!isValidMessage(message)) {
    return Promise.resolve({
      success: false,
      error: 'Invalid message format'
    });
  }

  // 3. Continue to handler
  return next();
}
```

**3.3 Sanitize Storage**:
```typescript
// Don't store passwords
interface SecureOptions extends Omit<ExtensionOptions, 'password'> {
  // Password not persisted
}

// Session-only credentials
class CredentialManager {
  private credentials = new Map<string, string>();

  setPassword(service: string, password: string): void {
    this.credentials.set(service, password);
  }

  getPassword(service: string): string | undefined {
    return this.credentials.get(service);
  }

  clearAll(): void {
    this.credentials.clear();
  }
}
```

### Phase 4: New Architecture

```
src/bg/ts/
├── bootstrap/
│   ├── index.ts              # Entry point
│   ├── ServiceFactory.ts     # Service creation
│   ├── HandlerRegistry.ts    # Handler registration
│   └── EventWiring.ts        # Event setup
│
├── core/
│   ├── Container.ts          # DI Container
│   ├── EventBus.ts           # Pub/Sub
│   ├── MessageRouter.ts      # Message routing
│   └── ChromeApiAdapter.ts   # Chrome API abstraction
│
├── interfaces/
│   ├── anki/
│   │   ├── IAnkiConnection.ts
│   │   ├── IAnkiNoteService.ts
│   │   └── IAnkiMetadata.ts
│   ├── IMessageHandler.ts
│   ├── IOptionsStore.ts
│   └── IDictionary.ts
│
├── services/
│   ├── anki/
│   │   ├── AnkiConnectService.ts
│   │   └── AnkiWebService.ts
│   ├── BackendService.ts     # Main backend logic
│   ├── TabManager.ts         # Tab management
│   └── NoteFormatterService.ts
│
├── handlers/
│   ├── OptionsHandler.ts
│   ├── TranslationHandler.ts
│   ├── NoteHandler.ts
│   └── AudioHandler.ts
│
├── security/
│   ├── Validator.ts          # Input validation
│   ├── Sanitizer.ts          # Output sanitization
│   ├── CredentialManager.ts  # Secure credentials
│   └── SecurityMiddleware.ts # Message security
│
├── managers/
│   └── OptionsManager.ts
│
└── utils/
    ├── deinflector.ts
    └── builtin.ts
```

### Phase 5: Service Worker Entry Point

**New**: `src/bg/ts/service-worker.ts`
```typescript
/**
 * Service Worker Entry Point
 * Pure TypeScript - No legacy JavaScript
 */

import { bootstrap } from './bootstrap';
import { securityMiddleware } from './security/SecurityMiddleware';

// Initialize application
const context = bootstrap({ debug: false });

// Add security middleware
context.messageRouter.use(securityMiddleware);

// Register Chrome listeners
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  context.messageRouter.route(message, {
    tabId: sender.tab?.id,
    frameId: sender.frameId,
    extensionId: sender.id,
    url: sender.url,
    origin: sender.origin
  })
  .then(response => sendResponse(response))
  .catch(error => sendResponse({ success: false, error: 'Internal error' }));

  return true; // Keep channel open for async response
});

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    chrome.tabs.create({ url: chrome.runtime.getURL('bg/guide.html') });
  }
});

// Export for testing
export { context };
```

---

## Implementation Order

### Step 1: Security First
1. Create `security/Validator.ts` with schemas
2. Create `security/SecurityMiddleware.ts`
3. Add middleware to MessageRouter
4. Add input validation to all handlers

### Step 2: Split Bootstrap
1. Create `bootstrap/ServiceFactory.ts`
2. Create `bootstrap/HandlerRegistry.ts`
3. Create `bootstrap/EventWiring.ts`
4. Refactor `bootstrap/index.ts` to use them

### Step 3: Create BackendService
1. Create `services/BackendService.ts`
2. Migrate logic from backend.js
3. Use DI for all dependencies
4. Add proper error handling

### Step 4: Create Service Worker Entry
1. Create `service-worker.ts`
2. Update manifest to use compiled JS
3. Delete legacy `background.js` import
4. Test thoroughly

### Step 5: Delete Legacy
1. Delete `options-compat.js`
2. Delete `anki-compat.js`
3. Delete `backend.js`
4. Delete other unused JS files
5. Update build process

---

## Testing Strategy

### Unit Tests
- All services testable via DI
- Mock Chrome APIs
- Test security validation

### Integration Tests
- Test message flow
- Test handler registration
- Test event propagation

### Security Tests
- Test input validation rejects bad input
- Test sender verification
- Test error handling doesn't leak info

---

## Summary

### What Changes

| Current | New |
|---------|-----|
| Legacy + TypeScript hybrid | Pure TypeScript |
| Compatibility layers | Direct TypeScript usage |
| Global `self.odhback` | DI Container services |
| No input validation | Strict validation |
| Password in storage | Session-only credentials |
| Monolithic bootstrap | Modular bootstrap |
| Broad interfaces | Segregated interfaces |

### Benefits

1. **Simpler**: No compatibility layers
2. **Safer**: Input validation, sender verification
3. **Testable**: All services via DI
4. **Maintainable**: Clear separation of concerns
5. **Type-Safe**: End-to-end TypeScript

### Risks

1. **Breaking Change**: No gradual migration
2. **Testing Required**: Full regression testing needed
3. **Sandbox**: Must keep JavaScript for eval()

---

## Next Steps

1. [ ] Review and approve this plan
2. [ ] Create security validation layer
3. [ ] Split bootstrap into modules
4. [ ] Create BackendService
5. [ ] Create service worker entry
6. [ ] Delete legacy JavaScript
7. [ ] Update build process
8. [ ] Comprehensive testing

---

*This document supersedes the backward-compatible migration approach in favor of a clean TypeScript architecture.*
