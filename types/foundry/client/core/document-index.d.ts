export {};

declare global {
    /**
     * A leaf entry in the tree.
     * @typedef WordTreeEntry
     * @property entry        An object that this entry represents.
     * @property documentName The document type.
     * @property uuid         The document's UUID.
     * @property [pack]       The pack ID.
     */
    interface WordTreeEntry {
        entry: foundry.abstract.Document | object;
        documentName: WorldDocument["documentName"];
        uuid: string;
        pack?: string;
    }

    /**
     * A word tree node consists of zero or more 1-character keys, and a leaves property that contains any objects that
     * terminate at the current string prefix.
     * @typedef WordTreeNode
     * @property leaves Any leaves at this node.
     */
    interface WordTreeNode {
        leaves: WordTreeEntry[];
    }

    /**
     * A data structure for quickly retrieving objects by a string prefix.
     * Note that this works well for languages with alphabets (latin, cyrillic, korean, etc.), but may need more nuanced
     * handling for languages that compose characters and letters.
     */
    class WordTree {
        /** Create a new node. */
        get node(): WordTreeNode;

        /**
         * Insert an entry into the tree.
         * @param string The string key for the entry.
         * @param entry  The entry to store.
         * @returns The node the entry was added to.
         */
        addLeaf(string: string, entry: WordTreeEntry): WordTreeNode;

        /**
         * Return entries that match the given string prefix.
         * @param prefix             The prefix.
         * @param [options]          Additional options to configure behaviour.
         * @param [options.limit=10] The maximum number of items to retrieve. It is important to set this value as
         *                           very short prefixes will naturally match large numbers of entries.
         * @returns A number of entries that have the given prefix.
         */
        lookup(prefix: string, options?: { limit?: number }): WordTreeEntry;

        /**
         * Returns the node at the given prefix.
         * @param prefix The prefix.
         */
        nodeAtPrefix(prefix: string): WordTreeNode | void;

        /**
         * Perform a breadth-first search starting from the given node and retrieving any entries along the way, until we
         * reach the limit.
         * @param node      The starting node.
         * @param entries   The accumulated entries.
         * @param queue     The working queue of nodes to search.
         * @param [options] Additional options for the search.
         * @param [options.limit=10] The maximum number of entries to retrieve before stopping.
         */
        protected _breadthFirstSearch(
            node: WordTreeNode,
            entries: WordTreeEntry[],
            queue: WordTreeNode[],
            options?: { limit?: number }
        ): void;
    }

    /**
     * This class is responsible for indexing all documents available in the world and storing them in a word tree
     * structure that allows for fast searching.
     */
    class DocumentIndex {
        constructor();
        /** A collection of WordTree structures for each document type. */
        trees: Record<string, WordTree>;

        /** A reverse-lookup of a document's UUID to its parent node in the word tree. */
        uuids: Record<string, WordTreeNode>;

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
        addDocument(doc: foundry.abstract.Document): void;

        /**
         * Remove an entry from the index.
         * @param doc The document entry.
         */
        removeDocument(doc: foundry.abstract.Document): void;

        /**
         * Replace an entry in the index with an updated one.
         * @param doc The document entry.
         */
        replaceDocument(doc: foundry.abstract.Document): void;

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
         * @param documentName  The name of the documents to index.
         */
        protected _indexWorldCollection(documentName: WorldDocument["documentName"]): void;
    }
}
