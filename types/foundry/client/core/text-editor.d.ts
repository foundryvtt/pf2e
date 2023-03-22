import type * as TinyMCE from "tinymce";

declare global {
    /** A collection of helper functions and utility methods related to the rich text editor */
    class TextEditor {
        /**
         * Create a Rich Text Editor. The current implementation uses TinyMCE
         * @param options   Configuration options provided to the Editor init
         * @param content   Initial HTML or text content to populate the editor with
         * @return          The editor instance.
         */
        static create(options?: Partial<TinyMCE.EditorOptions>, content?: string): Promise<TinyMCE.Editor>;

        /** A list of elements that are retained when truncating HTML. */
        protected static _PARAGRAPH_ELEMENTS: Set<string>;

        protected static _decoder: HTMLTextAreaElement;

        /* -------------------------------------------- */
        /*  HTML Manipulation Helpers                   */
        /* -------------------------------------------- */

        /**
         * Safely decode an HTML string, removing invalid tags and converting entities back to unicode characters.
         * @param html The original encoded HTML string
         * @return The decoded unicode string
         */
        static decodeHTML(html: string): string;

        /**
         * Enrich HTML content by replacing or augmenting components of it
         * @param content      The original HTML content (as a string)
         * @param [options={}] Additional options which configure how HTML is enriched
         * @param [options.secrets=false]  Include secret tags in the final HTML? If false secret blocks will be removed.
         * @param [options.documents=true] Replace dynamic document links?
         * @param [options.links=true]     Replace hyperlink content?
         * @param [options.rolls=true]     Replace inline dice rolls?
         * @param [options.rollData]       The data object providing context for inline rolls
         * @return The enriched HTML content
         */
        static enrichHTML(content: string | null, options?: EnrichHTMLOptions & { async?: false }): string;
        static enrichHTML(content: string | null, options?: EnrichHTMLOptions & { async: true }): Promise<string>;
        static enrichHTML(content: string | null, options?: EnrichHTMLOptions): string | Promise<string>;

        /**
         * Preview an HTML fragment by constructing a substring of a given length from its inner text.
         * @param content The raw HTML to preview
         * @param length  The desired length
         * @return The previewed HTML
         */
        static previewHTML(content: string, length: number): string;

        /**
         * Sanitises an HTML fragment and removes any non-paragraph-style text.
         * @param html The root HTML element.
         */
        static truncateHTML<T extends HTMLElement>(html: T): T;

        /**
         * Truncate a fragment of text to a maximum number of characters.
         * @param text         The original text fragment that should be truncated to a maximum length
         * @param [maxLength]  The maximum allowed length of the truncated string.
         * @param [splitWords] Whether to truncate by splitting on white space (if true) or breaking words.
         * @param [suffix]     A suffix string to append to denote that the text was truncated.
         */
        static truncateText(
            text: string,
            { maxLength, splitWords, suffix }: { maxLength?: number; splitWords?: boolean; suffix?: string | null }
        ): string;

        /* -------------------------------------------- */
        /*  Text Node Manipulation                      */
        /* -------------------------------------------- */

        /**
         * Recursively identify the text nodes within a parent HTML node for potential content replacement.
         * @param parent The parent HTML Element
         * @return An array of contained Text nodes
         */
        protected static _getTextNodes(parent: HTMLElement): Text[];

        /**
         * Facilitate the replacement of text node content using a matching regex rule and a provided replacement function.
         */
        protected static _replaceTextContent(text: Text[], rgx: RegExp, func: (param: string) => string): boolean;

        /** Replace a matched portion of a Text node with a replacement Node */
        protected static _replaceTextNode(text: string, match: RegExpMatchArray, replacement: Node): void;

        /* -------------------------------------------- */
        /*  Text Replacement Functions                  */
        /* -------------------------------------------- */

        /**
         * Create a dynamic document link from a regular expression match
         * @param match  The full matched string
         * @param type   The matched document type or "Compendium"
         * @param target The requested match target (_id or name)
         * @param name   A customized or over-ridden display name for the link
         * @return An HTML element for the document link
         */
        protected static _createContentLink(
            match: string,
            type: string,
            target: string,
            name: string
        ): HTMLAnchorElement;

        /**
         * Replace a hyperlink-like string with an actual HTML &lt;a> tag
         * @param match The full matched string
         * @return An HTML element for the document link
         */
        protected static _createHyperlink(match: string): HTMLAnchorElement;

        /**
         * Replace an inline roll formula with a rollable &lt;a> element or an eagerly evaluated roll result
         * @param match     The regular expression match array
         * @param rollData  Provided roll data for use in roll evaluation
         * @param [options] Additional options to configure enrichment behaviour
         * @returns The replaced match, returned as a Promise if async was true and the message contained an
         *          immediate inline roll.
         */
        static _createInlineRoll(
            match: RegExpMatchArray,
            rollData: Record<string, unknown>,
            options?: EvaluateRollParams
        ): HTMLAnchorElement | null | Promise<HTMLAnchorElement | null>;

        /* -------------------------------------------- */
        /*  Event Listeners and Handlers                */
        /* -------------------------------------------- */

        static activateListeners(): void;

        /** Handle click events on Document Links */
        protected static _onClickContentLink(event: Event): Promise<void>;

        /**
         * Handle left-mouse clicks on an inline roll, dispatching the formula or displaying the tooltip
         * @param event The initiating click event
         */
        static _onClickInlineRoll(event: MouseEvent): Promise<ChatMessage>;

        /**
         * Toggle playing or stopping an embedded {@link PlaylistSound} link.
         * @param doc The PlaylistSound document to play/stop.
         */
        protected static _onPlaySound(doc: PlaylistSound<Playlist>): void;

        /** Find all content links belonging to a given PlaylistSound. */
        protected static _getSoundContentLinks(doc: PlaylistSound<Playlist>): NodeListOf<HTMLAnchorElement>;

        /**
         * Begin a Drag+Drop workflow for a dynamic content link
         * @param event The originating drag event
         */
        protected static _onDragContentLink(event: ElementDragEvent): void;

        /**
         * Handle dropping of transferred data onto the active rich text editor
         * @param event  The originating drop event which triggered the data transfer
         * @param editor The TinyMCE editor instance being dropped on
         */
        protected static _onDropEditorData(event: ElementDragEvent, editor: TinyMCE.Editor): Promise<void>;

        /**
         * Extract JSON data from a drag/drop event.
         * @param event The drag event which contains JSON data.
         * @returns The extracted JSON data. The object will be empty if the DragEvent did not contain JSON-parseable data.
         */
        static getDragEventData(event: ElementDragEvent): object;

        /** Given a Drop event, returns a Content link if possible such as @Actor[ABC123], else null */
        static getContentLink(event: ElementDragEvent): Promise<string | null>;
    }

    interface EnrichHTMLOptions {
        async?: boolean;
        secrets?: boolean;
        documents?: boolean;
        links?: boolean;
        rolls?: boolean;
        rollData?: Record<string, unknown>;
    }
}
