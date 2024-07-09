/** The Application responsible for configuring a single Folder document. */
declare class FolderConfig extends DocumentSheet<Folder> {
    static override get defaultOptions(): DocumentSheetOptions;

    override get id(): string;

    override get title(): string;

    override close(options?: { force?: boolean }): Promise<void>;

    override getData(options?: DocumentSheetOptions): DocumentSheetData<Folder>;

    protected override _updateObject(event: Event, formData: Record<string, unknown>): Promise<void>;
}
