// general.ts - Injected into all pages
console.log('PageLive general.ts loaded on', window.location.hostname);

// ID for the main container
export const PAGE_LIVE_CONTAINER_ID = 'pagelive234';
// ID for the announce container
export const ANNOUNCE_CONTAINER_ID = 'announce234';
// Create the main container for PageLive if it doesn't exist
function ensurePageLiveContainer() {
    let container = document.getElementById(PAGE_LIVE_CONTAINER_ID);
    if (!container) {
        container = document.createElement('div');
        container.id = PAGE_LIVE_CONTAINER_ID;
        container.style.position = 'absolute';
        container.style.width = '1px';
        container.style.height = '1px';
        container.style.overflow = 'hidden';
        container.style.clipPath = 'inset(50%)';
        container.style.margin = '-1px';
        container.style.padding = '0';
        container.style.border = '0';
        container.style.background = 'none';
        container.setAttribute('aria-hidden', 'true');
        document.body.appendChild(container);
    }
    let announce = document.getElementById(ANNOUNCE_CONTAINER_ID);
    if (!announce) {
        announce = document.createElement('div');
        announce.id = ANNOUNCE_CONTAINER_ID;
        container.appendChild(announce);
    }
}

// Announce object type
export type Announce = {
    msg: string;
};

// Function to announce a message
export function pageLiveAnnounce(announceObj: Announce) {
    ensurePageLiveContainer();
    const announceDiv = document.getElementById(ANNOUNCE_CONTAINER_ID);
    if (announceDiv) {
        const msgDiv = document.createElement('div');
        msgDiv.setAttribute('aria-live', 'polite');
        msgDiv.textContent = announceObj.msg;
        announceDiv.appendChild(msgDiv);
        // Optionally, remove after a delay to avoid DOM bloat
        setTimeout(() => {
            announceDiv.removeChild(msgDiv);
        }, 5000);
    }
}

// Initialize on script load
ensurePageLiveContainer();
