/**
 * A reusable storage concept which blends the functionality of an Array with the efficient key-based lookup of a Map.
 * This concept is reused throughout Foundry VTT where a collection of uniquely identified elements is required.
 */
export default class Collection<K extends string, V> {
    constructor(entries?: Iterable<readonly [K, V]> | null);

    /**
     * Groups members of an iterable according to the return value of the passed callback.
     * @param items An iterable.
     * @param keySelector A callback which will be invoked for each item in items.
     */
    static groupBy<L extends string, W>(
        items: Iterable<W>,
        keySelector: (item: W, index: number) => L,
    ): Collection<L, W[]>;

    set(key: K, value: V): this;

    delete(key: K): boolean;

    /** When iterating over a Collection, we should iterate over its values instead of over its entries */
    [Symbol.iterator](): IterableIterator<V>;

    /** Return an Array of all the entry values in the Collection */
    get contents(): V[];

    /**
     * Find an entry in the Map using an functional condition.
     * @see {Array#find}
     *
     * @param condition  The functional condition to test
     * @return The value, if found, otherwise null
     *
     * @example
     * let c = new Collection([["a", "A"], ["b", "B"], ["c", "C"]]);
     * let a = c.find(entry => entry === "A");
     */
    find<T extends V = V>(condition: (value: V) => boolean): T | undefined;

    /**
     * Filter the Collection, returning an Array of entries which match a functional condition.
     * @see {Array#filter}
     * @param condition  The functional condition to test
     * @return An Array of matched values
     *
     * @example
     * let c = new Collection([["a", "AA"], ["b", "AB"], ["c", "CC"]]);
     * let hasA = c.filters(entry => entry.slice(0) === "A");
     */
    filter<T extends V = V>(condition: (value: V) => value is T): T[];
    filter<T extends V = V>(condition: (value: V) => boolean): T[];

    /**
     * Apply a function to each element of the collection
     * @see Array#forEach
     * @param fn The function to apply
     *
     * @example
     * let c = new Collection([["a", {active: false}], ["b", {active: false}], ["c", {active: false}]]);
     * c.forEach(e => e.active = true);
     */
    forEach(fn: (value: V) => void): void;

    /**
     * Get an element from the Collection by its key.
     * @param key    The key of the entry to retrieve
     * @param strict Throw an Error if the requested id does not exist, otherwise return null. Default false
     * @return The retrieved entry value, if the key exists, otherwise null
     *
     * @example
     * let c = new Collection([["a", "A"], ["b", "B"], ["c", "C"]]);
     * c.get("a"); // "A"
     * c.get("d"); // null
     * c.get("d", {strict: true}); // throws Error
     */
    get<T extends V = V>(key: Maybe<string>, { strict }: { strict: true }): T;
    get<T extends V = V>(key: string, { strict }?: CollectionGetOptions): T | undefined;

    /**
     * Get an entry from the Collection by name.
     * Use of this method assumes that the objects stored in the collection have a "name" attribute.
     * @param name   The name of the entry to retrieve
     * @param strict Throw an Error if the requested id does not exist, otherwise return null. Default false.
     * @return The retrieved Entity, if one was found, otherwise null;
     */
    getName(name: string, { strict }?: { strict?: boolean }): V | undefined;

    /**
     * Transform each element of the Collection into a new form, returning an Array of transformed values
     * @param transformer  The transformation function to apply to each entry value
     * @return An Array of transformed values
     */
    map<T>(transformer: (value: V, index: number, collection: this) => T): T[];

    /**
     * Reduce the Collection by applying an evaluator function and accumulating entries
     * @see {Array#reduce}
     * @param evaluator A function which mutates the accumulator each iteration
     * @param initial   An initial value which accumulates with each iteration
     * @return The accumulated result
     *
     * @example
     * let c = new Collection([["a", "A"], ["b", "B"], ["c", "C"]]);
     * let letters = c.reduce((s, l) => {
     *   return s + l;
     * }, ""); // "ABC"
     */
    reduce<T>(evaluator: (accumlator: T, value: V) => T, initial: T): T;

    /**
     * Test whether a condition is met by some entry in the Collection
     * @see {Array#some}
     * @param condition A test condition to apply to each entry
     * @return Was the test condition passed by at least one entry?
     */
    some(condition: (value: V) => boolean): boolean;
}

export default interface Collection<K extends string, V> {
    clear(): void;

    /**
     * @returns boolean indicating whether an element with the specified key exists or not.
     */
    has(key: K): boolean;

    /**
     * @returns the number of elements in the Map.
     */
    readonly size: number;

    /**
     * Returns an iterable of key, value pairs for every entry in the map.
     */
    entries(): MapIterator<[K, V]>;

    /**
     * Returns an iterable of keys in the map
     */
    keys(): MapIterator<K>;

    /**
     * Returns an iterable of values in the map
     */
    values(): MapIterator<V>;
}

export interface CollectionGetOptions {
    strict?: boolean;
}
