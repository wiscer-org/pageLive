import ElementObserver from "../element-observer";
import PageLive from "../pagelive";

/**
 * This file is responsible for adapting the chat list dialog in ChatGPT.
 * Features:
 * - Announce when the chat list dialog is closed.
 * - Announces how many chats are in the dialog when it is opened or updated.
 */
export default function adaptChatGPTChatListDialog(pl: PageLive) {

    // The chat list dialog element
    let chatListDialogElement: HTMLElement | null = null;

    // An element div[data-testid="modal-fanny-pack"] will be added to the DOM when the chat list modal is opened.
    // The `div` contains a `dialog` element.

    /**
    * Observer to observer changes in the chat list. When there are changes, we will announce the updated number of chats in the dialog.
    */
    const chatListChangesObserver = new MutationObserver((mutations) => {
        let shouldAnnounce = false;
        // Should announce if any element, or contain element, `a[href^="/c/"]` is added or removed.
        mutations.forEach((mutation) => {
            for (let i = 0; i < mutation.addedNodes.length; i++) {
                const node = mutation.addedNodes[i];
                if (node instanceof HTMLElement
                    && (node.matches('a[href^="/c/"]') || node.querySelector('a[href^="/c/"]'))) {
                    shouldAnnounce = true;
                    break;
                }
            }
            for (let i = 0; i < mutation.removedNodes.length; i++) {
                const node = mutation.removedNodes[i];
                if (node instanceof HTMLElement
                    && (node.matches('a[href^="/c/"]') || node.querySelector('a[href^="/c/"]'))) {
                    shouldAnnounce = true;
                    break;
                }
            }
        });

        if (shouldAnnounce) {
            pl.speak("Chat list is updated.");
            scheduleToAnnounceNumberOfChats();
        }
    });

    /**
     * Schedule to announce the number of chats in the dialog. This is used to debounce the announcements when there are multiple changes in a short period of time.
     */
    let announceTimeoutId: ReturnType<typeof setTimeout> | null = null;
    const scheduleToAnnounceNumberOfChats = () => {
        if (announceTimeoutId) clearTimeout(announceTimeoutId);

        announceTimeoutId = setTimeout(() => {
            announceNumberOfChats();
            announceTimeoutId = null;
        }, 1e3);
    };

    /**
     * Announce how many chats in the dialog.
     */
    const announceNumberOfChats = () => {
        if (!chatListDialogElement) return;

        // Chat item selector `a[href^="/c/"]` is used to find the chat items in the dialog.
        const chatItems = chatListDialogElement.querySelectorAll('a[href^="/c/"]');
        pl.speak(`There are ${chatItems.length} chats in the chat list dialog.`);
    }

    /**
    * Callback when chat list modal is opened
    */
    const onChatListModalOpen = async (element: HTMLElement) => {
        // No need to announce to users since SR will automatically announce the dialog when it is opened. In fact, announcing here will cause duplicate announcements which can be annoying for users.

        // Store ref to the chat list dialog element
        chatListDialogElement = element;

        announceNumberOfChats();
        // Observe changes in the chat list and announce the updated list 
        chatListChangesObserver.observe(element, { childList: true, subtree: true });
        // observeChatListChanges();
    }

    const chatListModalConnectObserver = new ElementObserver(
        async () => document.querySelector('[data-testid="modal-fanny-pack"]'),
        onChatListModalOpen,
        null,
        // Callback when dialog is closed.
        async (element) => {
            pl.speak("Chat list dialog is closed");
            // chatListChangesObserver.disconnect();
        }
    );
    chatListModalConnectObserver.observe();
}



// const observeForChatListModal = () => {

// An element div[data-testid="modal-fanny-pack"] will be added to the DOM when the chat list modal is opened.
// The `div` contains a `dialog` element.


// };
