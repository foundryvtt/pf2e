export {};

declare global {
    interface DocumentSheetOptions extends FormApplicationOptions {
        classes: string[];
        template: string;
        viewPermission: number;
    }

    interface DocumentSheetData<T extends foundry.abstract.Document = foundry.abstract.Document> {
        cssClass: string;
        editable: boolean;
        document: T;
        data: {};
        limited: boolean;
        options: FormApplicationOptions;
        owner: boolean;
        title: string;
    }

    /**
     * A simple implementation of the FormApplication pattern which is specialized in editing Entity instances
     */
    class DocumentSheet<
        TDocument extends foundry.abstract.Document = foundry.abstract.Document,
        TOptions extends DocumentSheetOptions = DocumentSheetOptions,
    > extends FormApplication<TDocument, TOptions> {
        /** @override */
        constructor(object: TDocument, options: Partial<DocumentSheetOptions>);

        /** @override */
        static get defaultOptions(): DocumentSheetOptions;

        /**
         * A convenience accessor for the object property of the inherited FormApplication instance
         */
        get document(): TDocument;

        /** @override */
        getData(options?: DocumentSheetOptions): DocumentSheetData<foundry.abstract.Document>;

        /** @override */
        protected _updateObject(event: Event, formData: Record<string, unknown>): Promise<void>;
    }
}
