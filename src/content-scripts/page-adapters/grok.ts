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
        if (newChatButton) pl.keybindManager.registerKeybind(Keybinds.NewChat, startNewChat);

        // Add callback to be executed the next time dialog is shown
        pl.pageInfoDialog.onEveryOpenCallback = onDialogOpen;

        // Add external classes
        chatObserver = new ChatObserver(
            pl
            , isResponseContainer
            , parseResponseElement
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

    const observeChatContainer = async () => {
        resolve.chatContainer();
        let isChatContainerExistPrev = chatContainer !== null;
        let isChatContainerExistNow = isChatContainerExistPrev;

        const chatContainerObserver = new MutationObserver(async (mutations) => {
            resolve.chatContainer();
            isChatContainerExistNow = chatContainer !== null;
            if (isChatContainerExistPrev !== isChatContainerExistNow
                && isChatContainerExistNow === true
            ) {
                await resolve.lastReplayContainer();
                await chatObserver.connect(chatContainer, lastReplayContainer);
            }
            isChatContainerExistPrev = isChatContainerExistNow
        });

        // const chatContainerParent = document.querySelector('[data-testid="drop-ui"]') as HTMLElement | null;
        if (chatContainerParent) {
            pl.utils.devLog("Observing `chatContainerParent` for chat container changes");
            chatContainerObserver.observe(chatContainerParent, {
                childList: true
                , subtree: false
                , attributes: true
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
        chatInput: async () => {
            chatInput = await pl.utils.waitForAChildElement(chatContainerParent || document.body
                , ".\\@container form div[contenteditable='true']");
            if (!chatInput) {
                throw new Error("Failed waiting for chat input - 307");
            }
            return chatInput;
        },
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
                && await waitFor.chatInput()
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
                pl.utils.prodWarn("Could not find chat container parent - 948");
                chatContainerParent = null;
                return false;
            }
            return true;
        },
        chatContainer: async () => {
            if (!chatContainer || !chatContainer.isConnected) {
                if (chatContainer && !chatContainer.isConnected) pl.utils.devLog("Chat container is not connected - 923");

                await resolve.chatContainerParent();
                if (!chatContainerParent) {
                    chatContainer = null;
                    return false;
                }
                // Do not use `waitForAChildElement` since the element will not exist on empty chat
                chatContainer = chatContainerParent.querySelector('.\\@container\\/chat > div > div.items-center') as HTMLElement;
            }
            if (!chatContainer) {
                // pl.utils.prodWarn("Could not find chat container - 961");
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
                pl.utils.prodWarn("Could not find last replay container - 976");
                lastReplayContainer = null;
                return false;
            }
            return true;
        },
        chatInput: async () => {
            if (!chatInput || !chatInput.isConnected) {
                pl.utils.prodWarn("Chat input is null or not connected - 204");
                chatInput = document.querySelector(".\\@container form div[contenteditable='true']") as HTMLElement;
            }
            if (!chatInput) {
                pl.utils.prodWarn("Could not find chat input - 964");
                chatInput = null;
                return false;
            }
            return true;
        },
        sideNavElement: async () => {
            if (!sideNavElement || !sideNavElement.isConnected) {
                pl.utils.prodWarn("Side nav element is null or not connected - 2170");
                sideNavElement = await waitFor.sideNavElement();
            }
            if (!sideNavElement) {
                pl.utils.prodWarn("Could not find side nav element - 2126");
                sideNavElement = null;
                return false;
            }
            return true;
        },
        all: async () => {
            return await resolve.chatContainerParent()
                && await resolve.chatInput()
                && await resolve.chatContainer()
                && await resolve.lastReplayContainer()
                && await resolve.sideNavElement()
                && await resolve.newChatButton();
        },
        newChatButton: async () => {
            await resolve.sideNavElement();
            if (!sideNavElement) {
                pl.utils.prodWarn("Side nav element is null when resolving new chat button - 5797");
                return false;
            }

            if (!newChatButton || !newChatButton.isConnected) {
                if (newChatButton && !newChatButton.isConnected) pl.utils.devLog("New chat button is not connected - 2881");
                newChatButton = sideNavElement.querySelector('a[href="\/"]') as HTMLElement;
            }
            if (!newChatButton) {
                pl.utils.prodWarn("Could not find new chat button - 9232");
                newChatButton = null;
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
        await resolve.chatContainer();
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
            pl.utils.prodWarn("No last replay container found - 927");
            return;
        }

        // Prompt and response are both inside lastReplayContainer
        if (!lastReplayContainer.children || lastReplayContainer.children.length < 2) {
            pl.utils.prodWarn("Last replay container does not have enough children - 9832");
            pl.utils.prodWarn("Last replay container children:");
            console.log(lastReplayContainer.children);
            return;
        }

        const lastResponseContainer = lastReplayContainer.children[1] as HTMLElement;
        const messageBubble = lastResponseContainer.querySelector('div.message-bubble');
        if (messageBubble) {
            let msg = messageBubble.innerHTML || '';
            pl.utils.devLog("Reading last response");
            pl.announce({ msg: "Reading last response.", o: true });
            pl.announce({ msg, o: true });
            pl.announce({ msg: "End of last response.", o: true });
        } else {
            pl.announce({ msg: "No last response is found.", o: true });
            pl.utils.prodWarn("Latest response element does not contain message-bubble - 982");
        }
    }
    /**
     * Test whether the node, added when receiving incoming response, is the response container
     * @param {Node} node Node to be tested
     * @returns boolean
     */
    const isResponseContainer = (node: Node): boolean => {
        console.log("Testing node for response container:", node);
        if (!(node instanceof HTMLElement)) {
            pl.utils.devLog("Node is not an HTMLElement - 831");
            return false;
        }
        // Check if the node matches the expected structure of response container
        // For Grok, we assume the response container has a specific class or structure
        // Here we use a placeholder condition; replace it with actual logic as needed

        // Node is a response container if has descendant with id starting with 'response-'
        if (node.querySelector(".items-start[id^='response-']")) {
            pl.utils.devLog("Node is a response container, has id ^='response-'");
            return true;
        }

        // if (node.tagName.toLowerCase() === 'div' &&
        //     node.id?.startsWith('response-') &&
        //     node.classList.contains('items-start')) {
        //     pl.utils.devLog("Node is a response container, has id ^='response-'");
        //     return true;
        // }

        // if (node.querySelector('.items-start')) {
        //     pl.utils.devLog("Node is a response container via items-start class");
        //     return true;
        // }
        return false;
    }
    /**
     * Parse the response element from the response container, used by ChatObserver.
     * @param responseContainer 
     * @returns 
     */
    const parseResponseElement = (responseContainer: HTMLElement): HTMLElement | null => {
        if (!(responseContainer instanceof HTMLElement)) {
            pl.utils.prodWarn("Response container is not an HTMLElement - 1053");
            return null;
        }
        const el = responseContainer.querySelector('div.message-bubble > div > div > div.response-content-markdown') as HTMLElement;
        if (!el) {
            pl.utils.prodWarn("Could not find response content markdown element inside response container - 1060");
            return null;
        }
        return el;
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

