import { Keybinds } from "../keybind-manager";
import PageLive from "../pagelive";

const grokAdapter = async () => {
    const pl = new PageLive();
    const construct = () => {
        pl.page.name = "grok";
        init();
    }
    const init = async () => {
        pl.utils.devLog("Initializing..");

        pl.initialAnnounceInfo.push("grok");

        // Add keyboard shortcuts
        pl.keybindManager.registerKeybind(Keybinds.FocusChatInput, focusChatInput);

        // Add callback to be executed the next time dialog is shown
        pl.pageInfoDialog.onEveryOpenCallback = onDialogOpen;


        await pl.page.ready();
    }
    const onDialogOpen = async () => {
        pl.utils.devLog("Dialog opened on grok");
    }
    const focusChatInput = async () => {
        const chatInput = document.querySelector(".\\@container form div[contenteditable='true']") as HTMLElement;
        if (!chatInput) {
            pl.utils.prodWarn("Could not find chat input");
            return;
        }
        chatInput.focus();
    }
    construct();
}

// Note: The callback is guaranteed to run because we set "document_start" in manifest.json
document.addEventListener('DOMContentLoaded', () => {
    grokAdapter();
});