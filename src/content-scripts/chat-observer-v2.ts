import PageLive from "./pagelive"
import ElementObserver from "./element-observer";

/**
* This class features interaction with the chat container element of progressive chat based page, like gemini or grok.
* Chat container is the element that wraps the series of prompts and responses of the current active chat.
* Note: A new response will not be rendered all at once, but received in streams. The UI will add / update the response segment elements.
* Below is the key terms used in this class:
* - chat container: The element that directly wraps all prompts and responses of the current active chat.
* - response container (RC): The element that wraps a response element. RC is direct children of `chatContainer`. RC could also include buttons and other components that is not  part of the response text. This element is used to identify when a new response is received.
* - response element: The direct parent that wraps all the response segments.
* - response segment : The element that contains a part of the response text. A response can have multiple segments, like `p`, `ul`, or etc. These segments are all on the same document hierarchy level.
* - prevRC: RC of previously saved prompt/response that will be rendered to chat container. The render process is a bit similar with the render of new response
* - existingRC: RC of previously saved prompt/ response. The difference from `prevRC` is `existingRC`s are rendered at the same time with `chatContainer`, while `prevRC` are rendered after `chatContainer` finished being rendered.
* 
* The default behaviour of this class is to observe chat container and expect new response container to be added, then parse the response element and finally read each response segment.
* This behaviour will be handled by `newRCObserver`
* 
* The default behaviour and be override with `prevRCobserver`.
* `prevRCObserver` is used when DOM ready or when user change between different chats, the chat container will be updated with the  previously saved chat. 
* In this case, multiple response containers could be added at once. So `prevRCObserver` will observe multiple response container addition, and after a period of idle time, all the newly added response containers will be announced as summary like '2 responses has been added'.
* `prevRCObserver` can be triggered by set the parameter in `connect` function `shouldObservePrevRCs` to true.
* After `prevRCObserver` is completed, `newRCObserver` will be started to observe new response container addition.
* We do not need to consider when switching to empty chat, since empty / new chat should executed `disconnect` function.
*/
export default class ChatObserverV2 {
    pl !: PageLive;
    // Ref to the chat container: containing all prompts and responses.
    // By default chat container is the direct parent of all prompt and response container elements.
    chatContainer: HTMLElement | null = null;
    // There are cases, like in Grok, the incoming response will not be rendered to the same element as other previous responses.
    // In grok, when a new response received, the last new response is moved to the chat container like any other previous responses.
    // In this case, we need a specific ref to the last response container element. By default this should be the direct parent of each prompt / response elements.
    lastReplayContainer: HTMLElement | null = null;
    // Wait time for a 'response segment' element to be considered as fully updated by the page adapter (Gemini, Grok, etc)
    static SEGMENT_WAIT_SECONDS: number = 4e3; // seconds
    /**
    * Used in MutationObserver, to parse the response container element from a newly added node
    * @return {HTMLElement | null} The response container element, or null if cannot be found
    */
    parseResponseContainer: (n: Node) => HTMLElement | null;
    /**
    * Used in MutationObserver, to parse the response element within a response container element
    * Returns a Promise that resolves to the response element, to allow asynchronous operations if needed.
    * @return {HTMLElement | null} The response element, or null if cannot be found
    */
    parseResponseElement: (el: HTMLElement) => Promise<HTMLElement | null>;
    /**
     * Function to be called before handling new response.
     * Can be used to announce to user, like: 'Grok replies'
    */
    handleNewResponse: (response: HTMLElement) => Promise<void>;
    /**
     * Handles the situation when the response element cannot be found within a newly added response container.
     * This function can be used to log warnings, attempt alternative parsing strategies, or notify the user.
     * 
     * @param rc - The newly added Response Container HTMLElement where the response element was not found.
     * @returns A promise that resolves when the handling is complete.
    */
    handleResponseElementNotFound: ((rc: HTMLElement) => Promise<void>) | null;
    /**
     * Function to find / query `chatContainer`
     * `CC` stands for `chatContainer`.
     */
    findCC: () => Promise<HTMLElement | null>;
    /**
     * HTMLElement that is ancestor of `chatContainer` that will not be disconnected during all operations in the page.
     * This element will be observed to detect if `chatContainer` is added or removed.
     * For the record, in grok and claude, the `chatContainer` element is not exist on empty chat or during chat transition.
     * 
     */
    steadyParent: HTMLElement | null = null;
    /**
     * Function to find / query `lastReplayContainer` element.
     */
    findLastReplayContainer: (() => Promise<HTMLElement | null>) | null;

    // New RC observer
    newRCObserver: MutationObserver | null = null;
    // Previous RCs observer
    prevRCObserver: MutationObserver | null = null;
    // Observer for added response segments within a response element
    responseSegmentsObserver: MutationObserver | null = null;

    // Set to true if we want to treat all RC additions as new RCs, not existing RCs nor previous RCs.
    shouldTreatAllAsNewRCs: boolean = false;
    // Function to determine if the current chat is an empty chat.
    isThisEmptyChat !: (() => boolean);
    // Options for observing chat container. Default not to observe subtree for performance reason.
    subtree: boolean = false;
    // Function to determine if a newly added node is a new RC, not previous RC.
    isNewRC: ((node: Node) => Promise<HTMLElement | null>) | null = null;
    // Response containers mapped from existing chat history
    // Note: Currently not used
    responseContainers: HTMLElement[] = [];

    constructor(
        pl: PageLive
        , parseResponseContainer: (n: Node) => HTMLElement | null
        , parseResponseElement: (el: HTMLElement) => Promise<HTMLElement | null>
        , handleNewResponse: (response: HTMLElement) => Promise<void>
        , handleResponseElementNotFound: ((rc: HTMLElement) => Promise<void>) | null
        , findCC: () => Promise<HTMLElement | null>
        , steadyCCParent: HTMLElement | null
        , findLastReplyContainer: (() => Promise<HTMLElement | null>) | null
        , isThisEmptyChat: (() => boolean)
        , subtree: boolean = false
        , isNewRC: ((node: Node) => Promise<HTMLElement | null>) | null = null

    ) {
        this.pl = pl;
        this.parseResponseContainer = parseResponseContainer;
        this.parseResponseElement = parseResponseElement;
        this.handleNewResponse = handleNewResponse;
        this.handleResponseElementNotFound = handleResponseElementNotFound;
        this.findCC = findCC;
        this.steadyParent = this.steadyParent;
        this.findLastReplayContainer = findLastReplyContainer;
        this.isThisEmptyChat = isThisEmptyChat;
        this.subtree = subtree;
        this.isNewRC = isNewRC;

        // If empty page, we want to treat all RCs as new RCs
        this.shouldTreatAllAsNewRCs = this.isThisEmptyChat() ? true : false;;


        const chatContainerObserver = new ElementObserver(
            findCC
            , this.onCCFound.bind(this)
            , steadyCCParent
            , this.onCCDisconnected.bind(this)
        );
        chatContainerObserver.observe();
    }

    /**
     * Connect, or re-connect the chat observer
     * @param chatContainer Closest parent of all previous prompts and responses, in some cases excluding the newest prompt/response
     * @param lastReplayContainer In some cases, the newest prompt/response is rendered to a different container than the previous prompts/responses. This parameter is the closest parent of the newest prompt/response.
     * @param shouldObservePrevRCs Whether to observe previous responses to be rendered. This is useful when connecting on page load or switching between different chats. Useful to let user know that some number of responses just loaded.
     * @param shouldAnnounceExistingResponses Whether to announce existing responses on initial connection. This option is different than `shouldObservePrevRCs`, which only announces newly added previous responses.
     * @returns {Promise<void>}
     */
    async connect(
        chatContainer: HTMLElement | null
        , lastReplayContainer: HTMLElement | null
        , shouldObservePrevRCs: boolean = true
        , shouldAnnounceExistingResponses: boolean = true
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

        // Reset 
        // TODO : Shouldn't count the existing response containers again ?
        this.responseContainers = [];

        // Announce existing responses if needed
        // if (shouldAnnounceExistingResponses) this.announceExistingResponses();
        console.log("shouldTreatAllAsNewRCs: ", this.shouldTreatAllAsNewRCs);
        if (!this.shouldTreatAllAsNewRCs) this.announceExistingResponses();

        if (!this.shouldTreatAllAsNewRCs) {
            // Start observing previous response containers to be rendered
            await this.observePrevRCs();
            // After finishing observing previous RCs, new RC observer will be started

        } else {
            // Directly observe new response container addition
            this.observeNewRC();
        }

        // if (shouldObservePrevRCs) {
        //     // Start observing previous response containers to be rendered
        //     this.observePrevRCs();
        // } else {
        //     // Directly observe new response container addition
        //     this.observeNewRC();
        // }

        this.pl.utils.devLog("[ChatObserver] Connected to chat container successfully.");
        // console.log(chatContainer)
        // console.log("chat container parent: ", chatContainer?.parentElement);
    }
    /**
     * Callback when cc, chat container, is found / connected
     */
    async onCCFound(cc: HTMLElement) {
        // If `lastReplayContainer` is in the context, find it.
        let lastReplayContainer: HTMLElement | null = null;
        if (this.findLastReplayContainer) {
            lastReplayContainer = await this.findLastReplayContainer();
        }
        // Connect
        this.connect(cc, lastReplayContainer, true, true);
    }
    /**
     * Callback when chat container is disconnected
     */
    async onCCDisconnected() {
        this.disconnect();
    }
    /**
     * Announce the existing response containers. This `existingRC`s are rendered together with `chatContainer`, different with `prevRC`s.
     * @returns 
     */
    async announceExistingResponses() {
        if (!this.validate().chatContainer("announceExistingResponses")) return;

        this.mapResponseContainers();
        const count = this.responseContainers.length;
        if (count > 0) {
            this.pl.utils.devLog(`[ChatObserver] Announcing existing responses: ${count}`);
            this.pl.speak(`There are ${count} existing responses.`);
        }
    }
    /**
     * Observe incoming new response. New response is rendered after user prompts a prompt.
     * @returns 
     */
    async observeNewRC() {
        // If prev RCs observer is running, cancel
        if (this.prevRCObserver) {
            this.pl.utils.devLog("[ChatObserver] Stopping previous RCs observer before observing new RC.");
            return;
        }

        // Stop previous new RC observer if any
        if (this.newRCObserver) {
            this.newRCObserver.disconnect();
            this.newRCObserver = null;
        }

        // Set the target to observe
        const observerTarget = this.lastReplayContainer || this.chatContainer;
        if (!observerTarget) {
            this.pl.utils.prodWarn("[ChatObserver] Cannot observe new response container - observer target is null - 9280");
            return;
        }

        let newRC: HTMLElement | null = null;
        // for (let i = observerTarget.children.length - 1 || 0; i >= 0; i--) {
        //     const child = observerTarget.children.item(i) as Node;

        //     // Either use the specific 

        //     const rc = this.parseResponseContainer(child);
        //     if (rc) {
        //         this.pl.utils.devLog("[ChatObserver][ResponseElement] Announcing new RC found on initial parsing before observing, which is likely rendered together with chat container. Announcing response segments within this RC.");
        //         await this.handleNewResponse(rc);
        //         this.observeNewResponseSegments(rc);
        //     }
        // }


        // this.pl.speak("Setting new RC observer");
        this.newRCObserver = new MutationObserver(async (mutations, observer) => {
            for (const mutation of mutations) {
                if (mutation.type === "childList") {
                    for (let c = 0; c < mutation.addedNodes.length; c++) {
                        const node = mutation.addedNodes.item(c) as HTMLElement;
                        const rc = this.parseResponseContainer(node);

                        if (rc) {
                            if (newRC && newRC.isSameNode(rc)) {
                                this.pl.utils.devLog("Same RC skipped");
                            }
                            if (newRC && !newRC.isConnected) {
                                this.pl.utils.devLog("Previous RC disconnected");
                            }
                            newRC = rc;

                            this.pl.utils.devLog("[ChatObserver] New response container is added.");
                            // Announce the response segments within the new response container
                            const responseElement = await this.parseResponseElement(rc);
                            if (responseElement) {
                                this.pl.utils.devLog("[ChatObserver][ResponseElement] Announcing response segments within the new response container.");
                                await this.handleNewResponse(responseElement);
                                this.observeNewResponseSegments(responseElement);
                            } else {
                                this.pl.utils.prodWarn("[ChatObserver][ResponseElement] Unable to parse response element from the new response container.");
                                if (this.handleResponseElementNotFound) await this.handleResponseElementNotFound(rc);
                            }
                        }
                    }
                }
            }
        });

        await this.parseExistingNewRC(observerTarget);

        // Observe
        this.newRCObserver.observe(observerTarget, {
            childList: true,
            subtree: this.subtree,
        });
    }
    async parseExistingNewRC(observerTarget: HTMLElement) {
        // In claude, new RCs are already rendered within the chat container. 
        // That's why we are going to read the new RCs, but not mixed with the existing prev RCs.
        // To be able to differentiate new RCs from existing prev RCs, 
        // consumer of this class need t provide a function to detect if the last chat container children is a new RC, not prev RC.
        let newRC: HTMLElement | null = null;

        if (this.isNewRC && observerTarget.children.length > 0) {
            this.pl.utils.devLog("Start to parse new RC");
            // Find from the bottom, if there is any new RC. We can find from the bottom, because usually the new RC is rendered at the end of chat container, and in some cases like claude, the new RC is rendered together with chat container, so we need to find the new RC from the rendered chat container.
            for (let i = observerTarget.children.length - 1 || 0; i >= 0; i--) {
                const node = observerTarget.children.item(i) as Node;

                // this.pl.utils.devLog(`parsing new RC for node: `, node);
                // if (node instanceof HTMLElement) this.pl.utils.devLog(node.outerHTML);

                newRC = await this.isNewRC(node);
                if (newRC) {
                    this.pl.utils.devLog("Found new RC on initial parsing: ");
                    console.log(newRC);
                    
                    await this.handleNewResponse(newRC);
                    this.observeNewResponseSegments(newRC);
                    break;
                }
            }
        }
        return null;
    }
    /**
     * Observe the previously saved responses. These RCs will be rendred after `chatContainer` is rendered.
     * @returns 
     */
    async observePrevRCs() {
        this.pl.utils.devLog("[ChatObserver] Observing previous response containers...");
        // Check key elements
        if (!this.chatContainer) {
            this.pl.utils.prodWarn("[ChatObserver] Cannot observe previous RCs - chat container is null - 3879");
            return;
        }

        // Stop previous and new observers if any
        if (this.newRCObserver) {
            this.newRCObserver.disconnect();
            this.newRCObserver = null;
        }
        if (this.prevRCObserver) this.prevRCObserver.disconnect();

        // Define observer
        let newRCs: HTMLElement[] = [];
        this.prevRCObserver = new MutationObserver(async (mutations, observer) => {
            for (const mutation of mutations) {
                if (mutation.type === "childList") {
                    for (let c = 0; c < mutation.addedNodes.length; c++) {
                        const node = mutation.addedNodes.item(c) as HTMLElement;
                        const rc = this.parseResponseContainer(node);
                        if (rc) newRCs.push(rc);
                    }
                }
            }
            scheduleAnnouncement();
        });

        // Schedule post action after elements are idle
        let announcementTimeout: ReturnType<typeof setTimeout> | null = null;
        const scheduleAnnouncement = async () => {
            if (announcementTimeout) {
                clearTimeout(announcementTimeout);
                announcementTimeout = null;
            }
            announcementTimeout = setTimeout(announcePreviousRCs, 2e3);
        };

        // Actions after idle
        const announcePreviousRCs = async () => {
            this.pl.utils.devLog(`[ChatObserver] Previous RCs added: ${newRCs.length}`);
            if (newRCs.length > 0) {
                this.pl.speak(`${newRCs.length} previous responses loaded.`);
                newRCs = [];
            }
            onObservePrevRCsComplete();
        }

        // In case there are no prev RCs are added, thus mutations not triggered, 
        // we still need to schedule announcement to trigger the next step, which is to observe new RCs.
        scheduleAnnouncement();

        const onObservePrevRCsComplete = async () => {
            if (observePrevRCsTimeout) {
                clearTimeout(observePrevRCsTimeout);
                observePrevRCsTimeout = null;
            }

            if (this.prevRCObserver) {
                this.prevRCObserver.disconnect();
                this.prevRCObserver = null;
            }
            this.pl.utils.devLog("[ChatObserver] Previous RCs observation completed. Now observing new RCs...");

            // Wait a little bit for the page to be fully idle and stable after rendering previous RCs, before starting to observe new RCs, to avoid the prev RCs that being rendered treated as new RC.
            // This wait will not reduce UX, since user also need time to type in before expecting new response.
            await new Promise(r => setTimeout(r, 4e3));

            // Now start to observe new RCs
            this.shouldTreatAllAsNewRCs = true;
            this.observeNewRC();
        }

        // Observe elements
        this.prevRCObserver.observe(this.chatContainer, {
            childList: true,
            subtree: this.subtree,
        });
        if (this.lastReplayContainer) {
            this.prevRCObserver.observe(this.lastReplayContainer, {
                childList: true,
                subtree: this.subtree,
            });
        }

        // Schedule to cancel observing previous RCs, if still idle in 15 seconds
        let observePrevRCsTimeout: ReturnType<typeof setTimeout> | null = setTimeout(() => onObservePrevRCsComplete, 15e3);
    }

    /**
     * Map the rendered RCs-
     * @returns 
     */
    async mapResponseContainers() {
        this.pl.utils.devLog("[ChatObserver] Mapping existing response containers...");

        // Check key elements
        if (!this.validate().chatContainer("mapResponseContainers")) return;
        if (!this.chatContainer) return;

        this.responseContainers = [];
        for (let i = 0; i < this.chatContainer.children.length; i++) {
            const child = this.chatContainer.children.item(i) as Node;
            const rc = this.parseResponseContainer(child);
            if (rc) {
                this.responseContainers.push(rc);
            }
        }
    }

    /**
    * Stop all observers and other processes. 
    * This function is used when ref to chat container is no longer valid.
    */
    disconnect() {
        this.pl.utils.devLog("[ChatObserver] Disconnecting...");
        this.chatContainer = null;
        this.lastReplayContainer = null;
        this.newRCObserver?.disconnect();
        this.newRCObserver = null;
        this.prevRCObserver?.disconnect();
        this.prevRCObserver = null;
        this.responseContainers = [];

        // If disconnected to an empty chat, set `shouldTreatAllAsNewRCs` to true
        if (this.isThisEmptyChat()) {
            this.shouldTreatAllAsNewRCs = true;
        }
    }
    isConnected() {
        return this.chatContainer !== null;
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
        console.log("prevSegmentsCount: ", prevSegmentsCount);
        if (prevSegmentsCount > 0) {

            // If only 1 prevSegments, delay to announce it in case still being updated
            if (prevSegmentsCount === 1)
                remainingTimeoutId = this.delayAnnounceRemainingSegments(
                    responseElement,
                    lastAnnouncedSegment,
                    remainingTimeoutId,
                    this.responseSegmentsObserver
                );

            // // To allow SR quickly read the existing segments, we announce the first segments right away
            // lastAnnouncedSegment = await this.announceSegments(responseElement, lastAnnouncedSegment, 0);
            if (prevSegmentsCount > 1) {
                // To allow SR quickly read the existing segments, we announce the first segments right away
                lastAnnouncedSegment = await this.announceSegments(responseElement, lastAnnouncedSegment, 0)
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
        }, ChatObserverV2.SEGMENT_WAIT_SECONDS);
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
            // console.log(segmentElement.outerHTML);
            // console.log(segmentElement.parentElement?.outerHTML);
            this.pl.speak(segmentElement.outerHTML);
            // this.pl.announce({
            //     msg: segmentElement.outerHTML
            //     , o: true
            // });

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

        // Everytime a response is completed, we assume the next incoming response is a new response.
        // this.shouldTreatAllAsNewRCs = false;
    }
    /**
     * Validate elements
     */
    validate() {
        return {
            chatContainer: (intent: string) => {
                let isValid = true;
                if (!this.chatContainer) {
                    this.pl.utils.devLog("[ChatObserver] Chat container is null. - 2954. Intent: " + intent);
                    isValid = false;
                } else if (!this.chatContainer.isConnected) {
                    this.pl.utils.devLog("[ChatObserver] Chat container is not connected. - 4258. Intent: " + intent);
                    isValid = false;
                }
                if (!isValid) {
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
            all: (intent: string) => {
                return this.validate().chatContainer(intent) && this.validate().lastReplayContainer();
            }
        }
    }

}

