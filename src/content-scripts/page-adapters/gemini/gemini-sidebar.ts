import PageLive from '../../pagelive'
import toggleSidebar from '../features//toggle-sidebar';

/**
 * Adapter for sidebar in gemini
 */
export default class GeminiSidebar {
    pl!: PageLive;

    // External dependencies
    closeAllModalsDialogs!: () => Promise<void>;
    focusChatInput!: () => Promise<void>;

    // Element Reffs
    sidebar: HTMLElement | null = null;
    sidebarExpandButton: HTMLElement | null = null;
    sidebarCollapseButton: HTMLElement | null = null;

    // Resolvers
    resolve = {
        sidebar: async (intent: string) => {
            this.sidebar = await this.pl.resolve(
                this.sidebar
                , '.sidenav-with-history-container'
                , "Sidebar element"
                , intent
            );
            return this.sidebar;
        }, sidebarExpandButton: async (intent: string) => {
            // Depending on the screen width, there are 2 buttons to be used to expand siebar.

            // Find button for large width first
            this.sidebarExpandButton = await this.pl.resolve(
                this.sidebarExpandButton
                , 'side-nav-menu-button button'
                , 'Sidebar Expand Button'
                , intent
            );

            // If not found, maybe this is medium / small width
            if (!this.sidebarExpandButton || this.sidebarExpandButton.isConnected === false) {
                this.sidebarExpandButton = await this.pl.resolve(
                    this.sidebarExpandButton
                    , 'side-nav-sparkle-button button'
                    , 'Sidebar Expand Button'
                    , intent
                );
            }
            return this.sidebarExpandButton;
        }, sidebarCollapseButton: async (intent: string) => {
            this.sidebarCollapseButton = await this.pl.resolve(
                this.sidebarCollapseButton
                , '.close-sidenav-button'
                , 'Sidebar Collapse Button'
                , intent
            );
            return this.sidebarCollapseButton;
        },
    }

    constructor(
        pl: PageLive
        , closeAllModalsDialogs: () => Promise<void>
        , focusChatInput: () => Promise<void>
    ) {
        this.pl = pl;
        this.closeAllModalsDialogs = closeAllModalsDialogs;
        this.focusChatInput = focusChatInput;
    }

    /**
     * Toggle sidebar
     */
    async toggleSidebar() {
        // Note: To toggle sidebar, different elements are used by 2 factors:
        // expanding vs collapsing, and layout width.
        // Button selector to collapse for all screen sizes : '.close-sidenav-button'
        // Button to expand for small / medium screen : 'side-nav-sparkle-button button'
        // Button selector to expand for large screen: 'side-nav-sparkle-button button'

        // Is it collapsing ?
        let isCollapsing = await this.isSidebarCollapsed() === false;

        let toggleButton: HTMLElement | null = null;
        if (isCollapsing) {
            toggleButton = await this.resolve.sidebarCollapseButton('Toggling sidebar');
        } else {
            // Find button for large width first
            toggleButton = await this.resolve.sidebarExpandButton('Toggling Sidebar')

            // If not found, maybe this is medium / small width
            if (!toggleButton) toggleButton = document.querySelector('side-nav-sparkle-button button');
        }

        if (!toggleButton) {
            const msg = `Failed to find the button to ${isCollapsing ? 'collapse' : 'expand'} sidebar`;
            this.pl.utils.prodWarn(msg);
            this.pl.speak(msg);
            return;
        }

        // Resolve the sidebar element
        await this.resolve.sidebar('Toggle sidebar');
        if (!this.sidebar) {
            this.pl.utils.prodWarn('Unable to resolve sidebar. Intent: Toggle sidebar');
            this.pl.speak('Error. Unable to resolve sidebar');
            return;
        }

        // Close all dialogs / modals first
        await this.closeAllModalsDialogs();

        await toggleSidebar(
            this.pl
            , this.isSidebarCollapsed.bind(this)
            , async () => {
                toggleButton.click();
            }, async () => {
                toggleButton.click();
            }, async () => {
                // When sidebar is expanding, manage the focus for better usability
                // Try to focus on the chat list heading in the sidebar
                let chatListHeading: HTMLElement | null = this.sidebar?.querySelector('[data-test-id="chats-expandable-section"] button') || null;
                if (chatListHeading) {
                    // Add `tabindex="-1"` to make it focusable, and focus on it
                    if (!chatListHeading.getAttribute('tabindex')) chatListHeading.setAttribute("tabindex", "-1");
                    chatListHeading.focus();
                    this.pl.toast('Focus moved to the chat list in the sidebar.');
                } else {
                    // Try to focus on the first anchor, button, or input inside the sidebar if 'chat heading' is not found
                    const focusableSelector = 'a, button, input, [tabindex]:not([tabindex="-1"])';
                    const firstFocusable = this.sidebar?.querySelector(focusableSelector) as HTMLElement;
                    if (firstFocusable) {
                        firstFocusable.focus();
                        this.pl.toast("Focused on the first focusable element in the sidebar.");
                    }
                }
            }, async () => {
                this.focusChatInput();
            }
        );
    }

    /**
     * Get the expanded / collapsed state of the sidebar
     */

    /**
     * Check if the sidebar / side navigation (chat list) is expanded.
     */
    async isSidebarCollapsed(): Promise<boolean> {
        await this.resolve.sidebar('Check If Sidebar Expanded');
        if (!this.sidebar) return false;
        else return !this.sidebar.classList.contains('expanded');
    }
}
