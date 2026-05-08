import ElementObserver from "../../element-observer";
import PageLive from "../../pagelive";

/**
 * This file is responsible for adapting the chat list dialog in ChatGPT.
 * Features:
 * - Announce when the chat list dialog is closed.
 * - Announces how many chats are in the dialog when it is opened or updated.
 */
export default class ChatGPTChatListDialog {

    pl!: PageLive;
    // The chat list dialog element
    chatListDialogElement: HTMLElement | null = null;

    constructor(pl: PageLive) {
        this.pl = pl;
        this.chatListModalConnectObserver.observe();
    }

    // An element div[data-testid="modal-fanny-pack"] will be added to the DOM when the chat list modal is opened.
    // The `div` contains a `dialog` element.

    /**
    * Observer to observer changes in the chat list. When there are changes, we will announce the updated number of chats in the dialog.
    */
    chatListChangesObserver = new MutationObserver((mutations) => {
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
            this.pl.speak("Chat list is updated.");
            this.scheduleToAnnounceNumberOfChats();
        }
    });

    /**
     * Schedule to announce the number of chats in the dialog. This is used to debounce the announcements when there are multiple changes in a short period of time.
     */
    announceTimeoutId: ReturnType<typeof setTimeout> | null = null;
    scheduleToAnnounceNumberOfChats = () => {
        if (this.announceTimeoutId) clearTimeout(this.announceTimeoutId);

        this.announceTimeoutId = setTimeout(() => {
            this.announceNumberOfChats();
            this.announceTimeoutId = null;
        }, 1e3);
    };


    /**
     * Announce how many chats in the dialog.
     */
    announceNumberOfChats = () => {
        if (!this.chatListDialogElement) return;

        // Chat item selector `a[href^="/c/"]` is used to find the chat items in the dialog.
        const chatItems = this.chatListDialogElement.querySelectorAll('a[href^="/c/"]');
        this.pl.speak(`There are ${chatItems.length} chats in the chat list dialog.`);
    }

    /**
     * Observer to observe changes in the chat item highlight. When the highlight changes, we will announce the title of the highlighted chat.
     */
    chatItemHighlightObserver = new MutationObserver((mutations) => {
        let highlightedChatItem: HTMLElement | null = null;
        for (const mutation of mutations) {
            if (mutation.type === "attributes"
                && mutation.attributeName === "class") {
                const target = mutation.target as HTMLElement;
                const parentTarget = target.parentElement;

                // Check if the parent element contains [href^="/c/"], which indicates the `element` is a chat item.
                if (parentTarget && parentTarget.matches('a[href^="/c/"]')) {
                    // Check if the target element has more classes than before
                    if (mutation.oldValue) {
                        const oldClassList = mutation.oldValue.split(" ").filter(c => c);
                        const newClassList = target.classList;
                        if (newClassList.length > oldClassList.length) {
                            // Limit the characters to avoid announcing too long chat title.
                            const chatTitle = parentTarget.textContent?.slice(0, 80) || "";
                            this.scheduleToAnnounceChatItemHighlight(chatTitle);
                            break;
                        }
                    }
                }
            }
        }
    });

    // Timeout id for announcing chat item highlight
    announceChatItemHighlightTimeoutId: ReturnType<typeof setTimeout> | null = null;

    scheduleToAnnounceChatItemHighlight = (chatTitle: string) => {
        if (this.announceChatItemHighlightTimeoutId) clearTimeout(this.announceChatItemHighlightTimeoutId);

        this.announceChatItemHighlightTimeoutId = setTimeout(() => {
            this.pl.speak(`Chat: ${chatTitle}. Press enter to load chat or type to filter chats.`);
            this.announceChatItemHighlightTimeoutId = null;
        }, 500);
    }

    /**
    * Callback when chat list modal is opened
    */
    async onChatListModalOpen(element: HTMLElement) {
        // No need to announce to users since SR will automatically announce the dialog when it is opened. In fact, announcing here will cause duplicate announcements which can be annoying for users.

        // Store ref to the chat list dialog element
        this.chatListDialogElement = element;

        this.announceNumberOfChats();
        // Observe changes in the chat list and announce the updated list 
        this.chatListChangesObserver.observe(element, { childList: true, subtree: true });

        // ChatGPT provides a feature that users can press up / down, making the highlight to move different chat items in the list, allowing users to quickly swich to different chat.
        // Note: When the chat list dialog is open, the focus move to the search bar in the dialog.
        // Note the focus is not changing, only the class of the chat item is changing. Let's call it 'pseudo focus'.
        // The highlighted chat item will have more classes. 
        // We will assume the chat is highlighted when it receives more classes.
        this.chatItemHighlightObserver.observe(element, {
            attributes: true,
            attributeFilter: ["class"],
            attributeOldValue: true,
            subtree: true
        });
    }

    chatListModalConnectObserver = new ElementObserver(
        async () => document.querySelector('[data-testid="modal-fanny-pack"]'),
        this.onChatListModalOpen.bind(this),
        null,
        // Callback when dialog is closed.
        async (element) => {
            this.pl.speak("Chat list dialog is closed");
            this.chatListChangesObserver.disconnect();
            this.chatItemHighlightObserver.disconnect();
        }
    );

}
