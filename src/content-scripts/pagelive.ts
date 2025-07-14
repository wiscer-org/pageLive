
import KeybindManager from "./keybind-manager";
import { DialogManager } from "./dialog-manager";
import Page from "./page-adapter";
import * as dev from './general-dev';
import * as devMock from './general-dev-mock';

/**
 * This class is the connecting point for all the shared libraries in the PageLive extension.
 * This class will be initialized and used in the `PageAdapter` content scripts, e.g.: gemini.ts, grok.ts, reddit.ts, etc.
 * To avoid name conflicts with the PageAdapters, PageAdapters need to be inside IIEF.
 */
export default class PageLive {
    pageLiveContainerId: string = 'pagelive';
    announceContainerId: string = 'announce';
    // Timeout before element containing the each announcement is removed.
    announceItemTimeout: number = 42e3; // Timeout before element containing the each announcement is removed.
    // The main container for the PageLive extension
    container: HTMLDivElement = document.createElement('div');
    // Announce container element
    ANNOUNCE_CONTAINER_ID: string = 'announce-list';
    announceContainer: HTMLDivElement = document.createElement('div');

    // Other libraries
    page: Page = new Page();
    keybindManager: KeybindManager = new KeybindManager(this);
    dialogManager: DialogManager = new DialogManager(this);

    // Check if the environment is development
    isDev = process.env.NODE_ENV === 'development';

    // Development utilities, only available in development mode
    dev = this.isDev ? devMock : dev;

    constructor() {
        console.log('[PageLive] pagelive.ts loaded on ', window.location.hostname);
        this.init();
    }
    /**
     * Initializes the PageLive container and applies styles.
     */
    async init() {
        console.log('[PageLive] Initializing PageLive...');

        // Prepare the main container for PageLive
        this.preparePageLiveContainer();

        // Ensure the PageLive container is present in the DOM
        this.ensurePageLiveContainer();

        // Prepare and ensure the announce container
        this.prepareAnnounceContainer();

        // Announce to user about snapshot info & how to open the dialog
        this.announce({
            msg: "PageLive. Press Ctrl + / to open the dialog.",
        });

    }

    /**
     * 
     * This function will ensure that the ID is unique in the document.
     * @param {string} id - The ID to be used for the element.
     * @returns {string}
     */
    static createElementUniqueIdInDocument(id: string) {
        // Check if an element with the given ID already exists in the document
        let uniqueId = id;
        let counter = 1;
        while (document.getElementById(uniqueId)) {
            uniqueId = `${id}-${counter}`;
            counter++;
        }
        return uniqueId;
    }

    /**
     * Applies styles to the PageLive container.
     * @param {HTMLDivElement} container - The container to apply styles to.
     */
    applyContainerStyle(container: HTMLDivElement) {
        // For now, we will use the same styles for both dev and prod environments.
        // If needed, we can make the pageLive visible in dev mode.
        const isDev = false;

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
    }
    /**
     * Prepares the PageLive container by setting its ID and applying styles.
     */
    preparePageLiveContainer() {
        // Determine unique ID for PageLive container, based on the existing HTML page.
        this.pageLiveContainerId = PageLive.createElementUniqueIdInDocument(this.pageLiveContainerId);
        this.container.id = this.pageLiveContainerId;

        // Apply styles to the container
        this.applyContainerStyle(this.container);

        // Append the container to the body 
        document.body.appendChild(this.container);
    }

    /**
     * Ensures the PageLive container exists in the DOM.
     */
    ensurePageLiveContainer() {
        // Check if an element with the PAGE_LIVE_CONTAINER_ID exists, if not, create
        let container = document.getElementById(this.pageLiveContainerId) as HTMLDivElement;

        // If container not found, attach to the body
        if (!container) {
            document.body.appendChild
        }
    }
    /**
     * Prepares the announce container's attributes and ensure it exists in the DOM.
     */
    prepareAnnounceContainer() {
        // Ensure the announce container is present in the DOM
        this.announceContainer.id = this.ANNOUNCE_CONTAINER_ID;
        this.announceContainer.setAttribute('aria-live', 'polite');
        this.container.appendChild(this.announceContainer);
    }

    announce(announceObj: { msg: string }) {
        this.ensurePageLiveContainer();

        const announceDiv = document.getElementById(this.ANNOUNCE_CONTAINER_ID);
        if (announceDiv) {
            const msgDiv = document.createElement('div');
            msgDiv.innerHTML = announceObj.msg;
            // msgDiv.style.border = '2px solid orange';
            // msgDiv.style.marginBottom = '4px';

            announceDiv.appendChild(msgDiv);
            setTimeout(() => {
                announceDiv.removeChild(msgDiv);
            }, this.announceItemTimeout);
        } else {
            console.warn('[PageLive] Announce container not found. Cannot announce message.');
        }
    }
}

// Initialize the PageLiveClass and attach it to the window object
(window as any).pageLive = new PageLive();