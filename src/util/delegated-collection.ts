/** A proxy for a Collection that does not inherit from it, allowing it to work for getProperty() calls */
export class DelegatedCollection<V> {
    #data: Collection<V>;

    constructor(entries: [string, V][] = []) {
        this.#data = new Collection(entries);
    }

    [Symbol.iterator](): IterableIterator<V> {
        return this.#data.values();
    }

    get size(): number {
        return this.#data.size;
    }

    get contents(): V[] {
        return this.#data.contents;
    }

    get<T extends V = V>(key: Maybe<string>, { strict }: { strict: true }): T;
    get<T extends V = V>(key: string, options?: CollectionGetOptions): T | undefined;
    get(key: string, options?: CollectionGetOptions): V | undefined {
        return this.#data.get(key, options);
    }

    set(key: string, value: V): this {
        this.#data.set(key, value);
        return this;
    }

    has(key: string): boolean {
        return this.#data.has(key);
    }

    find(predicate: (value: V) => boolean): V | undefined {
        return this.#data.find(predicate);
    }

    some(predicate: (value: V) => boolean): boolean {
        return this.#data.some(predicate);
    }

    filter<T extends V = V>(condition: (value: V) => value is T): T[];
    filter<T extends V = V>(condition: (value: V) => boolean): T[];
    filter<T extends V = V>(predicate: (value: V) => boolean): T[] {
        return this.#data.filter(predicate);
    }

    map<T>(callback: (value: V) => T): T[] {
        return this.#data.map(callback);
    }

    delete(key: string): boolean {
        return this.#data.delete(key);
    }

    clear(): void {
        this.#data.clear();
    }
}
