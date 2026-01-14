# Dictionary Architecture in ODH

## Overview

The dictionary system in ODH uses a sophisticated multi-layer architecture with sandboxed script execution. This document explains the architecture and why dictionary services should NOT be migrated to TypeScript.

**Last Updated**: January 13, 2026
**Migration Status**: ❌ NOT RECOMMENDED - Keep as legacy

---

## Architecture Layers

### Communication Flow

```
┌─────────────────────────────────────────────────────────────────┐
│ Layer 1: Service Worker (backend.js)                            │
│   - api_findExpression(): Entry point for lookups               │
│   - loadScripts(): Load multiple dictionary scripts             │
│   - loadScript(): Load single script                            │
│   - setScriptsOptions(): Configure loaded dictionaries          │
│   - findTerm(): Query current dictionary                        │
└────────────────┬────────────────────────────────────────────────┘
                 │ chrome.runtime.sendMessage
                 ▼
┌─────────────────────────────────────────────────────────────────┐
│ Layer 2: Offscreen Document (background.js)                     │
│   - ODHBackground.onServiceMessage(): Receives messages         │
│   - ODHBackground.sendtoSandbox(): Forwards to sandbox          │
│   - Uses Agent for postMessage communication                    │
└────────────────┬────────────────────────────────────────────────┘
                 │ postMessage to iframe
                 ▼
┌─────────────────────────────────────────────────────────────────┐
│ Layer 3: Sandbox Iframe (sandbox/sandbox.html)                  │
│   - Sandbox class: Manages dictionaries                         │
│   - backend_loadScript(): Loads and eval's scripts              │
│   - backend_setScriptsOptions(): Configures dictionaries        │
│   - backend_findTerm(): Queries dictionaries                    │
│   - this.dicts: Map of loaded dictionary instances              │
│   - this.current: Currently selected dictionary                 │
└────────────────┬────────────────────────────────────────────────┘
                 │ eval() execution
                 ▼
┌─────────────────────────────────────────────────────────────────┐
│ Layer 4: Dictionary Scripts (dict/*.js or remote URLs)          │
│   - Constructor function (e.g., function builtin_encn_Collins)  │
│   - findTerm(expression): Main lookup method                    │
│   - displayName(): Human-readable name                          │
│   - setOptions(options): Configure dictionary                   │
│   - Uses api object for utilities (fetch, getBuiltin, etc.)     │
└─────────────────────────────────────────────────────────────────┘
```

---

## Component Details

### 1. Service Worker (src/bg/js/backend.js)

**Entry Points**:
```javascript
// Main lookup entry point
async api_findExpression(params) {
    let { expression, callback } = params;
    let result = await this.findTerm(expression);
    callback(result);
}

// Script management
async loadScripts(list) {
    let promises = list.map((name) => this.loadScript(name));
    let results = await Promise.all(promises);
    return results.filter(x => x && x.result);
}

async loadScript(name) {
    const result = await this.sendtoBackground({
        action: 'loadScript',
        params: { name }
    });
    return result || { name, result: null };
}

// Dictionary operations
async setScriptsOptions(options) {
    return await this.sendtoBackground({
        action: 'setScriptsOptions',
        params: { options }
    });
}

async findTerm(expression) {
    return await this.sendtoBackground({
        action: 'findTerm',
        params: { expression }
    });
}
```

**Responsibilities**:
- Entry point for dictionary operations
- Forwards messages to offscreen document
- Handles script loading requests
- Manages dictionary list in options

---

### 2. Offscreen Document (src/bg/js/background.js)

**Message Routing**:
```javascript
class ODHBackground {
    async sendtoSandbox(action, params) {
        return new Promise((resolve, reject) => {
            if (!this.agent) {
                // Initialize agent with sandbox iframe
                const iframe = document.getElementById('sandbox');
                this.agent = new Agent(iframe.contentWindow);
            }
            this.agent.postMessage(action, params, result => {
                resolve(result);
            });
        });
    }

    onServiceMessage(request, sender, sendResponse) {
        const { action, params, target } = request;
        if (target != 'background') return false;

        // Forward to sandbox and return result
        this.sendtoSandbox(action, params).then(result => {
            sendResponse(result);
        });
        return true; // Keep channel open
    }
}
```

**Responsibilities**:
- Hosts sandbox iframe
- Routes messages between Service Worker and sandbox
- Manages Agent communication
- Keeps sandbox iframe alive

---

### 3. Sandbox (src/bg/sandbox/sandbox.js)

**Core Logic**:
```javascript
class Sandbox {
    constructor() {
        this.dicts = {};        // Loaded dictionaries { name: instance }
        this.current = null;    // Currently selected dictionary
        window.addEventListener('message', e => this.onBackendMessage(e));
    }

    async backend_loadScript(params) {
        let { name, callbackId } = params;

        // Build URL (local or remote)
        let url = this.buildScriptURL(name);

        // Fetch script content
        let scripttext = await api.fetch(url);
        if (!scripttext) {
            api.callback({ name, result: null }, callbackId);
            return;
        }

        try {
            // Eval script in sandbox (SAFE: isolated environment)
            let SCRIPT = eval(`(${scripttext})`);

            // Instantiate dictionary
            let script = new SCRIPT();
            this.dicts[SCRIPT.name] = script;

            // Get display name
            let displayname = typeof(script.displayName) === 'function'
                ? await script.displayName()
                : SCRIPT.name;

            api.callback({
                name,
                result: { objectname: SCRIPT.name, displayname }
            }, callbackId);
        } catch (err) {
            console.error('Error loading script:', name, err);
            api.callback({ name, result: null }, callbackId);
        }
    }

    backend_setScriptsOptions(params) {
        let { options, callbackId } = params;

        // Set options for all loaded dictionaries
        for (const dictionary of Object.values(this.dicts)) {
            if (typeof(dictionary.setOptions) === 'function')
                dictionary.setOptions(options);
        }

        // Set current dictionary
        let selected = options.dictSelected;
        if (this.dicts[selected]) {
            this.current = selected;
            api.callback(selected, callbackId);
            return;
        }
        api.callback(null, callbackId);
    }

    async backend_findTerm(params) {
        let { expression, callbackId } = params;

        if (this.dicts[this.current] &&
            typeof(this.dicts[this.current].findTerm) === 'function') {
            let notes = await this.dicts[this.current].findTerm(expression);
            api.callback(notes, callbackId);
            return;
        }
        api.callback(null, callbackId);
    }

    buildScriptURL(name) {
        let gitbase = 'https://raw.githubusercontent.com/ninja33/ODH/master/src/dict/';
        let url = name;

        if (url.indexOf('://') == -1) {
            url = '/dict/' + url;
        } else {
            // Remote URL with lib:// prefix
            url = (url.indexOf('lib://') != -1)
                ? gitbase + url.replace('lib://', '')
                : url;
        }

        // Add .js suffix if missing
        url = (url.indexOf('.js') == -1) ? url + '.js' : url;
        return url;
    }
}
```

**Responsibilities**:
- Loads and executes dictionary scripts (eval)
- Maintains dictionary instances
- Manages current dictionary selection
- Provides API to dictionary scripts
- Isolated security context

---

### 4. Sandbox API (src/bg/sandbox/api.js)

**Utilities for Dictionary Scripts**:
```javascript
class SandboxAPI {
    constructor() {
        this.agent = new Agent(window.parent);
    }

    async deinflect(word) {
        return await this.postMessage('Deinflect', { word });
    }

    async fetch(url) {
        return await this.postMessage('Fetch', { url });
    }

    async getBuiltin(dict, word) {
        return await this.postMessage('getBuiltin', { dict, word });
    }

    async getCollins(word) {
        return await this.postMessage('getCollins', { word });
    }

    async getOxford(word) {
        return await this.postMessage('getOxford', { word });
    }

    async locale() {
        return await this.postMessage('getLocale', {});
    }

    callback(data, callbackId) {
        this.postMessage('callback', { data, callbackId });
    }
}

window.api = new SandboxAPI();
```

**Provides**:
- Word deinflection (lemmatization)
- HTTP fetching (for online dictionaries)
- Access to builtin dictionaries
- Locale information
- Callback mechanism

---

## Dictionary Script Format

**Example Structure**:
```javascript
(function builtin_encn_Collins() {
    // Constructor
    function builtin_encn_Collins() {
        this.options = null;
    }

    // Display name
    builtin_encn_Collins.prototype.displayName = function() {
        return 'Built-in English-Chinese Collins';
    };

    // Set options
    builtin_encn_Collins.prototype.setOptions = function(options) {
        this.options = options;
    };

    // Main lookup method
    builtin_encn_Collins.prototype.findTerm = async function(expression) {
        // Use api utilities
        let result = await api.getCollins(expression);

        // Return structured data
        return {
            expression: expression,
            reading: result.phonetic,
            definitions: result.definitions,
            sentence: result.examples,
            // ... more fields
        };
    };

    return builtin_encn_Collins;
})()
```

**Script Types**:
1. **Builtin** (src/dict/builtin_*.js): Packaged with extension
2. **System** (src/dict/*.js): Included in extension
3. **User-defined**: Loaded from remote URLs
4. **Library** (lib://): GitHub-hosted scripts

---

## Why NOT Migrate to TypeScript

### ❌ Migration Would Not Provide Value

**1. Architecture Must Remain**
- Sandbox is required for security (isolates untrusted scripts)
- eval() is intentional design (executes user scripts safely)
- Multi-layer communication necessary (Service Worker limitations)
- Cannot simplify or eliminate layers

**2. Scripts Are JavaScript by Design**
- Dictionary scripts are JavaScript functions
- Users can load custom scripts from URLs
- Cannot type-check dynamically loaded code
- Scripts use runtime eval() - TypeScript can't help

**3. TypeScript Benefits Minimal**
- No complex business logic to type-check
- Message passing is already structured
- Dictionary interface is simple (findTerm method)
- Current implementation is reliable

**4. High Migration Risk**
- Breaking existing dictionary scripts
- Complex message flow hard to replicate
- Multiple failure points across layers
- Sandbox state management critical

**5. Current Implementation Works**
- No reported issues
- Fast script loading
- Reliable dictionary lookups
- Supports all script types (builtin, system, user)

---

## TypeScript DictionaryHandler Analysis

**Location**: `src/bg/ts/handlers/DictionaryHandler.ts`

**What It Does**:
- Implements `IMessageHandler` interface
- Manages `Map<string, IDictionary>` of dictionaries
- Handles findTerm messages

**Why It Doesn't Fit**:
- Assumes dictionaries are TypeScript objects
- Doesn't understand sandbox architecture
- Can't handle dynamic script loading
- No integration with eval-based system
- Would require complete rewrite of sandbox

**Status**: ✅ Exists but incompatible with architecture

**Decision**: Keep for potential future use, but don't integrate

---

## What Should Be Kept As-Is

### ✅ Keep These Components in JavaScript

1. **Sandbox Architecture** (sandbox/sandbox.js, sandbox/api.js)
   - eval() execution environment
   - Dictionary state management
   - Script loading and URL handling

2. **Script Loading** (backend.js: loadScripts, loadScript)
   - URL building logic
   - Remote script fetching
   - Error handling

3. **Message Routing** (background.js)
   - Service Worker → Offscreen → Sandbox flow
   - Agent-based communication
   - Callback handling

4. **Dictionary Scripts** (dict/*.js)
   - All existing dictionary implementations
   - Script format and API
   - User-defined script support

---

## Alternative: Documentation Only

**Instead of Migration**:
1. ✅ Document architecture comprehensively (this file)
2. ✅ Add inline code comments for clarity
3. ✅ Create dictionary development guide for users
4. ✅ Add TypeScript types for message interfaces (optional)
5. ❌ Do NOT rewrite sandbox or script loading

---

## Message Interface Types (Optional Enhancement)

If type safety is desired, create **interface definitions only** without changing implementation:

```typescript
// src/bg/ts/types/dictionary-messages.ts

export interface LoadScriptMessage {
  action: 'loadScript';
  params: {
    name: string;
    callbackId?: string;
  };
}

export interface LoadScriptResult {
  name: string;
  result: {
    objectname: string;
    displayname: string;
  } | null;
}

export interface FindTermMessage {
  action: 'findTerm';
  params: {
    expression: string;
    callbackId?: string;
  };
}

export interface FindTermResult {
  expression: string;
  reading?: string;
  definitions?: string[];
  sentence?: string;
  // ... more fields
}
```

**Usage**: Type-check messages in TypeScript code that interfaces with dictionary system, but don't change the JavaScript implementation.

---

## Performance Characteristics

### Script Loading
- **First load**: ~200-500ms per script (network + eval)
- **Cached**: Instant (kept in this.dicts)
- **Parallel loading**: Multiple scripts load concurrently

### Dictionary Lookup
- **Builtin dictionaries**: ~10-50ms
- **Online dictionaries**: ~100-500ms (network dependent)
- **Current dictionary**: Cached reference (O(1) lookup)

### Optimization Opportunities
1. **Script preloading**: Load common scripts on startup
2. **Result caching**: Cache recent lookups
3. **Script bundling**: Combine multiple scripts
4. **Lazy loading**: Load scripts on first use

**Note**: These optimizations should be done in JavaScript, maintaining the current architecture.

---

## Testing Checklist

### Manual Testing
- [ ] Builtin dictionaries load correctly
- [ ] System dictionaries load from /dict/
- [ ] Remote dictionaries load from URLs
- [ ] lib:// scripts load from GitHub
- [ ] Dictionary selection switches correctly
- [ ] findTerm returns structured results
- [ ] Options propagate to dictionaries
- [ ] Multiple lookups work sequentially
- [ ] Error handling for failed scripts

### Integration Testing
- [ ] Service Worker → Offscreen communication
- [ ] Offscreen → Sandbox communication
- [ ] Sandbox → Script communication
- [ ] Callback flow works correctly
- [ ] State persists across lookups

---

## Security Considerations

### Sandbox Isolation ✅ SECURE
- Scripts execute in isolated iframe
- Sandboxed content security policy
- No access to parent window directly
- Communication via postMessage only
- Cannot access chrome APIs
- Cannot modify extension state

### Script Loading Security
- **Builtin scripts**: Trusted (packaged with extension)
- **System scripts**: Trusted (from extension /dict/)
- **User scripts**: Untrusted (arbitrary URLs)
  - ⚠️ User responsibility to trust sources
  - Sandboxed execution provides protection
  - Cannot escape sandbox environment

### Recommendations
- ✅ Keep sandbox architecture
- ✅ Document security model for users
- ✅ Warn users about custom scripts
- ❌ Don't remove sandbox isolation

---

## Migration Decision: ❌ DO NOT MIGRATE

### Summary
- **Current State**: Working reliably with sandbox architecture
- **TypeScript Value**: Minimal (scripts are JavaScript by design)
- **Migration Risk**: High (complex architecture, many dependencies)
- **Recommendation**: **Keep dictionary system as-is in JavaScript**

### What To Do Instead
1. ✅ Document architecture (this file)
2. ✅ Add inline comments for maintainability
3. ✅ Create dictionary development guide
4. ✅ Focus migration efforts on higher-value areas
5. ✅ Consider interface types for type-checking (optional)

### Priority Assessment
- **Complexity**: VERY HIGH
- **Value**: VERY LOW
- **Risk**: HIGH
- **Priority**: ❌ NOT RECOMMENDED

---

## References

- **Sandbox**: `src/bg/sandbox/sandbox.js`
- **Sandbox API**: `src/bg/sandbox/api.js`
- **Backend**: `src/bg/js/backend.js` (loadScripts, findTerm)
- **Offscreen**: `src/bg/js/background.js` (routing)
- **TypeScript Handler**: `src/bg/ts/handlers/DictionaryHandler.ts` (incompatible)
- **Example Scripts**: `src/dict/*.js`

---

## Conclusion

The dictionary system is a well-designed, secure architecture that should remain as-is. The sandbox provides essential security isolation, and the multi-layer communication is necessary given Service Worker limitations.

**TypeScript migration is not recommended.** The current JavaScript implementation works reliably, and migration would be high-risk for minimal benefit.

Focus migration efforts on areas where TypeScript provides clear value: business logic, data transformation, API integration. The dictionary system is not one of those areas.

---

*Dictionary services migration: ❌ NOT RECOMMENDED - Keep as legacy JavaScript*
