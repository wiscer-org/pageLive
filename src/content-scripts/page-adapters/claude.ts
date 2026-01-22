import { Keybinds } from '../keybind-manager';
import PageLive from '../pagelive';

const claudeAdapter = async () => {
    const pl = new PageLive();

    // Element references
    let chatInput: HTMLElement | null = null;
    let newChatButton: HTMLElement | null = null;

    const construct = async () => {
        pl.page.name = "Claude";
        await init();
    }
    const init = async () => {

        // Add keyboard shortcuts
        pl.utils.devLog("Registering keybinds..");
        pl.keybindManager.registerKeybind(Keybinds.FocusChatInput, focusChatInput);
        pl.keybindManager.registerKeybind(Keybinds.NewChat, startNewChat);

        pl.page.ready();
    }
    const resolve = {
        chatInput: async (): Promise<HTMLElement | null> => {
            let resolved = true;
            if (!chatInput) {
                resolved = false;
            } else if (!chatInput.isConnected) {
                pl.utils.prodWarn("Chat input disconnected from DOM - 2740");
                resolved = false;
            }

            if (!resolved) {
                const selector = 'div[data-testid="chat-input"]';
                chatInput = document.querySelector(selector);
            }

            if (!chatInput) {
                pl.utils.prodWarn("Chat input still not found - 2742");
                return null;
            }
            return chatInput as HTMLTextAreaElement;
        }
        , newChatButton: async (intent: string): Promise<HTMLElement | null> => {
            let resolved = true;
            if (!newChatButton) {
                resolved = false;
            } else if (!newChatButton.isConnected) {
                pl.utils.prodWarn(`New chat button disconnected from DOM - 2749. Intent: ${intent}`);
                resolved = false;
            }
            if (!resolved) {
                const selector = 'a[href="/new"]';
                newChatButton = document.querySelector(selector);
            }

            if (!newChatButton) {
                pl.utils.prodWarn(`New chat button still not found - 2934. Intent: ${intent}`);
                return null;
            }
            return newChatButton;
        }
    }
    const focusChatInput = async () => {
        await resolve.chatInput();
        pl.focusChatInput(chatInput);
    }
    /**
     * Start new chat, by clicking a button on side nav.
     */
    async function startNewChat() {
        if (isPageEmptyChat()) {
            pl.speak("You are already on a new chat page");
            return;
        }

        await resolve.newChatButton("startNewChat");
        if (!newChatButton) {
            const msg = "Failed to find the button to start new chat.";
            pl.toast(msg);
            return;
        }

        // Close all dialogs / modals first
        await closeAllDialogsAndModals();
        pl.speak("Starting new chat");
        // Waiting a bit to ensure any animations / transitions are complete
        await new Promise(r => setTimeout(r, 250));
        newChatButton.click();
    }
    /**
     * Test is the current page is an empty / new chat page.
     * @param url 
     * @returns 
     */
    function isPageEmptyChat(url?: string | undefined): boolean {
        if (!url) url = window.location.href;
        // If url is the base url, it is an empty chat
        const baseUrlPattern = /^https:\/\/claude\.ai\/new?$/;
        if (baseUrlPattern.test(url)) {
            return true;
        }
        return false;
    }
    function closeAllDialogsAndModals() {
        pl.pageInfoDialog.close();
    }

    await construct();
}

// Note: The callback is guaranteed to run because we set "document_start" in manifest.json
document.addEventListener('DOMContentLoaded', () => {
    claudeAdapter().catch((err) => {
        console.error("Error initializing Claude page adapter:", err);
    });
});



