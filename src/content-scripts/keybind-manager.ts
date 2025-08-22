// This file manage all processes related to keybind, except the keybind handlers.
import isequal from "lodash.isequal";
import PageLive from "./pagelive";

// Type to list which keys are used in certain keybind
export type KeybindDetailKeys = {
    ctrlKey: boolean,
    shiftKey: boolean,
    altKey: boolean,
    metaKey: boolean,
    key: string // The actual key pressed
}
// Detail of keybinds, which will be used to register the keybinds
type KeybindDetail = {
    description: string; // A brief description of the keybind's purpose
    action: () => void; // The function to execute when the keybind is triggered
    keys: KeybindDetailKeys; // Optional: The keys used in the keybind, if applicable
}

/**
 * List of predefined keybinds, to keep keybind list persistent accros PageAdapters
 */
export enum Keybinds {
    ModalToggle = ' Ctrl + /', // Toggle the modal
    ChatCurrentDelete = 'Ctrl + Shift + Backspace', // Delete current chat
    FocusChatInput = 'Shift + Esc', // Focus the chat input
    AnnounceLastResponse = 'Ctrl + Alt + r', // Announce the last response
}

/**
 * Creates a keybind detail object with the specified keybind, action, and optional description.
 * @param keybind The keybind to create the detail for.
 * @param action The action to execute when the keybind is triggered.
 * @param description An optional description of the keybind's purpose.
 * @returns A KeybindDetail object containing the keybind information.
 */
const createKeybindDetail = (
    keybind: Keybinds,
    action: () => Promise<void>,
    description?: string
): KeybindDetail => {

    let keybindDetail: KeybindDetail;

    switch (keybind) {
        case Keybinds.ModalToggle:
            keybindDetail = {
                description: description || 'Toggle the modal',
                action: action,
                keys: {
                    ctrlKey: true,
                    key: '/',
                    altKey: false,
                    shiftKey: false,
                    metaKey: false,
                }
            };
            break;
        case Keybinds.ChatCurrentDelete:
            keybindDetail = {
                description: description || 'Delete current chat',
                action: action,
                keys: {
                    ctrlKey: true,
                    shiftKey: true,
                    key: 'Backspace',
                    altKey: false,
                    metaKey: false,
                }
            };
            break;
        case Keybinds.FocusChatInput:
            keybindDetail = {
                description: description || 'Focus the chat input',
                action: action,
                keys: {
                    ctrlKey: false,
                    shiftKey: true,
                    key: 'Escape',
                    altKey: false,
                    metaKey: false,
                }
            };
            break;
        case Keybinds.AnnounceLastResponse:
            keybindDetail = {
                description: description || 'Announce the last response',
                action: action,
                keys: {
                    ctrlKey: true,
                    shiftKey: true,
                    key: 'Enter',
                    altKey: false,
                    metaKey: false,
                }
            };
            break;
        default:
            // Raise system error if the keybind is not recognized
            alert(`[PageLive] Keybind ${keybind} is not recognized.`);

            keybindDetail = {
                description: description || 'No description provided',
                action: () => Promise.resolve(),
                keys: {
                    ctrlKey: false,
                    shiftKey: false,
                    altKey: false,
                    metaKey: false,
                    key: '', // Default key is empty
                },
            };
    }

    return keybindDetail;
}


/**
 * KeybindManager manage all actions related to keybinds in the browser., except the keybind handlers.
 * The keybind handlers will be provided by each page content script (PageAdapter) respectively.
 */
export default class KeybindManager {
    // References to types
    static Keybinds = Keybinds;

    private pageLive: PageLive;
    public keybinds: Map<Keybinds, KeybindDetail> = new Map();

    constructor(pageLive: PageLive) {
        this.pageLive = pageLive;
        this.initializeKeybinds();

        // Create a keybind listener to match with the registered keybinds
        this.createKeybindListener();
    }
    /**
     * Initializes the default keybinds by registering them with their corresponding actions.
     */
    private initializeKeybinds() {
        // Initialize default keybinds here

        // Registering the predefined keybinds with their actions
        this.registerKeybind(Keybinds.ModalToggle, async () => {
            // Toggle the modal dialog
            this.pageLive.dialogManager.toggleModal();
        }, 'Toogle PageLive modal');
    }

    /**
     * Registers a keybind with a specific action.
     * @param key The key combination (e.g., 'Ctrl+S').
     * @param action The function to execute when the keybind is triggered.
     */
    public registerKeybind(keybind: Keybinds, action: () => Promise<void>, description?: string) {
        console.log(`[PageLive] Registering keybind: ${keybind}`);
        this.keybinds.set(keybind, createKeybindDetail(keybind, action, description));

        // Update the keybinds list in the dialog manager
        if (this.pageLive.dialogManager) {
            // Dialog manager might not be initialized yet, so check if it exists. 
            this.pageLive.dialogManager.renderKeybindsInfo();
        } else {
            // Dialog manager not yet initialized is not a error. It happens when the keybind registration during this class initialization.
            console.log("[PageLive] Dialog manager is not initialized yet, skipping re-rendering keybinds info.");
        }

    }

    /**
     * Creates a keybind listener that listens for keydown events and triggers the corresponding action based on the pressed keys.
     */
    private createKeybindListener() {
        document.addEventListener('keydown', (event) => {

            // Collect the keys pressed in the event
            const pressedKeys: KeybindDetailKeys = {
                ctrlKey: event.ctrlKey || false,
                shiftKey: event.shiftKey || false,
                altKey: event.altKey || false,
                metaKey: event.metaKey || false, // For MacOS, this is the Command key
                key: event.key // The actual key pressed (e.g., 'a', 'Enter
            };

            // console.log(`[PageLive] Key pressed: ${JSON.stringify(pressedKeys)}`);

            // Iterate through the registered keybinds and check if the pressed keys match any keybind
            for (const [keybind, keybindDetail] of this.keybinds.entries()) {
                if (isequal(keybindDetail.keys, pressedKeys)) {
                    event.preventDefault();
                    this.triggerKeybind(keybind);
                    break;
                }
            }
        });
    }

    /**
     * Triggers the action associated with the given keybind.
     * @param key The key combination to trigger.
     */
    public triggerKeybind(keybind: Keybinds) {
        const action = this.keybinds.get(keybind)?.action;
        if (action) {

            // Modify the action based on the `Keybinds` type
            switch (keybind) {
                case Keybinds.FocusChatInput:
                    this.pageLive.announce({
                        msg: "Chat input",
                        omitPreannounce: true, // User triggered, no need to preannounce
                    });
                    break;
                default:
                    // do nothing
                    break;
            }

            // Do the action
            action();
        } else {
            console.warn(`No action registered for key: ${keybind}`);
        }
    }
}