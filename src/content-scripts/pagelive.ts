import KeybindManager from "./keybind-manager";
import { PageInfoDialog } from "./page-info";
import Page from "./page";
import * as utils from "./util";
import * as dev from './general-dev';
import * as devMock from './general-dev-mock';
import './pagelive.css';
/**
* This class is the connecting point for all the shared libraries in the PageLive extension.
* This class will be initialized and used in the `PageAdapter` content scripts, e.g.: gemini.ts, grok.ts, reddit.ts, etc.
* To avoid name conflicts with the PageAdapters, PageAdapters need to be inside IIEF.
*/
export default class PageLive {
    // Provide types to be used in the PageAdapters.
    static KeybindManager = KeybindManager;

    // Definite assignment assertion
    pageLiveContainerId!: string;
    // announceContainerId!: string;
    // Timeout before element containing the each announcement is removed.
    announceItemTimeout!: number; // Timeout before element containing the each announcement is removed.
    // The main container for the PageLive extension
    container!: HTMLDivElement;
    // Announce container element
    ANNOUNCE_CONTAINER_ID!: string;
    announceContainer!: HTMLDivElement;
    // Dummy non-form element to force SR to switch to browse mode
    dummySpanElement!: HTMLSpanElement;
    // Infos to be announced after the PageLive is initialized
    // Definite Assignment Assertion, because assigning an array may result in 'undefined'
    initialAnnounceInfo!: string[];

    // Other libraries
    // Declare the property with the definite assignment assertion (!)
    page!: Page;
    keybindManager!: KeybindManager;
    pageInfoDialog!: PageInfoDialog;
    utils = utils;

    // This is to decide later whether this is dev or prod
    isDev = false;

    // Development utilities, only available in development mode
    dev = this.isDev ? devMock : dev;

    constructor() {
        // Set the definite assigment
        this.pageLiveContainerId = 'pagelive';
        // this.announceContainerId = 'announce';
        this.announceItemTimeout = 40e3;
        this.ANNOUNCE_CONTAINER_ID = 'announce-list'

        this.container = document.createElement('div');
        this.announceContainer = document.createElement('div');
        this.dummySpanElement = document.createElement('span');

        this.initialAnnounceInfo = [
            "PageLive is ready.",
            "Press Alt + / for more info.",
        ]

        // Initiliaze the definite assignment assertion (!)
        this.page = new Page(this);
        this.keybindManager = new KeybindManager(this);
        this.pageInfoDialog = new PageInfoDialog(this);

        this.init();
    }
    /**
     * Initializes the PageLive container and applies styles.
     */
    async init() {
        // Check if this DEV or PROD
        // Note: This set by vite, based on the `build:watch` command in package.json. Meanwhile import.meta.env.PROD will return if it is PRODUCTION
        // accessing `import.meta.env` in constructor will result in `undefined`. Assumed it has not been set as result of vite process.
        this.isDev = import.meta.env.DEV;

        console.log('[PageLive] Initializing PageLive...');
        // Prepare the main container for PageLive
        this.preparePageLiveContainer();

        // Ensure the PageLive container is present in the DOM
        this.ensurePageLiveContainer();

        // Prepare and ensure the announce container
        this.prepareAnnounceContainer();

        this.prepareNonFormDummyElement();
    }
    prepareNonFormDummyElement() {
        this.dummySpanElement = document.createElement("span");
        this.dummySpanElement.textContent = ""
        this.dummySpanElement.setAttribute("tabindex", "-1");
        this.dummySpanElement.setAttribute("pl-info", "dummy-element");
        // this.dummyFocusableElement.style.position = "absolute";
        // this.dummyFocusableElement.style.left = "-9999px";
        this.container.appendChild(this.dummySpanElement);
    }
    /**
     * This function will announce initial info (info only after the page is loaded) with some delay. 
     */
    public async announceInitialInfo() {
        // Wait for a short time to ensure the page is fully loaded before announcing
        await new Promise(r => setTimeout(r, 1500));
        // Announce all initial info as a single message, to avoid screen reader read non-PageLive messages in between these initial infos.
        this.announce({
            msg: this.initialAnnounceInfo.join(' '),
            o: true
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
        container.classList.add('pl-sr-only');
        // Note: For now, apply prod styles always
        if (this.isDev) {
            // if (false) {
            container.classList.add('dev-mode');
        } else {
            container.classList.remove('dev-mode');
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
            document.body.appendChild(this.container);
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

    announce(announceObj: {
        // Message to be announced
        msg: string
        // Optional: If true, will not pre-announce the message. The pre-announce message is 'PageLive', which will help users to identify messages from PageLive.
        , o?: boolean,
    }) {
        this.ensurePageLiveContainer();

        const announceDiv = document.getElementById(this.ANNOUNCE_CONTAINER_ID);
        if (announceDiv) {

            // If `isPrependMsg` is true, announce 'PageLive' first
            if (!announceObj.o) {
                this.announce({ msg: 'PageLive', o: true });
            }

            // Announce the message
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
    /**
     * A simplified function of `announce`
     */
    speak(msg: string) {
        if (!this.announceContainer) {
            this.utils.prodWarn('Announce container not found when calling speak().');
            return;
        }
        if (this.announceContainer.isConnected === false) {
            this.utils.prodWarn('Announce container is not connected when calling speak().');
            return;
        }

        // Announce the message
        const msgDiv = document.createElement('div');
        msgDiv.innerHTML = msg;

        this.announceContainer.appendChild(msgDiv);
        setTimeout(() => {
            this.announceContainer.removeChild(msgDiv);
        }, this.announceItemTimeout);
    }
    /**
     * Function to give consistency when focusing chat input element. 
     * @param chatInput The chat input element to be focused.
     */
    async focusChatInput(chatInput: HTMLElement | null) {
        if (!chatInput || !chatInput.isConnected) {
            this.announce({ msg: "Chat input not found", o: false })
            return;
        }
        if (chatInput) {
            // Close any dialogs / modals first
            this.pageInfoDialog?.close();
            // contentMapper.close();

            // In SR browse mode, SR will not read the input eventhough the focus is at the input element.
            // By change focus to other element first, before change focus to the input, will force the SR change to Form/Input mode. Thus, user can type right away without having to change SR mode.
            this.dummySpanElement.focus();

            // Wait very very quick
            await new Promise(r => setTimeout(r, 50));

            chatInput.focus();
            // No need to announce, since screen reader will read the focused element automatically.
        }
    }
    /**
     * This function will announce the last response.
     */
    async announceLastResponse(responseElement: HTMLElement | null) {
        this.utils.devLog('Announcing last response');

        // A bit of notification that the last response is goig to be announced.
        // This seems to be useful while waiting to find the last response element (if needed).
        this.announce({
            msg: "Reading last response.",
            // No need to preannounce, since this is a user triggered action.
            o: true
        });

        // Get the last response element        // Prepare the message to be announced.
        let toBeAnnounced = "No response element is found.";
        if (responseElement) {
            toBeAnnounced = responseElement.innerHTML || '';
        }

        // Announce
        this.announce({
            msg: toBeAnnounced, o: true,
        });
    }
}


document.addEventListener('DOMContentLoaded', () => {

    // Initialize the PageLiveClass and attach it to the window object
    // (window as any).pageLive = new PageLive();
    // Initialize the PageLive class as a static property on the window object
    // (window as any).PageLiveStatics = PageLive;

});