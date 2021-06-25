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
            static override get schema(): typeof data.ChatMessageData;

            static override get metadata(): ChatMessageMetadata;

            /** Is a user able to create a new chat message? */
            protected static _canCreate(user: documents.BaseUser, doc: documents.BaseChatMessage): boolean;

            /** Is a user able to update an existing chat message? */
            protected static _canUpdate(
                user: documents.BaseUser,
                doc: documents.BaseChatMessage,
                data: data.ChatMessageData,
            ): boolean;

            /** Is a user able to delete an existing chat message? */
            protected static _canDelete(user: documents.BaseUser, doc: documents.BaseChatMessage): boolean;
        }

        interface BaseChatMessage {
            readonly data: data.ChatMessageData<BaseChatMessage>;

            readonly parent: null;
        }

        interface ChatMessageMetadata extends abstract.DocumentMetadata {
            name: 'ChatMessage';
            collection: 'messages';
            label: 'DOCUMENT.ChatMessage';
            isPrimary: true;
            permissions: {
                create: typeof BaseChatMessage['_canCreate'];
                update: typeof BaseChatMessage['_canUpdate'];
                delete: typeof BaseChatMessage['_canDelete'];
            };
        }
    }
}
