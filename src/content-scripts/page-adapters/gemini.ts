// gemini.ts - Injected only on gemini.google.com

// import { fail } from "assert";
import { parse } from "path";
import { parseElementsId } from "../general-dev";
import { Keybinds } from "../keybind-manager";
import { Chat } from "../page";
import { isRandomString } from "../util";
// import { parse } from "path";

/**
 * Note about how the process after gemini page is loaded.
 * - Need for the chat container to be rendered
 * - If any, the page will rendered the previous prompts and responses. Funtion below will set observer to wait for the whole previous chat being rendered in the chat container.
 * - After observing for the previous chat, function below will start new observer for new Gemini responses.
 * - The new incoming response will not be a whole complete text. It will streamlined in part of the text. Function below will set new observer to wait for the whole response being rendered..
 * - Everytime a chunk of response is added to the response element, it will be announced, but with a delay, and cancel the previous announce timeout.
 * - After reaching the timeout, the content of the response element will be announced.
 */

/**
 * Hierarchy subset on the side nav:
 *
 * infinite-scroller
 *      .loading-content-spinner-container
 *      .explore-gems-container
 *      .chat-history
 *          .chat-history-list
 *              conversations-list [data-test-id="all-conversations"]'
 *                  .title-container
 *                  .conversations-container
 *                      .conversation-items-container
 *                      .conversation-items-container
 *              .loading-history-spinner-container
 */

// Define page adapter to be executed on DOMContentLoaded
const geminiAdapter = async () => {
    const CHAT_CONTAINER_SELECTOR = "#chat-history";

    // Element name for Gemini response
    const RESPONSE_ELEMENT_NAME = 'MESSAGE-CONTENT';

    // Current chat container
    let chatContainer = document.querySelector(CHAT_CONTAINER_SELECTOR) as HTMLElement | null;
    // Chat list container on the right side navigation
    let chatListContainer: HTMLElement | null = null;

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
            resizeTimer = setTimeout(() => {
                // Requery the key / persisted HTMLElements
                chatContainer = document.querySelector(CHAT_CONTAINER_SELECTOR) as HTMLElement | null;
                ensureChatListContainerElement(true);
                chatInputElement = getChatInputElement();

                // TODO find some other persisted elements like : chat container, chat input, etc.

            }, DEBOUNCE_DELAY);
        });
    }


    /**
     * Wait for the chat container to be available
     * This is necessary because the chat container may not be immediately available on page load.
     * It will wait for up to 10 seconds before giving up.
     * @returns {Promise<boolean>} - Returns true if the page is ready for PageLive to continue, false otherwise.
     */
    async function waitForChatContainer(): Promise<boolean> {
        const MAX_WAIT_TIME = 60e3; // 60 seconds
        // Incremental interval
        let interval = 200;
        let waited = 0;

        while (!chatContainer && waited < MAX_WAIT_TIME) {
            await new Promise(res => setTimeout(res, interval));
            waited += interval;

            // increase interval to reduce number of loops
            interval = Math.min(interval + 100, 3000); // Cap the interval to a maximum of 3 seconds

            chatContainer = document.querySelector(CHAT_CONTAINER_SELECTOR) as HTMLElement | null;
        }
        return !!chatContainer
    }

    /**
     * Return the `Container` element. If null, try to query from the document.
     * If failed query the element, announce the result and return false.
     * @param {boolean} reQuery If set true, will re-parse / re-query the element.
     * @returns {Promise<boolean>} if the `chatListContainer` exist.
     */
    async function ensureChatListContainerElement(reQuery = false): Promise<boolean> {
        // If null or need to re-query again
        if (chatListContainer === null || reQuery) {
            // Get the chat list container
            // chatListContainer = document.querySelector('[data-test-id="all-conversations"]') as HTMLElement | null;
            chatListContainer = document.querySelector('.chat-history');
        }

        if (!chatListContainer) {
            console.warn('[PageLive][Gemini] Chat list container not found. Unable to check if side nav is opened.');
            window.pageLive.announce({ msg: "Chat list container not found" });
            return false;
        }
        return true;
    }
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
            console.warn(`[PageLive][Gemini] ${msg}`);
            window.pageLive.announce({ msg });
        }
        return sideNavToogleButton;
    }

    /**
     * This function will set a timeout to start observing the chat container for new response after a delay.
     * It will return the timeout ID so that it can be cleared if needed.
     * @returns {ReturnType<typeof setTimeout>} - Returns the timeout ID.
     */
    function setTimeoutToStartObserveNewResponses() {
        return setTimeout(() => {
            // console.log(`[PageLive][Gemini] Starting to observe ${CHAT_CONTAINER_SELECTOR} after ${OBSERVE_DELAY}`);

            // Start observing the chat history container for new Gemini responses
            observeNewResponses();
        }, DELAY_TO_START_OBSERVE_NEW_RESPONSES);
    }

    /**
     * This function will check if the chat container is still being populated by the previous chat.
     * If yes, it will delay the start of observing the chat container.
     */
    function observeIfPreviousChatBeingRendered() {
        // To know if the chat container is still being populated by the previous chat, we will use a MutationObserver.
        // Every time a new node is added to the chat container, we reschedule the observation (for current chat) timeout.
        previousChatObserver = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.addedNodes.length > 0) {
                    // console.log('[PageLive][Gemini] Previous chat is being rendered, rescheduling observation timeout');
                    // Reschedule the observation timeout
                    clearTimeout(observeNewResponsesTimeoutId);
                    observeNewResponsesTimeoutId = setTimeoutToStartObserveNewResponses();
                }
            });
        });
    }
    /**
     * @description This function will observe the chat history container for new Gemini responses.
     * This function Will match for every new mutation.
     * If the new node is the response element, it will save the reference of the element save so the response text can be announced later.
     */
    function observeNewResponses() {
        // console.log(`[PageLive][Gemini] Starting to observe ${CHAT_CONTAINER_SELECTOR} for Gemini new responses`);

        // Remove the chat observer for previous responses
        if (previousChatObserver) {
            previousChatObserver.disconnect();
            previousChatObserver = null;
        }

        const geminiObserver = new MutationObserver((mutations) => {
            // If there is mutations, set timeout to announce the response after a delay
            announceWithDelay();

            // Iterate through each mutation
            for (const mutation of mutations) {

                mutation.addedNodes.forEach((node) => {
                    // console.log('[PageLive][Gemini] Added node:', node);
                    // console.log('[PageLive][Gemini] Added node name:', node.nodeName);

                    // if (node instanceof HTMLElement && node.nodeName === 'MODEL-RESPONSE') {
                    // if (node instanceof HTMLElement && node.nodeName === 'MESSAGE-CONTENT') {
                    if (node instanceof HTMLElement && node.nodeName === RESPONSE_ELEMENT_NAME) {

                        // Set the latest Gemini response element
                        lastGeminiResponseElement = node;

                    }

                });
            }
        });

        // Verify the chatContainer is available to satify Typescript
        if (!chatContainer) {
            console.warn('[PageLive][Gemini] Chat container not found. Stopping observation setup.');
            window.pageLive.announce({
                msg: "Chat container not found. Please reload the page.",
            });
            return;
        }
        // Start observing the chat history container for new Gemini responses
        geminiObserver.observe(chatContainer, {
            childList: true,
            subtree: true,
            characterData: true
        });
    }

    /**
     * This function will announce with some delay. The delay will be reset every time this function is invoked.
     * When the timeout is reached, it will execute window.pageLive.announce(msg).
     * @param {number} delay - The delay in milliseconds before announcing the response. Default is 2000ms (2 seconds). 1 second is too short, causing the screen reader will read the previous response.
     */
    let announceTimeoutId: ReturnType<typeof setTimeout> | null = null;
    function announceWithDelay(delay = 4000) {
        if (announceTimeoutId) {
            clearTimeout(announceTimeoutId);
        }
        announceTimeoutId = setTimeout(() => {
            if (window.pageLive && typeof window.pageLive.announce === 'function') {
                if (lastGeminiResponseElement) {
                    window.pageLive.announce({
                        msg: lastGeminiResponseElement.innerHTML || ''
                    });

                    // After announced, the reference to the last response element need to be removed. This will avoid to re-announce if a mutation happens in the chat container that is not another response element.
                    lastGeminiResponseElement = null;
                }
            } else {
                console.warn('[PageLive][Gemini] pageLive.announce function not found on window.');
            }
        }, delay);
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
        if (!chatInputElement) {
            chatInputElement = getChatInputElement();
        }

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
     * Get the last response element from the HTML document.
     */
    function getLastResponseElement(): HTMLElement | null {
        // Get the last response element from the chat container
        const responseElements = document.querySelectorAll(CHAT_CONTAINER_SELECTOR + ' ' + RESPONSE_ELEMENT_NAME);
        if (responseElements.length > 0) {
            return responseElements[responseElements.length - 1] as HTMLElement;
        }
        return null;
    }

    /**
     * This function will announce the last response.
     * It will check if the lastGeminiResponseElement is available, and if so, it will announce its content.
     */
    async function announceLastResponse() {
        console.log('[PageLive][Gemini] Announcing last response');

        // A bit of notification that the last response is goig to be announced.
        // This seems to be useful while waiting to find the last response element (if needed).
        window.pageLive.announce({
            msg: "Reading last response.",
            // No need to preannounce, since this is a user triggered action.
            omitPreannounce: true
        });

        /*
        * This is a trial, by commenting if-lines below :
        * We are going to requery last response element, due to the possibility PageLive not catching the last returning response.
        * Note: On gemini returning current response, PageLive (this file) persist the 'last response'. This 'last response' was used to be read again.
        * However there is a possibility PageLive not able to persist the last response, probably because of too sort delay time.
        */

        // If there is no ref to the last response element, try to get it again
        // if (!lastGeminiResponseElement) {
        lastGeminiResponseElement = getLastResponseElement();
        // }

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
    /**
     * Open Gemini's chat menu on the side nav.
     * @param {string } chatId The id of the chat. If is an empty string will open the current active chat.
     * @return {Promise<void>}
     */
    async function openChatActionsMenu(chatId: string): Promise<void> { // FIXME currently left empty. In the future, delete of refactor other functions that uses this function.
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
            console.warn(`[PageLive][Gemini] ${msg}`);
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
            console.warn(`[PageLive][Gemini] ${msg}`);
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

    /** Delete the current chat, if possible */
    async function currentChatDelete() {
        // console.log('[PageLive][Gemini] Deleting current chat');

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

        // console.log('[PageLive][Gemini] DONE Deleting current chat');
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

        // Ensure the `chatListContainer` exist
        await ensureChatListContainerElement();
        if (!chatListContainer) return false;

        return chatListContainer.querySelector('.side-nav-opened') !== null;
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
        // Chat list is required to continue
        await ensureChatListContainerElement();
        if (!chatListContainer) return;

        // Required: Loading image to be observed
        const isLoadingElement = chatListContainer.querySelector('.loading-history-spinner-container');
        if (!isLoadingElement) {
            const msg = "Unable to find loading-history-spinner-container element";
            console.error(`[PageLive][Gemini] ${msg}`);
            window.pageLive.announce({ msg });
            return;
        }
        // Required: Scroller element that need to be scrolled down
        const scrollerElement = chatListContainer.closest('infinite-scroller');
        if (!scrollerElement) {
            const msg = "Failed to find the closest infinite-scroller element";
            console.error(`[PageLive][Gemini] ${msg}`);
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
                // Check chat list container again
                await ensureChatListContainerElement();
                if (!chatListContainer) return;

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
        // Make sure the chat list container exist
        await ensureChatListContainerElement();

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
        // The chat list container is required
        await ensureChatListContainerElement();

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
        window.pageLive.announce({ msg: "Start a new chat" });

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
     * Parse chat id from the URL path or document. Retunr empty string if not found.
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
            title += ` chat titled  "${activeChat.title}."`;
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


    // =============== Execution ===============

    // Start the process

    // Wait for the page to be ready
    const isChatContainerExist = await waitForChatContainer();

    // If the chat container is not found after waiting, log a warning and stop the observation setup
    if (!isChatContainerExist) {
        console.warn('[PageLive][Gemini] Chat container not found after waiting. Stopping observation setup.');
        return;
    }

    // References to HTML elements
    let chatInputElement: HTMLInputElement | null;

    // If this page is a saved chat, we need to wait for the chat container to be populated with the previous chat messages.
    // To ensure the chat container is ready, wait for more 3seconds before observing the chat container.
    // The wait time will be resettedwhenever there is update on the chat container (that means previous responses is still being updated).
    const DELAY_TO_START_OBSERVE_NEW_RESPONSES = 3000; // 3 seconds
    // Observer to observe if the previous chat being rendered
    let previousChatObserver: MutationObserver | null = null;

    // Use timeout to start the chat container observation after delay
    let observeNewResponsesTimeoutId = setTimeoutToStartObserveNewResponses();

    // Check if the chat container is still being populated by the previous chat. If yes, delay to start observing chat container, by replace the timeout with the new one
    observeIfPreviousChatBeingRendered();

    // New gemini responses will not be rendered wholely. It will be rendered in parts.
    // Using MutationObserver, we will know if reponses are still being added to the element.
    // After finish rendering, we will get the final response and announce it.
    // Below is the variable to point to the last element containing the Gemini responses:
    let lastGeminiResponseElement: HTMLElement | null = null;

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

    // Feed info to pageLive & pageLive.page
    window.pageLive.page.name = 'Gemini';
    // Update chat info to dialog title, even if the chat info is not yet parsed
    updateDialogWithChatInfo();
    // Initial announce info
    window.pageLive.initialAnnounceInfo.push("Gemini page");

    // Add resize event handler, to refresh references to key elements
    addWindowResizeListener();

    // Add keybind 'focus chat input'
    window.pageLive.keybindManager.registerKeybind(
        window.PageLiveStatics.KeybindManager.Keybinds.FocusChatInput,
        focusChatInput
    );
    // Add keybind 'announce last response'
    window.pageLive.keybindManager.registerKeybind(
        window.PageLiveStatics.KeybindManager.Keybinds.AnnounceLastResponse,
        announceLastResponse
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
};

// Run the adapter.
// This is a bit tricky, because we need to run this after PageLive is ready. But PageReady is waiting for the some elements exist in DOM.
// That is why when the readyState is 'loading', we need to wait for DOMContentLoaded, or run it right away if the readyState is already pass 'loading'.
if (document.readyState === 'loading') {
    // The document is still loading, so wait for DOMContentLoaded
    document.addEventListener('DOMContentLoaded', geminiAdapter);
} else {
    // The DOM is already ready, so run the adapter directly
    geminiAdapter();
}