// This file manage all processes related to keybind, except the keybind handlers.
type KeybindDetail = {
    description: string; // A brief description of the keybind's purpose
    action: () => void; // The function to execute when the keybind is triggered
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
                action: action
            };
            break;
        case Keybinds.ChatCurrentDelete:
            keybindDetail = {
                description: description || 'Delete current chat',
                action: action
            };
            break;
        default:
            // Raise system error if the keybind is not recognized
            console.error(`[PageLive] Keybind ${keybind} is not recognized.`);

            keybindDetail = {
                description: description || 'No description provided',
                action: () => Promise.resolve()
            };
    }

    return keybindDetail;
}


/**
 * KeybindManager manage all actions related to keybinds in the browser., except the keybind handlers.
 * The keybind handlers will be provided by each page content script (PageAdapter) respectively.
 */
class KeybindManager {
    private keybinds: Map<Keybinds, KeybindDetail> = new Map();

    constructor() {
        this.initializeKeybinds();
    }
    /**
     * Initializes the default keybinds by registering them with their corresponding actions.
     */
    private initializeKeybinds() {
        // Initialize default keybinds here

        // Registering the predefined keybinds with their actions
<<<<<<< HEAD
        this.registerKeybind(Keybinds.ModalToggle, async () => {
=======
        this.registerKeybind(Keybinds.ModalToggle, () => {
>>>>>>> acabf2682298c7dfa11d8ae23ac4f86af8c6a9db
            // TODO do action to toggle the modal from other file. Modal should be managed by 1 component only.
            // Placeholder for modal toggle action
            console.log('Modal toggle action triggered');
        }, 'Toggle the modal');
    }

    /**
     * Registers a keybind with a specific action.
     * @param key The key combination (e.g., 'Ctrl+S').
     * @param action The function to execute when the keybind is triggered.
     */
    public registerKeybind(keybind: Keybinds, action: () => Promise<void>, description?: string) {
        this.keybinds.set(keybind, createKeybindDetail(keybind, action, description));
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