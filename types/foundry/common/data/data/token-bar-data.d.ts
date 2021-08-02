declare namespace foundry {
    module data {
        /**
         * An embedded data structure for the contents of a Token attribute bar.
         * @property [attribute] The attribute path within the Token's Actor data which should be displayed
         */
        interface TokenBarSource {
            attribute: string | null;
        }

        class TokenBarData<
            TDocument extends documents.BaseToken | documents.BaseActor = documents.BaseToken | documents.BaseActor
        > extends abstract.DocumentData<TDocument> {
            static override defineSchema(): abstract.DocumentSchema;
        }

        interface TokenBarData extends TokenBarSource {
            readonly _source: TokenBarSource;
        }
    }
}
