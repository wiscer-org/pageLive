# PageLive

**PageLive** is a customizable browser extension designed to enhance the browsing experience of screen reader users. It intelligently announces changes and important information on web pages, reducing the need for manual navigation through every page element. It also lays the groundwork for advanced keyboard shortcut support for accessibility.

---

## 🚀 Overview

PageLive improves web accessibility by proactively informing users of content updates based on the current page context. It is especially useful on dynamic web applications like AI chat tools, messaging platforms, social media, and email interfaces — where critical information may update without user input.

---

## 🧩 Key Features

### 1. 🗣️ Active Announcer

- Automatically detects important page updates and announces them via screen reader.
- PageLive relies on the screen reader, so no voice synthesizer is used.
- Behavior is customizable and can be extended for different sites or user.
- Uses ARIA live regions.
- Monitors the DOM using a MutationObserver to detect content changes.
- Can be extended with site-specific modules or user-defined selectors and rules.

---

## Page Adapter System

In `PageLive`, a `Page` is conceptually a web page that is identified with a list of URLs or URL patterns. This allows the extension to recognize and apply specific customized handlers.

A page has :

- List of matching URL or URL patterns
- Label to call the page, e.g.: 'gemini.google.com' has label 'gemini'

A `PageAdapter` is a specific rules, listeners, handlers, or shortcuts for a certain `page`.

## 📄 Page Type Adapter System

Each supported `page` can be categorized under a **`pageType`**, allowing PageLive to tailor certain 'listeners' to each `pageType`. Examples:

| URL Pattern              | Page | Page Type | Description                        |
|--------------------------|------------|------------------------------------|
| `gemini.google.com`      | `gemini` | `chat`  | Google Gemini AI chat              |
| `chat.openai.com`        | `chatgpt`  | `chat` | OpenAI ChatGPT                     |
| `web.whatsapp.com`       | `whatsapp` | `chat` | WhatsApp Web                       |
| `mail.google.com`        | `gmail`     | `email` | Gmail inbox                        |
| `discord.com/app`        | `discord`  | `group` | Discord web app                    |

Users and developers can define their own `pageType` rules via the extension settings in a future release.

A `PageTypeAdapter` is a specific rules, listeners, handlers, or shortcuts for pages categorized in a certain `PageType`

---

## General Adapter System

`GeneralAdapter`is an adapter, like `PageTypeAdapter` and `PageAdapter`, for all pages.

Every time a web page is loaded, the adapters are executed in the following order: `GeneralAdapter`, `PageTypeAdapter`, and `PageAdapter`.

## 🔧 Architecture Overview

### Content Script

- Injected into matching URLs.
- Detects the page type and loads the relevant logic.
- Sets up observers to detect new messages, alerts, or updates.
- Passes detected changes to the announcer module.

### Announcer Module

- Converts detected changes into spoken announcements.
- Uses ARIA live regions only (does not use `speechSynthesis`).
- De-duplicates messages and filters out noise.

---

## 📦 Example Use Cases

- **Gemini / ChatGPT**: Announce new AI replies without needing to tab through the page.
- **Gmail**: Speak "New email from Alice" when a message is added to the inbox.
- **Discord**: Say "New message in #general from John" when a chat update is detected.
- **WhatsApp Web**: Automatically read incoming message previews.

---

## 🛠️ Future Development

See [FUTURE.md](./FUTURE.md) for planned features, roadmap, and vision for PageLive's future development.

---
