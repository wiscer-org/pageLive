# PageLive

**PageLive** is a Chrome browser extension designed to assist users on Gemini AI (gemini.google.com) by automatically announcing new responses for improved accessibility.

**Current Version:** 2.2.0

## Desktop Screen Reader Support

PageLive acts as a companion for desktop screen readers, making web navigation easier for users. It is developed and tested with NVDA, but should work with other screen readers like JAWS, as it relies on standard HTML ARIA attributes.

## Gemini (gemini.google.com)

[Gemini](https://gemini.google.com) is Google's AI chat service, similar to [ChatGPT](https://chatgpt.com).

## Motivation

Screen reader users often need to manually navigate to read new responses from Gemini, and return to the prompt input, making each interaction cumbersome. PageLive streamlines this process by announcing every new Gemini response, inspired by accessibility features in ChatGPT.

## Target Users

PageLive is targetted for dekstop based screen reader users.

Some features might not available for smaller width browser due to web layout changes.
In gemini, the menu for each conversation not available for width < 960.

## License

PageLive is free and open source.

## Features

### Gemini

- Press Ctrl + / to toogle dialog. The dialog contains information about chat / conversation, keyboard shortcuts, and other information about PageLive.
- Start new chat : Ctrl + Alt + O
- Delete current chat : Ctrl + Shift + Backspace
- Announce the last response : Ctrl + Shift + Enter
- Focus the chat input : Shift + Esc
- Announces new responses automatically for screen reader users.

## Planned Features

### Grok (xAI) (Planned)

- Announce new responses.
