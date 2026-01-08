import { Keybinds } from "../keybind-manager";
import PageLive from "../pagelive";
import ChatObserver from "../chat-observer";
import { Chat } from "../../types/chat";

const grokAdapter = async () => {
    const pl = new PageLive();

    // Observer to handle incoming responses
    let chatObserver !: ChatObserver;
    // On empty chat, the chat container does not exist. It will be created everytime the first prompt is sent.
    // We need a parent container, that will not be disconnected or removed, to observe the chat container being added.
    let chatContainerParent: HTMLElement | null = null;
    // Direct parent element of each previous chat units
    let chatContainer: HTMLElement | null = null;
    // Grok specific ref to the last replay container, containing the latest prompt and response
    let lastReplayContainer: HTMLElement | null = null;
    let chatInput: HTMLElement | null = null;
    // Side nav element
    let sideNavElement: HTMLElement | null = null;
    let newChatButton: HTMLElement | null = null;
    let toggleSidebarButton: HTMLElement | null = null;

    const construct = async () => {
        pl.page.name = "grok";
        await init();
    }
    const init = async () => {
        pl.utils.devLog("Initializing..");

        // Query required elements
        await waitFor.all();
        // Validate elements, useful to query elements that are not included in the `waitFor` functions
        await resolve.all();

        pl.initialAnnounceInfo.push("grok");

        // Add keyboard shortcuts
        pl.utils.devLog("Registering keybinds..");
        pl.keybindManager.registerKeybind(Keybinds.FocusChatInput, focusChatInput);
        pl.keybindManager.registerKeybind(Keybinds.AnnounceLastResponse, announceLastResponse);
        // Add keybind: New chat
        pl.keybindManager.registerKeybind(Keybinds.NewChat, startNewChat);
        // Add keybind: Toggle sidebar
        pl.keybindManager.registerKeybind(Keybinds.ToggleSidebar, toogleSidebar);

        // Add callback to be executed the next time dialog is shown
        pl.pageInfoDialog.onEveryOpenCallback = onDialogOpen;

        // Add external classes
        chatObserver = new ChatObserver(
            pl
            , parseResponseContainer
            , parseResponseElement
            , handleResponseElementNotFound
            , beforeHandleResponsesInMutation
            , postInitialRender
        );
        if (chatContainer) {
            pl.utils.devLog("Connecting to chat container during initialization..");
            await chatObserver.connect(chatContainer, lastReplayContainer);
        }

        // Observe chat container being added or removed
        await observeChatContainer();
        // await observeChatContainerXX();

        await pl.page.ready();
    }
    const onDialogOpen = async () => {
        pl.utils.devLog("Dialog opened on grok");
    }
    /**
     * Detect if chat container is added, and connect the chatObserver
     */
    const observeChatContainer = async () => {
        resolve.chatContainer("observeChatContainer init");
        let isChatContainerExistPrev = chatContainer !== null;
        let isChatContainerExistNow = isChatContainerExistPrev;

        const chatContainerObserver = new MutationObserver(async (mutations) => {
            // Note: The chat container will be added as descendant of `main.@container`

            // If chat container has been disconnected, previous chat container existence is false
            isChatContainerExistPrev = isChatContainerExistNow
                && chatContainer !== null
                && chatContainer?.isConnected;
            await resolve.chatContainer("chatContainerObserver triggered");
            isChatContainerExistNow = chatContainer !== null;

            // When chat container is added, connect the chatObserver
            if (isChatContainerExistPrev === false && isChatContainerExistNow === true) {
                pl.utils.devLog("Chat container has been ADDED to the DOM");
                resolve.lastReplayContainer();
                await chatObserver.connect(chatContainer!, lastReplayContainer);
            } else if (isChatContainerExistPrev === true && isChatContainerExistNow === false) {
                // When chat container is removed, chatObserver should disconnect automatically via ChatObserver logic
                pl.utils.devLog("Chat container has been REMOVED from the DOM");
            }
        });

        // const chatContainerParent = document.querySelector('[data-testid="drop-ui"]') as HTMLElement | null;
        if (chatContainerParent) {
            pl.utils.devLog("Observing `chatContainerParent` for chat container changes");
            chatContainerObserver.observe(chatContainerParent, {
                childList: true
                , subtree: true
                , attributes: true
                , attributeOldValue: true
                , attributeFilter: ['class']
            });
        } else {
            pl.utils.prodWarn("Element chatContainerParent is null, cannot observe chat container changes - 319");
        }
    }

    /**
     * Wait for required elements to be available. Functions will throw errors if failed.
     */
    const waitFor = {
        chatContainerParent: async () => {
            // let element = await pl.utils.waitForAnElement('main.\\@container', 12e3);
            let element = await pl.utils.waitForAnElement('[data-testid="drop-container"] > [data-testid="drop-ui"]', 12e3);
            if (!element) {
                throw new Error("Failed waiting for chat container parent - 294");
            }
            chatContainerParent = element as HTMLElement;
            return chatContainerParent;
        },
        // chatInput: async () => {
        //     chatInput = await pl.utils.waitForAChildElement(chatContainerParent || document.body
        //         , ".\\@container form div[contenteditable='true']");
        //     if (!chatInput) {
        //         throw new Error("Failed waiting for chat input - 307");
        //     }
        //     return chatInput;
        // },
        sideNavElement: async () => {
            sideNavElement = await pl.utils.waitForAnElement('div[data-sidebar="sidebar"]', 12e3) as HTMLElement;
            if (!sideNavElement) {
                throw new Error("Failed waiting for side nav element - 9287");
            }
            return sideNavElement;
        },
        all: async () => {
            // !IMPORTANT!: The order matters here, chatContainerParent must be waited first
            return await waitFor.chatContainerParent()
                // && await waitFor.chatInput()
                && await waitFor.sideNavElement();
        }
    }

    /**
     * A collection to validate & re-query various elements. 
     * Return false if element can not be resolved. Note that some elements may be optional.
     * Each of function is not mandatory - will not throw error when failed. 
     */
    const resolve = {
        chatContainerParent: async () => {
            let isValid = true;
            if (!chatContainerParent) {
                pl.utils.prodWarn("Chat container parent is null - 936");
                isValid = false;
            }
            if (isValid && !chatContainerParent?.isConnected) {
                pl.utils.prodWarn("Chat container parent is not connected - 940");
                isValid = false;
            }
            if (!isValid) {
                // Use `waitForAchildElement` as we are waiting for the page to be ready
                chatContainerParent = await waitFor.chatContainerParent();
                // chatContainerParent = await pl.utils.waitForAChildElement(document.body
                //     , 'main.\\@container') as HTMLElement;
            }
            if (!chatContainerParent) {
                // We use prodWarn here as this is critical
                pl.utils.prodWarn("Could not find chat container parent - 948");
                chatContainerParent = null;
                return false;
            }
            return true;
        },
        /**
         * @param intentMsg The message to display when chat container is null, not connected, or not found
         */
        chatContainer: async (intentMsg: string) => {
            if (!chatContainer || !chatContainer.isConnected) {
                if (!chatContainer) pl.utils.devLog(`Resolving chat container -7294. Intent: ${intentMsg}`);
                if (chatContainer && !chatContainer.isConnected) pl.utils.devLog(`Chat container is not connected - 9233. Intent: ${intentMsg}`);

                await resolve.chatContainerParent();
                if (!chatContainerParent) {
                    chatContainer = null;
                    return false;
                }
                // Do not use `waitForAChildElement` since the element will not exist on empty chat
                chatContainer = chatContainerParent.querySelector('.\\@container\\/chat > div > div.items-center') as HTMLElement;
            }
            if (!chatContainer) {
                pl.utils.devLog(`Could not find chat container - 3961. Intent: ${intentMsg}`);
                return false;
            }
            return true;
        },
        lastReplayContainer: async () => {
            if (!lastReplayContainer || !lastReplayContainer.isConnected) {
                if (lastReplayContainer && !lastReplayContainer.isConnected) pl.utils.devLog("Last replay container is not connected - 933");
                // Important: query inside `chatContainerParent`, not `chatContainer` since it may be not exist
                lastReplayContainer = chatContainerParent?.querySelector('#last-reply-container') as HTMLElement;
            }
            if (!lastReplayContainer) {
                pl.utils.devLog("Could not find last replay container - 976");
                lastReplayContainer = null;
                return false;
            }
            return true;
        },
        chatInput: async () => {
            if (!chatInput || !chatInput.isConnected) {
                pl.utils.devLog("Chat input is null or not connected - 204");
                chatInput = document.querySelector(".\\@container form div[contenteditable='true']") as HTMLElement;
            }
            if (!chatInput) {
                pl.utils.devLog("Could not find chat input - 964");
                chatInput = null;
                return false;
            }
            return true;
        },
        sideNavElement: async () => {
            if (!sideNavElement || !sideNavElement.isConnected) {
                pl.utils.devLog("Side nav element is null or not connected - 2170");
                sideNavElement = await waitFor.sideNavElement();
            }
            if (!sideNavElement) {
                pl.utils.devLog("Could not find side nav element - 2126");
                sideNavElement = null;
                return false;
            }
            return true;
        },

        all: async () => {
            return await resolve.chatContainerParent()
                && await resolve.chatInput()
                && await resolve.chatContainer("resolve all")
                && await resolve.lastReplayContainer()
                && await resolve.sideNavElement()
                && await resolve.toggleSidebarButton()
                && await resolve.newChatButton()
                ;
        },
        newChatButton: async () => {
            await resolve.sideNavElement();
            if (!sideNavElement) {
                pl.utils.devLog("Side nav element is null when resolving new chat button - 5797");
                return false;
            }

            if (!newChatButton || !newChatButton.isConnected) {
                if (newChatButton && !newChatButton.isConnected) pl.utils.devLog("New chat button is not connected - 2881");
                newChatButton = sideNavElement.querySelector('a[href="\/"]') as HTMLElement;
            }
            if (!newChatButton) {
                pl.utils.devLog("Could not find new chat button - 9232");
                newChatButton = null;
                return false;
            }
            return true;
        }
        , toggleSidebarButton: async () => {
            await resolve.sideNavElement();
            if (!sideNavElement) {
                // No need to use prodWarn here as it is already warned in sideNavElement resolver
                pl.utils.devLog("Side nav element is null when resolving toggle sidebar button - 5797");
                return false;
            }
            if (!toggleSidebarButton || !toggleSidebarButton.isConnected) {
                pl.utils.devLog("Toggle sidebar button is null or not connected - 2830");
                toggleSidebarButton = sideNavElement.querySelector('[data-sidebar="trigger"]');
            }
            if (!toggleSidebarButton) {
                pl.utils.devLog("Could not find toggle sidebar button - 2126");
                toggleSidebarButton = null;
                return false;
            }
            return true;
        }
    }
    const focusChatInput = async () => {
        await resolve.chatInput();
        pl.focusChatInput(chatInput);
    }
    /**
     * Get all chat unit elements in the chat container
     * @returns NodeListOf<Element> | undefined
     */
    const getChatUnitElements = async (): Promise<NodeListOf<Element> | undefined> => {
        await resolve.chatContainer("getChatUnitElements");
        if (!chatContainer) pl.utils.prodWarn("Chat container is null when getting chat unit elements - 1073");
        return chatContainer?.querySelectorAll('div[id^="response-"] > div.message-bubble > div.relative > div > div.response-content-markdown');
    }
    /**
     * Announce the last response in the chat container
     */
    const announceLastResponse = async () => {
        // Ensure we have the lastReplayContainer
        await resolve.lastReplayContainer();
        if (!lastReplayContainer) {
            pl.utils.devLog("No last replay container found - 927");
            return;
        }

        if (!lastReplayContainer.children) {
            pl.utils.devLog("Last replay container has no children - 4914");
            return;
        }
        // Prompt and response are both inside lastReplayContainer
        if (lastReplayContainer.children.length < 2) {
            pl.utils.devLog(`Last replay container children < 2, total: ${lastReplayContainer.children.length} - 3513`);
            pl.utils.devLog("Last replay container children:");
            console.log(lastReplayContainer.children);
            return;
        }

        const lastResponseContainer = lastReplayContainer.children[1] as HTMLElement;
        // Use `.response-content-markdown` directly as Grok does not use `.message-bubble` on multiple responses
        // const messageBubble = lastResponseContainer.querySelector('div.message-bubble');
        const responseContentMarkdown = lastResponseContainer.querySelector('div.response-content-markdown')
        if (responseContentMarkdown) {
            let msg = responseContentMarkdown.innerHTML || '';
            pl.utils.devLog("Reading last response");
            pl.announce({ msg: "Reading last response.", o: true });
            pl.announce({ msg, o: true });
            pl.announce({ msg: "End of last response.", o: true });
        } else {
            pl.announce({ msg: "No last response is found.", o: true });
            pl.utils.devLog("Latest response element does not contain response-content-markdown - 982");
        }
    }
    /**
     * Test whether the node, added when receiving incoming response, is the response container
     * @param {Node} node Node to be tested
     * @returns boolean
     */
    const parseResponseContainer = (node: Node): HTMLElement | null => {
        // console.log("Testing node for response container:", node);
        if (!(node instanceof HTMLElement)) {
            // pl.utils.devLog("Node is not an HTMLElement - 831");
            return null;
        }
        // Check if the node matches the expected structure of response container
        // For Grok, we assume the response container has a specific class or structure
        // Here we use a placeholder condition; replace it with actual logic as needed

        // When rendering new response: Node is a response container if has descendant with id starting with 'response-'
        let el = node.querySelector(".items-start[id^='response-']");
        if (el) {
            // pl.utils.devLog("Node is a response container, has id ^='response-'");
            // console.log(el);
            return el as HTMLElement;
        }

        // When rendering previous responses: Node is a response container if it has class 'items-start' and id starting with 'response-'
        if (node.tagName.toLowerCase() === 'div' &&
            node.id?.startsWith('response-') &&
            node.classList.contains('items-start')) {
            // pl.utils.devLog("Node is a response container, has id ^='response-'");
            return node as HTMLElement;
        }

        // Sometimes grok gives 2 responses, asking users which one is better.
        // Each of the response will be inside a `div.@container/split-chat` element
        el = node.querySelector('div.\\@container\\/split-chat');
        if (el) {
            pl.announce({ msg: "Detected multiple responses.", o: true });
            return el as HTMLElement;
        }

        // if (node.querySelector('.items-start')) {
        //     pl.utils.devLog("Node is a response container via items-start class");
        //     return true;
        // }
        return null;
    }
    /**
     * Parse the response element from the response container, used by ChatObserver.
     * @param responseContainer 
     * @returns 
     */
    const parseResponseElement = (responseContainer: HTMLElement): HTMLElement | null => {
        if (!(responseContainer instanceof HTMLElement)) {
            pl.utils.devLog("Response container is not an HTMLElement - 1053");
            return null;
        }
        // We remove the `.message-bubble` part as Grok not using this class on multiple response (ask users for preference)
        // const el = responseContainer.querySelector('div.message-bubble > div > div > div.response-content-markdown') as HTMLElement;
        const el = responseContainer.querySelector('div > div.response-content-markdown') as HTMLElement;
        if (!el) {
            pl.utils.devLog("Could not find response content markdown element inside response container - 1060");
            return null;
        }
        return el;
    }
    /**
     * Handle the situation when the response element cannot be found within a newly added response container.
     * @param rc 
     */
    const handleResponseElementNotFound = async (rc: HTMLElement) => {
        // On error response element, .response-content-markdown will not exist
        // In that case, just read the whole text content
        if (rc.textContent) pl.speak(rc.textContent);
    }
    /**
     * Handle mutation on chat container, which the added nodes maybe response containers
     */
    const beforeHandleResponsesInMutation = async (
        mutationList: MutationRecord[]
        , observer: MutationObserver
    ) => {
        // Placeholder for any pre-processing before handling responses in mutation
        // For example, logging or filtering mutations
        pl.speak("Grok replies:");
    }
    /**
     * After the initial previous chat has been rendered
     */
    const postInitialRender = async (
        prevResponseConts: HTMLElement[]
        , disconnectedResponseConts: HTMLElement[]
        , currentResponseConts: HTMLElement[]
    ) => {

        // get all `chatUnit` elements
        // const chatUnits = await getChatUnitElements();
        // if (!chatUnits) {
        //     pl.utils.devLog("No previous chat units found.");
        //     return;
        // }

        // if (chatUnits.length % 2 !== 0) {
        //     pl.utils.prodWarn(`Expected even number of chat units (prompts and responses), but got ${chatUnits.length}`);
        //     console.log(chatUnits)
        // }
        // const totalResponses = chatUnits.length / 2;

        // Possible scenarios:
        // 1. Page load
        // 2. User switched from one chat to another chat - all previous responses are removed, then new previous responses are added
        // 3. User scrolled up to load more previous responses - only new previous responses are added
        const isPageLoad = (prevResponseConts.length === 0
            && disconnectedResponseConts.length === 0
            && currentResponseConts.length > 0)
            || false;
        const isUserSwitched = (prevResponseConts.length > 0
            && disconnectedResponseConts.length === prevResponseConts.length
            && currentResponseConts.length > 0)
            || false;
        // The diff in length > 1 to avoid false positive when new response is added after user sent a prompt
        const isUserScrolledUp = (disconnectedResponseConts.length === 0
            && currentResponseConts.length - prevResponseConts.length > 1)
            || false;

        let msg = '';
        if (isPageLoad || isUserSwitched)
            msg = `${currentResponseConts.length} previous responses has been loaded`;
        else if (isUserScrolledUp) {
            const addedResponsesCount = currentResponseConts.length - prevResponseConts.length;
            msg = `${addedResponsesCount} previous responses has been loaded by scrolling up`;
        }

        // console.log(">>> postInitialRender debug info:");
        // console.log(`Previous responses count: ${prevResponseConts.length}`);
        // console.log(`Disconnected responses count: ${disconnectedResponseConts.length}`);
        // console.log(`Current responses count: ${currentResponseConts.length}`);

        if (msg !== '') {
            pl.utils.devLog(msg);
            pl.announce({ msg, o: true });
        } else pl.utils.devLog("No previous responses loaded.");

        // if (addedResponsesCount !== 0) {
        //     let msg = `${addedResponsesCount} responses loaded from previous chats`;
        //     if (addedResponsesCount < 0) msg = `${addedResponsesCount} responses removed from chat history`;
        //     pl.utils.devLog(msg);
        //     pl.announce({ msg, o: true });
        // } else pl.utils.devLog("No previous responses loaded.");
    }

    /**
     * Start new chat, by clicking a button on side nav.
     */
    async function startNewChat() {
        await resolve.newChatButton();
        if (!newChatButton) {
            const msg = "Failed to find the new chat button";
            pl.utils.prodWarn(msg);
            pl.announce({ msg, o: true });
            return;
        }

        // Close all dialogs / modals first
        await closeAllDialogsAndModals();
        // Click the toogle button and wait a little
        pl.announce({ msg: "Start new chat", o: true });
        await new Promise(r => setTimeout(r, 250));
        newChatButton.click();
    }
    async function toogleSidebar() {
        await resolve.sideNavElement();
        await resolve.toggleSidebarButton();
        if (!toggleSidebarButton) {
            const msg = "Failed to find the toggle sidebar button";
            pl.utils.prodWarn(msg);
            pl.announce({ msg, o: true });
            return;
        }
        // Close all dialogs / modals first
        await closeAllDialogsAndModals();

        // Click the toogle button and wait a little
        await new Promise(r => setTimeout(r, 250));
        toggleSidebarButton.click();

        // We know if sidebar is expanded or collapsed by checking `data-state` attribute of the closest parent div
        let msg = "Toggling sidebar";
        const closestSidebarWrapper = toggleSidebarButton.closest('div[data-state]') as HTMLElement | null;
        if (closestSidebarWrapper) {
            const dataState = closestSidebarWrapper.getAttribute('data-state') || "empty data-state";
            if (dataState === 'collapsed') msg = "Expanding sidebar";
            else if (dataState === 'expanded') msg = "Collapsing sidebar";
        }
        pl.announce({ msg, o: true });

        // If found, focus on the first anchor, button, or input inside the sidebar for better accessibility
        if (sideNavElement) {
            const focusableSelector = 'a, button, input, [tabindex]:not([tabindex="-1"])';
            const firstFocusable = sideNavElement.querySelector(focusableSelector) as HTMLElement;
            // console.log("First focusable element in sidebar:", firstFocusable);
            if (firstFocusable) {
                firstFocusable.focus();
                // console.log("Focused on the first focusable element in sidebar");
            }
        }
    }
    async function closeAllDialogsAndModals() {
        await pl.pageInfoDialog.close();
    }

    await construct();
}

// Note: The callback is guaranteed to run because we set "document_start" in manifest.json
document.addEventListener('DOMContentLoaded', () => {
    grokAdapter().catch((err) => {
        console.error("Error initializing Grok page adapter:", err);
    });
});

