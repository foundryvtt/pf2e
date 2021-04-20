export class FakeRollTable {
    _data: RollTableData;

    constructor(data: RollTableData) {
        this._data = duplicate(data);
    }

    get data() {
        return this._data;
    }
}
