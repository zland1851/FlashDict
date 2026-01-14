# FlashDict

[[中文版说明](README.zh_CN.md)]

A Chrome extension for looking up word definitions and creating Anki flashcards from any webpage.

## Features

- **Text Selection Lookup** - Select text on any webpage to see definitions
- **Multiple Dictionaries** - Support for Collins, Cambridge, Oxford, and more
- **Anki Integration** - Create flashcards via AnkiConnect or AnkiWeb
- **Audio Playback** - Listen to word pronunciations

## Quick Start

1. Install the extension from Chrome Web Store or Firefox Add-ons
2. Select any word on a webpage (double-click or drag to select)
3. A popup appears with the word definition
4. (Optional) Click the **(+)** button to add the word to Anki

For link text, hold <kbd>Shift</kbd> while selecting or use the hotkey (default: <kbd>Shift+Q</kbd>).

## Configuration

Access the options page by clicking the extension icon → Options.

### General Options
| Option | Description |
|--------|-------------|
| Enabled | Turn extension on/off |
| Hotkey | Configure selection hotkey (Shift/Ctrl/Alt) |


### Anki Integration
Configure deck name, note type, and field mappings for:
- Expression (the word)
- Reading (pronunciation)
- Definition
- Sentence (context)
- URL (source page)

Requires [Anki](https://apps.ankiweb.net/) desktop with [AnkiConnect](https://github.com/FooSoft/anki-connect) addon, or an AnkiWeb account.

### Dictionary Options
- Select from builtin dictionaries (Collins EN→CN)
- Load online dictionaries (Cambridge, Oxford, Youdao, etc.)
- Add custom dictionary scripts

## Development

### Prerequisites
- Node.js 18+
- npm

### Setup
```bash
git clone https://github.com/zland1851/FlashDict.git
cd FlashDict
npm install
npm run build
```

### Load in Chrome
1. Go to `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select the `dist` folder

### Commands
```bash
npm run build          # Build extension
npm test               # Run all tests
npm run build:tsc      # Type check only
```

### Project Structure
```
src/
├── bg/                 # Background/service worker (TypeScript)
│   ├── ts/            # TypeScript source
│   ├── js/            # Legacy JavaScript
│   └── sandbox/       # Dictionary sandbox
├── fg/                 # Frontend (content scripts)
└── dict/              # Dictionary scripts
```

See [SPEC.md](SPEC.md) for technical specification and [CLAUDE.md](CLAUDE.md) for development guidance.

### Custom Dictionary Scripts

Create your own dictionary scripts to scrape definitions from any online source. See the [development guide](doc/development.md) for details.

Available dictionary scripts are listed in [scriptlist.md](doc/scriptlist.md).

## Acknowledgements

This project is based on [ninja33/ODH](https://github.com/ninja33/ODH), now maintained at [zland1851/FlashDict](https://github.com/zland1851/FlashDict).

## License

MIT License
