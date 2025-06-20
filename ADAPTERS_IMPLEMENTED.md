# PageLive: Implemented Adapters

This file lists the currently implemented adapters in the PageLive project. It will be updated as new adapters are added.

---

## Implemented GeneralAdapter

- Global ARIA live region setup ❌
- DOM MutationObserver for content changes ❌
- Basic accessibility improvements ❌
- Fallback logic for unsupported/unknown pages ❌

---

## Implemented Functions on PageTypeAdapters. Note: Currently PageTypeAdapter not implemented

### PageType: chat ❌

- Gemini (gemini.google.com) ❌
- ChatGPT (chat.openai.com) ❌
- WhatsApp Web (web.whatsapp.com) ❌

### PageType: email ❌

- Gmail (mail.google.com) ❌

### PageType: group ❌

- Discord (discord.com/app) ❌

---

## Implemented Functions on PageAdapters

### Function: Announce New Chat

Function to announce for every new chat for `page`s:

- chat.openai.com (ChatGPT)❌ ~ChatGPT is one of the `page` role model, thus no adapters needed.
- gemini.google.com (Gemini) ❌
- gork.com (Gork) ❌
- sonnet.com (Sonnet) ❌
- mail.google.com (Gmail)❌
- web.whatsapp.com (WhatsApp Web)❌
- discord.com/app (Discord)❌

---

This list reflects the current state of adapter implementation in PageLive.
