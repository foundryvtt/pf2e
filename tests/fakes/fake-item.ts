import type { ActorPF2e } from "@actor";
import type { ItemPF2e } from "@item";
import { ItemSourcePF2e } from "@item/data";

export class FakeItem {
    _data: ItemSourcePF2e;

    parent: ActorPF2e | null = null;

    constructor(data: ItemSourcePF2e, public options: DocumentConstructionContext<ItemPF2e> = {}) {
        this._data = duplicate(data);
        this.parent = options.parent ?? null;
    }

    get id(): string {
        return this.data._id;
    }

    get data() {
        return this._data;
    }

    get name() {
        return this._data.name;
    }

    get level(): number | null {
        return "level" in this.data.data! ? this.data.data.level.value : null;
    }

    get traits(): Set<string> {
        return new Set(this.data.data!.traits.value);
    }

    get isMagical(): boolean {
        return ["magical", "arcane", "primal", "divine", "occult"].some((trait) => this.traits.has(trait));
    }

    get isAlchemical(): boolean {
        return this.traits.has("alchemical");
    }

    static async updateDocuments(
        updates: DocumentUpdateData<ItemPF2e>[] = [],
        _context: DocumentModificationContext = {}
    ): Promise<ItemPF2e[]> {
        return updates.flatMap((update) => {
            const item = game.items.find((item) => item.id === update._id);
            if (item) mergeObject(item.data, update);
            return item ?? [];
        });
    }

    update(changes: object) {
        for (const [k, v] of Object.entries(changes)) {
            global.setProperty(this._data, k, v);
        }
    }

    toObject(source = true) {
        return source ? duplicate(this._data) : duplicate(this.data);
    }
}
