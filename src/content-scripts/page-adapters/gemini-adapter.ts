import { devLog, untilElementIdle } from "../util";
import GeminiAdapterChat from "./gemini-chat";

/**
 * This file contains the Gemini page adapter.
 * It is responsible for adapting the Gemini page structure to the generic page structure used by the extension.
 * This class is a the new standard for page adapters, replacing the old IIEF page adapter system.
 * All functions related to handling the active chat, especially incoming new response, will be handled by `GeminiAdapterChat` class
 * 
 * @module page-adapters/gemini
 * @module page-adapters/gemini-adapter
 * @module page-adapters/gemini-chat
 */
export default class GeminiAdapter {
    // Not yet used: Container for side nav.
    static SIDE_NAV_CONTAINER_SELECTOR = "xxx";
    sideNavContainer: HTMLElement | null = null;

    // Object focused with the interaction with chat container element
    chatContainerAdapter = new GeminiAdapterChat();

    constructor() {
        this.init();
    }

    /**
     * Implement the init function to set up the adapter.
     */
    async init() {

        // Wait for the required elements to be present in the DOM
        await this.waitOrUpdateKeyElementsRef();

        // Add window resize listener, which will update the key element references too
        await this.addWindowResizeListener();

        this.chatContainerAdapter.init();

        // Unexplained: Without the console.log, does not matter what the string is, the Developer Tool's console will output series of "[PageLive][dev] [Object object]".
        // To log out something  will remove those logs. Any `console.log` in page adaper will has the same effect.
        // Maybe it's related to the browser's lifecycle. Maybe `console.log` will suspend on something.
        // To reproduce, comment the `console.log` below.
        // Console log below also could be used as log for dev purposes.
        devLog("Gemini adapter is ready");
    }
    /**
     * This function to requery the 'persisted' elements, such as `chatListContainer`.
     * Note: On window resize, some references to the 'persisted' element refs seems invalid, thus the feature is not working.
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

                // Also update the chat adapter
                this.chatContainerAdapter.onWindowResized();
            }, DEBOUNCE_DELAY);
        });
    }

    /**
     * Set or update references to the key elements
     */
    async waitOrUpdateKeyElementsRef(): Promise<void> {
        // await this.waitForChatContainer();
        await this.waitForSideNavContainer();
    }

    /**
     * Wait and update the ref to {@link sideNavContainer} element
     * @todo Finish this function
     */
    async waitForSideNavContainer(): Promise<void> {
        // TODO
    }

}