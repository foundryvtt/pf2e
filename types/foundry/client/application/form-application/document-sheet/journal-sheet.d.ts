/**
 * The JournalEntry Configuration Sheet
 *
 * @param entity The JournalEntry instance which is being edited
 * @param options Application options
 */
declare class JournalSheet<TJournalEntry extends JournalEntry> extends DocumentSheet<TJournalEntry> {
    constructor(object: TJournalEntry, options?: DocumentSheetOptions);

    protected _sheetMode: string | null;

    protected _textPos: Record<string, unknown> | null;

    static override get defaultOptions(): DocumentSheetOptions;

    override get template(): string;

    override get title(): string;

    /** Guess the default view mode for the sheet based on the player's permissions to the Entry */
    protected _inferDefaultMode(): string;

    protected override _render(force?: boolean, options?: DocumentRenderOptions): Promise<void>;

    protected override _getHeaderButtons(): ApplicationHeaderButton[];

    override getData(options: DocumentSheetOptions): DocumentSheetData<TJournalEntry>;

    override _updateObject(event: Event, formData: Record<string, unknown>): Promise<void>;

    /**
     * Handle requests to switch the rendered mode of the Journal Entry sheet
     * Save the form before triggering the show request, in case content has changed
     * @param event The triggering click event
     * @param mode  The journal mode to display
     */
    protected _onSwapMode(event: JQuery.ClickEvent, mode: string): Promise<void>;

    /**
     * Handle requests to show the referenced Journal Entry to other Users
     * Save the form before triggering the show request, in case content has changed
     * @param event The triggering click event
     */
    protected _onShowPlayers(event: JQuery.ClickEvent): Promise<this>;
}
