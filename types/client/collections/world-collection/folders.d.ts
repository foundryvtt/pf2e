/**
 * The Collection of Folder documents which exist within the active World.
 * This Collection is accessible within the Game object as game.folders.
 */
declare class Folders extends WorldCollection<Folder> {
    /** @override */
    constructor(data?: foundry.data.FolderSource[]);

    _expanded: Record<string, boolean>;

    /** @override */
    static documentName: 'Folder';

    /** @override */
    render(force: boolean, options?: RenderOptions): void;

    /** Refresh the display of any active JournalSheet instances where the folder list will change. */
    protected _refreshJournalEntrySheets(): void;
}
