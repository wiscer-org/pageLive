import PageLive from '../../pagelive';

/**
 * This class is responsible for adapting the chat section in the grok chat page.
 */

export default class GrokChatSection {
    pl: PageLive;

    // Element Reffs
    chatInput: HTMLElement | null = null;

    // Element resolvers
    resolve = {
        // The chat input element
        chatInput: (intent: string) => {
            return this.pl.resolve(
                this.chatInput
                , ''
                , 'Chat Input'
                , intent
            );
        }
    };

    constructor(pl: PageLive) {
        this.pl = pl;

        this.init();
        this.observeForResponseLoadingState();
    }

    async init() {
    }

    /**
     * Setup MutationObserver to observe if indicator waiting for response is in the 'loading' state
     */
    observeForResponseLoadingState() {
        // Note: In grok, after a prompt is added to `chatContainer`, an element is added as response container.
        // After that, element `.thinking-container` is added. We will use this element as 'busy' indicator

        // Observe for `.thinking-container` as 'busy' indicator element
        const busyIndicatorObserver = new MutationObserver(async (mutations) => {
            for (const m of mutations) {
                if (m.type !== 'childList') break;

                // Check if the the `.thinking-container` is one of the added nodes.
                for (const node of m.addedNodes) {
                    const busyIndicatorElement = getBusyIndicator(node);
                    if (busyIndicatorElement) {
                        const busyId = await this.pl.signal.busy();
                        await this.pl.utils.untilElementIdle(busyIndicatorElement, 1e3, {
                            childList: true, subtree: true, characterData: true, attributes: true
                        });
                        // No longer busy
                        this.pl.signal.busyStop(busyId);
                    }
                }
            }
            // Is 'busy' element is added ?
        });

        const getBusyIndicator = (node: Node): HTMLElement | null => {
            if (!(node instanceof HTMLElement)) return null;
            // Is the node the busy indicator ?
            if (node.classList.contains('thinking-container')) return node as HTMLElement;
            // Maybe the busy indicator is inside the element
            return node.querySelector('.thinking-container');
        }
        busyIndicatorObserver.observe(document, { childList: true, subtree: true });



    }
}