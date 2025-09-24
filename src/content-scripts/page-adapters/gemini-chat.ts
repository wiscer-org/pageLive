
// Below a part of the hierarchy of chat container to used to parse a response in this file :
//div#chat-history
//	infinite-scroller [data-test-id="chat-history-container"]
//		div.conversation-container
//	    div.conversation-container
//			user-query
//			model-response
//				div
//					response-container
//						div.response-container
//							div.response-container-header
//								div.response-container-header-controls
//								div.response-container-header-status
//							div.presented-response-container
//								div.avatar-gutter
//								div.response-container-content
//									div.response-content
//										message-content#message-content-id-r_d1657b4a1ad3e5b2.model-response-text



import { untilElementIdle, waitForAnElement } from "../util";
/**
 * This class features interaction with the chat container element of gemini page.
 * Chat container is the element that wraps the series of prompts and responses of the current active chat.
 * Note: A new response will not be rendered all at once, but received in streams. The gemini UI will add / update the response segment elements.
 */
export class GeminiAdapterChat {
    // Ref to the chat container: containing all prompts and responses 
    chatContainer: HTMLElement | null = null;
    // Ref to an element to currently receiving responses.
    // Note: A response is wrapped in an element, let's call it `response`. 
    // When gemini UI receiving a response, the `response` element will be inserted with 'response-segment` e.g.: <p>, <ol>, etc.
    // Below is the ref to a `response` element that currently receiving a response. After finish receiving response, this ref will be set to `null`
    currentResponse: HTMLElement | null = null;
    // Wait time for a 'response segment' element to be considered as fully updated by Gemini
    SEGMENT_WAIT_TIME = 4e3; // in seconds

    constructor() { }
    /**
     * Wait and initialize things
     * @returns 
     */
    async init(): Promise<void> {
        // Set element refs
        await this.updateElementRefs();
        // Attach `window resized` handler. After window is resized the HTML elements will be rendered so we need to update the HTML element references
        await this.onWindowResized();

        // Validate element ref
        if (!this.chatContainer) {
            console.warn("[PageLive] Can not find chat container element. Now exiting - 31873");
            return;
        }

        // Wait until the chat history has completely rendered with the previous chat
        await untilElementIdle(this.chatContainer);

        // Attach observer to chat container to detect incoming response
        await this.observeChatContainer();
    }
    async updateElementRefs() {
        this.chatContainer = await waitForAnElement("#chat-history");
    }
    /**
     * Handler when window is resized. This function will be called by `GeminiAdapter`class.
     */
    async onWindowResized() {
        await this.updateElementRefs();
    }
    observeChatContainer() {
        throw new Error("Method not implemented.");
    }
    /**
     * Observation on a response element.
     * This function is used to detect and announce of the incoming response segments.    
     * @param {HTMLElement} responseElement The Element containing response segment elements.
     */
    async observeResponseElement(responseElement: HTMLElement | null) {

    }
    /**
     * Handler when a response is completely received
     */
    async onResponseComplete() {
        // TODO reset variables

        // Observe chat container again
        await this.observeChatContainer();
    }

}