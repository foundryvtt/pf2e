import { StringTreeNode } from "./_types.mjs";

/**
 * @param entry The entry to filter.
 * @returns Whether the entry should be included in the result set.
 */
export type StringTreeEntryFilter<TEntry extends object> = (entry: TEntry) => boolean;

/**
 * A data structure representing a tree of string nodes with arbitrary object leaves.
 */
export default class StringTree<TEntry extends object> {
    /**
     * The key symbol that stores the leaves of any given node.
     */
    static get leaves(): symbol;

    /**
     * Insert an entry into the tree.
     * @param strings The string parents for the entry.
     * @param entry   The entry to store.
     * @returns The node the entry was added to.
     */
    addLeaf(strings: Iterable<string>, entry: TEntry): StringTreeNode<TEntry>;

    /**
     * Traverse the tree along the given string path and return any entries reachable from the node.
     * @param strings                               The string path to the desired node.
     * @param options
     * @param options.limit                         The maximum number of items to retrieve.
     * @param options.filterEntries A filter function to apply to each candidate entry.
     */
    lookup(
        strings: Iterable<string>,
        options?: { limit?: number; filterEntries?: StringTreeEntryFilter<TEntry> },
    ): TEntry[];

    /**
     * Returns the node at the given path through the tree.
     * @param strings The string path to the desired node.
     * @param options
     * @param options.hasLeaves Only return the most recently visited node that has leaves, otherwise return the exact
     *                          node at the prefix, if it exists.
     */
    nodeAtPrefix(strings: Iterable<string>, options?: { hasLeaves?: boolean }): StringTreeNode<TEntry> | void;

    /**
     * Perform a breadth-first search starting from the given node and retrieving any entries reachable from that node,
     * until we reach the limit.
     * @param node    The starting node.
     * @param entries The accumulated entries.
     * @param queue   The working queue of nodes to search.
     * @param options
     * @param options.limit         The maximum number of entries to retrieve before stopping.
     * @param options.filterEntries A filter function to apply to each candidate entry.
     */
    protected _breadthFirstSearch(
        node: StringTreeNode<TEntry>,
        entries: TEntry[],
        queue: StringTreeNode<TEntry>[],
        options?: { limit?: number; filterEntries?: StringTreeEntryFilter<TEntry> },
    ): void;
}
