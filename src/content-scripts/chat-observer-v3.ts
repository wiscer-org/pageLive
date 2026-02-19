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
* - newRC: RC of a new response that is received after user submits a prompt. 
* - existingRC: RC that is already rendered within the chat container (the parent), before implementing MutationObserver. 
* 
* The default behaviour of this class is to observe chat container and expect new response container to be added.
* When a new RC is fully rendered, the response segments will be parsed and announced sequentially with time delay to ease the SR UX.
* 
* The default behaviour can be overridden with `prevRCobserver`.
* `prevRCObserver` is used when DOM ready or when user change between different chats, the chat container will be updated with the  previously saved chat. 
* In this case, multiple response containers could be added at once. 
* So `prevRCObserver` will observe multiple response container addition, and after considered finished by the page adapter, 
* all the newly added response containers will be announced as summary like '2 responses has been added'.
* `prevRCObserver` can be triggered by set the parameter in `connect` function `shouldObservePrevRCs` to true.
* After `prevRCObserver` is completed, `newRCObserver` will be started to observe new response container addition.
* We do not need to consider when switching to empty chat, since empty / new chat may disconnect the `chatContainer` and automatically execute `disconnect` function.
*/

/**
 * The previous version of ChatObserver, which is used in Grok and Gemini, has the main concept of announcing response segments right away except the last segment.
 * It is based on the assumption that the page adapter will update the last segment during the streaming of response, while the previous segments will not be updated after being rendered.
 * In Claude, during rendering of a new response, some segments will be reordered and 2 segments can have same text content (in which one of them will be removed during the rendering).
 * This makes the previous approach of announcing the previous segments right away cannot be implemented in Claude.
 * 
 * This file, ChatObserverV3, only announce all segments until the response is completed.
 * Consumer of ChatObserverV3, page adapters, will provide function to detect if the response is completed, then ChatObserverV3 will announce all segments at once when the response is completed.
 */

export default class ChatObserverV3 {
    pl !: PageLive;
    // Ref to the chat container: containing all prompts and responses.
    chatContainer: HTMLElement | null = null;
    // There are cases, like in Grok, the incoming response will not be rendered to the same element as other previous responses.
    // In grok, when a new response received, the last new response is moved to the chat container like any other previous responses.
    // In this case, we need a specific ref to the last response container element. By default this should be the direct parent of each prompt / response elements.
    // By default chat container is the direct parent of all prompt and response container elements.
    lastReplayContainer: HTMLElement | null = null;
    // Wait time for a 'response segment' element to be considered as fully updated by the page adapter (Gemini, Grok, etc)
    static SEGMENT_WAIT_SECONDS: number = 5e3; // seconds

    /**
     * Test if a given node is a response container.
     * This is a synchronous function since the RC are expected already rendered.
     */
    isRC: (n: Node) => boolean;
    /**
    * Parse `responseContainer` from a node that is a children of `chatContainer`.
    * Used for already existed node in `chatContainer` and also for newly added node observed by MutationObserver.
    * This is an async function to allow page adapter to do asynchronous operation if needed, like waiting for the response container to be fully rendered and stable before returning the element.
    */
    isNewRC: (n: Node) => Promise<boolean>;
    /**
     * Test if the given node is a response container or the node may contain response containers
     */
    // parseResponseElements: (n: Node) => HTMLElement[];

    /**
    * Used in MutationObserver, to parse the response element within a response container element
    * Returns a Promise that resolves to the response element, to allow asynchronous operations if needed.
    * @return {HTMLElement | null} The response element, or null if cannot be found
    */
    // parseAndWaitResponseElement: (el: HTMLElement) => Promise<HTMLElement | null>;

    /**
     * Function to be called before handling new response.
     * Can be used to announce to user, like: 'Grok replies'
    */
    // handleNewResponse: (response: HTMLElement) => Promise<void>;
    /**
     * Handles the situation when the response element cannot be found within a newly added response container.
     * This function can be used to log warnings, attempt alternative parsing strategies, or notify the user.
     * 
     * @param rc - The newly added Response Container HTMLElement where the response element was not found.
     * @returns A promise that resolves when the handling is complete.
    */
    // handleResponseElementNotFound: ((rc: HTMLElement) => Promise<void>) | null;

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

    // Set to true if we want to treat all RCs as new RCs, not as prevRCs.
    // All RCs are including the existing RCs that are already rendered in the chat container when chat container is added
    // , and also the newly added RCs observed by MutationObserver.   
    shouldTreatAllAsNewRCs: boolean = false;
    // Function to determine if the current chat is an empty chat.
    isThisEmptyChat !: (() => boolean);
    // Options for observing chat container. Default not to observe subtree for performance reason.
    subtree: boolean = false;
    // Handler for new RC. Will be used by page adapter to wait and announce the new RC.
    // This function should call {@link ChatObserverV3.readSegments} or {@link ChatObserverV3.delayReadRemainingSegments}.
    handleNewRC: ((newRC: HTMLElement) => Promise<void>);
    // Response containers mapped from existing chat history
    // Note: Currently not used
    responseContainers: HTMLElement[] = [];

    /** 
     * @param pl Instance of PageLive
     * @param findCC Find the chat container element, within the `steadyCCParent`
     * @param steadyCCParent HTMLElement used to query chat container. If null will use `document`
     * @param findLastReplyContainer Find the HTMLElement used to contain the last reply container. This is used when the new response is rendered to a different container than previous responses, like in Grok. If null, will use `chatContainer` as default container for new response.
     * @param isThisEmptyChat Function to determine if the current chat is an empty chat.
     * @param isRC Function to determine if a given node is a response container. The given node is expected to be a direct child node of `chatContainer`.
     * @param isNewRC Function to determine if a given node is a new response container. This is used to differentiate new RC from previous RC when the new RC is rendered together with chat container, like in Claude. The given node is expected to be a direct child node of `chatContainer` or `lastReplayContainer` if provided. 
     * @param handleNewRC Function to handle a newly added response container. This function should call `ChatObserverV3.readSegments` or `ChatObserverV3.delayReadRemainingSegments`.
     */
    constructor(
        pl: PageLive
        // , parseResponseElements: (n: Node) => HTMLElement[]
        // , parseAndWaitResponseElement: (el: HTMLElement) => Promise<HTMLElement | null>
        // , handleNewResponse: (response: HTMLElement) => Promise<void>
        // , handleResponseElementNotFound: ((rc: HTMLElement) => Promise<void>) | null
        , findCC: () => Promise<HTMLElement | null>
        , steadyCCParent: HTMLElement | null
        , findLastReplyContainer: (() => Promise<HTMLElement | null>) | null
        , isThisEmptyChat: (() => boolean)
        , isRC: (n: Node) => boolean
        , isNewRC: (n: Node) => Promise<boolean>
        , handleNewRC: ((newRC: HTMLElement) => Promise<void>)

    ) {
        this.pl = pl;
        // this.parseResponseElements = parseResponseElements;
        // this.parseAndWaitResponseElement = parseAndWaitResponseElement;
        // this.handleNewResponse = handleNewResponse;
        // this.handleResponseElementNotFound = handleResponseElementNotFound;
        this.findCC = findCC;
        this.steadyParent = this.steadyParent;
        this.findLastReplayContainer = findLastReplyContainer;
        this.isThisEmptyChat = isThisEmptyChat;
        this.isRC = isRC;
        this.isNewRC = isNewRC;
        this.handleNewRC = handleNewRC;
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
        // Set true to observe prev RCs to be rendered, in the case of page load or switching between different chats. This is useful to let user know that some number of responses just loaded.
        , shouldObservePrevRCs: boolean = true
        // Used to announce existing responses on initial connect as newRCs. This is useful when the `chatContainer` is added along with the newRCs. This happens in Claude when first newRC is rendered on empty chat
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
        // console.log("shouldTreatAllAsNewRCs: ", this.shouldTreatAllAsNewRCs);

        if (!this.shouldTreatAllAsNewRCs) {
            this.announceExistingRCsAsPrevRCs();
            // Start observing previous response containers to be rendered
            await this.observeForPrevRCs();
            // After finishing observing previous RCs, new RC observer will be started

        } else {
            // Directly observe new response container addition
            this.observeForNewRCs();
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
    async announceExistingRCsAsPrevRCs() {
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
    async observeForNewRCs() {
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

        // Parse existing new RCs that are rendered together with chat container, like in claude, to avoid treating them as prev RCs. 
        // This is for the case like claude, where the new RC is rendered together with chat container when started from empty chat
        // , thus we cannot differentiate new RC from prev RC with MutationObserver
        // , but we can differentiate them with the provided function `isNewRC` to detect if a RC is a new RC or not.
        if (this.shouldTreatAllAsNewRCs) {
            for (let i = 0; i < observerTarget.children.length; i++) {
                const node = observerTarget.children.item(i) as HTMLElement;
                const isNewRC = await this.isNewRC(node);
                if (isNewRC) this.handleNewRC(node);
            }
        }

        // Observe for added new RCs
        this.newRCObserver = new MutationObserver(async (mutations, observer) => {
            for (const mutation of mutations) {
                if (mutation.type === "childList") {
                    for (let c = 0; c < mutation.addedNodes.length; c++) {
                        const node = mutation.addedNodes.item(c) as HTMLElement;
                        const isNewRC = await this.isNewRC(node);
                        if (isNewRC) {
                            this.pl.utils.devLog("[ChatObserver] New RC added:");
                            await this.handleNewRC(node);
                        }
                    }
                }
            }
        });
        this.newRCObserver.observe(observerTarget, {
            childList: true,
            // subtree: this.subtree,
        });

        this.pl.utils.devLog("[ChatObserver] Started observing new response containers.");
    }
    /**
     * Observe the previously saved responses. These RCs will be rendred after `chatContainer` is rendered.
     * @returns 
     */
    async observeForPrevRCs() {
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
                        const isNewRC = await this.isNewRC(node);
                        if (isNewRC) newRCs.push(node);
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
            // Do not treat all as new RCs, since it will read the existing prevRCs as newRCs.
            // `this.shouldTreatAllAsNewRCs` should set to `true` only by page adapter. 
            // this.shouldTreatAllAsNewRCs = true;
            this.observeForNewRCs();
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
            const isRC = this.isRC(child);
            if (isRC) {
                this.responseContainers.push(child as HTMLElement);
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
     * Schedule to read the remaining not-yet-read response segments
     * @param {HTMLElement[]} segments The response segment elements to be read
     * @param {number} lastReadSegment The index of the last read segment
     * @param {MutationObserver} responseSegmentsObserver The mutation observer to disconnect at the end of receiving response
     */
    delayReadRemainingSegments(segments: HTMLElement[], lastReadSegment: number
        , readTimeout: ReturnType<typeof setTimeout> | undefined
        , responseSegmentsObserver: MutationObserver) {

        // Cancel the timeout id if exist
        if (readTimeout) clearTimeout(readTimeout);

        console.log(`Schedule to read remaining segment. Total segments: ${segments.length}, lastReadSegment: ${lastReadSegment}`);

        return setTimeout(async () => {
            const lastSegmentToRead = segments.length - 1;
            this.pl.utils.devLog(`[ChatObserver] Delayed read, from segment index ${lastReadSegment + 1} to ${lastSegmentToRead} `);
            await this.readSegments(segments, lastReadSegment, lastSegmentToRead);

            // The incoming response has been completely received
            this.onResponseComplete(responseSegmentsObserver);
        }, ChatObserverV3.SEGMENT_WAIT_SECONDS);
    }

    /**
     * Announce response segments
     * @param segments The response segment elements to be announced
     * @param lastAnnouncedSegment The index of the last segment elements that has been announced
     * @param lastIndex The last index of the response segment elements to be announced 
     */
    async readSegments(segments: HTMLElement[], lastAnnouncedSegment: number, lastIndex: number) {
        this.pl.utils.devLog("[ChatObserver] announce segment index from " + (lastAnnouncedSegment + 1) + " until " + lastIndex);
        for (let c: number = lastAnnouncedSegment + 1; c <= lastIndex; c++) {
            // Type check
            const s = segments[c];
            if (!s) {
                this.pl.utils.prodWarn(`[ChatObserver] Unable to find segment with index ${c} - 1395`);
                return lastAnnouncedSegment;
            }
            // const segmentElement = responseElement.children[c] as HTMLElement;
            if (!s.outerHTML) {
                this.pl.utils.prodWarn("[ChatObserver] Segment element does not have property 'outerHTML' - 4720");
                return lastAnnouncedSegment;
            }

            this.pl.utils.devLog("[ChatObserver] announcing :");
            this.pl.utils.devLog(s.textContent || '[empty segment]');
            // console.log(s.outerHTML);
            // console.log(s.parentElement?.outerHTML);
            this.pl.speak(s.outerHTML);

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

