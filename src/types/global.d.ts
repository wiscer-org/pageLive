
// src/types/global.d.ts

// Global type declaration for pageLiveAnnounce on the Window interface
declare global {
    interface Window {
        // Note: The `2a2b` suffix is used to avoid conflicts with external apps or libraries
        pageLive2a2b: {
            PAGE_LIVE_CONTAINER_ID: string;
            ANNOUNCE_CONTAINER_ID: string;
            ensurePageLiveContainer: () => void;
            announce: (announceObj: { msg: string }) => void;
            init: () => void;
        };
    }
}

export { };
