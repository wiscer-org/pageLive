import { Keybinds } from '../keybind-manager';
import PageLive from '../pagelive';
import ChatObserver from '../chat-observer';
import ChatObserverV2 from '../chat-observer-v2';
import ElementObserver from '../element-observer';
import ChatInfo from '../chat-info';

const claudeAdapter = async () => {
    const pl = new PageLive();
    let chatObserver !: ChatObserverV2;

    // Element references
    let mainContent: HTMLElement | null = null;
    let chatContainer: HTMLElement | null = null;
    let sideNavElement: HTMLElement | null = null;
    let chatInput: HTMLElement | null = null;
    let newChatButton: HTMLElement | null = null;
    let toggleSidebarButton: HTMLElement | null = null;
    // A button to open more options for the active chat, contains 'Delete chat' button
    let chatMenuTrigger: HTMLElement | null = null;
    let chatTitleButton: HTMLElement | null = null;
    // Page info container elements
    let pageInfoContainer: HTMLElement = document && document.createElement("div");

    const construct = async () => {
        pl.page.name = "Claude";

        // Add keyboard shortcuts
        pl.utils.devLog("Registering keybinds..");
        pl.keybindManager.registerKeybind(Keybinds.AnnounceLastResponse, announceLastResponse);
        pl.keybindManager.registerKeybind(Keybinds.FocusChatInput, focusChatInput);
        pl.keybindManager.registerKeybind(Keybinds.NewChat, startNewChat);
        pl.keybindManager.registerKeybind(Keybinds.ToggleSidebar, toggleSidebar);
        pl.keybindManager.registerKeybind(Keybinds.ChatCurrentDelete, chatCurrentDelete);

        // Initialize chat observer
        await resolve.mainContent("construct");
        chatObserver = new ChatObserverV2(
            pl
            , parseResponseContainer
            , parseResponseElements
            , parseAndWaitResponseElement
            , async () => pl.speak("Claude replies...")
            , async (rc) => {
                pl.utils.devLog(`Response element is not found in:`);
                console.log(rc);
            }
            , async () => {
                console.log("Finding chat observer");
                await resolve.chatContainer("From ChatObserverV2");
                if (chatContainer) return chatContainer;
                return null
            }
            , mainContent
            , null
            , isPageEmptyChat
            , false
            , isNewRC
            , handleNewRC
        );

        // await init();

        // observeForChatContainer();

        pl.page.ready();

        observeForClaudeShortcutsDialog()

        // Page info container
        pl.pageInfoDialog.setTitle("Chat title not yet loaded");
        pl.pageInfoDialog.onEveryOpenCallback = onDialogOpen;
        renderPageAdapterContainer();

        observeForChatTitle();

        setClickListeners();

        // DEBUG
        // const onCCFound = async (element: HTMLElement) => {
        //     // Set observer to log the changes in chat container
        //     const observer = new MutationObserver((mutations) => {
        //         mutations.forEach(mutation => {
        //             mutation.addedNodes.forEach(node => {
        //                 console.log("*********");
        //                 pl.utils.devLog("Node added to chat container:");
        //                 console.log(node.cloneNode(true));
        //             });
        //             mutation.removedNodes.forEach(node => {
        //                 console.log("*********");
        //                 pl.utils.devLog("Node removed from chat container:");
        //                 console.log(node.cloneNode(true));
        //             });
        //             if (mutation.type === "attributes") {
        //                 console.log("*********");
        //                 pl.utils.devLog(`Attribute ${mutation.attributeName} changed in chat container:`);
        //                 console.log(mutation.target.cloneNode(true));
        //             }
        //         });
        //     });
        //     observer.observe(element, {
        //         childList: true,
        //         subtree: true,
        //         attributes: true
        //     });
        // }
        // const onCCDisconnected = async (element: HTMLElement) => {

        // }
        // const chatContainerObserver = new ElementObserver(
        //     resolve.chatContainer.bind(null, "ChatContainerObserver")
        //     , onCCFound
        //     , mainContent
        //     , onCCDisconnected
        // );
        // chatContainerObserver.observe();
    }
    const init = async () => {

    }
    const resolve = {
        mainContent: async (intent: string): Promise<HTMLElement | null> => {
            mainContent = await pl.resolve(
                null
                , "#main-content"
                , "Main Content"
                , intent
            );
            return mainContent;
        }
        , chatContainer: async (intent: string): Promise<HTMLElement | null> => {

            // `chatContainer` is the direct parent of `[data-test-render-count]` elements (prompts and responses)
            const findChatContainer = async (): Promise<HTMLElement | null> => {
                await resolve.mainContent(intent);
                if (!mainContent) return null;

                // Original chat container selector:
                // , "#main-content > div > div > div > div > div > div"
                // , '#main-content .flex-1.flex.flex-col.px-4.max-w-3xl.mx-auto.w-full.pt-1'

                const chatUnit = mainContent.querySelector('[data-test-render-count]');
                if (!chatUnit) return null;

                const cc = chatUnit.parentElement;
                return cc;
            }

            chatContainer = await pl.resolve(
                chatContainer
                , findChatContainer
                , "Chat Container"
                , intent
            );
            return chatContainer;
        }
        , chatContainer2: async (intent: string): Promise<HTMLElement | null> => {
            chatContainer = await pl.resolve(
                chatContainer
                , "#main-content > div > div > div > div > div > div"
                // , '#main-content .flex-1.flex.flex-col.px-4.max-w-3xl.mx-auto.w-full.pt-1'
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
        }, chatInput: async (intent: string): Promise<HTMLElement | null> => {
            chatInput = await pl.resolve(
                chatInput
                , 'div[data-testid="chat-input"]'
                , "Chat Input"
                , intent
            );
            return chatInput;
        }, newChatButton: async (intent: string): Promise<HTMLElement | null> => {
            newChatButton = await pl.resolve(
                newChatButton
                , 'a[href="/new"]'
                , "New Chat Button"
                , intent
            );
            return newChatButton;
        }, toggleSidebarButton: async (intent: string) => {
            toggleSidebarButton = await pl.resolve(
                toggleSidebarButton
                , 'button[data-testid="pin-sidebar-toggle"]'
                , "Toggle Sidebar Button"
                , intent
            );
            return toggleSidebarButton;
        }, chatMenuTrigger: async (intent: string) => {
            chatMenuTrigger = await pl.resolve(
                chatMenuTrigger
                , 'button[data-testid="chat-menu-trigger"]'
                , "Chat Menu Trigger Button"
                , intent
            );
            return chatMenuTrigger;
        }, chatTitleButton: async (intent: string) => {
            resolve.mainContent(intent);
            if (!mainContent) return null;

            chatTitleButton = await pl.resolve(
                chatTitleButton
                , '[data-testid="chat-title-button"]'
                , "Chat Title Button"
                , intent
                , mainContent
            );
            return chatTitleButton;
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
        // [Assumption] But then will be changed to `[data-test-render-count="2"]` by Claude UI after a while.
        // So we can not decide solely based on `[data-test-render-count="1"]`. Thus we also check if it has children.

        // console.log("[PageLive][1] Parsing response container from added node:", node);

        // Note: 
        // `node` is a prompt container if has attribute `data-test-render-count` & has descendant [data-testid="user-message"]
        // `node` is a response container if has attribute `data-test-render-count` & has descendant [data-is-streaming]
        if (node instanceof HTMLElement
            && node.hasAttribute('data-test-render-count')) {
            // return node.querySelector('[data-is-streaming]') as HTMLElement;
            // console.log(node.outerHTML);

            if (node.getAttribute('data-test-render-count') === '1' && node.children.length === 0) {
                // console.log("[PageLive][1] Found response container node (no children):", node);
                return node as HTMLElement
            }

            if (node.querySelector('[data-is-streaming]') != null) {
                // console.log("[PageLive][1] Found response container node:");
                // console.log(node);
                return node;
            }
        }
        return null;
    }
    /**
     * Parse from a node, whether the node itself is a response container, or it contains response containers
     */
    const parseResponseElements = (node: Node): HTMLElement[] => {
        const responseElements: HTMLElement[] = [];

        if (!(node instanceof HTMLElement)) {
            pl.utils.devLog("Node is not an HTMLElement - 7630:");
            return [];
        }

        // First check if the node itself is a response element
        if (isResponseElement(node)) {
            responseElements.push(node);
        } else {
            // Maybe the node contains response element(s)
            const elements = node.querySelectorAll('.standard-markdown') as NodeListOf<HTMLElement>;
            elements.forEach(el => {
                if (isResponseElement(el)) responseElements.push(el);
            });
        }

        return responseElements;
    }
    /**
     * Filter if a node is a response element or not
     */
    const isResponseElement = (node: Node): boolean => {
        if (!(node instanceof HTMLElement)) {
            return false;
        }
        if (!node.classList.contains('standard-markdown')) return false;

        // Ignore if node is a 'thinking' section: ancestor within 3 levels has class 'overflow-hidden'
        let ancestor = node.parentElement;
        let shouldIgnore = false;
        for (let i = 0; i < 3; i++) {
            if (!ancestor) break;
            if (ancestor.classList.contains('overflow-hidden')) {
                shouldIgnore = true;
                break;
            }
            ancestor = ancestor.parentElement;
        }
        if (!shouldIgnore) return true;
        return false;
    }
    /**
     * Parse the response element from added nodes in `responseContainer`
     */
    const parseAndWaitResponseElement = async (rc: HTMLElement): Promise<HTMLElement | null> => {
        // The response element selector relative to response container is:
        // `[data-is-streaming] .standard-markdown`

        // Note: When new response container in Claude is added, it has no children,
        // so we need to observe the the RC for changes to get the response element or until timeout.

        if (!(rc instanceof HTMLElement)) {
            pl.utils.devLog("Below RC is not an HTMLElement - 7230:");
            console.log(rc);
            return null;
        }

        console.log("[PageLive] Parsing response element from response container:", rc);
        function parseIt(rc: HTMLElement): HTMLElement | null {
            // return rc.querySelector('[data-is-streaming] .standard-markdown') as HTMLElement;
            const responseElement = rc.querySelector('[data-is-streaming] .standard-markdown') as HTMLElement;
            if (responseElement != null) {
                // console.log("[PageLive][2] Found response element:");
                // console.log(responseElement);
                return responseElement;
            }

            // console.log("[PageLive][2] XXX Response element not found in response container.");
            // console.log(rc.outerHTML)
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

    /**
     * Determine if the added node is a new RC, not previous RC
     */
    const isNewRC = async (node: Node): Promise<HTMLElement | null> => {
        if (node instanceof HTMLElement
            && node.hasAttribute('data-test-render-count')) {

            // Below are the assumptions we found when a new RC is added in Claude, beside a new RC has `[data-test-render-count="1"]`:
            // 1. new RC does not have children when added, but prev RC has children when added, so we can use this to determine if it is a new RC or prev RC.
            // 2. new RC may has children when added, but it has descendant `[data-is-streaming="true"]`. It seems that the attribute `data-is-streaming=true` is used to mark when an element is still updated.
            if (node.getAttribute('data-test-render-count') === '1'
                && (node.children.length === 0)
                || (node.querySelector('[data-is-streaming="true"]') != null)
            ) {
                // if (node.getAttribute('data-test-render-count') === '1') {
                return node as HTMLElement
            }
        }
        return null;
    }

    const handleNewRC = async (newRC: HTMLElement) : Promise<void> => {
        // Note: When a new RC is added, claude has `thinking section` which keep being updated before generating the response.
        // Then `thinkingSection` has class `standard-markdown` and also has ancestor with class `overflow-hidden`, so we can check the descendants of RC with class `standard-markdown` for ancestors with class `overflow-hidden` to determine if there is a thinking section, and handle it if found.
        // The `.overflow-hidden` element is the second ancestor of `.standard-markdown` element in the thinking section.

        // This functio==n goal is to let user know when the RC is still in thinking stage, so they won't be confused by the empty RC and think that the page is broken.

        return new Promise((resolve) => {

            // Query the thinking section in the new RC. The thinking section seems to have class `overflow-hidden`, and is usually ancestor of response element, so we check the descendants of RC with class `standard-markdown` for ancestors with class `overflow-hidden`.
            const parseThinkingSection = (rc: HTMLElement): HTMLElement | null => {
                return rc.querySelector('.overflow-hidden > * > .standard-markdown') as HTMLElement;
            }
            const handleTSFound = (thinkingSection: HTMLElement) => {
                // When found, start observing changes in the `ts`
                tsMutationObserver.observe(thinkingSection, { childList: true, subtree: true, characterData: true });
                scheduleStopObserveTSMutation();

                // Stop observing for ts addtion
                tsAdditionObserver.disconnect();
                if (stopObserverTSAdditionTimeout) {
                    clearTimeout(stopObserverTSAdditionTimeout);
                    stopObserverTSAdditionTimeout = null;
                }

                // Let user know 
                pl.speak("Claude is thinking...");
                // pl.toast("Claude is thinking in toast...");
            }

            // Observer to get the thinking section if not found in the new RC, since the thinking section may be added after the RC is added, and also may be removed when the response is generated.
            const tsAdditionObserver = new MutationObserver((mutations, obs) => {
                thinkingSection = parseThinkingSection(newRC);
                if (thinkingSection) {
                    handleTSFound(thinkingSection);
                }
            });
            // Observer to get observe changes in the thinking section, so we can inform users when the thinking section is idle for a while, which means the response is likely generated even if the thinking section is still there.
            const tsMutationObserver = new MutationObserver((mutations, obs) => {
                // Still busy, reschedule to stop
                scheduleStopObserveTSMutation();
            });
            // Schedule to stop observing
            let stopObserverTSAdditionTimeout: ReturnType<typeof setTimeout> | null = null;
            const scheduleStopObserveTSAddition = () => {
                return setTimeout(() => {
                    // Only executed when ts can not be found after a while
                    // If `ts` is found, the `tsAdditionObserver` will be disconnected in `handleTSFound` function
                    tsAdditionObserver.disconnect();

                    // Failed to find thinking section after a while
                    // pl.speak("failed finding thinking section");
                    resolve();
                }, 4e3);
            }
            let stopObserverTSMutationTimeout: ReturnType<typeof setTimeout> | null = null;
            const scheduleStopObserveTSMutation = () => {

                return setTimeout(() => {
                    // Just to be safe, clear and disconnect the both observers and timeouts
                    tsAdditionObserver.disconnect();
                    if (stopObserverTSAdditionTimeout) clearTimeout(stopObserverTSAdditionTimeout);

                    tsMutationObserver.disconnect();
                    if (stopObserverTSMutationTimeout) clearTimeout(stopObserverTSMutationTimeout);

                    resolve();
                }, 800); // Adjust the timeout as needed
            }

            // Query existing thinking section
            let thinkingSection = parseThinkingSection(newRC);

            // If not found, observe the new RC to query the thinking section until timeout
            if (!thinkingSection) {
                // pl.speak("Thinking section is not found, start observing for it.");
                tsAdditionObserver.observe(newRC, { childList: true, subtree: true, characterData: true });
                stopObserverTSAdditionTimeout = scheduleStopObserveTSAddition();
            } else {
                // pl.speak("Thinking section is found");
                // If thinking section is found, handle it
                handleTSFound(thinkingSection);
            }
        });
    }

    /**
     * Observe on the events chat container is added or disconnected
     */
    const observeForChatContainer = async () => {
        console.log("Observing for chat container...");

        // First check if chat container already exists. If yes, no need to observe
        await resolve.chatContainer("observeForChatContainer - initial check");
        if (chatContainer && chatContainer.isConnected) {
            pl.utils.devLog("Chat container already exists, no need to observe.");
            pl.devToast("DEBUG: Chat container already exists, no need to observe.");
            return;
        } else {
            pl.utils.devLog("Chat container not found, start observing.");
            // pl.toast("DEBUG: Chat container not found, start observing.");
        }


        const observer = new MutationObserver(async (mutations) => {
            console.log("scheduling check for chat container...");
            scheduleCheckForChatContainer();
        });
        let checkTimeout: ReturnType<typeof setTimeout> | null = null;
        const scheduleCheckForChatContainer = () => {
            // Clear previous timeout
            if (checkTimeout) clearTimeout(checkTimeout);
            checkTimeout = setTimeout(checkForContainer, 2000);
        }
        // Flag is chat container is connected
        let prevCC = chatContainer;
        const checkForContainer = async () => {
            // Chat container seems not added the same time with the addition of the mainContent's children. ChatContainer seems to be added in the next mutation cycle.
            // That's why wait a little bit before querying for it.
            await resolve.chatContainer("observeForChatContainer");
            // console.log("main content:", mainContent?.outerHTML);
            // console.log("Chat container after resolve:", chatContainer);
            const chatUnit = mainContent?.querySelector('[data-test-render-count]');
            // console.log("Chat unit:", chatUnit);
            // console.log("Chat unit parent (chat container):", chatUnit?.parentElement);

            // Check if chat container just connected
            if (!prevCC?.isConnected && chatContainer?.isConnected) {
                // pl.devToast("DEBUG: Chat container is connected.");
                // pl.utils.devLog("Chat container connected.");

                // Re-initialize this chat adapter
                // await init();

                onChatContainerFound();
            }
            // Should we handle chat container disconnected here?
            if (prevCC?.isConnected && (!chatContainer || !chatContainer.isConnected)) {
                // TODO create timeout to parse chat container, so the parse will only run one time within few seconds.
                // TODO: Only when switch chat, the toast below is read twice by SR, but only the toast only appears 1 and also the console.log below only appear once.
                pl.devToast("Chat container is disconnected.");
                pl.utils.devLog("Chat container disconnected.");
            }

            prevCC = chatContainer;
        };

        // Callback after chat container is found
        const onChatContainerFound = async () => {
            pl.utils.devLog("Chat container found, disconnecting main content observer.");
            // pl.devToast("Chat container found.");
            observer.disconnect();

            // Connect chat observer
            if (chatContainer) {
                chatObserver.connect(chatContainer, null, true, true);
            }
        }

        // `#main-content` is the nearest ancestor of `chatContainer` that is stable, not getting disconnected.
        // On the events of chat switching or new chat, `chatContainer` gets disconnected.
        // So we observe `#main-content` for changes to detect when `chatContainer` is added.
        if (!mainContent) {
            pl.utils.prodLog("Failed to find main content to observe for chat container. - 2410");
            return;
        }
        observer.observe(mainContent, {
            childList: true
            , subtree: true
            // , attributes: true
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

        // Instruct chatObserver to treat all response containers as new
        // chatObserver.shouldTreatAllAsNewRCs = true;
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
    async function chatCurrentDelete() {
        // If this is an empty chat, do nothing
        if (isPageEmptyChat()) {
            pl.toast("This is an empty chat, nothing to delete.");
            return;
        }

        // No need to confirm dialog, already provided by Claude UI

        await resolve.chatMenuTrigger("chatCurrentDelete");
        if (!chatMenuTrigger) {
            const msg = "Failed to find the 'Chat Menu Trigger' button";
            pl.utils.prodWarn(msg);
            pl.toast(msg);
            return;
        }

        // Observe added nodes to find the Chat-menu pop up, containing 'Delete' button
        let observer = new MutationObserver(async (mutations, obs) => {
            // Chat menu to find has [role="menu"]
            let chatMenu: HTMLElement | null = null;
            for (const mutation of mutations) {
                for (const node of mutation.addedNodes) {
                    if (!(node instanceof HTMLElement)) continue;

                    // Does this node is the chat menu?
                    if (node.getAttribute('role') === 'menu') {
                        chatMenu = node as HTMLElement;
                        break;
                    }

                    // Does this node contain the chat menu?
                    const menu = node.querySelector("div[role='menu']");
                    if (menu) {
                        chatMenu = menu as HTMLElement;
                        break;
                    }
                }
                if (chatMenu) break;
            }

            // If chat menu found, find and click the 'Delete' button
            if (chatMenu) {
                obs.disconnect(); // Stop observing
                const deleteButton = chatMenu.querySelector("[data-testid='delete-chat-trigger']") as HTMLElement;
                if (!deleteButton) {
                    pl.toast("Failed to find the 'Delete' button in chat menu.");
                    pl.utils.prodWarn("Failed to find the 'Delete' button in chat menu - 5735. Chat menu outerHTML: " + chatMenu.outerHTML);
                    return;
                }
                // Click the 'Delete' button
                deleteButton.click();
                pl.speak("Please confirm to delete chat");
            }
        });

        // Start observing the body for added nodes (pop ups)
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });

        // Click the 'chat menu' trigger / button to open the pop up
        // Note: Use 3 events below to make sure it's working. On grok it works on "pointerdown", not works on "click".
        ["pointerdown", "pointerup", "click"].forEach(type => {
            if (!chatMenuTrigger) return;
            chatMenuTrigger.dispatchEvent(
                new PointerEvent(type, {
                    bubbles: true,
                    cancelable: true,
                    pointerType: "mouse",
                    clientX: 100,              // fake position sometimes helps
                    clientY: 100
                })
            );
        });
    }
    const announceLastResponse = async () => {
        // Note: This function will parse the last response everytime called, for dev simplicity.

        // Check if this is an empty chat   
        if (isPageEmptyChat()) {
            pl.speak("This is an empty chat, no responses to read.");
            return;
        }

        // Check if chat container is connected
        await resolve.chatContainer("announceLastResponse");

        // In case there is no chat container
        if (!chatContainer || chatContainer.children.length === 0) {
            pl.speak("There is no responses to read.");
            return;
        }

        // Find the last response container
        let lastResponseContainer: HTMLElement | null = null;
        for (let i = chatContainer.children.length - 1; i >= 0; i--) {
            const child = chatContainer.children[i] as HTMLElement;
            if (parseResponseContainer(child)) {
                lastResponseContainer = child;
                break;
            }
        }

        if (!lastResponseContainer) {
            pl.speak("There is no responses to read.");
            return;
        }

        // Parse response elements from the last response container.
        const responseElements = parseResponseElements(lastResponseContainer);
        if (!responseElements || responseElements.length === 0) {
            pl.speak("Failed to find the last response contents.");
            return;
        }

        // Does response element has text content?
        const isResponseEmpty = responseElements.every(el => !el.textContent || !el.textContent.trim());
        if (isResponseEmpty) {
            pl.speak("The last response is empty.");
            return;
        }

        // Announce all segments from all response elements, one by one
        pl.speak("Reading the last response...");
        for (const responseElement of responseElements) {
            for (let i = 0; i < responseElement.children.length; i++) {
                const node = responseElement.children[i];
                pl.speak(node.outerHTML);
                // Wait a little to ease SR queue
                await new Promise(r => setTimeout(r, 2e3));
            }
        }
        pl.speak("End of last response.");
    }

    function closeAllDialogsAndModals() {
        pl.pageInfoDialog.close();
    }
    /**
     * Observe for Claude Shortcuts dialog. Announce when opened and closed.
     */
    const observeForClaudeShortcutsDialog = () => {
        let isDialogOpen = false;
        const observer = new MutationObserver((mutations) => {
            // Check if Claude Shortcuts dialog is opened or closed
            for (const mutation of mutations) {
                // Check added nodes for dialog is opened
                for (const node of mutation.addedNodes) {
                    if (!(node instanceof HTMLElement)) continue;

                    if (isDialog(node) && isDialogOpen) {
                        pl.speak("Claude Shortcuts dialog opened. Press Escape to close.");
                    }
                }
                // Check removed nodes for dialog is closed
                for (const node of mutation.removedNodes) {
                    if (!(node instanceof HTMLElement)) continue;

                    if (isDialog(node) && !isDialogOpen) {
                        pl.speak("Claude Shortcuts dialog closed.");
                    }
                }
            }
        });

        // Check if this is the Claude Shortcuts dialog
        const isDialog = (node: Node): boolean => {
            if (!(node instanceof HTMLElement)) return false;

            // It is dialog if ancestor has role="dialog"
            if (node.getAttribute('role') === 'dialog'
                || node.querySelector('[role="dialog"]')) {
                readDialogState(node);
                return true;
            }
            return false;
        }
        const readDialogState = (node: Node) => {
            if (!(node instanceof HTMLElement)) return;

            if (node.getAttribute("data-state") === "open") isDialogOpen = true;
            else isDialogOpen = false;
        }

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });

    }

    const observeForChatTitle = async () => {
        // Note: The button that contains chat title: `[data-testid="chat-title-button"]`

        // Scenario: On new chat page, the title button will not appear.
        // On existing chat page, the title button will not exist on first load but will be added.
        // On chat switch, the title button will disconnected then new button will be added.

        // Plan of action:
        // - Create an ElementObserver to observe the title button and update title on found or removed.
        // - Set time out to update the title - this is for new chat page scenario. Will be cancelled by `EventObserver` if title button is found

        // Set the timeout to update title
        const titleTimeout = setTimeout(() => {
            updatePageInfo({ title: "" });
        }, 4e3); // 4 seconds

        // Observe
        const buttonObserver = new ElementObserver(
            async () => resolve.chatTitleButton("observeForChatTitle")
            , (element: HTMLElement) => {
                clearTimeout(titleTimeout); // Cancel the timeout

                updatePageInfo({ title: element.textContent });
            }, mainContent
            , (element: HTMLElement) => {
                // When element removed, also update the title to empty
                updatePageInfo({ title: "" });
            }, 4e3

        );
        buttonObserver.observe();
    }
    const renderPageAdapterContainer = async () => {
        pl.pageInfoDialog.pageAdapterContainer.appendChild(pageInfoContainer);
    }
    const updatePageInfo = async ({ title, responseCount }: {
        title?: string
        responseCount?: number
    }) => {
        if (!pl.page.activeChat) pl.page.activeChat = new ChatInfo();

        // Update title
        if (title !== undefined) {
            let toRenderTitle = "";
            // In case of empty title
            if (!title) {
                // In case of new chat
                if (isPageEmptyChat()) toRenderTitle = "New Chat";
                // Title not found
                else toRenderTitle = "Chat title not found";

            } else {
                toRenderTitle = "Chat title: " + title.trim();
                // If dialog is open, notify users that title is found and updated
                if (pl.pageInfoDialog.isOpen()) {
                    pl.speak("Chat title found and updated.");
                }
            }

            pl.page.activeChat.title = toRenderTitle;
            // Update UI
            pl.pageInfoDialog.setTitle(toRenderTitle);
        }

        // Update number of responses
        if (responseCount !== undefined) {
            // Update active chat info
            pl.page.activeChat.responsesCount = responseCount;
            let responseCountText = `This chat has no responses yet.`;
            if (responseCount === 1) {
                responseCountText = `This chat has ${responseCount} response.`;
            } else if (responseCount > 1) {
                responseCountText = `This chat has ${responseCount} responses.`;
            }
            pageInfoContainer.innerHTML = responseCountText;
        }
    }
    const onDialogOpen = async () => {
        // Note: Currently, number of responses is updated every time the dialog is opened. 

        // This method may be changed in future for performance consideration.
        // Count number of responses in current chat
        await chatObserver.mapResponseContainers();
        const responseCount = chatObserver.responseContainers.length;
        updatePageInfo({ responseCount });
    }
    async function setClickListeners() {
        resolve.sideNavElement("setClickListeners");
        document.addEventListener('click', async (event) => {
            // sideNavElement?.addEventListener('click', async (event) => {
            const target = event.target as HTMLElement;
            if (!target) return;

            // Is it chat link from side nav ?
            if (isChatLinkFromSideNav(target)) {
                // Close all dialogs / modals first
                await closeAllDialogsAndModals();
                // Switching chat, expect existing and prev responses
                chatObserver.shouldTreatAllAsNewRCs = false;
                // chatObserver.connect(chatContainer!, null);
            }
        });

        /**
         * Check whether the clicked element is a chat link from side nav
         * Hierarchy of the link: a[data-dd-action-name="sidebar-chat-item"]
         */
        const isChatLinkFromSideNav = (target: HTMLElement): boolean => {
            // Recursive up to 4 levels to find the element
            let currentElement: HTMLElement | null = target;
            for (let i = 0; i < 4; i++) {
                if (!currentElement) return false;
                if (currentElement.tagName.toLowerCase() === "a"
                    && currentElement.getAttribute('data-dd-action-name') === 'sidebar-chat-item') {
                    return true;
                }
                currentElement = currentElement.parentElement;
            }
            return false;
        }
    }

    await construct();
}

// Note: The callback is guaranteed to run because we set "document_start" in manifest.json
document.addEventListener('DOMContentLoaded', () => {
    claudeAdapter().catch((err) => {
        console.error("Error initializing Claude page adapter:", err);
    });
});



