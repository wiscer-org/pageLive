export default class ElementObserver {
    findElement !: () => Promise<HTMLElement | null>;
    onElementFound !: (element: HTMLElement) => void;
    onElementDisconnected?: (element: HTMLElement) => void;
    // The element being observed - the focus of this class
    element: HTMLElement | null = null;
    container !: HTMLElement;

    checkElementTimeout: number = 1e3;
    checkElementTimeoutId: ReturnType<typeof setTimeout> | null = null;

    elementObserver: MutationObserver = new MutationObserver(() => {
        this.scheduleCheckElement();
    });

    constructor(
        findElement: () => Promise<HTMLElement | null>
        , onElementFound: (element: HTMLElement) => void
        , container: HTMLElement | null
        , onElementDisconnected?: (element: HTMLElement) => void
    ) {
        this.findElement = findElement;
        this.onElementFound = onElementFound;
        if (container)
            this.container = container;
        else
            this.container = document.body;
        if (onElementDisconnected)
            this.onElementDisconnected = onElementDisconnected;
    }
    observe() {
        this.elementObserver.observe(this.container, {
            childList: true,
            subtree: true,
            attributes: true, // For class or other attribute changes
        });
        this.scheduleCheckElement();
    }
    disconnect() {
        this.elementObserver.disconnect();
        if (this.checkElementTimeoutId) {
            clearTimeout(this.checkElementTimeoutId);
        }
    }
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

    handleElementFound(element: HTMLElement) {
        this.onElementFound(element);
    }

    async handleElementDisconnected() {
        if (this.element && this.onElementDisconnected) {
            this.onElementDisconnected(this.element);
        }
        this.element = null;
    }
}