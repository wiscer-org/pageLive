import PageLive from "./pagelive"


/**
 * This class is a manager for everything related to the dialog in the PageLive extension.
 * This class could be considered as a wrapper for <Dialog> HTML element.
 * It also provides methods to render dialogs with different content, such as:
 * - Rendering a snapshot info about the current page.
 * - Rendering a list of available keybinds / shortcuts.
 */
export class DialogManager {
    private pageLive: PageLive;
    private dialogId: string = 'dialog2a2b';
    private dialog: HTMLDialogElement;
    private snapshotInfos: string[] = [];
    private snapshotInfosElement: HTMLDivElement = document.createElement('div');
    // The container of keybind list 
    private keybindsContainer: HTMLDivElement = document.createElement('div');

    /**
     * Constructor 
     * @param {PageLive} pageLive - The instance of the PageLive class to access the main functionality.
     * @param {string} dialogId - Optional, the ID of the dialog element.
     */
    constructor(pageLive: PageLive, dialogId?: string) {
        this.pageLive = pageLive;

        if (dialogId) this.dialogId = dialogId;

        this.dialog = this.initDialogElement();

        this.init();
    }

    /**
     * Same functionality as the native HTMLDialogElement.showModal() method.
     */
    public showModal() {
        this.dialog.showModal();

        // Note: Do not announce anything when the modal is opened, because the screen reader will read the dialog content automatically.
    }
    /**
     * Same functionality as the native HTMLDialogElement.close() method.
     */
    async close() {
        this.dialog.close();

        // Wait a bit, to avoid screen reader read 'assertive' aria-live from other elements in the page.
        await new Promise(resolve => setTimeout(resolve, 800));

        // Announce that the dialog is closed
        this.pageLive.announce({
            msg: "PageLive modal is closed.",
        });
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

        // Attach listeners specific to the dialog
        this.attachDialogListeners();

        // Create content for the dialog
        this.renderSnapshotInfo();
        this.initKeybindsContainer();
        this.renderKeybindsInfo();
        this.renderPageLiveInfo();
    }
    attachDialogListeners() {
        // Add keylistener for `Esc` key to close the dialog
        this.dialog.addEventListener('cancel', (event) => {
            event.preventDefault(); // Prevent the default behavior of closing the dialog
            this.close(); // Call the close method to handle the dialog closing
        });
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
     * Set the snapshot infos and re-render to the dialog.
     * @param {string[]} snapshotInfos - The snapshot infos to be set.
     */
    public setSnapshotInfos(snapshotInfos: string[]): void {
        this.snapshotInfos = snapshotInfos;
        this.renderSnapshotInfo();
    }

    /**
     * This function will render a snapshot info about the current page to this dialog.
     */
    public renderSnapshotInfo(): void {
        // Clear the snapshot info element
        this.snapshotInfosElement.innerHTML = '';

        for (let i = 0; i < this.snapshotInfos.length; i++) {
            const info = document.createElement('p');
            info.textContent = this.snapshotInfos[i];
            this.snapshotInfosElement.appendChild(info);
        }

        // If the snapshot info element is not already in the dialog, append it
        if (!this.dialog.contains(this.snapshotInfosElement)) {
            this.dialog.appendChild(this.snapshotInfosElement);
        }
    }
    /**
     * Initializes the keybinds container and appends it to the dialog.
     */
    private initKeybindsContainer(): void {
        // Append the initialized keybinds container to the dialog
        this.dialog.appendChild(this.keybindsContainer);
    }
    /**
     * This function will render a dialog with a list of available keybinds / shortcuts.
     * It will include the keybinds and their descriptions.
     */
    public renderKeybindsInfo(): void {

        // Clear the keybinds container
        this.keybindsContainer.innerHTML = '';

        const header = document.createElement('h2');
        header.textContent = 'Available Keybinds / Shortcuts';
        this.keybindsContainer.appendChild(header);

        const keybindsList = document.createElement('ul');

        console.log("[PageLive] Rendering keybinds info in the dialog.");
        console.log(`keybinds length: ${this.pageLive.keybindManager.keybinds.size}`);

        // Iterate over the keybinds and create list items
        this.pageLive.keybindManager.keybinds.forEach((keybindDetail, key) => {
            const listItem = document.createElement('li');
            listItem.textContent = `${keybindDetail.description} : ${key}`;
            console.log(`adding list item: ${keybindDetail.description} : ${key}`);
            keybindsList.appendChild(listItem);
        });

        this.keybindsContainer.appendChild(keybindsList);
    }

    /**
     * This function will render a general info about the PageLive extension and the modal dialog.
     */
    private renderPageLiveInfo(): void {
        const infoContent = document.createElement('div');
        infoContent.innerHTML = `
            <h2>PageLive Extension</h2>
            <p>PageLive is a free chrome extension to help screen reader users to interact with specified web apps.</p>
            <p>Visit PageLive chrome web store to get more info about PageLive and the supported web pages.</p>
            <p>To close this modal, use Esc key or the shortcut Ctrl + /</p>
        `;
        this.dialog.appendChild(infoContent);
    }
    /**
     * This function will toggle the dialog visibility.
     * If the dialog is open, it will close it. If it is closed, it will open it.
     */
    async toggleModal() {
        if (this.dialog.open) {
            await this.close();

        } else {
            this.showModal();
        }
    }
}