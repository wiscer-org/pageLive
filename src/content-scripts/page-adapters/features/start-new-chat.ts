import PageLive from '../../pagelive';

/**
 * This function to start a new chat
 */
export default async (
    pl: PageLive
    , newChatButton: HTMLElement | null
    , href?: string
) => {
    // Must have `newChatButton` either URL
    if (!newChatButton && href === undefined) {
        pl.prodLogToast('Something wrong. New chat button & URL is not provided');
        return;
    }
    // Check the button
    if (newChatButton && newChatButton.isConnected === false) {
        pl.speak('New chat button is not available.');
        return;
    }

    // Close all dialogs / modals first
    pl.pageInfoDialog.close();

    // Click the toogle button and wait a little
    pl.speak('Start new chat.');
    // Wait a little to allow SR read the above message before re-render the page
    await new Promise(r => setTimeout(r, 250));

    // Start new chat
    if (newChatButton) newChatButton.click();
    else if (href) window.location.href = href;
}