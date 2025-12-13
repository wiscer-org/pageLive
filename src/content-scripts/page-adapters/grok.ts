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

        // Add callback to be executed the next time dialog is shown
        pl.dialogManager.onEveryOpenCallback = onDialogOpen;


        await pl.page.ready();
    }
    const onDialogOpen = async () => {
        pl.utils.devLog("Dialog opened on grok");
    }

    construct();
}

// Note: The callback is guaranteed to run because we set "document_start" in manifest.json
document.addEventListener('DOMContentLoaded', () => {
    grokAdapter();
});