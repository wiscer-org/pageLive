
// src/types/global.d.ts

// Global type declaration for pageLiveAnnounce on the Window interface
declare global {
    /**
     * Type definitions for the PageLive extension.
     * This file contains global type declarations for the PageLive functionality.
     * It is used to ensure that the TypeScript compiler recognizes the global `pageLive` object on the `Window` interface.
     */

    type PageLive = {
        PAGE_LIVE_CONTAINER_ID: string;
        ANNOUNCE_CONTAINER_ID: string;
        ensurePageLiveContainer: () => void;
        announce: (announceObj: { msg: string }) => void;
        init: () => void;
    };
    
    // Extend the Window interface to include the pageLive object
    interface Window {
        // Note: The `pageLive` object is used as shared global object for PageLive functionality. 
        // This will be ran under separate JS context in content scripts, so do not need to worry about conflicts with scripts of the page.
        pageLive: PagLive,
    }
}

export { };
