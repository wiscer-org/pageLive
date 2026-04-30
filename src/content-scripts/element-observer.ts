/**
 * ElementObserver class to observe the presence of a specific element in the DOM and handle its connection and disconnection.
 */
export default class ElementObserver {
    // Function to find the element
    findElement !: () => Promise<HTMLElement | null>;
    // Callback when the element is found
    onElementFound !: (element: HTMLElement) => void;
    // Optional callback when the element is disconnected
    onElementDisconnected?: (element: HTMLElement) => void;
    // The element being observed - the focus of this class
    element: HTMLElement | null = null;
    // The container to observe for mutations. Defaults to document.body if not provided.
    container !: HTMLElement;

    // Timeout to check the element presence after each mutation on the container element. The lesser the time, the faster update in the cost of more CPU it may use.
    checkElementTimeout: number = 1e3;
    // The ID of the timeout for checking the element presence. Used to clear the timeout if needed.
    checkElementTimeoutId: ReturnType<typeof setTimeout> | null = null;

    elementObserver: MutationObserver = new MutationObserver(() => {
        this.scheduleCheckElement();
    });

    constructor(
        findElement: () => Promise<HTMLElement | null>
        , onElementFound: (element: HTMLElement) => void
        , container: HTMLElement | null
        , onElementDisconnected?: (element: HTMLElement) => void
        // Timeout to check for element presence again after mutations. The lesser the time, the faster update in the cost of more CPU it may use.
        , checkElementTimeout?: number  // In milliseconds
    ) {
        this.findElement = findElement;
        this.onElementFound = onElementFound;

        if (container) this.container = container;
        else this.container = document.body;

        if (onElementDisconnected) this.onElementDisconnected = onElementDisconnected;
        if (checkElementTimeout !== undefined) this.checkElementTimeout = checkElementTimeout;
    }
    /**
     * Start observing the container element for mutations and schedule the initial check for the element presence. This should be called to start the observation process.
     */
    observe() {
        this.elementObserver.observe(this.container, {
            childList: true,
            subtree: true,
            attributes: true, // For class or other attribute changes
        });
        this.scheduleCheckElement();
    }
    /**
     * Disconnect the observer and clear any pending timeouts to stop observing the element and prevent memory leaks.
     */
    disconnect() {
        this.elementObserver.disconnect();
        if (this.checkElementTimeoutId) {
            clearTimeout(this.checkElementTimeoutId);
        }
    }
    /**
     * Schedule a check for the element presence after a specified timeout. This is called after each mutation on the container element to ensure we check for the element presence after the DOM has settled.
     */
    scheduleCheckElement() {
        if (this.checkElementTimeoutId) {
            clearTimeout(this.checkElementTimeoutId);
        }
        this.checkElementTimeoutId = setTimeout(this.checkElement.bind(this), this.checkElementTimeout);
    }
    /**
     * Check for the element and handle if disconnected
     */
    async checkElement() {
        // Handle if element is disconnected
        if (!this.element?.isConnected) {
            await this.handleElementDisconnected();
        }

        // Try to find the element if not already found
        if (this.element === null) {
            this.element = await this.findElement();

            // If element found
            if (this.element) {
                this.handleElementFound(this.element);
            }
        }
    }

    /**
     * Callback to handle when the element is found. This will call the onElementFound callback provided in the constructor with the found element.
     * @param element The element tha was found
     */
    private handleElementFound(element: HTMLElement) {
        this.onElementFound(element);
    }

    /**
     * Handle when the element is disconnected
     */
    private async handleElementDisconnected() {
        if (this.element && this.onElementDisconnected) {
            this.onElementDisconnected(this.element);
        }
        this.element = null;
    }
}