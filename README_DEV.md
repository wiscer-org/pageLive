# PageLive README for dev

This file is a README file in PageLive development context. It aims to help developer to get a quick view of PageLive.

## Inspiration

PageLive is inspired by chatgpt web page, which announce every response from chatGPT and itprovides some helpful shortcuts. ChatGPT web is used as a starting role model for PageLive features.

## Motivation of PageLive

PageLive is intended as screen reader companion to help user to minimize the required navigation in HTML elements. PageLive has 2 basic features:

1. Actively announce important information of the current web page
2. Provide generic shortcuts to help users avoiding has to traverse to certain HTML elements to do actions, such as delete the current chat. Shortcut with the same functionality should be the same in all supported web pages.

## Screen Reader Desktop only

PageLive is intended for screen reader in dekstop web browser environment only. PageLive basic principal is by manipulation the HTML elements with the standard ARIA attributes.

## PageAdapter

PageLive is specifically customized for every supported web pages. The file(s) that are ran for a specific web pages is called `PageAdapter`

## Page

A `Page`, in PageLive context, is a array of URL or URL pattern defined in `manifest.json`. It will match with the specific `PageAdapter` needed.

## Feature catalog one-way sync to web repo

PageLive is the source of truth for feature catalogs in `docs/features/`.
The workflow `.github/workflows/sync-features-to-web.yml` will copy those files into the web repo and open/update a PR automatically.

### One-time setup

1. Open `.github/workflows/sync-features-to-web.yml`.
2. Set `TARGET_REPO` to your web repository slug, for example: `your-org/pagelive-web`.
3. Set `TARGET_DIR` to the destination folder in the web repo, for example: `src/data/pagelive-features`.
4. In this PageLive repo settings, add Actions secret `WEB_REPO_TOKEN`.
   - Use a fine-grained token that can access the target web repo.
   - Required permissions: `Contents (Read and write)` and `Pull requests (Read and write)`.

### How it runs

- Triggered on push when files under `docs/features/**` change.
- Also can be run manually from GitHub Actions (`workflow_dispatch`).
- The workflow creates or updates branch `chore/sync-pagelive-features` in the web repo.
- A PR titled `chore: sync PageLive feature catalog` is opened/updated automatically.

### Daily usage

1. Update files in `docs/features/` in PageLive.
2. Push changes.
3. Review and merge the auto-created PR in the web repo.
