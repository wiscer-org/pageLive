import PageLive from "../../pagelive";
import ChatGPTChatListDialog from "./chatgpt-chat-list-dialog";
import ChatGPTChatSection from "./chatgpt-chat";
import ChatGPTSidebar from "./chatgpt-sidebar";
import ChatGptShortcutDialog from "./chatgpt-shortcut-dialog";
import { Keybinds } from "../../keybind-manager";
import featureStartNewChat from "../features/start-new-chat";
import AIChatHelper from "../features/ai-chat-helper";

const chatgptAdapter = async () => {
    const pl = new PageLive();
    const aiChatHelper = new AIChatHelper();

    const construct = async () => {

        const chatShortcutDialog = new ChatGptShortcutDialog(pl);
        const chatSectionAdapter = new ChatGPTChatSection(pl, {
            isNewChat
            , setResponsesCount
        });
        const sidebarAdapter = new ChatGPTSidebar(pl, chatSectionAdapter.focusChatInput.bind(chatSectionAdapter));
        const chatListDialogAdapter = new ChatGPTChatListDialog(pl);

        // Implement keybinds
        pl.keybindManager.registerKeybind(Keybinds.AnnounceLastResponse, chatSectionAdapter.announceLastResponse.bind(chatSectionAdapter));
        pl.keybindManager.registerKeybind(Keybinds.FocusChatInput, chatSectionAdapter.focusChatInput.bind(chatSectionAdapter));
        pl.keybindManager.registerKeybind(Keybinds.NewChat, () => featureStartNewChat(pl, null, '/'))

        // Add 'More Keybinds'
        pl.pageInfoDialog.addMoreKeybind('Ctrl + / ', 'Toggle Keyboard Shortcuts');
        pl.pageInfoDialog.addMoreKeybind('Ctrl + Shift + K', 'Open Search Chat Dialog');
        pl.pageInfoDialog.addMoreKeybind('Ctrl + Shift + S', 'Toggle sidebar');
        pl.pageInfoDialog.addMoreKeybind('Ctrl + Shift + ;', 'Copy Last Code Block');
        pl.pageInfoDialog.addMoreKeybind('Ctrl + Shift + Backspace', 'Delete Current Chat');

        handleChatTitle();
        await handlePageInfo();

        await pl.page.ready();
    }

    /**
     * Parse and display chat title to related element
     */
    const handleChatTitle = () => {
        pl.pageInfoDialog.onEveryOpenCallback = async () => {
            // Get the title
            let chatTitle = `Chat Title: ${document.title}`;
            if (isNewChat()) chatTitle = 'New Chat';
            else if (!chatTitle) chatTitle = 'Chat Title: Unknown';
            pl.pageInfoDialog.setTitle(chatTitle);
        };
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

    const setResponsesCount = (rCount: number) => {
        aiChatHelper.setResponsesCount(rCount);
    }

    /**
     * Handle interaction with PageInfo
     */
    const handlePageInfo = async () => {
        // Append
        pl.pageInfoDialog.pageAdapterContainer.appendChild(aiChatHelper.getPageInfoTop());
    }

    await construct();

}

// Note: The callback is guaranteed to run because we set "document_start" in manifest.json
document.addEventListener('DOMContentLoaded', () => {
    chatgptAdapter().catch((err) => {
        console.error("Error initializing ChatGPT page adapter:", err);
    });
});
