import { WorldDocument } from "@client/documents/_module.mjs";
import { CompendiumCollection } from "@client/documents/collections/_module.mjs";
import Document from "@common/abstract/document.mjs";
import { StringTreeNode, WordTreeEntry } from "@common/utils/_types.mjs";
import WordTree from "@common/utils/word-tree.mjs";

/**
 * This class is responsible for indexing all documents available in the world and storing them in a word tree
 * structure that allows for fast searching.
 */
export default class DocumentIndex {
    constructor();
    /** A collection of WordTree structures for each document type. */
    trees: Record<string, WordTree>;

    /** A reverse-lookup of a document's UUID to its parent node in the word tree. */
    uuids: Record<string, StringTreeNode<WordTreeEntry>>;

    /** Returns a Promise that resolves when the indexing process is complete. */
    get ready(): void | null;

    /** Index all available documents in the world and store them in a word tree. */
    index(): Promise<void>;

    /**
     * Return entries that match the given string prefix.
     * @param prefix                  The prefix.
     * @param [options]               Additional options to configure behaviour.
     * @param [options.documentTypes] Optionally provide an array of document types. Only entries of that type
     *                                will be searched for.
     * @param [options.limit=10]      The maximum number of items per document type to retrieve. It is
     *                                important to set this value as very short prefixes will naturally match
     *                                large numbers of entries.
     * @returns A number of entries that have the given prefix, grouped by document type.
     */
    lookup(prefix: string, options?: { limit?: number; documentTypes?: string[] }): Record<string, WordTreeEntry[]>;

    /**
     * Add an entry to the index.
     * @param doc The document entry.
     */
    addDocument(doc: Document): void;

    /**
     * Remove an entry from the index.
     * @param doc The document entry.
     */
    removeDocument(doc: Document): void;

    /**
     * Replace an entry in the index with an updated one.
     * @param doc The document entry.
     */
    replaceDocument(doc: Document): void;

    /**
     * Add a leaf node to the word tree index.
     * @param doc            The document or compendium index entry to add.
     * @param [options]      Additional information for indexing.
     * @param [options.pack] The compendium that the index belongs to.
     */
    protected _addLeaf(doc: WorldDocument | object, options?: { pack?: CompendiumCollection }): void;

    /**
     * Aggregate the compendium index and add it to the word tree index.
     * @param pack The compendium pack.
     */
    protected _indexCompendium(pack: CompendiumCollection): void;

    /**
     * Add all of a parent document's embedded documents to the index.
     * @param parent The parent document.
     */
    protected _indexEmbeddedDocuments(parent: WorldDocument): void;

    /**
     * Aggregate all documents and embedded documents in a world collection and add them to the index.
     * @param documentName The name of the documents to index.
     */
    protected _indexWorldCollection(documentName: WorldDocument["documentName"]): void;
}
