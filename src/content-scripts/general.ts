// general.ts - Injected into all pages
console.log('PageLive general.ts loaded on', window.location.hostname);

(function () {
    // ID for the main container
    const PAGE_LIVE_CONTAINER_ID = 'pagelive234';
    // ID for the announce container within the main container
    const ANNOUNCE_CONTAINER_ID = 'announce234';
    function ensurePageLiveContainer() {
        let container = document.getElementById(PAGE_LIVE_CONTAINER_ID);
        if (!container) {
            container = document.createElement('div');
            container.id = PAGE_LIVE_CONTAINER_ID;
            // For testing: make the container and children visible
            // Comment out the styles below for production to hide the container
            // container.style.position = 'absolute';
            // container.style.width = '1px';
            // container.style.height = '1px';
            // container.style.overflow = 'hidden';
            // container.style.clipPath = 'inset(50%)';
            // container.style.margin = '-1px';
            // container.style.padding = '0';
            // container.style.border = '0';
            // container.style.background = 'none';
            // container.setAttribute('aria-hidden', 'true');
            // For testing, use visible styles:
            container.style.position = 'fixed';
            container.style.top = '0';
            container.style.left = '0';
            container.style.zIndex = '99999';
            container.style.background = 'rgba(255,255,0,0.2)';
            container.style.border = '2px solid orange';
            container.style.padding = '8px';
            container.style.width = '800px';
            container.style.height = 'auto';
            container.style.color = 'black';
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
    // (kept for reference, but not exported)
    type Announce = {
        msg: string;
    };

    // Expose pageLiveAnnounce globally
    (window as any).pageLiveAnnounce = function (announceObj: { msg: string }) {
        ensurePageLiveContainer();
        const announceDiv = document.getElementById(ANNOUNCE_CONTAINER_ID);
        if (announceDiv) {
            const msgDiv = document.createElement('div');
            msgDiv.setAttribute('aria-live', 'polite');
            msgDiv.textContent = announceObj.msg;
            announceDiv.appendChild(msgDiv);
            setTimeout(() => {
                announceDiv.removeChild(msgDiv);
            }, 5000);
        }
    };

    // Initialize on script load
    ensurePageLiveContainer();
})();
