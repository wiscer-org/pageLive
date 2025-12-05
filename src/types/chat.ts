// Type to represent items in a chat, like a prompt or a response.
export type ChatUnit = {
    isYourPrompt: boolean; // true if this item is a prompt from the user, false if it's a response from the AI
    contentElement: HTMLElement; // The HTML element that contains the content of this chat item
    shortContent?: string; // The shortened text content of the element
}

// Type to represent specific chat, e.g. current active chat, or the last chat, etc.
export type Chat = {
    // The id, usually a random alphanumerics depends on the page implementation, e.g. 'gemini', 'grok', etc.
    // null if no yet parsed / initialized, empty string if no id available 
    id: string | null;
    // The title of the chat, usually the first few words of the chat
    title: string;
    // The number of prompts in the chat. Should be equal to the number of responses.
    promptCount: number;
    // List of items in the chat, including prompts and responses.
    units?: ChatUnit[];
}