import { Keybinds } from "../keybind-manager";
import PageLive from "../pagelive";
import ChatObserver from "../chat-observer";
import ChatInfo from "../chat-info";

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
    // 'More' button, to trigger pop up containing 'delete chat' button
    let moreButton: HTMLElement | null = null;
    // Button to pop up all chat list dialog
    let allChatsPopper: HTMLElement | null = null;
    // The active chat info
    let activeChat: ChatInfo = new ChatInfo();
    // Contain page info, will be placed inside PageInfoDialog.pageAdapterContainer.
    let pageInfoContainer!: HTMLElement;
    // Contain page's navigational elements , will be placed inside PageInfoDialog.pageAdapterContainer.
    let pageNavContainer!: HTMLElement;
    
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

        // pl.initialAnnounceInfo.push("grok");

        await setClickListeners();

        // Add keyboard shortcuts
        pl.utils.devLog("Registering keybinds..");
        pl.keybindManager.registerKeybind(Keybinds.FocusChatInput, focusChatInput);
        pl.keybindManager.registerKeybind(Keybinds.AnnounceLastResponse, announceLastResponse);
        // Add keybind: New chat
        pl.keybindManager.registerKeybind(Keybinds.NewChat, startNewChat);
        // Add keybind: Toggle sidebar
        pl.keybindManager.registerKeybind(Keybinds.ToggleSidebar, toogleSidebar);
        pl.keybindManager.registerKeybind(Keybinds.ChatCurrentDelete, chatCurrentDelete);

        // Add callback to be executed the next time dialog is shown
        pl.pageInfoDialog.onEveryOpenCallback = onDialogOpen;

        // Add external classes
        chatObserver = new ChatObserver(
            pl
            , parseResponseContainer
            , parseResponseElement
            , handleNewResponse
            , handleResponseElementNotFound
            , false
        );

        if (chatContainer) {
            pl.utils.devLog("Connecting to chat container during initialization..");
            // Connect chat observer, and observe previous response containers as well
            await chatObserver.connect(chatContainer, lastReplayContainer);
        }

        await renderPageAdapterContainer();
        await updatePageInfo();

        // Observe chat container being added or removed
        await observeForChatContainer();
        // await observeChatContainerXX();

        await pl.page.ready();
    }
    const renderPageAdapterContainer = async () => {
        pageInfoContainer = document.createElement('div');
        pl.pageInfoDialog.pageAdapterContainer.appendChild(pageInfoContainer);

        pageNavContainer = document.createElement('div');
        pl.pageInfoDialog.pageAdapterContainer.appendChild(pageNavContainer);

        const chatListButton = document.createElement('button');
        chatListButton.innerText = "Open All Chat List";
        chatListButton.addEventListener('click', openAllChatsDialog);
        pageNavContainer.appendChild(chatListButton);
    }
    const updatePageInfo = async (shouldUpdateTitle = true) => {
        if (!pl.page.activeChat) pl.page.activeChat = new ChatInfo();

        // Update title
        if (shouldUpdateTitle) {
            // Parse title - remove from first '-' to end
            let title = document.title.split('-')[0].trim();
            // If the title is 'Grok', it is an empty chat
            if (title.toLowerCase() === 'grok') title = "New Chat";
            pl.page.activeChat.title = title;
            // Update UI
            pl.pageInfoDialog.setTitle(title);
        }

        // Update number of responses
        let responseCount = 0;
        if (chatContainer) {
            for (let i = 0; i < chatContainer.children.length; i++) {
                const child = chatContainer.children.item(i) as Node;
                const rc = parseResponseContainer(child);
                if (rc) responseCount++;
            }
        }
        // Update active chat info
        pl.page.activeChat.responsesCount = responseCount;
        let responseCountText = `This chat has no responses yet.`;
        if (responseCount === 1) {
            responseCountText = `This chat has ${responseCount} response.`;
        } else {
            responseCountText = `This chat has ${responseCount} responses.`;
        }
        pageInfoContainer.innerHTML = responseCountText;
    }
    const onDialogOpen = async () => {
        // For the moment, update page info when dialog is opened. 
        // This method may be changed in future for performance consideration.
        await updatePageInfo(true);
    }
    /**
     * Detect if chat container is added, and connect the chatObserver
     */
    const observeForChatContainer = async () => {
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
                // Connect chat observer
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
        , moreButton: async () => {
            let isValid = true;
            if (!moreButton) {
                pl.utils.devLog("More button is null - 7467");
                isValid = false;
            }
            if (isValid && !moreButton?.isConnected) {
                pl.utils.devLog("More button is not connected - 7471");
                isValid = false;
            }

            if (!isValid) moreButton = document.querySelector(".\\@container\\/nav button[aria-label='More']");

            if (!moreButton) {
                pl.utils.devLog("Could not find more button - 7487");
                moreButton = null;
                return false;
            }
            return true;
        }
        , allChatsPopper: async () => {
            // The hierarchy from `sideNavElement`([data-sidebar='sidebar']):
            // [data-sidebar='sidebar'] > [data-sidebar='content'] > [data-sidebar='group'] > ul[data-sidebar='menu'] > div > div > div > button(See all)
            await resolve.sideNavElement();
            if (!sideNavElement) {
                pl.utils.devLog("Side nav element is null when resolving all chats poper - 8498");
                return false;
            }

            let isValid = true;
            if (!allChatsPopper) {
                pl.utils.devLog("All chats popper is null - 8492");
                isValid = false;
            } else if (!allChatsPopper?.isConnected) {
                pl.utils.devLog("All chats popper is not connected - 8496");
                isValid = false;
            }
            if (!isValid) {
                // Query for the "See all" button in the sidebar
                // allChatsPopper = sideNavElement.querySelector("[data-sidebar='content'] > [data-sidebar='group'] > ul[data-sidebar='menu'] > div > div > div > button") as HTMLElement;
                allChatsPopper = document.querySelector("[data-sidebar='content'] > [data-sidebar='group'] > ul[data-sidebar='menu'] > div > div > div > button") as HTMLElement;
                // allChatsPopper = sideNavElement.querySelector(" ul[data-sidebar='menu'] div > button") as HTMLElement;
            }
            if (!allChatsPopper) {
                pl.utils.devLog("Could not find all chats popper - 8500");
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
            pl.speak("Detected multiple Grok responses.");
            const responseElement = el.querySelector("div.response-content-markdown");
            if (!responseElement) {
                pl.utils.devLog("Could not find response content markdown in multiple responses container - 7450");
            }
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
    const parseResponseElement = async (responseContainer: HTMLElement): Promise<HTMLElement | null> => {
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
     * Handle new response received
     * @param response
     */
    const handleNewResponse = async (response: HTMLElement) => {
        // Notify users response is received
        pl.speak("Grok replies...");
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
    async function chatCurrentDelete() {
        // If this is an empty chat, do nothing
        if (isPageEmptyChat()) {
            pl.toast("This is an empty chat, nothing to delete.");
            return;
        }

        // Show confirmation dialog
        if (!confirm("Are you sure to delete the current chat?")) return;

        await resolve.moreButton();
        if (!moreButton) {
            const msg = "Failed to find the 'More' button";
            pl.utils.prodWarn(msg);
            pl.toast(msg);
            return;
        }

        // Observe added nodes to find the pop up containing 'Delete chat' button
        let observer = new MutationObserver(async (mutations, obs) => {
            for (const mutation of mutations) {
                for (const node of mutation.addedNodes) {
                    // Find every added node or the children of added nodes to find the 'Delete chat' text content
                    let deleteChatButton: HTMLElement | null = null;
                    if (node instanceof HTMLElement) {
                        // Check the node itself
                        if (node.tagName.toLowerCase() === 'div'
                            && node.textContent?.trim().toLowerCase() === 'delete chat') {
                            deleteChatButton = node as HTMLElement;
                        } else {
                            // Check the children of the node
                            const menuItems = node.querySelectorAll("div[role='menuitem']");
                            for (let i = 1; i < menuItems.length; i++) {
                                const button = menuItems[i];
                                if (button && button.textContent?.trim().toLowerCase() === 'delete chat') {
                                    deleteChatButton = button as HTMLElement;
                                    break;
                                }
                            }
                        }
                    }

                    if (deleteChatButton) {
                        deleteChatButton.click();
                        obs.disconnect();
                        // Close all dialogs / modals first
                        closeAllDialogsAndModals();
                        // Wait a little for things to complete
                        await new Promise(r => setTimeout(r, 1e3));
                        pl.toast("Chat has been deleted.");
                    }
                }
            }
        });

        // Start observing the body for added nodes (pop ups)
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });

        // Click the 'More' button to open the pop up
        // Note: works on "pointerdown", not works on "click". Just to be safe, include all.
        ["pointerdown", "pointerup", "click"].forEach(type => {
            if (!moreButton) return;
            moreButton.dispatchEvent(
                new PointerEvent(type, {
                    bubbles: true,
                    cancelable: true,
                    // isTrusted: true,           // almost never works anymore, but worth trying
                    pointerType: "mouse",
                    clientX: 100,              // fake position sometimes helps
                    clientY: 100
                })
            );
        });
    }
    async function openAllChatsDialog() {
        closeAllDialogsAndModals();
        await resolve.allChatsPopper();
        if (!allChatsPopper) {
            pl.toast("Failed to find button to open all chats dialog.");
            pl.utils.prodWarn("All chats popper is null when opening all chats dialog - 2858");
            return;
        }

        // We need notify users when dialog open and close
        let isDialogOpen = false;
        // Set up observer to detect when the all chats dialog is opened
        const observer = new MutationObserver(async (mutations, obs) => {
            for (const mutation of mutations) {
                for (const node of mutation.addedNodes) {
                    // Is it the all chats dialog ?
                    let dialogElement: HTMLElement | null = null;
                    if (node instanceof HTMLElement) {
                        if (isNodeTheDialog(node)) {
                            dialogElement = node as HTMLElement;
                        } // No need to check the children of the node
                    }
                    if (dialogElement) {
                        // Await a little, because SR will read the dialog content after it is opened
                        await new Promise(r => setTimeout(r, 2000)); // Wait a little for the dialog to settle   
                        isDialogOpen = true;
                        pl.speak("Chat list dialog is opened. Press Escape to close.");
                        return;
                    }
                }
                // Check for removed nodes to detect dialog close
                for (const node of mutation.removedNodes) {
                    if (node instanceof HTMLElement) {
                        if (isDialogOpen && isNodeTheDialog(node)) {
                            isDialogOpen = false;
                            pl.speak("Chat list dialog is closed.");
                            disconnectObserver();
                            return;
                        }
                    }
                }
            }
        });

        /**
         * Check whether the node is the all chats dialog
         */
        const isNodeTheDialog = (node: Node): boolean => {
            if (!(node instanceof HTMLElement)) return false;
            if (node.tagName.toLowerCase() === 'div'
                && node.getAttribute('role') === 'dialog') {
                return true;
            }
            return false;
        }

        // Disconnect observer only if `isDialogOpen` is false
        const disconnectObserver = () => {
            if (!isDialogOpen) observer.disconnect();
        }

        // Observe
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });

        // Click the popper button
        allChatsPopper.click();

        // Timeout to disconnect the observer if no dialog is shown
        setTimeout(disconnectObserver, 5e3);
    }
    function isPageEmptyChat(url?: string | undefined): boolean {
        if (!url) url = window.location.href;
        // If url is the base url, it is an empty chat
        const baseUrlPattern = /^https:\/\/grok\.com\/?$/;
        if (baseUrlPattern.test(url)) {
            return true;
        }
        return false;
    }
    async function setClickListeners() {
        document.addEventListener('click', async (event) => {
            const target = event.target as HTMLElement;
            if (!target) return;

            // Is it chat link from side nav ?
            if (isChatLinkFromSideNav(target) || isChatLinkFromPopUp(target)) {
                // Close all dialogs / modals first
                await closeAllDialogsAndModals();
                // Switching chat
                chatObserver.connect(chatContainer!, lastReplayContainer);
            }
        });

        /**
         * Check whether the clicked element is a chat link from side nav
         * Hierarchy of the link: a.peer/menu-button > span
         */
        const isChatLinkFromSideNav = (target: HTMLElement): boolean => {
            // Is it the `a` element ?
            if (target.classList?.contains('peer/menu-button')) return true;

            // Maybe `target`is the `span` ?
            const parent = target.parentElement;
            if (target.tagName.toLowerCase() === "span"
                && parent
                && parent.classList?.contains('peer/menu-button'))
                return true;

            return false;
        }

        /**
         * Check whether the clicked element is a chat link from pop up menu
         * Hierarchy of the link: div[cmdk-item] > a
         */
        const isChatLinkFromPopUp = (target: HTMLElement): boolean => {
            // Is it the div element ?
            if (target.tagName.toLowerCase() === "div"
                && target.getAttribute('cmdk-item') !== null)
                return true;

            // Is it the `a` element ?
            const parent = target.parentElement;
            if (target.tagName.toLowerCase() === "a"
                && parent
                && parent.getAttribute('cmdk-item') !== null)
                return true;

            return false;
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

