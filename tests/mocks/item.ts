import type { ActorPF2e } from "@actor/index.ts";
import { ItemSystemSource } from "@item/base/data/system.ts";
import { ItemSourcePF2e } from "@item/base/data/index.ts";
import type { ItemPF2e } from "@item/index.ts";

export class MockItem {
    readonly _source: ItemSourcePF2e;

    readonly parent: ActorPF2e | null;

    constructor(
        data: ItemSourcePF2e,
        public options: DocumentConstructionContext<ActorPF2e | null> = {},
    ) {
        this._source = duplicate(data);
        this.parent = options.parent ?? null;
    }

    get id(): string | null {
        return this._source._id;
    }

    get name(): string {
        return this._source.name;
    }

    get system(): ItemSystemSource {
        return this._source.system;
    }

    get level(): number | null {
        return this.system.level?.value ?? null;
    }

    get traits(): Set<string> {
        return new Set(this.system.traits?.value ?? []);
    }

    get isMagical(): boolean {
        return ["magical", "arcane", "primal", "divine", "occult"].some((trait) => this.traits.has(trait));
    }

    get isAlchemical(): boolean {
        return this.traits.has("alchemical");
    }

    static async updateDocuments(
        updates: Record<string, unknown>[] = [],
        _context: DocumentModificationContext<ActorPF2e | null> = {},
    ): Promise<ItemPF2e<ActorPF2e | null>[]> {
        return updates.flatMap((update) => {
            const item = game.items.find((item) => item.id === update._id);
            if (item) mergeObject(item._source, update, { performDeletions: true });
            return item ?? [];
        });
    }

    update(changes: object): void {
        mergeObject(this._source, changes, { performDeletions: true });
    }

    toObject(): ItemSourcePF2e {
        return duplicate(this._source);
    }
}
