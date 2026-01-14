# Audio Architecture in ODH

## Overview

Audio playback in ODH follows a three-layer architecture due to Service Worker limitations. Service Workers cannot use the Web Audio API directly, so audio playback is delegated to an offscreen document.

**Last Updated**: January 13, 2026

---

## Current Architecture

### Audio Flow

```
1. Content Script / Popup
   └─> Requests audio playback
       ↓ chrome.runtime.sendMessage

2. Service Worker (backend.js)
   └─> api_playAudio(params)
       ↓ this.sendtoBackground({ action: 'playAudio', params: { url } })

3. Offscreen Document (background.html)
   └─> ODHBackground.onServiceMessage()
       └─> ODHBackground.playAudio(url)
           └─> new Audio(url).play()
```

### Key Components

#### 1. Service Worker (src/bg/js/backend.js)

```javascript
async api_playAudio(params) {
    let { url, callback } = params;

    // Forward to offscreen document
    const result = await this.sendtoBackground({
        action: 'playAudio',
        params: { url }
    });

    if (callback) {
        callback(result);
    }
}
```

**Purpose**: Entry point for audio playback requests. Forwards to offscreen document.

#### 2. Offscreen Document (src/bg/background.html + src/bg/js/background.js)

```javascript
class ODHBackground {
    constructor() {
        this.audios = {}; // Audio cache
        chrome.runtime.onMessage.addListener(this.onServiceMessage.bind(this));
    }

    playAudio(url) {
        // Stop any currently playing audio
        for (let key in this.audios) {
            this.audios[key].pause();
        }

        // Play new audio
        const audio = this.audios[url] || new Audio(url);
        audio.currentTime = 0;
        audio.play();
        this.audios[url] = audio; // Cache for reuse
    }

    onServiceMessage(request, sender, sendResponse) {
        const { action, params } = request;

        if (action == 'playAudio') {
            let { url } = params;
            this.playAudio(url);
            sendResponse(url);
            return true;
        }
        // ... other handlers
    }
}
```

**Purpose**: Actual audio playback using Web Audio API. Runs in offscreen document context where Audio API is available.

**Features**:
- Audio caching (reuses Audio objects)
- Stops previous audio before playing new one
- Returns URL on success

---

## TypeScript Implementation

### AudioHandler (src/bg/ts/handlers/AudioHandler.ts)

**Status**: ✅ Implemented but not yet integrated

The TypeScript AudioHandler is fully implemented and follows the same pattern:

```typescript
export class AudioHandler implements IMessageHandler<AudioHandlerParams, string | null> {
  async handle(params: AudioHandlerParams, _sender: MessageSender): Promise<string | null> {
    if (!params?.url) {
      throw new Error('Invalid params: url is required');
    }

    // Forward to offscreen document
    try {
      const result = await this.sendToOffscreen({
        action: 'playAudio',
        params: { url: params.url }
      });

      // Handle callback if present
      if (params.callbackId) {
        await this.sendToOffscreen({
          action: 'sandboxCallback',
          params: { callbackId: params.callbackId, data: result },
          target: 'background'
        });
      }

      return result as string | null;
    } catch (error) {
      console.error('Error playing audio:', error);
      return null;
    }
  }

  canHandle(action: string): boolean {
    return action === 'playAudio';
  }
}
```

**Features**:
- Type-safe parameters and return values
- Proper error handling with logging
- Callback support for async responses
- Implements IMessageHandler interface
- Can be used with MessageRouter

---

## Integration Status

### Current State

| Component | Implementation | Status | Notes |
|-----------|---------------|--------|-------|
| **Service Worker Entry** | backend.js: api_playAudio | ✅ Working | Legacy implementation |
| **Offscreen Document** | background.js: ODHBackground | ✅ Working | Handles actual playback |
| **TypeScript Handler** | AudioHandler.ts | ✅ Complete | Not yet integrated |
| **Bootstrap** | bootstrap.ts | ✅ Registered | Available via tsServices |

### Why Not Yet Integrated?

The audio implementation is already working correctly with the legacy code. The TypeScript AudioHandler provides:
- Type safety
- Better error handling
- Interface compliance

However, the added value is minimal because:
1. Audio playback is simple (just forwarding messages)
2. Legacy implementation works reliably
3. No complex business logic to benefit from TypeScript
4. Higher priority migrations (dictionary services) remain

### Integration Approach (When Ready)

**Option 1: Compatibility Layer (Recommended)**

Create `audio-compat.js` similar to options-compat and anki-compat:

```javascript
// Override api_playAudio to use TypeScript AudioHandler
ODHBack.prototype.api_playAudio = async function(params) {
    if (this.tsServices && this.tsServices.audioHandler) {
        // Use TypeScript implementation
        return await this.tsServices.audioHandler.handle(params, {});
    }

    // Fallback to legacy
    return await this.sendtoBackground({
        action: 'playAudio',
        params: { url: params.url }
    });
};
```

Then load in background.js:
```javascript
importScripts(
    // ... other scripts
    'js/audio-compat.js',
    'js/backend.js'
);
```

**Option 2: MessageRouter Integration**

Use MessageRouter to handle 'playAudio' actions:

```typescript
// In bootstrap or after initialization
messageRouter.registerHandler('playAudio', audioHandler);
```

Then update backend.js to use messageRouter for audio messages.

**Option 3: Keep as-is**

The current implementation works fine. Leave audio as legacy code until all critical services are migrated. Migrate during final cleanup phase.

---

## Offscreen Document Architecture

The offscreen document serves multiple purposes:

### 1. Audio Playback
- Uses Web Audio API (not available in Service Worker)
- Manages audio caching
- Controls playback state

### 2. Sandbox Communication Bridge
- Hosts sandbox iframe
- Routes messages between Service Worker and sandbox
- Provides Agent for postMessage communication

### 3. Background Task Host
- Runs in background context (not Service Worker)
- Has access to full Web APIs
- Persistent while extension is active

### Structure

```
background.html (Offscreen Document)
├── js/agent.js          # Sandbox communication
├── sandbox iframe       # Dictionary script execution
└── js/background.js     # ODHBackground class
    ├── Audio playback
    ├── Sandbox routing
    └── Message handling
```

---

## Audio Sources

ODH supports multiple audio sources for pronunciation:

1. **Dictionary Audio**: From dictionary lookup results
2. **Anki Audio**: Audio attached to Anki notes
3. **External URLs**: User-provided audio URLs

All audio sources flow through the same playback pipeline.

---

## Performance Considerations

### Audio Caching

The offscreen document caches Audio objects:

```javascript
this.audios = {}; // { [url]: Audio }

const audio = this.audios[url] || new Audio(url);
this.audios[url] = audio;
```

**Benefits**:
- Faster playback for repeated audio
- Reduces network requests
- Improves user experience

**Limitations**:
- No cache eviction policy (grows indefinitely)
- No preloading
- No error recovery for failed loads

### Improvement Opportunities

1. **Cache Management**: Implement LRU cache with size limits
2. **Preloading**: Preload audio when dictionary results load
3. **Error Handling**: Retry failed audio loads
4. **Multiple Sources**: Try fallback sources if primary fails
5. **Playback Queue**: Support audio playlists

---

## Testing Considerations

### Manual Testing Checklist

- [ ] Audio plays from dictionary lookups
- [ ] Audio plays from Anki note creation
- [ ] Multiple audio sources work
- [ ] Audio stops before playing new one
- [ ] Audio caching works (second play is instant)
- [ ] Audio plays in different tabs
- [ ] No audio errors in console

### Unit Testing (TypeScript AudioHandler)

The AudioHandler can be unit tested:

```typescript
describe('AudioHandler', () => {
  it('should forward audio playback to offscreen document', async () => {
    const handler = new AudioHandler();
    const result = await handler.handle({ url: 'test.mp3' }, {});
    expect(result).toBeDefined();
  });

  it('should handle callback if provided', async () => {
    const handler = new AudioHandler();
    const result = await handler.handle({
      url: 'test.mp3',
      callbackId: 'callback-123'
    }, {});
    // Verify callback was sent
  });
});
```

---

## Migration Priority

**Priority**: Low

**Rationale**:
- Current implementation works reliably
- Simple message forwarding (no complex logic)
- TypeScript implementation already exists
- Dictionary services are higher priority
- Can be migrated during cleanup phase

**Recommendation**:
- Document current state ✅
- Complete dictionary services migration first
- Migrate audio during Phase 5 (Cleanup) or leave as-is
- Consider only if adding audio service features (queue, preload, etc.)

---

## References

- TypeScript implementation: `src/bg/ts/handlers/AudioHandler.ts`
- Legacy implementation: `src/bg/js/backend.js` (api_playAudio)
- Offscreen document: `src/bg/js/background.js` (ODHBackground)
- Audio caching: `ODHBackground.audios`

---

*Audio playback is working correctly. Migration is optional and low priority.*
