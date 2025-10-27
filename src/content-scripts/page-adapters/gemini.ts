// gemini.ts - Injected only on gemini.google.com

import { initial, last } from "lodash";
import { Chat } from "../page";
import { devLog, prodWarn, waitForAnElement, untilElementIdle } from "../util";

//IIEF to avoid symbol conflicts after bundling
(() => {
    // Define page adapter to be executed on DOMContentLoaded
    const geminiPageAdapter = async () => {
        // Selector for chat item container, per chat item, on the right side navigation
        const CHAT_ITEM_CONTAINER_SELECTOR = '.conversation-items-container';
        const CHAT_TITLE_CONTAINER_SELECTOR = '.conversation';     // If selected, it will have .selected class
        // Selector for chat item title, per chat item, on the right side navigation
        const CHAT_TITLE_SELECTOR = ' .conversation-title';
        // Selector of container of chat item action buttons, per chat item.
        const CHAT_ACTIONS_CONTAINER_SELECTOR = '.conversation-actions-container';
        // Selector that mark a chat item is active. Will be used in 2 elements: .conversation & .conversation-actions-container
        const CHAT_SELECTED_TAG_SELECTOR = '.selected';

        // Class of chat actions container. This should be class name, not selector, because it will be used in `classList.contains` to check if the class name exist
        const CHAT_ACTIONS_CONTAINER_CLASS = "conversation-actions-container";

        /**
         * Wait and get the key elements
         * @return {Promise<boolean>} Return false if any of the key elements not found. Otherwise return `true`.
         */
        async function getKeyElements(): Promise<boolean> {
            let allFound = true;

            // Chat list container
            chatListContainer = await waitForAnElement('.chat-history');
            if (!chatListContainer) allFound = false;

            // Chat input
            const chatInputSelector = '.new-input-ui[role="textbox"]';
            const temporaryChatInputElement = await waitForAnElement(chatInputSelector);
            if (temporaryChatInputElement === null) {
                allFound = false;
            } else {
                // Need to be converted to HTMLInputElement
                chatInputElement = temporaryChatInputElement as HTMLInputElement;
            }

            return allFound;
        }

        /**
         * Initialize the page adapter
         */
        async function init() {
            await getKeyElements();

            // Add resize event handler, to refresh references to key elements
            addWindowResizeListener();

            // Feed info to pageLive & pageLive.page
            window.pageLive.page.name = 'Gemini';
            // Update chat info to dialog title, even if the chat info is not yet parsed
            updateDialogWithChatInfo();
            // Initial announce info
            // window.pageLive.initialAnnounceInfo.push("Gemini page");

            // Add keybind 'focus chat input'
            window.pageLive.keybindManager.registerKeybind(
                window.PageLiveStatics.KeybindManager.Keybinds.FocusChatInput,
                focusChatInput
            );
            // Add keybind 'announce last response'
            window.pageLive.keybindManager.registerKeybind(
                window.PageLiveStatics.KeybindManager.Keybinds.AnnounceLastResponse,
                // announceLastResponse
                chatAdapter.announceLastResponse.bind(chatAdapter)
            );
            // Add keybind 'delete current chat'
            window.pageLive.keybindManager.registerKeybind(
                window.PageLiveStatics.KeybindManager.Keybinds.ChatCurrentDelete,
                currentChatDelete
            );
            // Add keybind 'start new chat'
            window.pageLive.keybindManager.registerKeybind(
                window.PageLiveStatics.KeybindManager.Keybinds.NewChat,
                startNewChat
            )

            // Add callback to be executed the next time dialog is shown
            window.pageLive.dialogManager.onEveryOpenCallback = onDialogOpen

            // Notify PageLive that the page adapter is fully loaded
            window.pageLive.page.ready();

            start();
        }

        /**
         * Start the page adapter process
         * @todo Move more initialization code here
         */
        async function start() {
            // TODO later
        }

        /**
         * This function to requery the 'persisted' elements, such as `chatListContainer`.
         * Note: On window resize, references to 'persisted' elements seems invalid, thus the feature is not working.
         * For instance, after resized, the function `getActiveChatMenuButton` can not find the button. However it does not raise any error message.
         * That's why the references need to be updated.
         * The event handler set below will be debounced.
         */
        async function addWindowResizeListener() {
            // The timer id. We will debounce the event handler to avoid rapid execution during window resizing.
            let resizeTimer: ReturnType<typeof setTimeout>;
            const DEBOUNCE_DELAY = 300;

            window.addEventListener('resize', () => {
                // Clear the previous timer (if it exists)
                clearTimeout(resizeTimer);

                // Set a new timer
                resizeTimer = setTimeout(async () => {
                    // Requery the key / persisted HTMLElements
                    await getKeyElements();
                    chatInputElement = getChatInputElement();

                    // Execute GeminiChat.onWindowResize() to let GeminiChat handle the resize event
                    chatAdapter.onWindowResized();
                }, DEBOUNCE_DELAY);
            });
        }

        /**
         * Return the `Container` element. If null, try to query from the document.
         * If failed query the element, announce the result and return false.
         * @param {boolean} reQuery If set true, will re-parse / re-query the element.
         * @returns {Promise<boolean>} if the `chatListContainer` exist.
         */
        // async function ensureChatListContainerElement(reQuery = false): Promise<boolean> {
        //     // If null or need to re-query again
        //     if (chatListContainer === null || reQuery) {
        //         // Get the chat list container
        //         // chatListContainer = document.querySelector('[data-test-id="all-conversations"]') as HTMLElement | null;
        //         chatListContainer = document.querySelector('.chat-history');
        //     }

        //     if (!chatListContainer) {
        //         const msg = "Chat list container not found";
        //         prodWarn(msg);
        //         window.pageLive.announce({ msg });
        //         return false;
        //     }
        //     return true;
        // }

        /**
         * Get the HTML element that if clicked will toggle the side nav
         * @return {Promise<HTMLElement|null>} The element if found
         */
        async function getSideNavToggleButton(): Promise<HTMLElement | null> {
            // Query the document
            // 'button.[data-test-id="side-nav-menu-button"]
            const sideNavToogleButton = document.querySelector('[data-test-id="side-nav-menu-button"]') as HTMLElement | null;

            // If still not exist, notify
            if (!sideNavToogleButton) {
                const msg = "Failed to find side nav toggle button";
                prodWarn(msg);
                window.pageLive.announce({ msg });
            }
            return sideNavToogleButton;
        }

        /**
         * Get reference to the chat input element.
         */
        function getChatInputElement(): HTMLInputElement | null {
            return document.querySelector('.new-input-ui[role="textbox"]');
        }

        /**
         * This function will focus the chat input element.
         */
        async function focusChatInput() {
            // !DELETE: below
            // if (!chatInputElement) {
            //     chatInputElement = getChatInputElement();
            // }

            if (chatInputElement) {
                // In SR browse mode, SR will not read the input eventhough the focus is at the input element.
                // By change focus to other element first, before change focus to the input, will force the SR change to Form/Input mode. Thus, user can type right away without having to change SR mode.

                const toggleButton = await getSideNavToggleButton();
                toggleButton?.focus();

                // Wait very very quick
                await new Promise(r => setTimeout(r, 50));

                chatInputElement.focus();
                // No need to announce, since screen reader will read the focused element automatically.
            }
        }

        /**
         * Open Gemini's chat menu on the side nav.
         * @param {string} chatId The id of the chat. If is an empty string will open the current active chat.
         * @return {Promise<void>}
         */
        async function openChatActionsMenu(chatId: string): Promise<void> {
            // FIXME currently left empty. In the future, delete of refactor other functions that uses this function.
        }

        /**
         * Get the chat actions menu element. It is the chat context pop up menu.
         * The chat actions menu needs to be opened first, like the effect of `openChatActionsMenu` function
         */
        async function getChatActionsMenuElement(): Promise<HTMLElement | null> {
            // This is for the large width screen.
            let chatActionsMenu = document.querySelector('.conversation-actions-menu') as HTMLElement | null;

            // If not found, maybe currently is small width screen.
            if (chatActionsMenu === null) {
                // For the small screen, no rational suitable selector can be found.
                // Below is the closest one
                chatActionsMenu = document.querySelector('mat-bottom-sheet-container[role="dialog"]');
            }

            if (chatActionsMenu === null) {
                const msg = "Failed to find chat actions menu element";
                prodWarn(`[PageLive][Gemini] ${msg}`);
                window.pageLive.announce({ msg });
            }

            return chatActionsMenu;
        }

        /**
         * Get the delete button from the opened chat actions menu
         */
        async function getDeleteButton(): Promise<HTMLElement | null> {
            const chatActionsMenu = await getChatActionsMenuElement();
            if (chatActionsMenu === null) return null;

            const deleteButton = chatActionsMenu?.querySelector('[data-test-id="delete-button"]') as HTMLElement | null;
            if (deleteButton === null) {
                const msg = "Failed to find delete button";
                prodWarn(`[PageLive][Gemini] ${msg}`);
                window.pageLive.announce({ msg });
            }

            return deleteButton;
        }

        /**
         * Checks if the current page is an unsaved chat.
         * Unsaved chat is identified by the path being exactly '/app' or '/app/'.
         * @returns {boolean} True if the path matches, otherwise false.
         */
        function isThisUnsavedChat(): boolean {
            const path = window.location.pathname;
            return path === '/app' || path === '/app/';
        }

        /** 
         * Delete the current chat, if possible 
         */
        async function currentChatDelete() {
            // Detect if this is a new chat. If yes, cannot find the chat menu button, thus cannot continue. Announce so the user knows.
            const isUnsavedChat = isThisUnsavedChat();
            if (isUnsavedChat) {
                window.pageLive.announce({ msg: "This is a new chat. Nothing to delete." })
                return;
            }

            // Find the button that will show the chat-context menu
            const menuButton: HTMLElement | null = await getActiveChatMenuButton();

            // If still can not find chat menu button, cannot continue. Announce so the user knows
            if (!menuButton) {
                // console.warn('[PageLive][Gemini] Chat menu button not found. Unable to delete current chat.');
                return;
            }

            // Activate the button, then wait for the animation to complete
            menuButton.click();
            await new Promise(resolve => setTimeout(resolve, 200));

            // Find the delete button in the menu
            const deleteButton = await getDeleteButton();

            // Activate the delete button
            deleteButton?.click();

            // Done. Delete confirmation and action will be handled by the page itself.
        };

        /**
         * Note: Chat menu button is the button to show the chat context menu, which contains rename and delete chat buttons.
         * In the small/medium screen, there is only one chat menu button: at the top right which show menu for the current active chat.
         * In the large screen, there are multiple chat menu buttons: on the right side of each chat in the chat list on the right side navigation.
         *
         * This function will return the chat menu button for the current active chat.
         * Steps to find the button:
         * 1. Assume the browser is currently in small/medium screen, get the single chat menu button.
         * 2. If not found, assume the browser is in large screen. We need to find the active chat from the chat list, then locate the chat menu button in the active chat element.
         *
         * Since the browser size might change any time, we will not save the reference to the button. Instead, we will find it every time this function is called.
         */
        async function getActiveChatMenuButton(): Promise<HTMLElement | null> {
            // Try to find the chat menu button for small/medium screen
            let chatMenuButton = document.querySelector('[data-test-id="conversation-actions-button"]') as HTMLElement | null;

            // If found, return the chat menu button right away
            if (chatMenuButton) return chatMenuButton;

            // If not found, try to find the chat menu button for large screen
            // On large screens, the active chat menu button will be on side nav.

            // Ensure the side nav is opened
            await ensureSideNavOpened();

            // Trigger the chat list until the active / selected chat is in the list
            await populateChatList(true);

            // Find the active chat element in the chat list
            const selectedChatActionsElement = await getSelectedChatActionsContainerElement();

            // Locate the chat menu button in the active chat element
            chatMenuButton = await getChatActionsMenuButton(selectedChatActionsElement);

            return chatMenuButton;
        }

        /**
         * Ensure the side navigation, containing chat list, is opened.
         * If the side nav is closed, it will be opened by clicking the side nav toggle button.
         * @returns 
         */
        async function ensureSideNavOpened(): Promise<boolean> {
            // Is side nav open ?
            const isSideNavOpened = await checkIsSideNavOpened();

            // If the side nav is closed, we need to open it by clicking the side nav toogle button
            if (!isSideNavOpened) {
                const sideNavToggleButton = await getSideNavToggleButton();
                // If the toogle button not exist, we can't continue
                if (!sideNavToggleButton) return false;

                // Click to open the side nav. No need to be closed back.
                await sideNavToggleButton.click();
                // Announce about the current activity
                window.pageLive.announce({ msg: "Opening side navigation" });
            }

            // wait a little for animation to finish
            await new Promise(r => setTimeout(r, 250));
            return true;
        }

        /**
         * Check if the side navigation (chat list) is opened.
         */
        async function checkIsSideNavOpened(): Promise<boolean> {
            // When the side nav is opened,
            // the elements '.conversation-items-container' and '.conversation-actions-container' will have 'side-nav-opened' class.
            // Side nav considered opened if there is element '.side-nav-opened' in the chat list container

            // DELETE below: Ensure the `chatListContainer` exist
            // await ensureChatListContainerElement();

            return chatListContainer?.querySelector('.side-nav-opened') !== null;
        }

        /**
         * Chat list is not fully populated until the chat list is scrolled to the bottom.
         * So, there is a chance that the active chat is not in the DOM yet.
         * To handle this, this function will scroll the chat list to the bottom to meet 2 criterias : Until the active chat is visible or all chats are loaded.
         * @param {boolean} findActiveChat If active chat is found, this function no longer scroll down on the chat list container / scroller
         * @param {boolean} shouldCloseBackNavBar Set to false if the side nav need to be closed back in the case this function automatically open the side nav.
         * @return {Promise<void>}
         */
        async function populateChatList(findActiveChat = false, shouldCloseBackNavBar = true) {
            // DELETE: Chat list is required to continue
            // await ensureChatListContainerElement();
            // Type checking
            if (!chatListContainer) return;

            // Required: Loading image to be observed
            const isLoadingElement = chatListContainer.querySelector('.loading-history-spinner-container');
            if (!isLoadingElement) {
                const msg = "Unable to find loading-history-spinner-container element";
                prodWarn(msg);
                window.pageLive.announce({ msg });
                return;
            }
            // Required: Scroller element that need to be scrolled down
            const scrollerElement = chatListContainer.closest('infinite-scroller');
            if (!scrollerElement) {
                const msg = "Failed to find the closest infinite-scroller element";
                prodWarn(msg);
                window.pageLive.announce({ msg });
                return;
            }

            // The class used to show the loading spinner element
            const IS_LOADING_CLASS = 'is-loading';

            // Loop until any of 2 conditions found: chat active or fully loaded (no more 'is-loading' image)
            let failSafe = 0;
            while (true) {
                // Break if we want to find active chat and it is already loaded
                const activeSelectedChat = await getSelectedChatElement();
                if (findActiveChat && activeSelectedChat !== null) {
                    // window.pageLive.announce({ msg: "Active chat is found. Number of scroll : " + failSafe });
                    return true;
                }

                // Note: After scroll down, one of 2 things might happen:
                // 1. If there are more chats can be loaded, loading image will appear and will be hidden after some chats are loaded.
                // 2. If there are no more chats can be loaded, the loading image will not appear at all.
                // So we need to wait very shorlty until the loading image appears. If not appears, that means all chats are already loaded.
                // If the loading image appears, mark with `loadingStarted`. When the image hidden, mark with `loadingFinished`.

                // Use Promise until 1 of the conditions met
                await new Promise(async (resolve) => {
                    // DELETE below: Check chat list container again
                    // await ensureChatListContainerElement();
                    // if (!chatListContainer) return;

                    // Flags for 'is loading' state
                    let loadingStarted = false;

                    // Timeout to resolve and exit the process of populating the chat list, if the 'is-loading' image not shown. That means all chats has been loaded
                    setTimeout(() => {
                        // If loading has not started, that means all chats has been loaded
                        if (!loadingStarted) {
                            resolve(null);
                            window.pageLive.announce({ msg: "Not loading anymore. All chats has been loaded" });
                            // We can not return here, since this is inside setTimeout.
                            // Instead, we will set the `failSafe` to a large number to break the while loop below
                            failSafe = 999;
                        }
                    }, 400);

                    // Prepare observer to observe the loading image.
                    const isLoadingObserver = new MutationObserver((mutationsList, observer) => {
                        // Flag whether loading class is added or removed
                        let isLoadingClassAdded = false;
                        let isLoadingClassRemoved = false;

                        for (const mutation of mutationsList) {

                            // Check if the mutation is an attribute change on the 'class' attribute
                            if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                                // Cast target to HTMLElement
                                const target = mutation.target as HTMLElement;

                                // Does prev class has 'isLoading' class ?
                                const prevHasLoadingClass = mutation.oldValue?.includes(IS_LOADING_CLASS);
                                // Does the current class has 'isLoading' class ?
                                // Get the class attribute's value AT THE MOMENT OF THE MUTATION
                                const currentHasLoadingClass = target.classList.contains(IS_LOADING_CLASS);

                                if (!prevHasLoadingClass && currentHasLoadingClass) {
                                    // Flagging the loading has started is useful to cancel timeout above (the case when all chats has been loaded)
                                    loadingStarted = true;
                                    window.pageLive.announce({ msg: "Loading previous chats" });
                                } else if (prevHasLoadingClass && !currentHasLoadingClass) {
                                    // Loading has finished. Disconnect `isLoadingObserver` and resolve.
                                    observer.disconnect();
                                    resolve(null);
                                    // window.pageLive.announce({ msg: "Loading sign is hidden" });
                                }
                            }
                        }
                    });
                    isLoadingObserver.observe(isLoadingElement, {
                        attributes: true,             // Watch for attribute changes
                        attributeFilter: ['class'],   // Only watch the 'class' attribute for efficiency
                        attributeOldValue: true,       // Not strictly needed here, but useful for debugging
                        subtree: true,
                    });

                    // Scroll to the bottom
                    scrollerElement.scrollTop = scrollerElement.scrollHeight;
                    // Wait a little for the UI to be updated
                    await new Promise(r => setTimeout(r, 400));
                });

                // Fail safe
                failSafe++;
                if (failSafe > 10) break;
            }
        }

        /**
         * Get the active chat element from one of the parent elements.
         * Note: The chat element basicly contains the chat title. For the actions menu, used the `getSelectedChatActionsContainerElement`.
         * @returns {HTMLElement|null} Get the active chat items container
         */
        async function getSelectedChatElement(): Promise<HTMLElement | null> {
            // DELETE: Make sure the chat list container exist
            // await ensureChatListContainerElement();

            return chatListContainer?.querySelector(`.conversation${CHAT_SELECTED_TAG_SELECTOR}`) as HTMLElement | null;
        }

        /**
         * Get the title of the active chat from the chat list. If not found, return empty string.
         * @returns
         */
        async function parseSelectedChatTitle(): Promise<string> {
            // Get the active chat element
            const selectedChatElement = await getSelectedChatElement();
            if (selectedChatElement === null) return "";

            // Get the title element inside the active chat element
            const titleElement = selectedChatElement.querySelector(CHAT_TITLE_SELECTOR);
            if (titleElement === null) return "";

            return titleElement.textContent?.trim() || "";
        }

        /**
         * Get the active chat actions element in the chat list.
         */
        async function getSelectedChatActionsContainerElement(): Promise<HTMLElement | null> {
            // DELETE: The chat list container is required
            // await ensureChatListContainerElement();

            // Find the active chat item element in the chat list
            return chatListContainer?.
                querySelector(`.${CHAT_ACTIONS_CONTAINER_CLASS}${CHAT_SELECTED_TAG_SELECTOR}`) as HTMLElement | null;
        }

        /**
         * Get the button that will open chat context menu, which contains: rename button, delete button, etc.
         * @param {HTMLElement | null} chatActionsContainer The container element of the button. This element must have class 'conversation-actions-container'
         * @return {Promise<HTMLElement |null>} The chat actions menu button
         */
        async function getChatActionsMenuButton(chatActionsContainer: HTMLElement | null): Promise<HTMLElement | null> {
            // The parent element must not null
            if (chatActionsContainer === null) {
                const msg = "Chat actions container is null";
                console.warn(`[PageLive][Gemini] ${msg}`);
                window.pageLive.announce({ msg });
                return null;
            }

            // The parent element must have the required class
            if (!chatActionsContainer.classList.contains(CHAT_ACTIONS_CONTAINER_CLASS)) {
                const msg = "Chat actions container does not have the required class";
                console.warn(`PageLive][Gemini] ${msg}`);
                window.pageLive.announce({ msg });
                return null;
            }

            // The more complete selector: `.conversation-actions-menu-button.[data-test-id="actions-menu-button]`
            return chatActionsContainer.querySelector('[data-test-id="actions-menu-button"]') as HTMLElement | null;
        }

        /**
         * Start new chat, by clicking a button on side nav.
         */
        async function startNewChat() {
            window.pageLive.announce({ msg: "Start new chat", omitPreannounce: true });

            // Make sure side nav is opened
            const isSideNavOpened = await checkIsSideNavOpened();
            if (!isSideNavOpened) {
                const sideNavToggleButton = await getSideNavToggleButton();
                // Click the toogle button and wait a little
                sideNavToggleButton?.click();
                await new Promise(r => setTimeout(r, 250));
            }

            // Find the start-new-chat button. Selector below
            // const newChatButton = document.querySelector('[data-test-id="new-chat-button"]') as HTMLElement | null;
            const newChatButton = document.querySelector('[data-test-id="expanded-button"]') as HTMLElement | null;

            if (newChatButton === null) {
                const msg = "Failed to find the new chat button";
                console.error(`[PageLive][Gemini] ${msg}`);
                window.pageLive.announce({ msg });
                return;
            } else {
                // Click the button
                newChatButton.click();
            }

            // After the button is clicked, the UI will be re-rendered, causing `chatContainer` element to be disconnected.
            // Wait a little for the UI to be re-rendered, then re-query the key elements
            await new Promise(r => setTimeout(r, 4000)); // 4 seconds is long enough for the UI to be re-rendered, and quick enough before user finish typing the first input.
            await init();
            chatAdapter.init();
        }
        /**
         * Parse the current active chat info from the document, if possible.
         * If successfull parsed, save the result to `activeChat` and will attach to `window.pageLive.page.activeChat`.
         * @param {boolean} shouldUpdateDialog If set true, will update the dialog with everything related to the parsed chat info.
         * @returns {Promise<boolean>} Return true is successfully parsed, false otherwise.
         */
        async function parseActiveChatInfo(shouldUpdateDialog = true): Promise<boolean> {
            // If this is a new chat, there is no active chat info in the URL or document
            if (isThisUnsavedChat() === true) {
                activeChat = { ...EMPTY_CHAT };
            } else {
                // Parse the id
                activeChat.id = await parseChatId();

                // Parse the title from the chat list
                await ensureSideNavOpened();
                // Populte the chat list until the active chat is found
                await populateChatList(true);
                activeChat.title = await parseSelectedChatTitle();
            }

            // Update dialog if shouldUpdateDialog is set true
            if (shouldUpdateDialog) updateDialogWithChatInfo();

            // Attach to global var if `activeChat.id` is found and not yet attached to `window.pageLive.page.activeChat`:
            if (activeChat.id && window.pageLive.page.activeChat === null) {
                window.pageLive.page.activeChat = activeChat;
            }
            return true;
        }
        /**
         * Parse chat id from the URL path or document. Return empty string if not found.
         * @returns {Promise<string>} The chat id if found, otherwise empty string.
         */
        async function parseChatId(): Promise<string> {
            let chatId = "";

            // Parse from URL path
            const path = window.location.pathname;
            // Match the path after '/app/' and capture the next segment (the chat id)
            const pathMatch = path.match(/^\/app\/([^\/]+)/);
            if (pathMatch) {
                chatId = pathMatch[1];
            }
            return chatId;
        }

        /**
         * Update the dialog with everything related to the current active chat info.
         */
        function updateDialogWithChatInfo() {
            let title = "Gemini";

            const isUnsavedChat = isThisUnsavedChat();
            if (isUnsavedChat) {
                title += " new chat.";
            }
            // If active chat title exist, add to the dialog snapshot info
            else if (activeChat.title) {
                title = ` ${activeChat.title}.`;
            }
            // Either chat info yet not parsed, or no title found
            else {
                // No title, maybe a new chat
                title += " chat, title not available.";
            }

            // Update the dialog
            window.pageLive.dialogManager.setTitle(title);
            // Note: For now we will not set the page snapshot info, since we do not have much info to show
        }

        /**
         * Synchronize the active chat info with the URL & document, if possible.
         */
        async function syncActiveChatInfo(): Promise<void> {
            // Parse the chat id from the URL
            const chatId = await parseChatId();

            // If not yet parsed, parse it
            if (activeChat.id === null
                || activeChat.id !== chatId
            ) {
                await parseActiveChatInfo();
            }
        }

        async function onDialogOpen(): Promise<void> {
            // Synchronize the active chat info
            await syncActiveChatInfo();
        }

        // References to HTML elements
        let chatInputElement: HTMLInputElement | null;
        // Chat list container on the right side navigation
        let chatListContainer: HTMLElement | null = null;

        // =============== Execution ===============
        // Initialize the page adapter
        init();

        // Object to handle chat container related features
        const chatAdapter = new GeminiAdapterChat();
        await chatAdapter.init();

        // Information about the current chat. This will be lazy loaded on one of several events, e.g. when side nav is opened, pageLive dialog is opened, etc.
        // Only attach to `window.pageLive.page` when have tried to parse the info.
        const EMPTY_CHAT: Chat = {
            id: "", // empty string means parsed but not found
            title: ""
        }
        let activeChat: Chat = {
            id: null, // null means not yet parsed
            title: ''
        }

    };

    /**
    * This class features interaction with the chat container element of gemini page.
    * Chat container is the element that wraps the series of prompts and responses of the current active chat.
    * Note: A new response will not be rendered all at once, but received in streams. The gemini UI will add / update the response segment elements.
    */
    class GeminiAdapterChat {

        // Ref to the chat container: containing all prompts and responses 
        chatContainer: HTMLElement | null = null;
        chatContainerObserver: MutationObserver | null = null;
        // Selector to the chat container
        static CHAT_CONTAINER_SELECTOR = "#chat-history";
        // Selector to a response container
        static RESPONSE_ELEMENT_NAME = 'MESSAGE-CONTENT';
        // Wait time for a 'response segment' element to be considered as fully updated by Gemini
        static SEGMENT_WAIT_SECONDS: number = 1e3; // seconds

        constructor() { }

        /**
         * Wait and initialize things
         * @returns {Promise<void>}
         */
        async init(): Promise<void> {
            // Set element refs
            await this.getKeyElements();

            // Validate element ref
            if (!this.chatContainer) {
                console.warn("[PageLive] Can not find chat container element. Now exiting - 31873");
                return;
            }

            // Wait until the chat history has completely rendered with the previous chat
            await untilElementIdle(this.chatContainer, 3e3); // Wait for 3 seconds idle

            // Notify user that PageLive is ready and about the loaded chat history if any
            this.notifyUserIfChatHistoryHasBeenLoaded();

            // Attach observer to chat container to detect incoming response
            await this.observeChatContainer();
        }

        async getKeyElements() {
            this.chatContainer = await waitForAnElement(GeminiAdapterChat.CHAT_CONTAINER_SELECTOR);
        }

        /**
         * Handler when window is resized. This function will be called by `GeminiAdapter`class.
         */
        async onWindowResized() {
            await this.getKeyElements();
        }
        observeChatContainer() {
            // Container of response element that we are trying to catch on mutations
            let responseContainer: HTMLElement | null = null;

            // Note: .gpi-static-text-loader is the class for the loading text 'Just a sec..'

            // Stop observing the previous observer if any
            if (this.chatContainerObserver) {
                this.chatContainerObserver.disconnect();
                this.chatContainerObserver = null;
            }

            // Observer to 'catch' the `responseElement` that will be added during receving new response
            this.chatContainerObserver = new MutationObserver(async (mutationList, observer) => {

                // Set to null if previously found `responseContainer` is no longer connected
                if (!responseContainer?.isConnected) responseContainer = null;

                // Not yet have responseContainer ?
                if (!responseContainer || responseContainer.isConnected === false) {
                    if (responseContainer?.isConnected === false) {
                        devLog("Previously found responseContainer is no longer connected. Resetting.");
                    }

                    // Try to catch the `responseContainer`
                    for (const mutation of mutationList) {
                        if (mutation.type === "childList") {
                            for (let c = 0; c < mutation.addedNodes.length; c++) {
                                const node = mutation.addedNodes.item(c) as HTMLElement;
                                if (this.isResponseContainerElement(node)) {
                                    responseContainer = node;
                                    devLog("Response container is found");
                                    break;
                                }
                            }
                        }
                        // Stop loop if `responseContainer`is found
                        if (responseContainer) break;
                    }
                }

                // Try to query `responseElement` within the `responseContainer`
                if (responseContainer) {
                    devLog("Try to get responseElement within responseContainer");

                    // Use selector, not by selecting on each of the `mutation.addedNodes` because the `responseElement` is a `div`without classes or id that can be used to identify.
                    // The selector : `message-content > div`
                    let responseElement = responseContainer.querySelector('message-content > div') as HTMLElement;

                    // If `responseElement` is found, start observing the incoming response segments
                    if (responseElement) {
                        devLog("Response element is found, start observing incoming response");
                        this.observeIncomingResponse(responseElement);
                        // Disconnect the 'response container' observer
                        observer.disconnect();
                    }
                }
            })

            //  Type check
            if (!this.chatContainer) {
                prodWarn("Chat container element not exist - 3814");
                return;
            }

            // Observe elements addition of subtree of chat container
            this.chatContainerObserver.observe(this.chatContainer, {
                childList: true,
                subtree: true,
                characterData: true,

            });
        }

        /**
         * Decide if an element is a `responseContainer` element
         * @param {HTMLElement} el The element to test
         * @param {boolean} true if the element can be a `responseContainer`, false if otherwise
         */
        isResponseContainerElement(el: HTMLElement) {
            // Below are the hierarchy of `responseContainer` element, skipping some elements:
            // `div.conversation-container model-response response-container div.response-container div.response-container-content div.response-content`
            // To make PageLive more prone to Gemini's UI changes, we are going to test each of the selector to be able ref to a `responseContainer`

            if (
                // `div.conversation-container`
                (el.nodeName === "DIV" && el.classList.contains("conversation-container"))
                // model-response 
                || (el.nodeName === "MODEL-RESPONSE")
                // response-container 
                || (el.nodeName === "RESPONSE-CONTAINER")
                // div.response-container 
                || (el.nodeName === "DIV" && el.classList.contains("response-container"))
                // div.response-container-content 
                || (el.nodeName === "DIV" && el.classList.contains("response-container-content"))
                // div.response-content
                || (el.nodeName === "DIV" && el.classList.contains("response-content"))
            ) return true;
            return false;
        }

        /**
         * Observation on a response element.
         * This function is used to detect and announce of the incoming response segments.    
         * @param {HTMLElement} responseElement The Element containing response segment elements.
         */
        async observeIncomingResponse(responseElement: HTMLElement) {
            // The previous total of segments, before added in the mutation callback
            let prevSegmentsCount = 0;
            // The index of the last announced response segment
            let lastAnnouncedSegment = -1;
            // The timeout id to announce the last remaining response segments
            let remainingTimeoutId: ReturnType<typeof setTimeout>;

            /**
             * Observer to handle response segment addition / update.
             * Everytime a response segment is added, 2 things will happen:
             * 1. Announce all segments before the last one, that has not been announced.
             * 2. Set timeout to announce the remaining of the response segments, that has not been announced.
             */
            const newResponseObserver = new MutationObserver(async (mutationList, observer) => {
                const segmentsCount = responseElement.children.length;

                // Is total segments increased ?
                if (prevSegmentsCount < segmentsCount) {
                    // Note: Number of segments can increase more than 1 on 1 callback. On a found case 2 segments added at once.
                    // Assuming Gemini UI only updating the last segment, we can announce right away the n-1 segments.
                    // For example, if 2 segments added at once the earlier segment is instantly announced and the later will be announce with delay.
                    // So the last segment to be announced is the second last
                    const secondLastSegmentIndex = segmentsCount - 2; // -2 because this is an index of the second last

                    devLog(`Segments increased from ${prevSegmentsCount} to ${segmentsCount}`);

                    // announce the previous not yet announced segments
                    devLog(`lastAnnouncedSegment before :${lastAnnouncedSegment}`);
                    lastAnnouncedSegment = await this.announceSegments(responseElement, lastAnnouncedSegment, secondLastSegmentIndex);
                    devLog(`lastAnnouncedSegment after :${lastAnnouncedSegment}`);

                    // Schedule to announce the remaining not-yet-announced segments
                    remainingTimeoutId = this.delayAnnounceRemainingSegments(responseElement, lastAnnouncedSegment, remainingTimeoutId, observer);

                    // Current count will be the prev count for next process
                    prevSegmentsCount = segmentsCount;
                }

            });

            // Observe
            devLog("Start observe response element");
            newResponseObserver.observe(responseElement, {
                childList: true,
            });
        }

        /**
         * Schedule to announce the remaining not-yet-announced response segments
         * @param {HTMLElement} responseElement The direct parent of the response segment elements
         * @param {number} lastAnnouncedSegment The index of the last announced segment
         * @param {MutationObserver} observer The mutation observer to disconnect at the end of receiving response
         */
        delayAnnounceRemainingSegments(responseElement: HTMLElement, lastAnnouncedSegment: number
            , announceTimeout: ReturnType<typeof setTimeout>
            , observer: MutationObserver) {

            // Cancel the timeout id if exist
            if (announceTimeout) clearTimeout(announceTimeout);

            return setTimeout(() => {
                const lastSegmentToAnnounce = responseElement.children.length - 1;
                devLog(`Delayed announced, from segment ${lastAnnouncedSegment + 1} to ${lastSegmentToAnnounce} `);
                this.announceSegments(responseElement, lastAnnouncedSegment, lastSegmentToAnnounce);

                // The incoming response has been completely received
                this.onResponseComplete(observer);
            }, GeminiAdapterChat.SEGMENT_WAIT_SECONDS);
        }

        /**
         * Announce response segments
         * @param responseElement The element that wraps the response segment elements
         * @param lastAnnouncedSegment The index of the last segment elements that has been announced
         * @param lastIndex The last index of the response segment elements to be announced 
         */
        async announceSegments(responseElement: HTMLElement, lastAnnouncedSegment: number, lastIndex: number) {
            devLog("announce segment from " + (lastAnnouncedSegment + 1) + " until " + lastIndex);
            for (let c: number = lastAnnouncedSegment + 1; c <= lastIndex; c++) {
                // Type check
                if (!responseElement.children[c]) {
                    prodWarn(`Unable to find segment with index ${c}`);
                    prodWarn(`response element: ${responseElement}`);
                    return lastAnnouncedSegment;
                }
                const segmentElement = responseElement.children[c] as HTMLElement;
                if (!segmentElement.outerHTML) {
                    prodWarn("Segment element does not have property 'outerHTML' - 4720");
                    return lastAnnouncedSegment;
                }

                devLog("announcing :");
                devLog(segmentElement.outerHTML);
                window.pageLive.announce({
                    msg: segmentElement.outerHTML
                    , omitPreannounce: true
                });

                // Increase the `lastAnnouncedSegment`
                lastAnnouncedSegment = c;
            }
            // Return `lastAnnouncedSegment` to be used for next mutations
            return lastAnnouncedSegment;
        }
        /**
         * Handler when a response is completely received
         * @param {MutationObserver} newResponseObserver The observer for the incoming new response
         */
        async onResponseComplete(newResponseObserver: MutationObserver) {
            // Are there variables need to be reset ?

            // Disconnect 'new response observer'
            newResponseObserver.disconnect();

            // Observe chat container again
            this.observeChatContainer();
        }

        /**
         * Notify user after the previous chat history has been loaded
         */
        notifyUserIfChatHistoryHasBeenLoaded() {
            // How many responses have been loaded ?
            const promptResponseElements = this.getPromptResponseElements();

            // Notify user
            if (promptResponseElements) {
                const total = promptResponseElements.length;

                if (total > 0) {
                    let msg = `${total} responses loaded`;
                    window.pageLive.announce({
                        msg, omitPreannounce: true
                    });
                }
            }
        }

        /**
         * Get the list of `PromptResponse` elements. Each `promptResponse` element contain the pair of 1 prompt and 1 response.
         * @return {NodeListOf<Element> | null} List of `promptResponse` elements
         */
        getPromptResponseElements(): NodeListOf<Element> | null {
            if (!this.chatContainer) {
                prodWarn("Chat container not found - 5821");
                return null;
            }
            return this.chatContainer.querySelectorAll("div.conversation-container");
        }

        /**
         * Get the last response element from the HTML document.
         */
        getLastResponseElement(): HTMLElement | null {
            // Get the last response element from the chat container
            const responseElements = document.querySelectorAll(
                GeminiAdapterChat.CHAT_CONTAINER_SELECTOR + ' ' + GeminiAdapterChat.RESPONSE_ELEMENT_NAME
            );
            if (responseElements.length > 0) {
                return responseElements[responseElements.length - 1] as HTMLElement;
            }
            return null;
        }

        /**
         * This function will announce the last response.
         * It will check if the lastGeminiResponseElement is available, and if so, it will announce its content.
         */
        async announceLastResponse() {
            console.log('[PageLive][Gemini] Announcing last response');

            // A bit of notification that the last response is goig to be announced.
            // This seems to be useful while waiting to find the last response element (if needed).
            window.pageLive.announce({
                msg: "Reading last response.",
                // No need to preannounce, since this is a user triggered action.
                omitPreannounce: true
            });

            const lastGeminiResponseElement = this.getLastResponseElement();

            // Prepare the message to be announced.
            let toBeAnnounced = "No response element is found.";
            if (lastGeminiResponseElement) {
                toBeAnnounced = lastGeminiResponseElement.innerHTML || '';
            }

            // Announce
            window.pageLive.announce({
                msg: toBeAnnounced
                // User triggered action, no need to preannounce
                , omitPreannounce: true,
            });
        }
    }

    // Run the adapter. This is a bit tricky, because we need to run this after PageLive is ready. But PageReady is waiting for the some elements exist in DOM.
    // That is why when the readyState is 'loading', we need to wait for DOMContentLoaded, or run it right away if the readyState is already pass 'loading'.
    async function runGeminiAdapterWhenPageReady() {
        geminiPageAdapter();

    }

    // Start the adapter when the DOM is ready
    if (document.readyState === 'loading') {
        // The document is still loading, so wait for DOMContentLoaded
        document.addEventListener('DOMContentLoaded', runGeminiAdapterWhenPageReady);
    } else {
        // The DOM is already ready, so run the adapter directly
        runGeminiAdapterWhenPageReady();
    }
})();


