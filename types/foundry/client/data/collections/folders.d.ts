/**
 * The Collection of Folder documents which exist within the active World.
 * This Collection is accessible within the Game object as game.folders.
 */
declare class Folders<TFolder extends Folder> extends WorldCollection<TFolder> {
    constructor(data?: foundry.documents.FolderSource[]);

    protected _expanded: Record<string, boolean>;

    static override documentName: "Folder";

    override render(force: boolean, options?: RenderOptions): void;

    /** Refresh the display of any active JournalSheet instances where the folder list will change. */
    protected _refreshJournalEntrySheets(): void;
}
