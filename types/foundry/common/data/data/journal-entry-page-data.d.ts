declare module foundry {
    module data {
        /**
         * @typedef {object} JournalEntryPageImageData
         * @property {string} [caption]  A caption for the image.
         */
        interface JournalEntryPageImageData {
            caption?: string;
        }

        /**
         * @typedef {object} JournalEntryPageTextData
         * @property {string} [content]   The content of the JournalEntryPage in a format appropriate for its type.
         * @property {string} [markdown]  The original markdown source, if applicable.
         * @property {number} format      The format of the page's content, in {@link CONST.JOURNAL_ENTRY_PAGE_FORMATS}.
         */
        interface JournalEntryPageTextData {
            content?: string;
            markdown?: string;
            format: number;
        }

        /**
         * @typedef {object} JournalEntryPageVideoData
         * @property {boolean} [loop]      Automatically loop the video?
         * @property {boolean} [autoplay]  Should the video play automatically?
         * @property {number} [volume]     The volume level of any audio that the video file contains.
         * @property {number} [timestamp]  The starting point of the video, in seconds.
         * @property {number} [width]      The width of the video, otherwise it will fill the available container width.
         * @property {number} [height]     The height of the video, otherwise it will use the aspect ratio of the source video,
         *                                 or 16:9 if that aspect ratio is not available.
         */
        interface JournalEntryPageVideoData {
            loop?: boolean;
            autoplay?: boolean;
            volume?: number;
            timestamp?: number;
            width?: number;
            height?: number;
        }

        /**
         * @property {boolean} show  Whether to render the page's title in the overall journal view.
         * @property {number} level  The heading level to render this page's title at in the overall journal view.
         */
        interface JournalEntryPageTitleData {
            show: boolean;
            level: number;
        }

        /**
         * The data schema for a JournalEntryPage document.
         * @property {string} _id          The _id which uniquely identifies this JournalEntryPage embedded document.
         * @property {string} name         The text name of this page.
         * @property {string} type         The type of this page, in {@link BaseJournalEntryPage.TYPES}.
         * @property {JournalEntryPageTitleData} title  Data that control's the display of this page's title.
         * @property {JournalEntryPageImageData} image  Data particular to image journal entry pages.
         * @property {JournalEntryPageTextData} text    Data particular to text journal entry pages.
         * @property {JournalEntryPageVideoData} video  Data particular to video journal entry pages.
         * @property {string} [src]        The URI of the image or other external media to be used for this page.
         * @property {object} system       System-specific data.
         * @property {number} sort         The numeric sort value which orders this page relative to its siblings.
         * @property {object} [ownership]  An object which configures the ownership of this page.
         * @property {object} [flags]      An object of optional key/value flags.
         */
        interface JournalEntryPageSource {
            _id: string;
            name: string;
            title: JournalEntryPageTitleData;
            image: JournalEntryPageImageData;
            text: JournalEntryPageTextData;
            video: JournalEntryPageVideoData;
            src?: string | null;
            system: object; // will be filled out later
            sort: number;
            ownership?: Record<string, DocumentOwnershipLevel>;
            flags: object; // will be filled out later
        }

        class JournalEntryPageData<
            TDocument extends documents.BaseJournalEntryPage
        > extends abstract.DocumentData<TDocument> {
            protected override _initializeSource(data: this["_source"]): this["_source"];
        }

        interface JournalEntryPageData<TDocument extends documents.BaseJournalEntryPage> {
            readonly _source: JournalEntryPageSource;
        }
    }
}
