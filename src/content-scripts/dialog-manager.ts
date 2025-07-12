import KeybindManager from "./keybind-manager";

/**
 * This class is a manager for everything related to the dialog in the PageLive extension.
 * This class could be considered as a wrapper for <Dialog> HTML element.
 * It also provides methods to render dialogs with different content, such as:
 * - Rendering a snapshot info about the current page.
 * - Rendering a list of available keybinds / shortcuts.
 */
export class DialogManager {
    private pageLive: PageLive;
    private keybindManager: KeybindManager;
    private dialogId: string = 'dialog2a2b';
    private dialog: HTMLDialogElement;
    /**
     * Constructor 
     * @param {PageLive} pageLive - The instance of the PageLive class to access the main functionality.
     * @param {KeybindManager} keybindManager - The instance of the KeybindManager to handle keybinds.
     * @param {string} dialogId - Optional, the ID of the dialog element.
     */
    constructor(pageLive: PageLive, keybindManager: KeybindManager, dialogId: string = 'pagelive-dialog') {
        this.pageLive = pageLive;
        this.keybindManager = keybindManager;
        this.dialogId = dialogId;

        this.dialog = this.initDialogElement();

        this.init();
    }

    /**
     * Same functionality as the native HTMLDialogElement.showModal() method.
     */
    public showModal() {
        this.dialog.showModal();
        // Announce that the dialog is shown

        // Announce the snapshot info
    }
    /**
     * Same functionality as the native HTMLDialogElement.close() method.
     */
    public close() {
    }

    /**
     * Initializes the dialog manager by ensuring the dialog container is present in the DOM.
     */
    private init(): void {
        this.initDialogElement();

        // Ensure the dialog container is present in the DOM
        this.pageLive.ensurePageLiveContainer();

        // Append <dialog> HTML element to the parent container if it does not exist.
        if (!document.getElementById(this.dialogId)) {
            this.pageLive.container.appendChild(this.dialog);
        } else {
            console.warn(`[PageLive][DialogManager] Dialog with ID ${this.dialogId} already exists. This should not happen.`);
        }
    }
    /**
    * Creates and prepare a dialog element
    * @returns {HTMLDialogElement} - The created dialog element.
    */
    private initDialogElement() {
        const dialog = document.createElement('dialog');
        dialog.id = this.dialogId;
        return dialog;
    }

    /**
     * This function will render a snapshot info about the current page to this dialog.
     */
    public renderSnapshotInfo(snapshotInfo: string): void {

    }
    /**
     * This function will render a dialog with a list of available keybinds / shortcuts.
     * It will include the keybinds and their descriptions.
     */
    private renderKeybindsInfo(): void {
        // TODO 

    }
}