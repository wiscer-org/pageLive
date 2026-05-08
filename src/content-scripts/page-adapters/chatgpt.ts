import PageLive from "../pagelive";
import ElementObserver from "../element-observer";
import adaptChatGPTChatListDialog from "./chatgpt-chat-list-dialog";
import adaptChatGPTSidebar from "./chatgpt-sidebar";
import ChatGPTChatSection from "./chatgpt-chat";
import ChatGPTSidebar from "./chatgpt-sidebar";

const chatgptAdapter = async () => {
    const pl = new PageLive();

    const construct = async () => {

        observeForShortcutModal();
        const chatSectionAdapter = new ChatGPTChatSection(pl);
        const sidebarAdapter = new ChatGPTSidebar(pl, chatSectionAdapter.focusChatInput.bind(chatSectionAdapter)); 

        adaptChatGPTChatListDialog(pl);

        await pl.page.ready();
    }
    const observeForShortcutModal = () => {

        const shortcutModal = new ElementObserver(
            async () => document.querySelector('[data-testid="keyboard-shortcuts-dialog"]'),
            onShortcutModalOpen,
            null,
            // Callback when dialog is closed.
            async (element) => {
                pl.speak("Keyboard shortcuts dialog is closed");
            },
        );
        shortcutModal.observe();
    };

    /**
    * Callback when shortcut modal is opened
    */
    const onShortcutModalOpen = async (element: Element) => {
        // No need to announce to users since SR will automatically announce the dialog when it is opened. In fact, announcing here will cause duplicate announcements which can be annoying for users.

        // Modify the shortcut to be accessible for SR users.
        // Strategy: First find the `li` elements that has button[aria-label="Change key sequence"] which contains the shortcut key sequence.
        // Append the shortcut key to the end of the `label` element that is the previous sibling of the `button`
        // Element hierarchy: `li` > `button` + `label` + (`div` > `div` > `button[aria-label="Change key sequence"]`)

        // Find the `li` elements that has button[aria-label="Change key sequence"]
        const shortcutItems = element.querySelectorAll('li:has(button[aria-label="Change key sequence"])');
        shortcutItems.forEach((item) => {
            const label = item.querySelector('label');
            const shortcutButton = item.querySelector('button[aria-label="Change key sequence"]');
            if (label && shortcutButton) {
                // Get the shortcut key sequence from the button's `kbd` element. The `kbd` element is a child of the button and contains the shortcut key sequence.
                const kbdElements = shortcutButton.querySelectorAll('kbd');
                const shortcutKey = Array.from(kbdElements).map(kbd => {
                    // Replace inaccessible characters with more accessible ones. For example, replace " " with "Space".
                    if (kbd.textContent === '⏎') return 'Enter';
                    if (kbd.textContent === '⌫') return 'Backspace';
                    if (kbd.textContent === ' ') return 'Space';

                    return kbd.textContent;
                }).join('+');
                // Append the shortcut key to the end of the label's text content and aria-label
                if (shortcutKey) {
                    // Append the shortcut key to the end of the label's text content
                    label.textContent += ` (${shortcutKey})`;
                    // Append the shortcut key to the end of the label's aria-label as well for better SR announcement
                    const ariaLabel = label.getAttribute('aria-label') || '';
                    label.setAttribute('aria-label', `${ariaLabel}. Current shortcut: ${shortcutKey}`);
                }
            }
        });
    };

    await construct();
}

// Note: The callback is guaranteed to run because we set "document_start" in manifest.json
document.addEventListener('DOMContentLoaded', () => {
    chatgptAdapter().catch((err) => {
        console.error("Error initializing ChatGPT page adapter:", err);
    });
});


