# README IDEAS

This file is a brainstorming file related to developing PageLive., This file may contains ideas or opportunities that may be implemented in the future.

## Possible Pages To Be Supported

Function to announce for every new chat for `page`s:

- chat.openai.com (ChatGPT)❌ ~ChatGPT is one of the `page` role model, thus no adapters needed.
- gemini.google.com (Gemini) ❌
- gork.com (Gork) ❌
- sonnet.com (Sonnet) ❌
- mail.google.com (Gmail)❌
- web.whatsapp.com (WhatsApp Web)❌
- discord.com/app (Discord)❌

---

---

## ⌨️ Keyboard Shortcuts (Planned)

- A customizable system of **context-aware keyboard shortcuts**, tailored to each supported site or context.
- Allows navigation to specific areas, triggering announcements, or performing page-specific actions (e.g., “Jump to last message”, “Open reply box”).
- Includes shortcut conflict detection and per-site enable/disable options.
- Will support shortcut configuration in future settings UI.

---

## Options UI (Planned)

- Lets users customize:
  - Page rules and selectors
  - Announcement style and method
  - Keyboard shortcuts
  - Per-site enable/disable toggles

---

## Roadmap

| Feature                                         | Status           |
| ----------------------------------------------- | ---------------- |
| Active announcer (per site)                     | ✅ In progress   |
| Page type detection                             | ✅ Basic support |
| User-defined page rules                         | 🔜 Planned       |
| Keyboard shortcuts (core engine)                | 🔜 Planned       |
| Shortcut configuration UI                       | 🔜 Planned       |
| Settings export/import                          | 🔜 Planned       |
| Support for screen reader fallback (NVDA, JAWS) | 🔜 Planned       |

---

## Vision

PageLive is built to **bridge the gap between screen readers and dynamic web apps**. It gives blind and low-vision users a smart assistant that **brings content to them**, instead of making them search for it. In the future, PageLive will offer full keyboard control to complement that smart awareness — making modern web experiences faster, easier, and more empowering.

---

## Project Structure (Planned)

(Details to be added in future updates.)

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

## Example Use Cases

- **Gemini / ChatGPT**: Announce new AI replies without needing to tab through the page.
- **Gmail**: Speak "New email from Alice" when a message is added to the inbox.
- **Discord**: Say "New message in #general from John" when a chat update is detected.
- **WhatsApp Web**: Automatically read incoming message previews.

---
