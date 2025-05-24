import Document from "@common/abstract/document.mjs";
import Collection from "@common/utils/collection.mjs";
import { Adventure, Folder, Setting, WorldDocument } from "../_module.mjs";
import CompendiumCollection from "../collections/compendium-collection.mjs";
import DocumentCollection from "./document-collection.mjs";

export type DirectoryMixinEntry = WorldDocument | Setting | Adventure;

/**
 * A mixin which adds directory functionality to a DocumentCollection, such as folders, tree structures, and sorting.
 * @param BaseCollection The base collection class to extend
 * @returns A Collection mixed with DirectoryCollection functionality
 */
export default function DirectoryCollectionMixin<
    TConstructor extends AbstractConstructorOf<Collection<string, Document>>,
>(BaseCollection: TConstructor): typeof DirectoryCollection & TConstructor;

/**
 * An extension of the Collection class which adds behaviors specific to tree-based collections of entries and folders.
 */
export declare abstract class DirectoryCollection<
    TEntry extends DirectoryMixinEntry = DirectoryMixinEntry,
> extends Collection<string, TEntry> {
    /** Reference the set of Folders which contain documents in this collection */
    abstract get folders(): Collection<string, Folder>;

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

    /**
     * Return a reference to list of entries which are visible to the User in this tree
     */
    protected _getVisibleTreeContents(): TEntry[] | CompendiumCollection[];

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

export type DirectoryCollectionAndDocumentCollection = DirectoryCollection<DirectoryMixinEntry> &
    DocumentCollection<Document>;

export interface DirectoryCollectionConstructor extends DirectoryCollectionAndDocumentCollection {
    new <TEntry extends DirectoryMixinEntry>(
        ...args: ConstructorParameters<ConstructorOf<TEntry>>
    ): DirectoryCollection<TEntry> & DocumentCollection<Document>;
}
