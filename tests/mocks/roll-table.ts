export class MockRollTable {
    readonly _source: foundry.documents.RollTableSource;

    constructor(data: foundry.documents.RollTableSource) {
        this._source = fu.deepClone(data);
    }
}
