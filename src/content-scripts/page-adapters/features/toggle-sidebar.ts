import PageLive from '../../pagelive';

/**
 * Wrap the general feature to toggle sidebar
 * @param {PageLive} pl - Instance of @link{PageLive}
 * @param isExpanding - Function to determine whether should expand or collapse
 * @param expanAction - Function to expand the sidebar including actions before or after expand
 * @param collapseFunction - Function to collapse the sidebar including any events before or after
 */
export default async (
    pl: PageLive
    , isExpanding: () => Promise<boolean>
    , expandAction: () => Promise<void>
    , collapseAction: () => Promise<void>
    , postExpandAction?: () => Promise<void>
    , postCollapseAction?: () => Promise<void>
) => {
    if (await isExpanding()) {
        pl.speak('Expanding sidebar.');
        await expandAction();

        // Wait a little letting SR to focus the first element in the sidebar. Without waiting, the next action could be cancelled by SR reading the element due to addition of the sidebar.
        // And also to wait SR finish saying 'expanding sidebar' above.
        await new Promise(r => setTimeout(r, 1e3));

        if (postExpandAction) await postExpandAction();
    } else {
        pl.speak('Collapsing sidebar.');
        await collapseAction();

        // Wait for SR to finish speaking
        await new Promise(r => setTimeout(r, 1e3));

        // Do the after effect
        if (postCollapseAction) await postCollapseAction();
    }
}