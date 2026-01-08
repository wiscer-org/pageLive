import { clear } from "console";
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
    parseResponseContainer: (n: Node) => HTMLElement | null;
    // Used to parse the response element from a response container element
    parseResponseElement: (el: HTMLElement) => HTMLElement | null;
    /**
     * Handles the situation when the response element cannot be found within a newly added response container.
     * This function can be used to log warnings, attempt alternative parsing strategies, or notify the user.
     * 
     * @param rc - The newly added response container HTMLElement where the response element was not found.
     * @returns A promise that resolves when the handling is complete.
     */
    handleResponseElementNotFound: (rc: HTMLElement) => Promise<void>;
    /**
     * Performs pre-processing tasks before handling new responses detected in mutations.
     * Can be used to announce, prepare or filter mutations before processing.
     */
    beforeHandleResponsesInMutation: (
        mutationList: MutationRecord[]
        , observer: MutationObserver
    ) => Promise<void>;
    /**
     * Performs post-initialization rendering tasks after the initial render is complete.
     * Can be use to announce how many responses are rendered.
     * 
     * @param prevResponseConts - Array of HTML elements representing response containers before the initial render
     * @param disconnectedResponseConts - Array of HTML elements representing response containers that have been disconnected from the DOM
     * @param currentResponseConts - Array of HTML elements representing the currently active response containers in the DOM
     * @returns A promise that resolves when the post-initial render operations are complete
     */
    postInitialRender: (
        prevResponseConts: HTMLElement[]
        , disconnectedResponseConts: HTMLElement[]
        , currentResponseConts: HTMLElement[]
    ) => Promise<void>;
    // Options for observing chat container. Default not to observe subtree for performance reason.
    subtree: boolean = false;
    // Response containers mapped from existing chat history
    responseContainers: HTMLElement[] = [];

    constructor(
        pl: PageLive
        , parseResponseContainer: (n: Node) => HTMLElement | null
        , parseResponseElement: (el: HTMLElement) => HTMLElement | null
        , handleResponseElementNotFound: (rc: HTMLElement) => Promise<void>
        , beforeHandleResponsesInMutation: (
            mutationList: MutationRecord[]
            , observer: MutationObserver
        ) => Promise<void>
        , postInitialRender: (
            prevResponseConts: HTMLElement[]
            , disconnectedResponseConts: HTMLElement[]
            , currentResponseConts: HTMLElement[]
        ) => Promise<void>
        , subtree: boolean = false
    ) {
        this.pl = pl;
        this.parseResponseContainer = parseResponseContainer;
        this.parseResponseElement = parseResponseElement;
        this.handleResponseElementNotFound = handleResponseElementNotFound;
        this.beforeHandleResponsesInMutation = beforeHandleResponsesInMutation;
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
        this.pl.announce({ msg: "ChatObserver connecting..." });

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

        // Observe for response container addition
        this.observeResponseContainersRender();

        // Wait until the chat history has completely rendered with the previous chat
        // await this.pl.utils.untilElementIdle(this.chatContainer, 3e3); // Wait for 3 seconds of idle time
        // this.pl.utils.devLog("[ChatObserver] Chat container is now idle.");

        // Map existing response containers
        // this.responseContainers = [];
        // No previous responses and no removed responses
        // await this.waitForInitialRender();

        // Attach observer to chat container to detect incoming response
        // await this.observeNewResponseContainer();

        this.pl.utils.devLog("[ChatObserver] Connected to chat container successfully.");
    }
    /**
     * Detect initial render of previous chat history.
     * Initial render is detected when there are nodes added and removed in the chat container.
     */
    async detectInitialRender() {

        const initialRenderObserver = new MutationObserver(async (mutations, observer) => {
            const prevResponseConts = this.responseContainers.slice(); // Clone the array
            const prevResponseContCount = this.responseContainers.length;
            const disconnectedResponseConts = await this.removeDisconnectedResponseContainers();
            // To check if all previous response containers are removed
            const persistedPrevResponseContCount = this.responseContainers.length;
            await this.mapResponseContainers();
            const currentResponseContCount = this.responseContainers.length;

            // Mark that user switched from one chat (removed) to another chat (added)
            const isInitialRender = (prevResponseConts.length > 0 && persistedPrevResponseContCount === 0 && currentResponseContCount > 0);
            // Not initial render, but when user scrolls up more previous chat history can be added (nodes added only)
            // We can safely assume that this happens if there are no nodes removed and more than 2 responses are added. However this will not catch the situtation when user scrolls up and only 1 response is added.
            const isPreviousChatAdded = (prevResponseConts.length === persistedPrevResponseContCount && (currentResponseContCount - persistedPrevResponseContCount) > 1);

            if (isInitialRender) {
                this.pl.utils.devLog("[ChatObserver] Initial render of previous chat history detected.");
                this.pl.announce({ msg: "Initial render of previous chat history detected.", o: true });
                // Stop observing
                observer.disconnect();
                this.newResponseContObserver?.disconnect();
                // Start from beginning 
                this.connect(this.chatContainer, this.lastReplayContainer);
                return;
            }

            if (isInitialRender || isPreviousChatAdded) {
                // this.pl.utils.devLog("[ChatObserver] All previous response containers are removed - initial render detected.");
                // Stop observing
                // observer.disconnect();
                // Wait until finish rendering
                // this.waitForInitialRender(prevResponseConts, disconnectedResponseConts);
                // return;
            }
        });

        this.chatContainer && initialRenderObserver.observe(this.chatContainer, {
            childList: true,
            subtree: this.subtree,
        });
        // If last replay container is provided, observe that as well
        this.lastReplayContainer && initialRenderObserver.observe(this.lastReplayContainer, {
            childList: true,
            subtree: this.subtree,
        });
    }
    /**
     * Wait until the initial render of previous chat history is completed, then execute `postInitialRender` callback.
     * 
     * Initial render is the chat rendering when user first open the chat page with previous chat history,
     * or switch between different chats with previous chat history.
     * After initial render is completed, execute `postInitialRender` callback.
     * Then start detecting for next initial render.
     
    * Few chat switch that may happen:
     * - From empty chat to chat with previous history - `postInitialRender` is executed during `connect` function. 
     * - From chat with previous history to empty chat - no intial render.
     * - From chat with previous history to another chat with different previous history - initial render needs to be detected. 
     * Initial render is detected when there are nodes added and removed in the chat container.
     */
    async waitForInitialRender(
        prevResponseConts: HTMLElement[] = []
        , disconnectedResponseConts: HTMLElement[] = []
    ) {
        this.pl.utils.devLog("[ChatObserver] Waiting for initial render to complete...");
        // Wait until chat container is idle
        if (this.chatContainer) {
            await this.pl.utils.untilElementIdle(this.chatContainer, 2e3); // Wait for 3 seconds of idle time
        }
        this.pl.utils.devLog("[ChatObserver] Initial render completed.");

        // Note: Only if mapResponseContainers === 0, that means this function is called directly from `connect` function.
        if (this.responseContainers.length === 0) await this.mapResponseContainers();

        // Execute post initial render callback
        this.postInitialRender(prevResponseConts, disconnectedResponseConts, this.responseContainers);
        // Start detecting for next initial render
        this.detectInitialRender();
    }
    async mapResponseContainers() {
        this.pl.utils.devLog("[ChatObserver] Mapping existing response containers...");

        if (!this.chatContainer) {
            this.pl.utils.prodWarn("[ChatObserver] Can not map response container - Chat container is null - 9281");
            return;
        }

        // Find all response container elements within chat container
        // this.responseContainers = Array.from(this.chatContainer.querySelectorAll("*")).filter(n => this.isResponseContainer(n)).map(n => n as HTMLElement);

        this.responseContainers = [];
        for (let i = 0; i < this.chatContainer.children.length; i++) {
            const child = this.chatContainer.children.item(i) as Node;
            const rc = this.parseResponseContainer(child);
            if (rc) {
                this.responseContainers.push(rc);
            }
        }
    }
    async removeDisconnectedResponseContainers() {
        const disconnected: HTMLElement[] = [];
        this.responseContainers = this.responseContainers.filter(rc => {
            if (!rc.isConnected) {
                disconnected.push(rc);
                return false;
            }
            return true;
        });
        return disconnected;
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
                            if (this.parseResponseContainer(node)) {
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
            this.pl.utils.devLog("[ChatObserver] Using `lastReplayContainer`, instead of `chatContainer`, to observe incoming response.");
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
                this.pl.utils.devLog("[ChatObserver] Response element is no longer connected. Stopping observing new response segments - 9283");
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
                this.pl.utils.devLog(`[ChatObserver] lastAnnouncedSegment before : ${lastAnnouncedSegment}`);
                lastAnnouncedSegment = await this.announceSegments(responseElement, lastAnnouncedSegment, secondLastSegmentIndex);
                this.pl.utils.devLog(`[ChatObserver] lastAnnouncedSegment after : ${lastAnnouncedSegment}`);

                // Schedule to announce the remaining not-yet-announced segments
                remainingTimeoutId = this.delayAnnounceRemainingSegments(responseElement, lastAnnouncedSegment, remainingTimeoutId, responseSegmentsObserver);

                // Current count will be the prev count for next process
                prevSegmentsCount = segmentsCount;
            }
        });

        // Handle existing segments before observing new segments
        this.pl.utils.devLog(`[ChatObserver] Response element has ${prevSegmentsCount} existing segments before observing new segments.`);
        if (prevSegmentsCount > 0) {
            // To allow SR quickly read the existing segments, we announce the first segments right away
            lastAnnouncedSegment = await this.announceSegments(responseElement, lastAnnouncedSegment, 0);
            if (prevSegmentsCount > 1) {
                await new Promise(r => setTimeout(r, 500));
                // Announce now all segments excluding the last one
                // console.log("After announce first segment, lastAnnouncedSegment: ", lastAnnouncedSegment);
                // this.announceSegments(responseElement, lastAnnouncedSegment, prevSegmentsCount - 2);
                remainingTimeoutId = this.delayAnnounceRemainingSegments(
                    responseElement,
                    lastAnnouncedSegment,
                    remainingTimeoutId,
                    this.responseSegmentsObserver
                );
            }
            // Schedule to announce the last segment.
            // remainingTimeoutId = this.delayAnnounceRemainingSegments(responseElement, prevSegmentsCount - 2, remainingTimeoutId, this.responseSegmentsObserver);
        }

        // Observe
        this.pl.utils.devLog("[ChatObserver] Start observe response element");
        this.responseSegmentsObserver.observe(responseElement, {
            childList: true,
        });
    }

    /**
     * Announce based on the event type of response container addition.
     */
    async observeResponseContainersRender() {
        let justStarted = true;
        let timeout: ReturnType<typeof setTimeout> | undefined;

        const observer = new MutationObserver(async (mutationList, observer) => {
            // Validate key elements
            if (!this.validate().all()) {
                this.pl.utils.prodWarn("[ChatObserver] Key elements are no longer connected. Stopping observing response container addition - 9259");
                this.disconnect();
                return;
            }

            timeout = scheduleAnnounceRendered(timeout, mutationList, observer)
            return timeout
        });

        const scheduleAnnounceRendered = (
            timeout: ReturnType<typeof setTimeout> | undefined
            , mutationList: MutationRecord[]
            , observer: MutationObserver
        ) => {
            if (timeout) {
                clearTimeout(timeout);
                timeout = undefined;
            }
            timeout = setTimeout(() => {
                announceRendered(mutationList, observer);
            }, 2e3);
            return timeout;
        };

        const announceRendered = async (
            mutationList: MutationRecord[]
            , observer: MutationObserver
        ) => {
            // Data gathering
            const prevResponseContainers = this.responseContainers.slice(); // Clone the array
            const allHasBeenDisconnected = prevResponseContainers.every(rc => !rc.isConnected);

            for (let i = 0; i < prevResponseContainers.length; i++) {
                const rc = prevResponseContainers[i];
                // this.pl.announce({ msg: `Prev response container[${i}] isConnected: ${rc.isConnected}`, o: true });
                if (rc.isConnected) {
                    // this.pl.announce({ msg: `Element ${i + 1} still connected, with text: ${rc.textContent}`, o: true });
                    // console.log(">>>>>>>>>>>>> still connected: ");
                    // console.log(rc.parentElement?.parentElement);
                } else {
                    // this.pl.announce({ msg: `Oh no! Element ${i + 1} disconnected, with text: ${rc.textContent}`, o: true });
                }
            }

            await this.mapResponseContainers();

            // Check if chat has been switched. This is marked by all previous response containers are disconnected.
            // In the situation of `lastReplayContainer` exist and prev chat has only 1 response, then user send prompt and received response,  all responses will be disconnected and. It similar with swith to a chat with previous chat count has only 1 and the loaded chat also only has 1 response.
            const prevChatMinimumCount = this.lastReplayContainer ? 0 : 0;
            const justSwitchChat = prevResponseContainers.length > prevChatMinimumCount
                && this.responseContainers.length > 0
                && allHasBeenDisconnected;

            // this.pl.announce({ msg: `Previous response containers: ${prevResponseContainers.length} after mutation.`, o: true });
            // this.pl.announce({ msg: `Current response containers: ${this.responseContainers.length} after mutation.`, o: true });

            // this.pl.announce({ msg: `justSwitchChat: ${justSwitchChat}.`, o: false });
            // this.pl.announce({ msg: `prevResponseContainers.length: ${prevResponseContainers.length}.`, o: false });
            // this.pl.announce({ msg: `this.responseContainers.length: ${this.responseContainers.length}.`, o: false });
            // this.pl.announce({ msg: `allHasBeenDisconnected: ${allHasBeenDisconnected}.`, o: false });


            if (justStarted || justSwitchChat) {
                if (this.responseContainers.length > 0)
                    this.pl.announce({ msg: `Loaded ${this.responseContainers.length} previous responses.`, o: true });
            } else {
                await this.beforeHandleResponsesInMutation(mutationList, observer);
                handleResponsesInMutation(mutationList, observer);
            }
            justStarted = false;
        }

        const handleResponsesInMutation = async (mutationList: MutationRecord[], observer: MutationObserver) => {
            this.pl.utils.devLog("Start handling response containers in mutation...");
            for (const mutation of mutationList) {
                if (mutation.type === "childList") {
                    for (let c = 0; c < mutation.addedNodes.length; c++) {
                        const node = mutation.addedNodes.item(c) as HTMLElement;
                        const rc = this.parseResponseContainer(node);
                        if (rc) {
                            this.pl.utils.devLog("[ChatObserver] New response container is added during mutation.");
                            // Announce the response segments within the new response container
                            const responseElement = this.parseResponseElement(rc);

                            if (responseElement) {
                                this.pl.utils.devLog("[ChatObserver][ResponseElement] Announcing response segments within the new response container.");
                                this.observeNewResponseSegments(responseElement);
                            } else {
                                this.pl.utils.prodWarn("[ChatObserver][ResponseElement] Unable to parse response element from the new response container.");
                                if (this.handleResponseElementNotFound) await this.handleResponseElementNotFound(rc);
                            }
                        }
                    }
                }
            }
        }

        // Observe elements
        this.chatContainer && observer.observe(this.chatContainer, {
            childList: true,
            subtree: this.subtree,
        });

        this.lastReplayContainer && observer.observe(this.lastReplayContainer, {
            childList: true,
            subtree: this.subtree,
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
                this.pl.utils.prodWarn(`[ChatObserver] Unable to find segment with index ${c} `);
                this.pl.utils.prodWarn(`[ChatObserver] response element: ${responseElement} `);
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

