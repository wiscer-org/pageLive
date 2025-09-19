import { inherits } from "util";

/**
 * This file contains the Gemini page adapter.
 * It is responsible for adapting the Gemini page structure to the generic page structure used by the extension.
 * This class is a the new standard for page adapters, replacing the old IIEF page adapter system.
 * @module page-adapters/gemini
 * @module page-adapters/gemini-adapter
 */
export default class GeminiAdapter {
    constructor() {

        this.init();
    }
    /**
     * @todo Implement the init function to set up the adapter.
     */
    async init() {

        // Wait for the required elements to be present in the DOM
        await this.waitForChatContainer();

        // Put observers 
        this.newResponseObserver();
    }
    /**
     * @todo Implement the waitForChatContainer function to wait for the chat container to be available in the DOM.
     */
    async waitForChatContainer() {
        // TODO complete this function
    }

    /**
     * @todo Implement the newResponseObserver function to observe for new responses in the chat container.
     */
    newResponseObserver() {
        // TODO complete this function
    }

}