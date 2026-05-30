import PageLive from "../../pagelive";
import ElementObserver from "../../element-observer";
import featureFocusChatInput from '../features/focus-chat-input';
import featureReadLastResponse from '../features/read-last-response';

/**
 * This file is responsible for adapting the main chat interface in ChatGPT.
 * Features:
 * - Focus on the chat input
 */
// Functions required by `ChatGPTSection` class
type requiredFunctions = {
    isNewChat(url?: string): boolean;
    setResponsesCount(rCount: number): void;
}

export default class ChatGPTChatSection {
    private pl!: PageLive;
    private requiredFunctions!: requiredFunctions;
    private chatInput: HTMLElement | null = null;

    // Strategy to keep track of the number of responses:
    // Observe for chat container. After found, set observer for response container addition / removal.
    private responsesCount: number = 0;
    // Chat container don't have reliable selector, that is why it's hard to be observed
    // Thus, we go 3 level up that has selector `.composer-parent`.
    // This element will be called `chatContainerParent`. `chatContainerParent` is rendered earlier than `chatContainer`.
    private chatContainerParent: HTMLElement | null = null;
    // Chat container
    private chatContainer: HTMLElement | null = null;
    // The chat container observer
    private chatContainerParentObserver = new ElementObserver(
        async () => document.querySelector('.composer-parent')
        , (chatContainerParent) => {
            // Important: This `element` is the 4th level parent of prompt/response containers
            this.chatContainerParent = chatContainerParent;

            // Get the existing RCS 
            const rcs = this.getRCsWithin(chatContainerParent);
            this.setResponsesCount(rcs.length);

            // Observe when RCs are added / removed
            this.rcObserver.observe(chatContainerParent, {
                childList: true,
                subtree: true
            });

        }, null
        , () => {
            this.rcObserver.disconnect();
        }
    );
    // The observer for response container
    private rcObserver = new MutationObserver((mutations) => {
        for (const m of mutations) {
            // Detect additions
            for (const node of m.addedNodes) {
                if (!(node instanceof HTMLElement)) break;
                // If node an RC ?
                if (this.isRC(node)) {
                    this.setResponsesCount(this.responsesCount + 1);
                    break;
                }

                // If node contain RCs ?
                const rcs = this.getRCsWithin(node);
                if (rcs.length > 0) {
                    this.setResponsesCount(this.responsesCount + rcs.length);
                }
            }

            // Detect RC removals
            for (const node of m.removedNodes) {
                if (!(node instanceof HTMLElement)) break;

                // Is node a RC ?
                if (this.isRC(node)) this.setResponsesCount(this.responsesCount - 1);
                else {
                    const rcs = this.getRCsWithin(node);
                    if (rcs.length > 0) this.setResponsesCount(this.responsesCount - rcs.length);
                }
            }
        }
    });

    /**
     * @param pl {PageLive}
     * @param requiredFunctions - Functions required by this class
     */
    constructor(pl: PageLive, requiredFunctions: requiredFunctions) {
        this.pl = pl;
        this.requiredFunctions = requiredFunctions;
        this.resolve.chatInput();
        this.chatContainerParentObserver.observe();
    }
    resolve = {
        chatInput: async () => {
            if (!this.chatInput || this.chatInput.isConnected === false) {
                this.chatInput = document.querySelector('#prompt-textarea') as HTMLElement;
            }
        }
    }
    /**
     * Focus on the chat input
     */
    focusChatInput = async () => {
        this.resolve.chatInput();
        if (this.chatInput) {
            await featureFocusChatInput(this.pl, this.chatInput);
        }
    }

    isRC(node: HTMLElement): boolean {
        // Node is a RC if has 'data-turn-id-container' attribute and has decendant that has `data-turn` attribute        
        return node.classList.contains('data-turn-id-container')
            && !!node.querySelector('[data-turn]');
    }

    isContainRC(node: HTMLElement): boolean {
        return !!node.querySelector('[data-turn-id-container]');
    }

    /**
     * Get the response container elements within a node
     * @param node 
     */
    getRCsWithin(node: HTMLElement): HTMLElement[] {
        // Get the children of each RCs
        const possibleRCs = node.querySelectorAll('[data-turn-id-container]');

        // The RCs
        let rCs: HTMLElement[] = [];

        // RC has decendant that has `data-turn` attribute
        possibleRCs.forEach((el) => {
            if (el.querySelector('[data-turn="assistant"]')) {
                rCs.push(el as HTMLElement);
            }
        });

        return rCs;
    }

    /**
     * Get response segments within the last response container
     */
    async getLastResponseSegment(): Promise<HTMLElement[] | null> {
        // Note: Query selectors for containers (direct children of chat container)
        // For both prompt & response containers: chat container > div[data-turn-id-container]
        // Prompt and response containers are different in the decendant's `data-turn` attribute value.
        // Prompt containers : div[data-turn-id-container] > div > section[data-turn="user"]
        // Response containers: div[data-turn-id-container] > div > section[data-turn="assistant"]
        // Remember that the prompt / response containers are `div[data-turn-id-container]`, not the `section[data-turn]`
        // Query selector for prompt/response elements (direct parent of prompt / response segments)
        // Prompt elements: div[data-message-author-role="user"]
        // Response elements: div[data-message-author-role="assistant"]

        // Strategy to optimize performance:
        // - Find the first prompt container. Prompt container preceeds prompt container
        // - Then find the direct parent
        // - With the direct parent find response containers
        // - With each of the response containers query all response segments
        // - Announce each of the response segments

        let lastResponseSegments: HTMLElement[] = [];
        const lastPromptContainer = document.querySelector('div[data-turn-id-container]');

        if (!lastPromptContainer) return null;

        const parent = lastPromptContainer.parentElement;
        if (!parent) return null;

        const responseContainers = parent.querySelectorAll(':scope > div[data-turn-id-container] section[data-turn="assistant"]');
        if (responseContainers.length === 0) return null;

        // The last response container
        const lastResponseContainer = responseContainers[responseContainers.length - 1];

        // Find segments 
        lastResponseContainer.querySelectorAll('div[data-message-author-role="assistant"] > *')
            .forEach(el => lastResponseSegments.push(el as HTMLElement));

        return lastResponseSegments;
    }

    /**
     * Announce last response
     */
    async announceLastResponse() {
        // Is this new / empty chat ?
        if (this.requiredFunctions.isNewChat()) {
            this.pl.speak('This is a new chat. No response available.');
            return;
        }

        // Reff to the response segments within the last response element
        const lastResponseSegments = await this.getLastResponseSegment();

        // Announce
        if (!lastResponseSegments) this.pl.speak("Something wrong. Cannot find any response.");
        else if (lastResponseSegments.length === 0) this.pl.speak('No responses found');
        else featureReadLastResponse(this.pl, lastResponseSegments);
    }

    setResponsesCount(n: number): void {
        this.responsesCount = n;
        this.requiredFunctions.setResponsesCount(this.responsesCount);
    }
}