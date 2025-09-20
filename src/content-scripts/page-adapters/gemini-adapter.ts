import { untilElementIdle } from "../util";

/**
 * This file contains the Gemini page adapter.
 * It is responsible for adapting the Gemini page structure to the generic page structure used by the extension.
 * This class is a the new standard for page adapters, replacing the old IIEF page adapter system.
 * @module page-adapters/gemini
 * @module page-adapters/gemini-adapter
 */
export default class GeminiAdapter {
    // If this page is a saved chat, we need to wait for the chat container to be populated with the previous chat messages.
    // To ensure the chat container is ready, wait for more 3seconds before observing the chat container.
    // The wait time will be resettedwhenever there is update on the chat container (that means previous responses is still being updated).
    static DELAY_TO_START_OBSERVE_NEW_RESPONSES = 3000; // 3 seconds

    // Container for the active chat, contains prompts and responses
    static CHAT_CONTAINER_SELECTOR = "#chat-history";
    chatContainer: HTMLElement | null = null;

    // Not yet used: Container for side nav.
    static SIDE_NAV_CONTAINER_SELECTOR = "xxx";
    sideNavContainer: HTMLElement | null = null;

    // Element name for Gemini response
    // const RESPONSE_ELEMENT_NAME = 'MESSAGE-CONTENT';


    constructor() {

        this.init();
    }
    /**
     * @todo Implement the init function to set up the adapter.
     */
    async init() {

        // Wait for the required elements to be present in the DOM
        await this.waitOrUpdateKeyElementsRef();

        // Add window resize listener, which will update the key element references too
        await this.addWindowResizeListener();

        // Wait until idle, chat history might being updated with previous chat history
        await this.untilChatHistoryIdle();

        window.pageLive.announce({ msg: "Version 2: finish loading chat history" });
        console.log('FINISH loading chat history');

        // Observe chat container for incoming new responses
        this.observeNewResponses();
    }
    /**
     * This function to requery the 'persisted' elements, such as `chatListContainer`.
     * Note: On window resize, references to 'persisted' elements seems invalid, thus the feature is not working.
     * For instance, after resized, the function `getActiveChatMenuButton` can not find the button. However it does not raise any error message.
     * That's why the references need to be updated.
     * The event handler set below will be debounced.
     */
    async addWindowResizeListener() {
        // The timer id. We will debounce the event handler to avoid rapid execution during window resizing.
        let resizeTimer: ReturnType<typeof setTimeout>;
        const DEBOUNCE_DELAY = 300;

        window.addEventListener('resize', () => {
            // Clear the previous timer (if it exists)
            clearTimeout(resizeTimer);

            // Set a new timer
            resizeTimer = setTimeout(async () => {
                await this.waitOrUpdateKeyElementsRef();
            }, DEBOUNCE_DELAY);
        });
    }

    /**
     * Set or update references to the key elements
     */
    async waitOrUpdateKeyElementsRef(): Promise<void> {
        await this.waitForChatContainer();
        await this.waitForSideNavContainer();
    }

    /**
     * Wait for the chat container to be available
     * This is necessary because the chat container may not be immediately available on page load.
     * It will wait for up to 10 seconds before giving up.
     * @returns {Promise<boolean>} - Returns true if the page is ready for PageLive to continue, false otherwise.
     */
    async waitForChatContainer(): Promise<boolean> {
        const MAX_WAIT_TIME = 60e3; // 60 seconds
        // Incremental interval
        let interval = 200;
        let waited = 0;

        while (!this.chatContainer && waited < MAX_WAIT_TIME) {
            await new Promise(res => setTimeout(res, interval));
            waited += interval;

            // increase interval to reduce number of loops
            interval = Math.min(interval + 100, 3000); // Cap the interval to a maximum of 3 seconds

            this.chatContainer = document.querySelector(GeminiAdapter.CHAT_CONTAINER_SELECTOR) as HTMLElement | null;
        }
        return !!this.chatContainer
    }

    /**
     * Wait and update the ref to {@link sideNavContainer} element
     * @todo Finish this function
     */
    async waitForSideNavContainer(): Promise<void> {
        // TODO
    }

    /**
     * Wait until chat container element is idle.
     */
    async untilChatHistoryIdle(): Promise<void> {
        // Make sure the element exist
        if (!this.chatContainer) {
            console.warn("[PageLive][Gemini]Chat container not exits");
            return;
        }

        return untilElementIdle(this.chatContainer);
    }

    /**
     * Observe new responses in the chat container and accounce per response segment to {@link PageLive.announce}
     * Response segments are direct children of the response / message element, usually <p>, <ul>, <ol>, etc.
     * Keep in mind that a response is not rendered all at once but streamed in.
     * 
     * This function will include several logical steps:
     * 1. Set observer to the chat container and wait for the incoming of the parent of new response / message content element.
     * That parent element is used to `querySelector` the message-content element. 
     * We do not directly catch the node name of the message-content element because the element selector is 'message-content > div'.
     * It will be hard to 'catch' the element with the 'div' as node name. Also that 'div' could be added in mutation as child of one of the `addedNodes`.
     * 2. On every observer callback, check if message-content element exists using `messageContentParentElement.querySelector('message-content > div)`.
     * 3. Once message content element is detected, saved the reference to `lastMessageContentElement`.
     * 4. Every time mutation to chat history element happens, check the number of response segments inside the message content element.
     * 5. If the number of response segments is one, mark `receivingResponseStarted` to true.
     * 6. If the number of response segments is more than one, announce the (n-1)th segment.
     * 7. Every time the message content element is mutated, create timeout, with short delay, to execute {@link onResponseUpdateComplete} 
     * and remove the previous timeout. The delay is short, assuming the time gap from one response update to the next one is small.
     * This delay is much shorter from the expected time between prompt and first response stream, due to processing in the server side.
     * 
     */
    async observeNewResponses() {

    }
    /**
     * This function will be executed when the new response update is complete.
     */
    onResponseUpdateComplete() {

    }

}