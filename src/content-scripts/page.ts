import PageLive from "./pagelive";
import { Chat } from "../types/chat";

/**
 * This class is used to represent the information about the page, as a result of the page adapter.
 * Information includes the snapshot info about the page, e.g. 'chat title', '12 chats exist', '4 new notifications', etc.
 * This class will be instantiated by the PageLive instance, to hold the data from the page adapter (the file specific for certain page, e.g. 'gemini.ts', 'grok.ts', etc.).
 * The reason this class will not be instantiated directly is to avoid conflicts with the PageLive and related scripts.
 * For the same reason, this page adapter will be wrapped in IIEF. Page also will not import other scripts directly, but will use the PageLive instance to access them.
 */
export default class Page {
    // PageLive instance to access the main functionality
    private pageLive: PageLive;
    // The short name of the page adapter, e.g. 'gemini', 'grok', etc.
    name: string = "";
    // The list of snapshot info about the page, e.g. '2 previous chats', 'starting a new chat', '4 new notifications', etc.
    private snapshotInfo: string[] = [];
    // The current active chat, if applicable
    activeChat: Chat | null = null

    /**
     * Constructor
     * @param {PageLive} pageLive - The instance of the PageLive class to access the main functionality.
     */
    constructor(pageLive: PageLive, name?: string) {
        this.pageLive = pageLive;
    }

    /**
     * This method is to set the snapshot info about the page.
     * It will also announce the snapshot info if it has not been announced yet.
     */
    async setSnapshotInfo(info: string[]) {
        this.snapshotInfo = info;
    }
    /**
     * Mark the page as ready, and announce initial info.
     */
    async ready() {
        // Trigger PageLive to announce initial info
        await this.pageLive.announceInitialInfo();
    }

    /**
     * This method will announce all the snapshot info with a little delay.
     */
    async announceSnapshotInfos() {
        // All snapshot infos to be announced as a single message, to avoid screen reader read non-PageLive messages in between these snapshot infos.
        const snapshotInfoMessage = this.snapshotInfo.join(' ');
        this.pageLive.announce({
            msg: snapshotInfoMessage,
        });
    }
}