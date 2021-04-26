export class FakeMacro {
    _data: MacroData;

    constructor(data: MacroData) {
        this._data = duplicate(data);
    }

    get data() {
        return this._data;
    }
}
