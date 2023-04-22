export class MockChatMessage {
    _source: foundry.documents.ChatMessageSource;

    constructor(data: foundry.documents.ChatMessageSource) {
        this._source = duplicate(data);
    }
}
