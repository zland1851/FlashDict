# ODH - Online Dictionary Helper

## Specification

### Purpose

ODH (Online Dictionary Helper) is a Chrome browser extension that enables users to:
1. Look up word definitions by selecting text on any webpage
2. Create Anki flashcards from dictionary definitions
3. Use multiple dictionary sources (builtin and online)

### Target Users

- Language learners studying vocabulary
- Users who want to quickly look up unfamiliar words
- Anki users who want to create flashcards efficiently

---

## Features

### Core Features

| Feature | Description |
|---------|-------------|
| Text Selection Lookup | Select text on any webpage to see definitions |
| Multiple Dictionaries | Support for Collins, Cambridge, Oxford, and more |
| Anki Integration | Create flashcards via AnkiConnect or AnkiWeb |
| Audio Playback | Listen to word pronunciations |
| Keyboard Shortcut | Toggle extension with Alt+Q |

### Dictionary Support

**Builtin Dictionaries:**
- Collins EN→CN (offline, 37K+ terms)

**Online Dictionaries:**
- Cambridge EN→CN
- Collins EN→CN (online)
- Oxford EN→CN
- Youdao
- And more via user scripts

### Anki Integration

| Method | Description |
|--------|-------------|
| AnkiConnect | Local API (requires Anki desktop with AnkiConnect addon) |
| AnkiWeb | Web-based (requires AnkiWeb account) |

---

## Technical Specification

### Platform Requirements

- Chrome 91+ (Manifest V3)
- Anki Desktop + AnkiConnect addon (for local Anki integration)
- AnkiWeb account (for web-based integration)

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Chrome Extension                         │
├─────────────────────────────────────────────────────────────┤
│  Content Script                                              │
│  ├── Text selection detection                               │
│  ├── Popup UI rendering                                     │
│  └── Message sending to service worker                      │
├─────────────────────────────────────────────────────────────┤
│  Service Worker (TypeScript)                                 │
│  ├── Bootstrap (DI container, event wiring)                 │
│  ├── MessageRouter (with security middleware)               │
│  ├── BackendService (business logic coordination)           │
│  ├── AnkiConnectService / AnkiWebService                    │
│  ├── SandboxBridge (dictionary communication)               │
│  └── OptionsManager (settings persistence)                  │
├─────────────────────────────────────────────────────────────┤
│  Offscreen Document                                          │
│  ├── Audio playback                                         │
│  └── Sandbox iframe communication                           │
├─────────────────────────────────────────────────────────────┤
│  Sandbox (isolated)                                          │
│  ├── Dictionary script execution (eval)                     │
│  └── Term lookup                                            │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

**Word Lookup:**
```
1. User selects text on webpage
2. Content script sends getTranslation message
3. Service Worker routes to BackendService
4. BackendService calls SandboxBridge.findTerm()
5. SandboxBridge sends to Offscreen Document
6. Offscreen Document forwards to Sandbox
7. Sandbox executes dictionary script
8. Result flows back through the chain
9. Content script displays popup with definition
```

**Add to Anki:**
```
1. User clicks "Add to Anki" button
2. Content script sends addNote message
3. Service Worker routes to BackendService
4. BackendService formats note via NoteFormatterService
5. Note sent to AnkiConnectService or AnkiWebService
6. Result returned to content script
```

### Security Model

| Layer | Protection |
|-------|------------|
| Input Validation | All message params validated via Validator |
| Sandbox Isolation | Dictionary scripts run in sandboxed iframe |
| Credential Storage | Sensitive data encrypted via CredentialManager |
| Rate Limiting | Optional rate limiting via SecurityMiddleware |

### Storage

| Key | Type | Description |
|-----|------|-------------|
| options | object | User preferences |
| dictSelected | string | Selected dictionary name |
| dictNamelist | array | Available dictionaries |
| ankiweb_* | encrypted | AnkiWeb credentials |

---

## Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| enabled | boolean | true | Extension enabled |
| hotkey | string | "Alt+Q" | Toggle hotkey |
| mouseselection | boolean | true | Lookup on mouse selection |
| dictSelected | string | "builtin_encn_Collins" | Active dictionary |
| deckname | string | "Default" | Anki deck name |
| maxexample | number | 2 | Max example sentences |
| monolingual | string | "" | Monolingual dictionary |
| ankiconnect | string | "http://127.0.0.1:8765" | AnkiConnect URL |

---

## File Formats

### Dictionary Script Format

```javascript
class encn_Example {
  constructor(options) {
    this.options = options;
  }

  async displayName() {
    return "Example EN→CN Dictionary";
  }

  setOptions(options) {
    this.options = options;
  }

  async findTerm(word) {
    // Return array of note objects
    return [{
      css: "<style>...</style>",
      expression: word,
      reading: "/pronunciation/",
      definitions: ["definition1", "definition2"],
      audios: ["https://audio.url/word.mp3"]
    }];
  }
}
```

### Note Format (Anki)

```javascript
{
  expression: "word",
  reading: "/pronunciation/",
  extrainfo: "frequency info",
  definitions: "<div>definition HTML</div>",
  sentence: "Example sentence",
  url: "https://source.url",
  audios: ["audio1.mp3", "audio2.mp3"]
}
```

---

## API Reference

### Message Actions

| Action | Params | Response | Description |
|--------|--------|----------|-------------|
| getTranslation | {expression} | NoteDefinition[] | Look up word |
| findTerm | {expression} | NoteDefinition[] | Alias for getTranslation |
| addNote | {notedef} | boolean | Add note to Anki |
| playAudio | {url} | void | Play audio URL |
| opt_getDeckNames | {} | string[] | Get Anki deck names |
| opt_getModelNames | {} | string[] | Get Anki model names |
| opt_getVersion | {} | string | Get AnkiConnect version |
| isConnected | {} | boolean | Check Anki connection |

---

## Permissions

| Permission | Reason |
|------------|--------|
| storage | Save user options |
| offscreen | Audio playback and sandbox |
| webRequest | (Reserved for future use) |
| host_permissions: ankiweb.net | AnkiWeb integration |
| host_permissions: ankiuser.net | AnkiWeb integration |
