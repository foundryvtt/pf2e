declare type ChatMessageType = typeof CONST.CHAT_MESSAGE_TYPES[keyof typeof CONST.CHAT_MESSAGE_TYPES];

declare module foundry {
    module data {
        interface ChatMessageSource {
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

        class ChatMessageData<
            TDocument extends documents.BaseChatMessage = documents.BaseChatMessage
        > extends abstract.DocumentData<TDocument> {
            /** @override */
            static defineSchema(): abstract.DocumentSchema;
        }
        interface ChatMessageData extends Omit<ChatMessageSource, '_id'> {
            readonly _source: ChatMessageSource;
        }
    }
}
