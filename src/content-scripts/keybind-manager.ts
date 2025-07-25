// This file manage all processes related to keybind, except the keybind handlers.
import isequal from "lodash.isequal";
import PageLive from "./pagelive";

// Type to list which keys are used in certain keybind
type KeybindDetailKeys = {
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
    private pageLive: PageLive;
    public keybinds: Map<Keybinds, KeybindDetail> = new Map();

    constructor(pageLive: PageLive) {
        this.pageLive = pageLive;
        this.initializeKeybinds();
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
        this.keybinds.set(keybind, createKeybindDetail(keybind, action, description));

        document.addEventListener('keydown', (event) => {

            // Collect the keys pressed in the event
            const pressedKeys: KeybindDetailKeys = {
                ctrlKey: event.ctrlKey || false,
                shiftKey: event.shiftKey || false,
                altKey: event.altKey || false,
                metaKey: event.metaKey || false, // For MacOS, this is the Command key
                key: event.key // The actual key pressed (e.g., 'a', 'Enter
            };

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
            action();
        } else {
            console.warn(`No action registered for key: ${keybind}`);
        }
    }
}