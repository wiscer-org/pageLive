import PageLive from '../../pagelive';

/**
 * This class contains shared functions for LLM apps, like: Grok, Gemini, Claude, etc.
 */
export default class AIChatHelper {
    chatTitle: string | null = null;
    responsesCount: number | null = null;
    // `HTMLElement` appended to the top of `PageInfo`
    pageInfoTop: HTMLDivElement = document.createElement('div');

    construct() {

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
}