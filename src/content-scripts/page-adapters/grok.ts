import { Keybinds } from "../keybind-manager";
import PageLive from "../pagelive";
import ChatObserver from "../chat-observer";
import { Chat } from "../../types/chat";

const grokAdapter = async () => {
    const pl = new PageLive();
    // Grok specific ref to the last replay container, containing the latest prompt and response
    let lastReplayContainer: HTMLElement | null = null;

    // Observer to handle incoming responses
    let chatObserver !: ChatObserver;
    let chatContainer!: HTMLElement

    const construct = () => {
        pl.page.name = "grok";
        init();
    }
    const init = async () => {
        pl.utils.devLog("Initializing..");
        await ensureChatContainer();

        pl.initialAnnounceInfo.push("grok");

        chatObserver = new ChatObserver(
            pl
            , chatContainer
            , (n: Node) => false // dummy
            , (el: HTMLElement) => null // dummy
            , postInitialRender
        );
        await chatObserver.init();

        // Add keyboard shortcuts
        pl.keybindManager.registerKeybind(Keybinds.FocusChatInput, focusChatInput);
        pl.keybindManager.registerKeybind(Keybinds.AnnounceLastResponse, announceLastResponse);

        // Add callback to be executed the next time dialog is shown
        pl.pageInfoDialog.onEveryOpenCallback = onDialogOpen;


        await pl.page.ready();
    }
    const onDialogOpen = async () => {
        pl.utils.devLog("Dialog opened on grok");
    }
    const ensureChatContainer = async () => {
        // let element = await pl.utils.waitForAnElement('main.\\@container');
        let element = await pl.utils.waitForAnElement('.\\@container\\/chat >div > div.items-center');
        if (!element) {
            pl.utils.prodWarn("Could not find chat container - 924");
            return document.createElement("div"); // return dummy element to avoid whole thing crashed
        }
        chatContainer = element as HTMLElement;
    }
    const focusChatInput = async () => {
        const chatInput = document.querySelector(".\\@container form div[contenteditable='true']") as HTMLElement;
        if (!chatInput) {
            pl.utils.prodWarn("Could not find chat input");
            return;
        }
        chatInput.focus();
    }
    /**
     * 
     */
    const getChatUnitElements = (): NodeListOf<Element> => {
        return chatContainer.querySelectorAll('div[id^="response-"] > div.message-bubble > div.relative > div.response-content-markdown');
    }
    /**
     * Announce the last response in the chat container
     */
    const announceLastResponse = async () => {
        // Ensure we have the lastReplayContainer
        if (!lastReplayContainer || !lastReplayContainer.isConnected) {
            lastReplayContainer = chatContainer.querySelector('#last-reply-container') as HTMLElement;
            if (lastReplayContainer === null) {
                pl.utils.prodWarn("Could not find last replay container - 9823");
                return
            }
        }

        // Prompt and response are both inside lastReplayContainer
        if (!lastReplayContainer.children || lastReplayContainer.children.length < 2) {
            pl.utils.prodWarn("Last replay container does not have enough children - 9832");
            pl.utils.prodWarn("Last replay container children:");
            console.log(lastReplayContainer.children);
            return;
        }

        const lastResponseContainer = lastReplayContainer.children[1] as HTMLElement;
        let toBeAnnounced = "No last response is found.";
        const messageBubble = lastResponseContainer.querySelector('div.message-bubble');
        if (messageBubble) {
            toBeAnnounced = messageBubble.innerHTML || '';
        } else pl.utils.prodWarn("Latest response element does not contain message-bubble - 982");

        pl.utils.devLog("Reading last response");
        pl.announce({ msg: "Reading last response.", omitPreannounce: true });
        pl.announce({ msg: toBeAnnounced, omitPreannounce: true });
        pl.announce({ msg: "End of last response.", omitPreannounce: true });
    }
    /**
     * After the initial previous chat has been rendered
     */
    const postInitialRender = async () => {
        // get all `chatUnit` elements
        const chatUnits = getChatUnitElements();
        const totalResponses = chatUnits.length / 2;

        if (totalResponses > 0) {
            let msg = `${totalResponses} responses loaded from previous chats`;
            pl.utils.devLog(msg);
            pl.announce({ msg, omitPreannounce: true });
        } else pl.utils.devLog("No previous responses loaded.");
    }
    construct();
}

// Note: The callback is guaranteed to run because we set "document_start" in manifest.json
document.addEventListener('DOMContentLoaded', () => {
    grokAdapter();
});

