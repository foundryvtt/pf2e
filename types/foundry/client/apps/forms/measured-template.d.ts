/** The Application responsible for configuring a single MeasuredTemplate document within a parent Scene. */
declare class MeasuredTemplateConfig<
    TDocument extends MeasuredTemplateDocument = MeasuredTemplateDocument,
> extends DocumentSheet<TDocument> {
    static override get defaultOptions(): DocumentSheetOptions;

    override getData(
        options?: Partial<DocumentSheetOptions>,
    ): DocumentSheetData<TDocument> | Promise<DocumentSheetData<TDocument>>;

    protected override _updateObject(event: Event, formData: Record<string, unknown>): Promise<void>;
}
