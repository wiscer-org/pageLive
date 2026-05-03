export const sayHi = function (): void {
    alert('Hi man');
}
/**
 * Parse all descendants of parent element and return a list of IDs of elements if exists.
 */
export const parseElementsId = (parent: HTMLElement): string[] => {
    // Use querySelectorAll to get all descendants with an id
    const ids: string[] = [];
    parent.querySelectorAll<HTMLElement>('[id]').forEach(el => {
        if (el.id) {
            ids.push(el.id);
        }
    });
    return ids;
}

/**
 * Console log added elements to the page.
 * @param parentNode The parent node to observe for added elements. If not provided, it defaults to the entire document.
 */
export const observeAddedElements = (parentNode: Node = document) => {
    const observer = new MutationObserver(mutations => {
        mutations.forEach(mutation => {
            mutation.addedNodes.forEach(node => {
                if (node instanceof HTMLElement) {
                    console.log('Added element:', node);
                    // log the parent element of the added node
                    console.log('Parent element:', node.parentElement);
                }
            }
            );
        });
    });

    observer.observe(parentNode, { childList: true, subtree: true });
}

/**
 * Console log removed elements from the page.
 * @param parentNode The parent node to observe for removed elements. If not provided, it defaults to the entire document.
 */
export const observeRemovedElements = (parentNode: Node = document) => {
    const observer = new MutationObserver(mutations => {
        mutations.forEach(mutation => {
            mutation.removedNodes.forEach(node => {
                if (node instanceof HTMLElement) {
                    console.log('Removed element:', node);
                    // log the parent element of the removed node
                    console.log('Parent element:', node.parentElement);
                }
            });
        });
    });

    observer.observe(parentNode, { childList: true, subtree: true });
}

/**
 * Console log attribute changes of elements on the page.
 * @param parentNode The parent node to observe for attribute changes. If not provided, it defaults to the entire document.
 */
export const observeAttributeChanges = (parentNode: Node = document) => {
    const observer = new MutationObserver(mutations => {

        // Disconnect the observer once the element is removed from the DOM to avoid memory leaks and unnecessary observations.
        if (parentNode.isConnected === false) observer.disconnect();

        mutations.forEach(mutation => {
            if (mutation.type === 'attributes' && mutation.target instanceof HTMLElement) {
                console.log('==== [PageLive], attribute changed detected');
                console.log('Attribute changed:', mutation.attributeName);
                console.log('Old value:', mutation.oldValue);
                console.log('New value:', mutation.target.getAttribute(mutation.attributeName || ''));
                console.log('Element:', mutation.target);
            }
        });
    });

    observer.observe(parentNode, { attributes: true, subtree: true, attributeOldValue: true });
}
