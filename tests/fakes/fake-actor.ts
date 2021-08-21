import type { ActorPF2e } from "@actor";
import { ActorSourcePF2e } from "@actor/data";
import type { ItemPF2e } from "@item";
import { ItemSourcePF2e } from "@item/data";
import { FakeCollection } from "./fake-collection";
import { FakeItem } from "./fake-item";

export class FakeActor {
    _data: ActorSourcePF2e;

    items: FakeCollection<ItemPF2e> = new FakeCollection();

    _itemGuid = 1;

    constructor(data: ActorSourcePF2e, public options: DocumentConstructionContext<ActorPF2e> = {}) {
        this._data = duplicate(data);
        this._data.items ??= [];
        this.prepareData();
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

    prepareData(): void {
        const sourceIds = this._data.items.map((source) => source._id);
        for (const item of this.items) {
            if (!sourceIds.includes(item.id)) {
                this.items.delete(item.id);
            }
        }

        for (const source of this._data.items) {
            const item = this.items.get(source._id);
            if (item) {
                (item as any)._data = duplicate(source);
            } else {
                this.items.set(
                    source._id,
                    new FakeItem(source, { parent: this as unknown as ActorPF2e }) as unknown as ItemPF2e
                );
            }
        }
    }

    static fromToken(token: Token): ActorPF2e | null {
        let actor = game.actors.get(token.data.actorId);
        if (!actor) return null;
        if (!token.data._id) return actor;
        if (!token.data.actorLink) actor = FakeActor.createTokenActor(actor, token);
        return actor;
    }

    static createTokenActor(baseActor: ActorPF2e, token: Token): ActorPF2e {
        const actor = game.actors.tokens[token.id];
        if (actor) return actor;
        const actorData = mergeObject(baseActor.data, token.data.actorData, { inplace: false }) as ActorSourcePF2e;
        return new this(actorData, { token }) as unknown as ActorPF2e;
    }

    update(changes: Record<string, any>) {
        delete changes.items;
        for (const [k, v] of Object.entries(changes)) {
            global.setProperty(this._data, k, v);
        }
        this.prepareData();
    }

    static async updateDocuments(
        updates: DocumentUpdateData<ActorPF2e>[] = [],
        _context: DocumentModificationContext = {}
    ): Promise<ActorPF2e[]> {
        return updates.flatMap((update) => {
            const actor = game.actors.find((actor) => actor.id === update._id);
            if (!actor) throw Error("PANIC!");

            const itemUpdates = (update.items ?? []) as DeepPartial<ItemSourcePF2e>[];
            delete update.items;
            mergeObject(actor.data, update);
            for (const partial of itemUpdates) {
                const source = (actor as any)._data.items.find(
                    (maybeSource: ItemSourcePF2e) => maybeSource._id === partial._id
                );
                if (source) mergeObject(source, partial);
            }
            actor.prepareData();
            return actor;
        });
    }

    async updateEmbeddedDocuments(type: string, data: any[]): Promise<void> {
        for (const changes of data) {
            if (type == "Item") {
                const source = this.data.items.find((itemData: ItemSourcePF2e) => itemData._id === changes._id);
                mergeObject(source, changes);
            }
        }
        this.prepareData();
    }

    async createEmbeddedDocuments(type: string, data: any[], _context: DocumentModificationContext): Promise<void> {
        if (type == "Item") {
            for (const source of data) {
                source._id = `item${this._itemGuid}`;
                this._itemGuid += 1;
                this._data.items.push(source);
            }
        }
        this.prepareData();
    }

    async deleteEmbeddedDocuments(type: string, data: string[]): Promise<void> {
        if (type == "Item") {
            this._data.items = this._data.items.filter((source: { _id: string }) => !data.includes(source._id));
        }
        this.prepareData();
    }

    toObject(source = true) {
        return source ? duplicate(this._data) : duplicate(this.data);
    }
}
