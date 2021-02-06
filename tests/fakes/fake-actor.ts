import { ActorDataPF2e } from '@actor/actorDataDefinitions';

export class FakeActor {
    _data: Partial<ActorDataPF2e>;
    constructor(data: Partial<ActorDataPF2e>) {
        this._data = duplicate(data);
        this._data.items = this._data.items ?? [];
    }

    get data() {
        return this._data;
    }

    get name() {
        return this._data.name;
    }

    update(changes: object) {
        for (const [k, v] of Object.entries(changes)) {
            global.setProperty(this._data, k, v);
        }
    }

    updateEmbeddedEntity(type: string, data: any | any[]) {
        // make sure data is an array, since it expects multiple
        data = data instanceof Array ? data : [data];

        if (this._data.items === undefined) {
            this._data.items = [];
        }

        for (const itemChanges of data) {
            let obj;
            if (type == 'OwnedItem') {
                obj = this._data.items.find((x) => x._id === itemChanges._id);
            }

            for (const [k, v] of Object.entries(itemChanges)) {
                global.setProperty(obj, k, v);
            }
        }
    }

    createEmbeddedEntity(type: string, data: any | any[]) {
        // make sure data is an array, since it expects multiple
        data = data instanceof Array ? data : [data];

        if (this._data.items === undefined) {
            this._data.items = [];
        }

        if (type == 'OwnedItem') {
            for (const obj of data) {
                obj._id = 'item1';
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
