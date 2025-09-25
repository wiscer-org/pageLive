import { devLog, prodWarn, untilElementIdle, waitForAnElement } from "../util";
/**
 * This class features interaction with the chat container element of gemini page.
 * Chat container is the element that wraps the series of prompts and responses of the current active chat.
 * Note: A new response will not be rendered all at once, but received in streams. The gemini UI will add / update the response segment elements.
 */
export default class GeminiAdapterChat {
    // Ref to the chat container: containing all prompts and responses 
    chatContainer: HTMLElement | null = null;
    // Ref to an element to currently receiving responses.
    // Note: A response is wrapped in an element, let's call it `response`. 
    // When gemini UI receiving a response, the `response` element will be inserted with 'response-segment` e.g.: <p>, <ol>, etc.
    // Below is the ref to a `response` element that currently receiving a response. After finish receiving response, this ref will be set to `null`
    currentResponse: HTMLElement | null = null;
    // Wait time for a 'response segment' element to be considered as fully updated by Gemini
    static SEGMENT_WAIT_SECONDS: number = 4e3; // seconds

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
        // Container of response element that we are trying to catch on mutations
        let responseContainer: HTMLElement | null = null;
        // Response element: The direct parent of response segment elements
        // let responseElement: HTMLElement | null = null;

        // Observer to 'catch' the `responseElement` that will be added during receving new response
        const responseContainerObserver = new MutationObserver((mutationList, observer) => {

            // Not yet have responseContainer ?
            if (!responseContainer) {
                // Try to catch the `responseContainer`
                for (const mutation of mutationList) {
                    devLog("try to get responseContainer")
                    if (mutation.type === "childList") {

                        for (let c = 0; c < mutation.addedNodes.length; c++) {
                            responseContainer = mutation.addedNodes.item(c) as HTMLElement;
                            if (this.isResponseContainerElement(responseContainer)) {
                                devLog("Response container is found");
                                break;
                            }
                        }
                    }
                }
            }

            // Try to query `responseElement` within the `responseContainer`
            if (responseContainer) {
                // Use selector, not by selecting on each of the `mutation.addedNodes` because the `responseElement` is a `div`without classes or id that can be used to identify.
                // The selector : `message-content > div`
                let responseElement = responseContainer.querySelector('message-content > div') as HTMLElement;

                // If `responseElement` is found, start observing the incoming response segments
                if (responseElement) {
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
        responseContainerObserver.observe(this.chatContainer, {
            childList: true,
            subtree: true,
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
        const newResponseObserver = new MutationObserver((mutationList, observer) => {
            const segmentsCount = responseElement.children.length;

            // Is total segments increased ?
            if (prevSegmentsCount < segmentsCount) {

                // TODO announce the previous not yet announced segments

                // Schedule to announce the remaining not-yet-announced segments
                remainingTimeoutId = this.delayAnnounceRemainingSegments(responseElement, lastAnnouncedSegment, remainingTimeoutId, observer);

                // Current count will be the prev count for next process
                prevSegmentsCount = segmentsCount;
            }

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
            this.announceSegments(responseElement, lastAnnouncedSegment, responseElement.children.length - 1);

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
    announceSegments(responseElement: HTMLElement, lastAnnouncedSegment: number, lastIndex: number) {
        for (let c: number = lastAnnouncedSegment + 1; c <= lastAnnouncedSegment; c++) {
            // Type check
            if (!responseElement.children[c]) {
                prodWarn(`Unablet to find segment with index ${c}`);
                prodWarn(`response element: ${responseElement}`);
                return;
            }
            const segmentElement = responseElement.children[c] as HTMLElement;
            if (!segmentElement.outerHTML) {
                prodWarn("Segment element does not have property 'outerHTML' - 4720");
                return;
            }

            window.pageLive.announce({
                msg: segmentElement.outerHTML
                , omitPreannounce: true
            });
        }
    }
    /**
     * Handler when a response is completely received
     * @param {MutationObserver} newResponseObserver The observer for the incoming new response
     */
    async onResponseComplete(newResponseObserver: MutationObserver) {
        // TODO reset variables

        // Disconnect 'new response observer'
        newResponseObserver.disconnect();

        // Observe chat container again
        this.observeChatContainer();
    }

}


// Below is note about how to announce an incoming new response:
// 
// Problem:
// An incoming new response is not fully rendered, but in streams. 
// The previous solution is to wait until not more mutations happened in the 'chat container', which will make the user's wait time is longer before each new response is read.
// 
// Objective:
// Announce each response segment right away once it fully rendered. For the last segment, it will be announced with a delay after no more mutations happened.
// 
// Condition:
// A 'response segment' is all first children element of a response element, e.g.: <p>, <ul>, etc.
// A 'response element' is the direct parent of `responseSegments` of a response. Basically it only contains the whole text received as a response.
// A 'response element' could be queried with selector 'message-content'.
// A 'response container' is an HTML element that wraps all elements related to a response, including `responseElement`, buttons, etc.
// A 'response container' could be 'catch' when the element is added to the `chatContainer` element.
//
// Strategy:
// - Observe the `chatContainer` element to catch if a new `responseContainer` is added by mutation.
//  `responseContainer` does not have to be a specific element. It just has to contain the new 'response element'.
// - After `responseContainer` is caught, query for `responseElement` on every mutations.
// The reason for querying instead of 'catching' the node, is that the `respone element` does not have unique tag name, id, or classes to be used to catch the element.
// - After `responseElement` is exits. Start observing the `responseElement` and stop observing `chatContainer`.
// The reason to start another observer, the one that focused on `responseElement`, is for performance reason. 
// So we do not need to count whether a segment has beend added or not on every mutations. Consider there will be a lot of element mutations happenning during receiving new response.
// - Every time a segment 'n' is added, announce right away the segments before the last one, schedule to announce the segment 'n' after some delay, and cancel the previously set timeout.
// We can set the delay a bit long, like 4 seconds. It will not increase user's wait time since screen reader need to read the earlier segments first. 
// It will only effect response that has only 1 segment.


// Below is a part of the hierarchy of chat container to used to parse a response in this file :
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

