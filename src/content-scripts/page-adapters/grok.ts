import { Keybinds } from "../keybind-manager";
import PageLive from "../pagelive";
import ChatObserver from "../chat-observer";
import { Chat } from "../../types/chat";

const grokAdapter = async () => {
    const pl = new PageLive();

    // Observer to handle incoming responses
    let chatObserver !: ChatObserver;
    // Direct parent element of each previous chat units
    let chatContainer!: HTMLElement
    // Grok specific ref to the last replay container, containing the latest prompt and response
    let lastReplayContainer: HTMLElement | null = null;
    let chatInput: HTMLElement | null = null;

    const construct = () => {
        pl.page.name = "grok";
        init();
    }
    const init = async () => {
        pl.utils.devLog("Initializing..");
        await ensureChatContainer();
        await ensureLastReplayContainer();

        pl.initialAnnounceInfo.push("grok");

        // new response will be added to the 2nd div under the `lastReplyContainer`
        if (lastReplayContainer === null) return;
        let newResponseContParent = lastReplayContainer?.children[1] as HTMLElement | null;
        console.log(lastReplayContainer);
        console.log(lastReplayContainer?.children);
        console.log(lastReplayContainer.children.length);
        console.log(lastReplayContainer.children.item(0));
        console.log(lastReplayContainer.children.item(1));
        console.log(lastReplayContainer.querySelectorAll('[id^="response-"]'));
        if (!newResponseContParent) {
            pl.utils.prodWarn("Could not find new response container parent - 836");
            newResponseContParent = null; // Will make ChatObserver not fully functional, but avoid crash
        }
        newResponseContParent = lastReplayContainer;

        chatObserver = new ChatObserver(
            pl
            , chatContainer
            , isResponseContainer
            , parseResponseElement
            , postInitialRender
            , newResponseContParent
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
    const ensureLastReplayContainer = async () => {
        if (!lastReplayContainer || !lastReplayContainer.isConnected) {
            lastReplayContainer = chatContainer.querySelector('#last-reply-container') as HTMLElement;

            if (lastReplayContainer === null)
                pl.utils.prodWarn("Could not find last replay container - 946");
        }
        return lastReplayContainer;
    }
    // A collection to ensure various elements
    const ensure = {
        chatInput: () => {
            if (!chatInput || !chatInput.isConnected) {
                pl.utils.prodWarn("Chat input is null or not connected - 204");
                chatInput = document.querySelector(".\\@container form div[contenteditable='true']") as HTMLElement;
            }
            if (!chatInput) {
                pl.utils.prodWarn("Could not find chat input - 964");
            }
            return chatInput;
        }
    }
    const focusChatInput = async () => {
        await ensure.chatInput();
        pl.focusChatInput(chatInput);
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
        await ensureLastReplayContainer();
        if (!lastReplayContainer) {
            pl.utils.prodWarn("No last replay container found - 970");
            return;
        }

        // Prompt and response are both inside lastReplayContainer
        if (!lastReplayContainer.children || lastReplayContainer.children.length < 2) {
            pl.utils.prodWarn("Last replay container does not have enough children - 9832");
            pl.utils.prodWarn("Last replay container children:");
            console.log(lastReplayContainer.children);
            return;
        }

        const lastResponseContainer = lastReplayContainer.children[1] as HTMLElement;
        const messageBubble = lastResponseContainer.querySelector('div.message-bubble');
        if (messageBubble) {
            let msg = messageBubble.innerHTML || '';
            pl.utils.devLog("Reading last response");
            pl.announce({ msg: "Reading last response.", o: true });
            pl.announce({ msg, o: true });
            pl.announce({ msg: "End of last response.", o: true });
        } else {
            pl.announce({ msg: "No last response is found.", o: true });
            pl.utils.prodWarn("Latest response element does not contain message-bubble - 982");
        }

    }
    /**
     * Test whether the node, added when receiving incoming response, is the response container
     * @param {Node} node Node to be tested
     * @returns boolean
     */
    const isResponseContainer = (node: Node): boolean => {
        console.log("isResponseContainer test node:", node);
        if (!(node instanceof HTMLElement)) return false;
        // Check if the node matches the expected structure of response container
        // For Grok, we assume the response container has a specific class or structure
        // Here we use a placeholder condition; replace it with actual logic as needed
        if (node.tagName.toLowerCase() === 'div' &&
            node.id?.startsWith('response-') &&
            node.classList.contains('items-start')) {
            pl.utils.devLog("Node is a response container, has id ^='response-'");
            return true;
        }
        if (node.querySelector('.items-start')) {
            pl.utils.devLog("Node is a response container via items-start class");
            return true;
        }
        console.log("Node is NOT a response container:", node);
        return false;
    }
    /**
     * Parse the response element from the response container.
     * @param responseContainer 
     * @returns 
     */
    const parseResponseElement = (responseContainer: HTMLElement): HTMLElement | null => {
        if (!(responseContainer instanceof HTMLElement)) {
            pl.utils.prodWarn("Response container is not an HTMLElement - 1053");
            return null;
        }
        return responseContainer.querySelector('div.message-bubble > div > div.response-content-markdown') as HTMLElement;
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
            pl.announce({ msg, o: true });
        } else pl.utils.devLog("No previous responses loaded.");
    }
    construct();
}

// Note: The callback is guaranteed to run because we set "document_start" in manifest.json
document.addEventListener('DOMContentLoaded', () => {
    grokAdapter();
});

