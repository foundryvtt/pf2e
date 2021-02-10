import { ItemData } from '@item/dataDefinitions';

export class FakeItem {
    _data: Partial<ItemData>;
    constructor(data: Partial<ItemData>) {
        this._data = duplicate(data);
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
}
