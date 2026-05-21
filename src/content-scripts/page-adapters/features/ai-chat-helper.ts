import PageLive from '../../pagelive';

/**
 * This class contains shared functions for LLM apps, like: Grok, Gemini, Claude, etc.
 */
export default class AIChatHelper {
    chatTitle: string | null = null;
    responsesCount: number | null = null;
    // `HTMLElement` appended to the top of `PageInfo`
    pageInfoTop: HTMLDivElement = document.createElement('div');

    constructor() {

    }
    setChatTitle(chatTitle: string) {
        this.chatTitle = chatTitle;
    }
    setResponsesCount(responsesCount: number) {
        this.responsesCount = responsesCount;
        this.renderPageInfoTop();
    }
    renderPageInfoTop() {
        // Info about responses
        let aboutResponse: string = 'This chat has no responses.';
        if (this.responsesCount === null) aboutResponse = 'Unable to retrive number of response';
        else if (this.responsesCount > 0) aboutResponse = `This chat has ${this.responsesCount} response${this.responsesCount > 1 ? 's' : ''}.`;

        this.pageInfoTop.innerHTML = `<p>${aboutResponse}</p>`;

    }
    getPageInfoTop() {
        return this.pageInfoTop
    }
    /**
     * Wrap the process of starting a new chat
     * @param {PageLive} pl - PageLive instance
     * @param isNewChat - To decide is current page is new / empty
     * @param trigger - Button or function to start new chat
     * @param preAction - Callback before starting new chat
     * @param postAction - Callback after starting new chat
     */
    async startNewChat(
        pl: PageLive
        , isNewChat: (() => Promise<boolean>) | null
        , trigger: HTMLElement | (() => Promise<void>)
        , preAction?: (() => Promise<void>) | undefined
        , postAction?: (() => Promise<void>) | undefined
    ) {
        // Check if current chat is a new / empty chat 
        if (isNewChat && await isNewChat()) {
            pl.speak('Already a new chat.');
            return;
        }

        // Check if the trigger element valid
        if (typeof trigger !== 'function') {
            if (typeof trigger.click !== 'function') {
                pl.speak('Trigger button notn valid');
                return;
            }
            if (trigger.isConnected === false) {
                pl.speak('Trigger button not found');
                return;
            }
        }

        // Execute pre-action
        if (typeof preAction === 'function') await preAction();

        // Announce
        pl.speak('Start new chat');
        // Wait a little to allow SR to announce first
        await new Promise(r => setTimeout(r, 1e3));

        // Action
        if (typeof trigger === 'function') await trigger();
        else trigger.click();

        // Execute post-action
        if (typeof postAction === 'function') await postAction();

    }
}