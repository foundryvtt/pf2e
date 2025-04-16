import { ApplicationV1Options } from "@client/appv1/api/application-v1.mjs";
import WorldCollection from "../abstract/world-collection.mjs";
import Folder from "../folder.mjs";

/**
 * The Collection of Folder documents which exist within the active World.
 * This Collection is accessible within the Game object as game.folders.
 */
export default class Folders<TFolder extends Folder = Folder> extends WorldCollection<TFolder> {
    constructor(data?: foundry.documents.FolderSource[]);

    protected _expanded: Record<string, boolean>;

    static override documentName: "Folder";

    override render(force: boolean, options?: ApplicationV1Options): void;

    /** Refresh the display of any active JournalSheet instances where the folder list will change. */
    protected _refreshJournalEntrySheets(): void;
}
