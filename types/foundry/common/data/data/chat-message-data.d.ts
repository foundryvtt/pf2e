declare type ChatMessageType = typeof CONST.CHAT_MESSAGE_TYPES[keyof typeof CONST.CHAT_MESSAGE_TYPES];

declare module foundry {
    module data {
        interface ChatMessageSource {
            _id: string;
            type: ChatMessageType;
            user: string;
            timestamp: string;
            flavor?: string;
            content: string;
            speaker: ChatSpeakerSource;
            whisper: string[];
            blind: boolean;
            rolls: (string | RollJSON)[];
            sound: AudioPath;
            emote?: boolean;
            flags: ChatMessageFlags;
        }

        class ChatMessageData<
            TDocument extends documents.BaseChatMessage = documents.BaseChatMessage
        > extends abstract.DocumentData<TDocument> {
            static override defineSchema(): abstract.DocumentSchema;
        }

        interface ChatMessageData extends ChatMessageSource {
            readonly _source: ChatMessageSource;

            roll: string;
        }

        type ChatMessageFlags = Record<string, Record<string, unknown>> & {
            core?: {
                canPopout?: boolean;
                initiativeRoll?: boolean;
                RollTable?: string;
            };
        };
    }
}
