// general.ts - Injected into all pages
console.log('[PageLive] general.ts loaded on', window.location.hostname);

(function () {
    // Encapsulate all logic in pageLive2a2b object
    const pageLive2a2b = {
        PAGE_LIVE_CONTAINER_ID: 'pagelive2a2b',
        ANNOUNCE_CONTAINER_ID: 'announce2a2b',
        // Timeout before element containing the each announcement is removed.
        ANNOUNCE_ITEM_TIMEOUT: 42e3,


        ensurePageLiveContainer() {
            let container = document.getElementById(this.PAGE_LIVE_CONTAINER_ID);
            if (!container) {
                container = document.createElement('div');
                container.id = this.PAGE_LIVE_CONTAINER_ID;

                // Determine environment
                const isDev = process.env.NODE_ENV === 'development';
                if (isDev) {
                    container.className = 'dev';
                }

                document.body.appendChild(container);
            }
            let announce = document.getElementById(this.ANNOUNCE_CONTAINER_ID);
            if (!announce) {
                announce = document.createElement('div');
                announce.id = this.ANNOUNCE_CONTAINER_ID;
                announce.setAttribute('aria-live', 'polite');
                container.appendChild(announce);
            }
        },
        announce(announceObj: { msg: string }) {
            this.ensurePageLiveContainer();
            const announceDiv = document.getElementById(this.ANNOUNCE_CONTAINER_ID);
            if (announceDiv) {
                const msgDiv = document.createElement('div');
                // msgDiv.setAttribute('aria-live', 'polite');
                msgDiv.textContent = announceObj.msg;
                msgDiv.style.border = '2px solid orange';
                msgDiv.style.marginBottom = '4px';

                announceDiv.appendChild(msgDiv);
                setTimeout(() => {
                    announceDiv.removeChild(msgDiv);
                }, this.ANNOUNCE_ITEM_TIMEOUT);
            }
        },
        init() {
            this.ensurePageLiveContainer();
        }
    };

    // Expose pageLive2a2b globally with type
    (window as any).pageLive2a2b = pageLive2a2b;

    // Initialize on script load
    pageLive2a2b.init();
})();
