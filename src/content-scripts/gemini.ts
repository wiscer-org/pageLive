// gemini.ts - Injected only on gemini.google.com

export { }; // Make this file a module to allow global augmentation.Used to declare global types, like `window.pageLiveAnnounce`;
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
        // Every time a new node is added to the chat container, we reschedule the observatio (for current chat) timeout.
        previousChatObserver = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.addedNodes.length > 0) {
                    console.log('[PageLive][Gemini] Previous chat is being rendered, rescheduling observation timeout');
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
        // console.log(`[PageLive][Gemini] Starting to observe ${CHAT_CONTAINER_SELECTOR} for Gemini responses`);

        // Remove the previous chat observer if it exists
        if (previousChatObserver) {
            previousChatObserver.disconnect();
            previousChatObserver = null;
        }

        const geminiObserver = new MutationObserver((mutations) => {
            // Iterate through each mutation
            for (const mutation of mutations) {

                mutation.addedNodes.forEach((node) => {
                    // Log the added node for debugging
                    // console.log('[PageLive][Gemini] Added node:', node);
                    // console.log('[PageLive][Gemini] Added node name:', node.nodeName);

                    // FIXME currently add all textContent for testing purposes
                    if (node instanceof HTMLElement && node.textContent !== '') {
                        // window.pageLive2a2b.announce({ msg: node.textContent || '' });
                    }

                    // if (node instanceof HTMLElement && node.nodeName === 'MODEL-RESPONSE') {
                    if (node instanceof HTMLElement && node.nodeName === 'MESSAGE-CONTENT') {

                        // Set the latest Gemini response element
                        lastGeminiResponseElement = node;
                        announceWithDelay("parulian", 1000); // Announce with a delay of 1 second

                        // FIXME
                        // node.setAttribute('aria-live', 'polite');

                        const responseText = node.textContent || '';
                        console.log('[PageLive][Gemini] New Gemini response:', responseText);
                        console.log(node);
                        // Announce the new Gemini response using the global pageLiveAnnounce function
                        if (window.pageLive2a2b && typeof window.pageLive2a2b.announce === 'function') {
                            // FIXME: currently commented for testing purposes
                            // window.pageLive2a2b.announce({ msg: responseText });

                            // announceWithDelay(responseText); // Announce with a delay of 1 second
                        } else {
                            console.warn('[PageLive][Gemini] pageLive2a2b.announce function not found on window.');
                        }
                    }
                });
            }
        });

        // Verify the chatContainer is available to satify TS 
        if (!chatContainer) {
            console.warn('[PageLive][Gemini] Chat container not found. Stopping observation setup.');
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
     * When the timeout is reached, it will execute announce(msg).
     */
    let announceTimeoutId: ReturnType<typeof setTimeout> | null = null;
    function announceWithDelay(msg: string, delay = 1000) {
        if (announceTimeoutId) {
            clearTimeout(announceTimeoutId);
        }
        announceTimeoutId = setTimeout(() => {
            console.log("abou to announce with timeout");
            if (window.pageLive2a2b && typeof window.pageLive2a2b.announce === 'function') {
                // window.pageLive2a2b.announce({ msg });

                console.log('last gemni response element:', lastGeminiResponseElement);

                if (lastGeminiResponseElement) {
                    window.pageLive2a2b.announce({
                        msg: lastGeminiResponseElement.textContent || ''
                    });
                }
            } else {
                console.warn('[PageLive][Gemini] pageLive2a2b.announce function not found on window.');
            }
        }, delay);
    }

    // Start the process 

    // Wait for the page to be ready
    const isChatContainerExist = await waitForChatContainer();

    // If the chat container is not found after waiting, log a warning and stop the observation setup
    if (!isChatContainerExist) {
        console.warn('[PageLive][Gemini] Chat container not found after waiting. Stopping observation setup.');
        return;
    }

    // If this page is a saved conversation, we need to wait for the chat container to be populated with the previous chat messages.
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

    // console.log('[PageLive][Gemini] end of gemini.ts script execution');
})();


