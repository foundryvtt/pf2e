import { StringTreeNode, WordTreeEntry } from "./_types.mjs";
import StringTree, { StringTreeEntryFilter } from "./string-tree.mjs";

/**
 * A data structure for quickly retrieving objects by a string prefix.
 * Note that this works well for languages with alphabets (latin, cyrillic, korean, etc.), but may need more nuanced
 * handling for languages that compose characters and letters.
 */
export default class WordTree<TEntry extends object = WordTreeEntry> extends StringTree<TEntry> {
    /**
     * Insert an entry into the tree.
     * @param string The string key for the entry.
     * @param entry  The entry to store.
     * @returns The node the entry was added to.
     */
    override addLeaf(string: Iterable<string>, entry: TEntry): StringTreeNode<TEntry>;

    /**
     * Return entries that match the given string prefix.
     * @param prefix  The prefix.
     * @param options Additional options to configure behaviour.
     * @param options.limit         The maximum number of items to retrieve. It is important to set this value a very
     *                              short prefixes will naturally match large numbers of entries.
     * @param options.filterEntries A filter function to apply to each candidate entry.
     * @returns A number of entries that have the given prefix.
     */
    override lookup(
        prefix: string,
        options?: { limit?: number; filterEntries?: StringTreeEntryFilter<TEntry> },
    ): TEntry[];

    /**
     * Returns the node at the given prefix.
     * @param prefix The prefix.
     */
    override nodeAtPrefix(prefix: string): StringTreeNode<TEntry>;
}
