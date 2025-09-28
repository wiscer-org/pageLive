// This function contains utility functions used by content scripts.

/**
 * Checks if a string is a random alphanumeric ID that contains at least three digits.
 * @param {string} str The string to check.
 * @returns {boolean} True if the string is a valid ID, otherwise false.
 * 
 * Example usage:
 * const id3 = "12345"; // All digits
 * const id4 = "justletters"; // No digits 
 * console.log(`"${id1}" is a valid ID: ${isRandomIdWithMinThreeDigits(id1)}`); // true
 * console.log(`"${id2}" is a valid ID: ${isRandomIdWithMinThreeDigits(id2)}`); // false
 * console.log(`"${id3}" is a valid ID: ${isRandomIdWithMinThreeDigits(id3)}`); // true
 * console.log(`"${id4}" is a valid ID: ${isRandomIdWithMinThreeDigits(id4)}`); // false
 */
export function isRandomString(str: string): boolean {
    if (typeof str !== 'string' || str.length === 0) {
        return false;
    }
    // This regex uses a positive lookahead `(?=(?:.*[0-9]){3})` to ensure there are at least three digits.
    const isRandomAlphanumbericRegex = /^(?=(?:.*[0-9]){3})[a-zA-Z0-9]+$/;
    return isRandomAlphanumbericRegex.test(str);
}

/**
 * Wait until the given element is idle.
 * This function will set MutationObserver to the element. 
 * Will be resolved, considered as idle, if after some delay there is no more mutations of the element
 * @param {HTMLElement} el The element to be observed
 * @param {number} delay The delay in miliseconds for there is no more mutations on the element to be considered as idle. Default value: 300 ms.
 * @return {Promise<void>} Will be resolved after the element is idle
 */
export async function untilElementIdle(el: HTMLElement, delay = 300): Promise<void> {
    // The id of timeout to resolve
    let resolveTimeout: ReturnType<typeof setTimeout>;

    // Return a promise
    return new Promise((resolve) => {
        // Schedule to resolve
        const scheduleToResolve = (observer: MutationObserver) => {
            resolveTimeout = setTimeout(() => {
                // Cancel the timeout, if has been set
                if (resolveTimeout) clearTimeout(resolveTimeout);

                // Disconnet observer
                observer.disconnect();

                resolve();
            }, delay);
        }
        // The observer. We will only observe if there are any mutations happened on the element.
        const idleObserver = new MutationObserver((mutations, observer) => {
            // Everytime mutations happened, schedule to resolve and cancel the last schedule
            scheduleToResolve(observer);
        })

        // Observer the element.
        idleObserver.observe(el, {
            childList: true, // As the indication that the element is still busy
        })

        // Schedule to resolve, useful if the element is already idle
        scheduleToResolve(idleObserver);
    });
}

/**
 * Wait for an element. The wait time will be gradually increased until giving up
 * @param {string} selector The element selector
 * @param {number} maxWaitTime Maximum seconds to wait for the element to exist. Default: 60 seconds
 * @return {Promise <HTMLElement|null}  The element
 */
export async function waitForAnElement(selector: string, maxWaitTime = 60e3): Promise<HTMLElement | null> {
    // The element 
    let element: HTMLElement | null = null;

    // Incremental interval
    let interval = 200;
    let waited = 0;

    while (!element && waited < maxWaitTime) {
        await new Promise(res => setTimeout(res, interval));
        waited += interval;

        // increase interval to reduce number of loops
        interval = Math.min(interval + 100, 3000); // Cap the interval to a maximum of 3 seconds

        element = document.querySelector(selector) as HTMLElement | null;
    }
    return element;
}

/**
 * Used for development only to log messages
 * @param {string} msg The log to print out
 * @return {void}
 */
export function devLog(msg: string): void {
    // TODO check if this is DEV
    console.log(`[PageLive][dev] ${msg}`);
    console.log(msg);
}

/**
 * Print warnings used in production
 */
export function prodWarn(msg: string) {
    console.warn(`[PageLive] ${msg}`);
}