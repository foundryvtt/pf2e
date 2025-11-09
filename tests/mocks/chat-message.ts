export class MockChatMessage {
    _source: fd.ChatMessageSource;

    constructor(data: fd.ChatMessageSource) {
        this._source = fu.deepClone(data);
    }
}
