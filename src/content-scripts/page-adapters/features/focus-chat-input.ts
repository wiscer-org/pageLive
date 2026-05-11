import PageLive from '../../pagelive';

/**
 * Function to give consistency when focusing chat input element. 
 * @param {PageLive} pl 
 * @param chatInput The chat input element to be focused.
 */
export default async (
    pl: PageLive
    , chatInput: HTMLElement | null
    , focusMsg?: string
) => {
    if (!chatInput || !chatInput.isConnected) {
        pl.speak('Chat input not found');
        return;
    }
    if (chatInput) {
        // Close any dialogs / modals first
        pl.pageInfoDialog?.close();
        // contentMapper.close();

        // In SR browse mode, SR will not read the input eventhough the focus is at the input element.
        // By change focus to other element first, before change focus to the input, will force the SR change to Form/Input mode. Thus, user can type right away without having to change SR mode.
        pl.dummySpanElement.focus();
        // this.dummySpanElement.focus();

        // Wait very very quick
        await new Promise(r => setTimeout(r, 50));

        chatInput.focus();

        // Eventhough SR announce the textbox, we will still announce it to user to make it clearer
        // Wait a little because SR still read the textbox due to the focus
        await new Promise(r => setTimeout(r, 1e3));
        pl.speak(focusMsg ? focusMsg : 'Chat input.');
        // this.speak(focusMsg ? focusMsg : 'Chat input');
    }
}
