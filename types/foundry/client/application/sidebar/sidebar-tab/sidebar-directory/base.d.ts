/** A shared pattern for the sidebar directory which Actors, Items, and Scenes all use */
declare class SidebarDirectory<TDocument extends ClientDocument> extends SidebarTab {
    /** References to the set of Documents that are displayed in the Sidebar */
    documents: TDocument[];

    /** Reference the set of Folders which exist in this Sidebar */
    folders: Folder[];

    /** A reference to the named Document type that this Sidebar Directory instance displays */
    static documentName: string;

    /* -------------------------------------------- */
    /*  Initialization Helpers                      */
    /* -------------------------------------------- */

    /** Initialize the content of the directory by categorizing folders and entities into a hierarchical tree structure. */
    initialize(): void;

    /**
     * Given an entity type and a list of entities, set up the folder tree for that entity
     * @param folders   The Array of Folder objects to organize
     * @param entities  The Array of Entity objects to organize
     * @param sortMode  How should entities or Folders be sorted? (a)lphabetic or (n)umeric
     * @return          A tree structure containing the folders and entities
     */
    static setupFolders(
        folders: Folder[],
        entities: foundry.abstract.Document[],
        sortMode: string
    ): { root: boolean; content: foundry.abstract.Document[]; children: any[] };

    static get collection(): foundry.utils.Collection<ClientDocument>;

    /** Collapse all subfolders in this directory */
    collapseAll(): void;

    /**
     * Default folder context actions
     * @param html The context menu HTML being rendered for the directory
     */
    protected _contextMenu(html: JQuery): void;
}
