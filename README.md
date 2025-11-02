# PageLive

**PageLive** is a Chrome extension for [Gemini AI](https://gemini.google.com) that announces important page events, provides easy access to page information, and adds keyboard shortcuts to improve overall accessibility.

**Current Version:** 2.2.0

## Desktop Screen Reader Support

PageLive acts as a companion for desktop screen readers, making web navigation easier for users. It is developed and tested with NVDA, but should work with other screen readers like JAWS, as it relies on standard HTML ARIA attributes.

## Gemini (gemini.google.com)

[Gemini](https://gemini.google.com) is Google's AI chat service, similar to [ChatGPT](https://chatgpt.com).

## Motivation

Screen reader users often must manually move around the Gemini page — switching between the side navigation, responses, and the prompt input — which makes each interaction cumbersome. PageLive streamlines this workflow by announcing important page events, surfacing page information on demand, and adding keyboard shortcuts to simplify navigation for screen reader users.

## Target Users

PageLive is targetted for dekstop based screen reader users.

Some features might not available for smaller width browser due to web layout changes.
In gemini, the menu for each conversation not available for width < 960.

## License

PageLive is free and open source.

## Features

### Gemini

- Press Ctrl + / to toogle dialog. The dialog contains information about chat / conversation, keyboard shortcuts, and other information about PageLive.
- The title of the dialog is also a button, which if pressed will close the dialog and move focus to the current chat in the side navigation.
- Start new chat : Ctrl + Alt + O
- Delete current chat : Ctrl + Shift + Backspace
- Announce the last response : Ctrl + Shift + Enter
- Focus the chat input : Shift + Esc

## Planned Features

### Grok (xAI) (Planned)

- Announce new responses.
