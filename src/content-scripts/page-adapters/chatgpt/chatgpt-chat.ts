import PageLive from "../../pagelive";
import featureFocusChatInput from '../features/focus-chat-input';
import featureReadLastResponse from '../features/read-last-response';

/**
 * This file is responsible for adapting the main chat interface in ChatGPT.
 * Features:
 * - Focus on the chat input
 */
// Shared functions from initiator
type SharedFunctions = {
    isNewChat(url?: string): boolean
}

export default class ChatGPTChatSection {
    private pl!: PageLive;
    private shared!: SharedFunctions;
    private chatInput: HTMLElement | null = null;

    /**
     * @param pl {PageLive}
     * @param shared - Shared functions
     */
    constructor(pl: PageLive, shared: SharedFunctions) {
        this.pl = pl;
        this.shared = shared;
        this.resolve.chatInput();
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

        const responseContainers = parent.querySelectorAll(':scope > div[data-turn-id-container] > div > section[data-turn="assistant"]');

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
        if (this.shared.isNewChat()) {
            this.pl.speak('This is a new chat. No response available.');
            return;
        }

        // Reff to the response segments within the last response element
        const lastResponseSegments = await this.getLastResponseSegment();

        // Announce
        if (!lastResponseSegments) this.pl.speak("Something wrong. Can not find any resposes");
        else if (lastResponseSegments.length === 0) this.pl.speak('No responses found');
        else featureReadLastResponse(this.pl, lastResponseSegments);
    }

}