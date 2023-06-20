import type { ActiveEffectPF2e, ActorPF2e, ItemPF2e, ScenePF2e, TokenDocumentPF2e } from "@module/documents.ts";
import { ActorSourcePF2e } from "@actor/data/index.ts";
import { ActorSystemSource } from "@actor/data/base.ts";
import { ItemSourcePF2e } from "@item/data/index.ts";
import { MockCollection } from "./collection.ts";
import { MockItem } from "./item.ts";

export class MockActor {
    _source: ActorSourcePF2e;

    readonly parent: TokenDocumentPF2e<ScenePF2e | null> | null = null;

    readonly items: MockCollection<ItemPF2e<ActorPF2e>> = new MockCollection();

    readonly effects: MockCollection<ActiveEffectPF2e<ActorPF2e>> = new MockCollection();

    _itemGuid = 1;

    constructor(data: ActorSourcePF2e, public options: DocumentConstructionContext<null> = {}) {
        this._source = duplicate(data);
        this._source.items ??= [];
        this.prepareData();
    }

    get id(): string | null {
        return this._source._id;
    }

    get name(): string {
        return this._source.name;
    }

    get system(): ActorSystemSource {
        return this._source.system;
    }

    prepareData(): void {
        const sourceIds = this._source.items.map((source) => source._id);
        for (const item of this.items) {
            if (!sourceIds.includes(item.id)) {
                this.items.delete(item.id);
            }
        }

        for (const source of this._source.items) {
            const item = this.items.get(source._id);
            if (item) {
                (item as { _source: object })._source = duplicate(source);
            } else {
                this.items.set(
                    source._id,
                    new MockItem(source, { parent: this as unknown as ActorPF2e }) as unknown as ItemPF2e<ActorPF2e>
                );
            }
        }
    }

    update(changes: Record<string, unknown>): void {
        delete changes.items;
        for (const [k, v] of Object.entries(changes)) {
            global.setProperty(this._source, k, v);
        }
        this.prepareData();
    }

    static async updateDocuments(
        updates: DocumentUpdateData<ActorPF2e>[] = [],
        _context: DocumentModificationContext<TokenDocumentPF2e<ScenePF2e | null>> = {}
    ): Promise<ActorPF2e[]> {
        return updates.flatMap((update) => {
            const actor = game.actors.find((a) => a.id === update._id);
            if (!actor) throw Error("PANIC!");

            const itemUpdates = (update.items ?? []) as DeepPartial<ItemSourcePF2e>[];
            delete update.items;
            mergeObject(actor._source, update);
            for (const partial of itemUpdates) {
                partial._id ??= "item1";
                const source = actor._source.items.find(
                    (maybeSource: ItemSourcePF2e) => maybeSource._id === partial._id
                );
                if (source) {
                    mergeObject(source, partial);
                } else {
                    actor.createEmbeddedDocuments("Item", [partial]);
                }
            }
            actor.prepareData();
            return actor;
        });
    }

    async updateEmbeddedDocuments(type: string, data: { _id: string }[]): Promise<void> {
        for (const changes of data) {
            if (type === "Item") {
                const source = this._source.items.find((i) => i._id === changes._id);
                if (source) mergeObject(source, changes);
            }
        }
        this.prepareData();
    }

    async createEmbeddedDocuments(
        type: string,
        data: ItemSourcePF2e[],
        _context: DocumentModificationContext<ActorPF2e>
    ): Promise<void> {
        if (type === "Item") {
            for (const source of data) {
                source._id = `item${this._itemGuid}`;
                this._itemGuid += 1;
                this._source.items.push(source);
            }
        }
        this.prepareData();
    }

    async deleteEmbeddedDocuments(type: string, ids: string[]): Promise<void> {
        if (type === "Item") {
            this._source.items = this._source.items.filter((source: { _id: string }) => !ids.includes(source._id));
        }
        this.prepareData();
    }

    toObject(): ActorSourcePF2e {
        return duplicate(this._source);
    }
}
