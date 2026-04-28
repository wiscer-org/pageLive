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

## Development: Version Bumping and Releases

### Automated Version Bump Script

PageLive includes a script to automate version updates across multiple files during releases.

**Usage:**
```bash
pnpm run bump X.Y.Z
```

Replace `X.Y.Z` with the new version (e.g., `pnpm run bump 3.5.0`).

**What the script does:**

1. **Updates version in `package.json`** – Sets the new version number
2. **Updates version in `public/manifest.json`** – Keeps the Chrome extension manifest in sync
3. **Updates `CHANGELOG.md`** – Moves the current "### Updated" list from "## Next Version" to the new release section
4. **Commits changes and add tag automatically** – Creates a git commit with message "Release vX.Y.Z" and a git tag "vX.Y.Z"
5. **Push changes to remote repo** - Right away push changes to the remote repo

**After running the script:**

- Done! The script automatically commits, tags, and pushes all changes to the remote repository.
- The release is now ready and visible on GitHub.

### CHANGELOG.md Format Requirements

⚠️ **Important:** The bump script parses `CHANGELOG.md` based on specific formatting. To ensure the script works correctly, maintain this structure:

```markdown
# Changelog

## Next Version

### Updated

- (List your changes here, or use "- none" if no changes yet)

### On Progress

- (Features currently being worked on)

### Planned

- (Future planned features)

### Future Ideas

- (Long-term ideas)

## vX.Y.Z

- (Previous release changes)
```

**Key requirements:**
- `## Next Version` must exist as the first version entry
- Must contain `### Updated` subsection (script will extract this)
- Do not add extra headers or change the structure significantly
- Use `- none` for empty update lists to maintain consistency

## License

PageLive is free and open source.
