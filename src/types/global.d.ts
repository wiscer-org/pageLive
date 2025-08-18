
// src/types/global.d.ts

import PageLive from "../content-scripts/pagelive";
import KeybindManager from "../content-scripts/keybind-manager";

// Global type declaration for pageLiveAnnounce on the Window interface
declare global {

    // Extend the Window interface to include the pageLive object
    interface Window {
        // This will be ran under separate JS context in content scripts, so do not need to worry about conflicts with scripts of the page.
        pageLive: PageLive
        // Reference to statics
        PageLiveStatics: typeof PageLive = PageLive
    }
}

export { };
