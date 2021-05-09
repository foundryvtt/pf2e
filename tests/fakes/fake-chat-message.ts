export class FakeChatMessage {
    _data: ChatMessageData;

    constructor(data: ChatMessageData) {
        this._data = duplicate(data);
    }

    get data() {
        return this._data;
    }
}
