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
 * @param {object} options Additional options for future expansion
 * @return {Promise<void>} Will be resolved after the element is idle
 */
export async function untilElementIdle(el: HTMLElement, delay = 300,
    options: {
        childList?: boolean,
        subtree?: boolean,
    } = { childList: true, subtree: false }): Promise<void> {
    // The id of timeout to resolve
    let resolveTimeout: ReturnType<typeof setTimeout>;

    // Return a promise
    return new Promise((resolve) => {
        // Schedule to resolve
        const scheduleToResolve = (observer: MutationObserver) => {
            // Cancel the timeout, if has been set
            if (resolveTimeout) clearTimeout(resolveTimeout);

            resolveTimeout = setTimeout(() => {
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
            // Use provided option or default to true
            childList: options.childList ?? true, // As the indication that the element is still busy
            subtree: options.subtree ?? false, // Whether to observe the subtree
        })

        // Schedule to resolve, useful if the element is already idle
        scheduleToResolve(idleObserver);
    });
}

/**
 * Wait for an element. The wait time will be gradually increased until giving up
 * @param {string} selector The element selector
 * @param {number} maxWaitTime Maximum seconds to wait for the element to exist. Default: 60 seconds
 * @return {Promise <HTMLElement|null>}  The element
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

    if (element === null) {
        prodWarn(`Element with selector "${selector}" not found after waiting for ${maxWaitTime} ms.`);
    }

    return element;
}

/**
 * Wait for an element that is a descendant of a container. The wait time will be gradually increased until giving up
 * This function is an alternative form of `waitForAnElement` function.
 * @param {HTMLElement} container The element container
 * @param {string} selector The selector of the element
 * @param {number} maxWaitTime Maximum seconds to wait for the element to exist. Default: 60 seconds
 * @return {Promise <HTMLElement|null>}  The element
 */
export async function waitForAChildElement(container: HTMLElement | null, selector: string, maxWaitTime = 60e3): Promise<HTMLElement | null> {
    if (container === null) {
        prodWarn(`Container is null - 024`);
        return null;
    }

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

        element = container.querySelector(selector) as HTMLElement;
    }

    if (element === null) {
        prodWarn(`Element with selector "${selector}" not found after waiting for ${maxWaitTime} ms - 983`);
    }

    return element;
}

/**
 * Used for development only to log messages
 * @param {string} msg The log to print out
 * @return {void}
 */
export function devLog(msg: string): void {
    // Check if the environment is development
    const isDev = process.env.NODE_ENV === 'development';

    // For dev only
    if (isDev) {
        // Warning! At one case, `console.log` in this function will cause name collision, e.g.: 'he' already difined.
        // For now we still use `console.log` but might be commented or altered.
        console.log(`[PageLive][dev] ${msg}`);
    }
}

/**
 * Print warnings used in production
 */
export function prodWarn(msg: string) {
    // Warning! At one case, `console.log` in this function will cause name collision, e.g.: 'he' already difined.
    // For now we still use `console.log` but might be commented or altered.
    console.warn(`[PageLive] ${msg}`);
}

/**
 * Trim a sentence by given the word count. 
 * If the given string is longer than the expected word count, will append with '...'
 * @param {stirng} sentence
 * @param {number} wordCount The maximum expected words.
 * @param {string} ellipsis Will be put at the end of the return string, if needed. Default: "..."
 * @return {string} The shortened sentence
 */
export function shortenText(sentence: string, wordCount: number = 15, ellipsis = "...") {
    // if (typeof sentence !== 'string') return '';

    const trimmed = sentence.trim();
    if (trimmed.length === 0) return '';

    // Guard: non-positive wordCount -> return ellipsis-only (indicates truncation)
    if (wordCount <= 0) return ellipsis;

    // Split on whitespace (one or more) to get words
    const words = trimmed.split(/\s+/);

    if (words.length <= wordCount) {
        // Return original trimmed sentence when not exceeding the limit
        return trimmed;
    }

    // Take the first `wordCount` words and append ellipsis
    const shortened = words.slice(0, wordCount).join(' ');
    return `${shortened}${ellipsis}`;
}

/**
 * Auto incremented number, used to get unique number
 */
let autoNumber = 1;
export function uniqueNumber() {
    return autoNumber++;
}