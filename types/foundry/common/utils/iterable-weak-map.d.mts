/**
 * Stores a map of objects with weak references to the keys, allowing them to be garbage collected. Both keys and values
 * can be iterated over, unlike a WeakMap.
 */
export default class IterableWeakMap<K extends WeakKey = WeakKey, V = unknown> extends WeakMap<K, V> {
    /**
     * @param entries The initial entries.
     */
    constructor(entries?: Iterable<[K, V]>);

    /**
     * Remove a key from the map.
     * @param key The key to remove.
     */
    delete(key: K): boolean;

    /**
     * Clear all values from the map.
     */
    clear(): void;

    /**
     * Enumerate the entries.
     */
    entries(): Generator<[K, V]>;
}
