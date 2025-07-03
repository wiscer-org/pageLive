// general.ts - Injected into all pages
console.log('[PageLive] general.ts loaded on', window.location.hostname);

(function () {
    // Encapsulate all logic in pageLive2a2b object
    const pageLive2a2b = {
        PAGE_LIVE_CONTAINER_ID: 'pagelive2a2b',
        ANNOUNCE_CONTAINER_ID: 'announce2a2b',
        // Timeout before element containing the each announcement is removed.
        ANNOUNCE_ITEM_TIMEOUT: 42e3,


        applyContainerStyle(container: HTMLElement) {
            const isDev = process.env.NODE_ENV === 'development';
            if (isDev) {
                container.style.position = 'fixed';
                container.style.top = '0';
                container.style.left = '0';
                container.style.zIndex = '99999';
                container.style.background = 'rgba(255,255,0,0.2)';
                container.style.border = '2px solid orange';
                container.style.padding = '8px';
                container.style.width = '100vw';
                container.style.height = 'auto';
                container.style.color = 'black';
            } else {
                container.style.position = 'absolute';
                container.style.width = '1px';
                container.style.height = '1px';
                container.style.overflow = 'hidden';
                container.style.clipPath = 'inset(50%)';
                container.style.margin = '-1px';
                container.style.padding = '0';
                container.style.border = '0';
                container.style.background = 'none';
            }
        },

        ensurePageLiveContainer() {
            let container = document.getElementById(this.PAGE_LIVE_CONTAINER_ID);
            if (!container) {
                container = document.createElement('div');
                container.id = this.PAGE_LIVE_CONTAINER_ID;
                this.applyContainerStyle(container);
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
                msgDiv.innerHTML = announceObj.msg;
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
