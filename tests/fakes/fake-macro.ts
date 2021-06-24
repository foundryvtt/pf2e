// @ts-nocheck
export class FakeMacro {
    _data: foundry.data.MacroData;

    constructor(data: foundry.data.MacroData) {
        this._data = duplicate(data);
    }

    get data() {
        return this._data;
    }
}
