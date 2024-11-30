declare global {
    /**
     * A mixin which adds directory functionality to a DocumentCollection, such as folders, tree structures, and sorting.
     * @param BaseCollection The base collection class to extend
     * @returns A Collection mixed with DirectoryCollection functionality
     */
    function DirectoryCollectionMixin<TConstructor extends AbstractConstructorOf<Collection<unknown>>>(
        BaseCollection: TConstructor,
    ): typeof DirectoryCollection & TConstructor;

    /**
     * An extension of the Collection class which adds behaviors specific to tree-based collections of entries and folders.
     */
    abstract class DirectoryCollection {
        /** Reference the set of Folders which contain documents in this collection */
        abstract get folders(): Collection<Folder>;

        /** The built tree structure of the DocumentCollection */
        get tree(): object;

        /** The current search mode for this collection */
        get searchMode(): "full" | "name";

        /** Toggle the search mode for this collection between "name" and "full" text search */
        toggleSearchMode(): void;

        /** The current sort mode used to order the top level entries in this collection */
        get sortingMode(): "a" | "m";

        /** Toggle the sorting mode for this collection between "a" (Alphabetical) and "m" (Manual by sort property) */
        toggleSortingMode(): void;

        /** The maximum depth of folder nesting which is allowed in this collection */
        get maxFolderDepth(): number;

        /** Initialize the tree by categorizing folders and entries into a hierarchical tree structure. */
        initializeTree(): void;

        /**
         * Creates the list of Folder options in this Collection in hierarchical order
         * for populating the options of a select tag.
         * @internal
         */
        _formatFolderSelectOptions(): { id: string; name: string }[];

        /**
         * Sort two Entries by name, alphabetically.
         * @param a Some Entry
         * @param b Some other Entry
         * @returns The sort order between entries a and b
         */
        protected static _sortAlphabetical<T extends { name: string }>(a: T, b: T): number;

        /**
         * Sort two Entries using their numeric sort fields.
         * @param a Some Entry
         * @param b Some other Entry
         * @returns The sort order between Entries a and b
         */
        protected static _sortStandard(a: { sort: number }, b: { sort: number }): number;
    }
}

type DirectoryCollectionAndDocumentCollection = DirectoryCollection & DocumentCollection<WorldDocument>;

export declare interface DirectoryCollectionConstructor extends DirectoryCollectionAndDocumentCollection {
    new <TDocument extends WorldDocument>(
        ...args: ConstructorParameters<ConstructorOf<TDocument>>
    ): DirectoryCollection & DocumentCollection<TDocument>;
}
