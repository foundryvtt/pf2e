export class FakeChatMessage {
    data: foundry.data.ChatMessageData;

    constructor(data: foundry.data.ChatMessageSource) {
        this.data = duplicate(data) as unknown as foundry.data.ChatMessageData;
    }
}
