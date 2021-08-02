import type { ActorPF2e } from "@actor/index";
import { ActorSourcePF2e } from "@actor/data";
import type { ItemPF2e } from "@item/index";
import { ItemSourcePF2e } from "@item/data";
import { FoundryUtils } from "tests/utils";
import { FakeCollection } from "./fake-collection";

export class FakeActorItem {
    actor: FakeActor;
    id: string;
    constructor(actor: FakeActor, id: string) {
        this.actor = actor;
        this.id = id;
    }

    get data() {
        return this.actor.data.items.find((itemData: ItemSourcePF2e) => itemData._id == this.id);
    }

    get name() {
        return this.data?.name;
    }

    update(changes: EmbeddedDocumentUpdateData<ItemPF2e>) {
        for (const [k, v] of Object.entries(changes)) {
            global.setProperty(this.data!, k, v);
        }
    }
}

export class FakeActor {
    _data: ActorSourcePF2e;
    _itemGuid = 1;
    constructor(data: ActorSourcePF2e, public options: DocumentConstructionContext<ActorPF2e> = {}) {
        this._data = FoundryUtils.duplicate(data);
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

    get items() {
        const collection = new FakeCollection();
        this.data.items?.forEach((itemData: ItemSourcePF2e) => {
            const item = new FakeActorItem(this, itemData._id);
            collection.set(item.id, item);
        });
        return collection;
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

    update(changes: object) {
        for (const [k, v] of Object.entries(changes)) {
            global.setProperty(this._data, k, v);
        }
    }

    updateEmbeddedDocuments(type: string, data: any | any[]) {
        // make sure data is an array, since it expects multiple
        data = data instanceof Array ? data : [data];

        if (this._data.items === undefined) {
            this._data.items = [];
        }

        for (const itemChanges of data) {
            let obj: unknown;
            if (type == "Item") {
                obj = this.data.items.find((itemData: ItemSourcePF2e) => itemData._id === itemChanges._id);
            }

            for (const [k, v] of Object.entries(itemChanges)) {
                if (typeof obj === "object" && obj !== null) {
                    global.setProperty(obj, k, v);
                }
            }
        }
    }

    createOwnedItem(data: any | any[]) {
        return this.createEmbeddedDocuments("Item", data);
    }

    createEmbeddedDocuments(type: string, data: any | any[]) {
        // make sure data is an array, since it expects multiple
        data = data instanceof Array ? data : [data];

        if (this._data.items === undefined) {
            this._data.items = [];
        }

        if (type == "Item") {
            for (const obj of data) {
                obj._id = `item${this._itemGuid}`;
                this._itemGuid += 1;
                this._data.items.push(obj);
            }
        }
    }

    deleteEmbeddedDocuments(type: string, data: string | string[]) {
        // make sure data is an array, since it expects multiple
        data = data instanceof Array ? data : [data];

        if (type == "Item") {
            for (const id of data) {
                this._data.items = this._data.items?.filter((x: any) => x._id !== id);
            }
        }
    }

    toObject(source = true) {
        return source ? duplicate(this._data) : duplicate(this.data);
    }
}
