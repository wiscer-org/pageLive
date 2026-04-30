import PageLive from "../pagelive";
import ElementObserver from "../element-observer";

const chatgptAdapter = async () => {
    const pl = new PageLive();

    const construct = async () => {

        observeForShortcutModal();

        await pl.page.ready();
    }
    const observeForShortcutModal = () => {
        const shortcutModal = new ElementObserver(
            async () => document.querySelector('[data-testid="keyboard-shortcuts-dialog"]'),
            // callback when dialog is opened.
            async (element) => {
                // No need to announce to users since SR will automatically announce the dialog when it is opened. In fact, announcing here will cause duplicate announcements which can be annoying for users.

                // Modify the shortcut to be accessible for SR users.
            },
            null,
            // Callback when dialog is closed.
            async (element) => {
                pl.speak("Keyboard shortcuts dialog is closed");
            },
        );
        shortcutModal.observe();
    };
    await construct();
}

// Note: The callback is guaranteed to run because we set "document_start" in manifest.json
document.addEventListener('DOMContentLoaded', () => {
    chatgptAdapter().catch((err) => {
        console.error("Error initializing ChatGPT page adapter:", err);
    });
});


