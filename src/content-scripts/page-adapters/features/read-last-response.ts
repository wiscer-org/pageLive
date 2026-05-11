import PageLive from '../../pagelive';

/**
* This function will announce the last response. 
*/
// export default announceLastResponse(responseElement: HTMLElement | null) {
export default async (
    pl: PageLive
    , responseElements: HTMLElement[] | HTMLElement | null
) => {
    // this.utils.devLog('Announcing last response');

    // Opening line, to give user context.
    // This seems to be useful while waiting to find the last response element (if needed).
    pl.speak('Reading last response.');
    // Add time gap to allow SR read this line first. First response element, which will be read soon, most possibly contain lengthy HTML code.
    // This will delay SR from reading the opening, thus redux UX.
    await new Promise(r => setTimeout(r, 100));

    // Get the text, could be array of string, to be announced
    let toBeAnnounced: string[] = [];

    if (!responseElements) toBeAnnounced.push("No response element is found.");
    else if (Array.isArray(responseElements)) toBeAnnounced = responseElements.map(el => el.innerHTML);
    else if (!Array.isArray(responseElements)) toBeAnnounced.push(responseElements.innerHTML || '');

    // Announce, add time gap to reduce computer load
    for (let i = 0; i < toBeAnnounced.length; i++) {
        pl.speak(toBeAnnounced[i]);
        await new Promise(r => setTimeout(r, 2e3));
    }
}