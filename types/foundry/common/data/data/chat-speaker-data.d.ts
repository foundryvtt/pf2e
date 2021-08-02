declare module foundry {
    module data {
        /**
         * The data schema for an embedded Chat Speaker object.
         * @extends DocumentData
         * @memberof data
         * @see ChatMessageData
         *
         * @param data Initial data used to construct the data object
         * @param [document] The document to which this data object belongs
         *
         * @property [scene] The _id of the Scene where this message was created
         * @property [actor] The _id of the Actor who generated this message
         * @property [token] The _id of the Token who generated this message
         * @property [alias] An overridden alias name used instead of the Actor or Token name
         */
        interface ChatSpeakerSource {
            scene?: string | null;
            actor?: string | null;
            token?: string | null;
            alias: string;
        }

        class ChatSpeakerData<
            TDocument extends documents.BaseChatMessage = documents.BaseChatMessage
        > extends abstract.DocumentData<TDocument> {
            static override defineSchema(): abstract.DocumentSchema;
        }

        interface ChatSpeakerData extends ChatSpeakerSource {
            readonly _source: ChatSpeakerSource;
        }
    }
}
