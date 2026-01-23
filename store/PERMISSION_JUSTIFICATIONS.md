# Permission Justifications for Chrome Web Store Review

This document explains why FlashDict requires each permission.

## Permissions

### 1. `storage`
**Justification:**
The storage permission is required to save user preferences and settings locally. This includes:
- Selected dictionary preference
- Anki deck and field mappings
- Hotkey configuration
- UI preferences (enabled/disabled state, etc.)
- AnkiWeb credentials (for users who opt-in to AnkiWeb sync)

**User Benefit:** Allows settings to persist across browser sessions without requiring reconfiguration.

---

### 2. `offscreen`
**Justification:**
The offscreen permission is required to create an offscreen document that hosts a sandboxed iframe. Dictionary scripts (which may contain third-party code) run inside this isolated sandbox for security. The sandbox prevents potentially malicious dictionary scripts from accessing the main extension context or user data.

**User Benefit:** Provides a secure execution environment for dictionary scripts, protecting users from potential security risks.

---

### 3. `alarms`
**Justification:**
The alarms permission is required to keep the Service Worker alive for timely response to user interactions. Chrome's Manifest V3 uses Service Workers that can be terminated when idle. The alarms API allows the extension to periodically wake up and maintain responsiveness.

**User Benefit:** Ensures the extension responds instantly when users look up words, without delays from Service Worker restarts.

---

## Host Permissions

### 4. `https://ankiweb.net/*` and `https://ankiuser.net/*`
**Justification:**
These host permissions are required **only** for users who choose to integrate with AnkiWeb cloud service. The extension needs to:
- Authenticate users with AnkiWeb
- Create flashcards in the user's AnkiWeb account
- Sync vocabulary data to Anki

These permissions are NOT used unless the user explicitly configures AnkiWeb integration in the options page.

**User Benefit:** Enables seamless flashcard creation in Anki cloud for vocabulary building.

---

### 5. `http://127.0.0.1:8765/*` and `http://localhost:8765/*`
**Justification:**
These host permissions are required for users who choose to integrate with Anki desktop via the AnkiConnect addon. AnkiConnect runs a local HTTP server on port 8765 that allows external applications to interact with Anki.

These permissions are NOT used unless the user has AnkiConnect installed and configures the extension to use it.

**User Benefit:** Enables direct flashcard creation in Anki desktop application.

---

## Content Scripts

### 6. `*://*/*` and `file://*/*` (content script matches)
**Justification:**
Content scripts are injected into web pages to enable the core word lookup functionality:
- Detect when users select text on a webpage
- Display the definition popup near the selected text
- Capture sentence context for flashcard creation
- Handle keyboard shortcuts

The content script is lightweight and only activates when the user selects text or uses the configured hotkey.

**User Benefit:** This is the core functionality - allows users to look up words on any webpage by selecting text.

---

## Summary Table

| Permission | Why Required | Data Accessed |
|------------|--------------|---------------|
| storage | Save user settings | User preferences (local only) |
| offscreen | Secure sandbox for scripts | None (security feature) |
| alarms | Keep Service Worker responsive | None |
| ankiweb.net | AnkiWeb integration (opt-in) | User's Anki account |
| localhost:8765 | AnkiConnect integration (opt-in) | Local Anki app |
| Content scripts | Word selection & popup | Selected text on pages |

## Single Purpose Description

**Extension's Single Purpose:**
FlashDict has a single purpose: to help users look up word definitions and create vocabulary flashcards while browsing the web.

All permissions are necessary and directly support this core functionality. The extension does not perform any unrelated tasks.
