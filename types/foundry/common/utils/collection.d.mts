/**
 * A reusable storage concept which blends the functionality of an Array with the efficient key-based lookup of a Map.
 * This concept is reused throughout Foundry VTT where a collection of uniquely identified elements is required.
 */
export interface Collection<TValue>
    extends Omit<Map<string, TValue>, "forEach" | "delete" | "set" | SymbolConstructor["iterator"]> {
    set(key: string, value: TValue): this;

    delete(key: string): boolean;

    /** When iterating over a Collection, we should iterate over its values instead of over its entries */
    [Symbol.iterator](): IterableIterator<TValue>;

    /** Return an Array of all the entry values in the Collection */
    readonly contents: TValue[];

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
    find<T extends TValue = TValue>(condition: (value: TValue) => boolean): T | undefined;

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
    filter<T extends TValue = TValue>(condition: (value: TValue) => value is T): T[];
    filter<T extends TValue = TValue>(condition: (value: TValue) => boolean): T[];

    /**
     * Apply a function to each element of the collection
     * @see Array#forEach
     * @param fn The function to apply
     *
     * @example
     * let c = new Collection([["a", {active: false}], ["b", {active: false}], ["c", {active: false}]]);
     * c.forEach(e => e.active = true);
     */
    forEach(fn: (value: TValue) => void): void;

    /**
     * Get an element from the Collection by its key.
     * @param key      The key of the entry to retrieve
     * @param strict  Throw an Error if the requested id does not exist, otherwise return null. Default false
     * @return The retrieved entry value, if the key exists, otherwise null
     *
     * @example
     * let c = new Collection([["a", "A"], ["b", "B"], ["c", "C"]]);
     * c.get("a"); // "A"
     * c.get("d"); // null
     * c.get("d", {strict: true}); // throws Error
     */
    get<T extends TValue = TValue>(key: string, { strict }: { strict: true }): T;
    get<T extends TValue = TValue>(key: string, { strict }?: { strict?: boolean }): T | undefined;

    /**
     * Get an entry from the Collection by name.
     * Use of this method assumes that the objects stored in the collection have a "name" attribute.
     * @param name   The name of the entry to retrieve
     * @param strict Throw an Error if the requested id does not exist, otherwise return null. Default false.
     * @return The retrieved Entity, if one was found, otherwise null;
     */
    getName(name: string, { strict }?: { strict?: boolean }): TValue | undefined;

    /**
     * Transform each element of the Collection into a new form, returning an Array of transformed values
     * @param transformer  The transformation function to apply to each entry value
     * @return An Array of transformed values
     */
    map<T>(transformer: (value: TValue) => T): T[];

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
    reduce<T>(evaluator: (accumlator: T, value: TValue) => T, initial: T): T;

    /**
     * Test whether a condition is met by some entry in the Collection
     * @see {Array#some}
     * @param condition A test condition to apply to each entry
     * @return Was the test condition passed by at least one entry?
     */
    some(condition: (value: TValue) => boolean): boolean;
}

export interface CollectionConstructor {
    new (): Collection<any>;
    new <V>(entries?: readonly (readonly [string, V])[] | null): Collection<V>;
    readonly prototype: Collection<any>;
}

export const Collection: CollectionConstructor;
