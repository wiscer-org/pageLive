/**
 * This class will be instantiated by the PageLive instance, to hold the data from the page adapter (the file specific for certain page, e.g. 'gemini.ts', 'grok.ts', etc.).
 * The reason this class will not be instantiated directly is to avoid conflicts with the PageLive and related scripts.
 * For the same reason, this page adapter will be wrapped in IIEF. Page also will not import other scripts directly, but will use the PageLive instance to access them.
 */
export default class Page {
    // The short name of the page adapter, e.g. 'gemini', 'grok', etc.
    name: string = "";
    // The list of snapshot info about the page, e.g. '2 previous chats', 'starting a new chat', '4 new notifications', etc.
    snapshotInfo: string[] = [];
}