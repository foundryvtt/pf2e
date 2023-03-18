declare module foundry {
    module documents {
        /**
         * The ChatMessage document model.
         * @extends Document
         * @memberof documents
         *
         * @param data    Initial data from which to construct the document.
         * @property data The constructed data object for the document.
         */
        class BaseChatMessage extends abstract.Document {
            blind: boolean;
            content: string;
            flags: foundry.data.ChatMessageFlags;
            rolls: Rolled<Roll>[];
            speaker: foundry.data.ChatSpeakerSource;
            type: ChatMessageType;
            whisper: string[];

            static override get schema(): typeof data.ChatMessageData;

            static override get metadata(): ChatMessageMetadata;

            /** Is a user able to create a new chat message? */
            protected static _canCreate(user: documents.BaseUser, doc: documents.BaseChatMessage): boolean;

            /** Is a user able to update an existing chat message? */
            protected static _canUpdate(
                user: documents.BaseUser,
                doc: documents.BaseChatMessage,
                data: data.ChatMessageData
            ): boolean;

            /** Is a user able to delete an existing chat message? */
            protected static _canDelete(user: documents.BaseUser, doc: documents.BaseChatMessage): boolean;

            static createDocuments<T extends abstract.Document>(
                this: ConstructorOf<T>,
                data?: (T | PreCreate<T["_source"]>)[],
                context?: ChatMessageModificationContext
            ): Promise<T[]>;
        }

        interface BaseChatMessage {
            readonly parent: null;

            get documentName(): "ChatMessage";
        }

        interface ChatMessageModificationContext extends DocumentModificationContext<ChatMessage> {
            rollMode: RollMode;
        }

        interface ChatMessageMetadata extends abstract.DocumentMetadata {
            name: "ChatMessage";
            collection: "messages";
            label: "DOCUMENT.ChatMessage";
            isPrimary: true;
            permissions: {
                create: (typeof BaseChatMessage)["_canCreate"];
                update: (typeof BaseChatMessage)["_canUpdate"];
                delete: (typeof BaseChatMessage)["_canDelete"];
            };
        }
    }
}
