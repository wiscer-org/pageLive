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

## 📄 Page Type System

Each supported website or web app is categorized under a **`pageType`**, allowing PageLive to tailor its behavior to each environment. Examples:

| URL Pattern              | Page Type  | Description                        |
|--------------------------|------------|------------------------------------|
| `gemini.google.com`      | `gemini`   | Google Gemini AI chat              |
| `chat.openai.com`        | `chatgpt`  | OpenAI ChatGPT                     |
| `mail.google.com`        | `gmail`    | Gmail inbox                        |
| `web.whatsapp.com`       | `whatsapp` | WhatsApp Web                       |
| `discord.com/app`        | `discord`  | Discord web app                    |

Users and developers can define their own `pageType` rules via the extension settings in a future release.

---

## 🔧 Architecture Overview

### Content Script

- Injected into matching URLs.
- Detects page type and loads relevant logic.
- Sets up observers to detect new messages, alerts, or updates.
- Passes changes to announcer module.

### Announcer Module

- Converts detected changes into spoken announcements.
- Uses ARIA live regions only - not using `speechSynthesis`.
- De-duplicates messages and filters noise.

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
