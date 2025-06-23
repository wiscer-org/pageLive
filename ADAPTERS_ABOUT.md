# PageLive: Adapter Features

This document describes the current features and responsibilities for each adapter type in PageLive. In the context of PageLive, an `adapter` is a content script module that is loaded for web pages matching specific URL patterns defined in the extension's `manifest.json`. Adapters allow PageLive to customize and extend accessibility features for different sites and page types.

---

## GeneralAdapter

The `GeneralAdapter` is a content script that applies to all pages (matches all URLs) and provides global features:

- Sets up ARIA live regions for announcements.
- Monitors the DOM for content changes using MutationObserver.
- Handles basic accessibility improvements that are not site-specific.
- Provides fallback logic for unsupported or unknown pages.

---

## PageTypeAdapters

A `PageTypeAdapter` is a content script module that provides features for a group of pages sharing a common type (e.g., chat, email, group), based on URL patterns in the manifest:

- Adds listeners and handlers specific to the page type (e.g., chat message detection).
- Customizes announcement logic for the type (e.g., new message alerts for chat pages).
- May define keyboard shortcuts or navigation aids relevant to the type.

### Example Page Types

- `chat`: Gemini, ChatGPT, WhatsApp Web
- `email`: Gmail
- `group`: Discord

---

## PageAdapters

A `PageAdapter` is a content script module that provides features for a specific site or page, matched by its URL pattern in the manifest:

- Adds site-specific selectors, rules, and handlers.
- Fine-tunes announcements for unique page structures.
- Handles site-specific quirks or accessibility issues.

### Example Pages

- `gemini.google.com` (Gemini)
- `chat.openai.com` (ChatGPT)
- `mail.google.com` (Gmail)
- `web.whatsapp.com` (WhatsApp Web)
- `discord.com/app` (Discord)

---

This document will be updated as new features and adapters are added to PageLive.
For details on the current implementation of adapters, see [ADAPTERS_IMPLEMENTED.md](./ADAPTERS_IMPLEMENTED.md).
