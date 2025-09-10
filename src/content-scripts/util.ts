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
