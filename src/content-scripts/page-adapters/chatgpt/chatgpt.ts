import PageLive from "../../pagelive";
import ChatGPTChatListDialog from "./chatgpt-chat-list-dialog";
import ChatGPTChatSection from "./chatgpt-chat";
import ChatGPTSidebar from "./chatgpt-sidebar";
import ChatGptShortcutDialog from "./chatgpt-shortcut-dialog";
import { Keybinds } from "../../keybind-manager";
import featureStartNewChat from "../features/start-new-chat";

const chatgptAdapter = async () => {
    const pl = new PageLive();

    const construct = async () => {

        const chatShortcutDialog = new ChatGptShortcutDialog(pl);
        const chatSectionAdapter = new ChatGPTChatSection(pl, {
            isNewChat
        });
        const sidebarAdapter = new ChatGPTSidebar(pl, chatSectionAdapter.focusChatInput.bind(chatSectionAdapter));
        const chatListDialogAdapter = new ChatGPTChatListDialog(pl);

        // Implement keybinds
        pl.keybindManager.registerKeybind(Keybinds.AnnounceLastResponse, chatSectionAdapter.announceLastResponse.bind(chatSectionAdapter));
        pl.keybindManager.registerKeybind(Keybinds.FocusChatInput, chatSectionAdapter.focusChatInput.bind(chatSectionAdapter));
        pl.keybindManager.registerKeybind(Keybinds.NewChat, () => featureStartNewChat(pl, null, '/'))

        await pl.page.ready();
    }

    /**
     * Check if this is a new chat based on URL
     */
    const isNewChat = (url?: string | undefined): boolean => {
        if (!url) url = window.location.href;
        // If url is the base url, it is an empty chat
        const baseUrlPattern = /^https:\/\/chatgpt\.com\/?$/;
        if (baseUrlPattern.test(url)) {
            return true;
        }
        return false;
    }

    await construct();
}

// Note: The callback is guaranteed to run because we set "document_start" in manifest.json
document.addEventListener('DOMContentLoaded', () => {
    chatgptAdapter().catch((err) => {
        console.error("Error initializing ChatGPT page adapter:", err);
    });
});
