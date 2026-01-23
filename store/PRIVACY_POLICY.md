# Privacy Policy for FlashDict

**Last Updated:** January 2026

## Overview

FlashDict is a Chrome extension that helps users look up word definitions and create Anki flashcards. This privacy policy explains how FlashDict handles user data.

## Data Collection

### Data We Collect

FlashDict collects and stores the following data **locally on your device**:

1. **Extension Settings** - Your preferences such as selected dictionary, hotkey settings, Anki configuration, and UI preferences.

2. **AnkiWeb Credentials** (Optional) - If you choose to use AnkiWeb integration, your AnkiWeb username and password are stored locally in Chrome's secure storage to authenticate with AnkiWeb servers.

### Data We Do NOT Collect

- We do not collect any personal information
- We do not track your browsing history
- We do not collect analytics or usage data
- We do not sell or share any data with third parties
- We do not have any servers that receive your data

## Data Storage

All data is stored locally on your device using Chrome's built-in `chrome.storage` API. No data is transmitted to external servers owned by us.

## Third-Party Services

FlashDict may communicate with the following third-party services based on your configuration:

1. **Online Dictionaries** - When you look up a word, the extension may fetch definitions from online dictionary websites (Cambridge, Oxford, Youdao, etc.) that you have enabled. These requests are made directly to those dictionary services.

2. **AnkiConnect** - If you use Anki desktop integration, the extension communicates with the AnkiConnect addon running locally on your computer (localhost).

3. **AnkiWeb** - If you choose to use AnkiWeb cloud sync, the extension will communicate with AnkiWeb servers (ankiweb.net, ankiuser.net) to create flashcards. This requires your AnkiWeb account credentials.

## Permissions Explained

- **storage**: Required to save your extension settings locally
- **offscreen**: Required for sandbox functionality to safely run dictionary scripts
- **alarms**: Required for Service Worker keep-alive functionality
- **Host permissions (ankiweb.net, ankiuser.net)**: Required only for AnkiWeb integration

## Data Security

- AnkiWeb credentials are stored in Chrome's secure storage
- All network requests to AnkiWeb use HTTPS encryption
- Dictionary scripts run in an isolated sandbox environment

## Children's Privacy

FlashDict does not knowingly collect any personal information from children under 13 years of age.

## Changes to This Policy

We may update this privacy policy from time to time. Any changes will be reflected in the "Last Updated" date above.

## Contact

If you have questions about this privacy policy, please open an issue on our GitHub repository:
https://github.com/zland1851/FlashDict/issues

## Open Source

FlashDict is open source software released under the MIT License. You can review the source code at:
https://github.com/zland1851/FlashDict
