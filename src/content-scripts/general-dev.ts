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