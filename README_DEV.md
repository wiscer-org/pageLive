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
