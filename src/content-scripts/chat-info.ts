/**
 * Represents chat information in the page
 */
export default class ChatInfo {
    id: string = "";
    title: string = "";
    responsesCount: number = 0;
    // Whether this is a empty / new chat which has no id, title, nor responses yet
    isNew: boolean = false;
    // Whether failed to parsed the chat info
    parseFailed: boolean = false;

    constructor(id?: string
        , title?: string
        , responsesCount?: number
        , isNew?: boolean
        , parseFailed?: boolean) {
        this.id = id || "";
        this.title = title || "";
        this.responsesCount = responsesCount || 0;
        this.isNew = isNew || false;
        this.parseFailed = parseFailed || false;
    }

    // set(id: string, title: string, parseFailed: boolean) {
    //     this.id = id;
    //     this.title = title;
    //     this.parseFailed = parseFailed;
    //     return this;
    // }
}