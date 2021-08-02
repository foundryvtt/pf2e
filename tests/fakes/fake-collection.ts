import { ActorPF2e } from "@actor/base";

/** In Foundry this is actually a subclass of Map, but it incompatibly extends it at several points. */
export class FakeCollection<V> {
    private map: Map<string, V>;

    constructor(entries: [string, V][] = []) {
        this.map = new Map(entries);
    }

    [Symbol.iterator](): IterableIterator<V> {
        return this.map.values();
    }

    get entries(): V[] {
        return Array.from(this.map.values());
    }

    get(key: string): V | null {
        return this.map.get(key) ?? null;
    }

    set(key: string, value: V): FakeCollection<V> {
        this.map.set(key, value);
        return this;
    }

    has(key: string): boolean {
        return this.map.has(key);
    }

    filter(predicate: (value: V) => boolean): V[] {
        return Array.from(this.map.values()).filter(predicate);
    }

    clear(): void {
        this.map.clear();
    }
}

export class FakeWorldCollection<V extends { data: object }> extends FakeCollection<V> {
    get contents(): V[] {
        return this.entries;
    }
}

export class FakeActors extends FakeWorldCollection<ActorPF2e> {
    tokens: Record<string, Token> = {};

    constructor(entries: [string, ActorPF2e][] = []) {
        super(entries);
    }
}
