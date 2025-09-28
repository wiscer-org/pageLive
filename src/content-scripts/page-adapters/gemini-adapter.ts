import { devLog, untilElementIdle } from "../util";
import GeminiAdapterChat from "./gemini-chat";

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
    // The wait time will be reset whenever there is update on the chat container (that means previous responses is still being updated).
    // static DELAY_TO_START_OBSERVE_NEW_RESPONSES = 3000; // 3 seconds

    // Container for the active chat, contains prompts and responses
    // static CHAT_CONTAINER_SELECTOR = "#chat-history";
    // chatContainer: HTMLElement | null = null;

    // Not yet used: Container for side nav.
    static SIDE_NAV_CONTAINER_SELECTOR = "xxx";
    sideNavContainer: HTMLElement | null = null;

    // Element name for Gemini response
    // const RESPONSE_ELEMENT_NAME = 'MESSAGE-CONTENT';

    // Object focused with the interaction with chat container element
    chatContainerAdapter = new GeminiAdapterChat();

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

        this.chatContainerAdapter.init();

        // Wait until idle, chat history might being updated with previous chat history
        // await this.untilChatHistoryIdle();

        // Observe chat container for incoming new responses
        // this.observeNewResponses();

        // Unexplained: Without the console.log, does not matter what the string is, the Developer Tool's console will output series of "[PageLive][dev] [Object object]".
        // To log out something  will remove those logs. Any `console.log` in page adaper will has the same effect.
        // Maybe it's related to the browser's lifecycle. Maybe `console.log` will suspend on something.
        // To reproduce, comment the `console.log` below.
        // Console log below also could be used as log for dev purposes.
        devLog("Gemini adapter is ready");
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

    /**
     * Wait until chat container element is idle.
     */
    // async untilChatHistoryIdle(): Promise<void> {
    // Make sure the element exist
    //     if (!this.chatContainer) {
    //         console.warn("[PageLive][Gemini]Chat container not exits");
    //         return;
    //     }

    //     return untilElementIdle(this.chatContainer, GeminiAdapter.DELAY_TO_START_OBSERVE_NEW_RESPONSES);
    // }

    /**
     * Observe new responses in the chat container and accounce per response segment to {@link PageLive.announce}
     * Response segments are direct children of the response / message element, usually <p>, <ul>, <ol>, etc.
     * Keep in mind that a response is not rendered all at once but streamed in.
     * `directParent` is the direct parent of response segments, with selector: `message-content > div`
     * `directParent` has ancestor as follow, skipping some elements: 
     * `div.conversation-container model-response response-container div.response-container div.response-container-content div.response-content`
     * 
     * Objective: Decrease users' waiting time by announcing right away every respon segment fully loaded.
     * Last response segment will be announced after no more mutation on the direct parent after a short delay.
     * 
     * Strategy:
     * - Get reference to `directParent`, then observe with MutationObserver so we can know if an element is added
     * Everytime mutations happened, need to do 2 things: 
     * First, setTimeout to announce the last segment with delay and cancel the previous timeout. 
     * Second, check how many children the `directParent` has.
     * Evertime `directParent.children.length` increases and > 1, announce the n-1 segment. 
     * For instance, if the number of children increase from 1-2, the first segment will be announced right away because assummed the first segment has been fully loaded.
     * The last segment will be announced after some delay. We do not need to worry about the delay because screen reader will take some time to read the previous segments.
     * 
     * - To get the `directParent` reference we will use querySelector(`message-content > div`) instead of using MutationObserver,
     * because it is hard to check `div` in the `addedNodes` using MutationObserver.
     * To increase performance, `querySelector` will not ran be from `document` but from one of the parents which one of the following selectors:
     * `div.conversation-container model-response response-container div.response-container div.response-container-content div.response-content`.
     * This element, whatever which elements, will be called `directParentContainer`.
     * 
     * The ref to `directParentContainer` will be acquired by checking on every `addedNodes` in MutationObserver.
     * So we need an continuous observer on the chat container element.
     * 
     * To sum up:
     * 1. Continue observe chat container element to get ref for `directParentContainer`.
     * 2. Get the ref to `directParent` using `directParentContainer.querySelector` on every mutations.
     * 3. Still using the same observer, on every mutations, check the number of children of `directParent` and do the correspoding actions described above.
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
    // async observeNewResponses() {
    //     console.log("log - set observe new responses");
    //     // Make sure chat container exist
    //     if (!this.chatContainer) {
    //         // await this.waitForChatContainer();
    //         console.warn('[PageLive][Gemini]Chat container element not found');
    //         return;
    //     }

    //     // Ref to the last `directParentContainer`
    //     let directParentContainer: HTMLElement | null = null;
    //     // Ref to the `directParent` inside the `directParentContainer`
    //     let directParent: HTMLElement | null = null;
    //     const DIRECT_PARENT_SELECTOR = "message-content > div";
    //     // The previous response segments count
    //     let prevSegmentsCount = 0;
    //     // The index of the last announced response segment
    //     let lastAnnouncedSegmentIndex = -1;
    //     // Delay to announce the last segment after no more mutations
    //     const ANNOUNCE_DELAY = 3e3; // 3 seconds. It's ok a bit longer since this is for the last segment only while SR busy reading the earlier segments. The only downside if there is only 1 response segment.
    //     // The timeout id to announce the rest of the response segments
    //     let announceTimeoutId: ReturnType<typeof setTimeout> | null = null;

    //     // To reset parameters on every completion of 'receiving a new response'
    //     const resetParams = () => {
    //         directParentContainer = null;
    //         directParent = null;
    //         prevSegmentsCount = 0;
    //         lastAnnouncedSegmentIndex = -1;
    //     }

    //     // To check if a node is a `directParentContainer`
    //     const isDirectParentContainer = (el: HTMLElement) => {
    //         // Below are the hierarchy of `directParent`, skipping some elements:
    //         // `div.conversation-container model-response response-container div.response-container div.response-container-content div.response-content`
    //         // To make PageLive more prone to Gemini's UI changes, we are going to test each of the selector to be able ref to a `directParentContianer`

    //         if (
    //             // `div.conversation-container`
    //             (el.nodeName === "DIV" && el.classList.contains("conversation-container"))
    //             // model-response 
    //             || (el.nodeName === "MODEL-RESPONSE")
    //             // response-container 
    //             || (el.nodeName === "RESPONSE-CONTAINER")
    //             // div.response-container 
    //             || (el.nodeName === "DIV" && el.classList.contains("response-container"))
    //             // div.response-container-content 
    //             || (el.nodeName === "DIV" && el.classList.contains("response-container-content"))
    //             // div.response-content
    //             || (el.nodeName === "DIV" && el.classList.contains("response-content"))
    //         ) return true;
    //         return false;
    //     }

    //     // Set timeout to announce the last segment after delay
    //     const scheduleToAnnounceRemainingSegments = () => {
    //         // Remove scheduled announcement if exist.
    //         if (announceTimeoutId) {
    //             this.log("Clearing announce timeout");
    //             clearTimeout(announceTimeoutId);
    //         }

    //         console.log("schedule to announce last segments");
    //         announceTimeoutId = setTimeout(() => {
    //             // Check the `directParent` element
    //             if (!directParent) {
    //                 console.warn("`directParent` not exist in `scheduleToAnnounceLastSegments` function");
    //                 return;
    //             }

    //             announcePrevSegments(directParent.children.length - 1);
    //             // Clear the timeout id after executing
    //             if (announceTimeoutId !== null) clearTimeout(announceTimeoutId);

    //             // Reset variables after announce the remaining response segment(s)
    //             resetParams();
    //         }, ANNOUNCE_DELAY);
    //     }

    //     // Announce prev segments, that has not been announced, until the given index
    //     const announcePrevSegments = (lastIndexToAnnounce: number) => {
    //         this.log("---- announcePrevSegments ----");
    //         this.log(`lastAnnouncedSegmentIndex ${lastAnnouncedSegmentIndex} - lastIndexToAnnounce: ${lastIndexToAnnounce}`);
    //         this.log(`total children: ${directParent?.children.length}`);
    //         this.log(`textContent : ${directParent?.textContent}`);

    //         for (let c = lastAnnouncedSegmentIndex + 1; c <= lastIndexToAnnounce; c++) {

    //             // Check
    //             if (!directParent) {
    //                 console.warn("`directParent` is null");
    //                 return;
    //             }

    //             // Check for out-of-bound index
    //             if (!directParent.children[c]) {
    //                 console.warn(`[PageLive][Gemini] Can't find child of directParent with index: ${c}. Total children: ${directParent.children.length}`)
    //                 return;
    //             } else if (!directParent.children[c].outerHTML) {
    //                 console.warn(`[PageLive][Gemini] property 'outerHTML' is ${directParent.children[c].outerHTML}`)
    //             }

    //             this.log(`announcing: ${directParent.children[c].outerHTML}`);

    //             // Announce
    //             window.pageLive.announce({
    //                 msg: directParent.children[c].outerHTML
    //                 , omitPreannounce: true,
    //             });
    //         }
    //         // Set the last announced segment index
    //         lastAnnouncedSegmentIndex = lastIndexToAnnounce;
    //     }

    //     // Define observer and the callback
    //     const newResponseObserver = new MutationObserver((mutationList) => {
    //         // Catch `directParentContainer` if not yet available
    //         if (!directParentContainer) {
    //             for (const mutation of mutationList) {
    //                 // Match each added nodes
    //                 if (mutation.type === 'childList') {
    //                     mutation.addedNodes.forEach((node: Node) => {
    //                         // Check if this is one of the `directParentContainer` ?
    //                         // Elements that qualifies to be `directParentContainer` could be added on same mutations callback.
    //                         // So on one 'mutations callback' the `directParentContainer` could be set more than time, which is good. Because then the element will be the closest to `directParent` element which will increase performance a little.
    //                         const el = node as HTMLElement;
    //                         if (!directParentContainer && isDirectParentContainer(el)) {
    //                             // Save the ref
    //                             this.log("Found `directParentContainer`");
    //                             directParentContainer = el;
    //                         }
    //                     });
    //                 }
    //             }
    //         }

    //         // Try to query `directParent` if `directParentContainer` has found
    //         if (!directParent && directParentContainer) {
    //             this.log("Looking for `directParent` ");
    //             directParent = directParentContainer.querySelector(DIRECT_PARENT_SELECTOR);
    //             if (directParent) {
    //                 this.log("We found direct parent!");
    //             }
    //         }

    //         // Count the current response segments count, if `directParent` has been found
    //         if (directParent) {
    //             const segmentsCount = directParent.children.length;

    //             // Is there any segments added ?
    //             if (segmentsCount > prevSegmentsCount) {
    //                 this.log(`Segments added from ${prevSegmentsCount} to ${segmentsCount}`)
    //                 // Announce all prev segments, that has not been announced, except the last segment 
    //                 announcePrevSegments(segmentsCount - 1);

    //                 // Schedule to announce, will be canceled when another segment is attached
    //                 scheduleToAnnounceRemainingSegments();
    //             }
    //             // Set the segments count for the next mutations callback
    //             prevSegmentsCount = segmentsCount;
    //         }
    //         // Set timeout to announce the last segments that has not been announced
    //         // if (directParent && (se)) scheduleToAnnounceRemainingSegments();
    //     })

    //     // Attach observer
    //     console.log("attaching observer");
    //     newResponseObserver.observe(this.chatContainer, {
    //         childList: true // only observe the child addition to the chat container element
    //         , subtree: true
    //     });
    // }


}