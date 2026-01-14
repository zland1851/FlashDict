# FlashDict

[[中文版说明](README.zh_CN.md)]

A Chrome extension for looking up word definitions and creating Anki flashcards from any webpage.

![Anki Notes](https://raw.githubusercontent.com/ninja33/ODH/master/doc/img/anki_001_640x400.png)

## Features

- **Text Selection Lookup** - Select text on any webpage to see definitions
- **Multiple Dictionaries** - Support for Collins, Cambridge, Oxford, and more
- **Anki Integration** - Create flashcards via AnkiConnect or AnkiWeb
- **Audio Playback** - Listen to word pronunciations
- **PDF Support** - Works with PDF.js viewer pages
- **Custom Dictionaries** - Add your own dictionary scripts

## Installation

- [Install from Chrome Web Store](https://chrome.google.com/webstore/detail/anki-online-dictionary-he/lppjdajkacanlmpbbcdkccjkdbpllajb?hl=en)
- [Install from Firefox Add-ons](https://addons.mozilla.org/en-US/firefox/addon/online-dictionary-helper/)

## Quick Start

1. Install the extension from Chrome Web Store or Firefox Add-ons
2. Select any word on a webpage (double-click or drag to select)
3. A popup appears with the word definition
4. (Optional) Click the **(+)** button to add the word to Anki

For link text, hold <kbd>Alt</kbd> while selecting or use the hotkey (default: <kbd>Alt+Q</kbd>).

## Configuration

Access the options page by clicking the extension icon → Options.

### General Options
| Option | Description |
|--------|-------------|
| Enabled | Turn extension on/off |
| Hotkey | Configure selection hotkey (Shift/Ctrl/Alt) |
| Max Context | Maximum sentences from page context |
| Max Example | Maximum example sentences from dictionary |

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

![Options Page](https://raw.githubusercontent.com/ninja33/ODH/master/doc/img/option_general_640x400_en.png)

## Development

### Prerequisites
- Node.js 18+
- npm

### Setup
```bash
git clone https://github.com/ninja33/ODH.git
cd ODH
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

## Contributing

Pull requests welcome for:
- Extension improvements → `/src`
- New dictionary scripts → `/src/dict`

## Background

Learn about the project's origins and motivation in [background.md](doc/background.md).

## License

GPL-3.0
