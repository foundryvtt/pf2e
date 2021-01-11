/**
 * A collection of helper functions and utility methods related to the rich text editor
 */
declare class TextEditor {
    /**
     * Create a Rich Text Editor. The current implementation uses TinyMCE
     * @param options	Configuration options provided to the Editor init
     * @param content	Initial HTML or text content to populate the editor with
     * @return			The editor instance.
     */
    static create(options: object, content: string): Promise<import('tinymce').Editor[]>;

    /**
     * Enrich HTML content by replacing or augmenting components of it
     * @param content		The original HTML content (as a string)
     * @param secrets		Remove secret tags?
     * @param entities	Replace dynamic entity links?
     * @param links		Replace hyperlink content?
     * @param rolls		Replace inline dice rolls?
     * @param rollData	The data object providing context for inline rolls
     * @return			The enriched HTML content
     */
    static enrichHTML(
        content: string,
        { secrets, entities, links, rolls, rollData }?: { [x: string]: boolean },
    ): string;

    /**
     * Preview an HTML fragment by constructing a substring of a given length from its inner text.
     * @param content	The raw HTML to preview
     * @param length	The desired length
     * @return		The previewed HTML
     */
    static previewHTML(content: string, length: number): string;

    /**
     * If dynamic content links are used from a certain compendium, we will go ahead and preload the index for that
     * Compendium pack in the background so the links can function better.
     */
    protected static _preloadCompendiumIndices(matches: string[]): Promise<void>;

    /**
     * Handle replacement of content links within HTML by delegating to different helper methods based on entity type
     */
    protected static _replaceContentLinks(match: string, entityType: string, id: string, name: string): string;

    /**
     * Replace a matched Entity Link with an actual HTML link to that entity
     * Be failure-tolerant, allowing for the possibility that the entity does not exist
     * @param match	The full matched string
     * @param id		The Entity ID or name
     * @param name	A custom text name to display
     * @return		The replacement string
     */
    protected static _replaceCompendiumLink(match: string, id: string, name: string): string;

    /**
     * Replace a matched Entity Link with an actual HTML link to that entity
     * Be failure-tolerant, allowing for the possibility that the entity does not exist
     * @param match		The full matched string
     * @param entityType	The named type of Entity being embedded
     * @param id			The Entity ID or name
     * @param name		A custom text name to display
     * @return			The replacement string
     */
    protected static _replaceEntityLink(match: string, entityType: string, id: string, name: string): string;

    /**
     * Replace a hyperlink-like string with an actual HTML <a> tag
     * @return	The replacement string
     */
    protected static _replaceHyperlinks(match: string, url: string): string;

    /**
     * Replace an inline roll formula with a rollable button or an eagerly evaluated roll result
     * @param match		The matched string
     * @param command		An optional command
     * @param formula		The matched formula
     * @param rollData	The data object providing context for inline rolls
     * @return			The replaced match
     */
    protected static _replaceInlineRolls(match: string, command: string, formula: string, ...args: any[]): string;

    /* -------------------------------------------- */
    /*  Event Listeners and Handlers                */
    /* -------------------------------------------- */

    static activateListeners(): void;

    /**
     * Handle click events on Entity Links
     */
    protected static _onClickEntityLink(event: Event): Promise<any>;

    /**
     * Handle left-mouse clicks on an inline roll, dispatching the formula or displaying the tooltip
     * @param event	The initiating click event
     */
    protected static _onClickInlineRoll(event: Event): Promise<ChatMessage | any | null>;

    /**
     * Begin a Drag+Drop workflow for a dynamic content link
     * @param event	The originating drag event
     */
    protected static _onDragEntityLink(event: Event): boolean;

    /**
     * Begin a a data transfer drag event with default handling
     */
    protected _onDragStart(event: Event): void;

    /**
     * Handle dropping of transferred data onto the active rich text editor
     * @param event	The originating drop event which triggered the data transfer
     * @param editor	The TinyMCE editor instance being dropped on
     */
    protected static _onDropEditorData(event: Event, editor: import('tinymce').Editor): Promise<boolean>;
}
