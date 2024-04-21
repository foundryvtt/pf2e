import type * as TinyMCE from "tinymce";

declare global {
    /** A collection of helper functions and utility methods related to the rich text editor */
    class TextEditor {
        /**
         * Create a Rich Text Editor. The current implementation uses TinyMCE
         * @param options Configuration options provided to the Editor init
         * @param [options.engine=tinymce] Which rich text editor engine to use, "tinymce" or "prosemirror". TinyMCE
         *                                 is deprecated and will be removed in a later version.
         * @param content Initial HTML or text content to populate the editor with
         * @returns The editor instance.
         */
        static create(options?: EditorCreateOptions, content?: string): Promise<TinyMCE.Editor | ProseMirrorEditor>;

        /** A list of elements that are retained when truncating HTML. */
        protected static _PARAGRAPH_ELEMENTS: Set<string>;

        protected static _createTinyMCE(options: TinyMCE.EditorOptions, content: string): Promise<TinyMCE.Editor>;

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
        static enrichHTML(content: string | null, options?: EnrichmentOptions): Promise<string>;

        /**
         * Scan for compendium UUIDs and retrieve Documents in batches so that they are in cache when enrichment proceeds.
         * @param text The text nodes to scan
         */
        protected static _primeCompendiums(text: Text[]): Promise<void>;

        /**
         * Convert text of the form @UUID[uuid]{name} to anchor elements.
         * @param text      The existing text content
         * @param [options] Options provided to customize text enrichment
         * @param [options.relativeTo] A document to resolve relative UUIDs against.
         * @returns Whether any content links were replaced and the text nodes need to be updated.
         */
        static _enrichContentLinks(text: Text[], options?: EnrichmentOptions): Promise<boolean>;

        /**
         * Handle embedding Document content with @Embed[uuid]{label} text.
         * @param text      The existing text content.
         * @param options   Options provided to customize text enrichment
         * @returns Whether any content links were replaced and the text nodes need to be updated.
         */
        static _enrichEmbeds(text: Text[], options?: EnrichmentOptions): Promise<boolean>;

        /**
         * Convert URLs into anchor elements.
         * @param text      The existing text content.
         * @param options   Options provided to customize text enrichment
         * @returns Whether any hyperlinks were replaced and the text nodes need to be updated
         */
        static _enrichHyperlinks(text: Text[], options?: EnrichmentOptions): Promise<boolean>;

        /**
         * Convert text of the form [[roll]] to anchor elements.
         * @param text      The existing text content.
         * @param options   Options provided to customize text enrichment
         * @returns Whether any inline rolls were replaced and the text nodes need to be updated.
         */
        static _enrichInlineRolls(text: Text[], options?: EnrichmentOptions): Promise<boolean>;

        /**
         * Match any custom registered regex patterns and apply their replacements.
         * @param config    The custom enricher configuration.
         * @param text      The existing text content.
         * @param options   Options provided to customize text enrichment
         * @returns Whether any replacements were made, requiring the text nodes to be updateed
         */
        static _applyCustomEnrichers(
            config: TextEditorEnricherConfig,
            text: Text[],
            options: EnrichmentOptions,
        ): Promise<boolean>;

        /**
         * Preview an HTML fragment by constructing a substring of a given length from its inner text.
         * @param content The raw HTML to preview
         * @param length  The desired length
         * @return The previewed HTML
         */
        static previewHTML(content: string, length?: number): string;

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
            { maxLength, splitWords, suffix }: { maxLength?: number; splitWords?: boolean; suffix?: string | null },
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
        protected static _replaceTextNode(
            text: string,
            match: RegExpMatchArray,
            replacement: Node,
            options?: { replaceParent?: boolean },
        ): void;

        /* -------------------------------------------- */
        /*  Text Replacement Functions                  */
        /* -------------------------------------------- */

        /**
         * Create a dynamic document link from a regular expression match
         * @param match     The regular expression match
         * @param [options] Additional options to configure enrichment behaviour
         * @param [options.async=false] If asynchronous evaluation is enabled, fromUuid will be
         *                              called, allowing comprehensive UUID lookup, otherwise fromUuidSync will be used.
         * @param [options.relativeTo]  A document to resolve relative UUIDs against.
         * @returns An HTML element for the document link, returned as a Promise if async was true and the message
         *          contained a UUID link.
         */
        protected static _createContentLink(
            match: RegExpMatchArray,
            options?: { relativeTo?: ClientDocument },
        ): Promise<HTMLAnchorElement>;

        /**
         * Helper method to create an anchor element.
         * @param options Options to configure the anchor's construction.
         */
        static createAnchor(options?: Partial<EnrichmentAnchorOptions>): HTMLAnchorElement;

        /**
         * Embed content from another Document.
         * @param match     The regular expression match.
         * @param options   Options provided to customize text enrichment.
         * @returns A representation of the Document as HTML content, or null if the Document could not be embedded.
         */
        protected static _embedContent(
            match: RegExpMatchArray,
            options?: EnrichmentOptions,
        ): Promise<HTMLElement | null>;

        /**
         * Parse the embed configuration to be passed to ClientDocument#toEmbed.
         * The return value will be an object of any key=value pairs included with the configuration, as well as a separate
         * values property that contains all the options supplied that were not in key=value format.
         * If a uuid key is supplied it is used as the Document's UUID, otherwise the first supplied UUID is used.
         * @param raw  The raw matched config string.
         *
         * @example Example configurations.
         * ```js
         * TextEditor._parseEmbedConfig('uuid=Actor.xyz caption="Example Caption" cite=false');
         * // Returns: { uuid: "Actor.xyz", caption: "Example Caption", cite: false, values: [] }
         *
         * TextEditor._parseEmbedConfig('Actor.xyz caption="Example Caption" inline');
         * // Returns: { uuid: "Actor.xyz", caption: "Example Caption", values: ["inline"] }
         * ```
         */
        protected static _parseEmbedConfig(raw: string): DocumentHTMLEmbedConfig;

        /**
         * Create a dynamic document link from an old-form document link expression.
         * @param type      The matched document type, or "Compendium".
         * @param target    The requested match target (_id or name).
         * @param name      A customized or overridden display name for the link.
         * @param data      Data containing the properties of the resulting link element.
         * @returns Whether the resulting link is broken or not.
         */
        protected static _createLegacyContentLink(type: string, target: string, name: string, data: object): boolean;

        /**
         * Replace a hyperlink-like string with an actual HTML &lt;a> tag
         * @param match The regular expression match
         * @return An HTML element for the document link
         */
        protected static _createHyperlink(match: RegExpMatchArray): HTMLAnchorElement;

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
            options?: EvaluateRollParams,
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
        static _onClickInlineRoll(event: MouseEvent): Promise<ChatMessage | void>;

        /**
         * Begin a Drag+Drop workflow for a dynamic content link
         * @param event The originating drag event
         */
        protected static _onDragContentLink(event: DragEvent): void;

        /**
         * Handle dropping of transferred data onto the active rich text editor
         * @param event  The originating drop event which triggered the data transfer
         * @param editor The TinyMCE editor instance being dropped on
         */
        protected static _onDropEditorData(event: DragEvent, editor: TinyMCE.Editor): Promise<void>;

        /**
         * Extract JSON data from a drag/drop event.
         * @param event The drag event which contains JSON data.
         * @returns The extracted JSON data. The object will be empty if the DragEvent did not contain JSON-parseable data.
         */
        static getDragEventData(event: DragEvent): Record<string, JSONValue>;

        /** Given a Drop event, returns a Content link if possible such as @Actor[ABC123], else null */
        static getContentLink(event: DragEvent): Promise<string | null>;

        /** Upload an image to a document's asset path */
        static _uploadImage(uuid: string, file: File): Promise<string>;
    }

    type DocumentHTMLEmbedConfig = Record<string, string | boolean | number> & {
        values: string[];
        classes?: string[];
        inline?: boolean;
        cite?: boolean;
        caption?: boolean;
        captionPosition?: string;
        label?: string;
    };

    interface EnrichmentAnchorOptions {
        /** Attributes to set on the anchor. */
        attrs?: Record<string, string>;
        /** Data- attributes to set on the anchor. */
        dataset?: Record<string, string>;
        /** Classes to add to the anchor. */
        classes?: string[];
        /** The anchors content */
        name?: string;
        /** A font-awesome icon to use as the icon */
        icon?: string;
    }

    interface EnrichmentOptions {
        /** Include unrevealed secret tags in the final HTML? If false, unrevealed secret blocks will be removed */
        secrets?: boolean;
        /** Replace dynamic document links? */
        documents?: boolean;
        /** Replace hyperlink content? */
        links?: boolean;
        /** Replace inline dice rolls? */
        rolls?: boolean;
        /** Replace embedded content? */
        embeds?: boolean;
        /** The data object providing context for inline rolls, or a function that produces it (TODO: support function variant) */
        rollData?: Record<string, unknown>;
        /** A document to resolve relative UUIDs against. */
        relativeTo?: ClientDocument;
    }

    interface TextEditorEnricherConfig {
        pattern: RegExp;
        replaceParent?: boolean;
        enricher: (match: RegExpMatchArray, options?: EnrichmentOptions) => Promise<HTMLElement | null>;
    }

    type EditorCreateOptions = Partial<TinyMCE.EditorOptions | ProseMirrorEditorOptions> & {
        engine?: "tinymce" | "prosemirror";
    };
}
