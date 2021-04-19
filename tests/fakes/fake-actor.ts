import { ActorDataPF2e } from '@actor/data-definitions';
import { FoundryUtils } from 'tests/utils';
import { FakeItem } from './fake-item';

export class FakeActorItem {
    actor: FakeActor;
    id: string;
    constructor(actor: FakeActor, id: string) {
        this.actor = actor;
        this.id = id;
    }

    get data() {
        return this.actor._data.items.find((x) => x._id == this.id);
    }

    get name() {
        return this.data?.name;
    }

    update(changes: EmbeddedEntityUpdateData) {
        for (const [k, v] of Object.entries(changes)) {
            global.setProperty(this.data!, k, v);
        }
    }
}

export class FakeActor {
    _data: ActorDataPF2e;
    _itemGuid = 1;
    constructor(data: ActorDataPF2e) {
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
        return this._data.items?.map((x) => new FakeItem(x.data as any) as any);
    }

    update(changes: object) {
        for (const [k, v] of Object.entries(changes)) {
            global.setProperty(this._data, k, v);
        }
    }

    getOwnedItem(itemId: string) {
        const item = this._data.items?.find((x) => x._id == itemId);
        if (item !== undefined) {
            return new FakeActorItem(this, item._id ?? '');
        }
        return undefined;
    }

    updateEmbeddedEntity(type: string, data: any | any[]) {
        // make sure data is an array, since it expects multiple
        data = data instanceof Array ? data : [data];

        if (this._data.items === undefined) {
            this._data.items = [];
        }

        for (const itemChanges of data) {
            let obj: unknown;
            if (type == 'OwnedItem') {
                obj = this._data.items.find((x) => x._id === itemChanges._id);
            }

            for (const [k, v] of Object.entries(itemChanges)) {
                if (typeof obj === 'object' && obj !== null) {
                    global.setProperty(obj, k, v);
                }
            }
        }
    }

    createOwnedItem(data: any | any[]) {
        return this.createEmbeddedEntity('OwnedItem', data);
    }

    createEmbeddedEntity(type: string, data: any | any[]) {
        // make sure data is an array, since it expects multiple
        data = data instanceof Array ? data : [data];

        if (this._data.items === undefined) {
            this._data.items = [];
        }

        if (type == 'OwnedItem') {
            for (const obj of data) {
                obj._id = `item${this._itemGuid}`;
                this._itemGuid += 1;
                this._data.items.push(obj);
            }
        }
    }

    deleteEmbeddedEntity(type: string, data: string | string[]) {
        // make sure data is an array, since it expects multiple
        data = data instanceof Array ? data : [data];

        if (type == 'OwnedItem') {
            for (const id of data) {
                this._data.items = this._data.items?.filter((x: any) => x._id !== id);
            }
        }
    }
}
