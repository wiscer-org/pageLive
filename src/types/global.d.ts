
// src/types/global.d.ts

// Global type declaration for pageLiveAnnounce on the Window interface
declare global {
    interface Window {
        // Note: The `pageLive` object is used as shared global object for PageLive functionality. 
        // This will be ran under separate JS context in content scripts, so do not need to worry about conflicts with scripts of the page.
        pageLive: {
            PAGE_LIVE_CONTAINER_ID: string;
            ANNOUNCE_CONTAINER_ID: string;
            ensurePageLiveContainer: () => void;
            announce: (announceObj: { msg: string }) => void;
            init: () => void;
        };
    }
}

export { };
