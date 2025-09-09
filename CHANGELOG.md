# Changelog

## v2.0.1 (on progress)

- Remove unnecessary announcements.
- Various bug fixes

### Planned

- TODO: Get the title of current chat, if not yet have title use default like 'no title'.
- TODO: Play sound as sign that a response is being received.
- TODO: New shortcut to copy the last response

### Future

- Page adapters need to make sure page is ready (key HTML elements existed) before continue process, e.g.: register keybinds, announce, etc.

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
