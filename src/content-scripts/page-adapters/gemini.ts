// gemini.ts - Injected only on gemini.google.com

import { Keybinds } from "./keybind-manager";

/**
 * Note about how the process after gemini page is loaded.
 * - Need for the chat container to be rendered 
 * - If any, the page will rendered the previous prompts and responses. Funtion below will set observer to wait for the whole previous chat being rendered in the chat container. 
 * - After observing for the previous chat, function below will start new observer for new Gemini responses.
 * - The new incoming response will not be a whole complete text. It will streamlined in part of the text. Function below will set new observer to wait for the whole response being rendered..
 * - Everytime a chunk of response is added to the response element, it will be announced, but with a delay, and cancel the previous announce timeout. 
 * - After reaching the timeout, the content of the response element will be announced.
 */
(async () => {
    const CHAT_CONTAINER_SELECTOR = "#chat-history";

    // Element name for Gemini response
    const RESPONSE_ELEMENT_NAME = 'MESSAGE-CONTENT';

    let chatContainer = document.querySelector(CHAT_CONTAINER_SELECTOR) as HTMLElement | null;

    /**
     * Wait for the chat container to be available
     * This is necessary because the chat container may not be immediately available on page load.
     * It will wait for up to 10 seconds before giving up.
     * @returns {Promise<boolean>} - Returns true if the page is ready for PageLive to continue, false otherwise.
     */
    async function waitForChatContainer(): Promise<boolean> {
        const MAX_WAIT_TIME = 10000; // 10 seconds
        const INTERVAL = 200;
        let waited = 0;

        while (!chatContainer && waited < MAX_WAIT_TIME) {
            await new Promise(res => setTimeout(res, INTERVAL));
            waited += INTERVAL;

            chatContainer = document.querySelector(CHAT_CONTAINER_SELECTOR) as HTMLElement | null;
        }
        return !!chatContainer
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
    function announceWithDelay(delay = 2000) {
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
                console.log(window.pageLive);
                console.log(window.pageLive.announce);
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

        // If there is no ref to the last response element, try to get it again
        if (!lastGeminiResponseElement) {
            lastGeminiResponseElement = getLastResponseElement()
        }

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

    // Feed info to pageLive & pageLive.page
    window.pageLive.page.name = 'Gemini';
    // TODO Should feed info abut whether  the page is a saved chat or not.. If  it is a saved chat, mention the title
    window.pageLive.initialAnnounceInfo.push("Gemini page");

    // FIXME Snapshot info below is temporary, need to be replaced with the actual snapshot info
    window.pageLive.dialogManager.setSnapshotInfos([
        "This is a Gemini page.",
        "The feature to read number of previous chat is still on progress.",
    ]);



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

})();





