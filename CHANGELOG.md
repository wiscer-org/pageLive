# Changelog

## v3.2.0 (not released)

- Bundled page adapters with PageLive libraries
- Fix: Renumber responses in Content Map after render.
- Change keybind `Ctrl + /` to `Alt + /` to avoid collission with default existing keybind.
- Init Grok page adapter
- Grok: Add keybind to focus on chat input.
- Grok: Implement `ChatObserver` class.

### On Progress

### Planned

- Fix: Chat title not updated in the case of long delay with the side nav.
- When waiting for new responses from Gemini, announce the incoming texts like 'Wait a sec..'.
- TODO: Play sound as sign that a response is being received.
- TODO: New shortcut to copy the last response

### Future

- Observe the loading animation while waiting for the new response. The 'loading' state of the animation should be a hint when PageLive going to announce the received new response.

## v3.1.1

- Fixed: In Content Map, response element not found during slow connection.
- Fixed: Set `aria-hidden` to `false` for `.katex-html` elements.

## v3.1.0

- PageLive also tested with Brave browser.
- Reveal `.katex-html[aria-hidden="true"]` to be accessible by SR, by add attribute `pl-disable-aria-hidden` and set the `aria-hidden` to `false`.
- Force SR to 'browse mode' on 2 events: focus on the chat item in side nav after click on Page Info dialog and focus on source chat unit after click on Content Map dialog.
- Fixed: After item in Content Map is clicked, screen reader not changed to 'Browse mode' and not focus to the corresponding response element. Increase success rate to force SR to switch to 'Browse mode' by set `scrollIntoView.behaviour=instant' and increase wait time before change element focus.
- Fixed: Content Map: Ignore missing elements when parsing chat units.

## v3.0.0

- Create dialog 'Content Map' to map prompts/response : shortened prompt/response text content and each text is button to focus to prompt/response element correspondingly.
- Move focus to side nav when 'new chat' title in dialog is clicked.
- Deactivate feature to announce new responses, due the feature just provided by Gemini.

## v2.2.0

- The dialog title is now a button, which will close the dialog and move focus to the current chat in the chat list in the side navigation.
- Dialog contains number of prompts in the active chat.
- Deprecated: The feature to announce new response is deprecated since Gemini just recently implemented that feature. So the progress below is curerntly not being used. However the code is not removed for this time being.
- Announce new response per segments instead of the whole response. This will decrease users' waiting time for the new response to be announced.
- Identify whether response(s) rendered as new response or loading saved chat.
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
