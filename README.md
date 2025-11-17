# PageLive

**PageLive** is a free, open-source Chrome extension that enhances the [Gemini AI](https://gemini.google.com) experience for desktop screen reader users by adding essential page announcements, easy-access information, and powerful keyboard shortcuts.

**Current Version:** 3.0.0

## Motivation

Screen reader users often must manually switch context on the Gemini page—moving between the side navigation, new responses, and the prompt input—which makes each interaction cumbersome.

**PageLive** streamlines this workflow by announcing important page events, surfacing page information on demand, and adding shortcuts to simplify navigation for screen reader users.

## Getting Started (Mini-Tutorial)

Once installed, PageLive immediately starts announcing key events. Here are the core shortcuts that streamline your workflow:

| Action                      | Shortcut                     | Benefit/Use Case                                                                                 |
| :-------------------------- | :--------------------------- | :----------------------------------------------------------------------------------------------- |
| **Open/Toggle Content Map** | **Ctrl + M**                 | See a brief summary of all prompts and responses. Quickly jump to any point in the conversation. |
| **Open/Toggle Info Dialog** | **Ctrl + /**                 | Access all keyboard shortcuts, conversation info, and extension details on-demand.               |
| **Jump to Chat Input**      | **Shift + Esc**              | Instantly return your focus to the prompt input field, ready for your next question.             |
| **Announce Last Response**  | **Ctrl + Shift + Enter**     | Quickly re-read the AI's last reply without manual navigation.                                   |
| **Start New Chat**          | **Ctrl + Alt + O**           | Clear the current conversation and open a fresh input field in one keypress.                     |
| **Delete Current Chat**     | **Ctrl + Shift + Backspace** | Efficiently remove the current conversation from your list.                                      |

> **Content Map Details:** The Content Map dialog ($Ctrl + M$) contains the short first part of each prompt and response. Each item is a button that, when activated, closes the dialog and moves your focus directly to the corresponding prompt or response on the page.
> **Info Dialog Details:** The title of the Info Dialog ($Ctrl + /$) is also a button. Pressing it will close the dialog and automatically move your focus to the current chat in the side navigation.

## Desktop Screen Reader Support

PageLive acts as a seamless companion for desktop screen readers. It is developed and tested with **NVDA**, but it relies on standard HTML ARIA attributes and should work well with other screen readers like **JAWS**.

> **Target Users:** PageLive is targeted for desktop-based screen reader users. Some features may not be available for smaller browser widths due to web layout changes (e.g., the menu for each conversation is not available in Gemini for widths < 960px).

## Planned Features

### Grok (xAI)

### Claude.ai

### Reddit

### Discord

## License

PageLive is free and open source.
