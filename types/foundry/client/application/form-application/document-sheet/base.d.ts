export {};

declare global {
    interface DocumentSheetOptions extends FormApplicationOptions {
        classes: string[];
        template: string;
        viewPermission: number;
    }

    interface DocumentSheetData<TDocument extends foundry.abstract.Document = foundry.abstract.Document> {
        cssClass: string;
        editable: boolean;
        document: TDocument;
        data: {};
        limited: boolean;
        options: FormApplicationOptions;
        owner: boolean;
        title: string;
    }

    /** A simple implementation of the FormApplication pattern which is specialized in editing Entity instances */
    class DocumentSheet<
        TDocument extends foundry.abstract.Document = foundry.abstract.Document,
        TOptions extends DocumentSheetOptions = DocumentSheetOptions
    > extends FormApplication<TDocument, TOptions> {
        constructor(object: TDocument, options?: Partial<TOptions>);

        static override get defaultOptions(): DocumentSheetOptions;

        /**
         * A convenience accessor for the object property of the inherited FormApplication instance
         */
        get document(): TDocument;

        override getData(
            options?: Partial<TOptions>
        ): DocumentSheetData<TDocument> | Promise<DocumentSheetData<TDocument>>;

        protected override _updateObject(event: Event, formData: Record<string, unknown>): Promise<void>;
    }
}
