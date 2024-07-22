import type { ClientBaseJournalEntryPage } from "./client-base-mixes.d.ts";

declare global {
    /**
     * The client-side JournalEntryPage document which extends the common BaseJournalEntryPage document model.
     *
     * @see {@link JournalEntry}  The JournalEntry document type which contains JournalEntryPage embedded documents.
     */
    class JournalEntryPage<
        TParent extends JournalEntry | null = JournalEntry | null,
    > extends ClientBaseJournalEntryPage<TParent> {
        /** The table of contents for this JournalEntryPage. */
        get toc(): JournalEntryPageHeading;

        override get permission(): DocumentOwnershipLevel;

        /**
         * Return a reference to the Note instance for this Journal Entry Page in the current Scene, if any.
         * If multiple notes are placed for this Journal Entry, only the first will be returned.
         */
        get sceneNote(): Note | null;

        /* -------------------------------------------- */
        /*  Table of Contents                           */
        /* -------------------------------------------- */

        /**
         * Convert a heading into slug suitable for use as an identifier.
         * @param heading The heading element or some text content.
         */
        static slugifyHeading(heading: HTMLHeadingElement | string): string;

        /**
         * Build a table of contents for the given HTML content.
         * @param html      The HTML content to generate a ToC outline for.
         * @param [options] Additional options to configure ToC generation.
         * @param [options.includeElement=true] Include references to the heading DOM elements in the returned ToC.
         */
        static buildTOC(html: HTMLElement, options?: { includeElement?: boolean }): JournalEntryPageHeading;

        /**
         * Flatten the tree structure into a single object with each node's slug as the key.
         * @param nodes  The root ToC nodes.
         */
        protected static _flattenTOC(nodes: JournalEntryPageHeading[]): JournalEntryPageHeading;

        /**
         * Construct a table of contents node from a heading element.
         * @param heading   The heading element.
         * @param [options] Additional options to configure the returned node.
         * @param [options.includeElement=true] Whether to include the DOM element in the returned ToC node.
         */
        protected static _makeHeadingNode(
            heading: HTMLHeadElement,
            options?: { includeElement?: boolean },
        ): JournalEntryPageHeading;

        /* -------------------------------------------- */
        /*  Methods                                     */
        /* -------------------------------------------- */

        protected override _onClickDocumentLink(event: MouseEvent): Promise<this["sheet"]>;

        protected override _onUpdate(
            data: DeepPartial<this["_source"]>,
            options: DatabaseUpdateOperation<TParent>,
            userId: string,
        ): void;
    }

    interface JournalEntryPage<TParent extends JournalEntry | null = JournalEntry | null>
        extends ClientBaseJournalEntryPage<TParent> {
        get documentName(): "JournalEntryPage";
        get sheet(): JournalPageSheet<this>;
    }

    interface JournalEntryPageHeading {
        /** The heading level, 1-6. */
        level: 1 | 2 | 3 | 4 | 5 | 6;
        /** The raw heading text with any internal tags omitted. */
        text: string;
        /** The generated slug for this heading. */
        slug: string;
        /** The currently rendered element for this heading, if it exists. */
        element?: HTMLHeadingElement;
        /** Any child headings of this one. */
        children: string[];
    }
}
