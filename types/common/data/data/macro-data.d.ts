declare module foundry {
    module data {
        interface MacroSource extends abstract.DocumentSource {
            type: 'chat' | 'script';
            img: string;
            actorIds: string[];
            author: string;
            command: string;
            scope: string;
            folder?: string | null;
            sort: number;
        }

        class MacroData<
            TDocument extends documents.BaseMacro = documents.BaseMacro
        > extends abstract.DocumentData<TDocument> {
            /** @override */
            static defineSchema(): abstract.DocumentSchema;
        }

        interface MacroData extends Omit<MacroSource, '_id'> {
            _source: MacroSource;
        }
    }
}
