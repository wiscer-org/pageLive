# Changelog

## v2.2.0 (on progress)

- Announce new response per segments instead of the whole response. This will decrease users' waiting time for the new response to be announced.

### Planned

- Indentify whether response(s) rendered as new response or loading saved chat.
- When waiting for new responses from Gemini, announce the incoming texts like 'Wait a sec..'.
- TODO: Play sound as sign that a response is being received.
- TODO: New shortcut to copy the last response

### Future

- Keyboard shorcuts to read previous / next chat item (prompts & responses).
- Observe the loading animation while waiting for the new response. The 'loading' state of the animation should be a hint when PageLive going to announce the received new response.
- Enhance response announcement: Announce content as it streams in, rather than waiting for the full response to be rendered.
- Page adapters need to make sure page is ready (key HTML elements existed) before continue process, e.g.: register keybinds, announce, etc.

## v2.1.2

- PageLive will notify user when PageLive is ready.
- Fix: Ensure the chat input element exists before focusing on it.

## v2.1.1

- Set host permissions to `gemini.google.com/app` only.
- Remove `activeTab` and `storage` permissions.

## v2.1.0

- Put current chat title to model. If not yet have title use default like 'no title'.
- Identify new chat VS saved chat. This will effect of some features like delete current chat.
- Remove unnecessary announcements.
- Various bug fixes

## v2.0.0

- PageLive announces initial info, could be short info & page's snapshot info, after initialized.
- Modal implementation. Modal will contains almost all info needed related to the active page and PageLive
- New Shortcut to toogle modal : Ctrl + /
- When modal is opened, it will anounce page's snapshot info, continued about how to close the modal
- When modal is closed, announce to user.
- New shortcut to focus on the chat input box : `Shift + Esc`.
- New shortcut to announce the last response : `Ctrl + Shift + Enter`.
- Prepend every announce with 'PageLive' by default. This help users to identify messages from PageLive extension.
- New shortcut to delete current chat / conversation : `Ctrl + Shift + Backspace`.
- New shortcut to start a new chat : `Ctrl + Alt + o`. Not using `Ctrl + Shift + O`, as planned, because Chrome has use it to open bookmark.

## v1.1.0

- Enhanced environment detection for development/production modes, for programmatic PageLive container style.
- Improved Gemini response announcement logic and delay handling.

---

For previous changes, see earlier commits or project history.
