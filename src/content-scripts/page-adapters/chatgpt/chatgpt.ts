import PageLive from "../../pagelive";
import ElementObserver from "../../element-observer";
import ChatGPTChatListDialog from "./chatgpt-chat-list-dialog";
import ChatGPTChatSection from "./chatgpt-chat";
import ChatGPTSidebar from "./chatgpt-sidebar";
import ChatGptShortcutDialog from "./chatgpt-shortcut-dialog";

const chatgptAdapter = async () => {
    const pl = new PageLive();

    const construct = async () => {

        const chatShortcutDialog = new ChatGptShortcutDialog(pl);
        const chatSectionAdapter = new ChatGPTChatSection(pl);
        const sidebarAdapter = new ChatGPTSidebar(pl, chatSectionAdapter.focusChatInput.bind(chatSectionAdapter));
        const chatListDialogAdapter = new ChatGPTChatListDialog(pl);

        await pl.page.ready();
    }
    await construct();
}

// Note: The callback is guaranteed to run because we set "document_start" in manifest.json
document.addEventListener('DOMContentLoaded', () => {
    chatgptAdapter().catch((err) => {
        console.error("Error initializing ChatGPT page adapter:", err);
    });
});
