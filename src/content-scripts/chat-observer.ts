import PageLive from "./pagelive"

/**
* This class features interaction with the chat container element of progressive chat based page, like gemini or grok.
* Chat container is the element that wraps the series of prompts and responses of the current active chat.
* Note: A new response will not be rendered all at once, but received in streams. The UI will add / update the response segment elements.
* Below is the key terms used in this class:
* - chat container: The element that directly wraps all prompts and responses of the current active chat.
* - response container: The element that wraps a response element. Response container could also include buttons and other components that is not  part of the response text. This element is used to identify when a new response is received.
* - response element: The direct parent that wraps all the response segments.
* - response segment : The element that contains a part of the response text. A response can have multiple segments, like `p`, `ul`, or etc. These segments are all on the same document hierarchy level.
* 
* Note about `initialRender`: 
* When the chat page is loaded, there could be previous chat history rendered. This class will wait until the chat container is idle (no more DOM updates) before executing `postInitialRender` callback.
* `initialRender` is useul when the page adapter using this class needs to process or announce the previous chat history.
* We need to consider when user change between different chats, the chat container will be updated with the new chat history. 
* We should be able to detect this change and execute `connect` function again to do process from beginning.
* We do not need to consider when switching to or from empty chat, since empty chat should executed `disconnect` function.
*/
export default class ChatObserver {
    pl !: PageLive;
    // Ref to the chat container: containing all prompts and responses.
    // By default chat container is the direct parent of all prompt and response container elements.
    chatContainer: HTMLElement | null = null;
    newResponseContObserver: MutationObserver | null = null;
    responseSegmentsObserver: MutationObserver | null = null;
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
        , isResponseContainer: (n: Node) => boolean
        , parseResponseElement: (el: HTMLElement) => HTMLElement | null
        , postInitialRender: () => Promise<void>
        , subtree: boolean = false
    ) {
        this.pl = pl;
        this.isResponseContainer = isResponseContainer;
        this.parseResponseElement = parseResponseElement;
        this.postInitialRender = postInitialRender;
        this.subtree = subtree;
    }

    /**
     * Connect, or re-connect the chat observer
     * @param chatContainer Closest parent of all previous prompts and responses, in some cases excluding the newest prompt/response
     * @param lastReplayContainer In some cases, the newest prompt/response is rendered to a different container than the previous prompts/responses. This parameter is the closest parent of the newest prompt/response.
     * @returns {Promise<void>}
     */
    async connect(
        chatContainer: HTMLElement | null
        , lastReplayContainer: HTMLElement | null
    ): Promise<void> {
        this.chatContainer = chatContainer;
        this.lastReplayContainer = lastReplayContainer;

        this.pl.utils.devLog("[ChatObserver] Connecting...");

        // Validate element ref
        if (!this.chatContainer) {
            this.pl.utils.prodWarn("[ChatObserver] Cannot find chat container element. Connection failed - 823");
            this.disconnect();
            return;
        }
        if (this.chatContainer.isConnected === false) {
            this.pl.utils.prodWarn("[ChatObserver] Chat container element is not connected to document. Connection failed - 374");
            this.disconnect();
            return;
        }
        // If last replay container is provided, validate it 
        if (this.lastReplayContainer && !this.lastReplayContainer.isConnected) {
            this.pl.utils.prodWarn("[ChatObserver] Last replay container element is not connected to document. - 925");
            this.disconnect();
            return;
        }

        // Wait until the chat history has completely rendered with the previous chat
        await this.pl.utils.untilElementIdle(this.chatContainer, 3e3); // Wait for 3 seconds of idle time
        this.pl.utils.devLog("[ChatObserver] Chat container is now idle.");

        await this.waitForInitialRender();

        // Attach observer to chat container to detect incoming response
        await this.observeNewResponseContainer();

        this.pl.utils.devLog("[ChatObserver] Connected to chat container successfully.");
    }
    /**
     * Detect initial render of previous chat history. If detected, wait until finish rendering.
     * Few chat switch that may happen:
     * - From empty chat to chat with previous history
     * - From chat with previous history to empty chat
     * - From chat with previous history to another chat with different previous history
     * Initial render is detected when there are nodes added and removed in the chat container.
     */
    async detectInitialRender() {
        let anyNodesAdded = false;
        let anyNodesRemoved = false;

        const initialRenderObserver = new MutationObserver((mutations, observer) => {
            for (const mutation of mutations) {
                if (mutation.type === "childList") {
                    if (mutation.addedNodes.length > 0) anyNodesAdded = true;
                    if (mutation.removedNodes.length > 0) anyNodesRemoved = true;
                }
                // If any nodes added and removed, that means there is an initial render
                if (anyNodesAdded && anyNodesRemoved) {
                    this.pl.utils.devLog("[ChatObserver] Initial render detected.");
                    // Stop observing
                    observer.disconnect();
                    // Wait until finish rendering
                    this.waitForInitialRender();
                    break;
                }
            }
        });
        this.chatContainer && initialRenderObserver.observe(this.chatContainer, {
            childList: true,
            subtree: this.subtree,
        });
    }
    /**
     * Wait until finish rendering previous chat history
     */
    async waitForInitialRender() {
        this.pl.utils.devLog("[ChatObserver] Waiting for initial render to complete...");
        // Wait until chat container is idle
        if (this.chatContainer) {
            await this.pl.utils.untilElementIdle(this.chatContainer, 2e3); // Wait for 3 seconds of idle time
        }
        this.pl.utils.devLog("[ChatObserver] Initial render completed.");
        // Execute post initial render callback
        this.postInitialRender();
        // Start detecting for next initial render
        this.detectInitialRender();
    }
    /**
    * Stop all observers and other processes. 
    * This function is used when ref to chat container is no longer valid.
    */
    disconnect() {
        this.pl.utils.devLog("[ChatObserver] Disconnecting...");
        this.chatContainer = null;
        this.lastReplayContainer = null;
        this.newResponseContObserver?.disconnect();
        this.responseSegmentsObserver?.disconnect();
    }
    isConnected() {
        return this.chatContainer !== null;
    }
    /**
     * Observe a container for incoming response element addition.
     * Later the new response container, will be observed by `observeIncomingResponse` function to detect incoming response segments.
     */
    observeNewResponseContainer() {
        // Container of response element that we are trying to catch on mutations
        let responseContainer: HTMLElement | null = null;

        // Stop observing the previous observer if any
        if (this.newResponseContObserver) {
            this.newResponseContObserver.disconnect();
            this.newResponseContObserver = null;
        }

        // Observer to 'catch' the `responseElement` that will be added during receving new response
        this.newResponseContObserver = new MutationObserver(async (mutationList, observer) => {
            console.log("[ChatObserver] Mutation detected for new response container.");
            console.log(`[ChatObserver] number of children :`, this.chatContainer?.children.length);
            for (const mutation of mutationList) {
                if (mutation.type === "childList") {
                    console.log(`[ChatObserver] Added nodes:`, mutation.addedNodes.length);
                    console.log(`[ChatObserver] Removed nodes:`, mutation.removedNodes.length);
                }
            }

            // Validate key elements
            if (!this.validate().all()) {
                this.pl.utils.prodWarn("[ChatObserver] Key elements are no longer connected. Stopping observing incoming response container - 9282");
                this.disconnect();
                return;
            }

            // Set to null if previously found `responseContainer` is no longer connected
            if (!responseContainer?.isConnected) responseContainer = null;

            // Not yet have responseContainer ?
            if (!responseContainer || responseContainer.isConnected === false) {
                if (responseContainer?.isConnected === false) {
                    this.pl.utils.devLog("[ChatObserver] Previously found responseContainer is no longer connected. Resetting.");
                }

                // Try to catch the `responseContainer`
                for (const mutation of mutationList) {
                    if (mutation.type === "childList") {
                        for (let c = 0; c < mutation.addedNodes.length; c++) {
                            const node = mutation.addedNodes.item(c) as HTMLElement;
                            if (this.isResponseContainer(node)) {
                                responseContainer = node;
                                this.pl.utils.devLog("[ChatObserver] Response container is found");
                                break;
                            }
                        }
                    }
                    // Stop loop if `responseContainer` is found
                    if (responseContainer) break;
                }
            }

            // Try to query `responseElement` within the `responseContainer`
            if (responseContainer) {
                this.pl.utils.devLog("[ChatObserver] Try to get responseElement within responseContainer");

                // Parse the response element. Note: responseElement is the direct parent of the response segments
                let responseElement = this.parseResponseElement(responseContainer);
                // this.pl.utils.devLog("[ChatObserver] Response element parsed:");
                // console.log(responseElement);

                // If `responseElement` is found, start observing the new response segments
                if (responseElement) {
                    this.pl.utils.devLog("[ChatObserver] Response element is found, start observing new response");

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

        // In Grok case, the new prompt & response is rendered under the specific element - not directly under the chat container.
        // If provided, observe that specific element instead of the chat container.
        let container = this.chatContainer;
        if (this.lastReplayContainer) {
            this.pl.utils.devLog("[ChatObserver] Using element, that is not chat container, to observe incoming response.");
            if (!this.lastReplayContainer.isConnected) this.pl.utils.prodWarn("[ChatObserver] Last replay container is not connected - 9284");
            else container = this.lastReplayContainer;
        }

        // Observe elements addition of subtree of chat container
        this.newResponseContObserver.observe(container, {
            childList: true,
            subtree: this.subtree,
            characterData: true,
        });
    }

    /**
     * Observation on a response element.
     * This function is used to detect and announce of the incoming response segments.    
     * @param {HTMLElement} responseElement The Element containing response segment elements.
     */
    async observeNewResponseSegments(responseElement: HTMLElement) {
        // The previous total of segments, before added in the mutation callback
        let prevSegmentsCount = responseElement.children.length;
        // The index of the last announced response segment
        let lastAnnouncedSegment = -1;
        // The timeout id to announce the last remaining response segments
        let remainingTimeoutId: ReturnType<typeof setTimeout> | undefined = undefined;

        /**
         * 
         * Observer to handle response segment addition / update.
         * Everytime a response segment is added, 2 things will happen:
         * 1. Announce all segments before the last one, that has not been announced.
         * 2. Set timeout to announce the remaining of the response segments, that has not been announced.
         */
        this.responseSegmentsObserver = new MutationObserver(async (mutationList, responseSegmentsObserver) => {
            // Validate response element
            if (!responseElement.isConnected) {
                this.pl.utils.prodWarn("[ChatObserver] Response element is no longer connected. Stopping observing new response segments - 9283");
                this.onResponseComplete(responseSegmentsObserver);
                return;
            }

            // Is total segments increased ?
            const segmentsCount = responseElement.children.length;
            if (prevSegmentsCount < segmentsCount) {
                // Note: Number of segments can increase more than 1 on 1 callback. On a found case 2 segments added at once.
                // Assuming the Single Page App only updating the last segment, we can announce right away the n-1 segments.
                // For example, if 2 segments added at once the earlier segment is instantly announced and the later will be announce with delay.
                // So the last segment to be announced is the second last
                const secondLastSegmentIndex = segmentsCount - 2; // -2 because this is an index of the second last

                this.pl.utils.devLog(`[ChatObserver] Segments increased from ${prevSegmentsCount} to ${segmentsCount}`);

                // announce the previous not yet announced segments
                this.pl.utils.devLog(`[ChatObserver] lastAnnouncedSegment before :${lastAnnouncedSegment}`);
                lastAnnouncedSegment = await this.announceSegments(responseElement, lastAnnouncedSegment, secondLastSegmentIndex);
                this.pl.utils.devLog(`[ChatObserver] lastAnnouncedSegment after :${lastAnnouncedSegment}`);

                // Schedule to announce the remaining not-yet-announced segments
                remainingTimeoutId = this.delayAnnounceRemainingSegments(responseElement, lastAnnouncedSegment, remainingTimeoutId, responseSegmentsObserver);

                // Current count will be the prev count for next process
                prevSegmentsCount = segmentsCount;
            }
        });

        // Handle existing segments before observing new segments
        this.pl.utils.devLog(`[ChatObserver] Response element has ${prevSegmentsCount} existing segments before observing new segments.`);
        if (prevSegmentsCount > 0) {
            // Announce now all segments excluding the last one
            this.announceSegments(responseElement, lastAnnouncedSegment, prevSegmentsCount - 2);
            // Schedule to announce the last segment.
            remainingTimeoutId = this.delayAnnounceRemainingSegments(responseElement, prevSegmentsCount - 2, remainingTimeoutId, this.responseSegmentsObserver);
        }

        // Observe
        this.pl.utils.devLog("[ChatObserver] Start observe response element");
        this.responseSegmentsObserver.observe(responseElement, {
            childList: true,
        });
    }

    /**
     * Schedule to announce the remaining not-yet-announced response segments
     * @param {HTMLElement} responseElement The direct parent of the response segment elements
     * @param {number} lastAnnouncedSegment The index of the last announced segment
     * @param {MutationObserver} responseSegmentsObserver The mutation observer to disconnect at the end of receiving response
     */
    delayAnnounceRemainingSegments(responseElement: HTMLElement, lastAnnouncedSegment: number
        , announceTimeout: ReturnType<typeof setTimeout> | undefined
        , responseSegmentsObserver: MutationObserver) {

        // Cancel the timeout id if exist
        if (announceTimeout) clearTimeout(announceTimeout);

        return setTimeout(() => {
            const lastSegmentToAnnounce = responseElement.children.length - 1;
            this.pl.utils.devLog(`[ChatObserver] Delayed announced, from segment index ${lastAnnouncedSegment + 1} to ${lastSegmentToAnnounce} `);
            this.announceSegments(responseElement, lastAnnouncedSegment, lastSegmentToAnnounce);

            // The incoming response has been completely received
            this.onResponseComplete(responseSegmentsObserver);
        }, ChatObserver.SEGMENT_WAIT_SECONDS);
    }

    /**
     * Announce response segments
     * @param responseElement The element that wraps the response segment elements
     * @param lastAnnouncedSegment The index of the last segment elements that has been announced
     * @param lastIndex The last index of the response segment elements to be announced 
     */
    async announceSegments(responseElement: HTMLElement, lastAnnouncedSegment: number, lastIndex: number) {
        this.pl.utils.devLog("[ChatObserver] announce segment index from " + (lastAnnouncedSegment + 1) + " until " + lastIndex);
        for (let c: number = lastAnnouncedSegment + 1; c <= lastIndex; c++) {
            // Type check
            if (!responseElement.children[c]) {
                this.pl.utils.prodWarn(`[ChatObserver] Unable to find segment with index ${c}`);
                this.pl.utils.prodWarn(`[ChatObserver] response element: ${responseElement}`);
                return lastAnnouncedSegment;
            }
            const segmentElement = responseElement.children[c] as HTMLElement;
            if (!segmentElement.outerHTML) {
                this.pl.utils.prodWarn("[ChatObserver] Segment element does not have property 'outerHTML' - 4720");
                return lastAnnouncedSegment;
            }

            this.pl.utils.devLog("[ChatObserver] announcing :");
            this.pl.utils.devLog(segmentElement.textContent || '[empty segment]');
            this.pl.announce({
                msg: segmentElement.outerHTML
                , o: true
            });

            // Increase the `lastAnnouncedSegment`
            lastAnnouncedSegment = c;
        }
        // Return `lastAnnouncedSegment` to be used for next mutations
        return lastAnnouncedSegment;
    }
    /**
     * Handler when a response is completely received
     * @param {MutationObserver} responseSegmentsObserver The observer for the incoming new response
     */
    async onResponseComplete(responseSegmentsObserver: MutationObserver) {
        // Are there variables need to be reset ?

        // Disconnect 'new response observer'
        responseSegmentsObserver.disconnect();

        // Notify user that response is completed
        this.pl.utils.devLog("[ChatObserver] End of response received");
        // this.pl.announce({ msg: "End of response.", o: true });

        // Observe chat container again
        this.observeNewResponseContainer();
    }
    /**
     * Validate elements
     */
    validate() {
        return {
            chatContainer: () => {
                if (!this.chatContainer || !this.chatContainer.isConnected) {
                    this.pl.utils.prodWarn("[ChatObserver] Chat container is null or not connected - 283");
                    this.disconnect();
                    return false;
                }
                return true;
            },
            lastReplayContainer: () => {
                if (this.lastReplayContainer && !this.lastReplayContainer.isConnected) {
                    this.pl.utils.prodWarn("[ChatObserver] Last replay container is no longer connected - 9285");
                    // Do not disconnect, since last replay container is optional
                    return false;
                }
                return true;
            },
            all: () => {
                return this.validate().chatContainer() && this.validate().lastReplayContainer();
            }
        }
    }

}