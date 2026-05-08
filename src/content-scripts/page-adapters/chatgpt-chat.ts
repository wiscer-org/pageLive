import PageLive from "../pagelive";

/**
 * This file is responsible for adapting the main chat interface in ChatGPT.
 * Features:
 * - Focus on the chat input
 */
export default class ChatGPTChatSection {
    private pl: PageLive;
    private chatInput: HTMLElement | null = null;

    constructor(pl: PageLive) {
        this.pl = pl;
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
            await this.pl.focusChatInput(this.chatInput);
        }
    };
}