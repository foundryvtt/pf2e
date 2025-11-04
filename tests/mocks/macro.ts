export class MockMacro {
    readonly _source: foundry.documents.MacroSource;

    constructor(data: foundry.documents.MacroSource) {
        this._source = fu.deepClone(data);
    }
}
