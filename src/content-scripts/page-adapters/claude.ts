import { Keybinds } from '../keybind-manager';
import PageLive from '../pagelive';

const claudeAdapter = async () => {
    const pl = new PageLive();

    // Element references
    let sideNavElement: HTMLElement | null = null;
    let chatInput: HTMLElement | null = null;
    let newChatButton: HTMLElement | null = null;
    let toggleSidebarButton: HTMLElement | null = null;

    const construct = async () => {
        pl.page.name = "Claude";
        await init();
    }
    const init = async () => {

        // Add keyboard shortcuts
        pl.utils.devLog("Registering keybinds..");
        pl.keybindManager.registerKeybind(Keybinds.FocusChatInput, focusChatInput);
        pl.keybindManager.registerKeybind(Keybinds.NewChat, startNewChat);
        pl.keybindManager.registerKeybind(Keybinds.ToggleSidebar, toggleSidebar);

        pl.page.ready();
    }
    const resolve = {
        /**
         * 
         * @param intent Usually the function name that calls this function. Used for logging.
         * @returns 
         */
        sideNavElement: async (intent: string): Promise<HTMLElement | null> => {
            sideNavElement = await pl.resolve(
                sideNavElement
                , "nav[aria-label='Sidebar']"
                , "Sidebar"
                , intent
            );
            return sideNavElement;
        }
        , chatInput: async (intent: string): Promise<HTMLElement | null> => {
            chatInput = await pl.resolve(
                chatInput
                , 'div[data-testid="chat-input"]'
                , "Chat Input"
                , intent
            );
            return chatInput;
        }
        , newChatButton: async (intent: string): Promise<HTMLElement | null> => {
            newChatButton = await pl.resolve(
                newChatButton
                , 'a[href="/new"]'
                , "New Chat Button"
                , intent
            );
            return newChatButton;
        }
        , toggleSidebarButton: async (intent: string) => {
            toggleSidebarButton = await pl.resolve(
                toggleSidebarButton
                , 'button[data-testid="pin-sidebar-toggle"]'
                , "Toggle Sidebar Button"
                , intent
            );
            return toggleSidebarButton;
        }
    }
    const focusChatInput = async () => {
        await resolve.chatInput("focusChatInput");
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
    async function toggleSidebar() {
        await resolve.toggleSidebarButton("toogleSidebar");
        if (!toggleSidebarButton) {
            pl.toast("Failed to find the toggle sidebar button.");
            return;
        }
        // Close all dialogs / modals first
        await closeAllDialogsAndModals();
        await new Promise(r => setTimeout(r, 50));

        // Click the toogle button 
        toggleSidebarButton.click();

        // Inform users about the action
        // The sidebar is expanded if the button has attribute `aria-pressed="true"`, else collapsed
        let msg = "Toggling sidebar";
        let isExpanded: boolean | undefined; // Used to inform users later
        const ariaPressedAttribute = toggleSidebarButton.getAttribute('aria-pressed');
        if (ariaPressedAttribute === 'true') {
            msg = "Collapsing sidebar";
            isExpanded = false;
        } else if (ariaPressedAttribute === 'false') {
            msg = "Expanding sidebar";
            isExpanded = true;
        }
        pl.speak(msg)
        await new Promise(r => setTimeout(r, 1e3)); // Wait for animation

        // Focus on the 'Recent' button (h3)
        await resolve.sideNavElement("toggleSidebar");
        if (isExpanded && sideNavElement) {
            const focusableSelector = 'h3[role="button"]';
            const firstFocusable = sideNavElement.querySelector(focusableSelector) as HTMLElement;
            if (firstFocusable) {
                firstFocusable.focus();
                pl.toast("Focus moved to sidebar.");
            }
        } else if (!isExpanded) {
            // Focus back to chat input. No need to announce, since SR will announce when focus on chat input
            await focusChatInput();
        }
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



