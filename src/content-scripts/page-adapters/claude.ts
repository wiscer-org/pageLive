import { Keybinds } from '../keybind-manager';
import PageLive from '../pagelive';
import ChatObserver from '../chat-observer';
import { time } from 'console';
import { parse } from 'path';

const claudeAdapter = async () => {
    const pl = new PageLive();
    let chatObserver !: ChatObserver;

    // Element references
    let chatContainer: HTMLElement | null = null;
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

        // Initialize chat observer
        chatObserver = new ChatObserver(
            pl
            , parseResponseContainer
            , parseResponseElement
            , async () => void 0
            , async () => void 0
        );
        await resolve.chatContainer("init");
        chatObserver.connect(chatContainer, null);

        console.log("Chat container:", chatContainer);

        // DELETE ME: observe added nodes to body for debugging
        const bodyObserver = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                for (const node of mutation.addedNodes) {
                    console.log("Body added node:", node);
                }
            }
        });
        // bodyObserver.observe(document.body, { childList: true, subtree: true });


        pl.page.ready();
    }
    const resolve = {
        chatContainer: async (intent: string): Promise<HTMLElement | null> => {
            chatContainer = await pl.resolve(
                chatContainer
                , "#main-content > div > div> div > div > div > div"
                , "Chat Container"
                , intent
            );
            return chatContainer;
        }
        /**
         * @param intent Usually the function name that calls this function. Used for logging.
         * @returns 
         */
        , sideNavElement: async (intent: string): Promise<HTMLElement | null> => {
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

    /**
     * Parse the response container element from added nodes in `chatContainer`
     */
    const parseResponseContainer = (node: Node): HTMLElement | null => {
        // !IMPORTANT: The new response container when added is only: 
        // `<div data-test-render-count="1"></div>`
        // So it does not have any children when added.
        //
        // So we can tell if the added node is a response container by checking one of:
        // 1. `div[data-test-render-count]` that has descendant `[data-is-streaming]`
        // 2. `div[data-test-render-count="1"]` without any children

        // There is a chance when prev prompts and responses are loaded, all has `[data-test-render-count="1"]` 
        // But then will be changed to `[data-test-render-count="2"]`
        // So we can not decide solely based on `[data-test-render-count="1"]`. Thus we also check if it has children.

        // Note: 
        // `node` is a prompt container if has attribute `data-test-render-count` & has descendant [data-testid="user-message"]
        // `node` is a response container if has attribute `data-test-render-count` & has descendant [data-is-streaming]
        console.log("[PageLive][1] Parsing response container node:", node);
        if (node instanceof HTMLElement
            && node.hasAttribute('data-test-render-count')) {
            // return node.querySelector('[data-is-streaming]') as HTMLElement;
            // console.log(node.outerHTML);

            if (node.getAttribute('data-test-render-count') === '1' && node.children.length === 0) {
                console.log("[PageLive][1] Found response container node (no children):", node);
                return node as HTMLElement
            }

            if (node.querySelector('[data-is-streaming]') != null) {
                console.log("[PageLive][1] Found response container node:");
                console.log(node);
                return node;
            }
        }
        return null;
    }

    /**
     * Parse the response element from added nodes in `responseContainer`
     */
    const parseResponseElement = async (rc: HTMLElement): Promise<HTMLElement | null> => {
        // The response element selector relative to response container is:
        // `[data-is-streaming] .standard-markdown`

        // Note: Since when new response container is added, it has no children,
        // so we need to observe the the RC for changes to get the response element or until timeout.

        if (!(rc instanceof HTMLElement)) {
            pl.utils.devLog("Below RC is not an HTMLElement - 7230:");
            console.log(rc);
            return null;
        }

        console.log("[PageLive][2] Parsing response element from response container:", rc);
        function parseIt(rc: HTMLElement): HTMLElement | null {
            // return rc.querySelector('[data-is-streaming] .standard-markdown') as HTMLElement;
            const responseElement = rc.querySelector('[data-is-streaming] .standard-markdown') as HTMLElement;
            if (responseElement != null) {
                console.log("[PageLive][2] Found response element:");
                console.log(responseElement);
                return responseElement;
            }

            console.log("[PageLive][2] XXX Response element not found in response container.");
            console.log(rc.outerHTML)
            return null;
        }

        // The goal of this function is to return the response element when it is available.
        let responseElement: HTMLElement | null = parseIt(rc);
        // If found, return it directly
        if (responseElement != null) {
            return responseElement;
        }

        // If response element not found, observe the RC for changes to get response element
        return new Promise<HTMLElement | null>((resolve) => {
            const stopObserve = () => {
                if (stopObserveTimeout) {
                    clearTimeout(stopObserveTimeout);
                }
                responseObserver.disconnect();
                resolve(responseElement);
            }

            // Schedule to disconnect the observer after timeout
            let stopObserveTimeout: ReturnType<typeof setTimeout> = setTimeout(stopObserve, 15e3); // 15 seconds

            /**
            * Observe the RC for changes to get the response element
            */
            const responseObserver = new MutationObserver((mutations, obs) => {
                responseElement = parseIt(rc);
                console.log("Observing RC for response element...", responseElement);
                if (responseElement != null) {
                    // Response element found
                    pl.utils.devLog("Response element found, disconnecting observer.");
                    stopObserve();
                }
            });
            // Observe the RC
            responseObserver.observe(rc, { childList: true, subtree: true });
        });
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



