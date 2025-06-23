# Development Plan: Building PageLive (Initial Steps)

## Objective

Create a script that will be loaded as a content script for all URLs and specifically for gemini (gemini.google.com) and grok (x.ai)

---

## Step-by-Step Plan

1. **Initialize Project Structure**

   - Create a new directory for the extension source code. `PageLive` will use Typescript and Vite.
   - Add folders for content scripts, manifest, and documentation.

2. **Create manifest.json**

   - Define the extension metadata.
   - Specify content scripts to be loaded for all URLs (`<all_urls>`) and for `gemini.google.com`.
   - Set permissions as needed (e.g., access to activeTab, storage).

3. **Implement General Content Script**

   - Write a basic content script (e.g., `general.js`) that will be injected into all pages.
   - Add a simple console log to verify injection.

4. **Implement Gemini-Specific Content Script**

   - Write a content script (e.g., `gemini.js`) for `gemini.google.com`.
   - Add a console log to verify it runs only on the Gemini site.

5. **Implement xAI-Specific Content Script**

   - Write a content script (e.g., `xai.js`) for `x.ai`.
   - Add a console log to verify it runs only on the xAI site.

6. **Update manifest.json to Register Both Scripts**

   - Ensure the manifest correctly matches and loads the right script(s) for each URL pattern.

7. **Test Content Script Loading**

   - Load the unpacked extension in a browser.
   - Visit various sites (including gemini.google.com, x.ai) to confirm the correct script(s) are injected.

8. **Set Up Basic ARIA Live Region in General Script**

    - Add code to inject an ARIA live region into the DOM for all pages.

9. **Set Up MutationObserver in General Script**

    - Add a MutationObserver to monitor DOM changes and log them.

10. **Prepare for Site-Specific Logic**

    - In `gemini.js`, add a placeholder for Gemini-specific accessibility enhancements.
    - In `xai.js`, add a placeholder for xAI-specific accessibility enhancements.

11. **Document the Setup**

    - Write a short README describing the manifest, content scripts, and how to test the extension.

---

Continue development by incrementally adding features, refactoring shared logic, and expanding site-specific support as needed.
