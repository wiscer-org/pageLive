import PageLive from "./pagelive"

/**
* This class features interaction with the chat container element of progressive chat based page, like gemini or grok.
* Chat container is the element that wraps the series of prompts and responses of the current active chat.
* Note: A new response will not be rendered all at once, but received in streams. The UI will add / update the response segment elements.
* Below is the key terms used in this class:
* - chat container: The element that wraps all prompts and responses of the current active chat.
* - response container: The element that wraps a response element. Response container will also include buttons and other components that is not  part of the response text. This element is used to identify when a new response is incoming.
* - response element: The direct parent that wraps all the response text.
* - response segment : The element that contains a part of the response text. A response can have multiple segments, like `p`, `ul`, or etc. These segments are all on the same document hierarchy level.
*/
export default class ChatObserver {
    pl !: PageLive;
    // Ref to the chat container: containing all prompts and responses.
    // By default chat container is the direct parent of all prompt and response container elements.
    chatContainerX: HTMLElement | null = null;
    chatContainer !: HTMLElement
    newResponseContObserver: MutationObserver | null = null;
    // There are cases, like in Grok, the incoming response in not rendered to the same element as other previous responses.
    // In grok, when a new response received, the last new response is moved to the chat container like any other previous responses.
    // In this case, we need a specific ref to the last response container element. By default this should be the direct parent of each prompt / response elements.
    lastReplayContainer: HTMLElement | null = null;

    // Selector to the chat container
    // static CHAT_CONTAINER_SELECTOR = "#chat-history";
    // Selector to a response container
    // static RESPONSE_ELEMENT_NAME = 'MESSAGE-CONTENT';
    // Wait time for a 'response segment' element to be considered as fully updated by Gemini
    static SEGMENT_WAIT_SECONDS: number = 4e3; // seconds
    // Used in MutationObserver callback to identify a response container element
    isResponseContainer: (n: Node) => boolean;
    // Used to parse the response element from a response container element
    parseResponseElement: (el: HTMLElement) => HTMLElement | null;
    // Callback to be executed after the initial previous chat has been rendered
    postInitialRender: () => Promise<void>;
    // Options for observing chat container. Default not to observe subtree for performance reason.
    subtree: boolean = false;

    constructor(
        pl: PageLive
        , chatContainer: HTMLElement
        , isResponseContainer: (n: Node) => boolean
        , parseResponseElement: (el: HTMLElement) => HTMLElement | null
        , postInitialRender: () => Promise<void>
        , lastReplayContainer: HTMLElement | null = null
        , subtree: boolean = false
    ) {
        this.pl = pl;
        this.chatContainer = chatContainer;
        this.isResponseContainer = isResponseContainer;
        this.parseResponseElement = parseResponseElement;
        this.postInitialRender = postInitialRender;
        this.lastReplayContainer = lastReplayContainer;
        this.subtree = subtree;
    }

    /**
     * Wait and initialize things
     * @returns {Promise<void>}
     */
    async init(): Promise<void> {
        // Validate element ref
        if (!this.chatContainer) {
            this.pl.utils.prodWarn("[PageLive] Can not find chat container element. Now exiting - 31873");
            return;
        }
        if (this.chatContainer.isConnected === false) {
            this.pl.utils.prodWarn("[PageLive] Chat container element is not connected to document. Now exiting - 374");
            return;
        }
        this.pl.utils.devLog("[ChatObserver] Chat container element found. Now initializing..");

        // Wait until the chat history has completely rendered with the previous chat
        await this.pl.utils.untilElementIdle(this.chatContainer, 3e3); // Wait for 3 seconds of idle time
        this.pl.utils.devLog("[ChatObserver] Chat container element is now idle.");

        // Notify user that PageLive is ready and about the loaded chat history if any
        this.postInitialRender();
        this.pl.utils.devLog("[ChatObserver] Notified user if chat history has been loaded.");

        // Attach observer to chat container to detect incoming response
        await this.observeIncomingResponseContainer();
    }

    // async getKeyElements() {
    //     this.chatContainerX = await this.pl.utils.waitForAnElement(ChatObserver.CHAT_CONTAINER_SELECTOR);
    // }

    /**
     * Handler when window is resized. This function will be called by `GeminiAdapter`class.
     */
    async onWindowResized() {
        // await this.getKeyElements();
        // Re-observe chat container
        await this.init();
    }
    /**
     * Observe a container for incoming response element addition.
     * Later the new response container, will be observed by `observeIncomingResponse` function to detect incoming response segments.
     */
    observeIncomingResponseContainer() {
        // Container of response element that we are trying to catch on mutations
        let responseContainer: HTMLElement | null = null;

        // Stop observing the previous observer if any
        if (this.newResponseContObserver) {
            this.newResponseContObserver.disconnect();
            this.newResponseContObserver = null;
        }

        // Observer to 'catch' the `responseElement` that will be added during receving new response
        this.newResponseContObserver = new MutationObserver(async (mutationList, observer) => {

            // Set to null if previously found `responseContainer` is no longer connected
            if (!responseContainer?.isConnected) responseContainer = null;

            // Not yet have responseContainer ?
            if (!responseContainer || responseContainer.isConnected === false) {
                if (responseContainer?.isConnected === false) {
                    this.pl.utils.devLog("Previously found responseContainer is no longer connected. Resetting.");
                }

                // Try to catch the `responseContainer`
                for (const mutation of mutationList) {
                    if (mutation.type === "childList") {
                        for (let c = 0; c < mutation.addedNodes.length; c++) {
                            const node = mutation.addedNodes.item(c) as HTMLElement;
                            // if (this.isResponseContainerElementX(node)) {
                            if (this.isResponseContainer(node)) {
                                responseContainer = node;
                                this.pl.utils.devLog("Response container is found");
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
                this.pl.utils.devLog("[ChatObserver] Try to get responseElement within responseContainer");

                // Use selector, not by selecting on each of the `mutation.addedNodes` because the `responseElement` is a `div`without classes or id that can be used to identify.
                // The selector : `message-content > div`
                // let responseElement = responseContainer.querySelector('message-content > div') as HTMLElement;
                let responseElement = this.parseResponseElement(responseContainer);
                this.pl.utils.devLog("[ChatObserver] Response element parsed:");
                console.log(responseElement);

                // If `responseElement` is found, start observing the new response segments
                if (responseElement) {
                    this.pl.utils.devLog("[ChatObserver] Response element is found, start observing new response");
                    console.log("responseElement outerHTML");
                    console.log(responseElement.outerHTML);

                    this.observeNewResponseSegments(responseElement);
                    // Disconnect the 'response container' observer
                    observer.disconnect();  // To consider: if response container is disconnected, then this observer shouldn't be disconnected?
                }
            }
        })

        //  Type check
        if (!this.chatContainer) {
            this.pl.utils.prodWarn("Chat container element not exist - 3814");
            return;
        }

        // Which element to be observed ?
        let container = this.chatContainer
        if (this.lastReplayContainer) {
            this.pl.utils.devLog("[ChatObserver] Using last replay container to observe incoming response.");
            if (!this.lastReplayContainer.isConnected) this.pl.utils.prodWarn("[ChatObserver] Last replay container is not connected - 9284");
            else container = this.lastReplayContainer;
        }

        console.log("[ChatObserver] Observing container: ", container);

        // Observe elements addition of subtree of chat container
        this.newResponseContObserver.observe(container, {
            childList: true,
            subtree: this.subtree,
            characterData: true,
        });
    }

    /**
     * Decide if an element is a `responseContainer` element
     * @param {HTMLElement} el The element to test
     * @param {boolean} true if the element can be a `responseContainer`, false if otherwise
     */
    isResponseContainerElementX(el: HTMLElement) {
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
    async observeNewResponseSegments(responseElement: HTMLElement) {
        // The previous total of segments, before added in the mutation callback
        // let prevSegmentsCount = 0;
        let prevSegmentsCount = responseElement.children.length;
        // The index of the last announced response segment
        let lastAnnouncedSegment = -1;
        // The timeout id to announce the last remaining response segments
        // let remainingTimeoutId: ReturnType<typeof setTimeout>;
        let remainingTimeoutId: ReturnType<typeof setTimeout> | undefined = undefined;

        /**
         * 
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

                this.pl.utils.devLog(`Segments increased from ${prevSegmentsCount} to ${segmentsCount}`);

                // announce the previous not yet announced segments
                this.pl.utils.devLog(`lastAnnouncedSegment before :${lastAnnouncedSegment}`);
                lastAnnouncedSegment = await this.announceSegments(responseElement, lastAnnouncedSegment, secondLastSegmentIndex);
                this.pl.utils.devLog(`lastAnnouncedSegment after :${lastAnnouncedSegment}`);

                // Schedule to announce the remaining not-yet-announced segments
                remainingTimeoutId = this.delayAnnounceRemainingSegments(responseElement, lastAnnouncedSegment, remainingTimeoutId, observer);

                // Current count will be the prev count for next process
                prevSegmentsCount = segmentsCount;
            }

        });

        // Handle existing segments before observing new segments
        if (prevSegmentsCount > 0) {
            this.pl.utils.devLog(`[ChatObserver] Response element has ${prevSegmentsCount} existing segments before observing new segments. Announcing them first.`);
            // Schedule to announce the existing segments
            remainingTimeoutId = this.delayAnnounceRemainingSegments(responseElement, lastAnnouncedSegment, remainingTimeoutId, newResponseObserver);
        }

        // Observe
        this.pl.utils.devLog("[ChatObserver] Start observe response element");
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
        , announceTimeout: ReturnType<typeof setTimeout> | undefined
        , observer: MutationObserver) {

        // Cancel the timeout id if exist
        if (announceTimeout) clearTimeout(announceTimeout);

        return setTimeout(() => {
            const lastSegmentToAnnounce = responseElement.children.length - 1;
            this.pl.utils.devLog(`Delayed announced, from segment index ${lastAnnouncedSegment + 1} to ${lastSegmentToAnnounce} `);
            this.announceSegments(responseElement, lastAnnouncedSegment, lastSegmentToAnnounce);

            // The incoming response has been completely received
            this.onResponseComplete(observer);
        }, ChatObserver.SEGMENT_WAIT_SECONDS);
    }

    /**
     * Announce response segments
     * @param responseElement The element that wraps the response segment elements
     * @param lastAnnouncedSegment The index of the last segment elements that has been announced
     * @param lastIndex The last index of the response segment elements to be announced 
     */
    async announceSegments(responseElement: HTMLElement, lastAnnouncedSegment: number, lastIndex: number) {
        this.pl.utils.devLog("announce segment index from " + (lastAnnouncedSegment + 1) + " until " + lastIndex);
        for (let c: number = lastAnnouncedSegment + 1; c <= lastIndex; c++) {
            // Type check
            if (!responseElement.children[c]) {
                this.pl.utils.prodWarn(`Unable to find segment with index ${c}`);
                this.pl.utils.prodWarn(`response element: ${responseElement}`);
                return lastAnnouncedSegment;
            }
            const segmentElement = responseElement.children[c] as HTMLElement;
            if (!segmentElement.outerHTML) {
                this.pl.utils.prodWarn("Segment element does not have property 'outerHTML' - 4720");
                return lastAnnouncedSegment;
            }

            this.pl.utils.devLog("announcing :");
            this.pl.utils.devLog(segmentElement.textContent || '[empty segment]');
            this.pl.announce({
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
        this.observeIncomingResponseContainer();
    }


    // /**
    //  * Notify user after the previous chat history has been loaded
    //  */
    // notifyUserIfChatHistoryHasBeenLoaded() {
    //     // How many responses have been loaded ?
    //     const promptResponseElements = this.getPromptResponseElements();

    //     // Notify user
    //     if (promptResponseElements) {
    //         const total = promptResponseElements.length;

    //         if (total > 0) {
    //             let msg = `${total} responses loaded`;
    //             this.pl.announce({
    //                 msg, omitPreannounce: true
    //             });
    //         }
    //     }
    // }

    /**
     * Get the last response element from the HTML document.
     */
    // getLastResponseElement(): HTMLElement | null {
    //     // Get the last response element from the chat container
    //     // const responseElements = document.querySelectorAll(
    //     //     ChatObserver.CHAT_CONTAINER_SELECTOR + ' ' + ChatObserver.RESPONSE_ELEMENT_NAME
    //     // );
    //     const responseElements = this.getLastResponseElement();

    //     if (responseElements.length > 0) {
    //         return responseElements[responseElements.length - 1] as HTMLElement;
    //     }
    //     return null;
    // }

}