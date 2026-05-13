import PageLive from "../../pagelive";
import ElementObserver from "../../element-observer";

/**
 * This file is responsible for adapting the sidebar in ChatGPT.
 * Features:
 * - Announce when the sidebar is opened or closed.
 */

export default class ChatGPTSidebar {
    pl: PageLive;
    focusChatInput: () => Promise<void>;

    // The sidebar toggle button
    sidebarButton: HTMLElement | null = null;
    // Header of the chat list in the sidebar
    chatlistHeader: HTMLElement | null = null;

    // Element resolvers
    resolve = {
        sidebarToggleButton: async (intent: string) => {
            this.sidebarButton = await this.pl.resolve(
                this.sidebarButton
                , '[data-testid="close-sidebar-button"]'
                , 'SidebarToggleButton'
                , intent
            );
        }, chatlistHeader: async (intent: string) => {
            this.chatlistHeader = await this.pl.resolve(
                this.chatlistHeader
                , `.group\\/sidebar-expando-section button`
                , 'ChatListHeader'
                , intent
            );
        }
    }

    // Observe the existence of the sidebar
    sidebarButtonObserver = new ElementObserver(
        async () => {
            return document.querySelector('[data-testid="close-sidebar-button"]');
        },
        async (el) => {
            this.sidebarButton = el;
            this.sidebarStateObserver.observe(this.sidebarButton, {
                attributes: true
                , attributeFilter: ['aria-expanded']
                , attributeOldValue: true
            });
        },
        null,
        async () => {
            this.sidebarButton = null;
            this.sidebarStateObserver.disconnect();
        }
    );

    // Observe the state of the sidebar (expanded or collapsed)
    sidebarStateObserver: MutationObserver = new MutationObserver(async () => {
        if (this.sidebarButton) {
            const isExpanded = this.sidebarButton.getAttribute("aria-expanded") === "true";

            if (isExpanded) {
                // Move focus to the header of the chat list in sidebar
                await this.resolve.chatlistHeader('Focus chat list header after sidebar expanded.');
                this.chatlistHeader?.focus();
            } else {
                // Focus to chat input
                await this.focusChatInput();
            }
            // Let user know, wait a little to let SR finish reading the focused chat input
            this.pl.speak(`Sidebar is ${isExpanded ? 'expanded' : 'collapsed'}.`);
        }
    });

    /**
     * @param {PageLive} pl Instance of PageLive
     * @param focusChatInput 
     */
    constructor(pl: PageLive
        , focusChatInput: () => Promise<void>) {

        this.pl = pl;
        this.focusChatInput = focusChatInput;
        this.sidebarButtonObserver.observe();
    }
}

