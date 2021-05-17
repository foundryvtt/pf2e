declare type ChatMessageType = typeof CONST.CHAT_MESSAGE_TYPES[keyof typeof CONST.CHAT_MESSAGE_TYPES];

declare module foundry {
    module data {
        interface ChatMessageSource extends foundry.abstract.DocumentSource {
            type: ChatMessageType;
            blind?: boolean;
            content: string;
            flavor?: string;
            sound?: string;
            speaker: {
                actor?: string | null;
                token?: string | null;
                alias?: string;
                scene?: string | null;
            };
            roll?: Roll | string;
            user: string;
            whisper?: string[] | User[];
        }

        class ChatMessageData extends foundry.abstract.DocumentData {}
        interface ChatMessageData extends foundry.abstract.DocumentData, Omit<ChatMessageSource, '_id'> {
            _source: ChatMessageSource;
        }
    }
}
